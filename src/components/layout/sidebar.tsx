'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import { Icon } from '@/components/ui'

interface NavItem {
  href: string
  label: string
  icon: string
}

const navItems: NavItem[] = [
  { href: '/inicio', label: 'Inicio', icon: 'home' },
  { href: '/familia', label: 'Mi Familia', icon: 'group' },
  { href: '/membresia', label: 'Membresía', icon: 'credit_card' },
  { href: '/apps', label: 'Apps', icon: 'apps' },
  { href: '/configuracion', label: 'Configuración', icon: 'settings' },
]

interface SidebarProps {
  user?: {
    firstName: string
    lastName: string
    email: string
  }
  onLogout?: () => void
}

export function Sidebar({ user, onLogout }: SidebarProps) {
  const pathname = usePathname()

  const initials = user
    ? `${user.firstName[0]}${user.lastName[0]}`.toUpperCase()
    : 'US'

  return (
    <aside className="w-64 bg-white flex-shrink-0 flex flex-col justify-between h-full border-r border-slate-200 shadow-sm z-20">
      <div className="p-6 flex flex-col gap-8">
        {/* Brand */}
        <div className="flex items-center gap-3">
          <div className="bg-primary/10 p-2 rounded-lg border border-primary/20">
            <Icon name="school" className="text-primary text-2xl" />
          </div>
          <div className="flex flex-col">
            <h1 className="text-slate-900 text-base font-bold leading-none tracking-tight">
              Starbiz Academy
            </h1>
            <p className="text-slate-500 text-xs font-normal mt-1">Ecosistema Hub</p>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex flex-col gap-2">
          {navItems.map((item) => {
            const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`)

            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'group flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors',
                  isActive
                    ? 'bg-primary/10 border border-primary/20'
                    : 'hover:bg-slate-50'
                )}
              >
                <Icon
                  name={item.icon}
                  className={cn(
                    'transition-colors',
                    isActive
                      ? 'text-primary'
                      : 'text-slate-500 group-hover:text-slate-700'
                  )}
                />
                <p
                  className={cn(
                    'text-sm font-medium transition-colors',
                    isActive
                      ? 'text-primary'
                      : 'text-slate-600 group-hover:text-slate-900'
                  )}
                >
                  {item.label}
                </p>
              </Link>
            )
          })}
        </nav>
      </div>

      {/* User Profile Bottom */}
      <div className="p-4 border-t border-slate-200 bg-slate-50/50">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-indigo-500 flex items-center justify-center text-white font-bold text-sm shadow-md">
            {initials}
          </div>
          <div className="flex flex-col overflow-hidden">
            <p className="text-slate-900 text-sm font-medium truncate">
              {user ? `${user.firstName} ${user.lastName}` : 'Usuario'}
            </p>
            <p className="text-slate-500 text-xs truncate">
              {user?.email || 'usuario@email.com'}
            </p>
          </div>
          <button
            onClick={onLogout}
            className="ml-auto text-slate-400 hover:text-slate-600 transition-colors"
            title="Cerrar sesión"
          >
            <Icon name="logout" className="text-xl" />
          </button>
        </div>
      </div>
    </aside>
  )
}
