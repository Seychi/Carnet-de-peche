import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
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
// aucune coordonnée, c'est le spot qui porte le lieu. Sans spot, le parcours
// reste EXACTEMENT celui d'avant (redirection vers la connexion).
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

async function fetchSpotById(spotId: string): Promise<SpotRow | null> {
  const supabase = await createClient()
  const { data, error } = await supabase.rpc('get_spot_by_id', { p_id: spotId })
  if (error || !data || data.length === 0) return null
  const row = data[0]
  return {
    id: String(row.id),
    name: String(row.name),
    slug: String(row.slug),
    department: String(row.department).trim(),
    lat: Number(row.lat),
    lng: Number(row.lng),
  }
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
  const spot = spot_id ? await fetchSpotById(spot_id) : null

  // ── Visiteur sans compte ────────────────────────────────────────────────
  if (!user) {
    if (!spot) {
      redirect(buildLoginRedirect('/carnet/nouvelle'))
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
