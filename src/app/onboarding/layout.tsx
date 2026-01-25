import { ReactNode } from 'react'
import { Icon } from '@/components/ui'

export default function OnboardingLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-gradient-to-b from-[#F8F7FC] to-[#F0EEF8]">
      {/* Header */}
      <header className="border-b border-slate-100 bg-white/80 backdrop-blur-sm">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center gap-3">
          <div className="bg-primary/20 p-2 rounded-lg">
            <Icon name="school" className="text-primary text-xl" />
          </div>
          <div>
            <h1 className="text-base font-bold text-text-main">Starbiz Academy</h1>
            <p className="text-xs text-text-muted">Configuración de cuenta</p>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="max-w-5xl mx-auto px-6 py-12">
        {children}
      </main>
    </div>
  )
}
