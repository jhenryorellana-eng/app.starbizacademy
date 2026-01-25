'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, Icon, Button } from '@/components/ui'
import { cn } from '@/lib/utils'
import {
  PRICING,
  calculateMonthlyPrice,
  calculateYearlyPrice,
  calculateAnnualSavings,
  getFeatures,
} from '@/lib/pricing/config'

export default function PlanSelectionPage() {
  const router = useRouter()
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('monthly')
  const [childrenCount, setChildrenCount] = useState(1)

  const monthlyPrice = calculateMonthlyPrice(childrenCount)
  const yearlyPrice = calculateYearlyPrice(childrenCount)
  const annualSavings = calculateAnnualSavings(childrenCount)
  const displayPrice = billingCycle === 'monthly' ? monthlyPrice : yearlyPrice
  const features = getFeatures(childrenCount)

  const handleContinue = () => {
    router.push(`/onboarding/hijos?children=${childrenCount}&billing=${billingCycle}`)
  }

  return (
    <div className="flex flex-col gap-8 max-w-2xl mx-auto">
      {/* Header */}
      <div className="text-center">
        <h1 className="text-3xl font-bold text-text-main mb-2">
          Configura tu plan familiar
        </h1>
        <p className="text-text-muted">
          Selecciona cuántos hijos incluirás en tu suscripción
        </p>
      </div>

      {/* Billing Toggle */}
      <div className="flex justify-center">
        <div className="bg-white rounded-full p-1 shadow-sm border border-slate-200 flex gap-1">
          <button
            onClick={() => setBillingCycle('monthly')}
            className={cn(
              'px-4 py-2 rounded-full text-sm font-medium transition-colors',
              billingCycle === 'monthly'
                ? 'bg-primary text-white'
                : 'text-text-muted hover:text-text-main'
            )}
          >
            Mensual
          </button>
          <button
            onClick={() => setBillingCycle('yearly')}
            className={cn(
              'px-4 py-2 rounded-full text-sm font-medium transition-colors flex items-center gap-1',
              billingCycle === 'yearly'
                ? 'bg-primary text-white'
                : 'text-text-muted hover:text-text-main'
            )}
          >
            Anual
            <span
              className={cn(
                'text-xs px-1.5 py-0.5 rounded',
                billingCycle === 'yearly'
                  ? 'bg-white/20'
                  : 'bg-emerald-100 text-emerald-700'
              )}
            >
              -25%
            </span>
          </button>
        </div>
      </div>

      {/* Plan Card */}
      <Card className="p-8 border-2 border-primary/20 shadow-lg shadow-primary/5">
        {/* Children Selector */}
        <div className="mb-8">
          <label className="block text-center text-lg font-semibold text-text-main mb-6">
            ¿Cuántos hijos incluirás en tu plan?
          </label>

          {/* Slider */}
          <div className="px-4">
            <input
              type="range"
              min={PRICING.minChildren}
              max={PRICING.maxChildren}
              value={childrenCount}
              onChange={(e) => setChildrenCount(Number(e.target.value))}
              className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-primary"
            />

            {/* Labels */}
            <div className="flex justify-between mt-2 text-sm text-text-muted">
              <span>1</span>
              <span>5</span>
              <span>10</span>
            </div>
          </div>

          {/* Children Count Display */}
          <div className="text-center mt-6">
            <span className="inline-flex items-center gap-2 bg-primary/10 text-primary px-4 py-2 rounded-full font-semibold">
              <Icon name="diversity_3" size="sm" />
              {childrenCount} {childrenCount === 1 ? 'hijo' : 'hijos'}
            </span>
          </div>
        </div>

        {/* Price Display */}
        <div className="text-center mb-8 pb-8 border-b border-slate-200">
          <div className="flex items-baseline justify-center gap-1">
            <span className="text-5xl font-black text-text-main tracking-tight">
              ${displayPrice}
            </span>
            <span className="text-text-muted font-medium text-lg">
              /{billingCycle === 'monthly' ? 'mes' : 'año'}
            </span>
          </div>

          {billingCycle === 'yearly' && (
            <p className="text-emerald-600 font-medium mt-2 flex items-center justify-center gap-1">
              <Icon name="savings" size="sm" />
              Ahorras ${annualSavings} al año
            </p>
          )}

          {billingCycle === 'monthly' && (
            <p className="text-text-muted text-sm mt-2">
              ${yearlyPrice}/año con facturación anual (ahorra ${annualSavings})
            </p>
          )}
        </div>

        {/* Features principales */}
        <ul className="space-y-2 mb-6">
          {features.main.map((feature, index) => (
            <li key={index} className="flex items-center gap-3 text-text-main">
              <Icon name="check_circle" size="sm" className="text-primary" filled />
              <span>{feature}</span>
            </li>
          ))}
        </ul>

        {/* Sección: Para tu hijo */}
        <div className="mb-4">
          <h4 className="font-semibold text-text-main mb-2 flex items-center gap-2">
            <Icon name="child_care" size="sm" className="text-primary" />
            Para tu hijo
          </h4>
          <ul className="space-y-1 pl-6 text-sm text-text-muted">
            {features.forChild.map((feature, index) => (
              <li key={index}>• {feature}</li>
            ))}
          </ul>
        </div>

        {/* Sección: Para ti */}
        <div className="mb-8">
          <h4 className="font-semibold text-text-main mb-2 flex items-center gap-2">
            <Icon name="person" size="sm" className="text-primary" />
            Para ti
          </h4>
          <ul className="space-y-1 pl-6 text-sm text-text-muted">
            {features.forParent.map((feature, index) => (
              <li key={index}>• {feature}</li>
            ))}
          </ul>
        </div>

        {/* Continue Button */}
        <Button size="lg" onClick={handleContinue} className="w-full">
          Continuar
          <Icon name="arrow_forward" />
        </Button>
      </Card>

      {/* Skip Option */}
      <div className="text-center">
        <button
          onClick={() => router.push('/inicio')}
          className="text-sm text-text-muted hover:text-primary transition-colors"
        >
          Omitir por ahora y explorar el dashboard
        </button>
      </div>

      {/* Security Note */}
      <p className="text-center text-sm text-text-muted flex items-center justify-center gap-2">
        <Icon name="lock" size="sm" />
        Pago seguro procesado por Stripe
      </p>
    </div>
  )
}
