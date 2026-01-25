import Stripe from 'stripe'
import { createAdminClient } from '@/lib/supabase/admin'
import { generateUniqueCodes } from '@/lib/codes/generator'

/**
 * Creates a family, membership, and parent code for a user after Stripe checkout
 * This is shared logic used by both the webhook and verify-session endpoint
 *
 * @returns The family ID (new or existing)
 */
export async function createFamilyAndMembership(
  userId: string,
  subscription: Stripe.Subscription,
  childrenCount: number
) {
  const supabase = createAdminClient()

  // Get user profile and check if family already exists
  const { data: profile } = await supabase
    .from('profiles')
    .select('first_name, last_name, email, family_id')
    .eq('id', userId)
    .single()

  if (!profile) {
    throw new Error('Profile not found')
  }

  // If user already has a family, return it (idempotent)
  if (profile.family_id) {
    return profile.family_id
  }

  // Create family
  const { data: family, error: familyError } = await supabase
    .from('families')
    .insert({
      name: `Familia ${profile.last_name}`,
    })
    .select()
    .single()

  if (familyError || !family) {
    throw new Error('Failed to create family')
  }

  // Update user profile with family_id
  await supabase
    .from('profiles')
    .update({ family_id: family.id })
    .eq('id', userId)

  // Get or create plan with the specified max_children
  let { data: plan } = await supabase
    .from('plans')
    .select('id')
    .eq('max_children', childrenCount)
    .single()

  // If no plan exists for this children count, use the generic "Familiar" plan
  if (!plan) {
    const { data: familiarPlan } = await supabase
      .from('plans')
      .select('id')
      .eq('name', 'Familiar')
      .single()

    if (familiarPlan) {
      plan = familiarPlan
    } else {
      // Create a new plan dynamically
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

  // Create membership
  if (!plan) {
    throw new Error('Failed to get or create plan')
  }
  const { error: membershipError } = await supabase.from('memberships').insert({
    family_id: family.id,
    plan_id: plan.id,
    status: 'active',
    billing_cycle: subscription.items.data[0].price.recurring?.interval === 'year' ? 'yearly' : 'monthly',
    stripe_subscription_id: subscription.id,
    stripe_customer_id: subscription.customer as string,
    current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
    cancel_at_period_end: subscription.cancel_at_period_end,
  })

  if (membershipError) {
    throw new Error('Failed to create membership')
  }

  // Generate parent code
  const [parentCode] = generateUniqueCodes('parent', 1)

  await supabase.from('family_codes').insert({
    code: parentCode,
    code_type: 'parent',
    family_id: family.id,
    profile_id: userId,
    status: 'active',
  })

  return family.id
}
