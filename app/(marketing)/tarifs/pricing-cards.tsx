'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Check } from 'lucide-react'
import { Bathy } from '@/components/ui-v2/bathy'
import { TagData } from '@/components/ui-v2/tag-data'
import { Chip } from '@/components/ui-v2/chip'
import { buttonVariants } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import type { UserTier } from '@/lib/auth/tier'

type PaidPlan = 'local' | 'itinerant'
type Interval = 'monthly' | 'annual'

const plans = {
  decouverte: {
    name: 'Découverte',
    description: "Tout ce qu'il faut pour loguer et progresser.",
    monthly: 0,
    annual: 0,
    annualTotal: 0,
    features: [
      { text: 'Carnet de pêche illimité avec photos', strong: true },
      { text: '3 spots populaires par département (coords floutées de plusieurs centaines de mètres)' },
      { text: 'Marées + météo pour ta ville' },
      { text: 'Tous les guides éditoriaux' },
      { text: 'Fil régional complet : poste, commente, like, suis' },
      { text: 'Apps iOS / Android en préparation' },
    ],
  },
  local: {
    name: 'Local',
    description: 'Ton département, au mètre et à la minute près.',
    monthly: 4.9,
    annual: 4.08,
    annualTotal: 49,
    badge: 'Le plus populaire',
    features: [
      { text: 'Carte complète de ton département', strong: true },
      { text: 'Coordonnées GPS précises de tous les spots' },
      { text: "Score d'activité 0-100 par spot" },
      { text: 'Filtres espèces, techniques, marées' },
      { text: 'Notifications likes, commentaires, follows' },
      { text: 'Photos HD illimitées' },
    ],
  },
  itinerant: {
    name: 'Itinérant',
    description: 'Toute la côte, pour ceux qui bougent.',
    monthly: 9.9,
    annual: 8.25,
    annualTotal: 99,
    features: [
      { text: 'Tous les départements côtiers FR', strong: true },
      { text: 'Tout ce qui est dans Local · partout' },
      { text: 'Bathymétrie détaillée (EMODnet)' },
      { text: 'Itinéraire GPS vers chaque spot' },
      { text: 'Stats inter-départements' },
      { text: 'Accès anticipé nouvelles fonctionnalités' },
      { text: 'Support prioritaire' },
    ],
  },
}

function formatPrice(price: number) {
  return price.toFixed(2).replace('.', ',')
}

// Chip rappelant les conditions de l'essai, sous chaque CTA payant.
function TrialBadge({ onDark = false }: { onDark?: boolean }) {
  return (
    <p
      className={`mt-3 w-full text-center font-mono text-[10.5px] font-medium uppercase tracking-[0.08em] ${
        onDark ? 'text-white/60' : 'text-ink-500'
      }`}
    >
      Essai 7 j avec CB · Satisfait ou remboursé
    </p>
  )
}

// CTA d'un plan payant. Rendu selon l'état serveur (tier + éligibilité géo).
function PlanCta({
  plan,
  interval,
  tier,
  eligible,
  buttonClass,
  onDark = false,
}: {
  plan: PaidPlan
  interval: Interval
  tier: UserTier
  eligible: boolean
  buttonClass: string
  onDark?: boolean
}) {
  // Déjà abonné (peu importe le plan) → gérer l'abonnement
  if (tier === 'local' || tier === 'itinerant') {
    return (
      <Link href="/compte/abonnement" className={buttonClass}>
        Gérer mon abonnement
      </Link>
    )
  }

  // Non connecté → inscription, on garde plan + interval pour reprendre après login
  if (tier === 'anonymous') {
    return (
      <>
        <Link
          href={`/auth/register?next=/tarifs&plan=${plan}&interval=${interval}`}
          className={buttonClass}
        >
          Essayer 7 jours
        </Link>
        <TrialBadge onDark={onDark} />
      </>
    )
  }

  // Connecté mais hors zone (DOM-TOM) → encart, pas d'accès Checkout
  if (!eligible) {
    return (
      <div className="bg-sand-100 border border-sand-200 text-ink-600 text-sm rounded-[14px] p-3 text-center">
        Outre-mer pas encore couvert.{' '}
        <Link href="/contact" className="underline font-medium text-navy-900">
          Préviens-nous
        </Link>
        .
      </div>
    )
  }

  // Connecté, éligible, pas encore abonné → POST classique vers Checkout (303 → Stripe)
  return (
    <>
      <form action="/api/stripe/checkout" method="POST">
        <input type="hidden" name="plan" value={plan} />
        <input type="hidden" name="interval" value={interval} />
        <button type="submit" className={`${buttonClass} w-full`}>
          Essayer 7 jours
        </button>
      </form>
      <TrialBadge onDark={onDark} />
    </>
  )
}

