'use client'

import { useState } from 'react'

export function StarbooksAccessButton() {
  const [loading, setLoading] = useState(false)

  async function handleAccess() {
    setLoading(true)
    try {
      const res = await fetch('/api/auth/starbooks-access', { method: 'POST' })
      const data = await res.json()

      if (data.redirectUrl) {
        window.open(data.redirectUrl, '_blank')
      } else {
        alert(data.error || 'Error al acceder')
      }
    } catch {
      alert('Error de conexión')
    } finally {
      setLoading(false)
    }
  }

  return (
    <button
      onClick={handleAccess}
      disabled={loading}
      className="px-5 py-2.5 bg-primary hover:bg-primary-hover disabled:opacity-50 text-white font-semibold rounded-xl transition-colors text-sm"
    >
      {loading ? 'Cargando...' : 'Acceder'}
    </button>
  )
}
