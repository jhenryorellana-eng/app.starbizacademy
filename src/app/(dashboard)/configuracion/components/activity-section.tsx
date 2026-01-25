'use client'

import { useEffect, useState } from 'react'
import { Card, Icon } from '@/components/ui'
import { getRelativeTime } from '@/lib/utils/relative-time'
import { getDeviceIcon } from '@/lib/utils/user-agent-parser'
import type { LoginSession } from '@/types/database.types'

type LoadingState = 'loading' | 'error' | 'empty' | 'loaded'

export function ActivitySection() {
  const [sessions, setSessions] = useState<LoginSession[]>([])
  const [state, setState] = useState<LoadingState>('loading')

  useEffect(() => {
    const fetchSessions = async () => {
      try {
        const response = await fetch('/api/login-sessions')

        if (!response.ok) {
          throw new Error('Error fetching sessions')
        }

        const data = await response.json()

        if (data.length === 0) {
          setState('empty')
        } else {
          setSessions(data)
          setState('loaded')
        }
      } catch (error) {
        console.error('Error loading sessions:', error)
        setState('error')
      }
    }

    fetchSessions()
  }, [])

  const formatLocation = (session: LoginSession): string => {
    if (session.city && session.country) {
      return `${session.city}, ${session.country}`
    }
    if (session.country) {
      return session.country
    }
    return 'Ubicacion no disponible'
  }

  const formatOSVersion = (session: LoginSession): string => {
    if (session.os_name && session.os_version) {
      return `${session.os_name} ${session.os_version}`
    }
    if (session.os_name) {
      return session.os_name
    }
    return 'Sistema desconocido'
  }

  const formatBrowser = (session: LoginSession): string => {
    if (session.browser_name && session.browser_version) {
      return `${session.browser_name} ${session.browser_version}`
    }
    if (session.browser_name) {
      return session.browser_name
    }
    return 'Navegador desconocido'
  }

  // Loading state
  if (state === 'loading') {
    return (
      <Card className="border border-slate-100 p-6 md:p-8">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-text-main flex items-center gap-2">
            <Icon name="history" className="text-primary" />
            Sesiones Activas
          </h2>
        </div>
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </Card>
    )
  }

  // Error state
  if (state === 'error') {
    return (
      <Card className="border border-slate-100 p-6 md:p-8">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-text-main flex items-center gap-2">
            <Icon name="history" className="text-primary" />
            Sesiones Activas
          </h2>
        </div>
        <div className="text-center py-8">
          <Icon name="error" className="text-red-400 text-4xl mb-2" />
          <p className="text-text-muted">Error al cargar la actividad</p>
        </div>
      </Card>
    )
  }

  // Empty state
  if (state === 'empty') {
    return (
      <Card className="border border-slate-100 p-6 md:p-8">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-text-main flex items-center gap-2">
            <Icon name="history" className="text-primary" />
            Sesiones Activas
          </h2>
        </div>
        <div className="text-center py-8">
          <Icon name="login" className="text-slate-300 text-4xl mb-2" />
          <p className="text-text-muted">No hay sesiones registradas</p>
        </div>
      </Card>
    )
  }

  // Loaded state with sessions
  return (
    <Card className="border border-slate-100 p-6 md:p-8">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold text-text-main flex items-center gap-2">
          <Icon name="history" className="text-primary" />
          Sesiones Activas
        </h2>
      </div>

      <div className="space-y-3">
        {sessions.map((session, index) => {
          const isCurrentSession = index === 0
          const deviceIcon = getDeviceIcon(session.device_type || 'desktop')

          return (
            <div
              key={session.id}
              className={`p-4 rounded-xl ${
                isCurrentSession
                  ? 'bg-primary/5 border border-primary/20'
                  : 'bg-slate-50'
              }`}
            >
              <div className="flex items-start gap-3">
                <div
                  className={`p-2 rounded-lg ${
                    isCurrentSession ? 'bg-primary/10' : 'bg-slate-200'
                  }`}
                >
                  <Icon
                    name={deviceIcon}
                    className={isCurrentSession ? 'text-primary' : 'text-slate-500'}
                  />
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-text-main">
                      {formatBrowser(session)}
                    </span>
                    {isCurrentSession && (
                      <span className="text-xs bg-primary text-white px-2 py-0.5 rounded-full">
                        Sesion actual
                      </span>
                    )}
                  </div>

                  <p className="text-sm text-text-muted mt-0.5">
                    {formatOSVersion(session)}
                  </p>

                  <div className="flex items-center gap-4 mt-2 text-sm text-text-muted flex-wrap">
                    <span className="flex items-center gap-1">
                      <Icon name="location_on" size="sm" className="text-slate-400" />
                      {formatLocation(session)}
                    </span>
                    <span className="flex items-center gap-1">
                      <Icon name="schedule" size="sm" className="text-slate-400" />
                      {getRelativeTime(session.created_at)}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </Card>
  )
}
