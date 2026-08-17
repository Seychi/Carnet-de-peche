import { cache } from 'react'
import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { Navigation, ArrowLeft, ChevronRight, AlertTriangle, BadgeCheck, Waves } from 'lucide-react'
import { createAnonClient } from '@/lib/supabase/anon'
import { buildLoginRedirect } from '@/lib/auth/redirect'
import { buildSignupHref } from '@/lib/gating/wall'
import type { NearbySpot } from '@/lib/spots/nearby'
import { SpotSignupCta } from '@/components/spots/SpotSignupCta'
import { NearbySpotsSection, type NearbyEntry } from '@/components/spots/NearbySpotsSection'
import { SpotUpLinks } from '@/components/spots/SpotUpLinks'
import SpotMiniMap from '@/components/spots/SpotMiniMap'
import SpotTodayBand from '@/components/spots/SpotTodayBand'
import { SignupWall } from '@/components/map/SignupBanner'
import SpotConditionsSection from '@/components/spots/SpotConditionsSection'
import { TideCalibrationNote } from '@/components/spots/TideCalibrationNote'
import { SpotCatchCard } from '@/components/spots/SpotCatchCard'
import { Bathy } from '@/components/ui-v2/bathy'
import { TagData } from '@/components/ui-v2/tag-data'
import {
  SpotViewerBootstrap,
  AuthedOnlyStatic,
} from '@/components/spots/viewer/SpotViewerBootstrap'
import {
  SpotViewerProvider,
  AnonymousOnly,
} from '@/components/spots/viewer/SpotViewerProvider'
import {
  SpotCoordsLine,
  SpotItineraryLinks,
  SpotApproxNote,
  SpotPreciseGpsCard,
  SpotSubscribeUpsell,
  SpotFavoriteSlot,
  SpotConfirmSlot,
  SpotReportSlot,
  SpotTendenciesSlot,
  SpotExtraCatches,
  SpotActivityExtraRows,
  SpotWeekMarnageBand,
} from '@/components/spots/viewer/slots'
import { getAllGuides } from '@/lib/guides/loader'
import { relatedGuidesFor } from '@/lib/guides/related'
import { fetchSpotConditions } from '@/lib/conditions/spot-forecast'
import { isLowTidalRangeDepartment, getTideAccuracyChip, monthsAgo } from '@/lib/conditions/tide-calibration'
import { fetchSpotDepth, fetchSeabedSubstrate } from '@/lib/conditions/bathymetry'
import { buildSpotWeek, calibratedExtremumLabel, pickDates } from '@/lib/spots/week'
import {
  ANON_CATCHES,
  ANON_ACTIVITY_ROWS,
  roundCachedCoord,
  type ViewerCatch,
} from '@/lib/spots/viewer'
import { SpotBestMomentsSection } from '@/components/spots/SpotBestMomentsSection'
import { SpotActivitySection } from '@/components/spots/SpotActivitySection'
import { SpotRegulationCard } from '@/components/regulation/SpotRegulationCard'
import { SPECIES_LABELS, TECHNIQUE_LABELS, STRUCTURE_LABELS, HAZARDS_LABELS } from '@/lib/labels'
import { SPECIES_BY_DB_KEY } from '@/lib/seo/programmatic'
import { buildSpotTitleAB } from '@/lib/seo/spot-title'
import { buildSpotJsonLd } from '@/lib/seo/spot-jsonld'
import { DEPARTMENT_LABELS, departmentArticle } from '@/lib/geo/departments'

// ═══════════════════════════════════════════════════════════════════════════════
// ★ SPRINT 84, Bloc 3 — CETTE PAGE SE REND TOUJOURS COMME UN VISITEUR ANONYME.
//
// Avant : la page appelait `auth.getUser()` et `getUserTier()`, plus quatre modules
// qui lisaient les cookies par la bande (`SpotActivitySection`, `spot-forecast`,
// `tide-calibration`, `scoring/personal`). Un seul de ces appels suffit à rendre la
// route DYNAMIQUE : `revalidate = 1800` était inerte, chaque visite recalculait
// marées, météo, bathymétrie et solunar, et le TTFB mesuré était de 1 247 ms sur la
// page qui porte 80 % des clics Google.
//
// Maintenant : tout le rendu serveur passe par `createAnonClient()` (client Supabase
// SANS cookies). La page est donc pré-rendue et mise en cache, et le HTML servi est
// EXACTEMENT celui d'un visiteur sans compte — celui de Googlebot et de tout le
// trafic SEO.
//
// 🔒 Pourquoi c'est sûr : le gating vit dans la BASE, pas ici. Sans cookie,
// `auth.uid()` est NULL, donc `get_spot_by_slug` et `nearby_spots` (SECURITY
// DEFINER, gatées sur `current_tier`) renvoient le centroïde de `geom_public`
// (~500-900 m) et `is_precise = false`, et les colonnes `spots.geom`/`catches.geom`
// restent illisibles (verrous de colonne 028b/041). Le rendu serveur ne PEUT donc
// pas obtenir une coordonnée précise, même en le voulant.
//
// ⚠️ Ce que ça impose : tout ce qu'un visiteur CONNECTÉ voit en plus (coordonnée
// exacte, favori, confirmation, frise 7 jours, prises complètes, tendances perso)
// arrive après hydratation, en un aller-retour, via `/api/spots/[slug]/viewer`.
// Rien n'a été retiré au produit : cf `components/spots/viewer/`.
//
// ⚠️ Et ce qu'il ne faut PLUS jamais faire ici : importer `@/lib/supabase/server`,
// `next/headers`, `getUserTier()` ou tout module qui les atteint. Le verrou
// `__tests__/spot-page-is-static.test.ts` échoue si ça revient.
// ═══════════════════════════════════════════════════════════════════════════════

// ─── Types ────────────────────────────────────────────────────────────────────

type SpotDetail = {
  id: string
  name: string
  slug: string
  department: string
  region: string
  lng: number
  lat: number
  is_precise: boolean
  techniques: string[]
  species: string[]
  structure: string | null
  difficulty: number | null
  description: string | null
  access_notes: string | null
  hazards: string[] | null
  visibility: string
  verified: boolean
  /** Date de vérification manuelle de la coordonnée (timestamptz). Null si jamais vérifié. */
  verified_at: string | null
  /** Niveau de vérification (migration 083) : 'communaute' | 'ambassadeur' | 'equipe' | null. */
  verification_level: string | null
  source: string
  created_at: string
}

/** Prise publique. Type partagé avec le delta connecté (`lib/spots/viewer`). */
type PublicCatch = ViewerCatch

// ─── Data fetching ─────────────────────────────────────────────────────────────

const getSpotBySlug = cache(async (slug: string): Promise<SpotDetail | null> => {
  const supabase = createAnonClient()
  const { data, error } = await supabase.rpc('get_spot_by_slug', { p_slug: slug })
  if (error || !data || data.length === 0) return null
  const row = data[0]
  return {
    ...row,
    department: String(row.department).trim(),
    structure: row.structure ?? null,
    difficulty: row.difficulty ?? null,
    description: row.description ?? null,
    access_notes: row.access_notes ?? null,
    hazards: row.hazards ?? null,
    // Date de vérification (migration 075). verified_by reste fermé côté client.
    verified_at: row.verified_at ?? null,
    // Niveau de vérification (migration 083) : communaute / ambassadeur / equipe.
    verification_level: row.verification_level ?? null,
  } as SpotDetail
})

async function fetchRecentCatches(spotId: string): Promise<PublicCatch[]> {
  const supabase = createAnonClient()
  const { data } = await supabase
    .from('catches_for_viewer')
    .select('id, species, size_cm, weight_g, caught_at, username, display_name')
    .eq('spot_id', spotId)
    .eq('privacy', 'public')
    .order('caught_at', { ascending: false })
    .limit(5)
  return (data ?? []) as PublicCatch[]
}

async function fetchCatchCount(spotId: string): Promise<number> {
  const supabase = createAnonClient()
  const { count } = await supabase
    .from('catches_for_viewer')
    .select('id', { count: 'exact', head: true })
    .eq('spot_id', spotId)
    .eq('privacy', 'public')
  return count ?? 0
}

