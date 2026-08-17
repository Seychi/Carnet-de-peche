import type { Metadata } from 'next'
import Link from 'next/link'
import { X } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { CatchForm } from '@/components/catches/CatchForm'
import { listMyGear } from '@/app/actions/gear'
import { AnalyticsIdentify } from '@/components/analytics/AnalyticsIdentify'
import { buildLoginRedirect } from '@/lib/auth/redirect'

// ─── /carnet/nouvelle ─────────────────────────────────────────────────────────
// Sprint 77, Bloc 7 : cette route est SORTIE du groupe (app). Elle garde son URL
// et son rendu (le shell app la servait déjà « nue », cf AppShell.BARE_PREFIXES),
// mais elle n'est plus derrière le garde d'authentification du groupe : un
// visiteur SANS COMPTE doit pouvoir remplir sa prise, et ne se voir demander le
// compte qu'au moment de l'enregistrer.
//
// ⚠️ Le mode anonyme exige un `spot_id` : le brouillon (cookie) ne transporte
// aucune coordonnée, c'est le spot qui porte le lieu. Sprint 79, Bloc 3 : sans
// spot, on ne redirige plus vers la connexion (voir `ChoisirUnSpot` : la
// redirection dégénérait en saut client à 6 secondes), et le `spot_id` accepte
// désormais un slug autant qu'un uuid.
// ⚠️ Aucune ligne n'est créée en base pour un anonyme : cette page ne fait que
// des lectures publiques (get_spot_by_id, déjà ouverte à `anon` et gatée au tier).

// ⚠️ SEO : cette route devient atteignable par un robot depuis le sprint 77
// (avant, elle répondait une redirection vers la connexion). C'est un
// formulaire, pas du contenu : on le sort explicitement de l'index pour ne pas
// créer une nuée de pages fines `?spot_id=…` à côté des vraies fiches de spots.
export const metadata: Metadata = {
  title: 'Nouvelle prise — Carnet de Pêche',
  robots: { index: false, follow: false },
}

