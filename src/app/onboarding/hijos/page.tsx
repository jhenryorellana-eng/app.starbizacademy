'use client'

import { Suspense, useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Card, Icon, Button, Input, Select } from '@/components/ui'
import { countries } from '@/lib/constants/countries'

interface ChildForm {
  firstName: string
  lastName: string
  birthDate: string
  city: string
  country: string
}

const emptyChild: ChildForm = {
  firstName: '',
  lastName: '',
  birthDate: '',
  city: '',
  country: 'mx',
}

function calculateAge(birthDate: string): number {
  const birth = new Date(birthDate)
  const today = new Date()
  let age = today.getFullYear() - birth.getFullYear()
  const monthDiff = today.getMonth() - birth.getMonth()
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
    age--
  }
  return age
}

function isValidAge(birthDate: string): boolean {
  if (!birthDate) return false
  const age = calculateAge(birthDate)
  return age >= 13 && age <= 17
}

function getMinMaxDates() {
  const today = new Date()
  const minDate = new Date(today.getFullYear() - 17, today.getMonth(), today.getDate())
  const maxDate = new Date(today.getFullYear() - 13, today.getMonth(), today.getDate())
  return {
    min: minDate.toISOString().split('T')[0],
    max: maxDate.toISOString().split('T')[0],
  }
}

