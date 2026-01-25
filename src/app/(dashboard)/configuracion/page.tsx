import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { Header } from '@/components/layout'
import { PersonalInfoForm } from './components/personal-info-form'
import { PasswordForm } from './components/password-form'
import { ChildrenSection } from './components/children-section'
import { ActivitySection } from './components/activity-section'
import { LogoutButton } from './components/logout-button'
import { getUnreadNotificationCount } from '@/lib/notifications/helpers'

export default async function ConfiguracionPage() {
  const supabase = await createClient()

  // Get authenticated user
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // Fetch profile
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  if (profileError || !profile) {
    redirect('/login')
  }

  // Fetch notification count
  const notificationCount = await getUnreadNotificationCount()

  // Fetch children and membership if user has a family
  let children: Array<{
    id: string
    family_id: string
    first_name: string
    last_name: string
    birth_date: string
    city: string
    country: string
    family_code_id: string | null
    created_at: string
    family_codes: { code: string; status: string } | null
  }> = []

  let hasMembership = false
  let maxChildrenAllowed = 1

  if (profile.family_id) {
    const { data: childrenData } = await supabase
      .from('children')
      .select(`
        *,
        family_codes (
          code,
          status
        )
      `)
      .eq('family_id', profile.family_id)

    children = (childrenData || []) as typeof children

    // Check for active membership
    const { data: membership } = await supabase
      .from('memberships')
      .select(`
        status,
        plans (
          max_children
        )
      `)
      .eq('family_id', profile.family_id)
      .eq('status', 'active')
      .single()

    if (membership) {
      hasMembership = true
      maxChildrenAllowed = membership.plans?.max_children || 1
    }
  }

  return (
    <>
      <Header
        title="Configuración de Cuenta"
        subtitle="Gestiona tus datos personales, preferencias de seguridad y notificaciones"
        notificationCount={notificationCount}
      />

      {/* Personal Information Card */}
      <PersonalInfoForm profile={profile} />

      {/* Password Card */}
      <PasswordForm />

      {/* Children Section */}
      <ChildrenSection
        children={children}
        hasMembership={hasMembership}
        maxChildrenAllowed={maxChildrenAllowed}
      />

      {/* Activity Section */}
      <ActivitySection />

      {/* Logout */}
      <div className="pt-6 border-t border-slate-200">
        <LogoutButton />
      </div>
    </>
  )
}
