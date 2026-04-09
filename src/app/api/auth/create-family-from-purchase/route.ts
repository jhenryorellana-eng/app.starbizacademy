import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getUserFromRequest } from '@/lib/supabase/api-auth'
import { createFamilyAndMembershipFromIAP } from '@/lib/stripe/family-setup'

/**
 * POST /api/auth/create-family-from-purchase
 *
 * Fallback endpoint for when the RevenueCat webhook fails to create
 * the family (race condition, network issue, etc). The app sends
 * the purchase details it already has from the RevenueCat SDK.
 *
 * Body: { productId: string, store: 'app_store' | 'play_store' }
 */
export async function POST(request: NextRequest) {
  try {
    const user = await getUserFromRequest(request)

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const supabase = createAdminClient()

    // Check if user already has a family
    const { data: profile } = await supabase
      .from('profiles')
      .select('family_id')
      .eq('id', user.id)
      .single()

    if (profile?.family_id) {
      // Family already exists — return existing data
      const { data: parentCode } = await supabase
        .from('family_codes')
        .select('code')
        .eq('family_id', profile.family_id)
        .eq('code_type', 'parent')
        .eq('status', 'active')
        .single()

      const { data: childCodes } = await supabase
        .from('family_codes')
        .select('code')
        .eq('family_id', profile.family_id)
        .eq('code_type', 'child')
        .eq('status', 'active')

      return NextResponse.json({
        familyId: profile.family_id,
        parentCode: parentCode?.code || null,
        childCodes: childCodes?.map(c => c.code) || [],
        created: false,
      })
    }

    // Parse request body for purchase details from the app
    const body = await request.json().catch(() => ({}))
    const productId: string | undefined = body.productId
    const store: string | undefined = body.store

    if (!productId) {
      return NextResponse.json({ error: 'Missing productId' }, { status: 400 })
    }

    // Parse product ID: family_1_monthly → { childrenCount: 1, billingCycle: 'monthly' }
    const match = productId.match(/family_(\d+)_(monthly|yearly)/)
    if (!match) {
      return NextResponse.json({ error: 'Invalid productId' }, { status: 400 })
    }

    const childrenCount = parseInt(match[1])
    const billingCycle = match[2] as 'monthly' | 'yearly'
    const purchasePlatform = store === 'play_store' ? 'play_store' as const : 'app_store' as const
    const expiresDate = new Date(Date.now() + (billingCycle === 'yearly' ? 365 : 30) * 24 * 60 * 60 * 1000)
    const revenuecatId = `fallback_${user.id}_${Date.now()}`

    // Create family, codes, and membership
    await createFamilyAndMembershipFromIAP(
      user.id,
      childrenCount,
      billingCycle,
      revenuecatId,
      purchasePlatform,
      expiresDate,
    )

    // Fetch the created data
    const { data: newProfile } = await supabase
      .from('profiles')
      .select('family_id')
      .eq('id', user.id)
      .single()

    if (!newProfile?.family_id) {
      return NextResponse.json({ error: 'Family creation failed' }, { status: 500 })
    }

    const { data: parentCode } = await supabase
      .from('family_codes')
      .select('code')
      .eq('family_id', newProfile.family_id)
      .eq('code_type', 'parent')
      .eq('status', 'active')
      .single()

    const { data: childCodes } = await supabase
      .from('family_codes')
      .select('code')
      .eq('family_id', newProfile.family_id)
      .eq('code_type', 'child')
      .eq('status', 'active')

    return NextResponse.json({
      familyId: newProfile.family_id,
      parentCode: parentCode?.code || null,
      childCodes: childCodes?.map(c => c.code) || [],
      created: true,
    })
  } catch (error) {
    console.error('Create family from purchase error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
