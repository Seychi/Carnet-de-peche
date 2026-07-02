import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getMyCatchStats } from '@/lib/catches/queries'
import { getUserTier, type UserTier } from '@/lib/auth/tier'
import { ShareButton } from '@/components/share/ShareButton'
import { ProfileForm } from './profile-form'
import { RankingVisibilityToggle } from './ranking-visibility-toggle'

// Badge de formule (audit 07-02 §4.8) : le tier était invisible hors
// /compte/abonnement. Lecture seule via getUserTier (RPC current_tier, source
// de vérité Stripe/comp), zéro logique nouvelle. Libellé TEXTE toujours présent
// (jamais d'info portée par la seule teinte) ; gold-700/teal-700 = variantes AA.
const TIER_BADGES: Record<UserTier, { label: string; cls: string }> = {
  anonymous: { label: 'Découverte', cls: 'border-sand-300 bg-white text-ink-500' },
  discovery: { label: 'Découverte', cls: 'border-sand-300 bg-white text-ink-500' },
  local: { label: 'Local', cls: 'border-teal-700/30 bg-teal-500/10 text-teal-700' },
  itinerant: { label: 'Itinérant', cls: 'border-gold-700/30 bg-gold-500/10 text-gold-700' },
}

type Profile = {
  id: string
  username: string | null
  bio: string | null
  city: string | null
  home_department: string | null
  level: string | null
  techniques: string[]
  favorite_species: string[]
  fishing_frequency: string | null
  years_practicing: number | null
  avatar_url: string | null
  created_at: string
  public_ranking: boolean | null
}

export default async function ProfilPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  // /profil = réglages uniquement (sprint 30). Les tendances perso (« ce que ton
  // journal t'apprend ») vivent sur /carnet, plus ici — fin du doublon TES TENDANCES.
  const { data: profile } = await supabase
    .from('profiles')
    .select('id, username, bio, city, home_department, level, techniques, favorite_species, fishing_frequency, years_practicing, avatar_url, created_at, public_ranking')
    .eq('id', user.id)
    .single()

  if (!profile) redirect('/auth/login')

  // Partage du bilan (sprint 55) : on n'affiche les CTA que si le carnet a de quoi
  // (sinon l'action renverrait « pas assez de données »). Cartes publiques geom-free.
  const [stats, tier] = await Promise.all([
    getMyCatchStats().catch(() => null),
    getUserTier().catch((): UserTier => 'discovery'),
  ])
  const hasCatches = !!stats && stats.totalCount > 0
  const tierBadge = TIER_BADGES[tier]

  return (
    <div className="bg-sand-50 min-h-screen py-12">
      <div className="max-w-[760px] mx-auto px-6">
        <div className="mb-8">
          <p className="mb-1 font-mono text-[11.5px] font-medium uppercase tracking-[0.08em] text-ink-400">
            MON PROFIL
          </p>
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="font-display text-navy-900 text-3xl">
              {profile.username ? `@${profile.username}` : 'Mon profil'}
            </h1>
            <Link
              href="/compte/abonnement"
              title="Voir mon abonnement"
              className={`inline-flex items-center rounded-full border px-2.5 py-1 font-mono text-[11px] font-medium uppercase tracking-[0.06em] transition-colors hover:border-ink-300 ${tierBadge.cls}`}
            >
              {tierBadge.label}
            </Link>
          </div>
          <p className="text-ink-600 mt-2 text-sm">
            Modifie tes informations de pêcheur. Ton email ne peut pas être changé ici.
          </p>
        </div>

        {hasCatches && (
          <section className="mb-6 rounded-[14px] border border-sand-200 bg-white p-5">
            <p className="text-[13.5px] text-ink-600">
              Partage ton carnet, sans jamais montrer tes spots.
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <ShareButton
                input={{ kind: 'recap' }}
                title="Mon année de pêche — Carnet de Pêche"
                text="Voici mon bilan de pêche."
                label="Mon année"
                variant="ghost"
              />
              <ShareButton
                input={{ kind: 'records' }}
                title="Mes records — Carnet de Pêche"
                text="Mes plus beaux poissons par espèce."
                label="Mes records"
                variant="ghost"
              />
            </div>
          </section>
        )}

        <RankingVisibilityToggle initial={profile.public_ranking ?? false} />

        <ProfileForm profile={profile as Profile} email={user.email ?? ''} />
      </div>
    </div>
  )
}
