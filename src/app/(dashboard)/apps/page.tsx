'use client'

import { useState, useEffect } from 'react'
import { Header } from '@/components/layout'
import { Card, CardContent, Icon, Badge, Button, Modal, ModalHeader, ModalBody, ModalFooter } from '@/components/ui'

const parentApps = [
  {
    id: 'stareduca-senior',
    name: 'StarEduca Senior',
    description: 'Guías de crianza para la era digital.',
    icon: 'school',
    iconBg: 'bg-blue-50',
    iconColor: 'text-blue-600',
    installed: true,
  },
  {
    id: 'starvoices',
    name: 'StarVoices',
    description: 'Voces de expertos para padres.',
    icon: 'forum',
    iconBg: 'bg-purple-50',
    iconColor: 'text-purple-600',
    installed: true,
  },
]

const childApps = [
  {
    id: 'stareduca-junior',
    name: 'StarEduca Junior',
    description: 'Formación integral para el CEO del futuro.',
    icon: 'sports_esports',
    iconBg: 'bg-indigo-50',
    iconColor: 'text-indigo-600',
    installed: true,
  },
  {
    id: 'starbooks',
    name: 'StarBooks',
    description: 'Resúmenes de libros transformadores e inspiradores.',
    icon: 'menu_book',
    iconBg: 'bg-amber-50',
    iconColor: 'text-amber-600',
    installed: true,
  },
]

