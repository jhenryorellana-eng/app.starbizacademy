'use client'

import { useEffect, useState } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { Suspense } from 'react'

function EnrollmentSuccessContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const [status, setStatus] = useState<'verifying' | 'success' | 'error'>('verifying')
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const sessionId = searchParams.get('session_id')
    if (!sessionId) {
      setStatus('error')
      setError('No se encontro la sesion de pago')
      return
    }

    verifyEnrollment(sessionId)
  }, [searchParams])

  async function verifyEnrollment(sessionId: string) {
    try {
      const response = await fetch('/api/stripe/verify-enrollment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId }),
      })

      const data = await response.json()

      if (data.enrolled) {
        setStatus('success')
      } else {
        throw new Error(data.error || 'No se pudo verificar la inscripcion')
      }
    } catch (err) {
      setStatus('error')
      setError(err instanceof Error ? err.message : 'Error de verificacion')
    }
  }

  function goToStarbooks() {
    const starbooksUrl = process.env.NEXT_PUBLIC_STARBOOKS_URL || '/inicio'
    window.open(starbooksUrl, '_blank')
  }

  if (status === 'verifying') {
    return (
      <div className="min-h-screen bg-background-page flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-500">Verificando tu pago...</p>
        </div>
      </div>
    )
  }

  if (status === 'error') {
    return (
      <div className="min-h-screen bg-background-page flex items-center justify-center px-4">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-lg p-8 text-center">
          <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-2xl">&#10007;</span>
          </div>
          <h1 className="text-xl font-bold text-gray-800 mb-2">Error en la verificacion</h1>
          <p className="text-gray-500 text-sm mb-6">{error}</p>
          <button
            onClick={() => router.push('/enrollment')}
            className="px-6 py-2.5 bg-primary hover:bg-primary-hover text-white font-semibold rounded-xl transition-colors"
          >
            Intentar de nuevo
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background-page flex items-center justify-center px-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-lg p-8 text-center">
        <div className="w-16 h-16 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-4">
          <span className="text-3xl">&#10003;</span>
        </div>
        <h1 className="text-2xl font-bold text-starbiz-dark mb-2">
          Inscripcion exitosa
        </h1>
        <p className="text-gray-500 text-sm mb-8">
          Ya puedes acceder a Starbooks y comenzar tu aprendizaje.
        </p>

        <div className="space-y-3">
          <button
            onClick={goToStarbooks}
            className="w-full py-3 px-4 bg-primary hover:bg-primary-hover text-white font-semibold rounded-xl transition-colors"
          >
            Acceder a Starbooks
          </button>
          <button
            onClick={() => router.push('/inicio')}
            className="w-full py-3 px-4 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold rounded-xl transition-colors"
          >
            Ir al Dashboard
          </button>
        </div>
      </div>
    </div>
  )
}

export default function EnrollmentSuccessPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-background-page flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    }>
      <EnrollmentSuccessContent />
    </Suspense>
  )
}
