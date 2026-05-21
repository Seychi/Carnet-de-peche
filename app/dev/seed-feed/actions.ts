'use server'

import { createAdminClient } from '@/lib/supabase/admin'
import { SEED_AUTHORS, SEED_CATCHES, SEED_POSTS } from '@/lib/feed/seed-data'

type SeedResult = { ok: true; count: number } | { ok: false; error: string }

function isoDaysAgo(days: number): string {
  return new Date(Date.now() - days * 86_400_000).toISOString()
}

// Seed dev/preview UNIQUEMENT. Insère via le client service-role (bypass RLS).
// Idempotent : recrée proprement les posts/prises des 6 auteurs de seed.
export async function seedFeedDev(): Promise<SeedResult> {
  if (process.env.NODE_ENV === 'production') {
    return { ok: false, error: 'Interdit en production.' }
  }

  let admin: ReturnType<typeof createAdminClient>
  try {
    admin = createAdminClient()
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Client admin indisponible.' }
  }

  // 1) Comptes auteurs (créés une fois, puis réutilisés).
  const { data: list } = await admin.auth.admin.listUsers({ perPage: 1000 })
  const authorIds: string[] = []
  for (const a of SEED_AUTHORS) {
    const email = `${a.username}@carnet.seed`
    const existing = list?.users.find((u) => u.email === email)
    let id = existing?.id
    if (!id) {
      const { data, error } = await admin.auth.admin.createUser({
        email,
        password: 'seed-carnet-2026',
        email_confirm: true,
      })
      if (error || !data.user) return { ok: false, error: `createUser ${email}: ${error?.message}` }
      id = data.user.id
    }
    authorIds.push(id)
  }

  // 2) Profils + abonnement local (le trigger handle_new_user a posé discovery).
  for (let i = 0; i < SEED_AUTHORS.length; i++) {
    const a = SEED_AUTHORS[i]
    await admin
      .from('profiles')
      .update({
        username: a.username,
        display_name: a.displayName,
        home_department: a.dept,
        techniques: a.techniques,
        favorite_species: a.species,
        avatar_url: `https://api.dicebear.com/9.x/thumbs/svg?seed=${a.username}`,
        onboarded: true,
        onboarded_at: new Date().toISOString(),
      })
      .eq('id', authorIds[i])
    await admin
      .from('subscriptions')
      .update({ plan: 'local', status: 'active', current_period_end: isoDaysAgo(-30) })
      .eq('user_id', authorIds[i])
  }

  // 3) Nettoyage des anciennes données de seed (idempotence).
  await admin.from('feed_posts').delete().in('author_id', authorIds)
  await admin.from('catches').delete().in('user_id', authorIds)

  // 4) Prises (rattachées à un spot du département si disponible).
  const catchIds: string[] = []
  for (const c of SEED_CATCHES) {
    const dept = SEED_AUTHORS[c.authorIdx].dept
    const { data: spot } = await admin
      .from('spots')
      .select('id')
      .eq('department', dept)
      .limit(1)
      .maybeSingle()
    const { data: inserted, error } = await admin
      .from('catches')
      .insert({
        user_id: authorIds[c.authorIdx],
        species: c.species,
        size_cm: c.sizeCm,
        weight_g: c.weightG,
        caught_at: isoDaysAgo(c.daysAgo),
        privacy: 'public',
        spot_id: spot?.id ?? null,
      })
      .select('id')
      .single()
    if (error || !inserted) return { ok: false, error: `catch: ${error?.message}` }
    catchIds.push(inserted.id)
  }

  // 5) Posts (12 texte + 12 ancrés sur prise), dates étalées sur 14 jours.
  const rows = SEED_POSTS.map((p) => ({
    author_id: authorIds[p.authorIdx],
    region: p.region,
    text: p.text ?? null,
    catch_id: p.catchIdx != null ? catchIds[p.catchIdx] : null,
    created_at: isoDaysAgo(p.daysAgo),
    moderation_status: 'approved',
  }))
  const { error: postErr } = await admin.from('feed_posts').insert(rows)
  if (postErr) return { ok: false, error: `posts: ${postErr.message}` }

  return { ok: true, count: rows.length }
}
