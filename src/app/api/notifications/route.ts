import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getUserFromRequest } from '@/lib/supabase/api-auth'

export async function GET(request: NextRequest) {
  try {
    const user = await getUserFromRequest(request)

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const supabase = createAdminClient()

    const { data: notifications, error } = await supabase
      .from('notifications')
      .select('*')
      .eq('profile_id', user.id)
      .order('created_at', { ascending: false })
      .limit(50)

    if (error) {
      console.error('Error fetching notifications:', error)
      return NextResponse.json({ error: 'Failed to fetch notifications' }, { status: 500 })
    }

    const formattedNotifications = (notifications || []).map((n: Record<string, unknown>) => ({
      id: n.id,
      type: n.type,
      title: n.title,
      message: n.message,
      readAt: n.read_at,
      createdAt: n.created_at,
      data: n.data,
      miniAppId: n.mini_app_id,
      source: n.source,
    }))

    return NextResponse.json({ notifications: formattedNotifications })
  } catch (error) {
    console.error('Error in notifications route:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
