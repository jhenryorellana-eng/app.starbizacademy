import { NextRequest, NextResponse } from 'next/server'
import { stripe, getAdditionalChildPriceId, getFamilyBasePriceId } from '@/lib/stripe/client'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { PRICING, calculateMonthlyPrice, calculateYearlyPrice } from '@/lib/pricing/config'
import { sendPushToUser } from '@/lib/push-notifications'

/**
 * Actualiza la suscripcion: cambio de hijos, ciclo, o ambos.
 * Todo se aplica inmediatamente.
 * - Upgrade: Cobro prorrateado inmediato
 * - Downgrade: Sin reembolso, codigos extra se desactivan
 * - Cambio de ciclo: Prorracion (credito por dias no usados)
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { newChildrenCount, childrenToKeep, newBillingCycle } = body as {
      newChildrenCount: number
      childrenToKeep?: string[]
      newBillingCycle?: 'monthly' | 'yearly'
    }

    if (!newChildrenCount || newChildrenCount < PRICING.minChildren || newChildrenCount > PRICING.maxChildren) {
      return NextResponse.json(
        { error: `childrenCount must be between ${PRICING.minChildren} and ${PRICING.maxChildren}` },
        { status: 400 }
      )
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('family_id')
      .eq('id', user.id)
      .single()

    if (!profile?.family_id) {
      return NextResponse.json({ error: 'No family found' }, { status: 404 })
    }

    const { data: membership } = await supabase
      .from('memberships')
      .select('id, stripe_subscription_id, plans(id, max_children), billing_cycle')
      .eq('family_id', profile.family_id)
      .single()

    if (!membership?.stripe_subscription_id) {
      return NextResponse.json({ error: 'No active subscription found' }, { status: 404 })
    }

    const plansData = membership.plans as { id: string; max_children: number }[] | { id: string; max_children: number } | null
    const currentChildrenCount = (Array.isArray(plansData) ? plansData[0]?.max_children : plansData?.max_children) || 1
    const currentBillingCycle = membership.billing_cycle as 'monthly' | 'yearly'
    const targetBillingCycle = newBillingCycle || currentBillingCycle
    const isBillingCycleChange = targetBillingCycle !== currentBillingCycle
    const isDowngrade = newChildrenCount < currentChildrenCount
    const isUpgrade = newChildrenCount > currentChildrenCount || (isBillingCycleChange && targetBillingCycle === 'yearly')

    if (newChildrenCount === currentChildrenCount && !isBillingCycleChange) {
      return NextResponse.json({ error: 'No changes to apply' }, { status: 400 })
    }

    const adminSupabase = createAdminClient()

    // Validate childrenToKeep for downgrades
    if (isDowngrade) {
      if (!childrenToKeep || childrenToKeep.length !== newChildrenCount) {
        return NextResponse.json(
          { error: `Debes seleccionar exactamente ${newChildrenCount} ${newChildrenCount === 1 ? 'hijo' : 'hijos'} para mantener` },
          { status: 400 }
        )
      }

      const { data: validChildren } = await adminSupabase
        .from('children')
        .select('id')
        .eq('family_id', profile.family_id)
        .in('id', childrenToKeep)

      if (!validChildren || validChildren.length !== childrenToKeep.length) {
        return NextResponse.json(
          { error: 'Algunos hijos seleccionados no son validos' },
          { status: 400 }
        )
      }
    }

    // Get current subscription from Stripe
    const subscription = await stripe.subscriptions.retrieve(membership.stripe_subscription_id)

    // Clean up any existing subscription schedules (from old system)
    try {
      const existingSchedules = await stripe.subscriptionSchedules.list({
        customer: subscription.customer as string,
      })
      for (const schedule of existingSchedules.data) {
        if (schedule.status === 'active' || schedule.status === 'not_started') {
          await stripe.subscriptionSchedules.release(schedule.id)
        }
      }
    } catch {
      // Ignore errors from schedule cleanup
    }

    // Find existing line items
    const baseItem = subscription.items.data.find(item =>
      item.price.id === process.env.STRIPE_PRICE_FAMILY_BASE_MONTHLY ||
      item.price.id === process.env.STRIPE_PRICE_FAMILY_BASE_YEARLY
    )

    const additionalChildItem = subscription.items.data.find(item =>
      item.price.id === process.env.STRIPE_PRICE_ADDITIONAL_CHILD_MONTHLY ||
      item.price.id === process.env.STRIPE_PRICE_ADDITIONAL_CHILD_YEARLY
    )

    // Build new items
    const newAdditionalChildren = Math.max(0, newChildrenCount - 1)
    const items: Array<{ id?: string; price?: string; quantity?: number; deleted?: boolean }> = []

    // Base price - always update if billing cycle changes
    if (baseItem) {
      if (isBillingCycleChange) {
        items.push({ id: baseItem.id, price: getFamilyBasePriceId(targetBillingCycle) })
      }
    }

    // Additional children
    if (additionalChildItem) {
      if (newAdditionalChildren === 0) {
        items.push({ id: additionalChildItem.id, deleted: true })
      } else if (isBillingCycleChange) {
        items.push({ id: additionalChildItem.id, price: getAdditionalChildPriceId(targetBillingCycle), quantity: newAdditionalChildren })
      } else {
        items.push({ id: additionalChildItem.id, quantity: newAdditionalChildren })
      }
    } else if (newAdditionalChildren > 0) {
      items.push({ price: getAdditionalChildPriceId(targetBillingCycle), quantity: newAdditionalChildren })
    }

    if (items.length === 0) {
      return NextResponse.json({ error: 'No changes to apply' }, { status: 400 })
    }

    // Update Stripe subscription immediately
    // Upgrades and cycle changes get proration; downgrades don't
    const updatedSubscription = await stripe.subscriptions.update(subscription.id, {
      items,
      proration_behavior: isUpgrade || isBillingCycleChange ? 'create_prorations' : 'none',
      metadata: {
        ...subscription.metadata,
        childrenCount: String(newChildrenCount),
        pendingDowngrade: 'false',
        childrenToKeep: '',
      },
    })

    // Find or create plan with new max_children
    let { data: newPlan } = await adminSupabase
      .from('plans')
      .select('id')
      .eq('max_children', newChildrenCount)
      .single()

    if (!newPlan) {
      const { data: createdPlan } = await adminSupabase
        .from('plans')
        .insert({
          name: `Familiar ${newChildrenCount}`,
          max_children: newChildrenCount,
          price_monthly: calculateMonthlyPrice(newChildrenCount),
          price_yearly: calculateYearlyPrice(newChildrenCount),
        })
        .select('id')
        .single()

      newPlan = createdPlan
    }

    // Update membership immediately
    if (newPlan) {
      await adminSupabase
        .from('memberships')
        .update({
          plan_id: newPlan.id,
          billing_cycle: targetBillingCycle,
          current_period_end: new Date(updatedSubscription.current_period_end * 1000).toISOString(),
          cancel_at_period_end: false,
        })
        .eq('id', membership.id)
    }

    // Cancel any pending downgrades/billing changes (cleanup from old system)
    await adminSupabase
      .from('pending_downgrades')
      .update({ status: 'canceled' })
      .eq('membership_id', membership.id)
      .eq('status', 'pending')

    await adminSupabase
      .from('pending_billing_changes')
      .update({ status: 'canceled' })
      .eq('membership_id', membership.id)
      .eq('status', 'pending')

    // Revoke codes for children not kept (downgrade)
    if (isDowngrade && childrenToKeep) {
      const { data: allChildren } = await adminSupabase
        .from('children')
        .select('id, family_code_id')
        .eq('family_id', profile.family_id)

      const childrenToRemove = allChildren?.filter(c => !childrenToKeep.includes(c.id)) || []

      for (const child of childrenToRemove) {
        if (child.family_code_id) {
          await adminSupabase
            .from('family_codes')
            .update({ status: 'revoked' })
            .eq('id', child.family_code_id)
        }
      }
    }

    // Create notification
    const cycleText = isBillingCycleChange
      ? ` (${targetBillingCycle === 'monthly' ? 'mensual' : 'anual'})`
      : ''
    const actionText = isDowngrade ? 'reducido' : isUpgrade ? 'actualizado' : 'modificado'
    const msg = `Tu plan ha sido ${actionText} a ${newChildrenCount} ${newChildrenCount === 1 ? 'hijo' : 'hijos'}${cycleText}.`

    await adminSupabase.from('notifications').insert({
      profile_id: user.id,
      type: 'subscription_updated',
      title: 'Plan actualizado',
      message: msg,
    })
    sendPushToUser(user.id, 'Plan actualizado', msg, { type: 'subscription_updated' }).catch(console.error)

    return NextResponse.json({
      success: true,
      newChildrenCount,
      newBillingCycle: targetBillingCycle,
      newMonthlyPrice: calculateMonthlyPrice(newChildrenCount),
      newYearlyPrice: calculateYearlyPrice(newChildrenCount),
      isDowngrade,
      isUpgrade,
      isBillingCycleChange,
    })
  } catch (error) {
    console.error('Update subscription error:', error)
    return NextResponse.json(
      { error: 'Error updating subscription' },
      { status: 500 }
    )
  }
}
