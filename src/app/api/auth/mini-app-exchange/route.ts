import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

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

    // 3. Get child data if child_id exists
    let childData = null
    let familyCode = ''

    if (codeData.child_id) {
      const { data: child } = await adminClient
        .from('children')
        .select('id, first_name, last_name, birth_date, family_code_id')
        .eq('id', codeData.child_id)
        .single()

      if (child) {
        childData = child

        // Get the family code
        if (child.family_code_id) {
          const { data: fc } = await adminClient
            .from('family_codes')
            .select('code')
            .eq('id', child.family_code_id)
            .single()

          if (fc) {
            familyCode = fc.code
          }
        }
      }
    }

    // 4. Get family_id from profile
    const { data: profile } = await adminClient
      .from('profiles')
      .select('family_id')
      .eq('id', codeData.user_id)
      .single()

    // 5. Return user data
    return NextResponse.json({
      user: {
        id: codeData.user_id,
        childId: childData?.id || null,
        firstName: childData?.first_name || '',
        lastName: childData?.last_name || '',
        dateOfBirth: childData?.birth_date || null,
        code: familyCode,
        familyId: profile?.family_id || '',
      }
    })
  } catch (error) {
    console.error('Mini app exchange error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
