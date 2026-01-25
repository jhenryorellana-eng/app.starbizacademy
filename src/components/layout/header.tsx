'use client'

import Link from 'next/link'
import { Icon, Button } from '@/components/ui'

interface HeaderProps {
  title: string
  subtitle?: string
  notificationCount?: number
}

export function Header({ title, subtitle, notificationCount = 0 }: HeaderProps) {
  return (
    <header className="flex flex-wrap justify-between items-end gap-4">
      <div className="flex flex-col gap-1">
        <h2 className="text-slate-900 tracking-tight text-3xl font-bold">
          {title}
        </h2>
        {subtitle && (
          <p className="text-slate-500 text-sm font-medium">{subtitle}</p>
        )}
      </div>
      <div className="flex items-center gap-3">
        <Link href="/notificaciones">
          <button className="w-10 h-10 rounded-full bg-white border border-slate-200 flex items-center justify-center text-slate-500 hover:text-primary hover:border-primary/30 transition-all shadow-sm relative">
            <Icon name="notifications" />
            {notificationCount > 0 && (
              <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs font-bold rounded-full flex items-center justify-center">
                {notificationCount > 9 ? '9+' : notificationCount}
              </span>
            )}
          </button>
        </Link>
        <a
          href="https://wa.me/18019413479"
          target="_blank"
          rel="noopener noreferrer"
        >
          <Button variant="secondary" size="md">
            <Icon name="help" className="text-lg" />
            <span>Ayuda</span>
          </Button>
        </a>
      </div>
    </header>
  )
}
