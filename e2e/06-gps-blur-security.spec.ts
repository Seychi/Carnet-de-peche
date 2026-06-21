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
 * exportées par le workflow e2e). `supabase start` applique 001→027 sur la stack
 * locale → 025 est active : l'appel anon doit être REFUSÉ.
 *
 * NB : les vues spots_for_viewer / catches_for_viewer sont la couche de floutage
 * (SECURITY DEFINER, ne sélectionnent que geom_public pour un non-abonné —
 * vérifié à l'audit). Le seul vecteur de fuite des coords brutes était cette RPC.
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
});
