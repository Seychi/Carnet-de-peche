'use client'

import { useRef, useState, useTransition } from 'react'
import Link from 'next/link'
import { Check, Mail, Smartphone, Star, X } from 'lucide-react'
import { toast } from 'sonner'
import { updateAlertSettings } from '@/app/actions/alert-settings'

// ─── Réglages des alertes par port (sprint 72, Bloc 3) ────────────────────────
// Rendu UNIQUEMENT pour un tier Local/Itinérant (la page sert un teaser honnête
// aux autres). Master switch opt-in (défaut OFF), canaux push/email, seuil 50-90.
// Le gating serveur (updateAlertSettings) reste le backstop : ce composant n'est
// qu'une UI.
//
// Daltonisme : chaque état est doublé d'un libellé texte + icône (jamais la
// couleur seule), pattern NotificationTypeToggles.

export type AlertSettingsInitial = {
  alertsEnabled: boolean
  channelPush: boolean
  channelEmail: boolean
  threshold: number
}

export type WatchedFavorite = { spotId: string; name: string; slug: string }

function SwitchButton({
  checked,
  label,
  pending,
  onToggle,
}: {
  checked: boolean
  label: string
  pending: boolean
  onToggle: () => void
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={pending}
      onClick={onToggle}
      className={`shrink-0 inline-flex items-center gap-1.5 min-h-11 px-3 rounded-full border text-xs font-semibold transition-colors duration-150 disabled:opacity-50 ${
        checked
          ? 'bg-teal-500 border-teal-500 text-navy-950'
          : 'bg-white border-ink-200 text-ink-600'
      }`}
    >
      {checked ? (
        <>
          <Check size={14} strokeWidth={2.4} aria-hidden="true" />
          Activé
        </>
      ) : (
        <>
          <X size={14} strokeWidth={2.4} aria-hidden="true" />
          Désactivé
        </>
      )}
    </button>
  )
}

