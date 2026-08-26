import type { Metadata } from 'next'
import { cookies } from 'next/headers'
import { createClient } from '@/lib/supabase/server'
import MapShell from '@/components/map/MapShell'
import { getUserTier } from '@/lib/auth/tier'
import { getWallKind } from '@/lib/gating/wall'
import type { UserTier } from '@/lib/auth/tier'
import { toSpotMarker, limitSpotsPerDept, COASTAL_DEFAULT_CENTER, COASTAL_DEFAULT_ZOOM, COASTAL_DEFAULT_BOUNDS } from '@/lib/map/utils'
import type { SpotMarker } from '@/lib/map/utils'
import { getCenterForDepartment } from '@/lib/geo/department-centroids'
import { parseFiltersFromSearchParams } from '@/lib/spots/filter-url.server'
import type { SpotFilters } from '@/lib/spots/filters-schema'
import type { QualityLevel } from '@/lib/solunar/types'
import { qualityFromScore } from '@/lib/solunar/scoring'

// Page dépendante du tier utilisateur + cookies GPS → jamais mise en cache partagée.
// cookies() opte déjà la page en dynamique, mais on l'explicite pour éviter une
// régression silencieuse si cookies() était un jour retiré.
export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Carte des spots de pêche — Carnet de Pêche',
  description:
    'Carte des spots de pêche à la canne du bord en France. Marées et météo en temps réel, filtres par espèce et technique, score par créneau.',
  alternates: { canonical: 'https://www.carnet-de-peche.com/carte' },
}

const UPSELL_COOKIE = 'upsell-dismissed-at'
const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000

async function fetchProfile(userId: string) {
  const supabase = await createClient()
  const { data } = await supabase
    .from('profiles')
    .select('home_department')
    .eq('id', userId)
    .single()
  return data
}

async function fetchSpots(
  tier: UserTier,
  homeDept: string | null,
  filters: SpotFilters = {},
): Promise<SpotMarker[]> {
  const supabase = await createClient()

  const isPaid = tier === 'local' || tier === 'itinerant'

  const deptFilter: string | null =
    tier === 'local' ? homeDept :
    tier === 'itinerant' ? (filters.department ?? null) :
    null

  const speciesFilter: string[] | null =
    isPaid && filters.species?.length ? filters.species : null

  const techniqueFilter: string[] | null =
    isPaid && filters.techniques?.length ? filters.techniques : null

  const { data, error } = await supabase.rpc('get_spots_for_map', {
    dept_filter: deptFilter,
    species_filter: speciesFilter,
    technique_filter: techniqueFilter,
  })

  if (error || !data) return []

  const spots = data.map(toSpotMarker)

  // ⚠️ Sprint 77, Bloc 1 : ce plafond applicatif (double sécurité posée au
  // sprint 11.6, en complément du cap SQL) incluait `discovery`. La migration 110
  // ouvre la carte au compte gratuit côté base, mais SANS cette ligne le gain
  // serait resté invisible : la page aurait retranché à 3 ce que la RPC venait
  // de renvoyer en entier. C'est LE changement de tête du sprint, il se jouait ici
  // autant que dans le SQL.
  // Seul l'anonyme reste plafonné, exactement comme la clause SQL correspondante.
  if (tier === 'anonymous') {
    return limitSpotsPerDept(spots, 3)
  }
  return spots
}

