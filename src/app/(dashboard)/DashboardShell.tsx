'use client'

import { ReactNode } from 'react'
import { useRouter } from 'next/navigation'
import { Sidebar, MobileNav } from '@/components/layout'
import { LoginSessionTracker } from './components/login-session-tracker'

type User = {
  firstName: string
  lastName: string
  email: string
}

export function DashboardShell({ user, children }: { user: User; children: ReactNode }) {
  const router = useRouter()

  const handleLogout = async () => {
    const response = await fetch('/api/auth/logout', { method: 'POST' })
    if (response.ok) {
      router.push('/login')
    }
  }

  return (
    <div className="h-screen overflow-hidden flex flex-col md:flex-row bg-background-page">
      {/* Login Session Tracker - records session on first load */}
      <LoginSessionTracker />

      {/* Desktop Sidebar */}
      <div className="hidden md:block">
        <Sidebar user={user} onLogout={handleLogout} />
      </div>

      {/* Mobile Navigation */}
      <MobileNav user={user} onLogout={handleLogout} />

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto bg-background-page relative">
        <div className="max-w-[1200px] mx-auto p-4 md:p-8 flex flex-col gap-8">
          {children}
        </div>
      </main>
    </div>
  )
}
