import Link from 'next/link'
import { Fish, UserPlus, Wind } from 'lucide-react'

type Variant = 'dept' | 'follows-none' | 'follows-empty'

const CONTENT: Record<
  Variant,
  { Icon: typeof Fish; title: (region?: string) => string; body: string; cta?: { href: string; label: string } }
> = {
  dept: {
    Icon: Fish,
    title: (region) => `Sois le premier à poster dans le ${region ?? 'coin'}.`,
    body: 'Une question matos, une alerte spot, un retour de session… lance le fil de ton département.',
  },
  'follows-none': {
    Icon: UserPlus,
    title: () => 'Tu ne suis personne pour l’instant.',
    body: 'Découvre des pêcheurs de ton coin pour remplir ton fil de follows.',
    cta: { href: '/follows', label: 'Trouver des pêcheurs' },
  },
  'follows-empty': {
    Icon: Wind,
    title: () => 'Calme plat.',
    body: 'Tes follows n’ont rien posté ces 7 derniers jours. Reviens plus tard.',
  },
}

export function EmptyFeed({ variant, region }: { variant: Variant; region?: string }) {
  const c = CONTENT[variant]
  const Icon = c.Icon
  return (
    <div className="flex flex-col items-center text-center gap-3 py-12 px-6">
      <div className="flex items-center justify-center w-14 h-14 rounded-full bg-teal-50 text-teal-500">
        <Icon size={26} />
      </div>
      <p className="font-bold text-navy-900 text-[15px]">{c.title(region)}</p>
      <p className="text-[13px] text-ink-500 max-w-xs">{c.body}</p>
      {c.cta && (
        <Link
          href={c.cta.href}
          className="mt-2 inline-flex items-center justify-center min-h-11 px-5 rounded-full bg-teal-500 text-navy-950 text-[14px] font-semibold hover:bg-teal-400 transition-colors"
        >
          {c.cta.label}
        </Link>
      )}
    </div>
  )
}
