# Sprint 48 — RECAP
## « Confiance visible » (report coord + niveaux/confirmations + fraîcheur + marées)

> Exécuté le 2026-06-28 (ultracode, 2 agents + fix lead). **Pas poussé.** Migrations **083/084 appliquées en prod** + `lib/types.ts` régénéré. Rendre lisibles et solides les deux arguments de confiance (badge vérifié + marées précises).

---

## Décisions John
- **D1** = raisons report = `coord_fausse` / `acces_change` / `danger_manquant` / `autre`.
- **D2** = compteur de confirmations « K pêcheurs confirment » **construit maintenant** (table dédiée).
- **D3** = Méditerranée **calibrée aussi** (mais les données SHOM réelles = sourcing manuel John, rien d'inventé).
- **D4** = pivot ADN dopamine **acté et parqué** (CLAUDE.md §8 + mémoire) ; rien de compétitif injecté dans ce sprint.

## Migrations
- **083** : `spots.verification_level` (CHECK communaute/ambassadeur/equipe OR null) ; `get_spot_by_slug` expose `verification_level` ; **157 spots curés backfillés `equipe`**.
- **084** : table `spot_confirmations` (spot_id, user_id, unique) + RLS own (insert/select/delete) + RPC `get_spot_confirmation_count(spotId)` (SECURITY DEFINER, renvoie **que le nombre**, jamais qui).

## Fait
- **WS A — report d'erreur de coordonnée** : `reportSpotCoordinate` (modèle `reportPost`, insert `reports` target_type='spot', **0 geom**, enum zod 4 raisons, alerte volume). `ReportSpotDialog` + bouton « Signaler une erreur de position » sur la fiche. Affichage en modération (contexte spot + lien fiche + « ouvrir en re-vérif »).
- **WS B — niveaux + re-vérif + compteur** : `verification_level='equipe'` posé à la vérif (modérateur). **Badge gradué** sur la fiche (libellé + icône, **daltonien-safe**, jamais la couleur seule). Onglet modération « Re-vérifier » (tous les spots, filtres) + `moderateReverifySpot` (re-horodate même si déjà vérifié, **verified+source='curated' ensemble** → CHECK préservé). **Compteur « K pêcheurs confirment cette position »** (`confirmSpot`/`unconfirmSpot` + RPC count) + bouton confirmer/annuler.
- **WS C — fraîcheur** : « Vérifié il y a N mois » (relatif) + « N prises loguées ici depuis la vérification » via `get_spot_activity` (k-anon, **0 coordonnée**).
- **WS D — marées** : chip « Marées ±N min · calé SHOM » (depuis `residual_min`) + « audité il y a N mois » (`tide_calibration.verified_at`). **Aucune donnée SHOM inventée** ; Méditerranée masquée tant que non seedée (data = sourcing John).

## Fix lead (gotcha 'use server')
- L'agent backend exportait `SPOT_REPORT_REASON_LABELS` (const objet) depuis `spots.ts` ('use server') → **build `/moderation` cassé** (un fichier 'use server' n'exporte que des async). Déplacé `SPOT_REPORT_REASONS` + type + labels dans `lib/spots/report-reasons.ts` (neutre), rebranché les 3 importeurs. (tsc ne l'attrape pas, seul `pnpm build` le révèle.)

## VERIF (gate verte)
- `pnpm typecheck` **0** · `pnpm lint` **0** · `pnpm test` **574 verts** · `pnpm build` **OK** (`/moderation`, `/spots/[slug]`).
- **Sécurité** : report **sans geom** ; modération **is_moderator only** (re-vérif gardée) ; **verified ⇒ source='curated'** préservé partout ; compteur = **nombre via RPC** (jamais qui) ; « K prises » via `get_spot_activity` k-anon ; **floutage GPS intact** ; `verified_by` non exposé.
- **Honnêteté** : marées **SHOM réelles**, rien d'inventé (Med masquée). **Advisors baseline** (2 SDV, `spot_confirmations` a sa RLS, aucune nouvelle alerte).
- **Copy** : sans tiret cadratin (corrigé un `console.warn`).

## ⚠️ Suivis (non bloquants)
1. `moderateReverifySpot` ne **résout pas** automatiquement les reports `pending` du spot (ajout simple si voulu : `resolveReportsForTarget`).
2. `ReportSpotDialog.tsx` exporte 3 composants (dialog + bouton report + bouton confirm) ; renommer en `SpotTrustWidgets.tsx` serait plus clair.
3. Chip marées dans le hero (pas la sidebar) : à valider visuellement en QA mobile.

## Reste manuel John
- **Sourcer + saisir les fixtures SHOM** des nouveaux ports + Méditerranée (données officielles), `pnpm verify-tides`, migration de seed.
- Flagger les ambassadeurs (`UPDATE profiles SET is_ambassador=true`).
- Relire, merger `sprint-48` → `main`, déployer, QA.

---

> **Invariants tenus** : pas de push · migrations + regen types · **report/compteurs zéro coordonnée** · modération **is_moderator** · `verified ⇒ curated` · **marées SHOM réelles, jamais inventées** · floutage GPS intact · copy sans tiret cadratin. (Pivot ADN dopamine acté §8 mais **non exécuté** ici.)