// ─── Maillage spot → spot (sprint 76, Bloc 10) ───────────────────────────────

/**
 * Spots proches, via la RPC `nearby_spots` (SECURITY DEFINER, migration 004/024).
 * Elle filtre `moderation_status='approved'` + la visibilité, et ne renvoie
 * AUCUNE coordonnée : la `distance_m` d'un non-abonné est calculée depuis le
 * centroïde de `geom_public`, jamais depuis `geom`.
 *
 * ⚠️ Depuis la migration 110 (sprint 77) elle se termine par
 * `where tier <> 'anonymous' or rn <= 3` : seul un visiteur ANONYME reste
 * plafonné à 3 voisins, quel que soit le rayon. Comme l'anonyme porte tout le
 * trafic SEO, le repli départemental ci-dessous reste le cas courant sur les
 * pages indexées. Un compte gratuit, lui, reçoit désormais de vrais voisins.
 */
async function fetchNearbySpots(
  lat: number,
  lng: number,
  excludeId: string,
): Promise<NearbySpot[]> {
  const supabase = createAnonClient()
  const { data } = await supabase.rpc('nearby_spots', {
    lat,
    lng,
    radius_km: NEARBY_RADIUS_KM,
  })
  return ((data ?? []) as NearbySpot[]).filter((s) => s.id !== excludeId)
}

/**
 * Repli : autres spots du même département. Passe par la RLS (`spots_select_visible`
 * impose `moderation_status='approved' AND visibility='public'` à `anon`), donc
 * aucun lien mort possible. `geom` n'est pas lisible par `anon` et n'est pas
 * demandé ici : le SELECT ne porte que des colonnes publiques.
 */
/**
 * Hash déterministe (FNV-1a 32 bits) d'un slug. Stable entre deux rendus et
 * entre deux machines : c'est ce qui permet de faire varier le maillage SANS
 * rendre la page non déterministe (un tirage aléatoire produirait un HTML
 * différent à chaque revalidation, et Google verrait des liens qui dansent).
 */
function slugHash(slug: string): number {
  let h = 0x811c9dc5
  for (let i = 0; i < slug.length; i++) {
    h ^= slug.charCodeAt(i)
    h = Math.imul(h, 0x01000193) >>> 0
  }
  return h >>> 0
}

async function fetchDepartmentSpots(
  department: string,
  excludeId: string,
  originSlug: string,
): Promise<{ id: string; slug: string; name: string; species: string[] }[]> {
  const supabase = createAnonClient()
  const { data } = await supabase
    .from('spots')
    .select('id, slug, name, species')
    .eq('visibility', 'public')
    .eq('moderation_status', 'approved')
    .eq('department', department)
    .neq('id', excludeId)
    .order('name', { ascending: true })
  const rows = (data ?? []) as { id: string; slug: string; name: string; species: string[] }[]

  // ─── Sprint 77, Bloc 5 tâche 2 : sortir le maillage de l'alphabet ──────────
  // Avant : `.order('name').limit(12)`. Tous les spots d'un département
  // pointaient donc vers les MÊMES voisins, ceux qui commencent par un A, et
  // seuls 217 des 416 spots (52 %) recevaient un lien entrant. Constaté en
  // direct sur Penvins, qui proposait Hoëdic et Belle-Île en remplissage.
  //
  // Après : la liste, toujours triée par nom (donc stable), est tournée d'un
  // décalage dérivé du hash du spot d'ORIGINE. Chaque fiche part donc d'un
  // endroit différent de l'alphabet, la couverture se répartit sur tout le
  // département, et le résultat reste parfaitement déterministe.
  //
  // Aucune migration : la donnée nécessaire était déjà là. Le `limit` SQL est
  // retiré parce qu'il tronquait AVANT la rotation, ce qui l'aurait annulée ;
  // un département plafonne à ~105 lignes de 4 colonnes courtes.
  //
  // ⚠️ MARGE DE `NEARBY_MAX + 6` (sprint 83, Bloc 2) : cette liste sert de
  // REMPLISSAGE après déduplication avec les voisins de `nearby_spots`, il en
  // faut donc plus que `NEARBY_MAX`. Un anonyme (tout le trafic SEO) reçoit au
  // plus 3 voisins depuis la migration 110 : 18 − 3 = 15 lignes survivent à la
  // déduplication, largement de quoi remplir les 12. Un abonné qui recevrait
  // beaucoup de voisins les consomme lui-même, donc la liste se remplit quand
  // même. La marge tient au passage de 6 à 12.
  if (rows.length === 0) return rows
  const offset = slugHash(originSlug) % rows.length
  return [...rows.slice(offset), ...rows.slice(0, offset)].slice(0, NEARBY_MAX + 6)
}

/** Jamais plus de 50 km : au-delà, « spots à proximité » devient un mensonge. */
const NEARBY_RADIUS_KM = 40
// Sprint 83, Bloc 2 : 6 → 12. Une fiche servait 6 liens sortants vers d'autres
// fiches, et c'est le nombre de liens internes reçus qui décide de la position
// d'une fiche sur une requête de nom de lieu. Passer à 12 double le maillage
// reçu par le département SANS toucher à `nearby_spots` (le plafond anonyme à 3
// reste un gating de tier, migration 110) : le besoin est un LIEN, pas une
// distance, et le repli départemental fournit slug + nom sans distance.
// 105 spots dans le 56 et 94 dans le 29 : les deux plus gros départements ont
// de quoi remplir. Les petits (59 : 3 spots, 14 : 4) servent ce qu'ils ont.
const NEARBY_MAX = 12

// ─── SEO & rendu ──────────────────────────────────────────────────────────────

/**
 * 30 minutes. À NE PAS augmenter dans ce sprint : la bande « conditions du jour »
 * (`SpotTodayBand`) annonce la prochaine pleine mer et le score du jour, deux
 * chiffres qui doivent rester justes à la demi-heure près.
 */
export const revalidate = 1800

/**
 * ★ Pré-génération VOLONTAIREMENT COURTE (sprint 84, Bloc 3).
 *
 * Il y a 607 fiches publiques approuvées. Les générer toutes au build voudrait dire
 * des milliers d'appels Open-Meteo (marée + météo + semaine) et EMODnet (bathymétrie)
 * en quelques minutes : le rate-limit ne tomberait pas sur une page, il CASSERAIT LE
 * BUILD. Les 10 fiches ci-dessous sont celles déjà identifiées comme sources de
 * trafic organique — elles sont chaudes dès le déploiement.
 *
 * `dynamicParams = true` : les 597 autres se génèrent à la PREMIÈRE visite puis
 * restent en cache 30 min. C'est déjà le modèle documenté de `/peche/[...slug]`.
 *
 * ⚠️ Ces 10 slugs ont été vérifiés en base le 17/08/2026 (approved + public).
 * Un slug disparu ne casse pas le build (la page rend un 404), mais il gaspille une
 * pré-génération : les revérifier si la curation renomme des spots.
 */
export const dynamicParams = true

export function generateStaticParams(): { slug: string }[] {
  return [
    'pointe-du-grand-minou',
    'jetees-de-dieppe',
    'digues-de-sausset-les-pins',
    'pointe-de-penmarch',
    'chenal-de-l-aa-gravelines',
    'pointe-du-conguel',
    'pointe-de-penvins',
    'pointe-de-kerpenhir',
    'pointe-de-trefeuntec-plonevez-porzay',
    'pointe-de-mousterlin',
  ].map((slug) => ({ slug }))
}

const BASE_URL = 'https://www.carnet-de-peche.com'

