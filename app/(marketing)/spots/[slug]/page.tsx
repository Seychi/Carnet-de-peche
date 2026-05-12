import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { MapPin, Lock, ArrowLeft, ChevronRight } from 'lucide-react'

const SPECIES_LABELS: Record<string, string> = {
  bar: 'Bar', dorade_royale: 'Dorade royale', lieu_jaune: 'Lieu jaune',
  maquereau: 'Maquereau', sar: 'Sar', orphie: 'Orphie', vieille: 'Vieille',
}

const TECHNIQUE_LABELS: Record<string, string> = {
  leurres: 'Leurres', surfcasting: 'Surfcasting', flottante: 'Flottante',
  vif: 'Vif', stickbait: 'Stickbait',
}

const STRUCTURE_LABELS: Record<string, string> = {
  pointe_rocheuse: 'Pointe rocheuse', plage: 'Plage', digue: 'Digue',
  estuaire: 'Estuaire', cale: 'Cale', falaise: 'Falaise',
}

type Spot = {
  id: string; name: string; slug: string; department: string; region: string
  species: string[]; techniques: string[]; structure: string; difficulty: number
  description: string; access_notes: string | null; hazards: string[]
  visibility: string; verified: boolean
}

async function fetchSpot(slug: string): Promise<Spot | null> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('spots')
    .select('id, name, slug, department, region, species, techniques, structure, difficulty, description, access_notes, hazards, visibility, verified')
    .eq('slug', slug)
    .single()
  if (error || !data) return null
  return data as Spot
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params
  const spot = await fetchSpot(slug)
  if (!spot) return { title: 'Spot introuvable — Carnet de Pêche' }
  return {
    title: `${spot.name} — Spot de pêche ${STRUCTURE_LABELS[spot.structure] ?? ''} · Carnet de Pêche`,
    description: spot.description,
  }
}

