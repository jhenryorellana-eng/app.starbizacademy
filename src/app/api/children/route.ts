import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { generateUniqueCodes } from '@/lib/codes/generator'
import { sendFamilyCodesEmail } from '@/lib/resend/emails'

interface ChildInput {
  firstName: string
  lastName: string
  birthDate: string
  city: string
  country: string
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const children: ChildInput[] = body.children

    if (!children || !Array.isArray(children) || children.length === 0) {
      return NextResponse.json({ error: 'No children provided' }, { status: 400 })
    }

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

    const maxChildren = membership?.plans?.max_children || 1

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

    // Get existing codes to avoid duplicates
    const { data: existingCodes } = await supabase
      .from('family_codes')
      .select('code')

    const existingCodeSet = new Set(existingCodes?.map((c) => c.code) || [])

    // Generate codes for children
    const childCodes = generateUniqueCodes('child', children.length, existingCodeSet)

    // Use admin client to insert data
    const adminClient = createAdminClient()

    // Create children and codes
    const createdChildren = []
    const createdCodes = []

    for (let i = 0; i < children.length; i++) {
      const child = children[i]
      const code = childCodes[i]

      // Create family code
      const { data: familyCode, error: codeError } = await adminClient
        .from('family_codes')
        .insert({
          code,
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

      // Create child
      const { data: createdChild, error: childError } = await adminClient
        .from('children')
        .insert({
          family_id: profile.family_id,
          first_name: child.firstName,
          last_name: child.lastName,
          birth_date: child.birthDate,
          city: child.city,
          country: child.country,
          family_code_id: familyCode.id,
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
      await adminClient.from('notifications').insert({
        profile_id: user.id,
        type: 'child_registered',
        title: `${child.first_name} registrado exitosamente`,
        message: `${child.first_name} ${child.last_name} ya puede acceder a CEO Junior con su código de familia.`,
      })
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

export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

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
