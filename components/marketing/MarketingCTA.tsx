import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import { Bathy } from '@/components/ui-v2/bathy'
import { buttonVariants } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { REGISTER_CTA_LABEL } from '@/lib/marketing/cta'

/**
 * Bande de conversion DA v2 — fond navy-950 + isobathes décoratives.
 * Server Component (pas d'interactivité). À poser AVANT le footer sur les
 * pages marketing (guides, especes, techniques).
 *
 * Libellé CTA unifié : « Créer mon carnet, c'est gratuit » → /auth/register.
 * Pas de promesse au-delà du gratuit réel (carnet illimité, fil, guides).
 * Libellé centralisé dans lib/marketing/cta.ts (REGISTER_CTA_LABEL) : Hero /
 * HomeSections pointent dessus pour ne jamais réintroduire le tiret cadratin
 * (tic IA). Sprint 56.
 */
export function MarketingCTA({
  title = 'Logue tes prises, progresse à chaque sortie',
  subtitle = 'Un carnet de pêche numérique pour suivre tes sessions, analyser tes patterns et partager avec la communauté. Gratuit, illimité.',
}: {
  title?: string
  subtitle?: string
}) {
  return (
    <section className="relative overflow-hidden bg-navy-950 py-16">
      <Bathy opacity={0.3} />
      <div className="relative mx-auto max-w-[680px] px-6 text-center">
        <h2 className="font-display text-2xl text-white sm:text-3xl">{title}</h2>
        <p className="mx-auto mt-4 max-w-lg text-base leading-relaxed text-white/60">
          {subtitle}
        </p>
        <Link
          href="/auth/register"
          className={cn(buttonVariants({ variant: 'accent', size: 'cta' }), 'mt-7')}
        >
          {REGISTER_CTA_LABEL}
          <ArrowRight size={17} aria-hidden="true" />
        </Link>
      </div>
    </section>
  )
}
