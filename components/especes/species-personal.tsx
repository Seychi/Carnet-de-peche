import { Fish, Trophy } from 'lucide-react'
import { getPersonalTendencies } from '@/lib/scoring/personal/fetch'
import { createClient } from '@/lib/supabase/server'
// Sous-modules CLIENT-SAFE (config) — pas le barrel index (il tire next/headers).
// Ici on est en Server Component, mais on garde la même discipline d'import.
import { CONFIDENCE_LABELS } from '@/lib/scoring/personal/config'
import { PersonalTendencies } from '@/components/scoring/PersonalTendencies'

// Record perso de l'espèce, lu inline sur la vue scopée auth.uid() (record PRIVÉ,
// RLS). On préfère la longueur MESURÉE quand elle existe (sprint 44), libellé
// honnête (« mesurée », jamais « vérifiée »). Tout null si aucune prise de l'espèce.
type SpeciesRecord = {
  sizeCm: number | null
  measuredCm: number | null
  weightG: number | null
}

async function fetchSpeciesRecord(dbKey: string): Promise<SpeciesRecord> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { sizeCm: null, measuredCm: null, weightG: null }

  // catches_for_viewer est déjà scopée à auth.uid() par la RLS ; on filtre tout de
  // même explicitement sur user_id (anti-usurpation, cf modèle fetch.ts).
  const { data, error } = await supabase
    .from('catches_for_viewer')
    .select('size_cm, measured_length_cm, weight_g')
    .eq('user_id', user.id)
    .eq('species', dbKey)
    .limit(2000)

  if (error || !data || data.length === 0) {
    return { sizeCm: null, measuredCm: null, weightG: null }
  }

  const max = (vals: (number | null)[]) => {
    const nums = vals.filter((v): v is number => typeof v === 'number' && Number.isFinite(v))
    return nums.length ? Math.max(...nums) : null
  }
  return {
    sizeCm: max(data.map((r) => r.size_cm)),
    measuredCm: max(data.map((r) => r.measured_length_cm)),
    weightG: max(data.map((r) => r.weight_g)),
  }
}

// « Tes tendances sur cette espèce » (sprint 23, WS-B) + highlight « meilleur leurre »
// et « ton record » (sprint 45, WS A/C). Réutilise le moteur perso unifié du sprint 22,
// segmenté par espèce. Descriptif (où/quand/avec quoi tombent TES prises), jamais
// prédictif. États plein/dégradé/vide gérés par PersonalTendencies.
export async function SpeciesPersonal({ dbKey, labelLower }: { dbKey: string; labelLower: string }) {
  const [data, record] = await Promise.all([
    getPersonalTendencies({ species: dbKey }),
    fetchSpeciesRecord(dbKey),
  ])

  // Tendance leurre dominante — mise en avant seulement quand on a assez de prises
  // (même seuil que les tendances génériques), sinon ce serait du bruit sur 1-2 prises.
  const gear = data.tendencies.find((t) => t.factor === 'gear' && t.hasData)
  const showGearHighlight = data.hasEnough && gear && gear.label

  // Record affichable : on privilégie la longueur mesurée (plus fiable), sinon la
  // taille déclarée. Le poids complète la ligne s'il existe.
  const recordCm = record.measuredCm ?? record.sizeCm
  const recordIsMeasured = record.measuredCm != null
  const showRecord = recordCm != null || record.weightG != null

  return (
    <div className="flex flex-col gap-4">
      {showGearHighlight && (
        <div className="rounded-[14px] border border-gold-500/35 bg-gold-500/[0.07] p-4">
          <span className="inline-flex items-center gap-1.5 font-mono text-[10.5px] font-medium uppercase tracking-[0.08em] text-[#A87C20]">
            <Fish size={13} strokeWidth={1.8} aria-hidden="true" /> Ton meilleur leurre
          </span>
          <p className="mt-1.5 text-[14px] leading-snug text-navy-900">
            Sur {labelLower}, tu sors surtout au{' '}
            <strong className="font-semibold">{gear.label}</strong>.
          </p>
          <p className="mt-1 font-mono text-[11.5px] text-ink-500">
            <span className="font-semibold text-navy-900">{Math.round(gear.share * 100)} %</span> de
            tes prises, {CONFIDENCE_LABELS[gear.confidence]}
          </p>
        </div>
      )}

      {showRecord && (
        <div className="rounded-[14px] border border-sand-200 bg-white p-4">
          <span className="inline-flex items-center gap-1.5 font-mono text-[10.5px] font-medium uppercase tracking-[0.08em] text-teal-700">
            <Trophy size={13} strokeWidth={1.8} aria-hidden="true" /> Ton record de {labelLower}
          </span>
          <p className="mt-1.5 flex flex-wrap items-baseline gap-x-2.5 gap-y-0.5">
            {recordCm != null && (
              <span className="font-mono text-xl font-bold leading-none text-navy-900">
                {recordCm} cm
              </span>
            )}
            {recordCm != null && recordIsMeasured && (
              <span className="font-mono text-[10.5px] font-medium uppercase tracking-[0.06em] text-ink-400">
                longueur mesurée
              </span>
            )}
            {record.weightG != null && (
              <span className="font-mono text-[13px] font-semibold text-ink-600">
                {(record.weightG / 1000).toFixed(2).replace('.', ',')} kg
              </span>
            )}
          </p>
          <p className="mt-1.5 text-[11px] leading-snug text-ink-400">
            Ton record perso, privé. Calculé sur tes vraies prises.
          </p>
        </div>
      )}

      <PersonalTendencies data={data} speciesLabel={labelLower} />
    </div>
  )
}

export function SpeciesPersonalSkeleton() {
  return (
    <div className="rounded-[18px] border border-sand-200 bg-white p-5">
      <div className="mb-3 h-3 w-40 rounded bg-sand-200" />
      <div className="h-3 w-full rounded bg-sand-100" />
    </div>
  )
}
