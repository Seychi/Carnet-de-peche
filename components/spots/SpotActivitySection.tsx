import Link from 'next/link'
import { formatDistanceToNow } from 'date-fns'
import { fr } from 'date-fns/locale'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { createAnonClient } from '@/lib/supabase/anon'
import { SPECIES_LABELS } from '@/lib/labels'
import { ANON_ONLY_ATTR } from '@/components/spots/viewer/auth-hint'

// Signal social local : "X pêcheurs ont logué Y prises ici les 7 derniers jours."
// Lit via get_spot_activity (RPC migration 018) qui passe par catches_for_viewer
// → privacy + floutage déjà appliqués, AUCUNE coordonnée précise renvoyée.

type RecentCatch = {
  id: string
  username: string | null
  display_name: string | null
  avatar_url: string | null
  species: string | null
  size_cm: number | null
  weight_g: number | null
  caught_at: string | null
}

function initials(name: string | null, username: string | null) {
  return (name || username || '?').trim().slice(0, 2).toUpperCase()
}

export async function SpotActivitySection({
  spotId,
  ctaHref,
  maxRecent = 3,
  signupHref,
  extraRowsSlot,
}: {
  spotId: string
  ctaHref: string
  /**
   * Sprint 77, Bloc 2 : « toutes les prises » passe au palier compte gratuit.
   * Un anonyme en reçoit 2 ; les suivantes sont ABSENTES du DOM, jamais
   * masquées en CSS. Le compteur agrégé (« X pêcheurs, Y prises ») reste servi
   * à tout le monde : c'est du contenu frais et unique, et il ne révèle rien.
   */
  maxRecent?: number
  /** Fourni uniquement quand il reste des prises derrière le mur. */
  signupHref?: string
  /**
   * Sprint 84, Bloc 3 : lignes supplémentaires d'un visiteur CONNECTÉ, montées
   * après hydratation (le HTML statique est celui d'un anonyme, il n'en porte que
   * `ANON_ACTIVITY_ROWS`). Rendu à l'intérieur du même `<ul>` pour garder une seule
   * liste sémantique.
   */
  extraRowsSlot?: React.ReactNode
}) {
  // Sprint 84, Bloc 3 : client ANON sans cookies. `get_spot_activity` est une RPC
  // k-anon (K=3) qui lit `catches_for_viewer` : elle ne renvoie AUCUNE coordonnée et
  // son résultat ne dépend pas du visiteur. Lire avec le client de session appelait
  // `cookies()` et rendait toute la fiche dynamique.
  const supabase = createAnonClient()
  const { data } = await supabase.rpc('get_spot_activity', { p_spot_id: spotId, p_days: 7 })
  const row = Array.isArray(data) ? data[0] : data

  const catchesCount = row?.catches_count ?? 0
  // Pas d'activité 7j → état vide qui CONVERTIT (sprint 25 WS-C) : on ne laisse plus
  // de silence sur la fiche spot. Pas de fausse promesse (« 3 prises ici » seulement
  // si vrai) — juste une invitation honnête à être le premier.
  if (!row || catchesCount === 0) {
    return (
      <section className="bg-white rounded-[18px] border border-ink-100 p-5 md:p-7">
        <div className="flex items-center gap-2 mb-3">
          <span className="inline-block size-2 rounded-full bg-ink-200" aria-hidden />
          <h2 className="font-display text-navy-900 text-xl">Activité récente</h2>
        </div>
        <p className="text-[15px] text-ink-600">
          Personne n&rsquo;a encore logué de prise ici cette semaine.{' '}
          <span className="font-medium text-navy-900">Sois le premier</span>, ta prise allumera ce
          spot pour la communauté.
        </p>
        <Link
          href={ctaHref}
          // Sprint 80, Bloc 5 : mesuré 124 x 20 le 15/08, porté à 44 px de
          // surface tactile sans rien changer au visuel.
          className="mt-2 inline-flex min-h-11 items-center text-[13px] font-semibold text-teal-600 hover:text-teal-700"
        >
          Logue ta prise ici →
        </Link>
      </section>
    )
  }

  const fishers = row.fishers_count ?? 0
  const all = (row.recent_catches ?? []) as RecentCatch[]
  const recent = all.slice(0, maxRecent)
  // Ce qui reste derrière le mur. On compte sur le TOTAL réel de la semaine
  // (`catchesCount`), pas sur la longueur du tableau renvoyé, sinon le chiffre
  // annoncé serait plus petit que la vérité.
  const hiddenCount = Math.max(0, catchesCount - recent.length)

  return (
    <section className="bg-white rounded-[18px] border border-ink-100 p-5 md:p-7">
      <div className="flex items-center gap-2 mb-4">
        <span className="inline-block size-2 rounded-full bg-teal-500 animate-pulse" aria-hidden />
        <h2 className="font-display text-navy-900 text-xl">Activité récente</h2>
      </div>

      <p className="text-[15px] text-ink-700 mb-5">
        <strong className="text-navy-900">{fishers}</strong> pêcheur{fishers > 1 ? 's' : ''} ont logué{' '}
        <strong className="text-navy-900">{catchesCount}</strong> prise{catchesCount > 1 ? 's' : ''} ici les 7 derniers jours.
      </p>

      <ul className="flex flex-col gap-3">
        {recent.map((c) => (
          <li key={c.id} className="flex items-center gap-3">
            <Avatar className="size-8 shrink-0">
              {c.avatar_url && <AvatarImage src={c.avatar_url} alt="" />}
              <AvatarFallback className="text-[11px]">
                {initials(c.display_name, c.username)}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1">
              <p className="text-[14px] text-navy-900">
                <span className="font-semibold">
                  {c.display_name || `@${c.username ?? 'pêcheur'}`}
                </span>{' '}
                <span className="text-ink-500">
                  · {SPECIES_LABELS[c.species ?? ''] ?? c.species ?? 'prise'}
                  {c.size_cm ? ` ${c.size_cm} cm` : ''}
                </span>
              </p>
            </div>
            {c.caught_at && (
              <span className="text-[12px] text-ink-300 shrink-0">
                {formatDistanceToNow(new Date(c.caught_at), { addSuffix: true, locale: fr })}
              </span>
            )}
          </li>
        ))}
        {extraRowsSlot}
      </ul>

      {/* Sprint 77, Bloc 2 : la coupure nomme ce qui est derrière elle plutôt
          que de servir un CTA générique. Le chiffre est vrai, il vient du
          compteur agrégé de la semaine.
          Sprint 84, Bloc 3 : `data-anon-only` — le HTML est mis en cache et sert
          donc aussi les connectés, chez qui cette ligne est masquée AVANT la
          première peinture (cf components/spots/viewer/auth-hint.ts). Balisage
          inerte : pas d'événement, rien à démonter, l'attribut suffit. */}
      {signupHref && hiddenCount > 0 && (
        <p
          {...{ [ANON_ONLY_ATTR]: '' }}
          className="mt-4 pt-4 border-t border-ink-100 text-[14px] text-ink-600"
        >
          <Link href={signupHref} className="font-semibold text-teal-600 hover:text-teal-700">
            {hiddenCount} autre{hiddenCount > 1 ? 's' : ''} prise{hiddenCount > 1 ? 's' : ''} déclarée
            {hiddenCount > 1 ? 's' : ''} ici
          </Link>{' '}
          : crée ton carnet pour toutes les voir, c&rsquo;est gratuit.
        </p>
      )}

      <Link
        href={ctaHref}
        className="mt-5 inline-block text-[13px] font-semibold text-teal-600 hover:text-teal-700"
      >
        Logue ta prise →
      </Link>
    </section>
  )
}
