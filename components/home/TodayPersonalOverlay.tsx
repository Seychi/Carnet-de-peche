import Link from 'next/link'
import { Sparkles, ArrowRight, Anchor } from 'lucide-react'
import type { PersonalTendencies as Tendencies } from '@/lib/scoring/personal/types'
import type { BestGearToday } from '@/lib/scoring/personal/best-gear-today'
import { CONFIDENCE_LABELS, FACTOR_LABELS, TIDE_LABELS, WIND_LABELS } from '@/lib/scoring/personal/config'

// Overlay perso COMPACT du cockpit « Maintenant » (sprint 30). DISTINCT de la carte
// globale « Tes tendances » du carnet (en-tête « Ce que ton carnet en dit », 1-2
// lignes max + lien « voir tout ») : on ne ré-instancie PAS le même bloc → pas de
// doublon inter-pages. DESCRIPTIF, jamais un score perso 0-100 inventé. États
// vide/dégradé/plein honnêtes, avec niveau de confiance.

function pct(share: number): string {
  return `${Math.round(share * 100)} %`
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1)
}

/**
 * « Le bon leurre pour aujourd'hui » (WS B) : le leurre que l'utilisateur sort le
 * plus DANS LES CONDITIONS DU JOUR (même marée, même bucket de vent). STRICTEMENT
 * descriptif (« tu sors surtout »), jamais « utilise ». Le gating (≥ MIN_PER_FACTOR
 * prises dans ces conditions) est déjà fait en amont : ici bestGear est soit un
 * résultat affichable, soit null (rien).
 */
function BestGearLine({ gear }: { gear: BestGearToday }) {
  // « En marée descendante et par vent modéré, tu sors surtout le … »
  const tide = TIDE_LABELS[gear.tideState]
  const wind = WIND_LABELS[gear.windBucket]
  const n = gear.sampleCount
  return (
    <div className="mt-3 rounded-[12px] border border-gold-500/30 bg-gold-500/[0.07] px-3.5 py-3">
      <span className="inline-flex items-center gap-1.5 font-mono text-[10.5px] font-medium uppercase tracking-[0.07em] text-[#A87C20]">
        <Anchor size={12} className="text-gold-500" aria-hidden="true" />
        Ton leurre du jour
      </span>
      <p className="mt-1.5 text-[13.5px] leading-snug text-navy-900">
        {capitalize(tide)} et {wind}, tu sors surtout le{' '}
        <span className="font-semibold">{gear.label}</span>{' '}
        <span className="font-mono text-[11px] text-ink-400">
          ({n} prise{n > 1 ? 's' : ''})
        </span>
      </p>
    </div>
  )
}

function Header() {
  return (
    <span className="inline-flex items-center gap-1.5 font-mono text-[11px] font-medium uppercase tracking-[0.08em] text-teal-700">
      <Sparkles size={12} className="text-gold-500" aria-hidden="true" />
      Ce que ton carnet en dit
    </span>
  )
}

export function TodayPersonalOverlay({
  data,
  bestGear = null,
}: {
  data: Tendencies
  bestGear?: BestGearToday | null
}) {
  // ── Vide : aucune prise ────────────────────────────────────────────────────
  if (data.sampleCount === 0) {
    return (
      <div className="rounded-[14px] border border-sand-200 bg-white p-4">
        <Header />
        <p className="mt-1.5 text-[13px] leading-relaxed text-ink-600">
          Logue tes prises et ton carnet personnalisera ce créneau : où et quand elles tombent
          vraiment, rien que pour toi.
        </p>
      </div>
    )
  }

  // ── Dégradé : pas encore assez de prises ───────────────────────────────────
  if (!data.hasEnough) {
    const n = data.minToUnlock
    return (
      <div className="rounded-[14px] border border-sand-200 bg-white p-4">
        <Header />
        <p className="mt-1.5 text-[13px] leading-relaxed text-ink-600">
          Encore <span className="font-mono font-semibold text-navy-900">{n}</span> prise
          {n > 1 ? 's' : ''} et ton carnet affinera ce créneau. Tu en as déjà{' '}
          <span className="font-mono font-semibold text-navy-900">{data.sampleCount}</span>.
        </p>
        {/* Décision John : on N'affiche PAS le leurre du jour tant que les tendances
            globales ne sont pas débloquées (pas d'affirmation forte à froid sur un
            carnet quasi vide). Il apparaît dans l'état plein, quand le signal existe. */}
      </div>
    )
  }

  // ── Plein : top 1-2 tendances + lien vers le carnet (le détail complet y vit) ─
  const rows = data.tendencies.slice(0, 2)
  return (
    <div className="rounded-[14px] border border-sand-200 bg-white p-4">
      <div className="flex items-center justify-between gap-2">
        <Header />
        <span className="font-mono text-[10.5px] text-ink-400">{data.sampleCount} prises</span>
      </div>
      <ul className="mt-2 flex flex-col gap-1.5">
        {rows.map((t) => (
          <li key={t.factor} className="flex items-baseline justify-between gap-3">
            <p className="min-w-0 text-[13.5px] leading-snug text-navy-900">
              <span className="font-mono font-semibold">{pct(t.share)}</span> de tes prises {t.label}
              <span className="ml-1 font-mono text-[10px] uppercase tracking-[0.06em] text-ink-400">
                · {FACTOR_LABELS[t.factor] ?? t.factor}
              </span>
            </p>
            <span className="shrink-0 font-mono text-[10.5px] text-ink-400">
              {CONFIDENCE_LABELS[t.confidence]}
            </span>
          </li>
        ))}
      </ul>
      {/* « Le bon leurre pour aujourd'hui » : croise les conditions du jour (marée +
          vent) avec ton historique leurre. Descriptif, daté, chiffré. Rien si pas
          assez de prises dans ces conditions. */}
      {bestGear ? <BestGearLine gear={bestGear} /> : null}
      <Link
        href="/carnet"
        className="mt-2.5 inline-flex items-center gap-1 text-[12px] font-semibold text-teal-700 transition-all hover:gap-1.5"
      >
        Toutes tes tendances <ArrowRight size={12} />
      </Link>
    </div>
  )
}
