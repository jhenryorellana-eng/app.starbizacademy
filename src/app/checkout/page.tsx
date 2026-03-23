'use client'

import { useEffect, useState } from 'react'

export default function CheckoutPage() {
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function redirectToStripe() {
      try {
        const res = await fetch('/api/stripe/create-guest-enrollment', {
          method: 'POST',
        })
        const data = await res.json()

        if (data.url) {
          window.location.href = data.url
        } else {
          setError(data.error || 'Error al iniciar el pago')
        }
      } catch {
        setError('Error de conexion. Intenta de nuevo.')
      }
    }

    redirectToStripe()
  }, [])

  if (error) {
    return (
      <div className="min-h-screen bg-background-page flex items-center justify-center px-4">
        <div className="max-w-sm w-full bg-white rounded-2xl shadow-lg p-8 text-center">
          <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-2xl text-red-500">!</span>
          </div>
          <h1 className="text-xl font-bold text-gray-800 mb-2">Error</h1>
          <p className="text-gray-500 text-sm mb-6">{error}</p>
          <a
            href="/"
            className="inline-block px-6 py-2.5 bg-primary hover:bg-primary-hover text-white font-semibold rounded-xl transition-colors text-sm"
          >
            Volver al inicio
          </a>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background-page flex items-center justify-center">
      <div className="text-center">
        <div className="w-10 h-10 border-3 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
        <p className="text-gray-600 font-medium">Preparando tu pago...</p>
        <p className="text-gray-400 text-sm mt-1">Seras redirigido a Stripe</p>
      </div>
    </div>
  )
}
