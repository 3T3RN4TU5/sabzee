import { forwardRef, type ButtonHTMLAttributes, type ComponentType, type ReactNode } from 'react'
import { cn } from './cn.ts'

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'subtle'
export type ButtonSize = 'xs' | 'sm' | 'md'

const VARIANTS: Record<ButtonVariant, string> = {
  primary: 'bg-indigo-600 text-white shadow-sm shadow-indigo-600/25 hover:bg-indigo-500 active:bg-indigo-700 disabled:bg-indigo-400 dark:disabled:bg-indigo-800',
  secondary:
    'bg-white text-slate-700 ring-1 ring-slate-200 shadow-xs hover:bg-slate-50 hover:text-slate-900 dark:bg-slate-800 dark:text-slate-200 dark:ring-slate-700 dark:hover:bg-slate-700 dark:hover:text-white',
  ghost: 'text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white',
  subtle: 'bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700',
  danger: 'bg-rose-600 text-white shadow-sm hover:bg-rose-500 active:bg-rose-700',
}

const SIZES: Record<ButtonSize, string> = {
  xs: 'h-7 gap-1 rounded-md px-2 text-xs',
  sm: 'h-8 gap-1.5 rounded-lg px-2.5 text-sm',
  md: 'h-10 gap-2 rounded-xl px-4 text-sm',
}

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant
  size?: ButtonSize
  icon?: ComponentType<{ className?: string; 'aria-hidden'?: boolean }>
  iconRight?: ComponentType<{ className?: string; 'aria-hidden'?: boolean }>
  children?: ReactNode
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button({ variant = 'secondary', size = 'sm', icon: Icon, iconRight: IconRight, className, children, type = 'button', ...rest }, ref) {
  return (
    <button
      ref={ref}
      type={type}
      className={cn(
        'inline-flex shrink-0 items-center justify-center font-semibold whitespace-nowrap transition-colors select-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-500 disabled:cursor-not-allowed disabled:opacity-60',
        VARIANTS[variant],
        SIZES[size],
        className,
      )}
      {...rest}
    >
      {Icon && <Icon className={size === 'xs' ? 'size-3.5' : 'size-4'} aria-hidden />}
      {children}
      {IconRight && <IconRight className={size === 'xs' ? 'size-3.5' : 'size-4'} aria-hidden />}
    </button>
  )
})

export interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  icon: ComponentType<{ className?: string; 'aria-hidden'?: boolean }>
  /** Accessible label (also shown as tooltip). */
  label: string
  variant?: ButtonVariant
  size?: ButtonSize
}

export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(function IconButton({ icon: Icon, label, variant = 'ghost', size = 'sm', className, type = 'button', ...rest }, ref) {
  const box = size === 'xs' ? 'size-7 rounded-md' : size === 'sm' ? 'size-8 rounded-lg' : 'size-10 rounded-xl'
  return (
    <button
      ref={ref}
      type={type}
      aria-label={label}
      title={label}
      className={cn(
        'inline-flex shrink-0 items-center justify-center transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-500 disabled:cursor-not-allowed disabled:opacity-40',
        VARIANTS[variant],
        box,
        className,
      )}
      {...rest}
    >
      <Icon className={size === 'md' ? 'size-5' : 'size-4'} aria-hidden />
    </button>
  )
})
