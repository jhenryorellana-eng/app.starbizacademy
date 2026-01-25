'use client'

import { useState } from 'react'
import { Header } from '@/components/layout'
import { Card, Icon, Button, Badge } from '@/components/ui'
import { cn } from '@/lib/utils'

type Notification = {
  id: string
  type: string
  title: string
  message: string
  created_at: string
  read_at: string | null
}

type NotificacionesClientProps = {
  initialNotifications: Notification[]
}

const iconConfig: Record<string, { icon: string; iconBg: string; iconColor: string }> = {
  subscription_created: { icon: 'check_circle', iconBg: 'bg-emerald-100', iconColor: 'text-emerald-600' },
  subscription_renewed: { icon: 'check_circle', iconBg: 'bg-emerald-100', iconColor: 'text-emerald-600' },
  subscription_updated: { icon: 'trending_up', iconBg: 'bg-blue-100', iconColor: 'text-blue-600' },
  subscription_downgrade_scheduled: { icon: 'schedule', iconBg: 'bg-amber-100', iconColor: 'text-amber-600' },
  subscription_downgrade_applied: { icon: 'info', iconBg: 'bg-amber-100', iconColor: 'text-amber-600' },
  subscription_downgrade_canceled: { icon: 'undo', iconBg: 'bg-blue-100', iconColor: 'text-blue-600' },
  subscription_cancel_scheduled: { icon: 'event_busy', iconBg: 'bg-amber-100', iconColor: 'text-amber-600' },
  subscription_reactivated: { icon: 'autorenew', iconBg: 'bg-emerald-100', iconColor: 'text-emerald-600' },
  subscription_canceled: { icon: 'cancel', iconBg: 'bg-red-100', iconColor: 'text-red-600' },
  payment_failed: { icon: 'error', iconBg: 'bg-red-100', iconColor: 'text-red-600' },
  child_registered: { icon: 'person_add', iconBg: 'bg-purple-100', iconColor: 'text-purple-600' },
  password_changed: { icon: 'lock', iconBg: 'bg-blue-100', iconColor: 'text-blue-600' },
}

const defaultIcon = { icon: 'notifications', iconBg: 'bg-slate-100', iconColor: 'text-slate-600' }

function formatDate(dateString: string): string {
  const date = new Date(dateString)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

  if (diffHours < 1) {
    return 'Hace unos minutos'
  } else if (diffHours < 24) {
    return `Hace ${diffHours} hora${diffHours > 1 ? 's' : ''}`
  } else if (diffDays < 7) {
    return `Hace ${diffDays} día${diffDays > 1 ? 's' : ''}`
  } else {
    return date.toLocaleDateString('es-MX', { day: 'numeric', month: 'short' })
  }
}

export function NotificacionesClient({ initialNotifications }: NotificacionesClientProps) {
  const [notifications, setNotifications] = useState<Notification[]>(initialNotifications)
  const unreadCount = notifications.filter((n) => !n.read_at).length

  const markAsRead = async (id: string) => {
    // Optimistic update
    setNotifications(
      notifications.map((n) =>
        n.id === id ? { ...n, read_at: new Date().toISOString() } : n
      )
    )

    // Call API
    try {
      await fetch(`/api/notifications/${id}/read`, {
        method: 'PUT',
      })
    } catch (error) {
      console.error('Error marking notification as read:', error)
    }
  }

  const markAllAsRead = async () => {
    // Optimistic update
    setNotifications(
      notifications.map((n) => ({
        ...n,
        read_at: n.read_at || new Date().toISOString(),
      }))
    )

    // Call API
    try {
      await fetch('/api/notifications/read-all', {
        method: 'PUT',
      })
    } catch (error) {
      console.error('Error marking all notifications as read:', error)
    }
  }

  return (
    <>
      <Header
        title="Centro de Notificaciones"
        subtitle={`${unreadCount} notificación${unreadCount !== 1 ? 'es' : ''} sin leer`}
      />

      {/* Actions */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Badge variant={unreadCount > 0 ? 'info' : 'default'}>
            {unreadCount} sin leer
          </Badge>
        </div>
        {unreadCount > 0 && (
          <Button variant="ghost" size="sm" onClick={markAllAsRead}>
            <Icon name="done_all" size="sm" />
            Marcar todas como leídas
          </Button>
        )}
      </div>

      {/* Notifications List */}
      <div className="flex flex-col gap-3">
        {notifications.length === 0 ? (
          <Card className="p-12 border border-slate-100 flex flex-col items-center justify-center text-center">
            <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center mb-4">
              <Icon name="notifications_off" size="xl" className="text-slate-400" />
            </div>
            <h3 className="text-lg font-semibold text-text-main mb-2">
              No hay notificaciones
            </h3>
            <p className="text-text-muted text-sm max-w-sm">
              Cuando tengas nuevas notificaciones, aparecerán aquí.
            </p>
          </Card>
        ) : (
          notifications.map((notification) => {
            const config = iconConfig[notification.type] || defaultIcon

            return (
              <Card
                key={notification.id}
                className={cn(
                  'p-4 border transition-all cursor-pointer hover:shadow-md',
                  notification.read_at
                    ? 'border-slate-100 bg-white'
                    : 'border-primary/20 bg-primary/5'
                )}
                onClick={() => !notification.read_at && markAsRead(notification.id)}
              >
                <div className="flex items-start gap-4">
                  <div className={cn(
                    'w-10 h-10 rounded-full flex items-center justify-center shrink-0',
                    config.iconBg,
                    config.iconColor
                  )}>
                    <Icon name={config.icon} />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <h3 className={cn(
                        'text-sm',
                        notification.read_at
                          ? 'font-medium text-text-main'
                          : 'font-semibold text-text-main'
                      )}>
                        {notification.title}
                      </h3>
                      <span className="text-xs text-text-muted whitespace-nowrap">
                        {formatDate(notification.created_at)}
                      </span>
                    </div>
                    <p className="text-sm text-text-muted">{notification.message}</p>
                  </div>

                  {!notification.read_at && (
                    <div className="w-2 h-2 rounded-full bg-primary shrink-0 mt-2" />
                  )}
                </div>
              </Card>
            )
          })
        )}
      </div>
    </>
  )
}
