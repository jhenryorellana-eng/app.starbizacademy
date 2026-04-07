import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getUserFromRequest } from '@/lib/supabase/api-auth'

/**
 * GET /api/auth/post-purchase-info
 *
 * Returns family info + codes after an IAP purchase.
 * Called by the mobile app after the RevenueCat webhook
 * has processed the purchase and created the family/codes.
 *
 * The app polls this endpoint until familyId is returned,
 * as there may be a small delay between purchase confirmation
 * and webhook processing.
 */
export async function GET(request: NextRequest) {
  try {
    const user = await getUserFromRequest(request)

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const supabase = createAdminClient()

    // Get profile with family_id
    const { data: profile } = await supabase
      .from('profiles')
      .select('family_id, first_name, last_name')
      .eq('id', user.id)
      .single()

    if (!profile?.family_id) {
      // Family not yet created (webhook hasn't processed yet)
      return NextResponse.json({ familyId: null, pending: true })
    }

    // Get parent code
    const { data: parentCode } = await supabase
      .from('family_codes')
      .select('code')
      .eq('family_id', profile.family_id)
      .eq('code_type', 'parent')
      .eq('status', 'active')
      .single()

    // Get child codes
    const { data: childCodes } = await supabase
      .from('family_codes')
      .select('code')
      .eq('family_id', profile.family_id)
      .eq('code_type', 'child')
      .eq('status', 'active')

    // Get membership info
    const { data: membership } = await supabase
      .from('memberships')
      .select('status, billing_cycle, current_period_end, purchase_platform, plans (max_children)')
      .eq('family_id', profile.family_id)
      .eq('status', 'active')
      .single()

    const plans = membership?.plans as { max_children: number }[] | { max_children: number } | null
    const maxChildren = (Array.isArray(plans) ? plans[0]?.max_children : plans?.max_children) || 1

    return NextResponse.json({
      familyId: profile.family_id,
      parentCode: parentCode?.code || null,
      childCodes: childCodes?.map(c => c.code) || [],
      membership: membership ? {
        status: membership.status,
        billingCycle: membership.billing_cycle,
        currentPeriodEnd: membership.current_period_end,
        purchasePlatform: membership.purchase_platform,
        plan: {
          maxChildren,
        },
      } : null,
    })
  } catch (error) {
    console.error('Post-purchase info error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
