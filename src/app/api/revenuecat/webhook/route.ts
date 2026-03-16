import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { createFamilyAndMembershipFromIAP } from '@/lib/stripe/family-setup'
import { sendPushToUser } from '@/lib/push-notifications'

const webhookAuthKey = process.env.REVENUECAT_WEBHOOK_AUTH_KEY

/**
 * Parses a RevenueCat product ID to extract children count and billing cycle.
 * Handles both full IDs (com.starbizacademy.padres30.family_3_monthly)
 * and normalized IDs (family_3_monthly).
 */
function parseProductId(productId: string): { childrenCount: number; billingCycle: 'monthly' | 'yearly' } | null {
  const match = productId.match(/family_(\d+)_(monthly|yearly)/)
  if (!match) return null
  return {
    childrenCount: parseInt(match[1]),
    billingCycle: match[2] as 'monthly' | 'yearly',
  }
}

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
  sendPushToUser(profileId, title, message, { type }).catch(console.error)
}

/**
 * POST /api/revenuecat/webhook
 *
 * Receives webhook events from RevenueCat for IAP subscription lifecycle.
 * See: https://www.revenuecat.com/docs/integrations/webhooks
 */
export async function POST(request: NextRequest) {
  // Verify webhook authentication
  const authHeader = request.headers.get('authorization')
  if (!webhookAuthKey || authHeader !== `Bearer ${webhookAuthKey}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = await request.json()
    const event = body.event

    if (!event) {
      return NextResponse.json({ error: 'No event in body' }, { status: 400 })
    }

    const eventType: string = event.type
    const appUserId: string | undefined = event.app_user_id
    const productId: string | undefined = event.product_id
    const store: string | undefined = event.store // APP_STORE, PLAY_STORE

    console.log('RevenueCat webhook:', { eventType, appUserId, productId, store })

    if (!appUserId) {
      console.error('RevenueCat webhook missing app_user_id')
      return NextResponse.json({ error: 'Missing app_user_id' }, { status: 400 })
    }

    // Skip anonymous RevenueCat IDs — we only process identified users
    if (appUserId.startsWith('$RCAnonymousID:')) {
      console.log('Skipping anonymous user webhook')
      return NextResponse.json({ received: true })
    }

    // Skip events from stores we don't handle (STRIPE is handled by Stripe webhook, PROMOTIONAL is free)
    const validStores = ['APP_STORE', 'PLAY_STORE']
    if (store && !validStores.includes(store)) {
      console.log(`Skipping webhook for store: ${store}`)
      return NextResponse.json({ received: true })
    }

    const supabase = createAdminClient()

    switch (eventType) {
      case 'INITIAL_PURCHASE':
      case 'NON_RENEWING_PURCHASE': {
        if (!productId) {
          console.error('INITIAL_PURCHASE missing product_id')
          break
        }

        const parsed = parseProductId(productId)
        if (!parsed) {
          console.error('Could not parse product_id:', productId)
          break
        }

        const purchasePlatform = store === 'PLAY_STORE' ? 'play_store' as const : 'app_store' as const

        // Extract expiration date from event
        const expirationAtMs = event.expiration_at_ms
        const currentPeriodEnd = expirationAtMs
          ? new Date(expirationAtMs)
          : new Date(Date.now() + (parsed.billingCycle === 'yearly' ? 365 : 30) * 24 * 60 * 60 * 1000)

        // Original transaction ID serves as the RevenueCat subscription identifier
        const revenuecatId = event.original_transaction_id || event.transaction_id || `rc_${Date.now()}`

        // Check if user already has a family (renewal of expired Stripe membership via IAP)
        const { data: existingProfile } = await supabase
          .from('profiles')
          .select('family_id')
          .eq('id', appUserId)
          .single()

        if (existingProfile?.family_id) {
          // User already has a family — update existing membership instead of creating new
          console.log('Existing family found, updating membership for family:', existingProfile.family_id)
          await supabase.from('memberships').update({
            status: 'active',
            current_period_end: currentPeriodEnd.toISOString(),
            revenuecat_id: revenuecatId,
            purchase_platform: purchasePlatform,
            billing_cycle: parsed.billingCycle,
            cancel_at_period_end: false,
          }).eq('family_id', existingProfile.family_id)
        } else {
          // New user — create family, membership, and codes from scratch
          await createFamilyAndMembershipFromIAP(
            appUserId,
            parsed.childrenCount,
            parsed.billingCycle,
            revenuecatId,
            purchasePlatform,
            currentPeriodEnd,
          )
        }

        await createNotification(
          appUserId,
          'subscription_created',
          'Bienvenido a Starbiz Academy!',
          `Tu membresia familiar con ${parsed.childrenCount} ${parsed.childrenCount === 1 ? 'hijo' : 'hijos'} ha sido activada exitosamente.`
        )
        break
      }

      case 'RENEWAL': {
        // Subscription renewed successfully
        const expirationAtMs = event.expiration_at_ms
        if (!expirationAtMs) break

        const newPeriodEnd = new Date(expirationAtMs).toISOString()

        // Find membership by revenuecat_id or by user's family
        const { data: profile } = await supabase
          .from('profiles')
          .select('family_id')
          .eq('id', appUserId)
          .single()

        if (profile?.family_id) {
          await supabase
            .from('memberships')
            .update({
              current_period_end: newPeriodEnd,
              status: 'active',
            })
            .eq('family_id', profile.family_id)

          await createNotification(
            appUserId,
            'subscription_renewed',
            'Suscripcion renovada',
            'Tu suscripcion se ha renovado exitosamente.'
          )
        }
        break
      }

      case 'CANCELLATION': {
        // User cancelled — subscription remains active until period end
        const { data: profile } = await supabase
          .from('profiles')
          .select('family_id')
          .eq('id', appUserId)
          .single()

        if (profile?.family_id) {
          await supabase
            .from('memberships')
            .update({ cancel_at_period_end: true })
            .eq('family_id', profile.family_id)

          const { data: membership } = await supabase
            .from('memberships')
            .select('current_period_end')
            .eq('family_id', profile.family_id)
            .single()

          const periodEnd = membership?.current_period_end
            ? new Date(membership.current_period_end).toLocaleDateString('es-ES', {
                day: 'numeric', month: 'long', year: 'numeric',
              })
            : 'el final del periodo'

          await createNotification(
            appUserId,
            'subscription_cancel_scheduled',
            'Cancelacion programada',
            `Tu suscripcion se cancelara el ${periodEnd}. Hasta entonces, seguiras teniendo acceso completo.`
          )
        }
        break
      }

      case 'EXPIRATION': {
        // Subscription has fully expired
        const { data: profile } = await supabase
          .from('profiles')
          .select('family_id')
          .eq('id', appUserId)
          .single()

        if (profile?.family_id) {
          await supabase
            .from('memberships')
            .update({ status: 'canceled' })
            .eq('family_id', profile.family_id)

          await createNotification(
            appUserId,
            'subscription_canceled',
            'Suscripcion cancelada',
            'Tu suscripcion ha expirado. Gracias por usar Starbiz Academy.'
          )
        }
        break
      }

      case 'PRODUCT_CHANGE': {
        // User changed subscription tier (upgrade/downgrade)
        if (!productId) break

        const parsed = parseProductId(productId)
        if (!parsed) break

        const { data: profile } = await supabase
          .from('profiles')
          .select('family_id')
          .eq('id', appUserId)
          .single()

        if (profile?.family_id) {
          // Find or create the new plan
          let { data: newPlan } = await supabase
            .from('plans')
            .select('id')
            .eq('max_children', parsed.childrenCount)
            .single()

          if (!newPlan) {
            const monthlyPrice = 17 + (parsed.childrenCount - 1) * 10
            const { data: createdPlan } = await supabase
              .from('plans')
              .insert({
                name: `Familiar ${parsed.childrenCount}`,
                max_children: parsed.childrenCount,
                price_monthly: monthlyPrice,
                price_yearly: Math.round(monthlyPrice * 12 * 0.75),
              })
              .select('id')
              .single()
            newPlan = createdPlan
          }

          if (newPlan) {
            await supabase
              .from('memberships')
              .update({
                plan_id: newPlan.id,
                billing_cycle: parsed.billingCycle,
              })
              .eq('family_id', profile.family_id)
          }
        }
        break
      }

      case 'BILLING_ISSUE': {
        // Payment failed
        const { data: profile } = await supabase
          .from('profiles')
          .select('family_id')
          .eq('id', appUserId)
          .single()

        if (profile?.family_id) {
          await supabase
            .from('memberships')
            .update({ status: 'past_due' })
            .eq('family_id', profile.family_id)

          await createNotification(
            appUserId,
            'payment_failed',
            'Fallo en el pago',
            'No pudimos procesar tu pago. Por favor actualiza tu metodo de pago en la configuracion de tu dispositivo.'
          )
        }
        break
      }

      default:
        console.log('Unhandled RevenueCat event type:', eventType)
    }

    return NextResponse.json({ received: true })
  } catch (error) {
    console.error('RevenueCat webhook error:', error)
    return NextResponse.json(
      { error: 'Webhook handler failed' },
      { status: 500 }
    )
  }
}
