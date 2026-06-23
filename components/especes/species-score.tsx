import Link from 'next/link'
import { Users, Sparkles, Lock } from 'lucide-react'
import { getSpeciesRegionalScore } from '@/lib/especes/score'
import { ScoreRing } from '@/components/ui-v2/score-ring'
import { TagData } from '@/components/ui-v2/tag-data'

// Score régional PAR ESPÈCE (sprint 23, WS-B) — l'instrument qui rend la fiche vivante.
// DÉCOMPOSÉ (jamais opaque) : communauté (k-anon) + perso (Itinérant). Honnêteté 7.5 :
// composante absente = dite, jamais simulée. Daltonien : le CHIFFRE (font-mono) porte
// l'info, pas la seule teinte (ScoreRing affiche la valeur ; libellé texte de qualité).

function bandLabel(score: number): string {
  if (score >= 80) return 'Exceptionnelle'
  if (score >= 60) return 'Très bonne'
  if (score >= 40) return 'Bonne'
  if (score >= 20) return 'Moyenne'
  return 'Faible'
}

export async function SpeciesScore({
  dbKey,
  article,
  labelLower,
}: {
  dbKey: string
  article: string
  labelLower: string
}) {
  const s = await getSpeciesRegionalScore(dbKey)

  // ── Pas de signal COMMUNAUTAIRE → pas de verdict de zone (honnêteté 7.5) ────
  // On n'affiche JAMAIS une note de zone (« Qualité Faible 0/100 ») fabriquée à
  // partir des seules prises perso de l'utilisateur : ce serait lire un artefact
  // d'échantillon comme un jugement sur le coin. Le perso est juste reconnu à côté.
  if (s.community === null) {
    return (
      <section className="rounded-[18px] border border-sand-200 bg-white p-5">
        <TagData className="mb-2 block">
          {article.trim()} {labelLower} en ce moment · {s.regionLabel}
        </TagData>
        <p className="text-[14px] leading-relaxed text-ink-600">
          Pas encore assez de prises partagées {s.regionLabel} pour noter {article.toLowerCase()}
          {labelLower}. Le score s&apos;allume dès que la communauté logue — sois parmi les premiers.
        </p>
        {s.perso && (
          <p className="mt-2 inline-flex items-center gap-1.5 text-[13px] text-ink-700">
            <Sparkles size={13} className="text-gold-500" aria-hidden="true" />
            Toi, tu y as déjà pris{' '}
            <span className="font-mono font-semibold">{s.perso.catches}</span> {labelLower} (ton
            carnet).
          </p>
        )}
        <Link
          href="/carnet/nouvelle"
          className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-navy-900 px-3.5 py-1.5 text-[12.5px] font-semibold text-white transition-colors hover:bg-navy-800"
        >
          Loguer une prise {article.toLowerCase()}{labelLower}
        </Link>
      </section>
    )
  }

  const isItinerant = s.tier === 'itinerant'

  return (
    <section className="rounded-[18px] border border-sand-200 bg-white p-5">
      <TagData className="mb-3 block">
        {article.trim()} {labelLower} en ce moment · {s.regionLabel}
      </TagData>

      <div className="flex items-center gap-4">
        <ScoreRing value={s.score} size="lg" label={`Score ${s.score} sur 100`} />
        <div className="min-w-0">
          <p className="font-mono text-[13px] font-semibold uppercase tracking-[0.04em] text-navy-900">
            Qualité {bandLabel(s.score)}
          </p>
          <p className="mt-0.5 text-[12.5px] leading-snug text-ink-500">
            Meilleure zone {s.regionLabel} · 30 derniers jours
          </p>
        </div>
      </div>

      {/* Décomposition (jamais opaque) */}
      <ul className="mt-4 flex flex-col gap-2 border-t border-sand-100 pt-3">
        <li className="flex items-center justify-between gap-3 text-[13.5px]">
          <span className="inline-flex items-center gap-1.5 text-ink-600">
            <Users size={14} className="text-teal-600" aria-hidden="true" /> Communauté
          </span>
          <span className="text-right text-ink-800">
            {s.community ? (
              <>
                <span className="font-mono font-semibold">{s.community.catches}</span> prises ·{' '}
                <span className="font-mono font-semibold">{s.community.fishers}</span> pêcheurs
              </>
            ) : (
              <span className="text-ink-400">pas encore assez de prises partagées</span>
            )}
          </span>
        </li>

        <li className="flex items-center justify-between gap-3 text-[13.5px]">
          <span className="inline-flex items-center gap-1.5 text-ink-600">
            <Sparkles size={14} className="text-gold-500" aria-hidden="true" /> Ton carnet
          </span>
          <span className="text-right text-ink-800">
            {isItinerant ? (
              s.perso ? (
                <>
                  tu y as pris <span className="font-mono font-semibold">{s.perso.catches}</span>{' '}
                  {labelLower}
                </>
              ) : (
                <span className="text-ink-400">aucune prise {labelLower} ici (30 j)</span>
              )
            ) : (
              <span className="inline-flex items-center gap-1 text-ink-400">
                <Lock size={12} aria-hidden="true" /> Itinérant
              </span>
            )}
          </span>
        </li>
      </ul>

      {!isItinerant && (
        <Link
          href="/tarifs"
          className="mt-3 block rounded-[10px] bg-gold-500/15 px-3 py-2 text-center text-[12px] font-semibold text-[#A87C20] transition-colors hover:bg-gold-500/25"
        >
          Ajoute ton historique perso au score — Itinérant
        </Link>
      )}

      <p className="mt-3 text-[11px] leading-snug text-ink-400">
        Score décomposé sur de vraies prises {s.regionLabel}. Aucune donnée simulée — une
        composante absente est dite, pas inventée.
      </p>
    </section>
  )
}

export function SpeciesScoreSkeleton() {
  return (
    <section className="rounded-[18px] border border-sand-200 bg-white p-5">
      <div className="mb-3 h-3 w-40 rounded bg-sand-200" />
      <div className="flex items-center gap-4">
        <div className="size-16 rounded-full bg-sand-100" />
        <div className="flex-1 space-y-2">
          <div className="h-3 w-32 rounded bg-sand-200" />
          <div className="h-3 w-44 rounded bg-sand-100" />
        </div>
      </div>
    </section>
  )
}
