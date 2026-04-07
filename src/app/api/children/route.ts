import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getUserFromRequest } from '@/lib/supabase/api-auth'
import { generateUniqueCodes } from '@/lib/codes/generator'
import { sendFamilyCodesEmail } from '@/lib/resend/emails'
import { sendPushToUser } from '@/lib/push-notifications'

interface ChildInput {
  firstName: string
  lastName: string
  birthDate: string
  city: string
  country: string
}

export async function POST(request: NextRequest) {
  try {
    const user = await getUserFromRequest(request)

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const children: ChildInput[] = body.children

    if (!children || !Array.isArray(children) || children.length === 0) {
      return NextResponse.json({ error: 'No children provided' }, { status: 400 })
    }

    const supabase = createAdminClient()

    // Get user's profile and family
    const { data: profile } = await supabase
      .from('profiles')
      .select('family_id, first_name, last_name, email')
      .eq('id', user.id)
      .single()

    if (!profile?.family_id) {
      return NextResponse.json({ error: 'No family found' }, { status: 404 })
    }

    // Get family membership to check max children
    const { data: membership } = await supabase
      .from('memberships')
      .select('plans (max_children)')
      .eq('family_id', profile.family_id)
      .eq('status', 'active')
      .single()

    const plans = membership?.plans as { max_children: number }[] | { max_children: number } | null | undefined
    const maxChildren = (Array.isArray(plans) ? plans[0]?.max_children : plans?.max_children) || 1

    // Get existing children count
    const { count: existingChildrenCount } = await supabase
      .from('children')
      .select('*', { count: 'exact', head: true })
      .eq('family_id', profile.family_id)

    if ((existingChildrenCount || 0) + children.length > maxChildren) {
      return NextResponse.json(
        { error: `Cannot add more than ${maxChildren} children with current plan` },
        { status: 400 }
      )
    }

    // Find existing unlinked child codes (created by webhook but not yet linked to a child)
    const { data: unlinkedCodes } = await supabase
      .from('family_codes')
      .select('id, code')
      .eq('family_id', profile.family_id)
      .eq('code_type', 'child')
      .eq('status', 'active')

    // Determine which codes are already linked to a child record
    const { data: linkedChildren } = await supabase
      .from('children')
      .select('family_code_id')
      .eq('family_id', profile.family_id)

    const linkedCodeIds = new Set(linkedChildren?.map((c) => c.family_code_id).filter(Boolean) || [])
    const availableCodes = (unlinkedCodes || []).filter((c) => !linkedCodeIds.has(c.id))

    // Only generate new codes if we don't have enough unlinked ones
    const codesNeeded = Math.max(0, children.length - availableCodes.length)
    let newCodes: string[] = []
    if (codesNeeded > 0) {
      const { data: allCodes } = await supabase.from('family_codes').select('code')
      const existingCodeSet = new Set(allCodes?.map((c) => c.code) || [])
      newCodes = generateUniqueCodes('child', codesNeeded, existingCodeSet)
    }

    // Create children and codes
    const createdChildren = []
    const createdCodes = []

    for (let i = 0; i < children.length; i++) {
      const child = children[i]
      let familyCodeId: string
      let code: string

      if (i < availableCodes.length) {
        // Reuse existing unlinked code from webhook
        familyCodeId = availableCodes[i].id
        code = availableCodes[i].code
      } else {
        // Create new code (only when needed)
        const newCode = newCodes[i - availableCodes.length]
        const { data: familyCode, error: codeError } = await supabase
          .from('family_codes')
          .insert({
            code: newCode,
            code_type: 'child',
            family_id: profile.family_id,
            status: 'active',
          })
          .select()
          .single()

        if (codeError) {
          console.error('Error creating code:', codeError)
          continue
        }
        familyCodeId = familyCode.id
        code = newCode
      }

      // Create child linked to the code
      const { data: createdChild, error: childError } = await supabase
        .from('children')
        .insert({
          family_id: profile.family_id,
          first_name: child.firstName,
          last_name: child.lastName,
          birth_date: child.birthDate,
          city: child.city,
          country: child.country,
          family_code_id: familyCodeId,
        })
        .select()
        .single()

      if (childError) {
        console.error('Error creating child:', childError)
        continue
      }

      createdChildren.push(createdChild)
      createdCodes.push({ name: child.firstName, code })
    }

    // Get parent code
    const { data: parentCodeData } = await supabase
      .from('family_codes')
      .select('code')
      .eq('family_id', profile.family_id)
      .eq('code_type', 'parent')
      .single()

    // Send email with codes
    if (profile.email && parentCodeData) {
      await sendFamilyCodesEmail({
        to: profile.email,
        firstName: profile.first_name,
        parentCode: parentCodeData.code,
        childrenCodes: createdCodes,
      })
    }

    // Create notifications for each registered child
    for (const child of createdChildren) {
      const childTitle = `${child.first_name} registrado exitosamente`
      const childMsg = `${child.first_name} ${child.last_name} ya puede acceder a CEO Junior con su código de familia.`
      await supabase.from('notifications').insert({
        profile_id: user.id,
        type: 'child_registered',
        title: childTitle,
        message: childMsg,
      })
      sendPushToUser(user.id, childTitle, childMsg, { type: 'child_registered' }).catch(console.error)
    }

    return NextResponse.json({
      children: createdChildren,
      codes: createdCodes,
    })
  } catch (error) {
    console.error('Error in children route:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  try {
    const user = await getUserFromRequest(request)

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const supabase = createAdminClient()

    const { data: profile } = await supabase
      .from('profiles')
      .select('family_id')
      .eq('id', user.id)
      .single()

    if (!profile?.family_id) {
      return NextResponse.json({ error: 'No family found' }, { status: 404 })
    }

    const { data: children, error } = await supabase
      .from('children')
      .select(`
        *,
        family_codes (
          code,
          status
        )
      `)
      .eq('family_id', profile.family_id)

    if (error) {
      console.error('Error fetching children:', error)
      return NextResponse.json({ error: 'Failed to fetch children' }, { status: 500 })
    }

    return NextResponse.json(children)
  } catch (error) {
    console.error('Error in children GET route:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