function HijosContent() {
  const router = useRouter()
  const searchParams = useSearchParams()

  // Read params from URL (from plan selection) or check for existing membership
  const childrenParam = searchParams.get('children')
  const billingParam = searchParams.get('billing')
  const hasMembership = searchParams.get('hasMembership') === 'true'

  // maxChildren from URL params or default to 1
  const maxChildren = childrenParam ? parseInt(childrenParam) : 1
  const billingCycle = billingParam || 'monthly'

  const [children, setChildren] = useState<ChildForm[]>([{ ...emptyChild }])
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const { min: minDate, max: maxDate } = getMinMaxDates()

  // Redirect to plan if no params and no membership
  useEffect(() => {
    if (!childrenParam && !hasMembership) {
      router.push('/onboarding/plan')
    }
  }, [childrenParam, hasMembership, router])

  const addChild = () => {
    if (children.length < maxChildren) {
      setChildren([...children, { ...emptyChild }])
    }
  }

  const removeChild = (index: number) => {
    if (children.length > 1) {
      setChildren(children.filter((_, i) => i !== index))
    }
  }

  const updateChild = (index: number, field: keyof ChildForm, value: string) => {
    const updated = [...children]
    updated[index] = { ...updated[index], [field]: value }
    setChildren(updated)
  }

  const isValid = children.every(
    (child) =>
      child.firstName.trim() &&
      child.lastName.trim() &&
      child.birthDate &&
      isValidAge(child.birthDate) &&
      child.city.trim() &&
      child.country
  )

  const handleSubmit = async () => {
    if (!isValid) return

    setIsSubmitting(true)
    setError(null)

    try {
      // If user already has membership, save children directly to DB
      if (hasMembership) {
        const response = await fetch('/api/children', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            children: children.map((child) => ({
              firstName: child.firstName,
              lastName: child.lastName,
              birthDate: child.birthDate,
              city: child.city,
              country: child.country,
            })),
          }),
        })

        if (!response.ok) {
          const data = await response.json()
          throw new Error(data.error || 'Error al registrar hijos')
        }

        router.push('/onboarding/codigos')
      } else {
        // No membership yet - save children to sessionStorage and go to payment
        sessionStorage.setItem('pendingChildren', JSON.stringify(children))
        router.push(`/onboarding/pago?children=${maxChildren}&billing=${billingCycle}`)
      }
    } catch (err) {
      console.error('Error saving children:', err)
      setError(err instanceof Error ? err.message : 'Error al registrar hijos')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="flex flex-col gap-8 max-w-2xl mx-auto">
      {/* Header */}
      <div className="text-center">
        <h1 className="text-3xl font-bold text-text-main mb-2">
          Registra a tus hijos
        </h1>
        <p className="text-text-muted">
          Completa la información de cada hijo para crear sus códigos de acceso
        </p>
      </div>

      {/* Progress indicator */}
      <div className="text-center text-sm text-text-muted">
        {children.length} de {maxChildren} hijos registrados
      </div>

      {/* Error message */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-600 text-sm rounded-lg p-3">
          {error}
        </div>
      )}

      {/* Children Forms */}
      <div className="space-y-6">
        {children.map((child, index) => (
          <Card key={index} className="p-6 border border-slate-200 relative">
            {/* Child number badge */}
            <div className="absolute -top-3 left-4 bg-primary text-white text-xs font-bold px-3 py-1 rounded-full">
              Hijo {index + 1}
            </div>

            {/* Remove button */}
            {children.length > 1 && (
              <button
                onClick={() => removeChild(index)}
                className="absolute top-4 right-4 text-slate-400 hover:text-red-500 transition-colors"
                title="Eliminar"
              >
                <Icon name="close" />
              </button>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4">
              <Input
                label="Nombre(s)"
                placeholder="Ej: Sofía"
                value={child.firstName}
                onChange={(e) => updateChild(index, 'firstName', e.target.value)}
                required
              />
              <Input
                label="Apellido(s)"
                placeholder="Ej: García"
                value={child.lastName}
                onChange={(e) => updateChild(index, 'lastName', e.target.value)}
                required
              />
              <div className="flex flex-col gap-2">
                <label className="text-sm font-medium text-text-main">
                  Fecha de nacimiento
                </label>
                <input
                  type="date"
                  min={minDate}
                  max={maxDate}
                  value={child.birthDate}
                  onChange={(e) => updateChild(index, 'birthDate', e.target.value)}
                  className="w-full rounded-lg border border-input-border bg-white px-4 py-2.5 text-base font-normal text-text-main focus:border-primary focus:ring-1 focus:ring-primary transition-colors"
                  required
                />
                {child.birthDate && !isValidAge(child.birthDate) && (
                  <p className="text-red-500 text-sm">
                    El hijo debe tener entre 13 y 17 años
                  </p>
                )}
                {child.birthDate && isValidAge(child.birthDate) && (
                  <p className="text-slate-500 text-sm">
                    Edad: {calculateAge(child.birthDate)} años
                  </p>
                )}
              </div>
              <Input
                label="Ciudad"
                placeholder="Ej: Ciudad de México"
                value={child.city}
                onChange={(e) => updateChild(index, 'city', e.target.value)}
                required
              />
              <div className="md:col-span-2">
                <Select
                  label="País"
                  options={countries}
                  value={child.country}
                  onChange={(e) => updateChild(index, 'country', e.target.value)}
                />
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* Add another child button */}
      {children.length < maxChildren && (
        <button
          onClick={addChild}
          className="w-full p-4 border-2 border-dashed border-slate-300 rounded-xl text-text-muted hover:text-primary hover:border-primary transition-colors flex items-center justify-center gap-2"
        >
          <Icon name="add" />
          Agregar otro hijo
        </button>
      )}

      {/* Info note */}
      <Card className="p-4 border border-slate-200 bg-slate-50">
        <div className="flex items-start gap-3">
          <Icon name="info" className="text-primary shrink-0" />
          <p className="text-sm text-text-muted">
            Los códigos de acceso se generarán automáticamente para cada hijo.
            Podrás compartirlos con ellos para que accedan a CEO Junior.
          </p>
        </div>
      </Card>

      {/* Continue Button */}
      <Button
        size="lg"
        onClick={handleSubmit}
        disabled={!isValid || isSubmitting}
        isLoading={isSubmitting}
        className="w-full"
      >
        {hasMembership ? 'Generar códigos de acceso' : 'Continuar al pago'}
        <Icon name="arrow_forward" />
      </Button>
    </div>
  )
}

function LoadingFallback() {
  return (
    <div className="flex flex-col items-center justify-center gap-4 py-16">
      <div className="w-12 h-12 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
      <p className="text-text-muted">Cargando...</p>
    </div>
  )
}

export default function HijosPage() {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <HijosContent />
    </Suspense>
  )
}
