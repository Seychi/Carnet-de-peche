import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

// /fil → redirige vers le fil du département principal du pêcheur.
export default async function FeedIndexPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login?redirect=/fil')

  const { data: profile } = await supabase
    .from('profiles')
    .select('home_department')
    .eq('id', user.id)
    .maybeSingle()

  if (profile?.home_department) redirect(`/fil/${profile.home_department}`)

  // Pas de département renseigné (cas limite : onboarding incomplet).
  redirect('/profil')
}