// Scores pré-calculés par le cron (spot_scores). On ne garde que les scores
// frais (valid_until > now). Renvoie une Map spot_id → { qualité, score }.
//
// ⚠️ On affiche `day_score` (= MEILLEUR moment du jour, 0-100), PAS `current_score`.
// `current_score` est la note de la fenêtre active à l'INSTANT où le cron tourne
// (05:00 UTC / 07:00 Paris) : à cette heure quasi aucun spot n'a de créneau de pêche
// actif → `current_score` vaut ~toujours 0 (d'où « 0/100 partout » sur la carte).
// `day_score` est le bon indicateur d'aperçu (« à quel point ça vaut le coup
// aujourd'hui »), cohérent avec « Meilleurs moments » de la fiche. La couleur du
// marker (qualité) est dérivée du day_score via qualityFromScore.
async function fetchFreshScores(
  spotIds: string[],
): Promise<Map<string, { quality: QualityLevel; score: number }>> {
  const map = new Map<string, { quality: QualityLevel; score: number }>()
  if (spotIds.length === 0) return map

  const supabase = await createClient()
  const { data } = await supabase
    .from('spot_scores')
    .select('spot_id, day_score, valid_until')
    .gt('valid_until', new Date().toISOString())
    .in('spot_id', spotIds)

  for (const row of (data ?? []) as { spot_id: string; day_score: number | null }[]) {
    if (typeof row.day_score !== 'number') continue
    map.set(row.spot_id, { quality: qualityFromScore(row.day_score), score: row.day_score })
  }
  return map
}

/**
 * Lit `?lat=&lng=` et rend un centre de carte, ou `null` si l'un des deux manque
 * ou sort des bornes du littoral français métropolitain.
 *
 * On borne volontairement : ces valeurs viennent de l'URL, donc de n'importe qui.
 * Une coordonnée hors zone ne casserait rien mais enverrait la carte au milieu de
 * l'Atlantique, ce qui est un bug d'apparence gratuit.
 */
function parseFocus(
  params: Record<string, string | string[] | undefined>
): [number, number] | null {
  const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v)
  const lat = Number(one(params.lat))
  const lng = Number(one(params.lng))
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null
  if (lat < 41 || lat > 51.5 || lng < -5.5 || lng > 10) return null
  return [lng, lat]
}

