'use client'

import { Suspense, useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Card, Icon, Button, Badge } from '@/components/ui'

interface ChildCode {
  name: string
  code: string
}

interface CodesData {
  parent: {
    name: string
    code: string
  }
  children: ChildCode[]
}

function CodigosContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const sessionId = searchParams.get('session_id')

  const [copiedCode, setCopiedCode] = useState<string | null>(null)
  const [codes, setCodes] = useState<CodesData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const verifyAndCreateChildren = async () => {
      try {
        // STEP 1: Verify Stripe session and create family if not exists
        // This handles the case where the webhook hasn't been received yet (local dev)
        if (sessionId) {
          const verifyResponse = await fetch('/api/stripe/verify-session', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ sessionId }),
          })

          if (!verifyResponse.ok) {
            const data = await verifyResponse.json()
            throw new Error(data.error || 'Error al verificar pago')
          }
        }

        // STEP 2: Create children from sessionStorage (post-payment flow)
        const pendingChildrenJson = sessionStorage.getItem('pendingChildren')

        if (pendingChildrenJson) {
          const pendingChildren = JSON.parse(pendingChildrenJson)

          const response = await fetch('/api/children', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              children: pendingChildren.map((child: { firstName: string; lastName: string; birthDate: string; city: string; country: string }) => ({
                firstName: child.firstName,
                lastName: child.lastName,
                birthDate: child.birthDate,
                city: child.city,
                country: child.country,
              })),
            }),
          })

          if (!response.ok) {
            const data = await response.json()
            throw new Error(data.error || 'Error al registrar hijos')
          }

          // Clear pending children from sessionStorage
          sessionStorage.removeItem('pendingChildren')
        }

        // STEP 3: Fetch family codes
        const codesResponse = await fetch('/api/family-codes')
        if (!codesResponse.ok) {
          throw new Error('Error al obtener códigos')
        }

        const codesData = await codesResponse.json()
        setCodes(codesData)
      } catch (err) {
        console.error('Error:', err)
        setError(err instanceof Error ? err.message : 'Error al procesar')
      } finally {
        setIsLoading(false)
      }
    }

    verifyAndCreateChildren()
  }, [sessionId])

  const copyCode = async (code: string) => {
    await navigator.clipboard.writeText(code)
    setCopiedCode(code)
    setTimeout(() => setCopiedCode(null), 2000)
  }

  const shareAll = () => {
    if (!codes) return
    const message = `¡Bienvenidos a Starbiz Academy!\n\nCódigos de acceso:\n\n${codes.children.map(c => `${c.name}: ${c.code}`).join('\n')}\n\nDescarga la app CEO Junior para empezar.`
    if (navigator.share) {
      navigator.share({ title: 'Códigos de Starbiz Academy', text: message })
    } else {
      navigator.clipboard.writeText(message)
      alert('Códigos copiados al portapapeles')
    }
  }

  // Loading state
  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-16">
        <div className="w-12 h-12 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
        <p className="text-text-muted">Generando tus códigos de acceso...</p>
      </div>
    )
  }

  // Error state
  if (error) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-16">
        <div className="w-20 h-20 mx-auto bg-red-100 rounded-full flex items-center justify-center">
          <Icon name="error" size="xl" className="text-red-600" />
        </div>
        <h1 className="text-xl font-bold text-text-main">Error</h1>
        <p className="text-text-muted text-center">{error}</p>
        <Button onClick={() => router.push('/inicio')}>
          Ir al inicio
        </Button>
      </div>
    )
  }

  // No codes available
  if (!codes) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-16">
        <p className="text-text-muted">No se encontraron códigos</p>
        <Button onClick={() => router.push('/inicio')}>
          Ir al inicio
        </Button>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-8 max-w-2xl mx-auto">
      {/* Success Header */}
      <div className="text-center">
        <div className="w-20 h-20 mx-auto mb-4 bg-emerald-100 rounded-full flex items-center justify-center">
          <Icon name="check_circle" size="xl" className="text-emerald-600" />
        </div>
        <h1 className="text-3xl font-bold text-text-main mb-2">
          ¡Configuración completa!
        </h1>
        <p className="text-text-muted">
          Tus códigos de acceso familiar están listos. Guárdalos en un lugar seguro.
        </p>
      </div>

      {/* Parent Code */}
      <Card className="p-6 border border-slate-200">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary/20 to-primary flex items-center justify-center text-white font-bold">
              {codes.parent.name.split(' ').map(n => n[0]).join('')}
            </div>
            <div>
              <p className="font-medium text-text-main">{codes.parent.name}</p>
              <Badge variant="purple">Tu código (Padre)</Badge>
            </div>
          </div>
        </div>

        <div className="bg-code-bg rounded-lg p-4 flex items-center justify-between">
          <span className="font-mono text-2xl font-bold text-white tracking-widest">
            {codes.parent.code}
          </span>
          <button
            onClick={() => copyCode(codes.parent.code)}
            className="text-white/70 hover:text-white p-2 rounded-md hover:bg-white/10 transition-colors"
          >
            <Icon name={copiedCode === codes.parent.code ? 'check' : 'content_copy'} />
          </button>
        </div>

        <p className="text-xs text-text-muted mt-3">
          <Icon name="warning" size="sm" className="inline mr-1" />
          No compartas este código. Es solo para ti como administrador familiar.
        </p>
      </Card>

      {/* Children Codes */}
      {codes.children.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-text-main">Códigos de tus hijos</h2>
            <Button variant="ghost" size="sm" onClick={shareAll}>
              <Icon name="share" size="sm" />
              Compartir todos
            </Button>
          </div>

          {codes.children.map((child) => (
            <Card key={child.code} className="p-6 border border-slate-200">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-200 to-blue-500 flex items-center justify-center text-white font-bold">
                    {child.name[0]}
                  </div>
                  <div>
                    <p className="font-medium text-text-main">{child.name}</p>
                    <Badge variant="info">Estudiante</Badge>
                  </div>
                </div>
              </div>

              <div className="bg-code-bg rounded-lg p-4 flex items-center justify-between">
                <span className="font-mono text-2xl font-bold text-white tracking-widest">
                  {child.code}
                </span>
                <button
                  onClick={() => copyCode(child.code)}
                  className="text-white/70 hover:text-white p-2 rounded-md hover:bg-white/10 transition-colors"
                >
                  <Icon name={copiedCode === child.code ? 'check' : 'content_copy'} />
                </button>
              </div>

              {/* Share buttons */}
              <div className="flex gap-2 mt-4">
                <button
                  onClick={() => {
                    const msg = encodeURIComponent(`¡Hola ${child.name}! Tu código para CEO Junior es: ${child.code}`)
                    window.open(`https://wa.me/?text=${msg}`, '_blank')
                  }}
                  className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-[#25D366]/10 hover:bg-[#25D366]/20 text-[#075E54] rounded-lg text-sm font-medium transition-colors"
                >
                  <Icon name="chat" size="sm" />
                  WhatsApp
                </button>
                <button
                  onClick={() => {
                    const subject = encodeURIComponent('Tu código de Starbiz Academy')
                    const body = encodeURIComponent(`¡Hola ${child.name}!\n\nTu código para CEO Junior es: ${child.code}\n\nDescarga la app y usa este código para iniciar sesión.`)
                    window.open(`mailto:?subject=${subject}&body=${body}`, '_blank')
                  }}
                  className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-sm font-medium transition-colors"
                >
                  <Icon name="mail" size="sm" />
                  Email
                </button>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Email confirmation note */}
      <Card className="p-4 border border-emerald-200 bg-emerald-50">
        <div className="flex items-start gap-3">
          <Icon name="mail" className="text-emerald-600 shrink-0" />
          <p className="text-sm text-emerald-800">
            También hemos enviado estos códigos a tu correo electrónico para que los tengas como respaldo.
          </p>
        </div>
      </Card>

      {/* Continue to Dashboard */}
      <Button
        size="lg"
        onClick={() => router.push('/inicio')}
        className="w-full"
      >
        Ir a mi panel de control
        <Icon name="arrow_forward" />
      </Button>
    </div>
  )
}

function LoadingFallback() {
  return (
    <div className="flex flex-col items-center justify-center gap-4 py-16">
      <div className="w-12 h-12 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
      <p className="text-text-muted">Cargando...</p>
    </div>
  )
}

export default function CodigosPage() {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <CodigosContent />
    </Suspense>
  )
}
