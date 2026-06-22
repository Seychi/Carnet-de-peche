import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getCachedPersonalProfile } from '@/lib/scoring/personal-fetcher'
import { PersonalScoreSection } from '@/components/scoring/PersonalScoreSection'
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

  const [{ data: profile }, personalProfile] = await Promise.all([
    supabase
      .from('profiles')
      .select('id, username, bio, city, home_department, level, techniques, favorite_species, fishing_frequency, years_practicing, avatar_url, created_at')
      .eq('id', user.id)
      .single(),
    getCachedPersonalProfile(user.id).catch(() => null),
  ])

  if (!profile) redirect('/auth/login')

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
        {personalProfile && (
          <div className="mb-8">
            <PersonalScoreSection profile={personalProfile} />
          </div>
        )}

        <ProfileForm profile={profile as Profile} email={user.email ?? ''} />
      </div>
    </main>
  )
}
