import { HTMLAttributes, forwardRef } from 'react'
import { cn } from '@/lib/utils'

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: 'default' | 'success' | 'warning' | 'danger' | 'info' | 'purple'
}

const Badge = forwardRef<HTMLSpanElement, BadgeProps>(
  ({ className, variant = 'default', ...props }, ref) => {
    const variants = {
      default: 'bg-slate-100 text-slate-600',
      success: 'bg-emerald-50 text-emerald-600 border border-emerald-100',
      warning: 'bg-amber-50 text-amber-600 border border-amber-100',
      danger: 'bg-red-50 text-red-600 border border-red-100',
      info: 'bg-blue-50 text-blue-600 border border-blue-100',
      purple: 'bg-purple-100 text-purple-800',
    }

    return (
      <span
        ref={ref}
        className={cn(
          'inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium',
          variants[variant],
          className
        )}
        {...props}
      />
    )
  }
)

Badge.displayName = 'Badge'

export { Badge }
