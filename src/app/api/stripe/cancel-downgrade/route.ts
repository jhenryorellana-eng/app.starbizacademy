import { NextRequest, NextResponse } from 'next/server'
import { stripe, getAdditionalChildPriceId } from '@/lib/stripe/client'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

/**
 * Cancela un downgrade programado
 * Revierte la suscripción en Stripe a su estado original
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
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

    const adminSupabase = createAdminClient()

    // Find the pending downgrade
    const { data: pendingDowngrade, error: downgradeError } = await adminSupabase
      .from('pending_downgrades')
      .select('id, new_children_count')
      .eq('membership_id', membership.id)
      .eq('status', 'pending')
      .single()

    if (downgradeError || !pendingDowngrade) {
      return NextResponse.json(
        { error: 'No hay ningún downgrade pendiente' },
        { status: 404 }
      )
    }

    const currentChildrenCount = (membership.plans as { id: string; max_children: number })?.max_children || 1
    const billingCycle = membership.billing_cycle as 'monthly' | 'yearly'

    // Get current subscription from Stripe
    const subscription = await stripe.subscriptions.retrieve(membership.stripe_subscription_id)

    // Find the additional child line item (if exists)
    const additionalChildItem = subscription.items.data.find(item => {
      const priceId = item.price.id
      return priceId === process.env.STRIPE_PRICE_ADDITIONAL_CHILD_MONTHLY ||
             priceId === process.env.STRIPE_PRICE_ADDITIONAL_CHILD_YEARLY
    })

    // Revert to original children count
    const originalAdditionalChildren = Math.max(0, currentChildrenCount - 1)
    const additionalChildPriceId = getAdditionalChildPriceId(billingCycle)

    const items: Array<{
      id?: string
      price?: string
      quantity?: number
      deleted?: boolean
    }> = []

    if (additionalChildItem) {
      if (originalAdditionalChildren === 0) {
        // This shouldn't happen when reverting, but handle it
        items.push({
          id: additionalChildItem.id,
          deleted: true,
        })
      } else {
        // Restore original quantity
        items.push({
          id: additionalChildItem.id,
          quantity: originalAdditionalChildren,
        })
      }
    } else if (originalAdditionalChildren > 0) {
      // Re-add additional child line item
      items.push({
        price: additionalChildPriceId,
        quantity: originalAdditionalChildren,
      })
    }

    // Update Stripe subscription to revert the downgrade
    await stripe.subscriptions.update(subscription.id, {
      items,
      proration_behavior: 'none', // No proration when canceling downgrade
      metadata: {
        ...subscription.metadata,
        childrenCount: String(currentChildrenCount),
        pendingDowngrade: 'false',
        childrenToKeep: '',
      },
    })

    // Mark pending downgrade as canceled
    await adminSupabase
      .from('pending_downgrades')
      .update({ status: 'canceled' })
      .eq('id', pendingDowngrade.id)

    // Create notification
    await adminSupabase.from('notifications').insert({
      profile_id: user.id,
      type: 'subscription_downgrade_canceled',
      title: 'Cambio de plan cancelado',
      message: `Has cancelado el cambio de plan. Mantendrás tu plan actual con ${currentChildrenCount} ${currentChildrenCount === 1 ? 'hijo' : 'hijos'}.`,
    })

    return NextResponse.json({
      success: true,
      message: 'Downgrade cancelado exitosamente',
      childrenCount: currentChildrenCount,
    })
  } catch (error) {
    console.error('Cancel downgrade error:', error)
    return NextResponse.json(
      { error: 'Error al cancelar el downgrade' },
      { status: 500 }
    )
  }
}
