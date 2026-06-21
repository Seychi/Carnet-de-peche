import { test, expect } from "@playwright/test";

/**
 * Scénario 6 (sprint 11.5 Bloc E) — RÉGRESSION SÉCURITÉ du floutage GPS.
 *
 * Garde-fou de la migration 025 (audit 2026-06-21 §3.1). La fonction
 * public.get_spots_for_scoring() est SECURITY DEFINER et renvoie les coords
 * PRÉCISES (ST_X/ST_Y(geom)) de tous les spots publics. Avant 025, EXECUTE était
 * accordé à anon → n'importe qui, avec la clé publishable du bundle, récupérait
 * les GPS exacts via POST /rest/v1/rpc/get_spots_for_scoring, contournant le
 * floutage 1 km (geom_public / spots_for_viewer) ET le gating payant.
 *
 * Ce test tape directement PostgREST avec la clé anon (NEXT_PUBLIC_SUPABASE_*
 * exportées par le workflow e2e). `supabase start` applique 001→029 sur la stack
 * locale → 025 est active : l'appel anon doit être REFUSÉ.
 *
 * NB : les vues spots_for_viewer / catches_for_viewer sont la couche de floutage
 * (SECURITY DEFINER, ne sélectionnent que geom_public pour un non-abonné —
 * vérifié à l'audit). Le seul vecteur de fuite des coords brutes était cette RPC.
 *
 * Sprint 11.6 (BUG-01/02/08) : on ajoute 2 tests de COMPORTEMENT des RPC carte
 * après 028 (flou réel par jitter) + 029 (gating de tier serveur). NB : on ne
 * teste PAS has_column_privilege(geom) en E2E — le workflow e2e re-grante
 * `all on all tables to anon` (cf .github/workflows/e2e.yml) → ça défait le REVOKE
 * de 028 EN LOCAL uniquement. has_column_privilege=false se vérifie par SQL sur la PROD.
 */

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

test.describe("régression floutage GPS — verrou get_spots_for_scoring (025)", () => {
  test.skip(
    !SUPABASE_URL || !ANON_KEY,
    "NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY requis (exportés par le workflow e2e)"
  );

  test("anon ne peut PAS appeler get_spots_for_scoring (pas de coords précises)", async ({
    request,
  }) => {
    const res = await request.post(`${SUPABASE_URL}/rest/v1/rpc/get_spots_for_scoring`, {
      headers: {
        apikey: ANON_KEY!,
        Authorization: `Bearer ${ANON_KEY!}`,
        "content-type": "application/json",
      },
      data: "{}",
    });

    // EXECUTE révoqué pour anon → PostgREST refuse (403 permission / 404 fonction
    // non exposée). Jamais 200 avec un tableau de {id, lat, lng}.
    expect(
      res.status(),
      `attendu un refus (>=400), reçu ${res.status()} : la RPC fuit peut-être encore les coords`
    ).toBeGreaterThanOrEqual(400);

    const body = await res.text();
    expect(body, "la réponse ne doit contenir aucune latitude").not.toContain('"lat"');
    expect(body, "la réponse ne doit contenir aucune longitude").not.toContain('"lng"');
  });

  test('get_spots_for_map (anon) : ≤ 3 spots/dépt et is_precise=false', async ({ request }) => {
    const res = await request.post(`${SUPABASE_URL}/rest/v1/rpc/get_spots_for_map`, {
      headers: {
        apikey: ANON_KEY!,
        Authorization: `Bearer ${ANON_KEY!}`,
        'content-type': 'application/json',
      },
      data: '{}',
    });
    expect(res.status(), `attendu 200, reçu ${res.status()}`).toBe(200);
    const rows = (await res.json()) as { department: string; is_precise: boolean }[];

    // Cap 3/dépt (seed.sql : 8 spots en 29, 2 en 56)
    const byDept: Record<string, number> = {};
    for (const r of rows) byDept[r.department.trim()] = (byDept[r.department.trim()] ?? 0) + 1;
    for (const [dept, n] of Object.entries(byDept)) {
      expect(n, `dépt ${dept} dépasse le plafond anon de 3`).toBeLessThanOrEqual(3);
    }
    expect(byDept['29'], 'le dépt 29 (8 spots seedés) doit être plafonné à 3').toBe(3);

    // Aucun spot précis pour anon
    for (const r of rows) {
      expect(r.is_precise, 'anon ne doit jamais recevoir is_precise=true').toBe(false);
    }
  });

  test('flou réel : le point flouté anon est à ~500-900 m du point service_role', async ({ request }) => {
    const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
    test.skip(!SERVICE_KEY, 'SUPABASE_SERVICE_ROLE_KEY requis (exporté par le workflow e2e)');

    // Coords précises via le cron (service_role) : get_spots_for_scoring renvoie ST_X/Y(geom)
    const precise = await request.post(`${SUPABASE_URL}/rest/v1/rpc/get_spots_for_scoring`, {
      headers: {
        apikey: SERVICE_KEY!,
        Authorization: `Bearer ${SERVICE_KEY!}`,
        'content-type': 'application/json',
      },
      data: '{}',
    });
    expect(precise.status()).toBe(200);
    const exact = new Map<string, { lng: number; lat: number }>();
    for (const r of (await precise.json()) as { id: string; lng: number; lat: number }[]) {
      exact.set(r.id, { lng: r.lng, lat: r.lat });
    }

    // Coords floutées via anon
    const fuzzy = await request.post(`${SUPABASE_URL}/rest/v1/rpc/get_spots_for_map`, {
      headers: {
        apikey: ANON_KEY!,
        Authorization: `Bearer ${ANON_KEY!}`,
        'content-type': 'application/json',
      },
      data: '{}',
    });
    expect(fuzzy.status()).toBe(200);
    const rows = (await fuzzy.json()) as { id: string; lng: number; lat: number }[];

    // Haversine en mètres
    const dist = (a: { lng: number; lat: number }, b: { lng: number; lat: number }) => {
      const R = 6371000;
      const toRad = (d: number) => (d * Math.PI) / 180;
      const dLat = toRad(b.lat - a.lat);
      const dLng = toRad(b.lng - a.lng);
      const s =
        Math.sin(dLat / 2) ** 2 +
        Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
      return 2 * R * Math.asin(Math.sqrt(s));
    };

    let compared = 0;
    for (const r of rows) {
      const p = exact.get(r.id);
      if (!p) continue;
      const d = dist(p, { lng: r.lng, lat: r.lat });
      expect(d, `spot ${r.id} : flou ${d.toFixed(0)} m hors [400,1000]`).toBeGreaterThan(400);
      expect(d, `spot ${r.id} : flou ${d.toFixed(0)} m hors [400,1000]`).toBeLessThan(1000);
      compared++;
    }
    expect(compared, 'au moins un spot comparé').toBeGreaterThan(0);
  });
});
