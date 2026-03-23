'use client'

import { useActionState, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { register, type AuthState } from '@/lib/auth/actions'
import { Button, Input, Icon, Select } from '@/components/ui'
import { countries } from '@/lib/constants/countries'

const initialState: AuthState = {}

function TutorialModal({ onClose }: { onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-8 animate-in fade-in zoom-in-95">
        <div className="text-center mb-6">
          <div className="w-16 h-16 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-3">
            <Icon name="check_circle" className="text-green-500 text-3xl" />
          </div>
          <h2 className="text-xl font-bold text-slate-900">
            Tu pago fue exitoso
          </h2>
          <p className="text-slate-500 text-sm mt-1">
            Ahora crea tu cuenta para acceder al programa
          </p>
        </div>

        <div className="space-y-3 mb-6">
          <div className="flex items-start gap-3 bg-blue-50 rounded-xl p-4">
            <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
              <Icon name="mail" className="text-blue-600 text-sm" />
            </div>
            <div>
              <p className="font-semibold text-slate-800 text-sm">Paso 1: Tu correo</p>
              <p className="text-slate-600 text-xs mt-0.5">
                Usa el <strong>MISMO correo electronico</strong> con el que realizaste tu pago
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3 bg-purple-50 rounded-xl p-4">
            <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center flex-shrink-0">
              <Icon name="edit" className="text-purple-600 text-sm" />
            </div>
            <div>
              <p className="font-semibold text-slate-800 text-sm">Paso 2: Tus datos</p>
              <p className="text-slate-600 text-xs mt-0.5">
                Completa tu nombre, pais y ciudad
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3 bg-amber-50 rounded-xl p-4">
            <div className="w-8 h-8 bg-amber-100 rounded-lg flex items-center justify-center flex-shrink-0">
              <Icon name="lock" className="text-amber-600 text-sm" />
            </div>
            <div>
              <p className="font-semibold text-slate-800 text-sm">Paso 3: Contrasena</p>
              <p className="text-slate-600 text-xs mt-0.5">
                Crea una contrasena de minimo 8 caracteres
              </p>
            </div>
          </div>
        </div>

        <button
          onClick={onClose}
          className="w-full py-3 bg-primary hover:bg-primary-hover text-white font-bold rounded-xl transition-colors"
        >
          Entendido, crear mi cuenta
        </button>
      </div>
    </div>
  )
}

export function RegisterForm() {
  const [state, formAction, isPending] = useActionState(register, initialState)
  const searchParams = useSearchParams()
  const isPaid = searchParams.get('paid') === 'true'
  const sessionId = searchParams.get('session_id') || ''
  const [showTutorial, setShowTutorial] = useState(isPaid)

  return (
    <div className="w-full max-w-[520px] flex flex-col bg-white rounded-xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] overflow-hidden">
      {/* Tutorial Modal */}
      {showTutorial && <TutorialModal onClose={() => setShowTutorial(false)} />}

      {/* Logo Section */}
      <div className="flex justify-center pt-8 pb-2">
        <div className="w-14 h-14 bg-gradient-to-br from-starbiz-dark to-starbiz-light rounded-xl flex items-center justify-center text-white">
          <Icon name="school" size="lg" />
        </div>
      </div>

      {/* Headline */}
      <div className="flex flex-col items-center px-8">
        <h2 className="text-slate-900 tracking-tight text-[24px] font-bold leading-tight pb-1 pt-2">
          {isPaid ? 'Crea tu cuenta' : 'Crear cuenta familiar'}
        </h2>
        <p className="text-slate-500 text-sm font-medium text-center">
          {isPaid
            ? 'Usa el mismo correo con el que pagaste tu inscripcion'
            : 'Completa tus datos para comenzar en Starbiz Academy'}
        </p>
      </div>

      {/* Form Section */}
      <form action={formAction} className="flex flex-col w-full px-8 py-6 gap-4">
        {/* Hidden field for session_id */}
        {sessionId && <input type="hidden" name="sessionId" value={sessionId} />}
        {state.error && (
          <div className="bg-red-50 border border-red-200 text-red-600 text-sm rounded-lg p-3">
            {state.error}
          </div>
        )}

        <div className="grid grid-cols-2 gap-4">
          <Input
            name="firstName"
            type="text"
            label="Nombre(s)"
            placeholder="Juan"
            required
          />
          <Input
            name="lastName"
            type="text"
            label="Apellido(s)"
            placeholder="García"
            required
          />
        </div>

        <Input
          name="email"
          type="email"
          label="Correo electrónico"
          placeholder="nombre@ejemplo.com"
          icon="mail"
          required
        />

        <Input
          name="whatsappNumber"
          type="tel"
          label="WhatsApp (opcional)"
          placeholder="+52 55 1234 5678"
          icon="phone"
        />

        <div className="grid grid-cols-2 gap-4">
          <Select
            name="country"
            label="País"
            options={[{ value: '', label: 'Seleccionar...' }, ...countries]}
            required
          />
          <Input
            name="city"
            type="text"
            label="Ciudad"
            placeholder="Ciudad de México"
            required
          />
        </div>

        <Input
          name="password"
          type="password"
          label="Contraseña"
          placeholder="Mínimo 8 caracteres"
          showPasswordToggle
          required
        />

        <Input
          name="confirmPassword"
          type="password"
          label="Confirmar contraseña"
          placeholder="Repite tu contraseña"
          showPasswordToggle
          required
        />

        <p className="text-xs text-slate-500 text-center mt-2">
          Al crear tu cuenta, aceptas nuestros{' '}
          <a href="#" className="text-primary hover:underline">Términos de Servicio</a>
          {' '}y{' '}
          <a href="#" className="text-primary hover:underline">Política de Privacidad</a>
        </p>

        <Button type="submit" size="lg" className="w-full mt-2" isLoading={isPending}>
          <span>Crear cuenta</span>
          <Icon name="arrow_forward" className="text-lg" />
        </Button>
      </form>

      {/* Footer */}
      <div className="w-full bg-slate-50 py-4 px-8 flex justify-center border-t border-slate-100 rounded-b-xl">
        <p className="text-slate-600 text-sm">
          ¿Ya tienes cuenta?{' '}
          <Link href="/login" className="text-starbiz-dark font-bold hover:underline ml-1">
            Iniciar sesión
          </Link>
        </p>
      </div>
    </div>
  )
}
