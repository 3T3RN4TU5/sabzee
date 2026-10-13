import { initials } from '../lib/profile'

const sizes = {
  xs: 'h-5 w-5 text-[9px]',
  sm: 'h-7 w-7 text-[11px]',
  md: 'h-9 w-9 text-xs',
  lg: 'h-14 w-14 text-lg',
} as const

interface AvatarProps {
  name: string
  color: string
  size?: keyof typeof sizes
  className?: string
}

export function Avatar({ name, color, size = 'md', className = '' }: AvatarProps) {
  return (
    <span
      aria-hidden="true"
      className={`inline-grid shrink-0 place-items-center rounded-full font-semibold text-white shadow-sm select-none ${sizes[size]} ${className}`}
      style={{ backgroundColor: color }}
    >
      {initials(name)}
    </span>
  )
}
