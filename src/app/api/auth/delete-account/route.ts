import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { stripe } from '@/lib/stripe/client'

/**
 * DELETE /api/auth/delete-account
 *
 * Permanently deletes a parent account and all associated family data.
 * Required by Apple App Store Guideline 5.1.1(v).
 *
 * Flow:
 * 1. Authenticate via Bearer token
 * 2. Check for active IAP subscriptions (must be cancelled by user first)
 * 3. Cancel any active Stripe subscription
 * 4. Clean up RevenueCat subscriber (best-effort)
 * 5. Delete family (cascades to memberships, codes, children)
 * 6. Delete auth user (cascades to profile, notifications, sessions)
 * 7. Log deletion for compliance
 */
export async function DELETE(request: NextRequest) {
  try {
    // 1. Authenticate via Bearer token
    const authHeader = request.headers.get('Authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const token = authHeader.substring(7)

    const adminClient = createAdminClient()

    const { data: { user }, error: authError } = await adminClient.auth.getUser(token)
    if (authError || !user) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
    }

    // 2. Get profile
    const { data: profile } = await adminClient
      .from('profiles')
      .select('id, email, family_id, role')
      .eq('id', user.id)
      .single()

    if (!profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 })
    }

    // 3. Check membership and handle subscriptions
    if (profile.family_id) {
      const { data: membership } = await adminClient
        .from('memberships')
        .select('*')
        .eq('family_id', profile.family_id)
        .order('created_at', { ascending: false })
        .limit(1)
        .single()

      if (membership && membership.status === 'active') {
        // IAP subscriptions: user must cancel from device settings first
        if (
          (membership.purchase_platform === 'app_store' || membership.purchase_platform === 'play_store') &&
          !membership.cancel_at_period_end
        ) {
          return NextResponse.json({
            error: 'ACTIVE_SUBSCRIPTION',
            message: 'Debes cancelar tu suscripcion antes de eliminar tu cuenta',
            platform: membership.purchase_platform,
          }, { status: 409 })
        }

        // Stripe subscriptions: cancel immediately
        if (membership.stripe_subscription_id) {
          try {
            await stripe.subscriptions.cancel(membership.stripe_subscription_id)
          } catch (stripeError) {
            console.error('[Delete Account] Stripe cancellation error:', stripeError)
            // Continue with deletion even if Stripe cancel fails
          }
        }
      }

      // 4. Clean up RevenueCat subscriber (best-effort)
      if (membership?.revenuecat_id || user.id) {
        const rcApiKey = process.env.REVENUECAT_API_KEY_V1
        if (rcApiKey) {
          try {
            await fetch(
              `https://api.revenuecat.com/v1/subscribers/${user.id}`,
              {
                method: 'DELETE',
                headers: {
                  'Authorization': `Bearer ${rcApiKey}`,
                  'Content-Type': 'application/json',
                },
              }
            )
          } catch (rcError) {
            console.error('[Delete Account] RevenueCat cleanup error:', rcError)
          }
        }
      }

      // 5. Delete family (cascades to memberships, family_codes, children,
      //    pending_downgrades, pending_billing_changes)
      await adminClient
        .from('families')
        .delete()
        .eq('id', profile.family_id)
    }

    // 6. Log deletion for compliance (before deleting user)
    await adminClient
      .from('account_deletions')
      .insert({
        user_id: user.id,
        email: profile.email,
        family_id: profile.family_id,
      })

    // 7. Delete auth user (cascades to profile, notifications, login_sessions, push_tokens)
    const { error: deleteError } = await adminClient.auth.admin.deleteUser(user.id)
    if (deleteError) {
      console.error('[Delete Account] Auth deletion error:', deleteError)
      return NextResponse.json(
        { error: 'Failed to delete account' },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true, message: 'Cuenta eliminada exitosamente' })
  } catch (error) {
    console.error('[Delete Account] Unexpected error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
