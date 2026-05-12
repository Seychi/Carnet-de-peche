import type { Metadata } from 'next'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { SpotFilters } from './spot-filters'
import { Lock, MapPin } from 'lucide-react'
import { Suspense } from 'react'

export const metadata: Metadata = {
  title: 'Spots de pêche à la canne du bord en France — Carnet de Pêche',
  description: "Annuaire des spots de pêche à la canne du bord en France. Filtres par département, espèce et technique. Scores d'activité communautaires.",
}

const SPECIES_LABELS: Record<string, string> = {
  bar: 'Bar',
  dorade_royale: 'Dorade royale',
  lieu_jaune: 'Lieu jaune',
  maquereau: 'Maquereau',
  sar: 'Sar',
  orphie: 'Orphie',
  vieille: 'Vieille',
}

const STRUCTURE_LABELS: Record<string, string> = {
  pointe_rocheuse: 'Pointe rocheuse',
  plage: 'Plage',
  digue: 'Digue',
  estuaire: 'Estuaire',
  cale: 'Cale',
  falaise: 'Falaise',
}

const DIFFICULTY_LABELS: Record<number, string> = {
  1: 'Facile',
  2: 'Accessible',
  3: 'Intermédiaire',
  4: 'Engagé',
  5: 'Expert',
}

type Spot = {
  id: string
  name: string
  slug: string
  department: string
  region: string
  species: string[]
  techniques: string[]
  structure: string
  difficulty: number
  description: string
  visibility: string
}

async function fetchSpots(dept: string, espece: string): Promise<Spot[]> {
  const supabase = await createClient()

  let query = supabase
    .from('spots')
    .select('id, name, slug, department, region, species, techniques, structure, difficulty, description, visibility')
    .order('name', { ascending: true })
    .limit(12)

  if (dept) {
    query = query.eq('department', dept)
  }
  if (espece) {
    query = query.contains('species', [espece])
  }

  const { data, error } = await query
  if (error) {
    console.error('fetchSpots error:', error.message)
    return []
  }
  return (data as Spot[]) ?? []
}

export default async function SpotsPage({
  searchParams,
}: {
  searchParams: Promise<{ dept?: string; espece?: string }>
}) {
  const { dept = '', espece = '' } = await searchParams
  const spots = await fetchSpots(dept, espece)

  return (
    <main>
      {/* Hero */}
      <section className="bg-navy-900 pt-16 pb-14">
        <div className="max-w-[1280px] mx-auto px-6">
          <h1 className="text-white font-display max-w-2xl">
            Les spots de pêche du bord en France
          </h1>
          <p className="mt-4 text-white/60 max-w-xl text-lg">
            Chaque spot est renseigné par la communauté. Filtre par département, espèce ou technique.
          </p>
          <p className="mt-5 inline-flex items-center gap-2 text-sm text-amber-400 bg-amber-400/10 border border-amber-400/20 px-4 py-2 rounded-full">
            <Lock size={14} />
            Coordonnées précises réservées aux abonnés Local / Itinérant
          </p>
        </div>
      </section>

      {/* Filtres */}
      <section className="bg-white border-b border-ink-100 py-5 sticky top-0 z-10">
        <div className="max-w-[1280px] mx-auto px-6">
          <Suspense>
            <SpotFilters />
          </Suspense>
        </div>
      </section>

      {/* Grille de spots */}
      <section className="bg-sand-50 py-12">
        <div className="max-w-[1280px] mx-auto px-6">
          {spots.length === 0 ? (
            <div className="text-center py-20 text-ink-500">
              <MapPin size={40} strokeWidth={1} className="mx-auto mb-4 text-ink-300" />
              <p className="font-semibold text-navy-900 mb-2">Aucun spot trouvé</p>
              <p className="text-sm">Essaie un autre filtre ou reviens bientôt — la base grossit chaque semaine.</p>
            </div>
          ) : (
            <>
              <p className="text-sm text-ink-500 mb-6">
                {spots.length} spot{spots.length > 1 ? 's' : ''} trouvé{spots.length > 1 ? 's' : ''}
                {dept && ` — Département ${dept}`}
                {espece && ` · ${SPECIES_LABELS[espece] ?? espece}`}
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
                {spots.map((spot) => (
                  <SpotCard key={spot.id} spot={spot} />
                ))}
              </div>
            </>
          )}
        </div>
      </section>

      {/* Mention abonnés */}
      <section className="bg-white py-12 border-t border-ink-100">
        <div className="max-w-[760px] mx-auto px-6 text-center">
          <Lock size={28} strokeWidth={1.5} className="text-teal-600 mx-auto mb-4" />
          <h2 className="font-display text-navy-900 text-2xl mb-3">
            Accède aux coordonnées précises
          </h2>
          <p className="text-ink-500 mb-6 text-sm leading-relaxed">
            Les spots affichent des coordonnées floutées à 1 km pour les utilisateurs gratuits. Avec un abonnement Local ou Itinérant, tu vois le GPS précis, le score d'activité et les filtres avancés.
          </p>
          <Link
            href="/tarifs"
            className="inline-block px-8 py-3 bg-navy-900 hover:bg-navy-800 text-white font-semibold rounded-[12px] transition-colors duration-200 text-sm"
          >
            Voir les formules
          </Link>
        </div>
      </section>
    </main>
  )
}

function SpotCard({ spot }: { spot: Spot }) {
  const isPremium = spot.visibility === 'subscriber'
  const topSpecies = spot.species.slice(0, 3)

  return (
    <Link
      href={`/spots/${spot.slug}`}
      className="group bg-white border border-ink-100 rounded-[18px] overflow-hidden hover:shadow-md hover:border-teal-500/30 transition-all duration-200 flex flex-col"
    >
      {/* Photo placeholder */}
      <div className="relative aspect-[4/3] bg-navy-800 flex items-center justify-center overflow-hidden">
        <MapPin size={32} strokeWidth={1} className="text-white/20" />
        {isPremium && (
          <span className="absolute top-3 right-3 bg-amber-500 text-white text-[10px] font-bold px-2 py-1 rounded-full">
            Premium
          </span>
        )}
        <span className="absolute bottom-3 left-3 bg-black/50 text-white text-[10px] font-medium px-2 py-1 rounded-full">
          {STRUCTURE_LABELS[spot.structure] ?? spot.structure}
        </span>
      </div>

      {/* Contenu */}
      <div className="p-4 flex flex-col gap-2 flex-1">
        <div>
          <p className="font-semibold text-navy-900 text-sm group-hover:text-teal-700 transition-colors">
            {spot.name}
          </p>
          <p className="text-xs text-ink-500 mt-0.5">
            Dép. {spot.department} · {DIFFICULTY_LABELS[spot.difficulty] ?? `Niveau ${spot.difficulty}`}
          </p>
        </div>

        {/* Espèces */}
        <div className="flex flex-wrap gap-1.5 mt-1">
          {topSpecies.map((s) => (
            <span
              key={s}
              className="text-[11px] bg-teal-500/10 text-teal-700 px-2 py-0.5 rounded-full font-medium"
            >
              {SPECIES_LABELS[s] ?? s}
            </span>
          ))}
        </div>

        {/* Score placeholder */}
        <div className="mt-auto pt-3 border-t border-ink-100 flex items-center justify-between">
          <span className="text-[11px] text-ink-400">Score d'activité</span>
          <span className="text-[11px] font-semibold text-ink-300">
            {isPremium ? '— (abonnés)' : '—'}
          </span>
        </div>
      </div>
    </Link>
  )
}
