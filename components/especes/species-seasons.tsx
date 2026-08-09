import type { Facade } from '@/lib/seo/programmatic'
import { currentSeason, type SaisonRow } from '@/lib/especes/season'
import { TagData } from '@/components/ui-v2/tag-data'

// ─── Saisons compactées (sprint 75, Bloc 2) ──────────────────────────────────
//
// AVANT : 4 saisons × 2 façades = 8 blocs de prose empilés, tous dépliés, tous de
// même poids visuel. Sur mobile (82 % du trafic) c'était le gros du scroll, et la
// saison EN COURS, la seule qui intéresse le lecteur du jour, était noyée dedans.
//
// APRÈS : une frise de 4 lignes (une par saison), l'activité des deux façades côte
// à côte. La saison en cours est mise en avant. Les notes éditoriales restent
// accessibles au dépliement.
//
// ⚠️ SEO : les notes sont dans un <details> NATIF, donc présentes dans le HTML
// servi. On hiérarchise, on ne retire jamais de contenu de l'index.
//
// DALTONISME : l'activité est portée par le NOMBRE de pastilles pleines et par un
// libellé texte, jamais par la teinte seule.

const ORDER: readonly string[] = ['Printemps', 'Été', 'Automne', 'Hiver']

/** Sémantique de score DA v2 : high teal / mid gold / low ink. Reprise telle quelle
 *  de la fiche d'avant sprint 75 pour ne pas changer le code couleur en cours de route. */
const ACTIVITY: Record<1 | 2 | 3, { label: string; cls: string }> = {
  1: { label: 'Calme', cls: 'text-ink-500' },
  2: { label: 'Bonne', cls: 'text-gold-700' },
  3: { label: 'Pleine saison', cls: 'text-teal-700' },
}

export type SpeciesSeasonsProps = {
  saisons: Record<Facade, SaisonRow[]>
  facades: Facade[]
  facadeLabels: Record<Facade, string>
  /** Injectable pour les tests ; sinon la date courante (page en ISR 24 h). */
  now?: Date
}

export function SpeciesSeasons({ saisons, facades, facadeLabels, now }: SpeciesSeasonsProps) {
  if (facades.length === 0) return null
  const current = currentSeason(now ?? new Date())

  // Une ligne par saison présente, dans l'ordre calendaire.
  const rows = ORDER.map((saison) => ({
    saison,
    parFacade: facades
      .map((f) => ({ facade: f, row: saisons[f]?.find((s) => s.saison === saison) ?? null }))
      .filter((x): x is { facade: Facade; row: SaisonRow } => x.row !== null),
  })).filter((r) => r.parFacade.length > 0)

  if (rows.length === 0) return null

  return (
    <div className="mt-4 overflow-hidden rounded-[14px] border border-sand-200 bg-white">
      {rows.map(({ saison, parFacade }) => {
        const enCours = saison === current
        return (
          <div
            key={saison}
            className={[
              'border-t border-sand-200 px-4 py-3 first:border-t-0',
              enCours ? 'bg-teal-500/[0.06]' : '',
            ].join(' ')}
          >
            <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
              <span className="font-mono text-[12px] font-semibold uppercase tracking-[0.06em] text-navy-900">
                {saison}
              </span>
              {enCours && (
                <TagData className="rounded-full bg-teal-600 px-2 py-0.5 !text-white">
                  EN COURS
                </TagData>
              )}
            </div>

            <div className="mt-1.5 flex flex-col gap-1 sm:flex-row sm:gap-6">
              {parFacade.map(({ facade, row }) => (
                <div key={facade} className="flex items-baseline gap-2">
                  {facades.length > 1 && (
                    <span className="font-mono text-[10.5px] uppercase tracking-[0.06em] text-ink-400">
                      {facadeLabels[facade]}
                    </span>
                  )}
                  <span
                    className={`font-mono text-[11px] font-semibold uppercase tracking-[0.04em] ${
                      ACTIVITY[row.activite].cls
                    }`}
                  >
                    {'●'.repeat(row.activite)}
                    {'○'.repeat(3 - row.activite)} {ACTIVITY[row.activite].label}
                  </span>
                </div>
              ))}
            </div>

            {/* Notes éditoriales : dans le HTML servi, ouvertes par défaut pour la
                seule saison en cours (celle qu'on vient chercher aujourd'hui). */}
            <details className="mt-2" open={enCours}>
              <summary className="cursor-pointer text-[12.5px] font-medium text-teal-700">
                {enCours ? 'Ce qui se passe en ce moment' : `Le détail ${saison.toLowerCase()}`}
              </summary>
              <div className="mt-1.5 flex flex-col gap-2">
                {parFacade.map(({ facade, row }) => (
                  <p key={facade} className="text-[13.5px] leading-snug text-ink-700">
                    {facades.length > 1 && (
                      <span className="font-medium text-navy-900">{facadeLabels[facade]} : </span>
                    )}
                    {row.note}
                  </p>
                ))}
              </div>
            </details>
          </div>
        )
      })}
    </div>
  )
}
