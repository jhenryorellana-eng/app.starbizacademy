'use client'

import { useActionState } from 'react'
import Link from 'next/link'
import { login, type AuthState } from '@/lib/auth/actions'
import { Button, Input, Icon } from '@/components/ui'

const initialState: AuthState = {}

export function LoginForm() {
  const [state, formAction, isPending] = useActionState(login, initialState)

  return (
    <div className="w-full max-w-[480px] flex flex-col bg-white rounded-xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] overflow-hidden">
      {/* Logo Section */}
      <div className="flex justify-center pt-10 pb-2">
        <div className="w-16 h-16 bg-gradient-to-br from-starbiz-dark to-starbiz-light rounded-xl flex items-center justify-center text-white">
          <Icon name="school" size="xl" />
        </div>
      </div>

      {/* Headline */}
      <div className="flex flex-col items-center px-8">
        <h2 className="text-slate-900 tracking-tight text-[28px] font-bold leading-tight pb-1 pt-3">
          Starbiz Academy
        </h2>
        <p className="text-slate-500 text-sm font-medium">
          Inicia sesión para gestionar tu cuenta familiar
        </p>
      </div>

      {/* Form Section */}
      <form action={formAction} className="flex flex-col w-full px-8 py-6 gap-5">
        {state.error && (
          <div className="bg-red-50 border border-red-200 text-red-600 text-sm rounded-lg p-3">
            {state.error}
          </div>
        )}

        <Input
          name="email"
          type="email"
          label="Correo electrónico"
          placeholder="nombre@ejemplo.com"
          icon="mail"
          required
        />

        <div className="flex flex-col gap-2">
          <Input
            name="password"
            type="password"
            label="Contraseña"
            placeholder="Ingresa tu contraseña"
            showPasswordToggle
            required
          />
          <div className="flex justify-end pt-1">
            <Link
              href="/recuperar-password"
              className="text-primary hover:text-starbiz-light text-sm font-medium leading-normal transition-colors hover:underline"
            >
              ¿Olvidaste tu contraseña?
            </Link>
          </div>
        </div>

        <Button type="submit" size="lg" className="w-full mt-2" isLoading={isPending}>
          <span>Iniciar Sesión</span>
          <Icon name="arrow_forward" className="text-lg transition-transform group-hover:translate-x-1" />
        </Button>
      </form>

      {/* Footer */}
      <div className="w-full bg-slate-50 py-5 px-8 flex justify-center border-t border-slate-100 rounded-b-xl">
        <p className="text-slate-600 text-sm">
          ¿Nuevo en Starbiz?{' '}
          <Link href="/registro" className="text-starbiz-dark font-bold hover:underline ml-1">
            Crear cuenta familiar
          </Link>
        </p>
      </div>
    </div>
  )
}
