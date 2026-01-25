import { ReactNode } from 'react'
import { redirect } from 'next/navigation'
import { getProfile } from '@/lib/auth/actions'
import { DashboardShell } from './DashboardShell'

export default async function DashboardLayout({ children }: { children: ReactNode }) {
  const profile = await getProfile()

  if (!profile) {
    redirect('/login')
  }

  const user = {
    firstName: profile.first_name,
    lastName: profile.last_name,
    email: profile.email,
  }

  return <DashboardShell user={user}>{children}</DashboardShell>
}
