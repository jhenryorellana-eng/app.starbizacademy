'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function EnrollmentPage() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  async function handleEnrollment() {
    setLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/stripe/create-enrollment-checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      })

      const data = await response.json()

      if (!response.ok) {
        if (data.error === 'Ya tienes una inscripción activa') {
          router.push('/inicio')
          return
        }
        throw new Error(data.error || 'Error al crear el checkout')
      }

      window.location.href = data.url
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido')
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-background-page flex items-center justify-center px-4">
      <div className="max-w-lg w-full">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-starbiz-dark mb-2">
            Inscripcion al Programa
          </h1>
          <p className="text-gray-500">
            Starbiz Academy
          </p>
        </div>

        <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-8">
          <div className="text-center mb-6">
            <div className="inline-flex items-baseline gap-1 mb-2">
              <span className="text-4xl font-bold text-starbiz-dark">$25</span>
              <span className="text-gray-500 text-sm">USD</span>
            </div>
            <p className="text-sm text-gray-400">Pago unico de inscripcion</p>
          </div>

          <div className="space-y-3 mb-8">
            <div className="flex items-start gap-3 text-sm">
              <span className="text-primary mt-0.5">&#10003;</span>
              <span className="text-gray-600">Acceso inmediato a Starbooks (app web)</span>
            </div>
            <div className="flex items-start gap-3 text-sm">
              <span className="text-primary mt-0.5">&#10003;</span>
              <span className="text-gray-600">Contenido de libros y desarrollo personal</span>
            </div>
            <div className="flex items-start gap-3 text-sm">
              <span className="text-primary mt-0.5">&#10003;</span>
              <span className="text-gray-600">Acceso a comunidad de estudiantes</span>
            </div>
            <div className="flex items-start gap-3 text-sm">
              <span className="text-primary mt-0.5">&#10003;</span>
              <span className="text-gray-600">Prerequisito para el programa completo</span>
            </div>
          </div>

          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm text-center">
              {error}
            </div>
          )}

          <button
            onClick={handleEnrollment}
            disabled={loading}
            className="w-full py-3 px-4 bg-primary hover:bg-primary-hover disabled:opacity-50 text-white font-semibold rounded-xl transition-colors"
          >
            {loading ? 'Procesando...' : 'Pagar Inscripcion $25 USD'}
          </button>

          <p className="text-xs text-gray-400 text-center mt-4">
            Pago seguro procesado por Stripe. Inicio de clases: 15 de abril.
          </p>
        </div>
      </div>
    </div>
  )
}