export default async function CartePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  // Q1 + Q2 en parallèle : le vrai aller-retour parallélisé est la RPC
  // current_tier (dans getUserTier). auth.getUser() lancé en // se résout depuis
  // le cache de session du SDK @supabase/ssr (pas un 2e aller-retour réseau).
  // Q3 (profile) suit, conditionnée par tier+user (donc pas parallélisable avec Q1/Q2).
  const supabase = await createClient()
  const [{ data: { user } }, tier] = await Promise.all([
    supabase.auth.getUser(),
    getUserTier(),
  ])

  // Q3 lancé immédiatement après Q1+Q2 résolus. On a maintenant tier ET user.id
  // sans aller-retour supplémentaire. INVARIANT : getUserTier() reste appelé
  // AVANT fetchSpots (Q4). home_department n'est pas sensible.
  const profile = tier !== 'anonymous' && user ? await fetchProfile(user.id) : null
  const homeDept = profile?.home_department ?? null

  // Filtres initiaux depuis l'URL
  const params = await searchParams
  const urlFilters = parseFiltersFromSearchParams(params)

  // ★ Sprint 89 — cadrage sur un spot précis, via ?lat=&lng=.
  //
  // Signalé par John : le bouton « Voir sur la carte » de la fiche spot pointait
  // sur `/carte` nu. Tu quittais Plage du Verdon pour atterrir sur la carte de
  // France entière, sans rien qui rappelle le spot que tu venais de lire. Le lien
  // fonctionnait techniquement et ne servait à rien.
  //
  // ⚠️ Sécurité GPS : la fiche passe `pubLat`/`pubLng`, c'est-à-dire la coordonnée
  // DÉJÀ floutée par `geom_public` puis arrondie à 3 décimales, celle qui est déjà
  // dans le HTML mis en cache. Aucune précision nouvelle n'est exposée, et ce
  // cadrage ne touche pas au gating : il déplace la caméra, il ne change pas quels
  // spots `fetchSpots` renvoie.
  const focus = parseFocus(params)

  // ★ `focus` (?lat=&lng=, venu de la fiche spot) est PRIORITAIRE sur le
  // departement de profil : si tu demandes explicitement a voir un spot, c'est ca
  // que tu veux voir, meme si ton departement d'attache est ailleurs.
  const initialCenter: [number, number] =
    focus ??
    (tier !== 'anonymous' && homeDept
      ? getCenterForDepartment(homeDept)
      : COASTAL_DEFAULT_CENTER)

  const initialZoom: number = focus
    ? 13
    : tier !== 'anonymous' && homeDept
      ? 9
      : COASTAL_DEFAULT_ZOOM

  // ⚠️ Sprint 80, Bloc 3 : sans département connu, on cadre par des BORNES, pas
  // par un centre et un zoom. Le zoom 6 sur [-2.5, 47.0] laissait la Méditerranée
  // hors champ en portrait 390 x 664, alors qu'elle pèse 44,6 % de l'inventaire
  // publié depuis le sprint 78. `fitBounds` dérive le zoom du ratio réel du
  // conteneur : le portrait et le paysage sont cadrés chacun correctement, ce
  // qu'une valeur en dur ne peut pas faire.
  // Un département détecté ou filtré garde la priorité (comportement inchangé).
  // Un cadrage explicite par `focus` l'emporte sur les bornes par defaut : sinon
  // `fitBounds` reprendrait la main et rejetterait la camera sur toute la France.
  const initialBounds =
    focus || (tier !== 'anonymous' && homeDept) ? undefined : COASTAL_DEFAULT_BOUNDS


  const isPaid = tier === 'local' || tier === 'itinerant'

  // Sécurité : les tiers gratuits ne peuvent pas filtrer via URL (bypass de la limite 3 spots/dept)
  const spotsRaw = await fetchSpots(tier, homeDept, isPaid ? urlFilters : {})

  // Merge des scores de qualité pré-calculés (markers colorisés)
  const scores = await fetchFreshScores(spotsRaw.map((s) => s.id))
  const spots = spotsRaw.map((s) => {
    const sc = scores.get(s.id)
    return { ...s, dayQuality: sc?.quality, dayScore: sc?.score }
  })

  // Départements disponibles pour le sélecteur itinérant
  const availableDepartments = [...new Set(spots.map((s) => s.department))].sort()
  // Espèces / sources réellement présentes parmi les spots chargés : pilotent les
  // chips de filtre et la légende (évite les chips/lignes fantômes à 0 résultat ;
  // les espèces réapparaissent automatiquement dès que le S53 les tague).
  const availableSpecies = [...new Set(spots.flatMap((s) => s.species))].sort()
  const availableSources = [...new Set(spots.map((s) => s.source).filter(Boolean))] as string[]

  // Ne restaure pas les filtres URL pour les tiers gratuits
  const initialFilters = isPaid ? urlFilters : {}

  // Bandeau upsell discovery
  const cookieStore = await cookies()
  const dismissedAt = cookieStore.get(UPSELL_COOKIE)?.value
  const isDismissed = dismissedAt
    ? Date.now() - parseInt(dismissedAt, 10) < SEVEN_DAYS_MS
    : false
  // Sprint 75 Bloc 1 : deux murs distincts, jamais les deux à la fois.
  // `discovery` (inscrit gratuit) → upsell abonnement, comportement inchangé.
  // `anonymous` (pas de compte) → bandeau d'inscription, zéro prix. Sa fermeture
  // est gérée par SignupBanner lui-même (cookie dédié, 7 jours).
  const wall = getWallKind(tier)
  const showUpsell = wall === 'upsell' && !isDismissed
  const showSignupBanner = wall === 'signup'

  return (
    <>
      {/* h1 invisible : la carte n'a pas de titre visible (audit axe « page-has-heading-one ») */}
      <h1 className="sr-only">Carte des spots de pêche</h1>
      <MapShell
        spots={spots}
        userTier={tier}
        initialCenter={initialCenter}
        initialZoom={initialZoom}
        initialBounds={initialBounds}
        showUpsell={showUpsell}
        showSignupBanner={showSignupBanner}
        initialFilters={initialFilters}
        userDepartment={homeDept ?? undefined}
        availableDepartments={availableDepartments}
        availableSpecies={availableSpecies}
        availableSources={availableSources}
      />
    </>
  )
}
