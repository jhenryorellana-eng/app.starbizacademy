'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { Button, Icon } from '@/components/ui'

export function LogoutButton() {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)

  const handleLogout = async () => {
    setIsLoading(true)
    try {
      await fetch('/api/auth/logout', {
        method: 'POST',
      })
      router.push('/login')
      router.refresh()
    } catch {
      setIsLoading(false)
    }
  }

  return (
    <Button variant="secondary" onClick={handleLogout} isLoading={isLoading}>
      <Icon name="logout" size="sm" />
      Cerrar Sesión
    </Button>
  )
}
