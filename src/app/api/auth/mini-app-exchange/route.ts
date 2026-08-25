import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

type EnrollmentStatus = 'active' | 'pending' | 'refunded' | 'none'
type MembershipStatus = 'active' | 'past_due' | 'canceled' | 'expired' | 'none'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { code } = body

    if (!code) {
      return NextResponse.json({ error: 'Code required' }, { status: 400 })
    }

    const adminClient = createAdminClient()

    // 1. Find valid code (not used, not expired)
    const { data: codeData, error: codeError } = await adminClient
      .from('mini_app_codes')
      .select('*')
      .eq('code', code)
      .is('used_at', null)
      .gt('expires_at', new Date().toISOString())
      .single()

    if (codeError || !codeData) {
      return NextResponse.json({ error: 'Invalid or expired code' }, { status: 401 })
    }

    // 2. Mark code as used
    await adminClient
      .from('mini_app_codes')
      .update({ used_at: new Date().toISOString() })
      .eq('id', codeData.id)

    // 3. Get profile data (always needed)
    const { data: profile } = await adminClient
      .from('profiles')
      .select('family_id, first_name, last_name')
      .eq('id', codeData.user_id)
      .single()

    // 3b. Get enrollment + membership status so mini-apps can filter content
    // by is_free when the user does not have an active membership. These are
    // embedded in the JWT that each mini-app issues downstream.
    const [enrollmentRes, membershipRes] = await Promise.all([
      adminClient
        .from('enrollments')
        .select('status')
        .eq('profile_id', codeData.user_id)
        .maybeSingle(),
      profile?.family_id
        ? adminClient
            .from('memberships')
            .select('status, current_period_end')
            .eq('family_id', profile.family_id)
            .maybeSingle()
        : Promise.resolve({ data: null }),
    ])

    const enrollmentStatus: EnrollmentStatus =
      (enrollmentRes.data?.status as EnrollmentStatus) ?? 'none'

    let membershipStatus: MembershipStatus =
      (membershipRes.data?.status as MembershipStatus) ?? 'none'
    // Normalize: active membership whose period end is past counts as expired.
    const mEnd = membershipRes.data?.current_period_end
    if (membershipStatus === 'active' && mEnd && new Date(mEnd) < new Date()) {
      membershipStatus = 'expired'
    }

    // 4. Get child data if child_id exists (for child mini apps)
    if (codeData.child_id) {
      const { data: child } = await adminClient
        .from('children')
        .select('id, first_name, last_name, birth_date, family_code_id')
        .eq('id', codeData.child_id)
        .single()

      let familyCode = ''
      if (child?.family_code_id) {
        const { data: fc } = await adminClient
          .from('family_codes')
          .select('code')
          .eq('id', child.family_code_id)
          .single()

        if (fc) {
          familyCode = fc.code
        }
      }

      return NextResponse.json({
        user: {
          id: codeData.user_id,
          childId: child?.id || null,
          firstName: child?.first_name || '',
          lastName: child?.last_name || '',
          dateOfBirth: child?.birth_date || null,
          code: familyCode,
          familyId: profile?.family_id || '',
        },
        enrollmentStatus,
        membershipStatus,
      })
    }

    // 5. Parent mini app flow (no child_id)
    // Get parent's family code
    let parentCode = ''
    if (profile?.family_id) {
      const { data: fc } = await adminClient
        .from('family_codes')
        .select('code')
        .eq('family_id', profile.family_id)
        .eq('code_type', 'parent')
        .eq('status', 'active')
        .single()

      if (fc) {
        parentCode = fc.code
      }
    }

    // Get parent's email from auth
    const { data: { user: authUser } } = await adminClient.auth.admin.getUserById(codeData.user_id)

    return NextResponse.json({
      user: {
        id: codeData.user_id,
        childId: null,
        firstName: profile?.first_name || '',
        lastName: profile?.last_name || '',
        email: authUser?.email || null,
        code: parentCode,
        familyId: profile?.family_id || '',
      },
      enrollmentStatus,
      membershipStatus,
    })
  } catch (error) {
    console.error('Mini app exchange error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
