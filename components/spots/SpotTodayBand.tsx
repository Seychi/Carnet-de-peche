import { Waves, Wind, Gauge } from 'lucide-react'
import { degreesToCompass, beaufortLabel, waveLabel } from '@/lib/conditions/format'
import type { QualityLevel } from '@/lib/solunar/types'

/**
 * Bande « conditions du jour » du premier écran d'une fiche de spot.
 *
 * ⚠️ SPRINT 80, Bloc 1. `/spots` est le meilleur actif du site (12 894
 * impressions/mois, 7,2 % de CTR à la position 7,1). Le visiteur arrive en
 * cherchant « est-ce que ça mord à tel endroit ». Mesuré le 15/08 en 390 × 664,
 * le premier écran d'une fiche contenait : un fil d'Ariane, deux badges, le nom,
 * « ZONE APPROCHÉE », des étoiles de difficulté et trois pastilles d'espèces.
 * **Ni marée, ni vent, ni score.** La réponse était trois écrans plus bas, alors
 * qu'elle était déjà calculée et déjà sur la page.
 *
 * ⚠️ INVARIANT DE PERFORMANCE : ce composant ne fait AUCUNE requête. Il reçoit
 * en props des valeurs déjà chargées par la page (`conditions`, `weekly[0]`).
 * Ajouter un fetch ici dégraderait le LCP de la page la plus rentable du site,
 * ce qui reviendrait à perdre d'un côté ce qu'on gagne de l'autre.
 *
 * ⚠️ MÉDITERRANÉE : pas d'argument de marée. Le marnage y est de quelques
 * centimètres, annoncer une pleine mer y serait un faux repère. La bande parle
 * alors de mer et de vent, exactement comme le générateur de fiches du S78.
 */

export type SpotTodayBandProps = {
  /** Prochain extremum de marée, DÉJÀ calibré et formaté (« 14h32 »). */
  tide?: { label: string; kind: 'high' | 'low' } | null
  /** Hauteur de vague en mètres, servie à la place de la marée en Méditerranée. */
  waveHeightM?: number | null
  windSpeedKmh?: number | null
  windDirectionDeg?: number | null
  /** Score du jour 0-100, déjà calculé (`weekly[0].dayScore`). */
  dayScore?: number | null
  dayQuality?: QualityLevel | null
}

/**
 * Couleur du score. ⚠️ John est daltonien : la teinte ne porte JAMAIS
 * l'information seule. Le chiffre est toujours écrit, en chiffres, et la
 * hiérarchie passe aussi par la graisse.
 */
const QUALITY_TONE: Record<string, string> = {
  high: 'text-teal-300',
  mid: 'text-gold-500',
  low: 'text-white/70',
}

function Cell({
  icon,
  label,
  value,
  valueClassName = 'text-white',
  title,
}: {
  icon: React.ReactNode
  label: string
  value: string
  valueClassName?: string
  /** Infobulle : le libelle qualitatif (Beaufort, etat de la mer). */
  title?: string
}) {
  return (
    <div className="flex min-w-0 flex-1 items-center gap-2" title={title}>
      <span className="shrink-0 text-teal-300/70" aria-hidden="true">
        {icon}
      </span>
      <span className="min-w-0">
        <span className="block font-mono text-[10px] font-medium uppercase tracking-[0.08em] text-white/45">
          {label}
        </span>
        <span className={`block truncate font-mono text-[13px] font-semibold ${valueClassName}`}>
          {value}
        </span>
      </span>
    </div>
  )
}

export default function SpotTodayBand({
  tide,
  waveHeightM,
  windSpeedKmh,
  windDirectionDeg,
  dayScore,
  dayQuality,
}: SpotTodayBandProps) {
  // Première cellule : la marée là où elle veut dire quelque chose, l'état de la
  // mer ailleurs. Si ni l'une ni l'autre n'est connue, la cellule disparaît :
  // on n'affiche pas un tiret pour faire joli.
  const first = tide
    ? {
        icon: <Waves size={15} />,
        label: tide.kind === 'high' ? 'Pleine mer' : 'Basse mer',
        value: tide.label,
      }
    : typeof waveHeightM === 'number'
      ? {
          icon: <Waves size={15} />,
          label: 'Mer',
          value: `${waveLabel(waveHeightM)} · ${waveHeightM.toFixed(1)} m`,
        }
      : null

  // ⚠️ La direction va dans le LIBELLÉ, pas dans la valeur. Mesuré en 390 px :
  // les trois cellules font 66 px chacune, et « 22 km/h O » y était tronqué en
  // « 22 km/h… ». Le libellé, lui, est en 10 px et a la place. Une valeur
  // tronquée est pire que pas de valeur : elle a l'air juste.
  const wind =
    typeof windSpeedKmh === 'number'
      ? {
          icon: <Wind size={15} />,
          label:
            typeof windDirectionDeg === 'number'
              ? `Vent ${degreesToCompass(windDirectionDeg)}`
              : 'Vent',
          value: `${Math.round(windSpeedKmh)} km/h`,
          title: beaufortLabel(windSpeedKmh),
        }
      : null

  const score =
    typeof dayScore === 'number'
      ? {
          icon: <Gauge size={15} />,
          label: 'Score du jour',
          value: `${Math.round(dayScore)}/100`,
          tone: QUALITY_TONE[dayQuality ?? ''] ?? 'text-white',
        }
      : null

  // Rien à dire → rien à afficher. Une bande vide coûterait de la hauteur au
  // premier écran sans rien y répondre.
  if (!first && !wind && !score) return null

  return (
    <div className="mb-4 flex items-stretch gap-3 rounded-[14px] border border-white/10 bg-white/[0.06] px-3 py-2.5">
      {first && <Cell icon={first.icon} label={first.label} value={first.value} />}
      {wind && (
        <>
          {first && <span className="w-px shrink-0 bg-white/10" aria-hidden="true" />}
          <Cell icon={wind.icon} label={wind.label} value={wind.value} title={wind.title} />
        </>
      )}
      {score && (
        <>
          {(first || wind) && <span className="w-px shrink-0 bg-white/10" aria-hidden="true" />}
          <Cell
            icon={score.icon}
            label={score.label}
            value={score.value}
            valueClassName={score.tone}
          />
        </>
      )}
    </div>
  )
}
