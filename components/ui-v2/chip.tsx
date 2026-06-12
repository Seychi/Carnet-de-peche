import type * as React from 'react'
import { cn } from '@/lib/utils'

const VARIANTS = {
  default: 'border-sand-200 bg-sand-100 text-ink-600',
  teal: 'border-teal-500/25 bg-teal-500/10 text-teal-700',
  gold: 'border-gold-500/30 bg-gold-500/10 text-[#A87C20]',
  coral: 'border-coral-500/30 bg-coral-500/10 text-coral-500',
  navy: 'border-navy-900 bg-navy-900 text-white',
} as const

export type ChipVariant = keyof typeof VARIANTS

/**
 * Chip DA v2 (filtres, espèces, badges). `mono` = données chiffrées
 * (« COEF 88 ▲ ») — bascule la signature JetBrains Mono.
 */
export function Chip({
  variant = 'default',
  mono = false,
  className,
  ...props
}: React.ComponentProps<'span'> & { variant?: ChipVariant; mono?: boolean }) {
  return (
    <span
      data-slot="chip"
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border px-3 py-1',
        mono
          ? 'font-mono text-[12px] font-medium tracking-[0.04em]'
          : 'text-[13px] font-semibold',
        VARIANTS[variant],
        className,
      )}
      {...props}
    />
  )
}
