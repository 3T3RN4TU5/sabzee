import { categoryById } from '../lib/model'

export function Card({ className = '', children }: { className?: string; children: React.ReactNode }) {
  return <section className={`rounded-2xl border border-slate-200/70 bg-white shadow-sm ${className}`}>{children}</section>
}

export function CategoryIcon({ id, size = 'md' }: { id: string; size?: 'md' | 'lg' }) {
  const c = categoryById(id)
  return (
    <span
      className={`grid shrink-0 place-items-center rounded-xl ${size === 'lg' ? 'h-12 w-12 text-2xl' : 'h-10 w-10 text-lg'}`}
      style={{ backgroundColor: `${c.color}1f` }}
      aria-hidden
    >
      {c.emoji}
    </span>
  )
}
