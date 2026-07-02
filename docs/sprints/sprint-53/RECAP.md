# 🎯 Sprint 53 — « Données & saisies » — RECAP

> **Statut : CODE-COMPLET. Migrations 094/095/096 APPLIQUÉES en prod (data validée par John). NON commité / NON poussé (feu vert John).**
> Exécuté le 2026-06-30 (ultracode). Base : `docs/sprint-53/BRIEF.md` + investigation live. Prod de départ = `f797b89` (sprint-52).
> Vérif : suite **604/604**, typecheck 0, lint 0, build OK (Node 24), revue croisée indépendante = **GO**.

---

## Décisions John (toutes les recos)

Listes d'espèces complètes (PACA inclus) validées · alose **retirée** des 3 spots · niveaux de vérif `communaute`/`ambassadeur` = **code mort retiré** · 5 profils sans pseudo **gardés** (nettoyage réservé au S58).

## Ce qui a été fait

| WS | Objet | Détail | Migration / fichiers |
|---|---|---|---|
| **A** | Taguer 6 espèces invisibles (0 spot) | `lieu_noir` 23, `merlan` 15, `marbre` 14, `liche` 15, `barracuda` 23, `tassergal` 18. Curation aire+structure+co-occurrence, **PACA complété** (région `provence-alpes-cote-d-azur`, le 06 = secteur barracuda n°1). Append idempotent (jamais d'écrasement). 86 slugs vérifiés présents avant écriture. | `094_tag_sprint29_species.sql` |
| **B** | Valeurs orphelines | `alose` (hors référentiel, aucune fiche) retirée de 3 spots ; `stickbait` (type de leurre) normalisé → `leurres` sur 5 spots ; commentaire faux `seed-spots-lot-8.sql:32` corrigé. | `095_clean_alose_stickbait.sql` |
| **C** | Unicité username case-insensitive | Index partiel unique `lower(username)` (0 collision existante) ; les **2** checks de dispo (onboarding **+** profil) passés en `ilike` échappé (%/_/\ littéraux). | `096_username_unique_ci.sql`, `onboarding/actions.ts`, `profil/actions.ts` |
| **D** | Gardes de date | Helper `lib/validation/date-guards.ts` (`notFuture`/`notPast`, tolérance ±24h, NaN→false). `caught_at` (création + base/default + import) et `outings.started_at` → pas dans le futur ; `cofishing.planned_at` → pas dans le passé. Inputs `max`/`min` sur les 3 datetime-local. | `lib/catches/schema.ts`, `lib/outings/schema.ts`, `lib/cofishing/schema.ts`, `CatchForm.tsx`, `OutingForm.tsx`, `OutingComposer.tsx` |
| **E** | Bornes & cohérence mesure | Input `measured_length_cm` aligné sur le zod (`min=10 max=250`, fini `1/299`) ; refine « Prise mesurée cochée → longueur + objet de référence requis » (création + édition, **pas** sur l'update partiel). | `CatchForm.tsx`, `lib/catches/schema.ts` |
| **F** | Retrait code mort | Niveaux `communaute`/`ambassadeur` (jamais atteints, DB = `equipe`/null only) retirés de `VERIFICATION_LEVELS` ; le fallback `?? 'Coordonnée vérifiée'` couvre null. | `app/(marketing)/spots/[slug]/page.tsx` |

## Migrations (numérotées, idempotentes, appliquées + vérifiées en prod)

| # | Objet | Vérif live |
|---|---|---|
| `094_tag_sprint29_species.sql` | tag 6 espèces (data) | comptes 23/15/23/14/15/18, 0 doublon, espèces d'origine préservées |
| `095_clean_alose_stickbait.sql` | alose retirée + stickbait→leurres (data) | `alose`=0, `stickbait`=0 |
| `096_username_unique_ci.sql` | index unique partiel `lower(username)` | index présent, 0 collision |

`lib/types.ts` **inchangé** (094/095 = data, 096 = index → invisibles au générateur).

## Corrections au brief (investigation live)

- **PACA** : le vrai libellé région est `provence-alpes-cote-d-azur` (pas `paca`) → 30 spots curés récupérés, le trou principal du brief comblé. +9 spots bretons `lieu_noir` (déjà `lieu_jaune`).
- **username** : la vérif de dispo existait en **2** endroits (onboarding **+** profil), pas un seul.
- **code mort niveaux** : présent **uniquement** dans `spots/[slug]/page.tsx` (MapLegend n'en avait pas, contrairement au brief).
- **merlan** : 15 (le « 18 » du brief était une coquille de prose).
- **fixtures de test datées en dur** (cofishing) passées en **dates relatives**, sinon la suite cassait mécaniquement après le 2026-07-02.

## Vérification

- `pnpm test` → **604/604** (+7 : gardes date catches/outings/cofishing, prise mesurée).
- `pnpm typecheck` 0 · `pnpm lint` 0 · `pnpm build` OK (Node 24).
- `node scripts/lint-copy-dashes.mjs` → aucun tiret cadratin introduit (les `56 — Morbihan` des selects sont pré-existants, tolérés).
- **Revue croisée indépendante** → **GO** : comptes SQL réels = brief, idempotence prouvée, honnêteté des aires (aucune fuite de bassin), 0 fuite GPS, advisors sans nouvelle alerte.

## Reste avant merge (John)

1. **Commit + push** (push manuel, §13) → Vercel auto-deploy.
2. **QA live après deploy** : `/especes/barracuda` (et les 5 autres) affiche « Meilleurs spots » ; chips carte des 6 espèces renvoient des spots ; loguer une prise/sortie future est refusé ; proposer une sortie co-pêchage passée est refusé ; cocher « Prise mesurée » sans longueur/référence affiche une erreur.

## Non fait (assumé)

- WS-E réconciliation `size_cm`↔`measured_length_cm` (avertissement de divergence) : explicitement optionnelle dans le brief, non implémentée.
- Décision WS-F : option (B) retrait appliquée ; le câblage réel des niveaux viendra dans un sprint communauté.
