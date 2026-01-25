import { createClient } from '@/lib/supabase/server'

export async function getUnreadNotificationCount(): Promise<number> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return 0

  const { count } = await supabase
    .from('notifications')
    .select('*', { count: 'exact', head: true })
    .eq('profile_id', user.id)
    .is('read_at', null)

  return count || 0
}
