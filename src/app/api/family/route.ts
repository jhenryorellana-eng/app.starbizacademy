import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get user's family
    const { data: profile } = await supabase
      .from('profiles')
      .select('family_id')
      .eq('id', user.id)
      .single()

    if (!profile?.family_id) {
      return NextResponse.json({ error: 'No family found' }, { status: 404 })
    }

    // Get family with members and codes
    const { data: family, error } = await supabase
      .from('families')
      .select(`
        *,
        profiles!profiles_family_id_fkey (
          id,
          first_name,
          last_name,
          email,
          role
        ),
        family_codes (
          id,
          code,
          code_type,
          profile_id,
          status
        ),
        children (
          id,
          first_name,
          last_name,
          birth_date,
          city,
          country,
          family_code_id
        ),
        memberships (
          id,
          status,
          billing_cycle,
          current_period_end,
          cancel_at_period_end,
          plans (
            id,
            name,
            max_children,
            price_monthly,
            price_yearly
          ),
          pending_downgrades (
            id,
            new_children_count,
            children_to_keep,
            scheduled_for,
            status
          ),
          pending_billing_changes (
            id,
            new_billing_cycle,
            new_children_count,
            scheduled_for,
            status
          )
        )
      `)
      .eq('id', profile.family_id)
      .single()

    if (error) {
      console.error('Error fetching family:', error)
      return NextResponse.json({ error: 'Failed to fetch family' }, { status: 500 })
    }

    // DEBUG: Log membership data for cancel flow debugging
    console.log('[API /family] Membership data:', {
      membershipId: family?.memberships?.[0]?.id,
      cancel_at_period_end: family?.memberships?.[0]?.cancel_at_period_end,
      status: family?.memberships?.[0]?.status,
    })

    return NextResponse.json(family)
  } catch (error) {
    console.error('Error in family route:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