export async function generateMetadata(
  { params }: { params: Promise<{ slug: string }> }
): Promise<Metadata> {
  const { slug } = await params
  const spot = await getSpotBySlug(slug)
  if (!spot) return { title: 'Spot introuvable — Carnet de Pêche' }

  const structureLabel = (spot.structure && STRUCTURE_LABELS[spot.structure]) ?? 'Spot'
  const speciesLabels = spot.species.map((s) => SPECIES_LABELS[s] ?? s)
  const topSpecies = speciesLabels.slice(0, 3).join(', ')
  const deptKey = String(spot.department).trim()
  const canonicalUrl = `${BASE_URL}/spots/${spot.slug}`

  // Sprint 76, Bloc 5 : les titres servis faisaient 66 à 90 caractères (Google
  // coupe vers 60) et cumulaient DEUX tirets cadratins, celui du gabarit et
  // celui déjà présent dans `spot.name`. Gabarit + dégradation dans lib/seo/spot-title,
  // testés sur les 416 spots réels. La description, l'OG et le Twitter card ne bougent pas.
  //
  // Sprint 83, Bloc 1 : le titre est désormais un A/B RÉEL entre deux gabarits.
  // Cohorte A = « Pêche à {commune} ({dept}) : {espèces} » (inchangé). Cohorte B =
  // « {commune} ({dept}) : marée du jour et spot de pêche », servie aux seuls
  // départements à marée calibrée, parce que les gens cherchent la marée PAR NOM DE
  // SPOT (« maree pen lan », « marée rostiviec » : 54 impressions, 0 clic) et que le
  // mot « marée » n'existait que dans la meta description.
  //
  // ⚠️ L'affectation est un hash PUR du slug, donc identique à chaque rendu : un
  // titre qui varierait d'un rendu à l'autre ferait voir à Google un site instable.
  // Ni cookie, ni aléatoire, ni PostHog. Cohortes figées dans docs/sprint-83/AB-MAREE.md,
  // verdict à J+21, pas avant : cf le plan de mesure du brief.
  const { title } = buildSpotTitleAB({
    slug: spot.slug,
    name: spot.name,
    department: deptKey,
    speciesLabels,
  })
  const description = `${structureLabel} pour pêcher ${topSpecies} ${departmentArticle(deptKey, 'dans')}. Conditions, marées et techniques recommandées.`.slice(0, 158)
  const ogDescription = spot.description
    ? `${spot.description.slice(0, 150)}${spot.description.length > 150 ? '…' : ''}`
    : description

  return {
    title,
    description,
    openGraph: {
      title: `${spot.name} — Spot de pêche ${structureLabel.toLowerCase()}`,
      description: ogDescription,
      url: canonicalUrl,
      images: [{ url: `/og/spot/${spot.slug}`, width: 1200, height: 630 }],
      type: 'website',
    },
    twitter: {
      card: 'summary_large_image',
      title: spot.name,
      description: topSpecies,
      images: [`/og/spot/${spot.slug}`],
    },
    alternates: {
      canonical: canonicalUrl,
    },
  }
}

// ─── Helpers ────────────────────────────────────────────────────────────────

/** Date FR courte « JJ/MM » d'une vérification de coordonnée (D3 : date seule). */
function formatVerifiedDate(iso: string | null): string | null {
  if (!iso) return null
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return null
  return d.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' })
}

/** Fraîcheur relative « il y a N mois » de la vérification (WS C). null si < 1 mois. */
function formatVerifiedFreshness(iso: string | null): string | null {
  const m = monthsAgo(iso)
  if (m == null || m < 1) return null
  return `il y a ${m} mois`
}

// Niveau de vérification gradué (migration 083, WS B). En prod, verification_level
// ne vaut jamais que 'equipe' (ou null). Les niveaux 'communaute'/'ambassadeur' ont
// été retirés au sprint 53 (code mort, jamais atteint, honnêteté) : ils reviendront
// avec leur câblage réel dans un sprint communauté. Le fallback côté lecture couvre null.
// L'info passe par le libellé + l'icône (forme), jamais la couleur seule (daltonisme).
const VERIFICATION_LEVELS: Record<
  string,
  { label: string; legend: string }
> = {
  equipe: {
    label: 'Vérifié par l’équipe',
    legend: 'Coordonnée pointée et contrôlée à la main par l’équipe.',
  },
}

/** Compteur de confirmations (D2) via RPC qui ne renvoie QU'un nombre (jamais qui). */
async function fetchConfirmationCount(spotId: string): Promise<number> {
  const supabase = createAnonClient()
  const { data } = await supabase.rpc('get_spot_confirmation_count', { p_spot_id: spotId })
  return typeof data === 'number' ? data : 0
}

// Sprint 84, Bloc 3 : `fetchViewerConfirmed` et `fetchViewerFavorite` ont disparu
// d'ici. Ces deux lectures dépendent de l'utilisateur courant, elles n'ont donc rien
// à faire dans un rendu mis en cache et servi à tout le monde. Elles vivent
// désormais dans `app/api/spots/[slug]/viewer/route.ts`, appelée après hydratation
// avec la session réelle (RLS `own` inchangée).

/**
 * Nombre de prises publiques loguées DEPUIS la vérification (WS C). Agrégé via la RPC
 * k-anon get_spot_activity (lecture catches_for_viewer : privacy + floutage appliqués,
 * AUCUNE coordonnée renvoyée), avec p_days = nombre de jours depuis verified_at.
 */
async function fetchCatchesSinceVerified(
  spotId: string,
  verifiedAt: string | null,
): Promise<number | null> {
  if (!verifiedAt) return null
  const verifiedDate = new Date(verifiedAt)
  if (Number.isNaN(verifiedDate.getTime())) return null
  const days = Math.ceil((Date.now() - verifiedDate.getTime()) / (24 * 60 * 60 * 1000))
  if (days <= 0) return 0
  const supabase = createAnonClient()
  const { data } = await supabase.rpc('get_spot_activity', { p_spot_id: spotId, p_days: days })
  const row = Array.isArray(data) ? data[0] : data
  return row?.catches_count ?? 0
}

// ─── Sub-components ──────────────────────────────────────────────────────────

function DifficultyStars({ difficulty }: { difficulty: number | null }) {
  const d = difficulty ?? 0
  // role="img" requis : un span sans rôle ne peut pas porter aria-label
  return (
    <span role="img" className="flex items-center gap-0.5" aria-label={`Difficulté ${d} sur 5`}>
      {[1, 2, 3, 4, 5].map((n) => (
        <span key={n} className={n <= d ? 'text-gold-500' : 'text-white/20'} aria-hidden>★</span>
      ))}
    </span>
  )
}


// La carte de prise vit dans `components/spots/SpotCatchCard.tsx` depuis le sprint 84 :
// le HTML statique n'en sert que 2 (palier anonyme), les suivantes sont rendues côté
// client pour un connecté, et les deux chemins doivent produire le même balisage.

function RecentCatchesSection({
  catches, totalCount, ctaHref, extraSlot,
}: {
  catches: PublicCatch[]
  totalCount: number
  ctaHref: string
  /** Prises au-delà du palier anonyme, montées après hydratation. */
  extraSlot?: React.ReactNode
}) {
  return (
    <section className="bg-white rounded-[18px] border border-sand-200 p-5 md:p-7">
      <div className="flex items-center justify-between mb-5">
        <h2 className="font-display text-navy-900 text-xl">Prises récentes</h2>
        {totalCount > 0 && (
          <span className="text-xs text-ink-500">
            {totalCount} prise{totalCount > 1 ? 's' : ''} au total
          </span>
        )}
      </div>

      {catches.length === 0 ? (
        <div className="text-center py-8">
          <p className="text-ink-500 text-sm mb-4">
            Sois le premier à loguer une prise ici
          </p>
          <Link
            href={ctaHref}
            className="inline-block px-5 py-2.5 bg-teal-500 hover:bg-teal-400 text-navy-950 text-sm font-semibold rounded-xl transition-colors"
          >
            Loguer ma prise
          </Link>
        </div>
      ) : (
        <>
          <div className="flex gap-3 overflow-x-auto pb-2 -mx-5 px-5 snap-x snap-mandatory md:grid md:grid-cols-2 md:overflow-visible md:mx-0 md:px-0 lg:grid-cols-3">
            {catches.map((c) => <SpotCatchCard key={c.id} c={c} />)}
            {extraSlot}
          </div>
          {totalCount > 5 && (
            <p className="text-xs text-ink-500 text-center mt-4">
              +{totalCount - 5} autre{totalCount - 5 > 1 ? 's' : ''} prise{totalCount - 5 > 1 ? 's' : ''}
            </p>
          )}
        </>
      )}
    </section>
  )
}

// ─── Page ────────────────────────────────────────────────────────────────────

