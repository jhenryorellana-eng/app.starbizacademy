'use client'

import { useActionState } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { register, type AuthState } from '@/lib/auth/actions'
import { Button, Input, Icon, Select } from '@/components/ui'
import { countries } from '@/lib/constants/countries'

const initialState: AuthState = {}

function TutorialGuide() {
  return (
    <div className="w-full lg:w-[340px] flex-shrink-0">
      <div className="lg:sticky lg:top-8 bg-gradient-to-b from-green-50 to-white border border-green-100 rounded-2xl p-6 lg:p-7">
        {/* Success header */}
        <div className="flex items-center gap-3 mb-5 pb-4 border-b border-green-100">
          <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0">
            <Icon name="check_circle" className="text-green-600 text-xl" />
          </div>
          <div>
            <p className="font-bold text-green-800 text-sm">Pago exitoso</p>
            <p className="text-green-600 text-xs">Solo falta crear tu cuenta</p>
          </div>
        </div>

        <h3 className="font-bold text-slate-800 text-base mb-4">
          Sigue estos 3 pasos:
        </h3>

        <div className="space-y-4">
          {/* Paso 1 */}
          <div className="flex gap-3">
            <div className="flex flex-col items-center">
              <div className="w-7 h-7 bg-blue-500 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0">1</div>
              <div className="w-0.5 flex-1 bg-blue-200 mt-1" />
            </div>
            <div className="pb-4">
              <p className="font-semibold text-slate-800 text-sm">Tu correo electronico</p>
              <p className="text-slate-500 text-xs mt-1 leading-relaxed">
                Escribe el <strong className="text-blue-600">MISMO correo</strong> que usaste para pagar.
              </p>
              <div className="mt-2 bg-blue-50 border border-blue-100 rounded-lg px-3 py-2">
                <p className="text-[11px] text-blue-400 mb-0.5">Ejemplo:</p>
                <p className="text-xs text-blue-700 font-medium">maria.lopez@gmail.com</p>
              </div>
            </div>
          </div>

          {/* Paso 2 */}
          <div className="flex gap-3">
            <div className="flex flex-col items-center">
              <div className="w-7 h-7 bg-purple-500 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0">2</div>
              <div className="w-0.5 flex-1 bg-purple-200 mt-1" />
            </div>
            <div className="pb-4">
              <p className="font-semibold text-slate-800 text-sm">Tus datos personales</p>
              <p className="text-slate-500 text-xs mt-1 leading-relaxed">
                Nombre completo, pais y ciudad donde vives.
              </p>
              <div className="mt-2 bg-purple-50 border border-purple-100 rounded-lg px-3 py-2">
                <p className="text-[11px] text-purple-400 mb-0.5">Ejemplo:</p>
                <p className="text-xs text-purple-700 font-medium">Maria Lopez - Mexico - Guadalajara</p>
              </div>
            </div>
          </div>

          {/* Paso 3 */}
          <div className="flex gap-3">
            <div className="flex flex-col items-center">
              <div className="w-7 h-7 bg-amber-500 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0">3</div>
            </div>
            <div>
              <p className="font-semibold text-slate-800 text-sm">Crea tu contrasena</p>
              <p className="text-slate-500 text-xs mt-1 leading-relaxed">
                Minimo 8 caracteres. Usa letras y numeros.
              </p>
              <div className="mt-2 bg-amber-50 border border-amber-100 rounded-lg px-3 py-2">
                <p className="text-[11px] text-amber-400 mb-0.5">Ejemplo:</p>
                <p className="text-xs text-amber-700 font-medium">MiClave2026</p>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-5 pt-4 border-t border-green-100">
          <div className="flex items-start gap-2">
            <Icon name="help" className="text-slate-400 text-sm mt-0.5 flex-shrink-0" />
            <p className="text-[11px] text-slate-400 leading-relaxed">
              Si necesitas ayuda, escribenos por WhatsApp al <strong>+1 (801) 941-3479</strong>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

export function RegisterForm() {
  const [state, formAction, isPending] = useActionState(register, initialState)
  const searchParams = useSearchParams()
  const isPaid = searchParams.get('paid') === 'true'
  const sessionId = searchParams.get('session_id') || ''

  if (isPaid) {
    return (
      <div className="w-full max-w-[900px] flex flex-col lg:flex-row gap-6 items-start">
        {/* Tutorial Guide - always visible */}
        <TutorialGuide />

        {/* Registration Form */}
        <div className="flex-1 w-full flex flex-col bg-white rounded-xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] overflow-hidden">
          <div className="flex justify-center pt-8 pb-2">
            <div className="w-14 h-14 bg-gradient-to-br from-starbiz-dark to-starbiz-light rounded-xl flex items-center justify-center text-white">
              <Icon name="school" size="lg" />
            </div>
          </div>
          <div className="flex flex-col items-center px-8">
            <h2 className="text-slate-900 tracking-tight text-[24px] font-bold leading-tight pb-1 pt-2">
              Crea tu cuenta
            </h2>
            <p className="text-slate-500 text-sm font-medium text-center">
              Usa el mismo correo con el que pagaste tu inscripcion
            </p>
          </div>
          <form action={formAction} className="flex flex-col w-full px-8 py-6 gap-4">
            {sessionId && <input type="hidden" name="sessionId" value={sessionId} />}
            {state.error && (
              <div className="bg-red-50 border border-red-200 text-red-600 text-sm rounded-lg p-3">
                {state.error}
              </div>
            )}
            <div className="grid grid-cols-2 gap-4">
              <Input name="firstName" type="text" label="Nombre(s)" placeholder="Maria" required />
              <Input name="lastName" type="text" label="Apellido(s)" placeholder="Lopez" required />
            </div>
            <Input name="email" type="email" label="Correo electronico" placeholder="maria.lopez@gmail.com" icon="mail" required />
            <Input name="whatsappNumber" type="tel" label="WhatsApp (opcional)" placeholder="+52 55 1234 5678" icon="phone" />
            <div className="grid grid-cols-2 gap-4">
              <Select name="country" label="Pais" options={[{ value: '', label: 'Seleccionar...' }, ...countries]} required />
              <Input name="city" type="text" label="Ciudad" placeholder="Guadalajara" required />
            </div>
            <Input name="password" type="password" label="Contrasena" placeholder="Minimo 8 caracteres" showPasswordToggle required />
            <Input name="confirmPassword" type="password" label="Confirmar contrasena" placeholder="Repite tu contrasena" showPasswordToggle required />
            <Button type="submit" size="lg" className="w-full mt-2" isLoading={isPending}>
              <span>Crear cuenta</span>
              <Icon name="arrow_forward" className="text-lg" />
            </Button>
          </form>
          <div className="w-full bg-slate-50 py-4 px-8 flex justify-center border-t border-slate-100 rounded-b-xl">
            <p className="text-slate-600 text-sm">
              Ya tienes cuenta?{' '}
              <Link href="/login" className="text-starbiz-dark font-bold hover:underline ml-1">Iniciar sesion</Link>
            </p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="w-full max-w-[520px] flex flex-col bg-white rounded-xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] overflow-hidden">
      {/* Logo Section */}
      <div className="flex justify-center pt-8 pb-2">
        <div className="w-14 h-14 bg-gradient-to-br from-starbiz-dark to-starbiz-light rounded-xl flex items-center justify-center text-white">
          <Icon name="school" size="lg" />
        </div>
      </div>

      {/* Headline */}
      <div className="flex flex-col items-center px-8">
        <h2 className="text-slate-900 tracking-tight text-[24px] font-bold leading-tight pb-1 pt-2">
          Crear cuenta familiar
        </h2>
        <p className="text-slate-500 text-sm font-medium text-center">
          Completa tus datos para comenzar en Starbiz Academy
        </p>
      </div>

      {/* Form Section */}
      <form action={formAction} className="flex flex-col w-full px-8 py-6 gap-4">
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
