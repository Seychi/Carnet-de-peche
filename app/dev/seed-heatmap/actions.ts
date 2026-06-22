'use server'

import { createAdminClient } from '@/lib/supabase/admin'
import { SEED_AUTHORS } from '@/lib/feed/seed-data'
import { SEED_HEAT_ZONES, SEED_HEAT_LABEL } from '@/lib/map/seed-heatmap-data'

type SeedResult = { ok: true; count: number; zones: number } | { ok: false; error: string }

function isoDaysAgo(days: number): string {
  return new Date(Date.now() - days * 86_400_000).toISOString()
}

function ewkt(lng: number, lat: number): string {
  return `SRID=4326;POINT(${lng} ${lat})`
}

// Seed dev/preview UNIQUEMENT. Crée des PRISES PUBLIQUES géolocalisées et groupées
// pour alimenter la heatmap k-anonyme (get_catch_heatmap, K=3) avant la beta.
// Idempotent : supprime puis recrée les prises marquées SEED_HEAT_LABEL.
export async function seedHeatmapDev(): Promise<SeedResult> {
  if (process.env.NODE_ENV === 'production') {
    return { ok: false, error: 'Interdit en production.' }
  }

  let admin: ReturnType<typeof createAdminClient>
  try {
    admin = createAdminClient()
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Client admin indisponible.' }
  }

  // 1) Comptes pêcheurs (réutilise les 6 de SEED_AUTHORS pour des user_id DISTINCTS).
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
      // Profil minimal (le trigger handle_new_user a posé une ligne ; on la complète).
      await admin
        .from('profiles')
        .update({ username: a.username, display_name: a.displayName, home_department: a.dept, onboarded: true })
        .eq('id', id)
    }
    authorIds.push(id)
  }

  // 2) Nettoyage idempotent ciblé (uniquement nos prises de seed heatmap).
  await admin.from('catches').delete().eq('location_label', SEED_HEAT_LABEL)

  // 3) Insertion des prises groupées par zone (geom → geom_public auto-flouté par trigger).
  let count = 0
  for (const z of SEED_HEAT_ZONES) {
    // Spot du département pour rattacher la prise (active aussi le signal social get_spot_activity).
    const { data: spot } = await admin
      .from('spots')
      .select('id')
      .eq('department', z.department)
      .limit(1)
      .maybeSingle()

    const rows = z.catches.map((c) => ({
      user_id: authorIds[c.authorIdx],
      species: c.species,
      size_cm: c.sizeCm,
      weight_g: c.weightG,
      caught_at: isoDaysAgo(c.daysAgo),
      privacy: 'public',
      spot_id: spot?.id ?? null,
      geom: ewkt(z.lng + c.dLng, z.lat + c.dLat) as unknown,
      location_label: SEED_HEAT_LABEL,
    }))

    const { error } = await admin.from('catches').insert(rows)
    if (error) return { ok: false, error: `zone ${z.key}: ${error.message}` }
    count += rows.length
  }

  return { ok: true, count, zones: SEED_HEAT_ZONES.length }
}