export default async function SpotPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params

  // ⚠️ Aucune lecture d'auth ici, et il ne doit jamais y en avoir : cf le bandeau en
  // tête de fichier. Tout le rendu est celui d'un visiteur sans compte.
  const spot = await getSpotBySlug(slug)
  if (!spot) notFound()

  const deptKey = String(spot.department).trim()

  const [
    catches, catchCount, conditions, week, allGuides, depth, substrate,
    confirmationCount, catchesSinceVerified, tideChip,
  ] = await Promise.all([
    fetchRecentCatches(spot.id),
    fetchCatchCount(spot.id),
    fetchSpotConditions(spot.lat, spot.lng, new Date()).catch(() => null),
    // Semaine + calibration marée en un seul module, partagé avec
    // /api/spots/[slug]/viewer pour que les deux chemins donnent le même jour 1.
    buildSpotWeek(spot.lat, spot.lng, deptKey).catch(() => null),
    getAllGuides().catch(() => []),
    fetchSpotDepth(spot.lat, spot.lng).catch(() => null),
    fetchSeabedSubstrate(spot.lat, spot.lng).catch(() => null),
    // WS B (D2) compteur confirmations ; WS C prises depuis vérif ; WS D chip
    // précision marées. Tous agrégés / sans coordonnée, donc mis en cache sans risque.
    fetchConfirmationCount(spot.id).catch(() => 0),
    fetchCatchesSinceVerified(spot.id, spot.verified_at).catch(() => null),
    getTideAccuracyChip(deptKey).catch(() => null),
  ])

  // ★ Coordonnée telle qu'elle part dans le HTML MIS EN CACHE : déjà floutée par
  // `geom_public` (~500-900 m), et arrondie à 3 décimales (~110 m) pour que
  // l'invariant « aucun nombre à plus de 3 décimales dans le HTML servi » soit
  // vérifiable par un test plutôt que par de la bonne volonté. La coordonnée exacte
  // d'un abonné n'est jamais arrondie : elle n'entre jamais ici.
  const pubLat = roundCachedCoord(spot.lat)
  const pubLng = roundCachedCoord(spot.lng)

  const loginHref = buildLoginRedirect(`/spots/${spot.slug}`)

  // Bloc 10 : maillage horizontal. 2e vague de requêtes (elles ont besoin de
  // spot.lat/lng, inconnus avant getSpotBySlug), mais les deux partent EN
  // PARALLÈLE l'une de l'autre. Toute erreur dégrade en silence : cette section
  // ne doit jamais casser la page qui fait 80 % des clics Google.
  const [nearbyRaw, deptSpots] = await Promise.all([
    fetchNearbySpots(spot.lat, spot.lng, spot.id).catch(() => []),
    fetchDepartmentSpots(deptKey, spot.id, spot.slug).catch(() => []),
  ])

  // Les spots proches d'abord (avec leur distance), complétés par le département
  // jusqu'à NEARBY_MAX. `nearby_spots` plafonne à 3 pour un anonyme : le repli
  // départemental est la norme sur les pages indexées, et c'est lui qui porte
  // l'essentiel des 12 liens depuis le sprint 83.
  const nearbySlugs = new Set(nearbyRaw.map((s) => s.slug))
  const nearbyEntries: NearbyEntry[] = [
    ...nearbyRaw.slice(0, NEARBY_MAX).map((s) => ({
      slug: s.slug,
      name: s.name,
      species: s.species ?? [],
      distanceM: s.distance_m,
    })),
    ...deptSpots
      .filter((s) => !nearbySlugs.has(s.slug))
      .map((s) => ({ slug: s.slug, name: s.name, species: s.species ?? [] })),
  ].slice(0, NEARBY_MAX)

  // Libellé honnête : « à moins de X km » seulement si la section est vraiment
  // faite de spots proches ; sinon on annonce le département.
  //
  // ⚠️ Sprint 83, Bloc 2 : le seuil était `>= 3` entrées à distance, ce qui était
  // FAUX et l'est devenu davantage. `nearby_spots` plafonne un anonyme (donc tout
  // le trafic Google) à 3 voisins : le seuil était satisfait par construction, et
  // le reste de la liste vient du remplissage départemental, qui n'a AUCUNE
  // contrainte de distance. Mesuré sur /spots/aber-wrach-sainte-marguerite : des
  // spots à 59, 87 et 118 km étaient servis sous le titre « à moins de 40 km ».
  // Passer NEARBY_MAX de 6 à 12 faisait passer ce mensonge de 3 à 9 entrées.
  // La promesse n'est tenue que si TOUTES les entrées portent une distance.
  const nearbyTitle =
    nearbyEntries.length > 0 && nearbyEntries.every((e) => e.distanceM != null)
      ? `Autres spots à moins de ${NEARBY_RADIUS_KM} km`
      : `Autres spots ${departmentArticle(deptKey, 'dans')}`

  // Guides liés au spot : espèces du spot d'abord, multi-espèces ensuite.
  const spotSpeciesLabels = new Set(
    spot.species.map((s) => SPECIES_LABELS[s] ?? s),
  )
  // Sprint 75 Bloc 4 : le commentaire ci-dessus décrivait déjà cette priorité, mais
  // l'ancien filter().slice(3) ne la faisait pas. Elle est désormais réelle et testée.
  const relatedGuideLinks = relatedGuidesFor(allGuides, spotSpeciesLabels)

  // ─── Sprint 77, Bloc 2 (inchangé) — la fiche sert TROIS profondeurs ─────────
  // Avant ce sprint-là, anonyme et compte gratuit recevaient exactement les mêmes
  // données : créer un compte ne débloquait RIEN ici, et les murs promettaient au
  // visiteur ce qu'il venait de recevoir (mur mesuré à 1,3 % de clic).
  //
  // ⚠️ RÈGLE QUI PRIME SUR TOUT : ce qu'un anonyme ne voit pas est ABSENT DU DOM,
  // jamais masqué en CSS ni retiré par JS. C'est la raison pour laquelle les
  // données sont tranchées ICI, avant d'être passées en props : `weekly` et
  // `tidesByDate` alimentent des composants CLIENT, donc tout ce qu'on leur passe
  // finit sérialisé dans le payload RSC du HTML servi, « masqué » ou pas. Un
  // simple `showWeek={false}` en aval aurait laissé les 7 jours dans la page.
  //
  // ⚠️ Le SOCLE reste servi à tout le monde, et c'est ce qui rend la coupure sûre
  // pour le référencement : description, espèces, dangers, accès, marée du jour,
  // score du jour, spots proches, BreadcrumbList. Le titre, le canonical et le
  // JSON-LD sont identiques aux trois paliers — aucun n'est calculé à partir du
  // palier (ils sont produits par `generateMetadata`, qui ne le lit pas). Bot et
  // humain reçoivent le même HTML : aucune branche sur le `user-agent`, jamais.
  //
  // ★ SPRINT 84, Bloc 3 : le rendu serveur est désormais TOUJOURS celui du palier
  // anonyme, puisqu'il n'a plus aucun moyen de savoir qui regarde. Les jours 2 à 7
  // ne sont donc plus jamais dans le HTML — la règle « absent du DOM » est même
  // rendue structurelle. Un visiteur CONNECTÉ récupère la semaine complète après
  // hydratation via `/api/spots/[slug]/viewer`, calculée par le MÊME module
  // (`lib/spots/week.ts`) et sur la MÊME coordonnée : le jour 1 ne bouge pas d'un
  // point de score entre l'avant et l'après-bascule.
  const weekly = week?.weekly ?? []
  const tideOffsetHours = week?.tideOffsetHours ?? 0

  const weeklyForView = weekly.slice(0, 1)
  // Les tables annexes sont réduites aux dates réellement rendues, sinon les
  // jours 2 à 7 repartiraient dans le payload par la bande.
  const viewDates = new Set(weeklyForView.map((d) => d.date))
  const weatherCodesForView = pickDates(week?.weatherCodes ?? {}, viewDates)
  const tidesByDateForView = pickDates(week?.tidesByDate ?? {}, viewDates)

  // ── Bande « conditions du jour » du premier écran (sprint 80, Bloc 1) ──────
  // Tout vient de données DÉJÀ chargées : `weekly` (calculé ligne ~521) et
  // `conditions` (chargé dans le Promise.all d'entrée). Aucune requête ajoutée.
  // Le score du jour est celui que la page sert déjà à un anonyme (`weeklyForView`
  // est tronqué à 1 jour pour lui) : le gating reste à UN seul endroit.
  const todayForecast = weeklyForView[0] ?? null

  // ⚠️ Méditerranée : pas d'argument de marée. Le marnage y est de quelques
  // centimètres, annoncer une pleine mer y serait un faux repère. Même règle que
  // le générateur de fiches du S78 et que l'encart de la ligne ~1135.
  const heroTide = (() => {
    if (isLowTidalRangeDepartment(deptKey)) return null
    const extrema = conditions?.tide?.extrema ?? []
    if (extrema.length === 0) return null
    // Le prochain extremum à venir ; à défaut (fin de journée), le dernier connu.
    const nowHour = new Date().getHours()
    const next = extrema.find((e) => e.hour >= nowHour) ?? extrema[extrema.length - 1]
    const points = conditions?.tide?.points ?? []
    return {
      label: calibratedExtremumLabel(points, next.hour, tideOffsetHours),
      kind: next.type,
    }
  })()

  /**
   * Palier anonyme : les 2 dernières prises seulement (sprint 77, Bloc 2). Les
   * suivantes sont montées après hydratation par `SpotExtraCatches` pour un
   * visiteur connecté — elles ne sont donc jamais dans le HTML mis en cache.
   */
  const catchesForView = catches.slice(0, ANON_CATCHES)

  // ⚠️ SPRINT 78, Bloc 1 — LA porte du Bloc 7 du sprint 77.
  //
  // Ce lien partait vers `/auth/login` pour un anonyme. Résultat mesuré à l'audit
  // du 14/08 : **zéro lien vers `/carnet/nouvelle` dans le HTML servi**, et les
  // trois appels à l'action de la fiche (« Logue ta prise ici », « Loguer ma
  // prise », « + Loguer une prise ici », qui consomment tous cette variable)
  // menaient au mur de connexion. Le bloc entier « on ne demande plus le compte
  // AVANT de donner » était donc construit, déployé, fonctionnel et
  // INATTEIGNABLE : le formulaire anonyme n'a été atteint pendant la QA qu'en
  // tapant l'URL à la main.
  //
  // La route `/carnet/nouvelle` est publique depuis le sprint 77 (sortie du
  // groupe (app) + liste blanche `PUBLIC_APP_ROUTES` du middleware), elle répond
  // 200 à un anonyme, et c'est elle qui demande le compte au moment
  // d'enregistrer. Le même lien sert donc désormais les deux paliers.
  //
  // Leçon d'audit à garder : le critère d'acceptation du sprint 77 était « la
  // route répond 200 », c'est-à-dire une DESTINATION. Il faut prouver le CHEMIN
  // (« il existe un lien cliquable vers X dans le HTML servi »), sinon on valide
  // une porte qui n'a pas de poignée.
  const ctaHref = `/carnet/nouvelle?spot_id=${spot.id}`

  // Les liens d'itinéraire sont rendus par `SpotItineraryLinks` (composant client) :
  // le HTML mis en cache porte la coordonnée publique arrondie, et un abonné voit ses
  // boutons pointer sur la position exacte une fois le delta reçu.

  const structureLabel = STRUCTURE_LABELS[spot.structure ?? ''] ?? spot.structure ?? ''

  // JSON-LD — tous les spots non-privés.
  //
  // 1. Place : INCHANGÉ (sprint 76). Coords toujours arrondies à 2 décimales
  //    (~1 km), et servies depuis `spot.lat/lng` qui sortent de get_spot_by_slug,
  //    donc DÉJÀ gatées au tier : pour un anonyme c'est le centroïde de
  //    `geom_public`, jamais `geom`. Aucune coordonnée ajoutée ici.
  // 2. BreadcrumbList : ajouté au Bloc 4. Sur 28 jours, GSC ne remonte qu'UNE
  //    impression de résultat enrichi, et la fiche de spot (80 % des clics)
  //    n'émettait qu'un `Place`, non éligible à l'affichage enrichi. Même format
  //    que /especes/[slug] : un TABLEAU d'objets, pas un @graph.
  const jsonLd = spot.visibility !== 'private'
    ? buildSpotJsonLd({
        name: spot.name,
        slug: spot.slug,
        description: spot.description,
        lat: pubLat,
        lng: pubLng,
        region: spot.region,
        deptKey,
        deptLabel: DEPARTMENT_LABELS[deptKey] ?? deptKey,
      })
    : null

  return (
    <SpotViewerProvider slug={spot.slug}>
    <div className="bg-sand-50 min-h-screen pb-20 md:pb-0">
      {/* ★ En TÊTE de page : masque les blocs [data-anon-only] avant la première
          peinture pour un visiteur qui a un cookie de session. Sans ça, un connecté
          verrait les murs d'inscription s'afficher puis disparaître, et tout le
          contenu remonterait d'un bloc. Voir components/spots/viewer/auth-hint.ts. */}
      <SpotViewerBootstrap />

      {jsonLd && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      )}

      {/* ── Hero navy-950 + isobathes (DA v2, réf spot.html) ─────────────── */}
      {/* Sprint 80, Bloc 1 : hauteur du hero resserrée sur MOBILE uniquement
          (les valeurs `md:` ne bougent pas), pour que la bande de conditions
          passe au-dessus de la pliure en 390 × 664. On rend la même chose, plus
          serré : aucun contenu retiré. */}
      <section className="relative overflow-hidden bg-navy-950 pt-5 pb-8 md:pt-10 md:pb-16">
        <Bathy opacity={0.35} />
        <div className="relative max-w-[1280px] mx-auto px-4 md:px-6">
          <nav className="mb-4 flex flex-wrap items-center gap-2 md:mb-6" aria-label="Fil d'ariane">
            <Link
              href="/spots"
              className="flex items-center gap-1 font-mono text-[11.5px] font-medium uppercase tracking-[0.08em] text-teal-300 transition-colors hover:text-white"
            >
              <ArrowLeft size={12} />
              Spots
            </Link>
            <ChevronRight size={12} className="text-white/30" />
            <TagData className="capitalize text-white/45">{spot.region}</TagData>
            <ChevronRight size={12} className="text-white/30" />
            <TagData className="text-white/45">
              {DEPARTMENT_LABELS[deptKey]?.toUpperCase() ?? 'DÉP.'} · {deptKey}
            </TagData>
          </nav>

          <div className="mb-2.5 flex flex-wrap items-start gap-2 md:mb-3">
            {/* Provenance (C2) : « Vérifié » réservé aux curés ; communautaire /
                importé portent leur propre badge (label + couleur distincte).
                Le badge ✓ = coordonnée vérifiée à la main (sprint 37). Niveau gradué
                (WS B, migration 083) : le libellé porte l'info, pas la couleur seule. */}
            {spot.verified && (
              <span className="rounded-full border border-teal-500/30 bg-teal-500/15 px-3 py-1 font-mono text-[11px] font-medium uppercase tracking-[0.08em] text-teal-300">
                ✓ {VERIFICATION_LEVELS[spot.verification_level ?? '']?.label ?? 'Coordonnée vérifiée'}
              </span>
            )}
            {spot.source === 'community' && (
              <span className="rounded-full border border-white/20 bg-white/10 px-3 py-1 font-mono text-[11px] font-medium uppercase tracking-[0.08em] text-white/65">
                Communautaire
              </span>
            )}
            {spot.source === 'imported' && (
              <span className="rounded-full border border-gold-500/30 bg-gold-500/10 px-3 py-1 font-mono text-[11px] font-medium uppercase tracking-[0.08em] text-gold-500/90">
                OpenStreetMap
              </span>
            )}
            {spot.visibility === 'subscriber' && (
              <span className="rounded-full border border-gold-500/35 bg-gold-500/15 px-3 py-1 font-mono text-[11px] font-medium uppercase tracking-[0.08em] text-gold-500">
                Premium
              </span>
            )}
            {/* Chip précision marées (WS D) : écart résiduel mesuré vs SHOM, rendu
                visible au moment de la décision. Données existantes (table calibrée),
                rien d'inventé : masqué pour les façades non auditées (Méditerranée). */}
            {tideChip && (
              <span className="inline-flex items-center gap-1 rounded-full border border-teal-500/30 bg-teal-500/10 px-3 py-1 font-mono text-[11px] font-medium uppercase tracking-[0.08em] text-teal-300">
                <Waves size={12} aria-hidden="true" />
                Marées ±{tideChip.residualMin} min · calé SHOM
              </span>
            )}
          </div>

          <div className="mb-2 flex items-start justify-between gap-3">
            <h1 className="font-display text-white">{spot.name}</h1>
            {/* Étoile favori (sprint 72) : tous tiers, base des alertes de la veille.
                Le HTML mis en cache porte la variante SANS COMPTE (brouillon en
                cookie, sprint 77 Bloc 7) ; l'état réel arrive après hydratation. */}
            <SpotFavoriteSlot
              spotId={spot.id}
              spotSlug={spot.slug}
              loginHref={loginHref}
            />
          </div>
          {/* ⚠️ SPRINT 80, Bloc 1 — la réponse d'abord, la limitation ensuite.
              Cette bande monte juste sous le <h1>, AVANT « zone approchée » et
              les étoiles de difficulté. On menait avec une limitation : « ZONE
              APPROCHÉE » était la première information de contenu que lisait un
              visiteur venu demander si ça mord. Elle reste sur la page, elle
              descend d'un cran.

              Zéro requête ajoutée : `conditions` et `todayForecast` sont déjà
              chargés plus haut pour les sections du bas de page. */}
          <SpotTodayBand
            tide={heroTide}
            waveHeightM={conditions?.waves?.height_m ?? null}
            windSpeedKmh={conditions?.weather?.wind_speed_kmh ?? null}
            windDirectionDeg={conditions?.weather?.wind_direction_deg ?? null}
            dayScore={todayForecast?.dayScore ?? null}
            dayQuality={todayForecast?.dayQuality ?? null}
          />

          {/* Le HTML mis en cache dit toujours « ZONE APPROCHÉE ». Un abonné à qui
              la BASE accorde la position exacte la reçoit après hydratation, dans
              le même élément (même hauteur, aucun décalage). */}
          <SpotCoordsLine structureLabel={structureLabel} />

          <div className="flex flex-wrap items-center gap-2">
            {structureLabel && (
              <span className="flex min-h-11 items-center rounded-full bg-white/10 px-3.5 text-sm text-white/60">
                {structureLabel}
              </span>
            )}
            <DifficultyStars difficulty={spot.difficulty} />
            {spot.species.slice(0, 3).map((s) => {
              const sl = SPECIES_BY_DB_KEY[s]
              const label = SPECIES_LABELS[s] ?? s
              return sl ? (
                <Link
                  key={s}
                  href={`/especes/${sl}`}
                  className="flex min-h-11 items-center rounded-full bg-teal-500/10 px-3.5 text-sm text-teal-300 transition-colors hover:bg-teal-500/20"
                >
                  {label}
                </Link>
              ) : (
                <span key={s} className="flex min-h-11 items-center rounded-full bg-teal-500/10 px-3.5 text-sm text-teal-300">
                  {label}
                </span>
              )
            })}
          </div>
        </div>
      </section>

      {/* ── Body ────────────────────────────────────────────────────────── */}
      <div className="max-w-[1280px] mx-auto px-4 md:px-6 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_340px] gap-8">

          {/* ── Colonne principale ─────────────────────────────────────── */}
          <div className="flex flex-col gap-6">

            {/* Carte mini + GPS */}
            <div>
              <div className="rounded-[18px] overflow-hidden border border-sand-200" style={{ height: 280 }}>
                <SpotMiniMap
                  id={spot.id}
                  slug={spot.slug}
                  name={spot.name}
                  lng={pubLng}
                  lat={pubLat}
                  isPrecise={false}
                  department={spot.department}
                  region={spot.region}
                  species={spot.species}
                  techniques={spot.techniques}
                  difficulty={spot.difficulty ?? 3}
                  structure={spot.structure}
                  verified={spot.verified}
                />
              </div>

              <div className="mt-3">
                <p className="flex items-center gap-1.5 text-xs font-medium text-ink-500 mb-1.5">
                  <Navigation size={14} className="text-teal-500" />
                  Itinéraire GPS
                </p>
                <SpotItineraryLinks lat={pubLat} lng={pubLng} />
                <Link
                  href="/carte"
                  className="mt-2 flex items-center justify-center min-h-[44px] rounded-xl border border-teal-400 bg-teal-50 text-navy-900 text-[13px] font-semibold hover:bg-teal-100 transition-colors"
                >
                  Voir sur la carte
                </Link>
              </div>

              <SpotApproxNote />
            </div>

            {/* Meilleurs moments — Sprint 77, Bloc 2.
                Anonyme : le score DU JOUR seul, qui reste indexable (contenu
                frais et unique, c'est la condition qui rend la coupure sûre).
                Compte gratuit et plus : la frise 7 jours.
                Les données sont déjà tranchées en amont : ce qui n'est pas
                autorisé n'entre jamais dans le payload RSC. */}
            {weeklyForView.length > 0 && (
              <SpotBestMomentsSection
                weekly={weeklyForView}
                spotName={spot.name}
                weatherCodes={weatherCodesForView}
                tidesByDate={tidesByDateForView}
                showWeek={false}
              />
            )}

            {weeklyForView.length > 0 && (
              <AnonymousOnly>
                <SignupWall
                  surface="spot_score"
                  spotName={spot.name}
                  redirectTo={`/spots/${slug}`}
                  compact
                  className="mt-4 p-5"
                  track={false}
                />
              </AnonymousOnly>
            )}

            {/* Tes tendances perso à ce spot (D-A1 : gratuit, descriptif).
                Absentes du HTML mis en cache par construction : ce sont TES prises. */}
            <SpotTendenciesSlot />

            {/* Conditions — Sprint 77, Bloc 2.
                La marée et la météo DU JOUR (`conditions`) restent servies à
                tout le monde : c'est du socle SEO. Seule la bande 7 jours
                passe au palier compte gratuit — et depuis le sprint 84 elle n'est
                plus jamais rendue côté serveur : `weekBandSlot` la monte après
                hydratation quand le delta connecté est arrivé. */}
            {conditions && (
              <SpotConditionsSection
                spotName={spot.name}
                lat={pubLat}
                lng={pubLng}
                conditions={conditions}
                weekBandSlot={<SpotWeekMarnageBand />}
                department={deptKey}
              />
            )}

            {conditions && (
              <AnonymousOnly>
                <SignupWall
                  surface="spot_tides"
                  spotName={spot.name}
                  redirectTo={`/spots/${slug}`}
                  compact
                  className="mt-4 p-5"
                  track={false}
                />
              </AnonymousOnly>
            )}

            {/* ── Mur d'inscription, DANS LE FLUX MOBILE (sprint 76, Bloc 2) ──
                Il vivait uniquement dans l'<aside>, donc tout en bas sur mobile,
                après les dangers, la météo et les marées, alors que 82 % du
                trafic est mobile. Ici il tombe juste après les conditions et
                les marées, c'est-à-dire après la valeur et avant le décrochage.

                C'est CETTE instance qui porte l'event `signup_wall_viewed` :
                elle est montée quel que soit le viewport (le `lg:hidden` ne
                masque qu'en CSS, l'effet de montage part quand même), donc on
                compte exactement UNE vue de mur par vue de page. L'instance de
                la sidebar est en `track={false}` pour ne pas doubler le
                dénominateur du taux de clic. */}
            <AnonymousOnly>
              <SignupWall
                surface="spot_page"
                spotName={spot.name}
                redirectTo={`/spots/${slug}`}
                className="lg:hidden p-5"
              />
            </AnonymousOnly>

            {/* Signal social 7 jours (masqué si aucune activité).
                Sprint 77, Bloc 2 : anonyme → les 2 dernières, puis une ligne
                « N autres prises déclarées ici » qui ouvre le mur. Le compteur
                agrégé reste public, le k-anonymat K=3 est inchangé. */}
            <SpotActivitySection
              spotId={spot.id}
              ctaHref={ctaHref}
              maxRecent={ANON_ACTIVITY_ROWS}
              signupHref={buildSignupHref(`/spots/${slug}`)}
              extraRowsSlot={<SpotActivityExtraRows />}
            />

            {/* Prises récentes (historique complet, tronqué au palier anonyme) */}
            <RecentCatchesSection
              catches={catchesForView}
              totalCount={catchCount}
              ctaHref={ctaHref}
              extraSlot={<SpotExtraCatches />}
            />

            {catches.length > catchesForView.length && (
              <AnonymousOnly>
                <SignupWall
                  surface="spot_catches"
                  spotName={spot.name}
                  redirectTo={`/spots/${slug}`}
                  compact
                  className="mt-4 p-5"
                  track={false}
                />
              </AnonymousOnly>
            )}

            {/* Description */}
            {spot.description && (
              <section className="bg-white rounded-[18px] border border-sand-200 p-6 md:p-7">
                <h2 className="font-display text-navy-900 text-xl mb-4">Description</h2>
                <p className="text-ink-700 leading-relaxed">{spot.description}</p>
              </section>
            )}

            {/* Accès */}
            {spot.access_notes && (
              <section className="bg-white rounded-[18px] border border-sand-200 p-6 md:p-7">
                <h2 className="font-display text-navy-900 text-xl mb-4">Accès</h2>
                <p className="text-ink-700 leading-relaxed">{spot.access_notes}</p>
              </section>
            )}

            {/* Autres spots (sprint 76, Bloc 10 — maillage horizontal).
                Rendu CÔTÉ SERVEUR, dans le HTML servi : un bloc de maillage
                interne monté au clic n'a aucune valeur pour le crawl. */}
            <NearbySpotsSection
              fromSlug={spot.slug}
              title={nearbyTitle}
              entries={nearbyEntries}
            />

            {/* Guides liés (sprint 10 Bloc 5 — maillage interne) */}
            {relatedGuideLinks.length > 0 && (
              <section className="bg-white rounded-[18px] border border-sand-200 p-6 md:p-7">
                <h2 className="font-display text-navy-900 text-xl mb-4">Guides liés</h2>
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {relatedGuideLinks.map((g) => (
                    <Link
                      key={g.slug}
                      href={`/guides/${g.slug}`}
                      className="group rounded-[14px] border border-sand-200 p-4 transition-colors hover:border-teal-500/40"
                    >
                      <p className="text-[14px] font-semibold leading-snug text-navy-900 group-hover:text-teal-700">
                        {g.title}
                      </p>
                      <TagData className="mt-1.5 block">
                        {g.category.toUpperCase()} · {g.readTime} MIN
                      </TagData>
                    </Link>
                  ))}
                </div>
              </section>
            )}
          </div>

          {/* ── Sidebar ────────────────────────────────────────────────── */}
          <aside className="flex flex-col gap-5">

            {/* Infos pratiques */}
            <div className="bg-white rounded-[18px] border border-sand-200 p-6">
              <h3 className="mb-4 font-mono text-[11.5px] font-medium uppercase tracking-[0.08em] text-ink-500">
                Infos pratiques
              </h3>
              <dl className="flex flex-col gap-3.5">
                {structureLabel && (
                  <div className="flex justify-between text-sm gap-4">
                    <dt className="text-ink-500 shrink-0">Structure</dt>
                    <dd className="font-medium text-navy-900 text-right">{structureLabel}</dd>
                  </div>
                )}
                <div className="flex justify-between text-sm items-center">
                  <dt className="text-ink-500">Difficulté</dt>
                  <dd className="flex gap-0.5">
                    {[1, 2, 3, 4, 5].map((n) => (
                      <span key={n} className={n <= (spot.difficulty ?? 0) ? 'text-gold-500' : 'text-ink-200'} aria-hidden>★</span>
                    ))}
                  </dd>
                </div>
                {spot.techniques.length > 0 && (
                  <div className="flex justify-between text-sm gap-4">
                    <dt className="text-ink-500 shrink-0">Techniques</dt>
                    <dd className="font-medium text-navy-900 text-right">
                      {spot.techniques.map((t) => TECHNIQUE_LABELS[t] ?? t).join(', ')}
                    </dd>
                  </div>
                )}
                {spot.species.length > 0 && (
                  <div className="flex justify-between text-sm gap-4">
                    <dt className="text-ink-500 shrink-0">Espèces</dt>
                    <dd className="font-medium text-navy-900 text-right">
                      {spot.species.map((s, i) => {
                        const sl = SPECIES_BY_DB_KEY[s]
                        const label = SPECIES_LABELS[s] ?? s
                        return (
                          <span key={s}>
                            {i > 0 ? ', ' : ''}
                            {sl ? (
                              <Link href={`/especes/${sl}`} className="hover:text-teal-700 hover:underline">
                                {label}
                              </Link>
                            ) : (
                              label
                            )}
                          </span>
                        )
                      })}
                    </dd>
                  </div>
                )}
              </dl>
            </div>

            {/* Coordonnée vérifiée (sprint 37 + 48) — munition anti-Decathlon : un spot
                vérifié = GPS fixe contrôlé à la main, pas un point communautaire
                qui bouge. L'info passe par l'icône (forme) + texte, pas la couleur
                seule (daltonisme). Niveau gradué (083) + fraîcheur relative (WS C) +
                prises confirmées depuis la vérif (agrégé k-anon, 0 coordonnée) +
                compteur de confirmations communautaires (D2). verified_by reste fermé. */}
            {spot.verified && (
              <div className="rounded-[18px] border border-teal-500/30 bg-teal-500/[0.06] p-6">
                <h3 className="mb-2 flex items-center gap-2 text-sm font-semibold text-teal-800">
                  <BadgeCheck size={18} className="text-teal-600" aria-hidden="true" />
                  {VERIFICATION_LEVELS[spot.verification_level ?? '']?.label ?? 'Coordonnée vérifiée à la main'}
                </h3>
                <p className="text-[13px] leading-relaxed text-ink-600">
                  {VERIFICATION_LEVELS[spot.verification_level ?? '']?.legend
                    ?? 'Ce point a été pointé et contrôlé à la main. C’est une coordonnée fixe, pas un point communautaire approximatif qui bouge d’une fois sur l’autre.'}
                </p>
                {/* Fraîcheur : date absolue (JJ/MM) + relatif « il y a N mois » (WS C). */}
                {formatVerifiedDate(spot.verified_at) && (
                  <p className="mt-2 font-mono text-[11px] text-teal-700">
                    Vérifié le {formatVerifiedDate(spot.verified_at)}
                    {formatVerifiedFreshness(spot.verified_at)
                      ? `, ${formatVerifiedFreshness(spot.verified_at)}`
                      : ''}
                  </p>
                )}
                {/* Prises confirmées depuis la vérification (WS C) : agrégé via la RPC
                    k-anon get_spot_activity, jamais une coordonnée. Masqué si 0. */}
                {catchesSinceVerified != null && catchesSinceVerified > 0 && (
                  <p className="mt-1 text-[12px] text-ink-600">
                    <span className="font-mono font-medium text-navy-900">{catchesSinceVerified}</span>{' '}
                    prise{catchesSinceVerified > 1 ? 's' : ''} loguée
                    {catchesSinceVerified > 1 ? 's' : ''} ici depuis la vérification.
                  </p>
                )}

                {/* Compteur de confirmations communautaires (D2) — descriptif, pas un
                    classement. Le compteur ne renvoie qu'un nombre (RPC), aucune
                    identité. Connecté → bouton confirmer/annuler ; sinon CTA login. */}
                <SpotConfirmSlot
                  spotId={spot.id}
                  initialCount={confirmationCount}
                  loginHref={loginHref}
                />

                {/* Signaler une erreur de position (WS A) — report sans coordonnée. */}
                <div className="mt-3 border-t border-teal-500/15 pt-3">
                  <SpotReportSlot spotId={spot.id} loginHref={loginHref} />
                </div>
              </div>
            )}

            {/* Signaler une erreur de position pour un spot NON vérifié (WS A) : le
                report d'erreur de coordonnée reste utile sur les points communautaires /
                importés qui n'ont pas d'encart « vérifié ». Sans coordonnée exposée. */}
            {!spot.verified && (
              <SpotReportSlot spotId={spot.id} loginHref={loginHref} />
            )}

            {/* Note marée Méditerranée / Corse (marnage faible, non auditée) : on
                explicite l'absence d'encart de calibration au lieu d'un blanc. */}
            {isLowTidalRangeDepartment(deptKey) && (
              <div className="rounded-[18px] border border-sand-200 bg-white p-6">
                <h3 className="mb-2 flex items-center gap-2 text-sm font-semibold text-navy-900">
                  <Waves size={18} className="text-teal-600" aria-hidden="true" />
                  Marées
                </h3>
                <p className="text-[13px] leading-relaxed text-ink-600">
                  Sur cette façade, le marnage est faible : la marée est surtout
                  météo-dominée (vent, pression). Les horaires de pleine et basse mer
                  comptent moins qu&apos;en Manche ou en Atlantique.
                </p>
              </div>
            )}

            {/* Précision marées (sprint 38, F3) — écart médian mesuré vs SHOM par
                façade, sourcé + daté. Honnête : affiché tel quel même > 15 min
                (D3 : précision mesurée seulement, aucun offset). Méditerranée et
                table vide → l'encart ne s'affiche pas. */}
            <TideCalibrationNote department={deptKey} />

            {/* Réglementation par espèce (sprint 24) — maille façade-aware + repères */}
            {spot.species.length > 0 && (
              <SpotRegulationCard department={deptKey} species={spot.species} />
            )}

            {/* Fond + profondeur (bathymétrie + nature du fond, EMODnet open data) */}
            {(depth || substrate) && (
              <div className="bg-white rounded-[18px] border border-sand-200 p-6">
                <h3 className="mb-3 font-mono text-[11.5px] font-medium uppercase tracking-[0.08em] text-ink-500">
                  Fond &amp; profondeur
                </h3>
                {depth && (
                  <p className="font-mono text-3xl font-bold leading-none text-navy-900">
                    ≈ {depth.depth_m} m
                  </p>
                )}
                {depth && depth.deep_m > depth.shallow_m && (
                  <p className="mt-2 text-sm text-ink-500">
                    Entre <span className="font-mono text-navy-900">{depth.shallow_m}</span> et{' '}
                    <span className="font-mono text-navy-900">{depth.deep_m}</span> m sur la zone
                  </p>
                )}
                {substrate && (
                  <p className={depth ? 'mt-3 text-sm text-ink-700' : 'text-sm text-ink-700'}>
                    Nature du fond :{' '}
                    <span className="font-medium text-navy-900">{substrate.label}</span>
                  </p>
                )}
                <p className="mt-2 text-[11px] text-ink-400">
                  Source {[depth?.source, substrate?.source].filter(Boolean).join(' · ')}
                </p>
              </div>
            )}

            {/* Dangers */}
            {spot.hazards && spot.hazards.length > 0 && (
              <div className="bg-red-50 border border-red-100 rounded-[18px] p-6">
                <h3 className="flex items-center gap-2 font-semibold text-red-800 text-sm mb-3 uppercase tracking-wide">
                  <AlertTriangle size={14} />
                  Dangers
                </h3>
                <ul className="flex flex-col gap-1.5">
                  {spot.hazards.map((h) => (
                    <li key={h} className="text-sm text-red-700 first-letter:uppercase">
                      {HAZARDS_LABELS[h] ?? h.replace(/_/g, ' ')}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* ── GPS / mur / upsell ──────────────────────────────────────
                Sprint 76, Bloc 2 : le mur d'inscription était rendu DANS la
                branche `!spot.is_precise`, comme ALTERNATIVE aux coordonnées.
                Il devient un bloc FRÈRE : le visiteur sans compte le voit quelle
                que soit la précision servie. La branche coordonnées et l'upsell
                abonnement des inscrits gratuits ne changent pas d'un octet. */}
            {/* GPS précis : jamais dans le HTML mis en cache. C'est la BASE qui
                décide (get_spot_by_slug + current_tier), le composant ne fait
                qu'afficher ce qu'elle a renvoyé au navigateur du visiteur. */}
            <SpotPreciseGpsCard />

            {/* Mur d'inscription, version sidebar (desktop). `track={false}` :
                l'instance de la colonne principale porte déjà l'event, sinon une
                seule vue de page en émettrait deux et le taux de clic serait
                mécaniquement divisé par deux. */}
            <AnonymousOnly>
              <SignupWall
                surface="spot_page"
                spotName={spot.name}
                tone="dark"
                track={false}
                redirectTo={`/spots/${slug}`}
                className="hidden lg:block p-6"
              />
            </AnonymousOnly>

            {/* Upsell abonnement : réservé aux INSCRITS gratuits sans coordonnée
                précise (règle sprint 75, réaffirmée au sprint 79 Bloc 5). Absent du
                HTML mis en cache : un visiteur sans compte ne doit jamais lire de
                prix, et c'est SA version qui est mise en cache. */}
            <SpotSubscribeUpsell />

            {/* CTA desktop */}
            <Link
              href={ctaHref}
              className="hidden md:block w-full py-3 bg-teal-500 hover:bg-teal-300 text-navy-950 font-semibold text-center rounded-xl transition-colors text-sm"
            >
              + Loguer une prise ici
            </Link>
          </aside>
        </div>

        {/* Liens remontants (sprint 83, Bloc 2) — la fiche ne maillait qu'à
            l'HORIZONTALE (spot → spot). Ce bloc la relie aux trois pages qui
            concentrent l'autorité : la landing du département, la fiche de
            l'espèce principale, et le guide de technique QUAND il existe.
            Placé sous la grille pour être en bas de page dans les deux
            colonnes ET sur mobile, où la colonne principale passe avant
            l'aside. SERVER COMPONENT : rendu dans le HTML servi, sans un octet
            de JS, jamais derrière un accordéon. Aucune coordonnée. */}
        <SpotUpLinks
          department={deptKey}
          species={spot.species}
          techniques={spot.techniques}
          guides={allGuides}
          className="mt-8"
        />
      </div>

      {/* ── CTA collant mobile ────────────────────────────────────────────
          Sprint 76, Bloc 2 : c'est le seul élément que 100 % des visiteurs
          mobiles voient. Pour un visiteur SANS COMPTE venu de Google,
          « + Loguer une prise ici » ne veut rien dire : il n'a ni compte ni
          prise. On lui propose ce qu'il est venu chercher. Connecté :
          strictement inchangé. */}
      {/* `sticky-bottom-bar` : sprint 78, Bloc 1. Tant que le bandeau de
          consentement est à l'écran, cette barre se range AU-DESSUS de lui au
          lieu d'être recouverte à 83 % et rendue inatteignable au doigt
          (règle dans app/globals.css, hauteur mesurée par CookieBanner). */}
      {/* Sprint 84, Bloc 3 : les DEUX variantes sont dans le HTML mis en cache, et
          c'est la CSS de pré-peinture qui choisit. La barre est en `position: fixed`,
          donc aucune variante ne pousse le contenu ; et garder le lien
          `/carnet/nouvelle` dans le document sert le crawl (leçon du sprint 78 :
          prouver le CHEMIN, pas seulement la destination).
          Le lien connecté est symétrique : `data-authed-only`, masqué par défaut par
          la même feuille de style de pré-peinture. Aucun des deux n'attend le
          delta réseau, la barre n'est donc jamais vide. */}
      <div className="sticky-bottom-bar md:hidden fixed bottom-0 left-0 right-0 z-20 bg-white/95 backdrop-blur-sm border-t border-sand-200 px-4 pt-3 pb-[max(12px,env(safe-area-inset-bottom))]">
        <AnonymousOnly>
          <SpotSignupCta href={buildSignupHref(`/spots/${slug}`)} spotName={spot.name} />
        </AnonymousOnly>
        <AuthedOnlyStatic>
          <Link
            href={ctaHref}
            className="flex items-center justify-center gap-2 w-full py-3 bg-teal-500 hover:bg-teal-300 text-navy-950 font-semibold rounded-xl transition-colors text-sm"
          >
            + Loguer une prise ici
          </Link>
        </AuthedOnlyStatic>
      </div>
    </div>
    </SpotViewerProvider>
  )
}
