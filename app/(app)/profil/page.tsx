import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getMyCatchStats } from '@/lib/catches/queries'
import { ShareButton } from '@/components/share/ShareButton'
import { ProfileForm } from './profile-form'

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
}

export default async function ProfilPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  // /profil = réglages uniquement (sprint 30). Les tendances perso (« ce que ton
  // journal t'apprend ») vivent sur /carnet, plus ici — fin du doublon TES TENDANCES.
  const { data: profile } = await supabase
    .from('profiles')
    .select('id, username, bio, city, home_department, level, techniques, favorite_species, fishing_frequency, years_practicing, avatar_url, created_at')
    .eq('id', user.id)
    .single()

  if (!profile) redirect('/auth/login')

  // Partage du bilan (sprint 55) : on n'affiche les CTA que si le carnet a de quoi
  // (sinon l'action renverrait « pas assez de données »). Cartes publiques geom-free.
  const stats = await getMyCatchStats().catch(() => null)
  const hasCatches = !!stats && stats.totalCount > 0

  return (
    <main className="bg-sand-50 min-h-screen py-12">
      <div className="max-w-[760px] mx-auto px-6">
        <div className="mb-8">
          <p className="mb-1 font-mono text-[11.5px] font-medium uppercase tracking-[0.08em] text-ink-400">
            MON PROFIL
          </p>
          <h1 className="font-display text-navy-900 text-3xl">
            {profile.username ? `@${profile.username}` : 'Mon profil'}
          </h1>
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

        <ProfileForm profile={profile as Profile} email={user.email ?? ''} />
      </div>
    </main>
  )
}
