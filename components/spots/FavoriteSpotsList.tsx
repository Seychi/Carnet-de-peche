import Link from 'next/link'
import { Star } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { DEPARTMENT_LABELS } from '@/lib/geo/departments'
import { RemoveFavoriteButton } from './FavoriteSpotButton'

// ─── Liste des spots favoris du viewer (sprint 72, Bloc 3) ────────────────────
// Server component : lecture RLS own-only (favorite_spots) + embed spots (name,
// slug, department UNIQUEMENT : jamais de coordonnée ici). Un spot devenu
// invisible (dépublié) reste listé en « indisponible » avec son bouton de retrait
// (revue S72) : le cap 10 du trigger DB compte TOUTES les lignes, un favori
// fantôme doit rester libérable depuis l'UI et le compteur N/10 doit dire vrai.

type FavoriteRow = {
  spot_id: string
  spots: { name: string; slug: string; department: string } | null
}

export async function FavoriteSpotsList() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return null

  const { data } = await supabase
    .from('favorite_spots')
    .select('spot_id, spots(name, slug, department)')
    .eq('user_id', user.id)
    .order('created_at', { ascending: true })
    .limit(10)

  // Embed many-to-one : objet au runtime ; le typegen le voit en tableau (la FK
  // référence aussi spots_for_viewer) → passage par unknown.
  const rows = (data ?? []) as unknown as FavoriteRow[]
  const favorites = rows.filter((f) => f.spots != null)
  const ghosts = rows.filter((f) => f.spots == null)

  return (
    <section className="mb-6 rounded-[14px] border border-sand-200 bg-white p-5">
      <h2 className="flex items-center gap-2 text-sm font-semibold text-navy-900">
        <Star size={16} className="text-gold-500 fill-gold-500" aria-hidden="true" />
        Tes spots favoris
        <span className="font-mono text-xs font-medium text-ink-400">
          {rows.length}/10
        </span>
      </h2>

      {rows.length === 0 ? (
        <p className="mt-2 text-[13px] leading-relaxed text-ink-500">
          Aucun favori pour l&rsquo;instant. Ajoute l&rsquo;étoile depuis une fiche
          spot ou la carte : c&rsquo;est la base des alertes de la veille.
        </p>
      ) : (
        <ul className="mt-3 flex flex-col divide-y divide-sand-100">
          {favorites.map((f) => {
            const spot = f.spots!
            const deptKey = spot.department.trim()
            return (
              <li key={f.spot_id} className="flex items-center justify-between gap-3 py-1.5">
                <Link
                  href={`/spots/${spot.slug}`}
                  className="min-w-0 flex-1 truncate py-2 text-[14px] font-medium text-navy-900 hover:text-teal-700"
                >
                  {spot.name}
                  <span className="ml-2 font-mono text-[11px] font-normal uppercase tracking-[0.06em] text-ink-400">
                    {DEPARTMENT_LABELS[deptKey] ?? deptKey}
                  </span>
                </Link>
                <RemoveFavoriteButton spotId={f.spot_id} spotName={spot.name} />
              </li>
            )
          })}
          {ghosts.map((f) => (
            <li key={f.spot_id} className="flex items-center justify-between gap-3 py-1.5">
              <span className="min-w-0 flex-1 truncate py-2 text-[14px] italic text-ink-400">
                Spot indisponible (retiré ou dépublié)
              </span>
              <RemoveFavoriteButton spotId={f.spot_id} spotName="ce spot" />
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
