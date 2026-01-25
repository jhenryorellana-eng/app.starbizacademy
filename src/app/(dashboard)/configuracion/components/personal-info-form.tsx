'use client'

import { useState } from 'react'
import { Card, Icon, Button, Input, Select, Avatar, AvatarUploadModal } from '@/components/ui'
import { countries } from '@/lib/constants/countries'
import type { Profile } from '@/types/database.types'

interface PersonalInfoFormProps {
  profile: Profile
}

export function PersonalInfoForm({ profile }: PersonalInfoFormProps) {
  const [formData, setFormData] = useState({
    firstName: profile.first_name,
    lastName: profile.last_name,
    email: profile.email,
    whatsappNumber: profile.whatsapp_number || '',
    country: profile.country || '',
    city: profile.city || '',
  })

  const [avatarUrl, setAvatarUrl] = useState<string | null>(profile.avatar_url)
  const [pendingAvatarFile, setPendingAvatarFile] = useState<File | null>(null)
  const [avatarPreview, setAvatarPreview] = useState<string | null>(profile.avatar_url)
  const [originalAvatarUrl] = useState<string | null>(profile.avatar_url)
  const [showAvatarModal, setShowAvatarModal] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  const hasUnsavedAvatarChange = avatarPreview !== originalAvatarUrl

  const initials = `${formData.firstName[0] || ''}${formData.lastName[0] || ''}`.toUpperCase()

  const handleSave = async () => {
    setIsSaving(true)
    setMessage(null)

    try {
      let finalAvatarUrl = avatarUrl

      // If there's a pending file, upload it first
      if (pendingAvatarFile) {
        const formDataUpload = new FormData()
        formDataUpload.append('file', pendingAvatarFile)

        const uploadResponse = await fetch('/api/user/avatar', {
          method: 'POST',
          body: formDataUpload,
        })

        if (!uploadResponse.ok) {
          const errorData = await uploadResponse.json()
          throw new Error(errorData.error || 'Error al subir imagen')
        }

        const uploadData = await uploadResponse.json()
        finalAvatarUrl = uploadData.url
      }

      // Save profile with the URL
      const response = await fetch('/api/user', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          firstName: formData.firstName,
          lastName: formData.lastName,
          whatsappNumber: formData.whatsappNumber || null,
          country: formData.country || null,
          city: formData.city || null,
          avatarUrl: finalAvatarUrl,
        }),
      })

      if (!response.ok) {
        throw new Error('Error al guardar los cambios')
      }

      // Clear pending file state and update URL
      setPendingAvatarFile(null)
      setAvatarUrl(finalAvatarUrl)
      setMessage({ type: 'success', text: 'Cambios guardados correctamente' })
    } catch (err) {
      setMessage({ type: 'error', text: err instanceof Error ? err.message : 'Error al guardar los cambios' })
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <Card className="border border-slate-100 p-6 md:p-8">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold text-text-main flex items-center gap-2">
          <Icon name="person" className="text-primary" />
          Información Personal
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

      <div className="flex flex-col md:flex-row gap-8 items-start">
        {/* Avatar */}
        <div className="flex flex-col items-center gap-3 shrink-0">
          <div className="relative group cursor-pointer" onClick={() => setShowAvatarModal(true)}>
            <Avatar
              src={avatarPreview}
              initials={initials}
              size="xl"
              className="border-4 border-white shadow-sm"
            />
            <div className="absolute inset-0 bg-black/40 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
              <Icon name="edit" className="text-white" />
            </div>
          </div>
          <button
            type="button"
            onClick={() => setShowAvatarModal(true)}
            className="text-sm font-medium text-primary hover:text-primary/80"
          >
            Cambiar Foto
          </button>
          {hasUnsavedAvatarChange && (
            <span className="text-sm text-amber-600 flex items-center gap-1">
              <Icon name="warning" size="sm" />
              Cambios sin guardar
            </span>
          )}
        </div>

        {/* Form Fields */}
        <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-6 w-full">
          <Input
            label="Nombre(s)"
            value={formData.firstName}
            onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
            placeholder="Tu nombre"
          />
          <Input
            label="Apellido(s)"
            value={formData.lastName}
            onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
            placeholder="Tu apellido"
          />
          <div className="relative">
            <Input
              label="Correo Electrónico"
              type="email"
              value={formData.email}
              disabled
              className="bg-slate-50"
            />
            <Icon
              name="check_circle"
              className="absolute right-3 top-9 text-primary"
              filled
              size="sm"
            />
          </div>
          <Input
            label="WhatsApp"
            value={formData.whatsappNumber}
            onChange={(e) => setFormData({ ...formData, whatsappNumber: e.target.value })}
            placeholder="+52 55 1234 5678"
          />
          <Select
            label="País"
            value={formData.country}
            onChange={(e) => setFormData({ ...formData, country: e.target.value })}
            options={[{ value: '', label: 'Seleccionar...' }, ...countries]}
          />
          <Input
            label="Ciudad"
            value={formData.city}
            onChange={(e) => setFormData({ ...formData, city: e.target.value })}
            placeholder="Tu ciudad"
          />
          <div className="md:col-span-2 flex justify-end pt-2">
            <Button onClick={handleSave} isLoading={isSaving}>
              Guardar Cambios
            </Button>
          </div>
        </div>
      </div>

      <AvatarUploadModal
        isOpen={showAvatarModal}
        onClose={() => setShowAvatarModal(false)}
        currentAvatar={avatarPreview}
        onSave={(data) => {
          if (data.type === 'url') {
            setAvatarUrl(data.url)
            setAvatarPreview(data.url)
            setPendingAvatarFile(null)
          } else {
            // Store file for upload when user saves the form
            setPendingAvatarFile(data.file)
            setAvatarPreview(data.preview)
            setAvatarUrl(null) // Will be set after upload
          }
        }}
      />
    </Card>
  )
}
