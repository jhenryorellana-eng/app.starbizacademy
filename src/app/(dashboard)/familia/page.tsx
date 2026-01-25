'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Header } from '@/components/layout'
import { Card, Icon, Badge, Button, Alert } from '@/components/ui'
import Link from 'next/link'

type FamilyData = {
  id: string
  name: string
  profiles: Array<{
    id: string
    first_name: string
    last_name: string
    role: string
  }>
  family_codes: Array<{
    id: string
    code: string
    code_type: 'parent' | 'child'
    profile_id: string | null
    status: string
  }>
  children: Array<{
    id: string
    first_name: string
    last_name: string
    family_code_id: string
  }>
  memberships: Array<{
    id: string
    status: 'active' | 'past_due' | 'canceled' | 'expired'
    plans: {
      id: string
      name: string
      max_children: number
    }
  }>
}

export default function FamiliaPage() {
  const router = useRouter()
  const [family, setFamily] = useState<FamilyData | null>(null)
  const [loading, setLoading] = useState(true)
  const [copiedCode, setCopiedCode] = useState<string | null>(null)
  const [notificationCount, setNotificationCount] = useState(0)

  useEffect(() => {
    async function fetchData() {
      try {
        const [familyResponse, notificationResponse] = await Promise.all([
          fetch('/api/family'),
          fetch('/api/notifications/count'),
        ])

        if (familyResponse.ok) {
          const data = await familyResponse.json()
          setFamily(data)
        }

        if (notificationResponse.ok) {
          const { count } = await notificationResponse.json()
          setNotificationCount(count)
        }
      } catch (error) {
        console.error('Error fetching data:', error)
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [])

  const copyCode = async (code: string) => {
    await navigator.clipboard.writeText(code)
    setCopiedCode(code)
    setTimeout(() => setCopiedCode(null), 2000)
  }

  const shareViaWhatsApp = (code: string, name: string) => {
    const message = encodeURIComponent(
      `¡Hola ${name}! Tu código de acceso para CEO Junior es: ${code}`
    )
    window.open(`https://wa.me/?text=${message}`, '_blank')
  }

  const shareViaEmail = (code: string, name: string) => {
    const subject = encodeURIComponent('Tu código de acceso a Starbiz Academy')
    const body = encodeURIComponent(
      `¡Hola ${name}!\n\nTu código de acceso para CEO Junior es: ${code}\n\nDescarga la app y usa este código para iniciar sesión.`
    )
    window.open(`mailto:?subject=${subject}&body=${body}`, '_blank')
  }

  const handleAddChild = () => {
    const maxChildrenAllowed = family?.memberships?.[0]?.plans?.max_children || 0
    const currentChildren = family?.children?.length || 0
    const remainingSlots = maxChildrenAllowed - currentChildren
    if (remainingSlots > 0) {
      router.push(`/onboarding/hijos?children=${remainingSlots}&hasMembership=true`)
    }
  }

  if (loading) {
    return (
      <>
        <Header
          title="Códigos de Acceso Familiar"
          subtitle="Gestiona y comparte los códigos de acceso de tu familia"
          notificationCount={notificationCount}
        />
        <div className="flex justify-center items-center py-20">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
        </div>
      </>
    )
  }

  const membership = family?.memberships?.[0]
  const membershipStatus = membership?.status
  const hasActiveMembership = membershipStatus === 'active'
  const currentPlan = membership?.plans?.name || 'Sin plan'
  const maxChildren = membership?.plans?.max_children || 0

  // Get parent info
  const parentProfile = family?.profiles?.find((p) => p.role === 'parent')
  const parentCode = family?.family_codes?.find((c) => c.code_type === 'parent')
  const parentName = parentProfile
    ? `${parentProfile.first_name} ${parentProfile.last_name}`
    : 'Usuario'
  const parentInitials = parentProfile
    ? `${parentProfile.first_name[0]}${parentProfile.last_name[0]}`
    : 'U'

  // Get children with their codes
  const childrenWithCodes = family?.children?.map((child) => {
    const code = family.family_codes?.find((c) => c.id === child.family_code_id)
    return {
      id: child.id,
      name: child.first_name,
      initial: child.first_name[0],
      code: code?.code || '---',
      lastAccess: 'Hoy',
    }
  }) || []

  // If no membership at all
  if (!membership) {
    return (
      <>
        <Header
          title="Códigos de Acceso Familiar"
          subtitle="Gestiona y comparte los códigos de acceso de tu familia"
          notificationCount={notificationCount}
        />
        <Card className="text-center p-8 md:p-12">
          <div className="w-20 h-20 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-6">
            <Icon name="lock" size="xl" className="text-slate-400" />
          </div>
          <h3 className="text-xl font-bold text-text-main mb-2">Activa tu membresía</h3>
          <p className="text-text-muted mb-6 max-w-md mx-auto">
            Necesitas una membresía activa para ver y gestionar los códigos de acceso de tu familia.
          </p>
          <Link href="/membresia">
            <Button>Ver planes disponibles</Button>
          </Link>
        </Card>
      </>
    )
  }

  // If membership is inactive (past_due, canceled, expired)
  const isInactive = membershipStatus !== 'active'

  return (
    <>
      <Header
        title="Códigos de Acceso Familiar"
        subtitle="Gestiona y comparte los códigos de acceso de tu familia"
        notificationCount={notificationCount}
      />

      {/* Info Alert */}
      <Alert variant="info" title="Cómo usar los códigos de acceso">
        <p>
          Usa estos códigos para iniciar sesión en las aplicaciones de Starbiz en tablets y teléfonos.{' '}
          <span className="font-semibold text-primary">No compartas tu código de padre con los niños.</span>
        </p>
      </Alert>

      {/* Inactive membership overlay */}
      {isInactive && (
        <Card className="bg-amber-50 border-amber-200 p-6">
          <div className="flex items-start gap-4">
            <div className="p-2 rounded-full bg-amber-100 text-amber-600 shrink-0">
              <Icon name="pause_circle" size="lg" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-amber-800 mb-1">Membresía temporalmente inactiva</h3>
              <p className="text-sm text-amber-700 mb-3">
                {membershipStatus === 'past_due'
                  ? 'Tu pago está pendiente. Actualiza tu método de pago para reactivar los códigos de acceso.'
                  : 'Tu membresía ha sido cancelada. Reactiva tu suscripción para continuar usando los códigos.'}
              </p>
              <Link href="/membresia">
                <Button size="sm" variant="primary">
                  {membershipStatus === 'past_due' ? 'Actualizar pago' : 'Reactivar membresía'}
                </Button>
              </Link>
            </div>
          </div>
        </Card>
      )}

      {/* Codes Grid */}
      <div className={`grid grid-cols-1 md:grid-cols-2 gap-6 ${isInactive ? 'relative' : ''}`}>
        {isInactive && (
          <div className="absolute inset-0 bg-white/60 backdrop-blur-[2px] z-10 rounded-lg" />
        )}

        {/* Parent Card */}
        <Card className="p-6 border border-slate-100 relative overflow-hidden">
          {/* Decorative top accent */}
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-primary/60 to-primary" />

          <div className="flex items-center gap-4 mb-6">
            <div className="w-14 h-14 rounded-full bg-gradient-to-br from-primary/20 to-primary ring-2 ring-offset-2 ring-primary/20 flex items-center justify-center text-white font-bold">
              {parentInitials}
            </div>
            <div>
              <h3 className="text-lg font-bold text-text-main">{parentName}</h3>
              <Badge variant="purple">Padre (Tú)</Badge>
            </div>
          </div>

          <div className="flex flex-col gap-2 mb-4">
            <label className="text-xs font-semibold text-text-muted uppercase tracking-wider">
              Tu Código de Acceso
            </label>
            <div className="bg-white/60 backdrop-blur-md border border-white/40 rounded-lg p-5 flex items-center justify-between shadow-sm">
              <span className="font-mono text-2xl md:text-3xl font-bold text-slate-800 tracking-widest">
                {parentCode?.code || '---'}
              </span>
              <button
                onClick={() => parentCode && copyCode(parentCode.code)}
                className="text-slate-500 hover:text-slate-700 hover:bg-slate-100 p-2 rounded-md transition-all"
                title="Copiar código"
              >
                <Icon name={copiedCode === parentCode?.code ? 'check' : 'content_copy'} />
              </button>
            </div>
          </div>

          <p className="text-xs text-slate-400 mt-auto">
            Mantén este código privado para gestionar la configuración familiar.
          </p>
        </Card>

        {/* Children Cards */}
        {childrenWithCodes.map((child) => (
          <Card key={child.id} className="p-6 border border-slate-100 relative overflow-hidden">
            {/* Decorative top accent */}
            <div className="absolute top-0 left-0 w-full h-1 bg-slate-200" />

            <div className="flex items-center gap-4 mb-6">
              <div className="w-14 h-14 rounded-full bg-gradient-to-br from-blue-200 to-blue-500 ring-2 ring-offset-2 ring-blue-400/20 flex items-center justify-center text-white font-bold">
                {child.initial}
              </div>
              <div>
                <h3 className="text-lg font-bold text-text-main">{child.name}</h3>
                <Badge variant="info">Estudiante</Badge>
              </div>
            </div>

            <div className="flex flex-col gap-2 mb-4">
              <label className="text-xs font-semibold text-text-muted uppercase tracking-wider">
                Código de Acceso Estudiante
              </label>
              <div className="bg-white/60 backdrop-blur-md border border-white/40 rounded-lg p-5 flex items-center justify-between shadow-sm">
                <span className="font-mono text-2xl md:text-3xl font-bold text-slate-800 tracking-widest">
                  {child.code}
                </span>
                <button
                  onClick={() => copyCode(child.code)}
                  className="text-slate-500 hover:text-slate-700 hover:bg-slate-100 p-2 rounded-md transition-all"
                  title="Copiar código"
                >
                  <Icon name={copiedCode === child.code ? 'check' : 'content_copy'} />
                </button>
              </div>
            </div>

            <div className="pt-2 border-t border-slate-100">
              <p className="text-xs font-semibold text-text-muted mb-3 uppercase tracking-wider">
                Compartir con {child.name}
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => shareViaWhatsApp(child.code, child.name)}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-[#25D366]/10 hover:bg-[#25D366]/20 text-[#075E54] rounded-lg font-medium text-sm transition-colors"
                >
                  <Icon name="chat" size="sm" />
                  WhatsApp
                </button>
                <button
                  onClick={() => shareViaEmail(child.code, child.name)}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-medium text-sm transition-colors"
                >
                  <Icon name="mail" size="sm" />
                  Email
                </button>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* Upsell Card */}
      {hasActiveMembership && childrenWithCodes.length < maxChildren && (
        <Card className="bg-gradient-to-r from-background-light to-white border border-primary/20 p-6 md:p-8 flex flex-col md:flex-row items-center justify-between gap-6 shadow-sm">
          <div className="flex items-center gap-6">
            <div className="bg-primary/10 p-4 rounded-full hidden md:block">
              <Icon name="person_add" size="xl" className="text-primary" />
            </div>
            <div className="flex flex-col gap-1 text-center md:text-left">
              <h3 className="text-xl font-bold text-text-main">¿Necesitas agregar más hijos?</h3>
              <p className="text-text-muted">
                Tu plan <span className="font-bold text-primary">{currentPlan}</span> permite hasta {maxChildren} {maxChildren === 1 ? 'hijo' : 'hijos'}.
                {childrenWithCodes.length < maxChildren && ` Puedes agregar ${maxChildren - childrenWithCodes.length} más.`}
              </p>
            </div>
          </div>
          <Button
            className="whitespace-nowrap w-full md:w-auto"
            onClick={handleAddChild}
          >
            Agregar Hijo
          </Button>
        </Card>
      )}

      {/* Upgrade Card */}
      {hasActiveMembership && childrenWithCodes.length >= maxChildren && maxChildren < 3 && (
        <Card className="bg-gradient-to-r from-background-light to-white border border-primary/20 p-6 md:p-8 flex flex-col md:flex-row items-center justify-between gap-6 shadow-sm">
          <div className="flex items-center gap-6">
            <div className="bg-primary/10 p-4 rounded-full hidden md:block">
              <Icon name="diversity_3" size="xl" className="text-primary" />
            </div>
            <div className="flex flex-col gap-1 text-center md:text-left">
              <h3 className="text-xl font-bold text-text-main">¿Necesitas agregar más hijos?</h3>
              <p className="text-text-muted">
                Mejora a <span className="font-bold text-primary">
                  {maxChildren === 1 ? 'Familiar Plus' : 'Familiar Premium'}
                </span> para desbloquear más perfiles de estudiante.
              </p>
            </div>
          </div>
          <Link href="/membresia">
            <Button className="whitespace-nowrap w-full md:w-auto">
              Ver Planes
            </Button>
          </Link>
        </Card>
      )}
    </>
  )
}
