# 📒 Sprint 22 — RECAP (Chantier A — « Le carnet qui parle »)

> Exécuté le 2026-06-23, mode `ultracode` / effort `xhigh`, branche **`sprint-22`** (partie de `main` = `cea5881`, sprint 21 déployé).
> **Rien n'a été poussé, déployé, ni appliqué en prod.** Migration 048 + backfill = fichiers seulement.

---

## TL;DR

Le produit **parle** désormais : sur le profil, la carte, le carnet et **la fiche spot (gratuit)**, l'utilisateur voit **SES tendances descriptives** (« 80 % de tes prises ici : le matin ») calculées sur ses vraies prises, avec **sampleCount + niveau de confiance**, dégradant proprement quand il a peu de prises — le tout via **UN seul moteur** (`lib/scoring/personal/`) qui remplace les 2 systèmes divergents. Le code mort (multiplicateur perso) est **supprimé**. La marée des prises est enfin **dérivée** (montante/descendante + marnage honnête, zéro coef inventé). Un **import de prises passées** amorce le carnet. **Net : −1648 lignes** (consolidation).

| WS | Livrable | État |
|----|----------|------|
| Décisions | D-A1 gratuit · D-A2 financer WS-D · D-A3 descriptif · import manuel | ✅ tranchées |
| A | Moteur perso unifié `lib/scoring/personal/` + kill code mort + vent fiabilisé | ✅ |
| B | `PersonalTendencies` (3 états) sur profil + carte + carnet + fiche spot (gratuit) | ✅ |
| C | Import prises passées (`/carnet/import` + `bulkCreateCatches`) | ✅ |
| D | Dérivation `tide_state` + marnage (openmeteo) + migration 048 + backfill (fichiers) | ✅ |
| VERIF | typecheck + lint + 351 tests + build + revue 3-lentilles | ✅ |

---

## Décisions produit (tranchées par John avant le code)

- **D-A1 = Gratuit** : le bloc « tes tendances » sur la fiche spot est visible dès qu'on est connecté (tous tiers). Le gating Local+ reste sur la **carte** (panneau « Ton score ») et les couches premium.
- **D-A2 = Financer WS-D** : on dérive la marée des prises maintenant.
- **D-A3 = Tendances descriptives** : « TON score » = des tendances, **jamais** un chiffre 0-100 perso (anti-régression 7.5).
- **Import = saisie manuelle** (pas de CSV en v1).

---

## WS-A — Moteur perso unifié (`lib/scoring/personal/`)

**UN seul moteur descriptif**, segmentable **par espèce ET par spot** (réutilisable sur la fiche espèce au sprint 23) :
- `types.ts` (Tendency, PersonalTendencies, TendencyFactor) · `config.ts` (seuils + `confidence()` <5/≤20/>20 + libellés) · `buckets.ts` (bucketizers + TZ Paris mutualisée + **réconciliation vent colonne→jsonb** + exclusion `out_of_coverage`) · `tendencies.ts` (distribution : bucket dominant + part + confiance) · `fetch.ts` (lecture via `catches_for_viewer` filtrée **`auth.uid()` serveur** — anti-usurpation) · `index.ts`.
- Modèle **distribution honnête** : « X % de tes prises {label} » (où/quand tombent tes prises), **pas** la métrique « best-catch-rate » performance-floue de l'ancien système. **10 tests** (segmentation, confiance, vent réconcilié, out_of_coverage, anti-usurpation).

