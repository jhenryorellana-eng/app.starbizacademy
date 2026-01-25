import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

interface RouteParams {
  params: Promise<{
    id: string
  }>
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get user's profile to verify family membership
    const { data: profileData } = await supabase
      .from('profiles')
      .select('family_id, role')
      .eq('id', user.id)
      .single()

    const profile = profileData as { family_id: string | null; role: string } | null

    if (!profile?.family_id || profile.role !== 'parent') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Get child with family code
    const { data: child, error } = await supabase
      .from('children')
      .select(`
        *,
        family_codes (
          code,
          status
        )
      `)
      .eq('id', id)
      .eq('family_id', profile.family_id)
      .single()

    if (error || !child) {
      return NextResponse.json({ error: 'Child not found' }, { status: 404 })
    }

    return NextResponse.json(child)
  } catch (error) {
    console.error('Error in child GET route:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get user's profile to verify they are a parent
    const { data: profileData2 } = await supabase
      .from('profiles')
      .select('family_id, role')
      .eq('id', user.id)
      .single()

    const profile = profileData2 as { family_id: string | null; role: string } | null

    if (!profile?.family_id || profile.role !== 'parent') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Verify child belongs to user's family
    const { data: existingChild } = await supabase
      .from('children')
      .select('id')
      .eq('id', id)
      .eq('family_id', profile.family_id)
      .single()

    if (!existingChild) {
      return NextResponse.json({ error: 'Child not found' }, { status: 404 })
    }

    const body = await request.json()
    const { firstName, lastName, birthDate, city, country } = body

    // Build update object with only provided fields
    const updateData: Record<string, unknown> = {}
    if (firstName !== undefined) updateData.first_name = firstName
    if (lastName !== undefined) updateData.last_name = lastName
    if (birthDate !== undefined) updateData.birth_date = birthDate
    if (city !== undefined) updateData.city = city
    if (country !== undefined) updateData.country = country

    const { data: child, error } = await supabase
      .from('children')
      .update(updateData as never)
      .eq('id', id)
      .eq('family_id', profile.family_id)
      .select(`
        *,
        family_codes (
          code,
          status
        )
      `)
      .single()

    if (error) {
      console.error('Error updating child:', error)
      return NextResponse.json({ error: 'Failed to update child' }, { status: 500 })
    }

    return NextResponse.json(child)
  } catch (error) {
    console.error('Error in child PUT route:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
