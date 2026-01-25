'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, Icon, Button, Input, Select, Modal, ModalHeader, ModalBody, ModalFooter, Avatar } from '@/components/ui'
import { countries, getCountryLabel } from '@/lib/constants/countries'
import type { Child, FamilyCode } from '@/types/database.types'

type ChildWithCode = Child & {
  family_codes: Pick<FamilyCode, 'code' | 'status'> | null
}

interface ChildrenSectionProps {
  children: ChildWithCode[]
  hasMembership?: boolean
  maxChildrenAllowed?: number
}

function formatBirthDate(dateString: string): string {
  const date = new Date(dateString)
  return date.toLocaleDateString('es-MX', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
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

export function ChildrenSection({
  children: initialChildren,
  hasMembership = false,
  maxChildrenAllowed = 1
}: ChildrenSectionProps) {
  const router = useRouter()
  const [children, setChildren] = useState(initialChildren)
  const [editingChild, setEditingChild] = useState<ChildWithCode | null>(null)
  const [editForm, setEditForm] = useState({
    firstName: '',
    lastName: '',
    birthDate: '',
    city: '',
    country: '',
  })
  const [isSaving, setIsSaving] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  const handleRegisterChildren = () => {
    if (hasMembership) {
      // User has membership - go directly to register children
      const remainingSlots = maxChildrenAllowed - children.length
      if (remainingSlots > 0) {
        router.push(`/onboarding/hijos?children=${remainingSlots}&hasMembership=true`)
      }
    } else {
      // User doesn't have membership - go to plan selection first
      router.push('/onboarding/plan')
    }
  }

  const canAddMoreChildren = hasMembership && children.length < maxChildrenAllowed

  const openEditModal = (child: ChildWithCode) => {
    setEditingChild(child)
    setEditForm({
      firstName: child.first_name,
      lastName: child.last_name,
      birthDate: child.birth_date,
      city: child.city,
      country: child.country,
    })
    setMessage(null)
  }

  const closeModal = () => {
    setEditingChild(null)
    setMessage(null)
  }

  const handleSave = async () => {
    if (!editingChild) return

    setIsSaving(true)
    setMessage(null)

    try {
      const response = await fetch(`/api/children/${editingChild.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          firstName: editForm.firstName,
          lastName: editForm.lastName,
          birthDate: editForm.birthDate,
          city: editForm.city,
          country: editForm.country,
        }),
      })

      if (!response.ok) {
        throw new Error('Error al guardar los cambios')
      }

      const updatedChild = await response.json()

      // Update local state
      setChildren(children.map((c) => (c.id === editingChild.id ? updatedChild : c)))
      setMessage({ type: 'success', text: 'Cambios guardados correctamente' })

      // Close modal after a short delay
      setTimeout(() => {
        closeModal()
      }, 1000)
    } catch {
      setMessage({ type: 'error', text: 'Error al guardar los cambios' })
    } finally {
      setIsSaving(false)
    }
  }

  if (children.length === 0) {
    return (
      <Card className="border border-slate-100 p-6 md:p-8">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-text-main flex items-center gap-2">
            <Icon name="family_restroom" className="text-primary" />
            Hijos Registrados
          </h2>
        </div>

        <div className="text-center py-8">
          <Icon name="child_care" className="text-slate-300 text-6xl mb-4" />
          <p className="text-text-muted mb-4">No tienes hijos registrados</p>
          <Button variant="secondary" onClick={handleRegisterChildren}>
            <Icon name="add" size="sm" />
            {hasMembership ? 'Registrar hijos' : 'Seleccionar plan y registrar hijos'}
          </Button>
          {!hasMembership && (
            <p className="text-xs text-text-muted mt-2">
              Necesitas una membresía activa para registrar hijos
            </p>
          )}
        </div>
      </Card>
    )
  }

  return (
    <>
      <Card className="border border-slate-100 p-6 md:p-8">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-text-main flex items-center gap-2">
            <Icon name="family_restroom" className="text-primary" />
            Hijos Registrados
          </h2>
        </div>

        <div className="space-y-4">
          {children.map((child) => {
            const initials = `${child.first_name[0]}${child.last_name[0]}`.toUpperCase()
            const age = calculateAge(child.birth_date)

            return (
              <div
                key={child.id}
                className="flex items-center justify-between p-4 bg-slate-50 rounded-xl"
              >
                <div className="flex items-center gap-4">
                  <Avatar initials={initials} size="md" />
                  <div>
                    <p className="font-semibold text-text-main">
                      {child.first_name} {child.last_name}
                    </p>
                    <p className="text-sm text-text-muted">
                      {age} años • {child.city}, {getCountryLabel(child.country)}
                    </p>
                    {child.family_codes && (
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-xs font-mono bg-primary/10 text-primary px-2 py-0.5 rounded">
                          {child.family_codes.code}
                        </span>
                        <span
                          className={`text-xs px-2 py-0.5 rounded ${
                            child.family_codes.status === 'active'
                              ? 'bg-green-100 text-green-600'
                              : 'bg-slate-200 text-slate-500'
                          }`}
                        >
                          {child.family_codes.status === 'active' ? 'Activo' : 'Inactivo'}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
                <Button variant="secondary" size="sm" onClick={() => openEditModal(child)}>
                  <Icon name="edit" size="sm" />
                  Editar
                </Button>
              </div>
            )
          })}
        </div>

        {/* Add more children button */}
        {canAddMoreChildren && (
          <div className="mt-6 pt-6 border-t border-slate-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-text-muted">
                  {children.length} de {maxChildrenAllowed} hijos registrados
                </p>
              </div>
              <Button variant="secondary" size="sm" onClick={handleRegisterChildren}>
                <Icon name="add" size="sm" />
                Agregar hijo
              </Button>
            </div>
          </div>
        )}
      </Card>

      {/* Edit Modal */}
      <Modal isOpen={!!editingChild} onClose={closeModal} size="lg">
        <ModalHeader onClose={closeModal}>
          Editar información de {editingChild?.first_name}
        </ModalHeader>
        <ModalBody>
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

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="Nombre(s)"
              value={editForm.firstName}
              onChange={(e) => setEditForm({ ...editForm, firstName: e.target.value })}
              placeholder="Nombre"
            />
            <Input
              label="Apellido(s)"
              value={editForm.lastName}
              onChange={(e) => setEditForm({ ...editForm, lastName: e.target.value })}
              placeholder="Apellido"
            />
            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium text-text-main">
                Fecha de nacimiento
              </label>
              <input
                type="date"
                value={editForm.birthDate}
                onChange={(e) => setEditForm({ ...editForm, birthDate: e.target.value })}
                className="w-full rounded-lg border border-input-border bg-white px-4 py-2.5 text-base font-normal text-text-main focus:border-primary focus:ring-1 focus:ring-primary transition-colors"
              />
              {editForm.birthDate && (
                <p className="text-slate-500 text-sm">
                  {formatBirthDate(editForm.birthDate)} ({calculateAge(editForm.birthDate)} años)
                </p>
              )}
            </div>
            <Input
              label="Ciudad"
              value={editForm.city}
              onChange={(e) => setEditForm({ ...editForm, city: e.target.value })}
              placeholder="Ciudad"
            />
            <div className="md:col-span-2">
              <Select
                label="País"
                value={editForm.country}
                onChange={(e) => setEditForm({ ...editForm, country: e.target.value })}
                options={countries}
              />
            </div>
          </div>
        </ModalBody>
        <ModalFooter>
          <Button variant="secondary" onClick={closeModal}>
            Cancelar
          </Button>
          <Button onClick={handleSave} isLoading={isSaving}>
            Guardar Cambios
          </Button>
        </ModalFooter>
      </Modal>
    </>
  )
}
