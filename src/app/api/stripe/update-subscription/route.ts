import { NextRequest, NextResponse } from 'next/server'
import { stripe, getAdditionalChildPriceId, getFamilyBasePriceId } from '@/lib/stripe/client'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { PRICING, calculateMonthlyPrice, calculateYearlyPrice } from '@/lib/pricing/config'

/**
 * Actualiza la suscripción para añadir/quitar hijos
 * - Upgrade (más hijos): Cobro proporcional inmediato
 * - Downgrade (menos hijos): Cambio aplica al final del período, SIN reembolso
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
      childrenToKeep?: string[] // Required for downgrades
      newBillingCycle?: 'monthly' | 'yearly'
    }

    // Validate input
    if (!newChildrenCount || newChildrenCount < PRICING.minChildren || newChildrenCount > PRICING.maxChildren) {
      return NextResponse.json(
        { error: `childrenCount must be between ${PRICING.minChildren} and ${PRICING.maxChildren}` },
        { status: 400 }
      )
    }

    // Get user's family and membership
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

    const currentChildrenCount = (membership.plans as { id: string; max_children: number })?.max_children || 1

    // Determine billing cycles
    const currentBillingCycle = membership.billing_cycle as 'monthly' | 'yearly'
    const targetBillingCycle = newBillingCycle || currentBillingCycle
    const isBillingCycleChange = targetBillingCycle !== currentBillingCycle

    if (newChildrenCount === currentChildrenCount && !isBillingCycleChange) {
      return NextResponse.json({ error: 'No changes to apply' }, { status: 400 })
    }

    const isDowngrade = newChildrenCount < currentChildrenCount
    const adminSupabase = createAdminClient()

    // For downgrades, validate childrenToKeep
    if (isDowngrade) {
      if (!childrenToKeep || childrenToKeep.length !== newChildrenCount) {
        return NextResponse.json(
          { error: `Debes seleccionar exactamente ${newChildrenCount} ${newChildrenCount === 1 ? 'hijo' : 'hijos'} para mantener` },
          { status: 400 }
        )
      }

      // Validate that selected children belong to this family
      const { data: validChildren, error: childrenError } = await adminSupabase
        .from('children')
        .select('id')
        .eq('family_id', profile.family_id)
        .in('id', childrenToKeep)

      if (childrenError || !validChildren || validChildren.length !== childrenToKeep.length) {
        return NextResponse.json(
          { error: 'Algunos hijos seleccionados no son válidos' },
          { status: 400 }
        )
      }

      // Check if there's already a pending downgrade
      const { data: existingDowngrade } = await adminSupabase
        .from('pending_downgrades')
        .select('id')
        .eq('membership_id', membership.id)
        .eq('status', 'pending')
        .single()

      if (existingDowngrade) {
        // Cancel the existing downgrade before creating a new one
        await adminSupabase
          .from('pending_downgrades')
          .update({ status: 'canceled' })
          .eq('id', existingDowngrade.id)
      }
    }

    // Get current subscription from Stripe
    const subscription = await stripe.subscriptions.retrieve(membership.stripe_subscription_id)

    // Find the additional child line item (if exists)
    const additionalChildItem = subscription.items.data.find(item => {
      const priceId = item.price.id
      return priceId === process.env.STRIPE_PRICE_ADDITIONAL_CHILD_MONTHLY ||
             priceId === process.env.STRIPE_PRICE_ADDITIONAL_CHILD_YEARLY
    })

    // Find the base plan item
    const baseItem = subscription.items.data.find(item => {
      const priceId = item.price.id
      return priceId === process.env.STRIPE_PRICE_FAMILY_BASE_MONTHLY ||
             priceId === process.env.STRIPE_PRICE_FAMILY_BASE_YEARLY
    })

    // Calculate new quantity for additional children
    const newAdditionalChildren = Math.max(0, newChildrenCount - 1)

    // Build items for update
    const additionalChildPriceId = getAdditionalChildPriceId(targetBillingCycle)

    const items: Array<{
      id?: string
      price?: string
      quantity?: number
      deleted?: boolean
    }> = []

    // If billing cycle changes, update base price
    if (isBillingCycleChange && baseItem) {
      items.push({
        id: baseItem.id,
        price: getFamilyBasePriceId(targetBillingCycle),
      })
    }

    if (additionalChildItem) {
      if (newAdditionalChildren === 0) {
        // Delete the additional child line item
        items.push({
          id: additionalChildItem.id,
          deleted: true,
        })
      } else if (isBillingCycleChange) {
        // Update quantity with new price
        items.push({
          id: additionalChildItem.id,
          price: additionalChildPriceId,
          quantity: newAdditionalChildren,
        })
      } else {
        // Update quantity only
        items.push({
          id: additionalChildItem.id,
          quantity: newAdditionalChildren,
        })
      }
    } else if (newAdditionalChildren > 0) {
      // Add new additional child line item
      items.push({
        price: additionalChildPriceId,
        quantity: newAdditionalChildren,
      })
    }

    // Downgrade only applies for child count decrease without billing cycle change
    const isEffectiveDowngrade = isDowngrade && !isBillingCycleChange

    if (isEffectiveDowngrade) {
      // DOWNGRADE: Schedule change for end of period, no proration/refund
      // Use subscription_schedule to apply changes at period end
      const scheduledFor = new Date(subscription.current_period_end * 1000)

      // Update Stripe subscription to apply at period end (no immediate charge)
      await stripe.subscriptions.update(subscription.id, {
        items,
        proration_behavior: 'none', // No proration for downgrades
        metadata: {
          ...subscription.metadata,
          childrenCount: String(newChildrenCount),
          pendingDowngrade: 'true',
          childrenToKeep: JSON.stringify(childrenToKeep),
        },
      })

      // Save pending downgrade to database
      await adminSupabase.from('pending_downgrades').insert({
        membership_id: membership.id,
        new_children_count: newChildrenCount,
        children_to_keep: childrenToKeep,
        scheduled_for: scheduledFor.toISOString(),
        status: 'pending',
      })

      // Create notification
      await adminSupabase.from('notifications').insert({
        profile_id: user.id,
        type: 'subscription_downgrade_scheduled',
        title: 'Cambio de plan programado',
        message: `Tu plan se reducirá a ${newChildrenCount} ${newChildrenCount === 1 ? 'hijo' : 'hijos'} el ${scheduledFor.toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' })}.`,
      })

      return NextResponse.json({
        success: true,
        isDowngrade: true,
        newChildrenCount,
        scheduledFor: scheduledFor.toISOString(),
        newMonthlyPrice: calculateMonthlyPrice(newChildrenCount),
        message: `El cambio se aplicará el ${scheduledFor.toLocaleDateString('es-ES', { day: 'numeric', month: 'long' })}`,
      })
    } else if (isBillingCycleChange) {
      // BILLING CYCLE CHANGE: Use subscription_schedule to program the change
      // Stripe doesn't allow mixing different intervals in the same subscription
      const scheduledFor = new Date(subscription.current_period_end * 1000)

      // Cancel any existing active schedules for this customer
      const existingSchedules = await stripe.subscriptionSchedules.list({
        customer: subscription.customer as string,
      })
      for (const schedule of existingSchedules.data) {
        if (schedule.status === 'active' || schedule.status === 'not_started') {
          await stripe.subscriptionSchedules.cancel(schedule.id)
        }
      }

      // Create a subscription schedule from the current subscription
      const schedule = await stripe.subscriptionSchedules.create({
        from_subscription: subscription.id,
      })

      // Build new line items for the new billing cycle
      const newLineItems = []

      // Add base price with new billing cycle
      newLineItems.push({
        price: getFamilyBasePriceId(targetBillingCycle),
        quantity: 1,
      })

      // Add additional children if any
      const newAdditionalChildrenForSchedule = Math.max(0, newChildrenCount - 1)
      if (newAdditionalChildrenForSchedule > 0) {
        newLineItems.push({
          price: getAdditionalChildPriceId(targetBillingCycle),
          quantity: newAdditionalChildrenForSchedule,
        })
      }

      // Update the schedule with two phases:
      // 1. Current phase until period end (maintain current plan)
      // 2. New phase with new billing cycle
      await stripe.subscriptionSchedules.update(schedule.id, {
        end_behavior: 'release',
        phases: [
          {
            // Current phase - keep until end of period
            items: subscription.items.data.map(item => ({
              price: item.price.id,
              quantity: item.quantity || 1,
            })),
            start_date: schedule.phases[0].start_date,
            end_date: subscription.current_period_end,
          },
          {
            // New phase with new billing cycle
            items: newLineItems,
            iterations: 1,
          },
        ],
      })

      // Save pending billing cycle change to database
      await adminSupabase.from('pending_billing_changes').insert({
        membership_id: membership.id,
        new_billing_cycle: targetBillingCycle,
        new_children_count: newChildrenCount,
        scheduled_for: scheduledFor.toISOString(),
        status: 'pending',
      })

      // Create notification
      const billingCycleLabel = targetBillingCycle === 'monthly' ? 'mensual' : 'anual'
      await adminSupabase.from('notifications').insert({
        profile_id: user.id,
        type: 'subscription_cycle_change_scheduled',
        title: 'Cambio de ciclo programado',
        message: `Tu facturación cambiará a ${billingCycleLabel} el ${scheduledFor.toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' })}.`,
      })

      return NextResponse.json({
        success: true,
        isScheduled: true,
        isBillingCycleChange: true,
        newChildrenCount,
        newBillingCycle: targetBillingCycle,
        scheduledFor: scheduledFor.toISOString(),
        newMonthlyPrice: calculateMonthlyPrice(newChildrenCount),
        message: `El cambio se aplicará el ${scheduledFor.toLocaleDateString('es-ES', { day: 'numeric', month: 'long' })}`,
      })
    } else {
      // UPGRADE: Immediate proration charge
      const updatedSubscription = await stripe.subscriptions.update(subscription.id, {
        items,
        proration_behavior: 'create_prorations',
        metadata: {
          ...subscription.metadata,
          childrenCount: String(newChildrenCount),
          pendingDowngrade: 'false',
        },
      })

      // Update database: find or create plan with new max_children
      let { data: newPlan } = await adminSupabase
        .from('plans')
        .select('id')
        .eq('max_children', newChildrenCount)
        .single()

      // If no plan exists, create one
      if (!newPlan) {
        const { data: createdPlan, error: planError } = await adminSupabase
          .from('plans')
          .insert({
            name: `Familiar ${newChildrenCount}`,
            max_children: newChildrenCount,
            price_monthly: calculateMonthlyPrice(newChildrenCount),
            price_yearly: calculateYearlyPrice(newChildrenCount),
          })
          .select('id')
          .single()

        if (planError || !createdPlan) {
          console.error('Failed to create plan:', planError)
        } else {
          newPlan = createdPlan
        }
      }

      // Update membership with new plan immediately
      if (newPlan) {
        await adminSupabase
          .from('memberships')
          .update({
            plan_id: newPlan.id,
            billing_cycle: targetBillingCycle,
            current_period_end: new Date(updatedSubscription.current_period_end * 1000).toISOString(),
          })
          .eq('id', membership.id)
      }

      // Create notification
      const billingCycleText = isBillingCycleChange
        ? ` con facturación ${targetBillingCycle === 'monthly' ? 'mensual' : 'anual'}`
        : ''
      await adminSupabase.from('notifications').insert({
        profile_id: user.id,
        type: 'subscription_updated',
        title: 'Plan actualizado',
        message: `Tu plan ha sido actualizado a ${newChildrenCount} ${newChildrenCount === 1 ? 'hijo' : 'hijos'}${billingCycleText}.`,
      })

      return NextResponse.json({
        success: true,
        isDowngrade: false,
        newChildrenCount,
        newMonthlyPrice: calculateMonthlyPrice(newChildrenCount),
      })
    }
  } catch (error) {
    console.error('Update subscription error:', error)
    return NextResponse.json(
      { error: 'Error updating subscription' },
      { status: 500 }
    )
  }
}
