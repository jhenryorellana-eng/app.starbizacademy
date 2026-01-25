'use client'

import { useState } from 'react'
import { Icon } from '@/components/ui'

interface CopyCodeButtonProps {
  code: string
}

export function CopyCodeButton({ code }: CopyCodeButtonProps) {
  const [copied, setCopied] = useState(false)

  const handleCopy = async () => {
    await navigator.clipboard.writeText(code)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <button
      onClick={handleCopy}
      className={`p-2 transition-all duration-200 rounded-md active:scale-95
        ${copied
          ? 'text-emerald-500 bg-emerald-50'
          : 'text-slate-400 hover:text-primary hover:bg-white'}`}
      title={copied ? '¡Copiado!' : 'Copiar código'}
    >
      <Icon name={copied ? 'check' : 'content_copy'} size="sm" />
    </button>
  )
}