type SpotRow = {
  id: string
  name: string
  slug: string
  department: string
  lat: number
  lng: number
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

type SpotRpcRow = { id: unknown; name: unknown; slug: unknown; department: unknown; lat: unknown; lng: unknown }

function toSpotRow(row: SpotRpcRow): SpotRow {
  return {
    id: String(row.id),
    name: String(row.name),
    slug: String(row.slug),
    department: String(row.department).trim(),
    lat: Number(row.lat),
    lng: Number(row.lng),
  }
}

/**
 * Résout le `?spot_id=` de l'URL, qu'il porte un UUID ou un SLUG.
 *
 * ⚠️ SPRINT 79, Bloc 3 — mesuré le 15/08 : `?spot_id=cap-de-la-croisette-osm8811707251`
 * (un slug) envoyait le visiteur sur la page de connexion, silencieusement. La
 * cause : `get_spot_by_id` attend un uuid, un slug le fait échouer, `spot` valait
 * donc `null`, et le cas « anonyme sans spot » redirigeait. Un slug est pourtant
 * la forme la plus naturelle à partager ou à recopier, et c'est celle que porte
 * l'URL de la fiche d'où le visiteur vient. On accepte donc les deux.
 */
async function fetchSpot(spotIdOrSlug: string): Promise<SpotRow | null> {
  const supabase = await createClient()

  if (UUID_RE.test(spotIdOrSlug)) {
    const { data, error } = await supabase.rpc('get_spot_by_id', { p_id: spotIdOrSlug })
    if (!error && data && data.length > 0) return toSpotRow(data[0])
    return null
  }

  const { data, error } = await supabase.rpc('get_spot_by_slug', { p_slug: spotIdOrSlug })
  if (error || !data || data.length === 0) return null
  return toSpotRow(data[0])
}

/**
 * Anonyme arrivé SANS spot (lien partagé, historique, saisie directe, menu).
 *
 * ⚠️ SPRINT 79, Bloc 3 — ce cas faisait un `redirect()` vers la connexion. Le
 * défaut n'était pas la redirection en soi, c'était SA FORME : cette route
 * stream derrière `loading.tsx`, donc Next avait déjà émis un 200 et le
 * `<head>` (« Nouvelle prise ») avant que le `redirect()` ne soit atteint. Il ne
 * pouvait plus répondre 307 : il l'injectait dans le flux, en redirection
 * CÔTÉ CLIENT. Mesuré en production le 15/08 : titre « Nouvelle prise », puis
 * bascule sur « Connexion » ~6 secondes plus tard. Le visiteur voyait le
 * squelette du formulaire, puis se faisait éjecter sur un mur de connexion, sur
 * une page qui lui promet « Remplis d'abord, le compte vient après ».
 *
 * Pourquoi un écran plutôt qu'un formulaire vide : le brouillon est un cookie
 * qui ne porte AUCUNE coordonnée, à dessein (cf lib/drafts/schema.ts, invariant
 * RGPD du sprint 77). C'est le spot qui porte le lieu. Rendre ici un formulaire
 * sans spot afficherait un « Créer mon carnet et enregistrer » qui ne peut RIEN
 * enregistrer : le pire des deux mondes, exactement le défaut du Bloc 4. On dit
 * donc ce qui manque, et on donne le chemin le plus court pour l'obtenir.
 */
function ChoisirUnSpot() {
  return (
    <main id="main" className="min-h-screen bg-sand-50">
      <ModalHeader closeHref="/spots" closeLabel="Fermer et revenir à la liste des spots" />
      <div className="mx-auto max-w-2xl px-4 py-6">
        <div className="rounded-[14px] border border-teal-200 bg-teal-50 px-4 py-3">
          <p className="text-[13px] leading-relaxed text-teal-900">
            <span className="font-semibold">Choisis d&rsquo;abord ton spot.</span> Ta prise sera
            gardée en brouillon sur cet appareil, et le spot porte le lieu : c&rsquo;est la seule
            chose qu&rsquo;on te demande avant de commencer.
          </p>
        </div>
        <div className="mt-5 flex flex-col gap-3">
          <Link
            href="/spots"
            className="flex min-h-11 items-center justify-center rounded-xl bg-teal-500 px-4 text-[14px] font-semibold text-navy-950 transition-colors hover:bg-teal-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 focus-visible:ring-offset-2"
          >
            Trouver mon spot
          </Link>
          <Link
            href="/carte"
            className="flex min-h-11 items-center justify-center rounded-xl border border-ink-200 bg-white px-4 text-[14px] font-semibold text-ink-700 transition-colors hover:bg-sand-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 focus-visible:ring-offset-2"
          >
            Ouvrir la carte
          </Link>
        </div>
        <p className="mt-5 text-center text-[12px] text-ink-500">
          Tu as déjà un carnet ?{' '}
          <Link
            href={buildLoginRedirect('/carnet/nouvelle')}
            className="font-medium text-teal-600 underline underline-offset-2 hover:text-teal-700"
          >
            Connecte-toi
          </Link>{' '}
          pour loguer sans passer par une fiche.
        </p>
      </div>
    </main>
  )
}

function ModalHeader({ closeHref, closeLabel }: { closeHref: string; closeLabel: string }) {
  return (
    <header className="sticky top-0 z-40 bg-navy-950 text-white">
      <div className="mx-auto flex h-14 max-w-2xl items-center justify-between px-4">
        <h1 className="font-display text-[17px] font-semibold text-white">Nouvelle prise</h1>
        <Link
          href={closeHref}
          aria-label={closeLabel}
          className="flex size-11 items-center justify-center rounded-full text-white/80 transition-colors hover:bg-white/10 hover:text-white"
        >
          <X size={20} />
        </Link>
      </div>
    </header>
  )
}

export default async function NouvellePrisePage({
  searchParams,
}: {
  searchParams: Promise<{ spot_id?: string }>
}) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const { spot_id } = await searchParams
  const spot = spot_id ? await fetchSpot(spot_id) : null

  // ── Visiteur sans compte ────────────────────────────────────────────────
  if (!user) {
    if (!spot) {
      return <ChoisirUnSpot />
    }
    return (
      <main id="main" className="min-h-screen bg-sand-50">
        <ModalHeader
          closeHref={`/spots/${spot.slug}`}
          closeLabel={`Fermer et revenir à la fiche de ${spot.name}`}
        />
        <div className="mx-auto max-w-2xl px-4 py-6">
          <div className="mb-5 rounded-[14px] border border-teal-200 bg-teal-50 px-4 py-3">
            <p className="text-[13px] leading-relaxed text-teal-900">
              <span className="font-semibold">Remplis d&rsquo;abord, le compte vient après.</span>{' '}
              Ta prise est gardée en brouillon sur cet appareil. On te demandera de créer ton
              carnet au moment de l&rsquo;enregistrer, et elle y sera reportée telle quelle.
            </p>
          </div>
          <CatchForm mode="create" spotContext={spot} anonymousDraft gearItems={[]} />
        </div>
      </main>
    )
  }

  // Hint première fois : si l'utilisateur n'a encore aucune prise.
  const { count } = await supabase
    .from('catches_for_viewer')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', user.id)
  const isFirstCatch = (count ?? 0) === 0

  // Boîte à matériel (gear_items non archivés) pour le picker du form.
  const gearResult = await listMyGear()
  const gearItems = gearResult.ok ? gearResult.data : []

  return (
    <main id="main" className="min-h-screen bg-sand-50">
      {/* Hors du groupe (app) depuis le sprint 77 : son layout ne pose plus
          l'identité PostHog, on la rattache donc ici (idempotent côté SDK). */}
      <AnalyticsIdentify userId={user.id} />
      {/* Header modal navy (réf mobile.html 05) — le flow Loguer est plein écran */}
      <ModalHeader closeHref="/carnet" closeLabel="Fermer et revenir au carnet" />

      <div className="max-w-2xl mx-auto px-4 py-6">
        <div className="mb-5 flex items-center justify-between gap-3">
          <p className="font-mono text-[11.5px] font-medium uppercase tracking-[0.08em] text-ink-400">
            GPS + CONDITIONS AUTO-CAPTÉS
          </p>
          <Link href="/carnet/sortie" className="shrink-0 text-[12px] font-medium text-teal-600 hover:text-teal-700">
            Sorti bredouille ? →
          </Link>
        </div>

        {/* Hint première prise (sprint 25 WS-C) : on guide le tout premier log. */}
        {isFirstCatch && !spot && (
          <div className="mb-5 rounded-[14px] border border-teal-200 bg-teal-50 px-4 py-3">
            <p className="text-[13px] text-teal-900">
              <span className="font-semibold">Ta première prise.</span> Renseigne au moins l&rsquo;espèce, le
              lieu et la taille, la météo, la marée et les conditions sont captées automatiquement. Dès
              3 prises, ton carnet commence à te révéler tes tendances.
            </p>
          </div>
        )}

        <CatchForm
          mode="create"
          spotContext={spot ?? undefined}
          gearItems={gearItems}
        />
      </div>
    </main>
  )
}
