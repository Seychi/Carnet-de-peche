'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Layers, Lock, Flame, Sparkles, MapPin, X, Loader2, Waves, Grid3x3 } from 'lucide-react'
import type { UserTier } from '@/lib/auth/tier'
import { HEAT_LEGEND_STOPS } from '@/lib/map/heatmap'
import { QUALITY_LEGEND } from '@/lib/map/quality'
import { SPECIES_LABELS } from '@/lib/labels'

// Espèces proposées par le sélecteur dédié de la couche Qualité (les 6 cœur).
const QUALITY_SPECIES = ['bar', 'dorade_royale', 'lieu_jaune', 'maquereau', 'sar', 'orphie'] as const

type Props = {
  userTier: UserTier
  heatmapOn: boolean
  onHeatmapToggle: (on: boolean) => void
  heatmapDays: number
  onDaysChange: (days: number) => void
  heatmapEmpty: boolean
  heatmapLoading: boolean
  scoreOn: boolean
  onScoreToggle: (on: boolean) => void
  bathyOn: boolean
  onBathyToggle: (on: boolean) => void
  bathyOpacity: number
  onBathyOpacityChange: (o: number) => void
  qualityOn: boolean
  onQualityToggle: (on: boolean) => void
  qualitySpecies: string | null
  onQualitySpeciesChange: (s: string | null) => void
  qualityEmpty: boolean
  qualityLoading: boolean
}

function Switch({ on, onClick, label }: { on: boolean; onClick: () => void; label: string }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      aria-label={label}
      onClick={onClick}
      className={[
        'relative h-5 w-9 shrink-0 rounded-full transition-colors',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 focus-visible:ring-offset-1',
        on ? 'bg-teal-500' : 'bg-ink-200',
      ].join(' ')}
    >
      <span
        className={[
          'absolute top-0.5 left-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform',
          on ? 'translate-x-4' : 'translate-x-0',
        ].join(' ')}
      />
    </button>
  )
}

