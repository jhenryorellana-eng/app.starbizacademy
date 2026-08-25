import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getUserFromRequest } from '@/lib/supabase/api-auth'

/**
 * POST /api/auth/create-enrollment-from-purchase
 *
 * Fallback for when the RevenueCat webhook has not processed the enrollment
 * IAP within the polling window on the mobile app. The app sends the purchase
 * data it already has from the SDK so we can mark the user as enrolled without
 * waiting for the webhook.
 *
 * Body: { productId: string, store: 'app_store' | 'play_store', transactionId?: string }
 */
export async function POST(request: NextRequest) {
  try {
    const user = await getUserFromRequest(request)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json().catch(() => ({}))
    const productId: string | undefined = body.productId
    const store: string | undefined = body.store
    const transactionId: string | undefined = body.transactionId

    if (!productId || (productId !== 'enrollment_one_time' && !productId.endsWith('.enrollment_one_time'))) {
      return NextResponse.json({ error: 'Invalid productId' }, { status: 400 })
    }

    const supabase = createAdminClient()

    const { data: existing } = await supabase
      .from('enrollments')
      .select('status, paid_at, purchase_platform')
      .eq('profile_id', user.id)
      .maybeSingle()

    // Idempotent: if already active, return what we have so the app can proceed.
    if (existing?.status === 'active') {
      return NextResponse.json({
        status: 'active',
        paid_at: existing.paid_at,
        purchase_platform: existing.purchase_platform,
        created: false,
      })
    }

    const purchasePlatform = store === 'play_store' ? 'play_store' as const : 'app_store' as const
    const rcTransactionId = transactionId || `fallback_${user.id}_${Date.now()}`

    const { error: upsertError } = await supabase.from('enrollments').upsert({
      profile_id: user.id,
      status: 'active',
      amount: 24.99,
      purchase_platform: purchasePlatform,
      revenuecat_product_id: productId,
      revenuecat_transaction_id: rcTransactionId,
      paid_at: new Date().toISOString(),
    }, { onConflict: 'profile_id' })

    if (upsertError) {
      console.error('Error upserting enrollment:', upsertError)
      return NextResponse.json({ error: 'Failed to record enrollment' }, { status: 500 })
    }

    return NextResponse.json({
      status: 'active',
      purchase_platform: purchasePlatform,
      paid_at: new Date().toISOString(),
      created: true,
    })
  } catch (error) {
    console.error('Create enrollment from purchase error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
