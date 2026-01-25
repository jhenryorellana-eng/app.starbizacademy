'use client'

import { useActionState } from 'react'
import Link from 'next/link'
import { register, type AuthState } from '@/lib/auth/actions'
import { Button, Input, Icon, Select } from '@/components/ui'
import { countries } from '@/lib/constants/countries'

const initialState: AuthState = {}

export function RegisterForm() {
  const [state, formAction, isPending] = useActionState(register, initialState)

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
