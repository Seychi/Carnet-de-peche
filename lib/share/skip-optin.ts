'use server'

import { createClient } from '@/lib/supabase/server'

// Préférence « ne plus me demander » du dialog d'opt-in de partage (sprint 47 WS-D,
// migration 082 : profiles.share_skip_optin). Quand true, useShareCard saute le
// dialog (partage direct 1-tap). Le rappel geom-free a déjà été montré au moins une
// fois (à la 1re activation de la préférence). Owner-only : la lecture/écriture est
// scopée auth.uid() (la RLS profiles + le filtre id explicite garantissent qu'on ne
// touche QUE son propre profil).

// Lit la préférence de l'utilisateur courant. false par défaut (non connecté, erreur,
// ou colonne absente) → le dialog s'affiche toujours, jamais de partage à l'insu.
export async function getShareSkipOptin(): Promise<boolean> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return false

  const { data, error } = await supabase
    .from('profiles')
    .select('share_skip_optin')
    .eq('id', user.id)
    .maybeSingle()

  if (error || !data) return false
  return data.share_skip_optin === true
}

// Écrit la préférence pour l'utilisateur courant (owner-only). No-op silencieux si
// non connecté : la préférence est cosmétique, on ne casse jamais le flux de partage.
export async function setShareSkipOptin(skip: boolean): Promise<void> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return

  const { error } = await supabase
    .from('profiles')
    .update({ share_skip_optin: skip === true })
    .eq('id', user.id)

  if (error) {
    console.error('[share/setShareSkipOptin]', error.message)
  }
}
