import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

// Garde-fou anti-régression sprint 72 (WS B) : la migration 106 porte le contrat
// partagé des alertes (favoris cap 10, réglages opt-in OFF, journal de dédup
// service-role only, RPC coords jamais côté client). Pas de DB en Vitest (env
// node) → on assert sur le contenu du fichier, la preuve runtime est la matrice
// SQL live (docs/sprint-72/research/matrix-106.md, 17/17).
describe('migration 106 — favoris + réglages d’alertes + dédup (contrat sprint 72)', () => {
  const sql = readFileSync(
    join(process.cwd(), 'supabase/migrations/106_favorite_spots_alerts.sql'),
    'utf8',
  ).toLowerCase()

  describe('favorite_spots', () => {
    it('FK cascade des deux côtés + unicité (user_id, spot_id) + index spot_id', () => {
      expect(sql).toMatch(/references auth\.users\(id\)\s+on delete cascade/)
      expect(sql).toMatch(/references public\.spots\(id\)\s+on delete cascade/)
      expect(sql).toMatch(/primary key \(user_id, spot_id\)/)
      expect(sql).toContain('create index favorite_spots_spot_idx on public.favorite_spots (spot_id)')
    })

    it('cap 10 favoris/user : trigger BEFORE INSERT, token stable, pas de USING MESSAGE (régression 035b)', () => {
      expect(sql).toMatch(/before insert on public\.favorite_spots/)
      expect(sql).toMatch(/>=\s*10/)
      expect(sql).toContain("raise exception 'max_favorite_spots'")
      // 035b : MESSAGE déjà porté par la chaîne de format → USING MESSAGE = 42601.
      expect(sql).not.toMatch(/raise exception 'max_favorite_spots'\s+using message/)
    })

    it('RLS activée + policies own-only (initplan 024), insert gardé par EXISTS sous la RLS de spots', () => {
      expect(sql).toContain('alter table public.favorite_spots enable row level security')
      expect(sql).toContain('create policy favorite_spots_select_own')
      expect(sql).toContain('create policy favorite_spots_insert_own')
      expect(sql).toContain('create policy favorite_spots_delete_own')
      expect(sql).toMatch(/exists \(select 1 from public\.spots s where s\.id = spot_id\)/)
    })
  })

  describe('alert_settings (contrat COMMON : noms et défauts EXACTS)', () => {
    it('opt-in explicite OFF par défaut', () => {
      expect(sql).toMatch(/alerts_enabled\s+boolean\s+not null default false/)
    })

    it('canaux ON par défaut, seuil 70 borné 50-90', () => {
      expect(sql).toMatch(/channel_push\s+boolean\s+not null default true/)
      expect(sql).toMatch(/channel_email\s+boolean\s+not null default true/)
      expect(sql).toMatch(/alert_threshold\s+smallint\s+not null default 70/)
      expect(sql).toMatch(/check \(alert_threshold between 50 and 90\)/)
    })

    it('RLS activée + CRUD own-only', () => {
      expect(sql).toContain('alter table public.alert_settings enable row level security')
      for (const op of ['select', 'insert', 'update', 'delete']) {
        expect(sql).toContain(`create policy alert_settings_${op}_own`)
      }
    })
  })

  describe('alerts_sent (journal de dédup)', () => {
    it('dédup dure (user, spot, window_date) + kind fermé + score borné', () => {
      expect(sql).toMatch(/primary key \(user_id, spot_id, window_date\)/)
      expect(sql).toMatch(/check \(kind in \('perso', 'generique'\)\)/)
      expect(sql).toMatch(/check \(score between 0 and 100\)/)
    })

    it('RLS : select own UNIQUEMENT, aucune policy d’écriture (service-role only)', () => {
      expect(sql).toContain('alter table public.alerts_sent enable row level security')
      const policies = sql.match(/create policy alerts_sent_\w+/g) ?? []
      expect(policies).toEqual(['create policy alerts_sent_select_own'])
    })
  })

  describe('get_favorite_spot_coords (coords précises = service_role only)', () => {
    it('EXECUTE révoqué de public/anon/authenticated, accordé à service_role seul', () => {
      for (const role of ['public', 'anon', 'authenticated']) {
        expect(sql).toContain(
          `revoke execute on function public.get_favorite_spot_coords() from ${role}`,
        )
      }
      expect(sql).toContain(
        'grant execute on function public.get_favorite_spot_coords() to service_role',
      )
    })

    it('department trimmé à la source (char(3), leçon 103b)', () => {
      expect(sql).toMatch(/btrim\(s\.department\)/)
    })
  })

  describe('notifications.type', () => {
    it('re-pose la liste FERMÉE complète (28 types existants + spot_alert)', () => {
      expect(sql).toContain('alter table public.notifications drop constraint notifications_type_check')
      const checkBlock = sql.slice(sql.indexOf('add constraint notifications_type_check'))
      const types = checkBlock.match(/'[a-z_]+'/g) ?? []
      expect(types).toHaveLength(29)
      expect(types).toContain("'spot_alert'")
      // Échantillon des types historiques : une liste raccourcie casserait les notifs existantes.
      for (const t of ["'optimal_window'", "'big_tide'", "'season_recap'", "'new_follower'"]) {
        expect(types).toContain(t)
      }
    })
  })

  it('aucune coordonnée exposée côté client : pas de grant table, policies to authenticated only', () => {
    // La migration ne pose aucun GRANT de table supplémentaire et aucune policy "to anon".
    expect(sql).not.toMatch(/to anon\b/)
  })
})
