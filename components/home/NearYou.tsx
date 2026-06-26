import Link from 'next/link'
import { MessageCircle, Users } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { getNearbyCatchSignal } from '@/lib/community/near-you'
import { SPECIES_LABELS } from '@/lib/labels'
import { DEPARTMENT_LABELS } from '@/lib/geo/departments'
import { CockpitSection } from './home-ui'

// Aperçu minimal d'un post récent du fil départemental. On lit la vue floutée
// feed_posts_for_viewer (security_invoker) en ne sélectionnant QUE les champs
// affichés — aucune colonne geom/lng/lat → zéro fuite GPS, et pas de signature
// média (contrairement à getFeedPage qui charge 20 posts + signe leurs médias).
type RecentPost = {
  id: string | null
  author_username: string | null
  author_display_name: string | null
  text: string | null
  created_at: string | null
  catch_species: string | null
  catch_size_cm: number | null
}

function speciesLabel(species: string | null): string {
  if (!species) return 'une prise'
  return (SPECIES_LABELS as Record<string, string>)[species] ?? species
}

function authorName(p: RecentPost): string {
  return p.author_display_name || (p.author_username ? `@${p.author_username}` : 'Un pêcheur')
}

// « il y a 2 h » / « il y a 3 j » — relatif, honnête.
function relativeTime(iso: string | null): string {
  if (!iso) return ''
  const diffMin = Math.round((Date.now() - new Date(iso).getTime()) / 60_000)
  if (diffMin < 1) return 'à l’instant'
  if (diffMin < 60) return `il y a ${diffMin} min`
  const h = Math.round(diffMin / 60)
  if (h < 24) return `il y a ${h} h`
  const d = Math.round(h / 24)
  return `il y a ${d} j`
}

function postSummary(p: RecentPost): string {
  const txt = p.text?.trim()
  if (txt) return txt.length > 120 ? `${txt.slice(0, 117)}…` : txt
  if (p.catch_species) {
    const size = p.catch_size_cm ? ` de ${p.catch_size_cm} cm` : ''
    return `a partagé une prise de ${speciesLabel(p.catch_species)}${size}.`
  }
  return 'a partagé une photo.'
}

/**
 * « Près de toi » — signal communautaire HONNÊTE. Le compte vient EXCLUSIVEMENT de la
 * RPC k-anon get_catch_heatmap (geom_public agrégé, K=3 strict) : un total, jamais un
 * point précis. Les posts récents sont lus via la vue feed_posts_for_viewer (prises
 * floutées, security_invoker). Zéro coordonnée précise n'est exposée ici.
 */
export async function NearYou({ dept }: { dept: string }) {
  const deptLabel = DEPARTMENT_LABELS[dept] ?? `le ${dept}`
  const supabase = await createClient()

  const [signal, { data: postRows }] = await Promise.all([
    getNearbyCatchSignal(dept, 7),
    supabase
      .from('feed_posts_for_viewer')
      .select('id, author_username, author_display_name, text, created_at, catch_species, catch_size_cm')
      .eq('region', dept)
      .order('created_at', { ascending: false })
      .limit(2),
  ])

  const posts = (postRows ?? []) as RecentPost[]

  return (
    <CockpitSection
      title="Près de toi"
      icon={<Users size={13} aria-hidden="true" />}
      action={{ href: `/fil/${dept}`, label: 'Ouvrir le fil' }}
    >
      {/* Compteur k-anon honnête (jamais de faux chiffre). */}
      {signal.catchCount > 0 ? (
        <p className="text-[15px] text-navy-900">
          <span className="font-mono text-[20px] font-semibold text-teal-700">
            {signal.catchCount}
          </span>{' '}
          prise{signal.catchCount > 1 ? 's' : ''} partagée{signal.catchCount > 1 ? 's' : ''} près de
          toi cette semaine.
          <span className="mt-0.5 block text-[12px] text-ink-400">
            Comptage anonymisé (zones de ≥ 3 pêcheurs), jamais un coin précis.
          </span>
        </p>
      ) : (
        <p className="text-[14px] leading-relaxed text-ink-600">
          Pas encore de prise partagée sur {deptLabel} cette semaine.{' '}
          <span className="text-navy-900">Sois le premier à loguer 🎣</span>
        </p>
      )}

      {/* 1-2 posts récents du fil départemental (lecture seule). */}
      {posts.length > 0 ? (
        <ul className="mt-4 flex flex-col divide-y divide-sand-100 border-t border-sand-100">
          {posts.map((p) => (
            <li key={p.id} className="py-3 first:pt-3">
              <Link href={`/fil/${dept}`} className="group block">
                <p className="text-[13.5px] leading-snug text-ink-700">
                  <span className="font-semibold text-navy-900 group-hover:text-teal-700">
                    {authorName(p)}
                  </span>{' '}
                  {postSummary(p)}
                </p>
                <span className="mt-0.5 inline-flex items-center gap-1 font-mono text-[11px] text-ink-400">
                  <MessageCircle size={11} /> {relativeTime(p.created_at)}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      ) : null}
    </CockpitSection>
  )
}
