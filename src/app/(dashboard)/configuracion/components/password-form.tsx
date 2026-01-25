'use client'

import { useState } from 'react'
import { Card, Icon, Button, Input } from '@/components/ui'

export function PasswordForm() {
  const [formData, setFormData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  })

  const [isSaving, setIsSaving] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  const isValid =
    formData.currentPassword.length > 0 &&
    formData.newPassword.length >= 8 &&
    formData.newPassword === formData.confirmPassword

  const handleSubmit = async () => {
    if (!isValid) return

    setIsSaving(true)
    setMessage(null)

    try {
      const response = await fetch('/api/user/password', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          currentPassword: formData.currentPassword,
          newPassword: formData.newPassword,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        setMessage({ type: 'error', text: data.error || 'Error al actualizar la contraseña' })
        return
      }

      setFormData({
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
      })
      setMessage({ type: 'success', text: 'Contraseña actualizada correctamente' })
    } catch {
      setMessage({ type: 'error', text: 'Error al actualizar la contraseña' })
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <Card className="border border-slate-100 p-6 md:p-8">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold text-text-main flex items-center gap-2">
          <Icon name="lock" className="text-primary" />
          Cambiar Contraseña
        </h2>
      </div>

      {message && (
        <div
          className={`mb-4 p-3 rounded-lg text-sm ${
            message.type === 'success'
              ? 'bg-green-50 border border-green-200 text-green-600'
              : 'bg-red-50 border border-red-200 text-red-600'
          }`}
        >
          {message.text}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Input
          label="Contraseña Actual"
          type="password"
          value={formData.currentPassword}
          onChange={(e) => setFormData({ ...formData, currentPassword: e.target.value })}
          placeholder="Tu contraseña actual"
          showPasswordToggle
          required
        />
        <div className="hidden md:block" />
        <Input
          label="Nueva Contraseña"
          type="password"
          value={formData.newPassword}
          onChange={(e) => setFormData({ ...formData, newPassword: e.target.value })}
          placeholder="Mínimo 8 caracteres"
          showPasswordToggle
          error={
            formData.newPassword && formData.newPassword.length < 8
              ? 'Mínimo 8 caracteres'
              : undefined
          }
        />
        <Input
          label="Confirmar Nueva Contraseña"
          type="password"
          value={formData.confirmPassword}
          onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
          placeholder="Repite la nueva contraseña"
          showPasswordToggle
          error={
            formData.confirmPassword && formData.newPassword !== formData.confirmPassword
              ? 'Las contraseñas no coinciden'
              : undefined
          }
        />
        <div className="md:col-span-2 flex justify-end">
          <Button
            variant="secondary"
            onClick={handleSubmit}
            disabled={!isValid}
            isLoading={isSaving}
          >
            Actualizar Contraseña
          </Button>
        </div>
      </div>
    </Card>
  )
}