export default function AppsPage() {
  const [selectedApp, setSelectedApp] = useState<typeof parentApps[0] | null>(null)
  const [showModal, setShowModal] = useState(false)
  const [notificationCount, setNotificationCount] = useState(0)

  useEffect(() => {
    async function fetchNotificationCount() {
      try {
        const response = await fetch('/api/notifications/count')
        if (response.ok) {
          const { count } = await response.json()
          setNotificationCount(count)
        }
      } catch (error) {
        console.error('Error fetching notification count:', error)
      }
    }
    fetchNotificationCount()
  }, [])

  const handleAppClick = (app: typeof parentApps[0]) => {
    setSelectedApp(app)
    setShowModal(true)
  }

  return (
    <>
      <Header
        title="Apps y Ecosistema"
        subtitle="Gestiona el acceso familiar, descarga apps y monitorea la actividad"
        notificationCount={notificationCount}
      />

      {/* Section 1: Padres 3.0 */}
      <section className="flex flex-col gap-5">
        <div className="flex items-center justify-between">
          <h2 className="text-text-main tracking-tight text-2xl font-bold flex items-center gap-2">
            <span className="w-2 h-8 bg-primary rounded-full" />
            Super App: Padres 3.0
          </h2>
          <span className="text-sm font-medium text-text-muted bg-white px-3 py-1 rounded-full border border-slate-200">
            Zona de Padres
          </span>
        </div>

        {/* Hero Banner */}
        <Card className="overflow-hidden border border-slate-200">
          <div className="flex flex-col lg:flex-row">
            <div className="w-full lg:w-2/5 min-h-[200px] bg-gradient-to-br from-primary/20 to-starbiz-dark/10 flex items-center justify-center">
              <div className="text-center p-8">
                <Icon name="phone_iphone" size="xl" className="text-primary mb-2" />
                <p className="text-text-muted text-sm">App Móvil</p>
              </div>
            </div>
            <CardContent className="flex-1 flex flex-col justify-center gap-4 p-8">
              <div>
                <h3 className="text-text-main text-2xl font-bold leading-tight mb-2">
                  Lleva la educación en tu bolsillo
                </h3>
                <p className="text-text-muted text-base leading-relaxed">
                  Descarga Padres 3.0 para acceder a guías de crianza, escuchar expertos y seguir el progreso de tu hijo desde cualquier lugar.
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-4 mt-2">
                <button className="flex items-center justify-center gap-3 rounded-lg h-10 px-6 bg-slate-900 text-white hover:bg-slate-800 transition-colors shadow-lg">
                  <Icon name="ios" size="lg" />
                  <div className="flex flex-col items-start leading-none">
                    <span className="text-[8px] uppercase text-slate-300">Download on the</span>
                    <span className="text-xs font-bold">App Store</span>
                  </div>
                </button>
                <button className="flex items-center justify-center gap-3 rounded-lg h-10 px-6 bg-slate-900 text-white hover:bg-slate-800 transition-colors shadow-lg">
                  <Icon name="android" size="lg" />
                  <div className="flex flex-col items-start leading-none">
                    <span className="text-[8px] uppercase text-slate-300">Get it on</span>
                    <span className="text-xs font-bold">Google Play</span>
                  </div>
                </button>
              </div>
            </CardContent>
          </div>
        </Card>

        {/* Parent Apps Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {parentApps.map((app) => (
            <Card
              key={app.id}
              className="p-5 border border-slate-200 hover:shadow-md transition-shadow cursor-pointer"
              onClick={() => handleAppClick(app)}
            >
              <div className="flex items-start justify-between mb-4">
                <div className={`p-3 rounded-lg ${app.iconBg} ${app.iconColor}`}>
                  <Icon name={app.icon} size="lg" />
                </div>
                <Badge variant="success" className="text-[10px] font-bold uppercase">
                  Instalado
                </Badge>
              </div>
              <div className="flex flex-col gap-1 mb-4">
                <h3 className="text-text-main text-lg font-bold">{app.name}</h3>
                <p className="text-text-muted text-sm">{app.description}</p>
              </div>
              <Button className="w-full">
                <span>Abrir App</span>
                <Icon name="open_in_new" size="sm" />
              </Button>
            </Card>
          ))}

        </div>
      </section>

      {/* Divider */}
      <hr className="border-slate-200" />

      {/* Section 2: CEO Junior */}
      <section className="flex flex-col gap-5 pb-8">
        <div className="flex items-center justify-between">
          <h2 className="text-text-main tracking-tight text-2xl font-bold flex items-center gap-2">
            <span className="w-2 h-8 bg-indigo-500 rounded-full" />
            Super App: CEO Junior
          </h2>
          <span className="text-sm font-medium text-indigo-600 bg-indigo-50 px-3 py-1 rounded-full border border-indigo-100">
            Zona de Estudiantes
          </span>
        </div>

        {/* Hero Banner - Descarga CEO Junior */}
        <Card className="overflow-hidden border border-slate-200">
          <div className="flex flex-col lg:flex-row">
            <div className="w-full lg:w-2/5 min-h-[200px] bg-gradient-to-br from-indigo-500/20 to-indigo-900/10 flex items-center justify-center">
              <div className="text-center p-8">
                <Icon name="phone_iphone" size="xl" className="text-indigo-600 mb-2" />
                <p className="text-text-muted text-sm">App Móvil</p>
              </div>
            </div>
            <CardContent className="flex-1 flex flex-col justify-center gap-4 p-8">
              <div>
                <h3 className="text-text-main text-2xl font-bold leading-tight mb-2">
                  Obtén la experiencia completa en móvil
                </h3>
                <p className="text-text-muted text-base leading-relaxed">
                  Descarga CEO Junior para que tu hijo acceda a todo el contenido educativo, cursos interactivos y más desde su dispositivo.
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-4 mt-2">
                <button className="flex items-center justify-center gap-3 rounded-lg h-10 px-6 bg-slate-900 text-white hover:bg-slate-800 transition-colors shadow-lg">
                  <Icon name="ios" size="lg" />
                  <div className="flex flex-col items-start leading-none">
                    <span className="text-[8px] uppercase text-slate-300">Download on the</span>
                    <span className="text-xs font-bold">App Store</span>
                  </div>
                </button>
                <button className="flex items-center justify-center gap-3 rounded-lg h-10 px-6 bg-slate-900 text-white hover:bg-slate-800 transition-colors shadow-lg">
                  <Icon name="android" size="lg" />
                  <div className="flex flex-col items-start leading-none">
                    <span className="text-[8px] uppercase text-slate-300">Get it on</span>
                    <span className="text-xs font-bold">Google Play</span>
                  </div>
                </button>
              </div>
            </CardContent>
          </div>
        </Card>

        {/* Child Apps Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {childApps.map((app) => (
            <Card
              key={app.id}
              className="p-5 border border-slate-200 hover:shadow-md transition-shadow cursor-pointer"
              onClick={() => handleAppClick(app)}
            >
              <div className="flex items-start justify-between mb-4">
                <div className={`p-3 rounded-lg ${app.iconBg} ${app.iconColor}`}>
                  <Icon name={app.icon} size="lg" />
                </div>
                <Badge variant="success" className="text-[10px] font-bold uppercase">
                  Instalado
                </Badge>
              </div>
              <div className="flex flex-col gap-1 mb-4">
                <h3 className="text-text-main text-lg font-bold">{app.name}</h3>
                <p className="text-text-muted text-sm">{app.description}</p>
              </div>
              <Button className="w-full">
                <span>Abrir App</span>
                <Icon name="open_in_new" size="sm" />
              </Button>
            </Card>
          ))}
        </div>
      </section>

      {/* App Info Modal */}
      <Modal isOpen={showModal} onClose={() => setShowModal(false)} size="md">
        <ModalHeader onClose={() => setShowModal(false)}>
          {selectedApp?.name}
        </ModalHeader>
        <ModalBody>
          {(() => {
            const isChildApp = childApps.some(app => app.id === selectedApp?.id)
            const superAppName = isChildApp ? 'CEO Junior' : 'Padres 3.0'
            return (
              <div className="flex flex-col items-center text-center gap-4">
                <div className={`p-4 rounded-xl ${selectedApp?.iconBg} ${selectedApp?.iconColor}`}>
                  <Icon name={selectedApp?.icon || 'apps'} size="xl" />
                </div>
                <p className="text-text-muted">{selectedApp?.description}</p>
                <p className="text-sm text-slate-500">
                  Esta aplicación se accede desde la Super App {superAppName} en tu dispositivo móvil.
                </p>
              </div>
            )
          })()}
        </ModalBody>
        <ModalFooter>
          {(() => {
            const isChildApp = childApps.some(app => app.id === selectedApp?.id)
            const superAppName = isChildApp ? 'CEO Junior' : 'Padres 3.0'
            return (
              <>
                <Button variant="secondary" onClick={() => setShowModal(false)}>
                  Cerrar
                </Button>
                <Button>
                  Ir a {superAppName}
                  <Icon name="open_in_new" size="sm" />
                </Button>
              </>
            )
          })()}
        </ModalFooter>
      </Modal>
    </>
  )
}
