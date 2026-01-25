'use client'

import { forwardRef, InputHTMLAttributes, useState } from 'react'
import { cn } from '@/lib/utils'

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
  icon?: string
  showPasswordToggle?: boolean
}

const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, error, icon, showPasswordToggle, type = 'text', ...props }, ref) => {
    const [showPassword, setShowPassword] = useState(false)

    const inputType = showPasswordToggle
      ? (showPassword ? 'text' : 'password')
      : type

    const hasRightIcon = icon || showPasswordToggle

    return (
      <div className="flex flex-col gap-2">
        {label && (
          <label className="text-slate-900 text-sm font-medium leading-normal">
            {label}
          </label>
        )}
        <div className="relative">
          <input
            ref={ref}
            type={inputType}
            className={cn(
              'flex w-full min-w-0 resize-none overflow-hidden rounded-lg text-slate-900',
              'border border-input-border bg-white',
              'focus:border-primary focus:ring-1 focus:ring-primary',
              'h-12 px-4 text-base font-normal leading-normal',
              'placeholder:text-slate-400 transition-colors',
              hasRightIcon && 'pr-10',
              error && 'border-red-500 focus:border-red-500 focus:ring-red-500',
              className
            )}
            {...props}
          />
          {showPasswordToggle ? (
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 transition-colors"
            >
              <span className="material-symbols-outlined text-[20px]">
                {showPassword ? 'visibility' : 'visibility_off'}
              </span>
            </button>
          ) : icon ? (
            <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none text-slate-400">
              <span className="material-symbols-outlined text-[20px]">{icon}</span>
            </div>
          ) : null}
        </div>
        {error && (
          <p className="text-red-500 text-sm">{error}</p>
        )}
      </div>
    )
  }
)

Input.displayName = 'Input'

export { Input }
