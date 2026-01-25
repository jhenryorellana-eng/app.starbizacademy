import { NextRequest, NextResponse } from 'next/server'
import { headers } from 'next/headers'
import Stripe from 'stripe'
import { stripe } from '@/lib/stripe/client'
import { createAdminClient } from '@/lib/supabase/admin'
import { createFamilyAndMembership } from '@/lib/stripe/family-setup'

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!

async function createNotification(
  profileId: string,
  type: string,
  title: string,
  message: string
) {
  const supabase = createAdminClient()

  await supabase.from('notifications').insert({
    profile_id: profileId,
    type,
    title,
    message,
  })
}

export async function POST(request: NextRequest) {
  const body = await request.text()
  const headersList = await headers()
  const signature = headersList.get('stripe-signature')

  if (!signature) {
    return NextResponse.json({ error: 'Missing signature' }, { status: 400 })
  }

  let event: Stripe.Event

  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret)
  } catch (err) {
    console.error('Webhook signature verification failed:', err)
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session
        const { userId, childrenCount } = session.metadata || {}

        if (userId && session.subscription) {
          const subscription = await stripe.subscriptions.retrieve(
            session.subscription as string
          )
          const children = childrenCount ? Number(childrenCount) : 1
          await createFamilyAndMembership(userId, subscription, children)

          // Create welcome notification
          await createNotification(
            userId,
            'subscription_created',
            '¡Bienvenido a Starbiz Academy!',
            `Tu membresía familiar con ${children} ${children === 1 ? 'hijo' : 'hijos'} ha sido activada exitosamente.`
          )
        }
        break
      }

      case 'invoice.payment_succeeded': {
        const invoice = event.data.object as Stripe.Invoice
        const subscriptionId = invoice.subscription as string

        if (subscriptionId) {
          const supabase = createAdminClient()

          const { data: membership } = await supabase
            .from('memberships')
            .select('family_id')
            .eq('stripe_subscription_id', subscriptionId)
            .single()

          if (membership) {
            const { data: profile } = await supabase
              .from('profiles')
              .select('id')
              .eq('family_id', membership.family_id)
              .eq('role', 'parent')
              .single()

            if (profile) {
              await createNotification(
                profile.id,
                'subscription_renewed',
                'Suscripción renovada',
                'Tu suscripción se ha renovado exitosamente.'
              )
            }
          }
        }
        break
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice
        const subscriptionId = invoice.subscription as string

        if (subscriptionId) {
          const supabase = createAdminClient()

          await supabase
            .from('memberships')
            .update({ status: 'past_due' })
            .eq('stripe_subscription_id', subscriptionId)

          const { data: membership } = await supabase
            .from('memberships')
            .select('family_id')
            .eq('stripe_subscription_id', subscriptionId)
            .single()

          if (membership) {
            const { data: profile } = await supabase
              .from('profiles')
              .select('id')
              .eq('family_id', membership.family_id)
              .eq('role', 'parent')
              .single()

            if (profile) {
              await createNotification(
                profile.id,
                'payment_failed',
                'Fallo en el pago',
                'No pudimos procesar tu pago. Por favor actualiza tu método de pago.'
              )
            }
          }
        }
        break
      }

      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription
        const supabase = createAdminClient()

        // Get current membership
        const { data: membership } = await supabase
          .from('memberships')
          .select('id, plan_id, family_id, cancel_at_period_end, plans(max_children)')
          .eq('stripe_subscription_id', subscription.id)
          .single()

        // Check if children count changed (from metadata or line items)
        const childrenCountFromMetadata = subscription.metadata?.childrenCount
          ? Number(subscription.metadata.childrenCount)
          : null

        // Calculate children count from line items
        const additionalChildItem = subscription.items.data.find(item => {
          const priceId = item.price.id
          return priceId === process.env.STRIPE_PRICE_ADDITIONAL_CHILD_MONTHLY ||
                 priceId === process.env.STRIPE_PRICE_ADDITIONAL_CHILD_YEARLY
        })
        const childrenFromItems = 1 + (additionalChildItem?.quantity || 0)

        // Use metadata if available, otherwise calculate from items
        const newChildrenCount = childrenCountFromMetadata || childrenFromItems
        const plansData = membership?.plans as { max_children: number }[] | { max_children: number } | null | undefined
        const currentChildrenCount = (Array.isArray(plansData) ? plansData[0]?.max_children : plansData?.max_children) || 1

        // Update membership basic fields
        const updateData: {
          status: string
          current_period_end: string
          cancel_at_period_end: boolean
          plan_id?: string
        } = {
          status: subscription.status === 'active' ? 'active' : 'past_due',
          current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
          cancel_at_period_end: subscription.cancel_at_period_end,
        }

        // Detect changes in cancel_at_period_end for notifications
        if (membership) {
          const wasScheduledToCancel = membership.cancel_at_period_end === true
          const isNowScheduledToCancel = subscription.cancel_at_period_end === true

          // Debug logging for cancellation status
          console.log('Cancel status check:', {
            membershipId: membership.id,
            wasScheduledToCancel,
            isNowScheduledToCancel,
            dbValue: membership.cancel_at_period_end,
            stripeValue: subscription.cancel_at_period_end,
            willCreateCancelNotification: !wasScheduledToCancel && isNowScheduledToCancel,
            willCreateReactivateNotification: wasScheduledToCancel && !isNowScheduledToCancel,
          })

          // User requested cancellation
          if (!wasScheduledToCancel && isNowScheduledToCancel) {
            const { data: parentProfile } = await supabase
              .from('profiles')
              .select('id')
              .eq('family_id', membership.family_id)
              .eq('role', 'parent')
              .single()

            if (parentProfile) {
              const periodEndDate = new Date(subscription.current_period_end * 1000)
                .toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' })

              await createNotification(
                parentProfile.id,
                'subscription_cancel_scheduled',
                'Cancelación programada',
                `Tu suscripción se cancelará el ${periodEndDate}. Hasta entonces, seguirás teniendo acceso completo a la plataforma.`
              )
            }
          }

          // User reactivated (canceled the cancellation)
          if (wasScheduledToCancel && !isNowScheduledToCancel) {
            const { data: parentProfile } = await supabase
              .from('profiles')
              .select('id')
              .eq('family_id', membership.family_id)
              .eq('role', 'parent')
              .single()

            if (parentProfile) {
              await createNotification(
                parentProfile.id,
                'subscription_reactivated',
                '¡Suscripción reactivada!',
                'Has cancelado la cancelación programada. Tu suscripción continuará renovándose automáticamente.'
              )
            }
          }
        }

        // Check if there's a pending downgrade that needs to be applied
        if (membership) {
          const { data: pendingDowngrade } = await supabase
            .from('pending_downgrades')
            .select('id, new_children_count, children_to_keep')
            .eq('membership_id', membership.id)
            .eq('status', 'pending')
            .single()

          if (pendingDowngrade) {
            // This is a downgrade being applied at period end
            const childrenToKeep = pendingDowngrade.children_to_keep as string[]

            // Deactivate family codes for children NOT in childrenToKeep
            // First, get all child family codes for this family
            const { data: allChildCodes } = await supabase
              .from('family_codes')
              .select('id, profile_id')
              .eq('family_id', membership.family_id)
              .eq('code_type', 'child')
              .eq('status', 'active')

            if (allChildCodes && allChildCodes.length > 0) {
              // Get children records to map family_code_id to child id
              const { data: allChildren } = await supabase
                .from('children')
                .select('id, family_code_id')
                .eq('family_id', membership.family_id)

              if (allChildren) {
                // Find children to deactivate (not in childrenToKeep)
                const childrenToDeactivate = allChildren.filter(
                  child => !childrenToKeep.includes(child.id)
                )

                // Deactivate their family codes
                const codeIdsToDeactivate = childrenToDeactivate
                  .map(c => c.family_code_id)
                  .filter(Boolean)

                if (codeIdsToDeactivate.length > 0) {
                  await supabase
                    .from('family_codes')
                    .update({ status: 'revoked' })
                    .in('id', codeIdsToDeactivate)

                  console.log(`Deactivated ${codeIdsToDeactivate.length} family codes for downgrade`)
                }
              }
            }

            // Mark pending downgrade as applied
            await supabase
              .from('pending_downgrades')
              .update({ status: 'applied' })
              .eq('id', pendingDowngrade.id)

            // Get parent profile for notification
            const { data: parentProfile } = await supabase
              .from('profiles')
              .select('id')
              .eq('family_id', membership.family_id)
              .eq('role', 'parent')
              .single()

            if (parentProfile) {
              await createNotification(
                parentProfile.id,
                'subscription_downgrade_applied',
                'Cambio de plan aplicado',
                `Tu plan se ha actualizado a ${pendingDowngrade.new_children_count} ${pendingDowngrade.new_children_count === 1 ? 'hijo' : 'hijos'}.`
              )
            }

            // Clear downgrade metadata from Stripe
            await stripe.subscriptions.update(subscription.id, {
              metadata: {
                ...subscription.metadata,
                pendingDowngrade: 'false',
                childrenToKeep: '',
              },
            })
          }
        }

        // If children count changed, update the plan
        if (membership && newChildrenCount !== currentChildrenCount) {
          // Find or create plan with new children count
          let { data: newPlan } = await supabase
            .from('plans')
            .select('id')
            .eq('max_children', newChildrenCount)
            .single()

          if (!newPlan) {
            const basePrice = 17
            const perChildPrice = 10
            const monthlyPrice = basePrice + (newChildrenCount - 1) * perChildPrice
            const yearlyPrice = Math.round(monthlyPrice * 12 * 0.75)

            const { data: createdPlan } = await supabase
              .from('plans')
              .insert({
                name: `Familiar ${newChildrenCount}`,
                max_children: newChildrenCount,
                price_monthly: monthlyPrice,
                price_yearly: yearlyPrice,
              })
              .select('id')
              .single()

            newPlan = createdPlan
          }

          if (newPlan) {
            updateData.plan_id = newPlan.id
          }
        }

        await supabase
          .from('memberships')
          .update(updateData)
          .eq('stripe_subscription_id', subscription.id)
        break
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription
        const supabase = createAdminClient()

        await supabase
          .from('memberships')
          .update({ status: 'canceled' })
          .eq('stripe_subscription_id', subscription.id)

        const { data: membership } = await supabase
          .from('memberships')
          .select('family_id')
          .eq('stripe_subscription_id', subscription.id)
          .single()

        if (membership) {
          const { data: profile } = await supabase
            .from('profiles')
            .select('id')
            .eq('family_id', membership.family_id)
            .eq('role', 'parent')
            .single()

          if (profile) {
            await createNotification(
              profile.id,
              'subscription_canceled',
              'Suscripción cancelada',
              'Tu suscripción ha sido cancelada. Gracias por usar Starbiz Academy.'
            )
          }
        }
        break
      }
    }

    return NextResponse.json({ received: true })
  } catch (error) {
    console.error('Webhook handler error:', error)
    return NextResponse.json(
      { error: 'Webhook handler failed' },
      { status: 500 }
    )
  }
}
