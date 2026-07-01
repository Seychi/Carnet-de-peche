import type * as React from 'react'
import { cn } from '@/lib/utils'

const VARIANTS = {
  // a11y : ink-500 (4.94:1 sur sand-50) et teal-700 (5.16:1) — les anciens
  // ink-400/teal-600 passaient sous les 4.5:1 WCAG AA en petit corps.
  default: 'text-ink-500',
  teal: 'text-teal-700',
  gold: 'text-gold-500',
  coral: 'text-coral-500',
  'on-dark': 'text-teal-300',
} as const

export type TagDataVariant = keyof typeof VARIANTS

/**
 * Étiquette mono — LA signature DA v2 (« COEF 88 », « PM 06:42 », coords GPS).
 * Règle de la charte : tout chiffre métier passe en mono.
 */
export function TagData({
  variant = 'default',
  className,
  ...props
}: React.ComponentProps<'span'> & { variant?: TagDataVariant }) {
  return (
    <span
      data-slot="tag-data"
      className={cn(
        'font-mono text-xs font-medium uppercase tracking-[0.08em]',
        VARIANTS[variant],
        className,
      )}
      {...props}
    />
  )
}
