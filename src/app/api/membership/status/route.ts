import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getUserFromRequest } from '@/lib/supabase/api-auth'

type EnrollmentStatus = 'active' | 'pending' | 'refunded' | 'none'
type MembershipStatus = 'active' | 'past_due' | 'canceled' | 'expired' | 'none'

/**
 * GET /api/membership/status
 *
 * Single source of truth for the Padres 3.0 mobile app and web clients to
 * determine what a user has paid for. Returns enrollment ($25 one-time) and
 * membership (monthly/yearly) state plus the family code for the authenticated
 * parent. Used by the app to decide whether to gate the user behind the
 * enrollment paywall, and by mini-apps (indirectly via mini-app-exchange) to
 * filter content by is_free when membership is not active.
 */
export async function GET(request: NextRequest) {
  try {
    const user = await getUserFromRequest(request)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const supabase = createAdminClient()

    const [enrollmentResult, profileResult] = await Promise.all([
      supabase
        .from('enrollments')
        .select('status, amount, paid_at, purchase_platform')
        .eq('profile_id', user.id)
        .maybeSingle(),
      supabase
        .from('profiles')
        .select('family_id')
        .eq('id', user.id)
        .maybeSingle(),
    ])

    const enrollment = enrollmentResult.data
    const familyId = profileResult.data?.family_id ?? null

    let membership: {
      status: MembershipStatus
      billing_cycle: 'monthly' | 'yearly' | null
      current_period_end: string | null
      cancel_at_period_end: boolean
      purchase_platform: 'web' | 'app_store' | 'play_store' | null
      plan: { max_children: number } | null
    } = {
      status: 'none',
      billing_cycle: null,
      current_period_end: null,
      cancel_at_period_end: false,
      purchase_platform: null,
      plan: null,
    }

    let familyCode: string | null = null

    if (familyId) {
      const [membershipResult, codeResult] = await Promise.all([
        supabase
          .from('memberships')
          .select(`
            status,
            billing_cycle,
            current_period_end,
            cancel_at_period_end,
            purchase_platform,
            plans (max_children)
          `)
          .eq('family_id', familyId)
          .maybeSingle(),
        supabase
          .from('family_codes')
          .select('code')
          .eq('family_id', familyId)
          .eq('code_type', 'parent')
          .eq('status', 'active')
          .maybeSingle(),
      ])

      const m = membershipResult.data
      if (m) {
        const plansField = m.plans as
          | { max_children: number }[]
          | { max_children: number }
          | null
        const maxChildren =
          (Array.isArray(plansField) ? plansField[0]?.max_children : plansField?.max_children) ?? 1

        membership = {
          status: (m.status as MembershipStatus) ?? 'none',
          billing_cycle: (m.billing_cycle as 'monthly' | 'yearly') ?? null,
          current_period_end: m.current_period_end ?? null,
          cancel_at_period_end: Boolean(m.cancel_at_period_end),
          purchase_platform: (m.purchase_platform as 'web' | 'app_store' | 'play_store') ?? null,
          plan: { max_children: maxChildren },
        }
      }

      familyCode = codeResult.data?.code ?? null
    }

    // Normalize: a membership whose period already ended counts as expired even
    // if the webhook hasn't flipped status yet.
    if (
      membership.status === 'active' &&
      membership.current_period_end &&
      new Date(membership.current_period_end) < new Date()
    ) {
      membership.status = 'expired'
    }

    const enrollmentStatus: EnrollmentStatus = enrollment
      ? ((enrollment.status as EnrollmentStatus) ?? 'none')
      : 'none'

    return NextResponse.json(
      {
        enrollment: {
          status: enrollmentStatus,
          amount: enrollment?.amount ?? null,
          paid_at: enrollment?.paid_at ?? null,
          purchase_platform: enrollment?.purchase_platform ?? null,
        },
        membership,
        family: familyId ? { id: familyId, code: familyCode } : null,
      },
      { headers: { 'Cache-Control': 'no-store' } }
    )
  } catch (error) {
    console.error('Error in /api/membership/status:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
