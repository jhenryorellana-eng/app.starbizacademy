'use client'

import { useState, useEffect } from 'react'
import { Header } from '@/components/layout'
import { Card, Icon, Badge, Button } from '@/components/ui'
import {
  calculateMonthlyPrice,
  calculateYearlyPrice,
  calculateAnnualSavings,
  PRICING,
} from '@/lib/pricing/config'

const statusMap = {
  active: { label: 'Activo', variant: 'success' as const, icon: 'check_circle' },
  past_due: { label: 'Pago pendiente', variant: 'warning' as const, icon: 'warning' },
  canceled: { label: 'Cancelado', variant: 'danger' as const, icon: 'cancel' },
  expired: { label: 'Expirado', variant: 'danger' as const, icon: 'schedule' },
}

type ProrationPreview = {
  currentChildrenCount: number
  newChildrenCount: number
  currentMonthlyPrice: number
  newMonthlyPrice: number
  newTotalPrice?: number
  priceDifference: number
  prorationAmount: number
  billingCycle: 'monthly' | 'yearly'
  currentBillingCycle?: 'monthly' | 'yearly'
  isBillingCycleChange?: boolean
  isScheduled?: boolean
  periodEnd: string
  isDowngrade?: boolean
  scheduledFor?: string
  childrenToSelectCount?: number
  message?: string
}

type PendingDowngrade = {
  id: string
  new_children_count: number
  children_to_keep: string[]
  scheduled_for: string
  status: 'pending' | 'applied' | 'canceled'
}

type PendingBillingChange = {
  id: string
  new_billing_cycle: 'monthly' | 'yearly'
  new_children_count: number
  scheduled_for: string
  status: 'pending' | 'applied' | 'canceled'
}

type MembershipData = {
  id: string
  status: 'active' | 'past_due' | 'canceled' | 'expired'
  billing_cycle: 'monthly' | 'yearly'
  current_period_end: string
  cancel_at_period_end: boolean
  plans: {
    id: string
    name: string
    max_children: number
    price_monthly: number
    price_yearly: number
  }
  pending_downgrades?: PendingDowngrade[]
  pending_billing_changes?: PendingBillingChange[]
}

type ChildData = {
  id: string
  first_name: string
  last_name: string
  birth_date: string
  city: string
  country: string
  family_code_id: string | null
}

type FamilyData = {
  memberships: MembershipData[]
  children: ChildData[]
}

