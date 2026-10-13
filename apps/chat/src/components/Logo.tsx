import { useId } from 'react'

export function LogoMark({ className = 'h-9 w-9' }: { className?: string }) {
  const gradientId = useId()
  return (
    <svg viewBox="0 0 64 64" className={className} aria-hidden="true">
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#8b5cf6" />
          <stop offset="1" stopColor="#06b6d4" />
        </linearGradient>
      </defs>
      <rect width="64" height="64" rx="16" fill={`url(#${gradientId})`} />
      <path d="M16 18h32a4 4 0 0 1 4 4v18a4 4 0 0 1-4 4H30l-9 7v-7h-5a4 4 0 0 1-4-4V22a4 4 0 0 1 4-4z" fill="#fff" fillOpacity=".95" />
      <path d="M27 26l-5 5 5 5M37 26l5 5-5 5" fill="none" stroke="#6d28d9" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}
