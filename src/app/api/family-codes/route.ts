import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get user's profile with family info
    const { data: profile } = await supabase
      .from('profiles')
      .select('family_id, first_name, last_name')
      .eq('id', user.id)
      .single()

    if (!profile?.family_id) {
      return NextResponse.json({ error: 'No family found' }, { status: 404 })
    }

    // Get parent code
    const { data: parentCode } = await supabase
      .from('family_codes')
      .select('code')
      .eq('family_id', profile.family_id)
      .eq('code_type', 'parent')
      .single()

    // Get children with their codes
    const { data: children } = await supabase
      .from('children')
      .select(`
        first_name,
        family_codes (
          code
        )
      `)
      .eq('family_id', profile.family_id)

    // Format response
    const response = {
      parent: {
        name: `${profile.first_name} ${profile.last_name}`,
        code: parentCode?.code || '',
      },
      children: children?.map((child) => {
        // family_codes is returned as an array from the Supabase relation
        const familyCodes = child.family_codes as { code: string }[] | { code: string } | null
        const code = Array.isArray(familyCodes) ? familyCodes[0]?.code : familyCodes?.code
        return {
          name: child.first_name,
          code: code || '',
        }
      }) || [],
    }

    return NextResponse.json(response)
  } catch (error) {
    console.error('Error in family-codes route:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
