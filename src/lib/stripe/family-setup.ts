import Stripe from 'stripe'
import { createAdminClient } from '@/lib/supabase/admin'
import { generateUniqueCodes } from '@/lib/codes/generator'

/**
 * Shared logic for getting or creating a plan by children count.
 * Used by both Stripe and IAP family creation flows.
 */
export async function getOrCreatePlan(
  supabase: ReturnType<typeof createAdminClient>,
  childrenCount: number
) {
  let { data: plan } = await supabase
    .from('plans')
    .select('id')
    .eq('max_children', childrenCount)
    .single()

  if (!plan) {
    const { data: familiarPlan } = await supabase
      .from('plans')
      .select('id')
      .eq('name', 'Familiar')
      .single()

    if (familiarPlan) {
      plan = familiarPlan
    } else {
      const { data: newPlan, error: planError } = await supabase
        .from('plans')
        .insert({
          name: `Familiar ${childrenCount}`,
          max_children: childrenCount,
          price_monthly: 17 + (childrenCount - 1) * 10,
          price_yearly: Math.round((17 + (childrenCount - 1) * 10) * 12 * 0.75),
        })
        .select()
        .single()

      if (planError || !newPlan) {
        throw new Error('Failed to create plan')
      }
      plan = newPlan
    }
  }

  if (!plan) {
    throw new Error('Failed to get or create plan')
  }

  return plan
}

/**
 * Shared logic for creating a family, linking the parent profile,
 * generating parent code, and optionally generating child codes.
 */
async function createFamilyCore(
  supabase: ReturnType<typeof createAdminClient>,
  userId: string,
  childrenCount: number
) {
  const { data: profile } = await supabase
    .from('profiles')
    .select('first_name, last_name, email, family_id')
    .eq('id', userId)
    .single()

  if (!profile) {
    throw new Error('Profile not found')
  }

  // Idempotent: if user already has a family, return it
  if (profile.family_id) {
    return { familyId: profile.family_id, isExisting: true }
  }

  // Create family
  const { data: family, error: familyError } = await supabase
    .from('families')
    .insert({ name: `Familia ${profile.last_name}` })
    .select()
    .single()

  if (familyError || !family) {
    throw new Error('Failed to create family')
  }

  // Link profile to family
  await supabase
    .from('profiles')
    .update({ family_id: family.id })
    .eq('id', userId)

  // Generate parent code
  const [parentCode] = generateUniqueCodes('parent', 1)
  await supabase.from('family_codes').insert({
    code: parentCode,
    code_type: 'parent',
    family_id: family.id,
    profile_id: userId,
    status: 'active',
  })

  // Generate child codes (empty — children data gets registered later)
  if (childrenCount > 0) {
    const childCodes = generateUniqueCodes('child', childrenCount)
    for (const code of childCodes) {
      await supabase.from('family_codes').insert({
        code,
        code_type: 'child',
        family_id: family.id,
        status: 'active',
      })
    }
  }

  return { familyId: family.id, isExisting: false }
}

/**
 * Creates a family, membership, and parent code for a user after Stripe checkout.
 * This is shared logic used by both the webhook and verify-session endpoint.
 *
 * @returns The family ID (new or existing)
 */
export async function createFamilyAndMembership(
  userId: string,
  subscription: Stripe.Subscription,
  childrenCount: number
) {
  const supabase = createAdminClient()

  const { familyId, isExisting } = await createFamilyCore(supabase, userId, childrenCount)
  if (isExisting) return familyId

  const plan = await getOrCreatePlan(supabase, childrenCount)

  const { error: membershipError } = await supabase.from('memberships').insert({
    family_id: familyId,
    plan_id: plan.id,
    status: 'active',
    billing_cycle: subscription.items.data[0].price.recurring?.interval === 'year' ? 'yearly' : 'monthly',
    stripe_subscription_id: subscription.id,
    stripe_customer_id: subscription.customer as string,
    current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
    cancel_at_period_end: subscription.cancel_at_period_end,
    purchase_platform: 'web',
  })

  if (membershipError) {
    throw new Error('Failed to create membership')
  }

  return familyId
}

/**
 * Creates a family, membership, and codes for a user after an IAP purchase
 * via RevenueCat (App Store or Google Play).
 *
 * @returns The family ID (new or existing)
 */
export async function createFamilyAndMembershipFromIAP(
  userId: string,
  childrenCount: number,
  billingCycle: 'monthly' | 'yearly',
  revenuecatId: string,
  purchasePlatform: 'app_store' | 'play_store',
  currentPeriodEnd: Date,
) {
  const supabase = createAdminClient()

  const { familyId, isExisting } = await createFamilyCore(supabase, userId, childrenCount)

  // Idempotency: if family already exists, check if membership also exists
  if (isExisting) {
    const { data: existingMembership } = await supabase
      .from('memberships')
      .select('id')
      .eq('family_id', familyId)
      .maybeSingle()

    if (existingMembership) {
      console.log('Membership already exists for family, skipping (idempotent)')
      return familyId
    }
  }

  const plan = await getOrCreatePlan(supabase, childrenCount)

  const { error: membershipError } = await supabase.from('memberships').insert({
    family_id: familyId,
    plan_id: plan.id,
    status: 'active',
    billing_cycle: billingCycle,
    revenuecat_id: revenuecatId,
    purchase_platform: purchasePlatform,
    current_period_end: currentPeriodEnd.toISOString(),
    cancel_at_period_end: false,
  })

  if (membershipError) {
    throw new Error('Failed to create membership')
  }

  return familyId
}