export function PricingCards({
  tier = 'anonymous',
  eligible = true,
}: {
  tier?: UserTier
  eligible?: boolean
}) {
  const [annual, setAnnual] = useState(false)
  const interval: Interval = annual ? 'annual' : 'monthly'

  return (
    <>
      {/* Toggle mensuel / annuel */}
      <div className="flex justify-center mt-8 mb-10">
        <div className="inline-flex items-center rounded-full border border-sand-200 bg-white p-1 gap-0.5">
          <button
            onClick={() => setAnnual(false)}
            className={`min-h-[44px] px-5 rounded-full text-sm font-medium transition-colors duration-150 ${
              !annual ? 'bg-navy-900 text-white' : 'text-ink-600 hover:text-navy-900'
            }`}
          >
            Mensuel
          </button>
          <button
            onClick={() => setAnnual(true)}
            className={`min-h-[44px] px-5 rounded-full text-sm font-medium transition-colors duration-150 flex items-center gap-2 ${
              annual ? 'bg-navy-900 text-white' : 'text-ink-600 hover:text-navy-900'
            }`}
          >
            Annuel
            <span
              className={`font-mono text-[11px] font-medium tracking-[0.04em] ${
                annual ? 'text-teal-300' : 'text-teal-700'
              }`}
            >
              −17%
            </span>
          </button>
        </div>
      </div>

      {/* Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5 lg:gap-6 items-stretch">

        {/* Découverte */}
        <div className="bg-white border border-sand-200 rounded-[22px] p-7 sm:p-8 flex flex-col transition-[transform,box-shadow] duration-200 ease-out will-change-transform hover:-translate-y-1 hover:scale-[1.01] hover:shadow-lg motion-reduce:transform-none motion-reduce:transition-none motion-reduce:hover:shadow-none">
          <TagData>{plans.decouverte.name}</TagData>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="font-mono text-[40px] font-semibold leading-none text-navy-900">
              0 €
            </span>
            <span className="text-sm text-ink-500">/ pour toujours</span>
          </div>
          <p className="mt-3 text-sm text-ink-600 leading-relaxed">
            {plans.decouverte.description}
          </p>
          <ul className="mt-6 mb-8 flex flex-col gap-3 flex-1">
            {plans.decouverte.features.map((f) => (
              <li key={f.text} className="flex items-start gap-2.5 text-sm">
                <Check size={16} strokeWidth={1.7} className="text-teal-600 mt-0.5 shrink-0" />
                <span className={f.strong ? 'font-semibold text-navy-900' : 'text-ink-600'}>
                  {f.text}
                </span>
              </li>
            ))}
          </ul>
          <div className="mt-auto">
            <Link
              href="/auth/login"
              className={cn(buttonVariants({ variant: 'line', size: 'cta' }), 'w-full')}
            >
              Créer mon carnet
            </Link>
          </div>
        </div>

        {/* Local — featured, navy-950 + isobathes */}
        <div className="relative overflow-hidden bg-navy-950 rounded-[22px] p-7 sm:p-8 flex flex-col transition-[transform,box-shadow] duration-200 ease-out will-change-transform hover:-translate-y-1 hover:scale-[1.01] hover:shadow-lg motion-reduce:transform-none motion-reduce:transition-none motion-reduce:hover:shadow-none">
          <Bathy opacity={0.3} />
          <div className="relative flex flex-col flex-1">
            <div className="flex items-center justify-between gap-3">
              <TagData variant="on-dark">{plans.local.name}</TagData>
              <Chip
                variant="gold"
                mono
                className="uppercase border-gold-500/40 bg-gold-500/15 text-gold-500"
              >
                {plans.local.badge}
              </Chip>
            </div>
            <div className="mt-3 flex items-baseline gap-2">
              <span className="font-mono text-[40px] font-semibold leading-none text-white">
                {annual ? formatPrice(plans.local.annual) : formatPrice(plans.local.monthly)} €
              </span>
              <span className="text-sm text-white/50">/ mois</span>
            </div>
            {annual && (
              <p className="mt-2 font-mono text-xs text-teal-300">
                Soit {plans.local.annualTotal} €/an · tu économises {formatPrice(plans.local.monthly * 12 - plans.local.annualTotal)} €
              </p>
            )}
            <p className="mt-3 text-sm text-white/60 leading-relaxed">
              {plans.local.description}
            </p>
            <ul className="mt-6 mb-8 flex flex-col gap-3 flex-1">
              {plans.local.features.map((f) => (
                <li key={f.text} className="flex items-start gap-2.5 text-sm">
                  <Check size={16} strokeWidth={1.7} className="text-teal-300 mt-0.5 shrink-0" />
                  <span className={f.strong ? 'font-semibold text-white' : 'text-white/80'}>
                    {f.text}
                  </span>
                </li>
              ))}
            </ul>
            <div className="mt-auto">
              <PlanCta
                plan="local"
                interval={interval}
                tier={tier}
                eligible={eligible}
                onDark
                buttonClass={cn(buttonVariants({ variant: 'accent', size: 'cta' }), 'w-full')}
              />
            </div>
          </div>
        </div>

        {/* Itinérant */}
        <div className="bg-gradient-to-b from-white to-sand-100 border border-sand-200 rounded-[22px] p-7 sm:p-8 flex flex-col transition-[transform,box-shadow] duration-200 ease-out will-change-transform hover:-translate-y-1 hover:scale-[1.01] hover:shadow-lg motion-reduce:transform-none motion-reduce:transition-none motion-reduce:hover:shadow-none">
          <TagData variant="teal">{plans.itinerant.name}</TagData>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="font-mono text-[40px] font-semibold leading-none text-navy-900">
              {annual ? formatPrice(plans.itinerant.annual) : formatPrice(plans.itinerant.monthly)} €
            </span>
            <span className="text-sm text-ink-500">/ mois</span>
          </div>
          {annual && (
            <p className="mt-2 font-mono text-xs text-teal-700">
              Soit {plans.itinerant.annualTotal} €/an · tu économises {formatPrice(plans.itinerant.monthly * 12 - plans.itinerant.annualTotal)} €
            </p>
          )}
          <p className="mt-3 text-sm text-ink-600 leading-relaxed">
            {plans.itinerant.description}
          </p>
          <ul className="mt-6 mb-8 flex flex-col gap-3 flex-1">
            {plans.itinerant.features.map((f) => (
              <li key={f.text} className="flex items-start gap-2.5 text-sm">
                <Check size={16} strokeWidth={1.7} className="text-teal-600 mt-0.5 shrink-0" />
                <span className={f.strong ? 'font-semibold text-navy-900' : 'text-ink-600'}>
                  {f.text}
                </span>
              </li>
            ))}
          </ul>
          <div className="mt-auto">
            <PlanCta
              plan="itinerant"
              interval={interval}
              tier={tier}
              eligible={eligible}
              buttonClass={cn(buttonVariants({ variant: 'navy', size: 'cta' }), 'w-full')}
            />
          </div>
        </div>
      </div>
    </>
  )
}
