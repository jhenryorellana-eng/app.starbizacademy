import { redirect } from 'next/navigation'
import { Header } from '@/components/layout'
import { Card, CardContent, Icon, Badge, Button } from '@/components/ui'
import Link from 'next/link'
import { CopyCodeButton } from './CopyCodeButton'
import { getProfile } from '@/lib/auth/actions'
import { createClient } from '@/lib/supabase/server'
import { getUnreadNotificationCount } from '@/lib/notifications/helpers'

export const metadata = {
  title: 'Inicio - Starbiz Academy',
  description: 'Panel principal de tu cuenta familiar',
}

type FamilyWithRelations = {
  id: string
  name: string
  created_at: string
  children: Array<{
    id: string
    first_name: string
    family_code_id: string | null
  }>
  family_codes: Array<{
    id: string
    code: string
    code_type: string
    profile_id: string | null
    status: string
  }>
  memberships: Array<{
    id: string
    status: string
    current_period_end: string | null
    plans: {
      id: string
      name: string
    } | null
  }>
}

async function getFamilyData(): Promise<FamilyWithRelations | null> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return null

  const { data: profileData } = await supabase
    .from('profiles')
    .select('family_id')
    .eq('id', user.id)
    .single()

  const profile = profileData as { family_id: string | null } | null

  if (!profile?.family_id) return null

  const { data: familyData } = await supabase
    .from('families')
    .select(`
      *,
      children (
        id,
        first_name,
        family_code_id
      ),
      family_codes (
        id,
        code,
        code_type,
        profile_id,
        status
      ),
      memberships (
        id,
        status,
        current_period_end,
        plans (
          id,
          name
        )
      )
    `)
    .eq('id', profile.family_id)
    .single()

  return familyData as FamilyWithRelations | null
}

