import { cn } from '@/lib/utils'

interface AvatarProps {
  src?: string | null
  alt?: string
  initials?: string
  size?: 'sm' | 'md' | 'lg' | 'xl'
  className?: string
}

const Avatar = ({ src, alt, initials, size = 'md', className }: AvatarProps) => {
  const sizes = {
    sm: 'w-8 h-8 text-xs',
    md: 'w-10 h-10 text-sm',
    lg: 'w-14 h-14 text-base',
    xl: 'w-24 h-24 text-xl',
  }

  if (src) {
    return (
      <div
        className={cn(
          'rounded-full bg-center bg-no-repeat bg-cover',
          sizes[size],
          className
        )}
        style={{ backgroundImage: `url(${src})` }}
        role="img"
        aria-label={alt}
      />
    )
  }

  return (
    <div
      className={cn(
        'rounded-full bg-gradient-to-br from-primary to-indigo-500 flex items-center justify-center text-white font-bold',
        sizes[size],
        className
      )}
    >
      {initials || '?'}
    </div>
  )
}

export { Avatar }