**Code mort supprimé** :
- `personalMultiplier` retiré de `lib/solunar/{scoring,index}.ts` (param mort, aucun call-site ne l'alimentait ; le scoring **générique** est strictement inchangé).
- Modules supprimés : `lib/scoring/{insights,patterns,catch-analysis,personal-config,personal-fetcher,insights-matcher,types}.ts` + `lib/catches/insights.ts` + leurs tests ; composants `PersonalScoreSection`, `InsightChip`, `PersonalInsights` ; `app/dev/scoring-preview` ; `scripts/scoring-smoke.ts` ; le `revalidateTag('personal-profile-*')` no-op.
- `grep personalMultiplier lib app` = **0**.

**Consommateurs migrés** vers le moteur unifié : `/profil`, carte (`map-insights` + `ScorePanel`), `/carnet`, **fiche spot** (nouveau).

---

## WS-B — UI « score global + TES tendances »

- **`components/scoring/PersonalTendencies.tsx`** : composant UNIQUE, **3 états** — plein (liste de tendances) / **dégradé** (« encore N prises pour débloquer ») / vide (CTA loguer + import). Remplace `PersonalScoreSection` + `PersonalInsights`.
- **Anti-7.5** : descriptif, jamais prédictif (disclaimer « décrit où et quand… pas si tu pêches mieux ») ; **aucun chiffre 0-100 perso**. `grep "pêches mieux|tu prendras|prédit"` sur les blocs perso = 0.
- **Daltonien-safe (John)** : la confiance est un **libellé texte** (« confiance faible/moyenne/élevée »), jamais une couleur seule ; chiffres en `font-mono` (DA v2).
- **3 points de montage** : fiche spot (gratuit, après `SpotBestMomentsSection`, scope `spot.id`), carte (`ScorePanel`, gating Local+ inchangé), profil. Bonus : carnet.

---

## WS-C — Import de prises passées (anti cold-start)

- **`/carnet/import`** (`app/(app)/carnet/import/page.tsx`) + **`components/catches/BulkCatchImport.tsx`** : saisie rapide multi-lignes (espèce, date, taille, **département**). Localisation approximative = point de mer du département (`DEPARTMENT_SEA_COORDS`).
- **`bulkCreateCatches`** (`lib/catches/actions.ts`) + **`bulkCatchSchema`** (zod, FR, max 50) : defaults imposés (`private`, `released=false`, `precise_for_friends=true`), `technique = null` (nullable en DB — l'historique ne s'en souvient pas), enrichissement météo **best-effort** par prise (jamais bloquant, **dérive la marée au passage** via WS-D). **4 tests**.
- **Entrées** : empty-state `CatchGrid` (« ou ajoute tes prises passées ») + CTA état-vide de `PersonalTendencies`.
- ⚠️ **Réserve** : l'API Open-Meteo standard ne couvre l'historique que ~3 mois → les prises plus anciennes sont créées **sans** conditions (non bloquant, copy honnête dans l'UI).

---

## WS-D — Marée des prises (dérivation + backfill)

- **`lib/conditions/openmeteo.ts`** : récupère `sea_level_height_msl` (Marine) + **dérive `tide_state`** (montante/descendante/étale via `tideTrendAt` à l'heure locale de la prise) + un **marnage honnête** (`tide_range_m` = amplitude PM-BM, `dailyMarnage`). **Aucun coefficient SHOM inventé** (`tide_coefficient` reste null). `tide_range_m` vit dans le **jsonb `conditions`** → **aucune nouvelle colonne requise**, donc `createCatch` ne casse pas en prod. **Test de dérivation** ajouté.
- **`lib/catches/actions.ts`** : `createCatch`/`updateCatch` persistent `tide_state` (incl. `slack`) dans la colonne existante.
- **Backfill (fichiers, NON appliqués)** : `supabase/migrations/048_tide_backfill_helper.sql` (RPC `get_catches_for_tide_backfill` réservée `service_role`) + `scripts/backfill-tide.ts` (one-shot idempotent, John le lance).

---

## Vérification (workstream VERIF)

- ✅ `pnpm typecheck` — 0 erreur.
- ✅ `pnpm lint` — 0 warning / 0 erreur.
- ✅ `pnpm test` — **351 tests verts** (34 fichiers). *(Moins que les 417 du sprint 21 : ~70 tests de l'ancien code mort supprimés, +15 pour le moteur unifié + tide + import.)*
- ✅ `pnpm build` — succès (route `/carnet/import` générée). **Finding rattrapé** : `PersonalTendencies` importait le **barrel** `@/lib/scoring/personal` (qui réexporte `fetch.ts` → `next/headers`) ; comme `ScorePanel` (client) le monte, le bundle client tirait du code serveur → corrigé en important `config`/`types` directement.
- ✅ Anti-régression : scoring **global** (`spot-scores-job`, `spot_scores`, `solunar/config`) **inchangé** ; floutage GPS intact (perso = tendances, jamais de geom) ; carte reste Local+ ; anti-usurpation (uid serveur) ; 0 copy prédictive ; 0 secret.
- _(Revue indépendante 3-lentilles : verdict consolidé à la clôture.)_

---

## Reste manuel John (post-sprint)

1. **Relire** la branche `sprint-22` → merge `main` + déploiement.
2. **Appliquer la migration 048** (RPC backfill, non-destructive) → **régénérer `lib/types.ts`** (après quoi le cast typé dans `scripts/backfill-tide.ts` peut être retiré).
3. *(Optionnel)* **Lancer le backfill** : `pnpm tsx scripts/backfill-tide.ts` (les 16 prises existantes ; ~3 mois de profondeur Open-Meteo).
4. **QA réelle (qa-chrome)** des 3 états perso (plein/dégradé/vide) sur `/spots/[slug]`, `/carte`, `/profil`, `/carnet`, + le flow `/carnet/import`.
5. **deploy-watch** : zéro régression ; vérifier que la copy live reste **descriptive**.

---

## Notes

- **Sprint 23** : le moteur perso est **segmentable par espèce** dès maintenant → réutilisé tel quel sur la fiche espèce (score par espèce).
- La marée des **nouvelles** prises est dérivée automatiquement ; les anciennes attendent le backfill (point 3).
- `git diff main` : **31 fichiers, +304 / −1952** (consolidation : on a supprimé bien plus de code mort qu'on n'en a ajouté).