export default function MembresiaPage() {
  const [family, setFamily] = useState<FamilyData | null>(null)
  const [loading, setLoading] = useState(true)
  const [notificationCount, setNotificationCount] = useState(0)

  // State for modifying plan
  const [selectedChildren, setSelectedChildren] = useState<number | null>(null)
  const [preview, setPreview] = useState<ProrationPreview | null>(null)
  const [loadingPreview, setLoadingPreview] = useState(false)
  const [updating, setUpdating] = useState(false)
  const [updateError, setUpdateError] = useState<string | null>(null)
  const [updateSuccess, setUpdateSuccess] = useState(false)

  // State for billing cycle change
  const [newBillingCycle, setNewBillingCycle] = useState<'monthly' | 'yearly' | null>(null)

  // State for downgrade child selection
  const [childrenToKeep, setChildrenToKeep] = useState<string[]>([])

  // State for canceling downgrade
  const [cancelingDowngrade, setCancelingDowngrade] = useState(false)

  // State for canceling billing change
  const [cancelingBillingChange, setCancelingBillingChange] = useState(false)

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

  const handleManageSubscription = async () => {
    try {
      const response = await fetch('/api/stripe/create-portal', {
        method: 'POST',
      })

      if (response.ok) {
        const { url } = await response.json()
        window.location.href = url
      }
    } catch (error) {
      console.error('Error creating portal session:', error)
    }
  }

  const handleSubscribe = () => {
    window.location.href = '/onboarding/plan'
  }

  const handleChildrenSelect = async (count: number) => {
    const effectiveBillingCycle = newBillingCycle || membership?.billing_cycle
    const isBillingCycleChange = effectiveBillingCycle !== membership?.billing_cycle

    // Allow same count only if billing cycle is different
    if (count === childrenCount && !isBillingCycleChange) {
      setSelectedChildren(null)
      setPreview(null)
      setChildrenToKeep([])
      return
    }

    setSelectedChildren(count)
    setLoadingPreview(true)
    setUpdateError(null)
    setChildrenToKeep([])

    try {
      const response = await fetch('/api/stripe/preview-update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          newChildrenCount: count,
          newBillingCycle: newBillingCycle || membership.billing_cycle,
        }),
      })

      if (response.ok) {
        const data = await response.json()
        setPreview(data)
      } else {
        const error = await response.json()
        setUpdateError(error.error || 'Error al obtener preview')
        setSelectedChildren(null)
      }
    } catch (error) {
      console.error('Error fetching preview:', error)
      setUpdateError('Error de conexión')
      setSelectedChildren(null)
    } finally {
      setLoadingPreview(false)
    }
  }

  const handleChildToggle = (childId: string) => {
    setChildrenToKeep(prev => {
      if (prev.includes(childId)) {
        return prev.filter(id => id !== childId)
      }
      // Only add if we haven't reached the limit
      if (preview?.childrenToSelectCount && prev.length >= preview.childrenToSelectCount) {
        return prev
      }
      return [...prev, childId]
    })
  }

  const handleConfirmUpdate = async () => {
    if (!selectedChildren) return

    // For downgrades, validate child selection
    if (preview?.isDowngrade) {
      if (childrenToKeep.length !== selectedChildren) {
        setUpdateError(`Debes seleccionar exactamente ${selectedChildren} ${selectedChildren === 1 ? 'hijo' : 'hijos'} para mantener`)
        return
      }
    }

    setUpdating(true)
    setUpdateError(null)

    try {
      const response = await fetch('/api/stripe/update-subscription', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          newChildrenCount: selectedChildren,
          newBillingCycle: newBillingCycle || membership.billing_cycle,
          ...(preview?.isDowngrade ? { childrenToKeep } : {}),
        }),
      })

      if (response.ok) {
        const data = await response.json()
        setUpdateSuccess(true)
        setSelectedChildren(null)
        setPreview(null)
        setChildrenToKeep([])
        setNewBillingCycle(null)
        // Refetch family data
        const familyResponse = await fetch('/api/family')
        if (familyResponse.ok) {
          const familyData = await familyResponse.json()
          setFamily(familyData)
        }
      } else {
        const error = await response.json()
        setUpdateError(error.error || 'Error al actualizar suscripción')
      }
    } catch (error) {
      console.error('Error updating subscription:', error)
      setUpdateError('Error de conexión')
    } finally {
      setUpdating(false)
    }
  }

  const handleCancelUpdate = () => {
    setSelectedChildren(null)
    setPreview(null)
    setUpdateError(null)
    setChildrenToKeep([])
    setNewBillingCycle(null)
  }

  const handleCancelDowngrade = async () => {
    setCancelingDowngrade(true)
    setUpdateError(null)

    try {
      const response = await fetch('/api/stripe/cancel-downgrade', {
        method: 'POST',
      })

      if (response.ok) {
        // Refetch family data
        const familyResponse = await fetch('/api/family')
        if (familyResponse.ok) {
          const familyData = await familyResponse.json()
          setFamily(familyData)
        }
      } else {
        const error = await response.json()
        setUpdateError(error.error || 'Error al cancelar el cambio')
      }
    } catch (error) {
      console.error('Error canceling downgrade:', error)
      setUpdateError('Error de conexión')
    } finally {
      setCancelingDowngrade(false)
    }
  }

  const handleCancelBillingChange = async () => {
    setCancelingBillingChange(true)
    setUpdateError(null)

    try {
      const response = await fetch('/api/stripe/cancel-billing-change', {
        method: 'POST',
      })

      if (response.ok) {
        // Refetch family data
        const familyResponse = await fetch('/api/family')
        if (familyResponse.ok) {
          const familyData = await familyResponse.json()
          setFamily(familyData)
        }
      } else {
        const error = await response.json()
        setUpdateError(error.error || 'Error al cancelar el cambio de ciclo')
      }
    } catch (error) {
      console.error('Error canceling billing change:', error)
      setUpdateError('Error de conexión')
    } finally {
      setCancelingBillingChange(false)
    }
  }

  if (loading) {
    return (
      <>
        <Header
          title="Membresía y Suscripción"
          subtitle="Gestiona tu plan familiar y detalles de facturación"
          notificationCount={notificationCount}
        />
        <div className="flex justify-center items-center py-20">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
        </div>
      </>
    )
  }

  const membership = family?.memberships?.[0]

  // DEBUG: Log membership data for cancel flow debugging
  console.log('[UI /membresia] Membership received:', {
    membershipId: membership?.id,
    cancel_at_period_end: membership?.cancel_at_period_end,
    typeOf: typeof membership?.cancel_at_period_end,
  })

  const currentPlan = membership?.plans
  const status = membership ? statusMap[membership.status] : null
  const childrenCount = currentPlan?.max_children || 1
  const children = family?.children || []

  // Get pending downgrade if exists
  const pendingDowngrade = membership?.pending_downgrades?.find(
    (pd) => pd.status === 'pending'
  )

  // Get pending billing change if exists
  const pendingBillingChange = membership?.pending_billing_changes?.find(
    (pbc) => pbc.status === 'pending'
  )

  // Format date
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('es-ES', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    })
  }

  // Calculate prices from config (in case DB values differ)
  const monthlyPrice = calculateMonthlyPrice(childrenCount)
  const yearlyPrice = calculateYearlyPrice(childrenCount)
  const annualSavings = calculateAnnualSavings(childrenCount)

  return (
    <>
      <Header
        title="Membresía y Suscripción"
        subtitle="Gestiona tu plan familiar y detalles de facturación"
        notificationCount={notificationCount}
      />

      {/* Pending Downgrade Banner */}
      {pendingDowngrade && (
        <div className="mb-4 p-4 rounded-lg bg-amber-50 border border-amber-200">
          <div className="flex items-start gap-3">
            <Icon name="schedule" className="text-amber-600 mt-0.5" />
            <div className="flex-1">
              <p className="font-medium text-amber-800">
                Cambio de plan programado
              </p>
              <p className="text-sm text-amber-700 mt-1">
                Tu plan se reducirá a {pendingDowngrade.new_children_count}{' '}
                {pendingDowngrade.new_children_count === 1 ? 'hijo' : 'hijos'} el{' '}
                {formatDate(pendingDowngrade.scheduled_for)}.
              </p>
              <button
                onClick={handleCancelDowngrade}
                disabled={cancelingDowngrade}
                className="mt-2 text-sm text-amber-700 hover:text-amber-900 font-semibold underline flex items-center gap-1"
              >
                {cancelingDowngrade ? (
                  <>
                    <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-amber-700" />
                    Cancelando...
                  </>
                ) : (
                  <>
                    <Icon name="close" size="sm" />
                    Cancelar este cambio
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Pending Billing Change Banner */}
      {pendingBillingChange && (
        <div className="mb-4 p-4 rounded-lg bg-blue-50 border border-blue-200">
          <div className="flex items-start gap-3">
            <Icon name="sync" className="text-blue-600 mt-0.5" />
            <div className="flex-1">
              <p className="font-medium text-blue-800">
                Cambio de ciclo de facturación programado
              </p>
              <p className="text-sm text-blue-700 mt-1">
                Tu facturación cambiará a{' '}
                {pendingBillingChange.new_billing_cycle === 'monthly' ? 'mensual' : 'anual'} el{' '}
                {formatDate(pendingBillingChange.scheduled_for)}.
              </p>
              <button
                onClick={handleCancelBillingChange}
                disabled={cancelingBillingChange}
                className="mt-2 text-sm text-blue-700 hover:text-blue-900 font-semibold underline flex items-center gap-1"
              >
                {cancelingBillingChange ? (
                  <>
                    <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-blue-700" />
                    Cancelando...
                  </>
                ) : (
                  <>
                    <Icon name="close" size="sm" />
                    Cancelar este cambio
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Current Plan Section */}
      {membership && currentPlan ? (
        <section className="flex flex-col gap-4">
          <h2 className="text-text-main text-xl font-bold tracking-tight px-1">Plan Actual</h2>
          <Card className="border border-slate-100 overflow-hidden">
            {/* Card Header */}
            <div className="p-6 md:p-8 flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 bg-white">
              <div className="flex items-center gap-4">
                <div className="flex items-center justify-center rounded-xl bg-primary/10 text-primary shrink-0 w-12 h-12">
                  <Icon name="star" size="lg" />
                </div>
                <div>
                  <h3 className="text-text-main text-xl font-bold leading-tight">
                    Plan Familiar
                  </h3>
                  <p className="text-text-muted text-sm flex items-center gap-1">
                    <Icon name="diversity_3" size="sm" />
                    {childrenCount} {childrenCount === 1 ? 'hijo' : 'hijos'} incluidos
                  </p>
                </div>
              </div>
              {status && (
                <Badge variant={status.variant} className="self-start md:self-center">
                  <Icon name={status.icon} size="sm" filled />
                  {status.label}
                </Badge>
              )}
            </div>

            {/* Billing Details Grid */}
            <div className="p-6 md:p-8 grid grid-cols-1 md:grid-cols-3 gap-8">
              <div className="flex flex-col gap-1">
                <span className="text-text-muted text-sm font-medium uppercase tracking-wider">
                  Precio
                </span>
                <span className="text-text-main text-lg font-semibold">
                  ${membership.billing_cycle === 'monthly' ? monthlyPrice : yearlyPrice}
                  <span className="text-text-muted font-normal text-base">
                    /{membership.billing_cycle === 'monthly' ? 'mes' : 'año'}
                  </span>
                </span>
              </div>
              <div className="flex flex-col gap-1">
                <span className="text-text-muted text-sm font-medium uppercase tracking-wider">
                  {membership.cancel_at_period_end ? 'Estado' : 'Próxima fecha de cobro'}
                </span>
                <span className={`text-lg font-semibold ${membership.cancel_at_period_end ? 'text-red-600' : 'text-text-main'}`}>
                  {membership.cancel_at_period_end ? 'Cancelado' : formatDate(membership.current_period_end)}
                </span>
              </div>
              <div className="flex flex-col gap-1">
                <span className="text-text-muted text-sm font-medium uppercase tracking-wider">
                  Ciclo de facturación
                </span>
                <span className="text-text-main text-lg font-semibold capitalize">
                  {membership.billing_cycle === 'monthly' ? 'Mensual' : 'Anual'}
                </span>
              </div>
            </div>

            {/* Actions Footer */}
            <div className="px-6 md:px-8 py-5 bg-background-light border-t border-slate-100 flex flex-wrap gap-6 items-center">
              <button
                onClick={handleManageSubscription}
                className="text-primary hover:text-primary-dark text-sm font-semibold hover:underline transition-all flex items-center gap-1"
              >
                Gestionar suscripción
              </button>
              {membership.cancel_at_period_end && (
                <span className="text-amber-600 text-sm font-medium flex items-center gap-1">
                  <Icon name="info" size="sm" />
                  Se cancelará al finalizar el período
                </span>
              )}
            </div>
          </Card>

          {/* Modify Plan Section */}
          {membership.status === 'active' && !membership.cancel_at_period_end && !pendingDowngrade && !pendingBillingChange && (
            <Card className="border border-slate-100 overflow-hidden mt-4">
              <div className="p-6 md:p-8 border-b border-slate-100">
                <h3 className="text-lg font-semibold text-text-main mb-2 flex items-center gap-2">
                  <Icon name="edit" className="text-primary" />
                  Modificar tu plan
                </h3>
                <p className="text-text-muted text-sm">
                  Puedes cambiar la cantidad de perfiles junior o el ciclo de facturación.
                </p>

                {/* Billing cycle toggle */}
                <div className="flex justify-center mt-6">
                  <div className="bg-white rounded-full p-1 shadow-sm border border-slate-200 inline-flex">
                    <button
                      onClick={() => setNewBillingCycle(newBillingCycle === 'monthly' ? null : 'monthly')}
                      className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                        (newBillingCycle === 'monthly' || (newBillingCycle === null && membership.billing_cycle === 'monthly'))
                          ? 'bg-primary text-white'
                          : 'text-text-muted hover:text-text-main'
                      }`}
                    >
                      Mensual
                    </button>
                    <button
                      onClick={() => setNewBillingCycle(newBillingCycle === 'yearly' ? null : 'yearly')}
                      className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                        (newBillingCycle === 'yearly' || (newBillingCycle === null && membership.billing_cycle === 'yearly'))
                          ? 'bg-primary text-white'
                          : 'text-text-muted hover:text-text-main'
                      }`}
                    >
                      Anual
                      <span className="ml-1 text-xs opacity-80">-25%</span>
                    </button>
                  </div>
                </div>
                {(newBillingCycle && newBillingCycle !== membership.billing_cycle) && (
                  <p className="text-center text-sm text-primary mt-2">
                    Cambiarás a facturación {newBillingCycle === 'monthly' ? 'mensual' : 'anual'}
                  </p>
                )}
              </div>

              <div className="p-6 md:p-8">
                {/* Success message */}
                {updateSuccess && (
                  <div className="mb-6 p-4 rounded-lg bg-emerald-50 border border-emerald-200 flex items-center gap-3">
                    <Icon name="check_circle" className="text-emerald-600" />
                    <div>
                      <p className="font-medium text-emerald-800">Plan actualizado correctamente</p>
                      <p className="text-sm text-emerald-600">Los cambios ya están activos en tu suscripción.</p>
                    </div>
                    <button
                      onClick={() => setUpdateSuccess(false)}
                      className="ml-auto text-emerald-600 hover:text-emerald-800"
                    >
                      <Icon name="close" size="sm" />
                    </button>
                  </div>
                )}

                {/* Error message */}
                {updateError && (
                  <div className="mb-6 p-4 rounded-lg bg-red-50 border border-red-200 flex items-center gap-3">
                    <Icon name="error" className="text-red-600" />
                    <p className="text-red-800">{updateError}</p>
                    <button
                      onClick={() => setUpdateError(null)}
                      className="ml-auto text-red-600 hover:text-red-800"
                    >
                      <Icon name="close" size="sm" />
                    </button>
                  </div>
                )}

                {/* Children selector */}
                <div className="grid grid-cols-5 md:grid-cols-10 gap-2 mb-6">
                  {Array.from({ length: PRICING.maxChildren }, (_, i) => i + 1).map((count) => (
                    <button
                      key={count}
                      onClick={() => handleChildrenSelect(count)}
                      disabled={loadingPreview || updating}
                      className={`
                        p-3 rounded-lg text-center transition-all
                        ${count === childrenCount
                          ? 'bg-primary/10 border-2 border-primary text-primary font-bold'
                          : count === selectedChildren
                            ? 'bg-primary text-white font-semibold'
                            : 'bg-slate-50 hover:bg-slate-100 text-text-main border border-slate-200'
                        }
                        ${(loadingPreview || updating) ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
                      `}
                    >
                      {count}
                    </button>
                  ))}
                </div>

                {/* Loading preview */}
                {loadingPreview && (
                  <div className="flex items-center justify-center py-8">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary" />
                    <span className="ml-3 text-text-muted">Calculando...</span>
                  </div>
                )}

                {/* Preview section */}
                {preview && !loadingPreview && (
                  <div className="bg-slate-50 rounded-lg p-6 space-y-4">
                    <h4 className="font-semibold text-text-main">Resumen del cambio</h4>

                    {/* Billing cycle change notice */}
                    {preview.isBillingCycleChange && (
                      <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
                        <div className="flex items-center gap-2">
                          <Icon name="schedule" className="text-blue-600" size="sm" />
                          <p className="text-sm text-blue-800 font-medium">
                            El cambio de {preview.currentBillingCycle === 'monthly' ? 'mensual' : 'anual'} a{' '}
                            {preview.billingCycle === 'monthly' ? 'mensual' : 'anual'}{' '}
                            se aplicará el {preview.scheduledFor ? formatDate(preview.scheduledFor) : formatDate(preview.periodEnd)}
                          </p>
                        </div>
                        <p className="text-xs text-blue-600 mt-1 ml-6">
                          Continuarás con tu plan actual hasta esa fecha.
                        </p>
                      </div>
                    )}

                    <div className="grid grid-cols-2 gap-4">
                      <div className="bg-white p-4 rounded-lg border border-slate-200">
                        <p className="text-sm text-text-muted mb-1">Plan actual</p>
                        <p className="text-lg font-bold text-text-main">
                          {preview.currentChildrenCount} {preview.currentChildrenCount === 1 ? 'hijo' : 'hijos'}
                        </p>
                        <p className="text-text-muted">
                          ${preview.currentMonthlyPrice}/{preview.currentBillingCycle === 'yearly' ? 'mes equiv.' : 'mes'}
                        </p>
                      </div>
                      <div className="bg-white p-4 rounded-lg border-2 border-primary">
                        <p className="text-sm text-text-muted mb-1">Nuevo plan</p>
                        <p className="text-lg font-bold text-primary">
                          {preview.newChildrenCount} {preview.newChildrenCount === 1 ? 'hijo' : 'hijos'}
                        </p>
                        <p className="text-primary font-medium">
                          ${preview.newMonthlyPrice}/{preview.billingCycle === 'yearly' ? 'mes equiv.' : 'mes'}
                          {preview.billingCycle === 'yearly' && preview.newTotalPrice && (
                            <span className="block text-xs text-primary/70">
                              (${preview.newTotalPrice}/año)
                            </span>
                          )}
                        </p>
                      </div>
                    </div>

                    {/* Price difference */}
                    <div className="flex items-center justify-between py-3 border-t border-slate-200">
                      <span className="text-text-muted">Diferencia mensual</span>
                      <span className={`font-semibold ${preview.priceDifference > 0 ? 'text-amber-600' : 'text-emerald-600'}`}>
                        {preview.priceDifference > 0 ? '+' : ''}${preview.priceDifference}/mes
                      </span>
                    </div>

                    {/* Upgrade: Proration info */}
                    {!preview.isDowngrade && preview.prorationAmount !== 0 && (
                      <div className="flex items-center justify-between py-3 border-t border-slate-200">
                        <div>
                          <span className="text-text-main font-medium">Cobro hoy (proporcional)</span>
                          <p className="text-xs text-text-muted">
                            Por los días restantes hasta {formatDate(preview.periodEnd)}
                          </p>
                        </div>
                        <span className="text-lg font-bold text-amber-600">
                          ${preview.prorationAmount.toFixed(2)}
                        </span>
                      </div>
                    )}

                    {/* Downgrade: Scheduled change info */}
                    {preview.isDowngrade && (
                      <>
                        <div className="py-3 border-t border-slate-200">
                          <div className="flex items-start gap-2 p-3 bg-amber-50 rounded-lg border border-amber-200">
                            <Icon name="info" className="text-amber-600 mt-0.5" size="sm" />
                            <div className="text-sm">
                              <p className="font-medium text-amber-800">
                                El cambio se aplicará el {formatDate(preview.periodEnd)}
                              </p>
                              <p className="text-amber-700 mt-1">
                                Los hijos no seleccionados perderán acceso en esa fecha. No hay reembolso por el tiempo restante.
                              </p>
                            </div>
                          </div>
                        </div>

                        {/* Child selection for downgrade */}
                        <div className="py-3 border-t border-slate-200">
                          <p className="font-medium text-text-main mb-3">
                            Selecciona {preview.childrenToSelectCount}{' '}
                            {preview.childrenToSelectCount === 1 ? 'hijo' : 'hijos'} para mantener:
                          </p>

                          {children.length === 0 ? (
                            <p className="text-text-muted text-sm">
                              No hay hijos registrados en tu familia.
                            </p>
                          ) : (
                            <div className="space-y-2">
                              {children.map((child) => {
                                const isSelected = childrenToKeep.includes(child.id)
                                const isDisabled = !isSelected &&
                                  preview.childrenToSelectCount !== undefined &&
                                  childrenToKeep.length >= preview.childrenToSelectCount

                                return (
                                  <label
                                    key={child.id}
                                    className={`
                                      flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all
                                      ${isSelected
                                        ? 'bg-primary/10 border-primary'
                                        : isDisabled
                                          ? 'bg-slate-100 border-slate-200 opacity-50 cursor-not-allowed'
                                          : 'bg-white border-slate-200 hover:border-primary/50'
                                      }
                                    `}
                                  >
                                    <input
                                      type="checkbox"
                                      checked={isSelected}
                                      onChange={() => !isDisabled && handleChildToggle(child.id)}
                                      disabled={isDisabled}
                                      className="w-5 h-5 rounded border-slate-300 text-primary focus:ring-primary"
                                    />
                                    <div className="flex-1">
                                      <p className="font-medium text-text-main">
                                        {child.first_name} {child.last_name}
                                      </p>
                                      <p className="text-sm text-text-muted">
                                        {child.city}, {child.country}
                                      </p>
                                    </div>
                                    {isSelected && (
                                      <Icon name="check_circle" className="text-primary" />
                                    )}
                                  </label>
                                )
                              })}
                            </div>
                          )}

                          <p className="text-sm text-text-muted mt-3">
                            {childrenToKeep.length} de {preview.childrenToSelectCount} seleccionados
                          </p>
                        </div>
                      </>
                    )}

                    {/* Action buttons */}
                    <div className="flex gap-3 pt-4">
                      <Button
                        onClick={handleConfirmUpdate}
                        disabled={updating || (preview.isDowngrade && childrenToKeep.length !== preview.childrenToSelectCount)}
                        className="flex-1"
                      >
                        {updating ? (
                          <>
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                            {preview.isDowngrade ? 'Programando...' : 'Actualizando...'}
                          </>
                        ) : (
                          <>
                            <Icon name="check" size="sm" />
                            {preview.isDowngrade ? 'Programar cambio' : 'Confirmar cambio'}
                          </>
                        )}
                      </Button>
                      <Button
                        onClick={handleCancelUpdate}
                        variant="secondary"
                        disabled={updating}
                      >
                        Cancelar
                      </Button>
                    </div>
                  </div>
                )}

                {/* Hint when no selection */}
                {!selectedChildren && !preview && !loadingPreview && !updateSuccess && (
                  <p className="text-center text-text-muted text-sm">
                    Selecciona una cantidad diferente de hijos para ver el cambio de precio
                  </p>
                )}
              </div>
            </Card>
          )}
        </section>
      ) : (
        /* No membership section */
        <section className="flex flex-col gap-4">
          <Card className="text-center p-8 md:p-12 border border-dashed border-slate-300">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-6">
              <Icon name="card_membership" size="xl" className="text-primary" />
            </div>
            <h3 className="text-xl font-bold text-text-main mb-2">Sin membresía activa</h3>
            <p className="text-text-muted mb-6 max-w-md mx-auto">
              Suscríbete para acceder a todas las funcionalidades de Starbiz Academy
              y comenzar el aprendizaje en familia.
            </p>
            <Button onClick={handleSubscribe}>
              Ver planes disponibles
            </Button>
          </Card>
        </section>
      )}

      {/* Pricing Info Section */}
      <section className="flex flex-col gap-6 pt-6">
        <div className="px-1">
          <h2 className="text-text-main text-xl font-bold tracking-tight">
            {membership ? '¿Necesitas modificar tu plan?' : 'Nuestro Plan Familiar'}
          </h2>
          <p className="text-text-muted mt-1">
            Precio flexible según la cantidad de hijos que desees incluir
          </p>
        </div>

        <Card className="p-6 md:p-8 border border-slate-100">
          {/* Pricing Formula */}
          <div className="text-center mb-8 pb-8 border-b border-slate-100">
            <h3 className="text-lg font-semibold text-text-main mb-4">
              Plan Familiar Starbiz
            </h3>
            <div className="flex flex-wrap items-center justify-center gap-4 text-2xl font-bold">
              <span className="bg-primary/10 text-primary px-4 py-2 rounded-lg">
                ${PRICING.basePrice}
              </span>
              <span className="text-text-muted font-normal">+</span>
              <span className="bg-slate-100 text-text-main px-4 py-2 rounded-lg">
                ${PRICING.perChildPrice}
              </span>
              <span className="text-text-muted font-normal text-base">
                por cada perfil junior adicional
              </span>
            </div>
            <p className="text-sm text-text-muted mt-4">
              El precio base incluye 1 perfil de padre + 1 perfil junior. Agrega más perfiles según tus necesidades.
            </p>
          </div>

          {/* Price Examples */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
            {[1, 2, 3, 5, 10].map((count) => (
              <div
                key={count}
                className={`text-center p-4 rounded-lg ${
                  count === childrenCount && membership
                    ? 'bg-primary/10 border-2 border-primary'
                    : 'bg-slate-50'
                }`}
              >
                <p className="text-sm text-text-muted mb-1">
                  {count} {count === 1 ? 'hijo' : 'hijos'}
                </p>
                <p className="text-xl font-bold text-text-main">
                  ${calculateMonthlyPrice(count)}
                </p>
                <p className="text-xs text-text-muted">/mes</p>
              </div>
            ))}
          </div>

          {/* Annual Discount Note */}
          <div className="bg-emerald-50 rounded-lg p-4 flex items-center gap-3">
            <Icon name="savings" className="text-emerald-600" />
            <div>
              <p className="font-medium text-emerald-800">
                Ahorra 25% con facturación anual
              </p>
              <p className="text-sm text-emerald-600">
                {membership ? (
                  <>Tu plan actual con {childrenCount} {childrenCount === 1 ? 'hijo' : 'hijos'}: ${yearlyPrice}/año (ahorras ${annualSavings})</>
                ) : (
                  <>Ejemplo: 2 hijos → ${calculateYearlyPrice(2)}/año (ahorras ${calculateAnnualSavings(2)})</>
                )}
              </p>
            </div>
          </div>

          {/* CTA */}
          <div className="mt-8 text-center">
            {membership ? (
              <Button onClick={handleManageSubscription} variant="secondary">
                <Icon name="settings" size="sm" />
                Modificar suscripción
              </Button>
            ) : (
              <Button onClick={handleSubscribe}>
                <Icon name="arrow_forward" size="sm" />
                Elegir mi plan
              </Button>
            )}
          </div>
        </Card>

        {/* Security Note */}
        <p className="text-center text-sm text-text-muted flex items-center justify-center gap-2">
          <Icon name="verified_user" size="sm" className="text-primary" />
          Procesamiento de pago seguro con Stripe
        </p>
      </section>
    </>
  )
}
