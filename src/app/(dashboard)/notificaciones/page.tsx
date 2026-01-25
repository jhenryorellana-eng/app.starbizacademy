import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { NotificacionesClient } from './NotificacionesClient'

export const metadata = {
  title: 'Notificaciones - Starbiz Academy',
  description: 'Centro de notificaciones de tu cuenta',
}

export default async function NotificacionesPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const { data: notifications } = await supabase
    .from('notifications')
    .select('*')
    .eq('profile_id', user.id)
    .order('created_at', { ascending: false })
    .limit(50)

  return <NotificacionesClient initialNotifications={notifications || []} />
}
