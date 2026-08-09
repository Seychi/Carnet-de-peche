import { CircleCheck, CircleAlert, CircleSlash, Tag } from 'lucide-react'
import type { Facade, SpeciesSlug } from '@/lib/seo/programmatic'
import {
  getSpeciesStatuses,
  getSpeciesQuotas,
  mailleRows,
  type SpeciesStatus,
} from '@/lib/especes/answer'

// ─── Bloc « réponse » des fiches espèces (sprint 75, Bloc 2) ─────────────────
//
// POURQUOI. /especes pesait 36 % des impressions du site pour 11 % des clics
// (CTR 1,7 % contre 8,4 % sur /spots). La réponse que les gens viennent chercher
// (« maille du maigre 2026 », « congre taille max », « barracuda taille minimum »)
// était noyée sous ~1 500 mots de prose. Sur mobile, soit 82 % du trafic, personne
// ne descendait la chercher. Ce bloc la remonte AU-DESSUS de l'intro.
//
// HONNÊTETÉ. Tout vient de lib/regulation (sourcé, daté, testé) via lib/especes/answer :
// la maille, le quota et le statut du jour sont CALCULÉS, jamais écrits en dur. Une
// donnée absente n'affiche rien plutôt qu'une valeur devinée.
//
// DALTONISME (John). Le statut n'est JAMAIS porté par la seule teinte : chaque état
// a son libellé explicite ET sa forme d'icône distincte.
//
// Rendu 100 % serveur → présent dans le HTML servi, donc indexable.

const FACADE_SHORT: Record<Facade, string> = {
  'manche-atlantique': 'Manche · Atlantique',
  mediterranee: 'Méditerranée',
}

/** Forme + libellé, jamais la couleur seule (cf note daltonisme ci-dessus). */
const STATUS_STYLE: Record<
  SpeciesStatus['kind'],
  { Icon: typeof CircleCheck; cls: string }
> = {
  open: { Icon: CircleCheck, cls: 'text-teal-300' },
  'no-take': { Icon: CircleAlert, cls: 'text-gold-500' },
  closed: { Icon: CircleSlash, cls: 'text-coral-400' },
}

export type SpeciesAnswerProps = {
  slug: SpeciesSlug
  /** Façades où l'espèce est réellement présente (dérivées des saisons éditoriales). */
  facades: Facade[]
  minSizeCm: Record<Facade, number | null>
  verifiedAt: string
  source: string
  marquage: boolean
}

export function SpeciesAnswer({
  slug,
  facades,
  minSizeCm,
  verifiedAt,
  source,
  marquage,
}: SpeciesAnswerProps) {
  if (facades.length === 0) return null

  // La page est en ISR 24 h : le statut est recalculé à chaque revalidation, ce qui
  // suffit pour une règle qui bascule au mois (jamais à l'heure).
  const statuses = getSpeciesStatuses(slug, facades, new Date())
  const quotas = getSpeciesQuotas(slug, facades)
  const mailles = mailleRows(minSizeCm, facades)
  const hasMaille = mailles.some((m) => m.minSizeCm != null)

  return (
    <section
      aria-label="Réglementation en bref"
      className="mt-6 rounded-[14px] border border-white/10 bg-white/[0.05] p-4"
    >
      <div className="flex flex-col gap-4 sm:flex-row sm:gap-8">
        {/* Maille — la donnée la plus demandée, en mono (règle d'or DA v2). */}
        {hasMaille && (
          <div className="min-w-0">
            <p className="font-mono text-[10.5px] font-medium uppercase tracking-[0.08em] text-white/40">
              Taille minimale
            </p>
            <ul className="mt-1.5 flex flex-col gap-1">
              {mailles.map((row) => (
                <li key={row.facades.join('-')} className="leading-tight">
                  <span className="font-mono text-[19px] font-semibold text-white">
                    {row.minSizeCm != null ? `${row.minSizeCm} cm` : 'Pas de maille'}
                  </span>
                  {facades.length > 1 && (
                    <span className="ml-2 text-[12px] text-white/45">
                      {row.facades.map((f) => FACADE_SHORT[f]).join(' et ')}
                    </span>
                  )}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Statut du jour, par façade. Calculé, jamais écrit en dur. */}
        <div className="min-w-0 flex-1">
          <p className="font-mono text-[10.5px] font-medium uppercase tracking-[0.08em] text-white/40">
            Aujourd&rsquo;hui
          </p>
          <ul className="mt-1.5 flex flex-col gap-1.5">
            {statuses.map((s) => {
              const { Icon, cls } = STATUS_STYLE[s.kind]
              return (
                <li key={s.facade} className="flex items-start gap-1.5">
                  <Icon size={14} aria-hidden="true" className={`mt-0.5 shrink-0 ${cls}`} />
                  <span className="min-w-0 text-[13px] leading-snug text-white/85">
                    {s.label}
                    {facades.length > 1 && (
                      <span className="text-white/45"> · {FACADE_SHORT[s.facade]}</span>
                    )}
                    {s.zone && <span className="block text-[11.5px] text-white/45">{s.zone}</span>}
                  </span>
                </li>
              )
            })}
          </ul>
        </div>
      </div>

      {/* Quota journalier + marquage : la suite immédiate de « puis-je la garder ». */}
      {(quotas.length > 0 || marquage) && (
        <ul className="mt-3.5 flex flex-col gap-1 border-t border-white/10 pt-3">
          {quotas.map((q) => (
            <li key={q.note} className="flex items-start gap-1.5 text-[12.5px] text-white/70">
              <Tag size={13} aria-hidden="true" className="mt-0.5 shrink-0 text-white/35" />
              <span>
                <span className="font-mono font-semibold text-white">{q.perDay}</span> par jour et
                par pêcheur
                {q.zone ? <span className="text-white/45"> · {q.zone}</span> : null}
              </span>
            </li>
          ))}
          {marquage && (
            <li className="flex items-start gap-1.5 text-[12.5px] text-white/70">
              <Tag size={13} aria-hidden="true" className="mt-0.5 shrink-0 text-white/35" />
              <span>Marquage obligatoire dès la capture conservée.</span>
            </li>
          )}
        </ul>
      )}

      <p className="mt-3 text-[11.5px] leading-snug text-white/35">
        Vérifié le {verifiedAt}. Source : {source}. La réglementation évolue, revérifie avant de
        partir.
      </p>
    </section>
  )
}
