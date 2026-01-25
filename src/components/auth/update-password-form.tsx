'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Button, Input, Icon } from '@/components/ui'

export function UpdatePasswordForm() {
  const router = useRouter()
  const [formData, setFormData] = useState({
    password: '',
    confirmPassword: '',
  })
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [isValidSession, setIsValidSession] = useState<boolean | null>(null)

  useEffect(() => {
    // Check if we have a valid recovery session
    const checkSession = async () => {
      const supabase = createClient()
      const { data: { session } } = await supabase.auth.getSession()

      // Supabase automatically handles the recovery token from the URL
      // If there's a session, the user came from a valid recovery link
      setIsValidSession(!!session)
    }

    checkSession()
  }, [])

  const isValid =
    formData.password.length >= 8 &&
    formData.password === formData.confirmPassword

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!isValid) return

    setIsLoading(true)
    setError(null)

    try {
      const supabase = createClient()
      const { error: updateError } = await supabase.auth.updateUser({
        password: formData.password,
      })

      if (updateError) {
        setError(updateError.message || 'Error al actualizar la contraseña')
        return
      }

      setSuccess(true)

      // Redirect to login after 3 seconds
      setTimeout(() => {
        router.push('/login')
      }, 3000)
    } catch {
      setError('Error al actualizar la contraseña')
    } finally {
      setIsLoading(false)
    }
  }

  // Loading state while checking session
  if (isValidSession === null) {
    return (
      <div className="w-full max-w-[480px] flex flex-col bg-white rounded-xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] overflow-hidden">
        <div className="flex flex-col items-center px-8 py-12 gap-4">
          <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center text-slate-400 animate-pulse">
            <Icon name="lock_reset" size="xl" />
          </div>
          <p className="text-slate-500 text-sm font-medium">Verificando enlace...</p>
        </div>
      </div>
    )
  }

  // Invalid or expired link
  if (!isValidSession) {
    return (
      <div className="w-full max-w-[480px] flex flex-col bg-white rounded-xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] overflow-hidden">
        <div className="flex flex-col items-center px-8 py-12 gap-4">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center text-red-600">
            <Icon name="error" size="xl" />
          </div>
          <h2 className="text-slate-900 tracking-tight text-[24px] font-bold leading-tight text-center">
            Enlace inválido o expirado
          </h2>
          <p className="text-slate-500 text-sm font-medium text-center max-w-sm">
            El enlace de recuperación ha expirado o no es válido. Por favor, solicita uno nuevo.
          </p>
          <Link href="/recuperar-password">
            <Button variant="secondary" className="mt-4">
              <Icon name="refresh" className="text-lg" />
              <span>Solicitar nuevo enlace</span>
            </Button>
          </Link>
        </div>
      </div>
    )
  }

  // Success state
  if (success) {
    return (
      <div className="w-full max-w-[480px] flex flex-col bg-white rounded-xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] overflow-hidden">
        <div className="flex flex-col items-center px-8 py-12 gap-4">
          <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center text-emerald-600">
            <Icon name="check_circle" size="xl" />
          </div>
          <h2 className="text-slate-900 tracking-tight text-[24px] font-bold leading-tight text-center">
            Contraseña actualizada
          </h2>
          <p className="text-slate-500 text-sm font-medium text-center max-w-sm">
            Tu contraseña ha sido actualizada correctamente. Serás redirigido al inicio de sesión.
          </p>
          <Link href="/login">
            <Button variant="secondary" className="mt-4">
              <Icon name="login" className="text-lg" />
              <span>Ir al inicio de sesión</span>
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
          Nueva contraseña
        </h2>
        <p className="text-slate-500 text-sm font-medium text-center">
          Ingresa tu nueva contraseña
        </p>
      </div>

      {/* Form Section */}
      <form onSubmit={handleSubmit} className="flex flex-col w-full px-8 py-6 gap-5">
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-600 text-sm rounded-lg p-3">
            {error}
          </div>
        )}

        <Input
          label="Nueva contraseña"
          type="password"
          value={formData.password}
          onChange={(e) => setFormData({ ...formData, password: e.target.value })}
          placeholder="Mínimo 8 caracteres"
          showPasswordToggle
          error={
            formData.password && formData.password.length < 8
              ? 'La contraseña debe tener al menos 8 caracteres'
              : undefined
          }
          required
        />

        <Input
          label="Confirmar contraseña"
          type="password"
          value={formData.confirmPassword}
          onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
          placeholder="Repite la nueva contraseña"
          showPasswordToggle
          error={
            formData.confirmPassword && formData.password !== formData.confirmPassword
              ? 'Las contraseñas no coinciden'
              : undefined
          }
          required
        />

        <Button type="submit" size="lg" className="w-full mt-2" isLoading={isLoading} disabled={!isValid}>
          <span>Actualizar contraseña</span>
          <Icon name="check" className="text-lg" />
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
