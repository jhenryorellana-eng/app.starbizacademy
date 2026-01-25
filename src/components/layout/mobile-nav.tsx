'use client'

import { useState } from 'react'
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

interface MobileNavProps {
  user?: {
    firstName: string
    lastName: string
    email: string
  }
  onLogout?: () => void
}

export function MobileNav({ user, onLogout }: MobileNavProps) {
  const [isOpen, setIsOpen] = useState(false)
  const pathname = usePathname()

  const initials = user
    ? `${user.firstName[0]}${user.lastName[0]}`.toUpperCase()
    : 'US'

  return (
    <>
      {/* Mobile Header */}
      <div className="md:hidden h-16 bg-white border-b border-input-border flex items-center px-4 justify-between shrink-0">
        <div className="flex items-center gap-3">
          <div className="bg-primary/20 p-1.5 rounded-lg">
            <Icon name="school" className="text-primary text-xl" />
          </div>
          <span className="font-bold text-base">Starbiz Academy</span>
        </div>
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="p-2 text-text-main"
        >
          <Icon name={isOpen ? 'close' : 'menu'} />
        </button>
      </div>

      {/* Mobile Menu Overlay - Always rendered, controlled by opacity */}
      <div
        className={cn(
          'md:hidden fixed inset-0 bg-black/50 z-40 transition-opacity duration-300',
          isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
        )}
        onClick={() => setIsOpen(false)}
      />

      {/* Mobile Menu Panel - Always rendered, controlled by transform */}
      <div
        className={cn(
          'md:hidden fixed top-16 right-0 bottom-0 w-64 bg-white z-50 shadow-xl flex flex-col transform transition-transform duration-300 ease-out',
          isOpen ? 'translate-x-0' : 'translate-x-full'
        )}
      >
        <nav className="flex-1 p-4 space-y-1">
          {navItems.map((item) => {
            const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`)

            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setIsOpen(false)}
                className={cn(
                  'flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors',
                  isActive
                    ? 'bg-primary/10 text-primary'
                    : 'text-text-main hover:bg-slate-50'
                )}
              >
                <Icon
                  name={item.icon}
                  className={cn(
                    isActive ? 'text-primary' : 'text-text-muted'
                  )}
                />
                <span
                  className={cn(
                    'text-sm font-medium',
                    isActive && 'font-semibold'
                  )}
                >
                  {item.label}
                </span>
              </Link>
            )
          })}
        </nav>

        {/* User Section */}
        <div className="p-4 border-t border-input-border">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-indigo-500 flex items-center justify-center text-white font-bold text-sm">
              {initials}
            </div>
            <div className="flex flex-col overflow-hidden">
              <p className="text-sm font-medium truncate">
                {user ? `${user.firstName} ${user.lastName}` : 'Usuario'}
              </p>
              <p className="text-xs text-text-muted truncate">
                {user?.email || 'usuario@email.com'}
              </p>
            </div>
          </div>
          <button
            onClick={() => {
              setIsOpen(false)
              onLogout?.()
            }}
            className="w-full flex items-center justify-center gap-2 rounded-lg h-10 px-4 bg-slate-100 hover:bg-slate-200 text-text-main text-sm font-medium transition-colors"
          >
            <Icon name="logout" className="text-[18px]" />
            <span>Cerrar sesión</span>
          </button>
        </div>
      </div>
    </>
  )
}
