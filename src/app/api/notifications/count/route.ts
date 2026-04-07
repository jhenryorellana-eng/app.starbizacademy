import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getUserFromRequest } from '@/lib/supabase/api-auth'

export async function GET(request: NextRequest) {
  try {
    const user = await getUserFromRequest(request)

    if (!user) {
      return NextResponse.json({ count: 0 })
    }

    const supabase = createAdminClient()

    const { count } = await supabase
      .from('notifications')
      .select('*', { count: 'exact', head: true })
      .eq('profile_id', user.id)
      .is('read_at', null)

    return NextResponse.json({ count: count || 0 })
  } catch (error) {
    console.error('Error fetching notification count:', error)
    return NextResponse.json({ count: 0 })
  }
}
