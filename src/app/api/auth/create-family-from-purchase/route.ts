import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getUserFromRequest } from '@/lib/supabase/api-auth'
import { createFamilyAndMembershipFromIAP } from '@/lib/stripe/family-setup'

const revenuecatApiKey = process.env.REVENUECAT_API_KEY_V1

/**
 * POST /api/auth/create-family-from-purchase
 *
 * Fallback endpoint for when the RevenueCat webhook fails to create
 * the family. The app calls this after polling post-purchase-info
 * times out. Verifies the user's active entitlement directly with
 * RevenueCat API and creates the family if valid.
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
      // Family already exists — return existing data (same as post-purchase-info)
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

    // No family yet — verify entitlement with RevenueCat
    if (!revenuecatApiKey) {
      return NextResponse.json({ error: 'Server configuration error' }, { status: 500 })
    }

    const rcResponse = await fetch(
      `https://api.revenuecat.com/v1/subscribers/${user.id}`,
      { headers: { Authorization: `Bearer ${revenuecatApiKey}` } }
    )

    if (!rcResponse.ok) {
      return NextResponse.json(
        { error: 'Could not verify purchase' },
        { status: 502 }
      )
    }

    const rcData = await rcResponse.json()
    const entitlement = rcData.subscriber?.entitlements?.starbiz_family_access

    if (!entitlement || !entitlement.product_identifier) {
      return NextResponse.json(
        { error: 'No active subscription found', familyId: null },
        { status: 404 }
      )
    }

    // Parse product ID to get plan details
    const match = entitlement.product_identifier.match(/family_(\d+)_(monthly|yearly)/)
    if (!match) {
      return NextResponse.json(
        { error: 'Invalid product identifier' },
        { status: 400 }
      )
    }

    const childrenCount = parseInt(match[1])
    const billingCycle = match[2] as 'monthly' | 'yearly'
    const purchasePlatform = entitlement.store === 'play_store' ? 'play_store' as const : 'app_store' as const
    const expiresDate = entitlement.expires_date
      ? new Date(entitlement.expires_date)
      : new Date(Date.now() + (billingCycle === 'yearly' ? 365 : 30) * 24 * 60 * 60 * 1000)
    const revenuecatId = entitlement.original_purchase_date || `fallback_${Date.now()}`

    // Create family, codes, and membership
    await createFamilyAndMembershipFromIAP(
      user.id,
      childrenCount,
      billingCycle,
      revenuecatId,
      purchasePlatform,
      expiresDate,
    )

    // Fetch the created data to return
    const { data: newProfile } = await supabase
      .from('profiles')
      .select('family_id')
      .eq('id', user.id)
      .single()

    const { data: parentCode } = await supabase
      .from('family_codes')
      .select('code')
      .eq('family_id', newProfile!.family_id)
      .eq('code_type', 'parent')
      .eq('status', 'active')
      .single()

    const { data: childCodes } = await supabase
      .from('family_codes')
      .select('code')
      .eq('family_id', newProfile!.family_id)
      .eq('code_type', 'child')
      .eq('status', 'active')

    return NextResponse.json({
      familyId: newProfile!.family_id,
      parentCode: parentCode?.code || null,
      childCodes: childCodes?.map(c => c.code) || [],
      created: true,
    })
  } catch (error) {
    console.error('Create family from purchase error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
