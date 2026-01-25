import { NextRequest, NextResponse } from 'next/server'
import { stripe, getAdditionalChildPriceId, getFamilyBasePriceId } from '@/lib/stripe/client'
import { createClient } from '@/lib/supabase/server'
import { PRICING, calculateMonthlyPrice, calculateYearlyPrice } from '@/lib/pricing/config'

/**
 * Preview de cambio de suscripción
 * - Upgrade: muestra proration (cobro proporcional hoy)
 * - Downgrade: muestra fecha de aplicación (sin cobro/reembolso)
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { newChildrenCount, newBillingCycle } = body as {
      newChildrenCount: number
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
      .select('stripe_subscription_id, plans(max_children), billing_cycle')
      .eq('family_id', profile.family_id)
      .single()

    if (!membership?.stripe_subscription_id) {
      return NextResponse.json({ error: 'No active subscription found' }, { status: 404 })
    }

    const plansData = membership.plans as { max_children: number }[] | { max_children: number } | null
    const currentChildrenCount = (Array.isArray(plansData) ? plansData[0]?.max_children : plansData?.max_children) || 1

    // Determine if there's a billing cycle change
    const currentBillingCycle = membership.billing_cycle as 'monthly' | 'yearly'
    const targetBillingCycle = newBillingCycle || currentBillingCycle
    const hasBillingCycleChange = targetBillingCycle !== currentBillingCycle

    if (newChildrenCount === currentChildrenCount && !hasBillingCycleChange) {
      return NextResponse.json({ error: 'No changes to preview' }, { status: 400 })
    }

    const isDowngrade = newChildrenCount < currentChildrenCount
    const isBillingCycleChange = hasBillingCycleChange

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

    // Build items for preview
    const items: Array<{
      id?: string
      price?: string
      quantity?: number
      deleted?: boolean
    }> = []

    const additionalChildPriceId = getAdditionalChildPriceId(targetBillingCycle)

    // If billing cycle changes, update base price
    if (isBillingCycleChange && baseItem) {
      items.push({
        id: baseItem.id,
        price: getFamilyBasePriceId(targetBillingCycle),
      })
    }

    if (additionalChildItem) {
      if (newAdditionalChildren === 0) {
        items.push({
          id: additionalChildItem.id,
          deleted: true,
        })
      } else {
        items.push({
          id: additionalChildItem.id,
          quantity: newAdditionalChildren,
        })
      }
    } else if (newAdditionalChildren > 0) {
      items.push({
        price: additionalChildPriceId,
        quantity: newAdditionalChildren,
      })
    }

    // Calculate prices based on target billing cycle
    const currentMonthlyPrice = calculateMonthlyPrice(currentChildrenCount)
    const periodEnd = new Date(subscription.current_period_end * 1000).toISOString()

    // Calculate new price based on target billing cycle
    const newPrice = targetBillingCycle === 'monthly'
      ? calculateMonthlyPrice(newChildrenCount)
      : calculateYearlyPrice(newChildrenCount)
    const currentPrice = currentBillingCycle === 'monthly'
      ? calculateMonthlyPrice(currentChildrenCount)
      : calculateYearlyPrice(currentChildrenCount)

    // For display, we'll show the equivalent monthly price
    const newMonthlyEquivalent = targetBillingCycle === 'monthly'
      ? newPrice
      : Math.round(newPrice / 12)
    const currentMonthlyEquivalent = currentBillingCycle === 'monthly'
      ? currentPrice
      : Math.round(currentPrice / 12)
    const priceDifference = newMonthlyEquivalent - currentMonthlyEquivalent

    // Determine if this is effectively a downgrade (fewer children without cycle change)
    // Billing cycle change from yearly to monthly is not a downgrade in terms of Stripe proration
    const isEffectiveDowngrade = isDowngrade && !isBillingCycleChange

    if (isEffectiveDowngrade) {
      // DOWNGRADE: No proration, change applies at period end
      return NextResponse.json({
        currentChildrenCount,
        newChildrenCount,
        currentMonthlyPrice: currentMonthlyEquivalent,
        newMonthlyPrice: newMonthlyEquivalent,
        priceDifference,
        prorationAmount: 0, // No charge/refund for downgrade
        billingCycle: targetBillingCycle,
        currentBillingCycle,
        isBillingCycleChange,
        periodEnd,
        isDowngrade: true,
        scheduledFor: periodEnd,
        childrenToSelectCount: newChildrenCount,
        message: `El cambio se aplicará el ${new Date(periodEnd).toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' })}. No hay reembolso por el tiempo restante.`,
      })
    } else if (isBillingCycleChange) {
      // BILLING CYCLE CHANGE: Calculate preview locally (Stripe doesn't allow mixing intervals)
      // The change will be scheduled for the end of the current period
      const scheduledForDate = new Date(periodEnd)
      const formattedDate = scheduledForDate.toLocaleDateString('es-ES', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      })

      return NextResponse.json({
        currentChildrenCount,
        newChildrenCount,
        currentMonthlyPrice: currentMonthlyEquivalent,
        newMonthlyPrice: newMonthlyEquivalent,
        newTotalPrice: newPrice,
        priceDifference,
        prorationAmount: 0, // No immediate charge for billing cycle change
        billingCycle: targetBillingCycle,
        currentBillingCycle,
        isBillingCycleChange: true,
        isScheduled: true,
        periodEnd,
        isDowngrade: false,
        scheduledFor: periodEnd,
        message: `El cambio de ciclo se aplicará el ${formattedDate}`,
      })
    } else {
      // UPGRADE (same billing cycle): Calculate proration (immediate charge)
      const upcomingInvoice = await stripe.invoices.retrieveUpcoming({
        customer: subscription.customer as string,
        subscription: subscription.id,
        subscription_items: items,
        subscription_proration_behavior: 'create_prorations',
      })

      // Calculate the proration amount (what will be charged today)
      const prorationAmount = upcomingInvoice.lines.data
        .filter(line => line.proration)
        .reduce((sum, line) => sum + line.amount, 0)

      return NextResponse.json({
        currentChildrenCount,
        newChildrenCount,
        currentMonthlyPrice: currentMonthlyEquivalent,
        newMonthlyPrice: newMonthlyEquivalent,
        newTotalPrice: newPrice,
        priceDifference,
        prorationAmount: prorationAmount / 100, // Convert from cents
        billingCycle: targetBillingCycle,
        currentBillingCycle,
        isBillingCycleChange: false,
        periodEnd,
        isDowngrade: false,
        message: prorationAmount > 0
          ? `Se cobrará $${(prorationAmount / 100).toFixed(2)} hoy (proporcional)`
          : 'El cambio se aplicará inmediatamente',
      })
    }
  } catch (error) {
    console.error('Preview update error:', error)
    return NextResponse.json(
      { error: 'Error calculating preview' },
      { status: 500 }
    )
  }
}
