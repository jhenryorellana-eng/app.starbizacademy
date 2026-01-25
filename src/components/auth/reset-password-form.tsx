'use client'

import { useActionState } from 'react'
import Link from 'next/link'
import { resetPassword, type AuthState } from '@/lib/auth/actions'
import { Button, Input, Icon } from '@/components/ui'

const initialState: AuthState = {}

export function ResetPasswordForm() {
  const [state, formAction, isPending] = useActionState(resetPassword, initialState)

  if (state.success) {
    return (
      <div className="w-full max-w-[480px] flex flex-col bg-white rounded-xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] overflow-hidden">
        <div className="flex flex-col items-center px-8 py-12 gap-4">
          <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center text-emerald-600">
            <Icon name="check_circle" size="xl" />
          </div>
          <h2 className="text-slate-900 tracking-tight text-[24px] font-bold leading-tight text-center">
            Revisa tu correo
          </h2>
          <p className="text-slate-500 text-sm font-medium text-center max-w-sm">
            Hemos enviado un enlace para restablecer tu contraseña. Por favor, revisa tu bandeja de entrada.
          </p>
          <Link href="/login">
            <Button variant="secondary" className="mt-4">
              <Icon name="arrow_back" className="text-lg" />
              <span>Volver al inicio de sesión</span>
            </Button>
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="w-full max-w-[480px] flex flex-col bg-white rounded-xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] overflow-hidden">
      {/* Logo Section */}
      <div className="flex justify-center pt-10 pb-2">
        <div className="w-16 h-16 bg-gradient-to-br from-starbiz-dark to-starbiz-light rounded-xl flex items-center justify-center text-white">
          <Icon name="lock_reset" size="xl" />
        </div>
      </div>

      {/* Headline */}
      <div className="flex flex-col items-center px-8">
        <h2 className="text-slate-900 tracking-tight text-[24px] font-bold leading-tight pb-1 pt-3">
          Recuperar contraseña
        </h2>
        <p className="text-slate-500 text-sm font-medium text-center">
          Ingresa tu correo electrónico y código de padre para verificar tu identidad
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

        <Input
          name="parentCode"
          type="text"
          label="Código de Padre"
          placeholder="P-XXXXXXXX"
          icon="key"
          required
        />

        <Button type="submit" size="lg" className="w-full mt-2" isLoading={isPending}>
          <span>Enviar enlace</span>
          <Icon name="send" className="text-lg" />
        </Button>
      </form>

      {/* Footer */}
      <div className="w-full bg-slate-50 py-5 px-8 flex justify-center border-t border-slate-100 rounded-b-xl">
        <Link href="/login" className="text-slate-600 text-sm flex items-center gap-1 hover:text-starbiz-dark">
          <Icon name="arrow_back" className="text-lg" />
          <span>Volver al inicio de sesión</span>
        </Link>
      </div>
    </div>
  )
}
