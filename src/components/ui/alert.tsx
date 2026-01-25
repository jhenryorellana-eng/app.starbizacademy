import { ReactNode } from 'react'
import { cn } from '@/lib/utils'

interface AlertProps {
  variant?: 'info' | 'success' | 'warning' | 'error'
  title?: string
  children: ReactNode
  className?: string
}

const Alert = ({ variant = 'info', title, children, className }: AlertProps) => {
  const variants = {
    info: {
      container: 'bg-white border-l-4 border-primary',
      icon: 'text-primary bg-primary/10',
      iconName: 'info',
    },
    success: {
      container: 'bg-white border-l-4 border-emerald-500',
      icon: 'text-emerald-500 bg-emerald-50',
      iconName: 'check_circle',
    },
    warning: {
      container: 'bg-white border-l-4 border-amber-500',
      icon: 'text-amber-500 bg-amber-50',
      iconName: 'warning',
    },
    error: {
      container: 'bg-white border-l-4 border-red-500',
      icon: 'text-red-500 bg-red-50',
      iconName: 'error',
    },
  }

  const config = variants[variant]

  return (
    <div
      className={cn(
        config.container,
        'rounded-r-lg shadow-sm p-5 flex items-start gap-4',
        className
      )}
    >
      <div className={cn(config.icon, 'p-2 rounded-full shrink-0')}>
        <span className="material-symbols-outlined filled">{config.iconName}</span>
      </div>
      <div>
        {title && (
          <h3 className="text-text-main font-bold text-base mb-1">{title}</h3>
        )}
        <div className="text-text-muted text-sm leading-relaxed">{children}</div>
      </div>
    </div>
  )
}

export { Alert }
