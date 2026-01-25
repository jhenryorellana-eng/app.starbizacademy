import { NextRequest, NextResponse } from 'next/server'
import { stripe } from '@/lib/stripe/client'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

/**
 * Cancela un cambio de ciclo de facturación programado
 * Cancela el subscription_schedule en Stripe y revierte a la suscripción actual
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
      .select('id, stripe_subscription_id, billing_cycle')
      .eq('family_id', profile.family_id)
      .single()

    if (!membership?.stripe_subscription_id) {
      return NextResponse.json({ error: 'No active subscription found' }, { status: 404 })
    }

    const adminSupabase = createAdminClient()

    // Find the pending billing change
    const { data: pendingBillingChange, error: billingChangeError } = await adminSupabase
      .from('pending_billing_changes')
      .select('id, new_billing_cycle')
      .eq('membership_id', membership.id)
      .eq('status', 'pending')
      .single()

    if (billingChangeError || !pendingBillingChange) {
      return NextResponse.json(
        { error: 'No hay ningún cambio de ciclo pendiente' },
        { status: 404 }
      )
    }

    // Get current subscription from Stripe
    const subscription = await stripe.subscriptions.retrieve(membership.stripe_subscription_id)

    // Cancel any active subscription schedules for this customer
    const existingSchedules = await stripe.subscriptionSchedules.list({
      customer: subscription.customer as string,
    })

    for (const schedule of existingSchedules.data) {
      if (schedule.status === 'active' || schedule.status === 'not_started') {
        // Release the schedule without modifying the subscription
        await stripe.subscriptionSchedules.release(schedule.id)
      }
    }

    // Mark pending billing change as canceled
    await adminSupabase
      .from('pending_billing_changes')
      .update({ status: 'canceled' })
      .eq('id', pendingBillingChange.id)

    // Create notification
    const currentBillingCycleLabel = membership.billing_cycle === 'monthly' ? 'mensual' : 'anual'
    await adminSupabase.from('notifications').insert({
      profile_id: user.id,
      type: 'subscription_cycle_change_canceled',
      title: 'Cambio de ciclo cancelado',
      message: `Has cancelado el cambio de ciclo. Mantendrás tu facturación ${currentBillingCycleLabel}.`,
    })

    return NextResponse.json({
      success: true,
      message: 'Cambio de ciclo cancelado exitosamente',
      billingCycle: membership.billing_cycle,
    })
  } catch (error) {
    console.error('Cancel billing change error:', error)
    return NextResponse.json(
      { error: 'Error al cancelar el cambio de ciclo' },
      { status: 500 }
    )
  }
}
