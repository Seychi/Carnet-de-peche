# Sprint 18 — RECAP : Remédiation audit mobile S16/S17

> Date : 2026-06-22 · Branche : `pre-pub-fixes` (base `0570657`) · **NON poussé** (merge + déploiement = feu vert John).
> Contexte : `docs/audits/AUDIT-MOBILE-S16-S17-2026-06-22.md` (verdict 8,5/10, 0 P0 fonctionnel). Mode : ultracode + connecteurs.

## État : code-complet, gate vert, migration 039 appliquée en prod

- **Gate vert** : typecheck OK · lint clean · **Vitest 350/350** · build OK.
- **Migration 039 APPLIQUÉE en prod** (fuite GPS nearby_spots) + vérifiée en base. Code applicatif inchangé (signature identique) → ordre migration-avant-code respecté.

## ⚠️ Déviation assumée vs le brief (P0)

Le brief sprint 18 défaut = **« restaurer le flou GPS à ~1 km »** (migration + backfill), sur la base du « ~200 m » mesuré par l'audit. **Investigation (read-only) → ce « 200 m » est un artefact de mesure** : l'audit a mesuré la distance au **bord** du buffer de 500 m, pas au **centroïde** (le point réellement publié). Le flou réel = **~700 m de moyenne** (médiane 690, min 503, max 899, **0 % < 500 m**) — cohérent avec la note 11.6 (510-898 m). **Le flou n'est pas cassé.** Décision John : **garder le flou ~700 m + adoucir la copy** (pas de migration 1 km inutile). Rapport : `docs/sprint-17/research/gps-blur-investigation.md`.

## Livré

### P0 — flou GPS
- **Copy adoucie** (spots only) : « coords floutées 1 km » → « plusieurs centaines de mètres » dans `tarifs/pricing-cards.tsx`, `(marketing)/page.tsx`, `(marketing)/fil/page.tsx`, `(marketing)/peche/[...slug]/page.tsx`, `legal/confidentialite/page.tsx`. (Copy des CATCHES laissée — flou mesuré séparément, hors périmètre.)
- **🔴 La VRAIE fuite GPS corrigée (RLS-FIX-07, hors brief)** : `nearby_spots.distance_m` était calculée sur le `geom` **précis** pour tous les tiers (RPC ouverte à anon) → trilatérable en 3 appels. **Migration 039** : `distance_m` sur le centroïde flou pour anon/discovery/local-hors-dépt, précis inchangé pour itinérant/local-sur-dépt/owner (parité `get_spots_for_map`). Signature identique → zéro breaking change. **Vérifié en prod** : pour le tier discovery, `distance_m` = distance au centroïde flou (11433 m), PAS au point précis (10979 m). Le verrou colonne `geom` (anon/authenticated ne lisent pas `geom`) reste en place.

### P1 — avant pub
- **Header « Nouvelle prise »** : titre passé en `text-white` (était navy-900 sur navy-950, ~1,3:1 illisible). `carnet/nouvelle/page.tsx`.
- **Tarifs « Notifications créneaux optimaux »** → « Notifications likes, commentaires, follows » (seules notifs livrées au S17 ; les alertes créneau n'existent pas). `tarifs/pricing-cards.tsx`.

### P2 — 360 px
- **Onglets fil** : « Tous les départements côtiers » → « **Toute la côte** » (tiennent à 360 px sans scroll). `FeedTabs.tsx`.
- **Bandeau instruments** : déjà OK (`instruments-bar.tsx` a `overflow-x-auto` + fondu `sm:hidden` depuis S16) → scroll + affordance à 360 px, critère rempli, aucun changement.

## Reste avant merge (manuel John)
1. **qa-chrome 360 px / device** : confirmer header lisible (contraste ≥ 4,5:1), onglets « Toute la côte » + bandeau à 360 px, carte gratuite toujours floutée.
2. **Merge `pre-pub-fixes` → `main`** + déploiement, puis **deploy-watch**. (039 déjà en prod → pas d'incident migration-avant-code.)
3. Réconcilier l'historique migrations (`supabase migration repair --status applied …`) si besoin.
4. Décision **E.5** (sprint 17) restée sur « ≥1 technique requise ».
5. Nettoyage données de test de l'audit (follow B→A + sa notif ; post `[test]` ; 2 signalements) — ton choix.
6. **Ton WIP non commité** (curation lots 5/6 Méditerranée+Corse, `docs/carte-v2/`, captures) : intact, non touché — à toi.
7. Backlog : upload `/carnet/nouvelle` > 1 Mo (resize client + bodySizeLimit) ; RQ/LAY-2 (device) ; contrainte `conditions_cache` ; favicon ; dead code `spot-filters.tsx`.
