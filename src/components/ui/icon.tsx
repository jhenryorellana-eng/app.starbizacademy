import { cn } from '@/lib/utils'

interface IconProps {
  name: string
  className?: string
  filled?: boolean
  size?: 'sm' | 'md' | 'lg' | 'xl'
}

const Icon = ({ name, className, filled = false, size = 'md' }: IconProps) => {
  const sizes = {
    sm: 'text-[18px]',
    md: 'text-[24px]',
    lg: 'text-[28px]',
    xl: 'text-[32px]',
  }

  return (
    <span
      className={cn(
        'material-symbols-outlined',
        filled && 'filled',
        sizes[size],
        className
      )}
      style={filled ? { fontVariationSettings: "'FILL' 1, 'wght' 400, 'GRAD' 0, 'opsz' 24" } : undefined}
    >
      {name}
    </span>
  )
}

export { Icon }