export default async function InicioPage() {
  const profile = await getProfile()

  if (!profile) {
    redirect('/login')
  }

  const [family, notificationCount] = await Promise.all([
    getFamilyData(),
    getUnreadNotificationCount(),
  ])

  const membership = family?.memberships?.[0]
  const membershipStatus = membership?.status
  const membershipPlan = membership?.plans?.name || null
  const hasActiveMembership = membershipStatus === 'active'
  const currentPeriodEnd = membership?.current_period_end
  const daysRemaining = currentPeriodEnd
    ? Math.ceil((new Date(currentPeriodEnd).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
    : null

  // Get children with their codes
  const childrenWithCodes = family?.children?.map((child) => {
    const code = family.family_codes?.find(
      (c) => c.id === child.family_code_id
    )
    return {
      id: child.id,
      name: child.first_name,
      initial: child.first_name[0],
      code: code?.code || '---',
      lastAccess: 'Hoy',
      color: 'from-blue-200 to-blue-500',
    }
  }) || []

  const familyMembers = 1 + (family?.children?.length || 0)

  return (
    <>
      <Header
        title="Inicio"
        subtitle={`Bienvenido de nuevo, ${profile.first_name}`}
        notificationCount={notificationCount}
      />

      {/* Stats Cards */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Family Card */}
        <Link href="/familia">
          <Card className="p-6 border border-slate-100 group hover:shadow-md transition-all cursor-pointer">
            <div className="flex justify-between items-start mb-4">
              <div className="p-2 rounded-lg bg-pink-50 text-primary">
                <Icon name="diversity_3" />
              </div>
              <span className="text-xs font-semibold px-2 py-1 rounded-full bg-slate-100 text-slate-500 group-hover:bg-primary/10 group-hover:text-primary transition-colors">
                Gestionar
              </span>
            </div>
            <div>
              <p className="text-slate-500 text-sm font-medium mb-1">Familia</p>
              <p className="text-slate-900 text-2xl font-bold tracking-tight">
                {familyMembers} {familyMembers === 1 ? 'Miembro' : 'Miembros'}
              </p>
            </div>
          </Card>
        </Link>

        {/* Membership Card */}
        <Link href="/membresia">
          <Card className="p-6 border border-slate-100 group hover:shadow-md transition-all cursor-pointer">
            <div className="flex justify-between items-start mb-4">
              <div className="p-2 rounded-lg bg-blue-50 text-blue-600">
                <Icon name="credit_card" />
              </div>
              {membershipStatus === 'active' ? (
                <Badge variant="success">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  Activo
                </Badge>
              ) : membershipStatus === 'past_due' ? (
                <Badge variant="warning">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                  Pendiente
                </Badge>
              ) : membershipPlan ? (
                <Badge variant="danger">
                  <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
                  Inactivo
                </Badge>
              ) : (
                <Badge variant="info">
                  Sin Plan
                </Badge>
              )}
            </div>
            <div>
              <p className="text-slate-500 text-sm font-medium mb-1">Membresía</p>
              <p className="text-slate-900 text-2xl font-bold tracking-tight">
                {hasActiveMembership && daysRemaining !== null
                  ? `${daysRemaining} días`
                  : 'Sin membresía'}
              </p>
            </div>
          </Card>
        </Link>

        {/* Apps Card */}
        <Link href="/apps">
          <Card className="p-6 border border-slate-100 group hover:shadow-md transition-all cursor-pointer">
            <div className="flex justify-between items-start mb-4">
              <div className="p-2 rounded-lg bg-purple-50 text-purple-600">
                <Icon name="grid_view" />
              </div>
              <span className="text-xs font-semibold px-2 py-1 rounded-full bg-slate-100 text-slate-500 group-hover:bg-purple-50 group-hover:text-purple-600 transition-colors">
                Ver todas
              </span>
            </div>
            <div>
              <p className="text-slate-500 text-sm font-medium mb-1">Aplicaciones</p>
              <p className="text-slate-900 text-2xl font-bold tracking-tight">
                4 Disponibles
              </p>
            </div>
          </Card>
        </Link>
      </section>

      {/* Bottom Grid */}
      <section className="grid grid-cols-1 lg:grid-cols-2 gap-6 pb-8">
        {/* Quick Codes */}
        <Card className="border border-slate-100 flex flex-col h-full overflow-hidden">
          <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
            <h3 className="text-slate-900 font-bold text-lg">Códigos de Acceso Rápido</h3>
            <Link href="/familia" className="text-primary text-sm font-medium hover:text-primary-hover">
              Gestionar
            </Link>
          </div>
          <CardContent className="flex flex-col gap-4 flex-1">
            {!hasActiveMembership ? (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center mb-4">
                  <Icon name="lock" size="xl" className="text-slate-400" />
                </div>
                <h4 className="text-slate-700 font-semibold mb-2">Activa tu membresía</h4>
                <p className="text-slate-500 text-sm mb-4 max-w-xs">
                  Necesitas una membresía activa para ver los códigos de acceso de tu familia.
                </p>
                <Link href="/membresia">
                  <Button size="sm">Ver planes</Button>
                </Link>
              </div>
            ) : childrenWithCodes.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center mb-4">
                  <Icon name="person_add" size="xl" className="text-slate-400" />
                </div>
                <h4 className="text-slate-700 font-semibold mb-2">Agrega a tus hijos</h4>
                <p className="text-slate-500 text-sm mb-4 max-w-xs">
                  Aún no has agregado ningún hijo a tu cuenta familiar.
                </p>
                <Link href="/familia">
                  <Button size="sm">Agregar hijo</Button>
                </Link>
              </div>
            ) : (
              childrenWithCodes.map((child) => (
                <div
                  key={child.code}
                  className="flex items-center justify-between p-4 rounded-lg border border-slate-200 hover:border-primary/20 hover:bg-pink-50/30 transition-colors group"
                >
                  <div className="flex items-center gap-4">
                    <div className={`w-10 h-10 rounded-full bg-gradient-to-br ${child.color} flex items-center justify-center text-white font-bold text-sm shadow-sm`}>
                      {child.initial}
                    </div>
                    <div>
                      <p className="text-slate-900 font-semibold text-sm">{child.name}</p>
                      <p className="text-slate-500 text-xs">Último acceso: {child.lastAccess}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="bg-white/60 backdrop-blur-md border border-white/40 text-slate-800 px-3 py-1.5 rounded-lg font-mono text-sm tracking-widest shadow-sm">
                      {child.code.slice(-6)}
                    </div>
                    <CopyCodeButton code={child.code} />
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        {/* App Download Card */}
        <Card className="border border-slate-100 flex flex-col h-full overflow-hidden">
          <div className="p-6 border-b border-slate-100 bg-slate-50/50">
            <h3 className="text-slate-900 font-bold text-lg">Descarga Nuestras Apps</h3>
          </div>
          <CardContent className="flex-1">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Padres 3.0 */}
              <div className="p-4 rounded-xl bg-gradient-to-br from-pink-50 to-white border border-pink-100">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                    <Icon name="favorite" />
                  </div>
                  <div>
                    <h4 className="text-slate-900 font-bold">Padres 3.0</h4>
                    <p className="text-slate-500 text-xs">Para ti</p>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button className="flex items-center gap-2 bg-slate-900 hover:bg-slate-800 text-white px-3 py-1.5 rounded-lg transition-colors text-xs">
                    <Icon name="ios" size="sm" />
                    <span className="font-semibold">App Store</span>
                  </button>
                  <button className="flex items-center gap-2 bg-slate-900 hover:bg-slate-800 text-white px-3 py-1.5 rounded-lg transition-colors text-xs">
                    <Icon name="android" size="sm" />
                    <span className="font-semibold">Google Play</span>
                  </button>
                </div>
              </div>

              {/* CEO Junior */}
              <div className="p-4 rounded-xl bg-gradient-to-br from-indigo-50 to-white border border-indigo-100">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-lg bg-indigo-100 flex items-center justify-center text-indigo-600">
                    <Icon name="school" />
                  </div>
                  <div>
                    <h4 className="text-slate-900 font-bold">CEO Junior</h4>
                    <p className="text-slate-500 text-xs">Para tus hijos</p>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button className="flex items-center gap-2 bg-slate-900 hover:bg-slate-800 text-white px-3 py-1.5 rounded-lg transition-colors text-xs">
                    <Icon name="ios" size="sm" />
                    <span className="font-semibold">App Store</span>
                  </button>
                  <button className="flex items-center gap-2 bg-slate-900 hover:bg-slate-800 text-white px-3 py-1.5 rounded-lg transition-colors text-xs">
                    <Icon name="android" size="sm" />
                    <span className="font-semibold">Google Play</span>
                  </button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </section>
    </>
  )
}
