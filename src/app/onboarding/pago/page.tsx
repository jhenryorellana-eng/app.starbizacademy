'use client'

import { useEffect, useState } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { Card, Icon, Button } from '@/components/ui'
import {
  calculateMonthlyPrice,
  calculateYearlyPrice,
  calculateAnnualSavings,
  PRICING,
} from '@/lib/pricing/config'

export default function PagoPage() {
  const searchParams = useSearchParams()
  const router = useRouter()

  const childrenParam = searchParams.get('children')
  const billingParam = searchParams.get('billing') as 'monthly' | 'yearly' | null

  const childrenCount = childrenParam ? Number(childrenParam) : 1
  const billingCycle = billingParam || 'monthly'

  const [isProcessing, setIsProcessing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!childrenParam || !billingParam) {
      router.push('/onboarding/plan')
    }
  }, [childrenParam, billingParam, router])

  const monthlyPrice = calculateMonthlyPrice(childrenCount)
  const yearlyPrice = calculateYearlyPrice(childrenCount)
  const annualSavings = calculateAnnualSavings(childrenCount)
  const displayPrice = billingCycle === 'monthly' ? monthlyPrice : yearlyPrice

  // Desglose del precio
  const basePrice = billingCycle === 'monthly' ? PRICING.basePrice : Math.round(PRICING.basePrice * 12 * 0.75)
  const additionalChildrenCount = Math.max(0, childrenCount - 1)
  const additionalChildrenPrice = billingCycle === 'monthly'
    ? additionalChildrenCount * PRICING.perChildPrice
    : Math.round(additionalChildrenCount * PRICING.perChildPrice * 12 * 0.75)

  const handlePayment = async () => {
    setIsProcessing(true)
    setError(null)

    try {
      const response = await fetch('/api/stripe/create-checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          childrenCount,
          billingCycle,
        }),
      })

      if (response.ok) {
        const { url } = await response.json()
        window.location.href = url
      } else {
        const data = await response.json()
        setError(data.error || 'Error al crear la sesión de pago')
      }
    } catch (err) {
      setError('Error de conexión. Por favor, intenta de nuevo.')
    } finally {
      setIsProcessing(false)
    }
  }

  return (
    <div className="flex flex-col gap-8 max-w-xl mx-auto">
      {/* Header */}
      <div className="text-center">
        <h1 className="text-3xl font-bold text-text-main mb-2">
          Completa tu pago
        </h1>
        <p className="text-text-muted">
          Tu suscripción se activará inmediatamente después del pago
        </p>
      </div>

      {/* Order Summary */}
      <Card className="p-6 border border-slate-200">
        <h2 className="text-lg font-bold text-text-main mb-4">Resumen del pedido</h2>

        <div className="space-y-4">
          {/* Plan base */}
          <div className="flex justify-between items-center">
            <div>
              <p className="font-medium text-text-main">Plan Familiar</p>
              <p className="text-sm text-text-muted">
                Incluye 1 padre + 1 hijo
              </p>
            </div>
            <p className="font-semibold text-text-main">
              ${basePrice} USD
            </p>
          </div>

          {/* Hijos adicionales */}
          {additionalChildrenCount > 0 && (
            <div className="flex justify-between items-center">
              <div>
                <p className="font-medium text-text-main">
                  {additionalChildrenCount} {additionalChildrenCount === 1 ? 'hijo' : 'hijos'} adicional{additionalChildrenCount === 1 ? '' : 'es'}
                </p>
                <p className="text-sm text-text-muted">
                  ${PRICING.perChildPrice}/mes por hijo
                </p>
              </div>
              <p className="font-semibold text-text-main">
                ${additionalChildrenPrice} USD
              </p>
            </div>
          )}

          {/* Descuento anual */}
          {billingCycle === 'yearly' && (
            <div className="flex justify-between items-center text-emerald-600 bg-emerald-50 rounded-lg p-3">
              <span className="flex items-center gap-1 font-medium">
                <Icon name="savings" size="sm" />
                Descuento anual (25%)
              </span>
              <span className="font-semibold">
                -${annualSavings} USD
              </span>
            </div>
          )}

          <hr className="border-slate-200" />

          {/* Total */}
          <div className="flex justify-between items-center">
            <div>
              <p className="font-bold text-text-main">Total</p>
              <p className="text-sm text-text-muted">
                Facturación {billingCycle === 'monthly' ? 'mensual' : 'anual'}
              </p>
            </div>
            <p className="text-2xl font-black text-text-main">
              ${displayPrice} USD
            </p>
          </div>

          {/* Resumen de hijos */}
          <div className="bg-slate-50 rounded-lg p-3 flex items-center gap-3">
            <Icon name="diversity_3" className="text-primary" />
            <p className="text-sm text-text-main">
              <span className="font-semibold">{childrenCount} {childrenCount === 1 ? 'hijo' : 'hijos'}</span> incluidos en tu plan
            </p>
          </div>
        </div>
      </Card>

      {/* Payment Notice */}
      <Card className="p-6 border border-slate-200 bg-slate-50">
        <div className="flex items-start gap-4">
          <div className="p-2 rounded-full bg-primary/10 text-primary">
            <Icon name="credit_card" />
          </div>
          <div>
            <h3 className="font-medium text-text-main mb-1">
              Serás redirigido a Stripe
            </h3>
            <p className="text-sm text-text-muted">
              Utilizamos Stripe para procesar pagos de forma segura.
              Aceptamos todas las tarjetas de crédito y débito principales.
            </p>
          </div>
        </div>
      </Card>

      {/* Error Message */}
      {error && (
        <Card className="p-4 border border-red-200 bg-red-50">
          <div className="flex items-center gap-3 text-red-700">
            <Icon name="error" size="sm" />
            <p className="text-sm">{error}</p>
          </div>
        </Card>
      )}

      {/* Payment Button */}
      <Button
        size="lg"
        onClick={handlePayment}
        className="w-full"
        disabled={isProcessing}
      >
        {isProcessing ? (
          <>
            <span className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
            Redirigiendo a Stripe...
          </>
        ) : (
          <>
            <Icon name="lock" size="sm" />
            Pagar ${displayPrice} USD
          </>
        )}
      </Button>

      {/* Back Link */}
      <button
        onClick={() => router.push(`/onboarding/hijos?children=${childrenCount}&billing=${billingCycle}`)}
        className="text-center text-sm text-text-muted hover:text-primary flex items-center justify-center gap-1"
        disabled={isProcessing}
      >
        <Icon name="arrow_back" size="sm" />
        Volver a información de hijos
      </button>

      {/* Security Badges */}
      <div className="flex items-center justify-center gap-6 text-text-muted">
        <div className="flex items-center gap-1 text-sm">
          <Icon name="lock" size="sm" />
          SSL Seguro
        </div>
        <div className="flex items-center gap-1 text-sm">
          <Icon name="verified_user" size="sm" />
          Powered by Stripe
        </div>
      </div>
    </div>
  )
}
