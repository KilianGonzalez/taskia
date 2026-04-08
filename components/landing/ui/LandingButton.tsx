'use client'

import { ButtonHTMLAttributes, ReactNode, forwardRef } from 'react'
import { Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'

interface LandingButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost'
  size?: 'sm' | 'md' | 'lg'
  isLoading?: boolean
  isSuccess?: boolean
  children: ReactNode
}

export const LandingButton = forwardRef<HTMLButtonElement, LandingButtonProps>(
  (
    {
      variant = 'primary',
      size = 'md',
      isLoading = false,
      isSuccess = false,
      className,
      children,
      disabled,
      ...props
    },
    ref
  ) => {
    const baseStyles =
      'inline-flex items-center justify-center gap-2 rounded-2xl font-medium transition-all duration-200 ease-out disabled:opacity-50 disabled:cursor-not-allowed'

    const variantStyles = {
      primary:
        'bg-[#1D2155] text-white hover:shadow-[0_0_20px_rgba(78,196,169,0.25)] hover:-translate-y-0.5 active:translate-y-0',
      secondary:
        'bg-[#20589A] text-white hover:shadow-[0_0_20px_rgba(32,88,154,0.25)] hover:-translate-y-0.5 active:translate-y-0',
      outline:
        'border-2 border-slate-200 bg-white/70 text-[#1D2155] hover:bg-white hover:border-[#20589A]/30 hover:-translate-y-0.5 active:translate-y-0',
      ghost:
        'bg-transparent text-[#1D2155] hover:bg-slate-100 hover:-translate-y-0.5 active:translate-y-0',
    }

    const sizeStyles = {
      sm: 'px-3 py-1.5 text-sm',
      md: 'px-5 py-2.5 text-sm',
      lg: 'px-6 py-3.5 text-base',
    }

    return (
      <button
        ref={ref}
        className={cn(baseStyles, variantStyles[variant], sizeStyles[size], className)}
        disabled={disabled || isLoading}
        {...props}
      >
        {isLoading ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            <span>Cargando...</span>
          </>
        ) : isSuccess ? (
          <>
            <span>✓</span>
            {children}
          </>
        ) : (
          children
        )}
      </button>
    )
  }
)

LandingButton.displayName = 'LandingButton'