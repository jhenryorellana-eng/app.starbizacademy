'use client'

import { Fragment, ReactNode } from 'react'
import { cn } from '@/lib/utils'

interface ModalProps {
  isOpen: boolean
  onClose: () => void
  children: ReactNode
  className?: string
  size?: 'sm' | 'md' | 'lg' | 'xl'
}

const Modal = ({ isOpen, onClose, children, className, size = 'md' }: ModalProps) => {
  if (!isOpen) return null

  const sizes = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-xl',
  }

  return (
    <Fragment>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 z-40 transition-opacity"
        onClick={onClose}
      />
      {/* Modal */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div
          className={cn(
            'w-full bg-white rounded-xl shadow-xl overflow-hidden',
            sizes[size],
            className
          )}
          onClick={(e) => e.stopPropagation()}
        >
          {children}
        </div>
      </div>
    </Fragment>
  )
}

const ModalHeader = ({ children, onClose, className }: { children: ReactNode; onClose?: () => void; className?: string }) => {
  return (
    <div className={cn('flex items-center justify-between p-6 border-b border-slate-100', className)}>
      <div className="text-lg font-bold text-slate-900">{children}</div>
      {onClose && (
        <button
          onClick={onClose}
          className="text-slate-400 hover:text-slate-600 transition-colors"
        >
          <span className="material-symbols-outlined">close</span>
        </button>
      )}
    </div>
  )
}

const ModalBody = ({ children, className }: { children: ReactNode; className?: string }) => {
  return <div className={cn('p-6', className)}>{children}</div>
}

const ModalFooter = ({ children, className }: { children: ReactNode; className?: string }) => {
  return (
    <div className={cn('flex items-center justify-end gap-3 p-6 pt-0', className)}>
      {children}
    </div>
  )
}

export { Modal, ModalHeader, ModalBody, ModalFooter }