export default function MapLayerSelector({
  userTier,
  heatmapOn,
  onHeatmapToggle,
  heatmapDays,
  onDaysChange,
  heatmapEmpty,
  heatmapLoading,
  scoreOn,
  onScoreToggle,
  bathyOn,
  onBathyToggle,
  bathyOpacity,
  onBathyOpacityChange,
  qualityOn,
  onQualityToggle,
  qualitySpecies,
  onQualitySpeciesChange,
  qualityEmpty,
  qualityLoading,
}: Props) {
  const [open, setOpen] = useState(false)
  const isPaid = userTier === 'local' || userTier === 'itinerant'
  const isItinerant = userTier === 'itinerant'

  return (
    <div className="absolute top-3 left-3 z-20">
      {!open ? (
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label="Couches de la carte"
          className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white/95 backdrop-blur-sm shadow-md border border-ink-200 text-ink-700 text-sm font-medium hover:bg-white hover:border-teal-400 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500"
        >
          <Layers size={16} className="text-ink-500" />
          <span className="hidden sm:inline">Couches</span>
          {heatmapOn && <span className="h-2 w-2 rounded-full bg-coral-500" aria-hidden />}
        </button>
      ) : (
        <div className="w-[268px] rounded-2xl bg-white/97 backdrop-blur-sm shadow-lg border border-ink-200 overflow-hidden">
          <div className="flex items-center justify-between px-3.5 py-2.5 border-b border-ink-100">
            <span className="flex items-center gap-1.5 font-semibold text-sm text-ink-900">
              <Layers size={15} className="text-ink-500" /> Couches
            </span>
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="Fermer le sélecteur de couches"
              className="p-1 -mr-1 rounded-full text-ink-400 hover:bg-ink-100 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500"
            >
              <X size={16} />
            </button>
          </div>

          <div className="flex flex-col divide-y divide-ink-100">
            {/* Spots — base, toujours visible */}
            <div className="flex items-center gap-2.5 px-3.5 py-3">
              <MapPin size={16} className="text-teal-600 shrink-0" />
              <div className="min-w-0 flex-1">
                <p className="text-[13.5px] font-medium text-ink-900">Spots</p>
                <p className="text-[11px] text-ink-400">Toujours visibles</p>
              </div>
              <span className="text-[10px] font-mono uppercase tracking-wide text-ink-300">on</span>
            </div>

            {/* Zones de prises — heatmap communautaire (gratuit) */}
            <div className="px-3.5 py-3">
              <div className="flex items-center gap-2.5">
                <Flame size={16} className="text-coral-500 shrink-0" />
                <div className="min-w-0 flex-1">
                  <p className="text-[13.5px] font-medium text-ink-900">Zones de prises</p>
                  <p className="text-[11px] text-ink-400">Où ça mord · gratuit</p>
                </div>
                <Switch on={heatmapOn} onClick={() => onHeatmapToggle(!heatmapOn)} label="Afficher les zones de prises" />
              </div>

              {heatmapOn && (
                <div className="mt-3 pl-[26px] flex flex-col gap-2.5">
                  {/* Légende dégradé inferno */}
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-ink-400 shrink-0">moins</span>
                    <span
                      className="h-2 flex-1 rounded-full"
                      style={{ background: `linear-gradient(to right, ${HEAT_LEGEND_STOPS.join(', ')})` }}
                      aria-hidden
                    />
                    <span className="text-[10px] text-ink-400 shrink-0">plus</span>
                  </div>

                  {/* Fenêtre temporelle */}
                  <div className="flex items-center gap-1.5">
                    <span className="text-[11px] text-ink-500">Sur</span>
                    {[7, 30].map((d) => (
                      <button
                        key={d}
                        type="button"
                        onClick={() => onDaysChange(d)}
                        className={[
                          'px-2 py-0.5 rounded-full text-[11px] font-medium transition-colors',
                          heatmapDays === d
                            ? 'bg-navy-900 text-white'
                            : 'bg-ink-100 text-ink-600 hover:bg-ink-200',
                        ].join(' ')}
                      >
                        {d} j
                      </button>
                    ))}
                    {heatmapLoading && <Loader2 size={12} className="animate-spin text-ink-400 ml-0.5" />}
                  </div>

                  {/* État vide honnête (« peu de prises pour l'instant ») */}
                  {heatmapEmpty && !heatmapLoading && (
                    <p className="text-[11px] leading-snug text-ink-400">
                      Pas encore assez de prises partagées dans cette zone. Les zones chaudes
                      apparaîtront dès que plusieurs pêcheurs y logueront publiquement.
                    </p>
                  )}
                </div>
              )}
            </div>

            {/* Ton score — perso (payant) */}
            <div className="px-3.5 py-3">
              <div className="flex items-center gap-2.5">
                <Sparkles size={16} className={isPaid ? 'text-gold-500 shrink-0' : 'text-ink-300 shrink-0'} />
                <div className="min-w-0 flex-1">
                  <p className="text-[13.5px] font-medium text-ink-900 flex items-center gap-1.5">
                    Ton score
                    {!isPaid && <Lock size={11} className="text-ink-400" />}
                  </p>
                  <p className="text-[11px] text-ink-400">
                    {isPaid ? 'Tes tendances perso' : 'Local · tes patterns de prises'}
                  </p>
                </div>
                {isPaid ? (
                  <Switch on={scoreOn} onClick={() => onScoreToggle(!scoreOn)} label="Afficher ton score perso" />
                ) : (
                  <Link
                    href="/tarifs"
                    className="shrink-0 px-2 py-1 rounded-full bg-gold-500/15 text-gold-600 text-[11px] font-semibold hover:bg-gold-500/25 transition-colors"
                  >
                    Débloquer
                  </Link>
                )}
              </div>
            </div>

            {/* Fond marin — profondeur + nature du fond (payant Itinérant) — Carte v2 / C3a */}
            <div className="px-3.5 py-3">
              <div className="flex items-center gap-2.5">
                <Waves size={16} className={isItinerant ? 'text-teal-600 shrink-0' : 'text-ink-300 shrink-0'} />
                <div className="min-w-0 flex-1">
                  <p className="text-[13.5px] font-medium text-ink-900 flex items-center gap-1.5">
                    Fond marin
                    {!isItinerant && <Lock size={11} className="text-ink-400" />}
                  </p>
                  <p className="text-[11px] text-ink-400">
                    {isItinerant ? 'Profondeur + nature du fond' : 'Itinérant · profondeur + nature du fond'}
                  </p>
                </div>
                {isItinerant ? (
                  <Switch on={bathyOn} onClick={() => onBathyToggle(!bathyOn)} label="Afficher la couche fond marin" />
                ) : (
                  <Link
                    href="/tarifs"
                    className="shrink-0 px-2 py-1 rounded-full bg-gold-500/15 text-gold-600 text-[11px] font-semibold hover:bg-gold-500/25 transition-colors"
                  >
                    Débloquer
                  </Link>
                )}
              </div>

              {isItinerant && bathyOn && (
                <div className="mt-3 pl-[26px] flex items-center gap-2">
                  <span className="text-[11px] text-ink-500 shrink-0">Opacité</span>
                  <input
                    type="range"
                    min={0.2}
                    max={1}
                    step={0.05}
                    value={bathyOpacity}
                    onChange={(e) => onBathyOpacityChange(Number(e.target.value))}
                    className="flex-1 accent-teal-500"
                    aria-label="Opacité de la couche fond marin"
                  />
                </div>
              )}
            </div>

            {/* Qualité — score décomposé par espèce (Carte v2 / C3b). Aperçu tous tiers ;
                détail complet (fond adapté + ton historique) au clic = Itinérant. */}
            <div className="px-3.5 py-3">
              <div className="flex items-center gap-2.5">
                <Grid3x3 size={16} className="text-teal-600 shrink-0" />
                <div className="min-w-0 flex-1">
                  <p className="text-[13.5px] font-medium text-ink-900">Qualité</p>
                  <p className="text-[11px] text-ink-400">Par espèce · décomposée</p>
                </div>
                <Switch on={qualityOn} onClick={() => onQualityToggle(!qualityOn)} label="Afficher la couche qualité" />
              </div>

              {qualityOn && (
                <div className="mt-3 pl-[26px] flex flex-col gap-2.5">
                  {/* Sélecteur d'espèce dédié (la qualité est PAR espèce) */}
                  <label className="flex items-center gap-2 text-[11px] text-ink-500">
                    <span className="shrink-0">Espèce</span>
                    <select
                      value={qualitySpecies ?? ''}
                      onChange={(e) => onQualitySpeciesChange(e.target.value || null)}
                      className="flex-1 rounded-lg border border-ink-200 bg-white px-2 py-1 text-[12px] text-ink-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500"
                      aria-label="Espèce de la couche qualité"
                    >
                      <option value="">Toutes</option>
                      {QUALITY_SPECIES.map((s) => (
                        <option key={s} value={s}>{SPECIES_LABELS[s] ?? s}</option>
                      ))}
                    </select>
                    {qualityLoading && <Loader2 size={12} className="animate-spin text-ink-400 shrink-0" />}
                  </label>

                  {/* Légende cividis (colorblind-safe) — le chiffre du score double l'info */}
                  <div className="flex flex-col gap-1">
                    {QUALITY_LEGEND.map((l) => (
                      <div key={l.quality} className="flex items-center gap-2">
                        <span
                          className="h-3 w-3 rounded-[3px] border border-navy-950/40 shrink-0"
                          style={{ background: l.color }}
                          aria-hidden
                        />
                        <span className="text-[11px] text-ink-500">{l.label}</span>
                      </div>
                    ))}
                    <p className="text-[10px] text-ink-400 leading-snug mt-0.5">
                      Le score (0-100) est inscrit sur chaque case — lisible quel que soit le daltonisme.
                    </p>
                  </div>

                  {/* État vide honnête */}
                  {qualityEmpty && (
                    <p className="text-[11px] leading-snug text-ink-400">
                      Pas encore assez de prises partagées pour afficher la qualité ici. Elle apparaît
                      dès que plusieurs pêcheurs y loguent publiquement{isItinerant ? ' — ou sur tes propres spots' : ''}.
                    </p>
                  )}

                  {/* Note tier — aperçu vs complet */}
                  {!isItinerant && (
                    <p className="text-[11px] leading-snug text-ink-400">
                      Aperçu communautaire. Le détail complet (fond adapté à l&apos;espèce + ton historique)
                      au clic est{' '}
                      <Link href="/tarifs" className="text-gold-600 font-semibold hover:underline">
                        Itinérant
                      </Link>.
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