export function AlertSettingsPanel({
  initial,
  favorites,
  favoritesTotal,
}: {
  initial: AlertSettingsInitial
  favorites: WatchedFavorite[]
  /**
   * Total RÉEL de lignes favorite_spots (revue S72) : le cap 10 du trigger DB
   * compte AUSSI les favoris dont le spot est devenu invisible (absents de
   * `favorites`). Sans ça, l'utilisateur voit « 9/10 » mais le 10e ajout échoue.
   */
  favoritesTotal?: number
}) {
  const [enabled, setEnabled] = useState(initial.alertsEnabled)
  const [push, setPush] = useState(initial.channelPush)
  const [email, setEmail] = useState(initial.channelEmail)
  const [threshold, setThreshold] = useState(initial.threshold)
  const [pending, startTransition] = useTransition()

  // Seuil : la valeur affichée suit le curseur, le commit serveur est débouncé.
  const thresholdTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const lastCommittedThreshold = useRef(initial.threshold)

  function commit(
    patch: Parameters<typeof updateAlertSettings>[0],
    rollback: () => void,
  ) {
    startTransition(async () => {
      const res = await updateAlertSettings(patch)
      if (!res.ok) {
        rollback()
        toast.error(res.error)
      }
    })
  }

  function toggleEnabled() {
    const next = !enabled
    setEnabled(next)
    commit({ alertsEnabled: next }, () => setEnabled(!next))
  }

  function togglePush() {
    const next = !push
    setPush(next)
    commit({ channelPush: next }, () => setPush(!next))
  }

  function toggleEmail() {
    const next = !email
    setEmail(next)
    commit({ channelEmail: next }, () => setEmail(!next))
  }

  function onThresholdChange(value: number) {
    setThreshold(value)
    if (thresholdTimer.current) clearTimeout(thresholdTimer.current)
    thresholdTimer.current = setTimeout(() => {
      startTransition(async () => {
        const res = await updateAlertSettings({ threshold: value })
        if (!res.ok) {
          setThreshold(lastCommittedThreshold.current)
          toast.error(res.error)
          return
        }
        lastCommittedThreshold.current = value
      })
    }, 500)
  }

  return (
    <div className="space-y-4">
      {/* Master switch (opt-in explicite, défaut OFF) */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-semibold text-navy-900">Alertes sur tes spots favoris</p>
          <p className="mt-1 text-xs text-ink-500 leading-relaxed">
            La veille au soir, on regarde les fenêtres du lendemain sur tes spots
            favoris. Si l&rsquo;une dépasse ton seuil, tu reçois une alerte : max 1 par
            jour, jamais la nuit.
          </p>
        </div>
        <SwitchButton
          checked={enabled}
          label="Alertes sur tes spots favoris"
          pending={pending}
          onToggle={toggleEnabled}
        />
      </div>

      {enabled ? (
        <>
          {/* Canaux (l'in-app est toujours servi) */}
          <div className="flex items-start justify-between gap-4 border-t border-sand-100 pt-4">
            <div>
              <p className="flex items-center gap-1.5 text-sm font-semibold text-navy-900">
                <Smartphone size={14} className="text-ink-400" aria-hidden="true" />
                Recevoir en push
              </p>
              <p className="mt-1 text-xs text-ink-500 leading-relaxed">
                Nécessite les notifications push activées ci-dessus.
              </p>
            </div>
            <SwitchButton checked={push} label="Alertes en push" pending={pending} onToggle={togglePush} />
          </div>

          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="flex items-center gap-1.5 text-sm font-semibold text-navy-900">
                <Mail size={14} className="text-ink-400" aria-hidden="true" />
                Recevoir par email
              </p>
              <p className="mt-1 text-xs text-ink-500 leading-relaxed">
                Un seul email par jour maximum, avec le détail de la fenêtre.
              </p>
            </div>
            <SwitchButton checked={email} label="Alertes par email" pending={pending} onToggle={toggleEmail} />
          </div>

          {/* Seuil de déclenchement */}
          <div className="border-t border-sand-100 pt-4">
            <div className="flex items-center justify-between gap-4">
              <label htmlFor="alert-threshold" className="text-sm font-semibold text-navy-900">
                Seuil de déclenchement
              </label>
              <span className="font-mono text-sm font-semibold text-navy-900">
                {threshold}
                <span className="font-normal text-ink-400"> / 100</span>
              </span>
            </div>
            <input
              id="alert-threshold"
              type="range"
              min={50}
              max={90}
              step={5}
              value={threshold}
              onChange={(e) => onThresholdChange(Number(e.target.value))}
              aria-valuetext={`${threshold} sur 100`}
              className="mt-3 w-full accent-teal-600"
            />
            <p className="mt-1.5 text-xs text-ink-500 leading-relaxed">
              Score de fenêtre minimal pour être alerté. Plus il est haut, plus les
              alertes sont rares et sélectives.
            </p>
          </div>

          {/* Spots surveillés */}
          <div className="border-t border-sand-100 pt-4">
            <p className="flex items-center gap-1.5 text-sm font-semibold text-navy-900">
              <Star size={14} className="fill-gold-500 text-gold-500" aria-hidden="true" />
              Spots surveillés
              <span className="font-mono text-xs font-medium text-ink-400">
                {Math.max(favoritesTotal ?? 0, favorites.length)}/10
              </span>
            </p>
            {favorites.length === 0 ? (
              <p className="mt-1.5 text-xs text-ink-500 leading-relaxed">
                Aucun spot favori : sans favori, aucune alerte ne peut partir. Ajoute
                l&rsquo;étoile depuis une{' '}
                <Link href="/carte" className="font-medium text-teal-700 hover:underline">
                  fiche spot ou la carte
                </Link>
                .
              </p>
            ) : (
              <ul className="mt-1.5 flex flex-wrap gap-1.5">
                {favorites.map((f) => (
                  <li key={f.spotId}>
                    <Link
                      href={`/spots/${f.slug}`}
                      className="inline-flex min-h-[32px] items-center rounded-full border border-sand-200 bg-sand-50 px-3 text-xs font-medium text-navy-900 transition-colors hover:border-teal-400"
                    >
                      {f.name}
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </>
      ) : (
        <p className="text-xs text-ink-400 leading-relaxed">
          Rien ne part tant que l&rsquo;interrupteur est éteint. Active-le pour choisir
          tes canaux et ton seuil.
        </p>
      )}
    </div>
  )
}