export default async function SpotPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const spot = await fetchSpot(slug)
  if (!spot) notFound()

  const isPremium = spot.visibility === 'subscriber'

  return (
    <main className="bg-sand-50 min-h-screen">
      <section className="bg-navy-900 pt-10 pb-14">
        <div className="max-w-[1280px] mx-auto px-6">
          <nav className="flex items-center gap-2 text-sm text-white/50 mb-6" aria-label="Fil d'ariane">
            <Link href="/spots" className="hover:text-white transition-colors flex items-center gap-1">
              <ArrowLeft size={14} />Spots
            </Link>
            <ChevronRight size={14} />
            <span className="capitalize">{spot.region}</span>
            <ChevronRight size={14} />
            <span>Dép. {spot.department}</span>
            <ChevronRight size={14} />
            <span className="text-white/80">{spot.name}</span>
          </nav>
          <div>
            <div className="flex items-center gap-3 flex-wrap mb-3">
              {spot.verified && (
                <span className="text-xs bg-teal-500/20 text-teal-400 border border-teal-500/30 px-3 py-1 rounded-full font-medium">✓ Spot vérifié</span>
              )}
              {isPremium && (
                <span className="text-xs bg-amber-500/20 text-amber-400 border border-amber-500/30 px-3 py-1 rounded-full font-medium">Premium</span>
              )}
            </div>
            <h1 className="text-white font-display">{spot.name}</h1>
            <div className="flex flex-wrap gap-2 mt-4">
              <span className="flex items-center gap-1.5 text-sm text-white/60 bg-white/10 px-3 py-1.5 rounded-full">
                <MapPin size={13} />Dép. {spot.department}
              </span>
              <span className="text-sm text-white/60 bg-white/10 px-3 py-1.5 rounded-full">
                {STRUCTURE_LABELS[spot.structure] ?? spot.structure}
              </span>
              {spot.species.slice(0, 3).map((s) => (
                <span key={s} className="text-sm text-teal-400 bg-teal-500/10 px-3 py-1.5 rounded-full">
                  {SPECIES_LABELS[s] ?? s}
                </span>
              ))}
            </div>
          </div>
        </div>
      </section>

      <div className="max-w-[1280px] mx-auto px-6 py-10">
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_340px] gap-8">
          <div className="flex flex-col gap-6">
            <div className="bg-white rounded-[18px] border border-ink-100 p-7">
              <h2 className="font-display text-navy-900 text-xl mb-4">Description</h2>
              <p className="text-ink-700 leading-relaxed">{spot.description}</p>
            </div>
            {spot.access_notes && (
              <div className="bg-white rounded-[18px] border border-ink-100 p-7">
                <h2 className="font-display text-navy-900 text-xl mb-4">Comment y accéder</h2>
                <p className="text-ink-700 leading-relaxed">{spot.access_notes}</p>
              </div>
            )}
            <div className="bg-white rounded-[18px] border border-ink-100 p-7">
              <h2 className="font-display text-navy-900 text-xl mb-4">Coordonnées GPS</h2>
              <div className="flex items-start gap-4 p-4 bg-amber-50 border border-amber-200 rounded-[12px]">
                <Lock size={20} className="text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-semibold text-amber-900">Coordonnées précises réservées aux abonnés</p>
                  <p className="text-xs text-amber-700 mt-1">Abonne-toi à Local ou Itinérant pour accéder au GPS précis.</p>
                  <Link href="/tarifs" className="inline-block mt-3 text-xs font-semibold text-amber-900 underline underline-offset-2">
                    Voir les formules →
                  </Link>
                </div>
              </div>
            </div>
            <div className="bg-white rounded-[18px] border border-ink-100 p-7">
              <h2 className="font-display text-navy-900 text-xl mb-4">Prises récentes</h2>
              <div className="text-center py-10 text-ink-400">
                <p className="text-sm">Les prises loguées par la communauté apparaîtront ici.</p>
                <Link href="/auth/login" className="inline-block mt-4 text-sm font-semibold text-teal-600 hover:text-teal-700">
                  Logue ta première prise →
                </Link>
              </div>
            </div>
          </div>

          <aside className="flex flex-col gap-5">
            <div className="bg-white rounded-[18px] border border-ink-100 p-6">
              <h3 className="font-semibold text-navy-900 text-sm mb-4 uppercase tracking-wide">Infos du spot</h3>
              <dl className="flex flex-col gap-3.5">
                <div className="flex justify-between text-sm">
                  <dt className="text-ink-500">Structure</dt>
                  <dd className="font-medium text-navy-900">{STRUCTURE_LABELS[spot.structure] ?? spot.structure}</dd>
                </div>
                <div className="flex justify-between text-sm">
                  <dt className="text-ink-500">Difficulté</dt>
                  <dd className="font-medium text-navy-900">{spot.difficulty} / 5</dd>
                </div>
                <div className="flex justify-between text-sm">
                  <dt className="text-ink-500">Techniques</dt>
                  <dd className="font-medium text-navy-900 text-right">{spot.techniques.map((t) => TECHNIQUE_LABELS[t] ?? t).join(', ')}</dd>
                </div>
                <div className="flex justify-between text-sm">
                  <dt className="text-ink-500">Espèces</dt>
                  <dd className="font-medium text-navy-900 text-right">{spot.species.map((s) => SPECIES_LABELS[s] ?? s).join(', ')}</dd>
                </div>
              </dl>
            </div>
            {spot.hazards && spot.hazards.length > 0 && (
              <div className="bg-red-50 border border-red-100 rounded-[18px] p-6">
                <h3 className="font-semibold text-red-800 text-sm mb-3 uppercase tracking-wide">⚠ Dangers</h3>
                <ul className="flex flex-col gap-1.5">
                  {spot.hazards.map((h) => (
                    <li key={h} className="text-sm text-red-700 capitalize">{h.replace(/_/g, ' ')}</li>
                  ))}
                </ul>
              </div>
            )}
            <div className="bg-navy-900 rounded-[18px] p-6 text-center">
              <Lock size={24} strokeWidth={1.5} className="text-teal-400 mx-auto mb-3" />
              <p className="text-white font-semibold text-sm mb-2">Accède au GPS précis</p>
              <p className="text-white/60 text-xs mb-5">Score d'activité, coordonnées exactes, filtres avancés.</p>
              <Link href="/tarifs" className="block px-5 py-2.5 bg-teal-500 hover:bg-teal-400 text-white font-semibold text-sm rounded-[10px] transition-colors duration-200">
                Voir les formules
              </Link>
            </div>
          </aside>
        </div>
      </div>
    </main>
  )
}
