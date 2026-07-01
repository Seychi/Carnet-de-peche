# Sprint 60 — RECAP
## Fondations XP & Rangs (le squelette dopamine)

> Exécuté le 2026-07-01 (Fable, effort xhigh, ultracode). Premier sprint du moteur dopamine (pivot ADN 2026-06-28).
> **Statut : CODE-COMPLET. Migration 098 APPLIQUÉE en prod (+ backfill). NON poussé** (John relit → merge → déploie).

---

## En une phrase

Une **XP réelle, infalsifiable et rétro-active** (ledger `xp_events` + état `user_progress` + `award_xp` SECURITY DEFINER + trigger `AFTER INSERT ON catches` + backfill) qui crédite à chaque prise, affichée en **lecture** (rang + barre XP) sur le profil public `/u/[username]` et le cockpit `/home`.

---

## Fait (par bloc)

### Bloc 0 — DB & attribution (`supabase/migrations/098_xp_progress.sql`, APPLIQUÉE prod)
- **`xp_events`** (ledger append-only) : `id bigint identity`, `user_id`, `kind`, `points`, `ref_type`, `ref_id`, `created_at`, **`unique(user_id, kind, ref_type, ref_id)`** (idempotence anti double-octroi). RLS on, **SELECT own only**, aucune écriture client.
- **`user_progress`** (état) : `user_id PK`, `total_xp bigint`, `current_week_streak`/`longest_week_streak`/`last_active_week` (**posées, remplies au Sprint 62**), `updated_at`. Pas de colonne `level` (calculé en TS). RLS on, SELECT own only.
- **`award_xp(user, kind, points, ref_type, ref_id)`** `SECURITY DEFINER SET search_path = public` : INSERT `ON CONFLICT DO NOTHING` + **incrément ATOMIQUE** `total_xp += points` (garde `FOUND` → idempotent ; row-lock via `ON CONFLICT DO UPDATE` → **concurrency-safe**, pas de lost-update ; **O(1)** par octroi, plus de `SUM` du ledger entier). Une **réconciliation agrégée finale** (§6 migration) garantit `total_xp == SUM(ledger)`. `REVOKE` de public/anon/authenticated ; `GRANT EXECUTE` à `service_role` uniquement.
- **`award_catch_xp(catches)`** (partagée trigger + backfill) : dérive les kinds depuis la ligne + l'historique **antérieur** (ordre `(created_at, id)` → backfill déterministe) :
  - `catch` **+10** (sauf rendements décroissants : au-delà de **3 prises même espèce même jour d'enregistrement**, la 4e+ → 0, anti-farm) ;
  - `new_species` **+50** (1re prise de l'espèce) ;
  - `personal_best` **+30** (prise **photo-vérifiée** dont `measured_length_cm` bat strictement le meilleur mesuré+vérifié antérieur de l'espèce — anti-farm, cf revue) ;
  - `measured` **+15** (`photo_verified_at IS NOT NULL`) ;
  - `released` **+4**.
- **Trigger `catches_award_xp` AFTER INSERT** (seul, jamais UPDATE → crédit une fois par prise).
- **`get_user_xp(uuid)`** `SECURITY DEFINER` (anon+authenticated) : rang **public** sur le profil — expose **uniquement `total_xp`** (agrégat, zéro fuite de prise/spot). `user_progress` reste RLS own-only. Même pattern que `get_spot_confirmation_count` (084).
- **Backfill idempotent** dans la migration : 20 prises → **42 events, 886 XP**, `user_progress.total_xp` == somme du ledger par user (recalculable à 100 %).
- **`lib/types.ts`** régénéré (ajout `xp_events`, `user_progress`, fn `get_user_xp`).

### Bloc 1 — Barème & rangs (`lib/gamification/levels.ts` + test)
- Table **explicite** des 9 rangs (Mousse 0 → Légende locale 15 000, audit §2.2.1). `levelFromXp(totalXp)` → `{ level, rankName, currentThreshold, nextThreshold, xpIntoLevel, xpForNextLevel }` + `levelProgress()`. Source **unique** des seuils.
- **11 tests** (`levels.test.ts`) : 0→Mousse, 1500→Fine gaule, dernier palier `nextThreshold=null`, clamp négatif/NaN, fractions. **Verts.**

### Bloc 2 — Composants (`components/gamification/`)
- **`RankChip`** (icône ancre + nom + `Lv.N` en mono), **`XpBar`** (`'use client'`, barre + libellé mono « X / Y XP » + anim d'entrée sobre, `role=progressbar` + aria, `motion-reduce`), **`RankProgress`** (compose les deux, réutilisé profil + home), **`HomeProgressCard`** (server, lit `getUserXp`).
- **`lib/gamification/progress.ts`** : `getUserXp(userId)` via la RPC (own + autrui). Lecture seule.
- **Daltonisme** : rang nommé en toutes lettres, chiffres en mono, barre doublée d'un libellé chiffré → aucune info par la seule teinte. `gold-700` en texte (AA), `gold-500` en accent sur navy.

### Bloc 3 — Placement
- **Profil public `/u/[username]`** : `RankProgress onDark` sous le pseudo (XP lue via `get_user_xp`, folded dans le `Promise.all` existant). Galerie/follows/gating inchangés.
- **Cockpit `/home`** : `HomeProgressCard` en tête de la section « Ta progression », **au-dessus** du `GamificationHub` (Pokédex/badges/séries **non touché** — refonte = Sprint 63). Composant dédié → zéro conflit avec la retouche « PRÈS DE TOI » du Sprint 59.

---

## Décisions notées (⚠️ = à valider par John)

- ⚠️ **Barème d'XP** (montants +10/+50/+30/+15/+4 + rendements décroissants) = **proposition audit §2.2.1**. Ajustable (hardcodé + commenté dans le trigger).
- ⚠️ **Noms de rangs** (Mousse → Légende locale) = **proposition audit**, branding à valider (`levels.ts`).
- **`release_undersize` (+8) DÉFÉRÉ** : aucune table de maille en DB (la réglementation vit côté app, `lib/regulation/`). Non calculable en SQL depuis le trigger. À câbler via une Server Action appelant `award_xp` au Sprint 61/62.
- **« Mesurée » = `photo_verified_at IS NOT NULL`** (pas de colonne `measured` en base ; même définition que le badge `prise_mesuree`, 066).
- **`personal_best` gaté PHOTO-VÉRIFIÉ** (durci suite à la revue) : +30 seulement si la prise est **photo-vérifiée** (`photo_verified_at`) ET bat strictement le meilleur mesuré+vérifié antérieur de l'espèce. Ferme le farm (une longueur auto-déclarée croissante SANS photo ne crédite aucun record). Aligne le PB sur le standard « records » de l'audit §2.4. La 1re prise vérifiée d'une espèce n'est pas un record.
- **Rendements décroissants groupés par `created_at`** (jour d'enregistrement), pas `caught_at` : anti-farm (`caught_at` est déclaratif/antidatable ; `created_at` ne l'est pas).
- **Suppression d'une prise : l'XP N'EST PAS révoquée** en v1 (le ledger reste ; l'unique + rendements décroissants évitent le farm). Documenté, pas sur-ingénieré.
- **`total_xp` exposé publiquement** via `get_user_xp` sur le profil : agrégat opaque (aucune prise, spot ni coordonnée) — cohérent avec le pivot ADN (rang public). `user_progress` reste RLS own-only.

---

## Comment tester (requêtes SQL de vérif)

```sql
-- Vue d'ensemble (recalculabilité : progress == ledger)
select (select count(*) from xp_events) events,
       (select sum(total_xp) from user_progress) total,
       (select bool_and(up.total_xp = agg.s) from user_progress up
          join (select user_id, sum(points) s from xp_events group by user_id) agg
            on agg.user_id = up.user_id) matches;   -- → 42, 886, true

-- Rang public d'un pêcheur (profil)
select get_user_xp('<user_id>');   -- ex. John → 250

-- Sécurité : en tant qu'authenticated, INSERT xp_events / UPDATE user_progress /
-- SELECT award_xp doivent renvoyer 42501 (insufficient_privilege) ; anon ne lit rien.
```

Front : `/u/<pseudo>` montre le rang + barre XP sous le pseudo ; `/home` montre l'encart « Ta progression » au-dessus du hub. (QA visuelle `qa-chrome` : voir §Reste.)

---

## Vérification

- **`pnpm test`** : **616/616 verts** (60 fichiers ; +11 `levels.test.ts`).
- **`pnpm typecheck`** : clean.
- **`pnpm build`** : **73/73 pages** générées, 0 erreur (⚠️ 2 faux-échecs de prerender `/techniques` + `/auth/reset-password` = file-lock Windows sur `.next`, pages non touchées par le sprint ; build propre après `rm -rf .next`).
- **Sécurité (empirique, live DB)** : écriture client refusée (42501 sur insert xp_events / update user_progress / call award_xp), anon ne lit rien (42501), trigger se déclenche pour authenticated malgré REVOKE (confirmé Postgres 17 : EXECUTE trigger checké à la création, pas au déclenchement).
- **Logique (empirique)** : diminishing returns (4e prise → pas de +10), new_species une fois, 1re mesure ≠ PB / 55>40 = PB, backfill **idempotent** (re-run → 886 inchangé).
- **Advisors** : 3 ERROR = baseline assumée (`spatial_ref_sys` + 2 `security_definer_view`). Mes objets absents des advisors ; `get_user_xp` volontairement anon-executable (même catégorie assumée que tous les compteurs publics).
- **Revue croisée indépendante (workflow multi-agents, 5 lentilles adversariales)** : DB-sécurité **GO** (aucun finding), anti-régression **GO**, honnêteté/vie-privée **GO**, frontend/a11y **GO**, correction-trigger **GO_WITH_FIXES**. **Tous les findings actionnables ont été corrigés puis re-vérifiés empiriquement** :

| Finding | Sévérité | Correctif appliqué |
|---|---|---|
| `personal_best` farmable (`measured_length_cm` auto-déclaré, découplé de la photo) | **MEDIUM** | PB gaté sur `photo_verified_at IS NOT NULL` (prise + meilleur antérieur). **Re-testé** : prise 99 cm NON vérifiée → `catch` seul (ni measured ni PB). Farm fermé. |
| `award_xp` re-`SUM` du ledger → lost-update concurrent | LOW | `award_xp` **incrémental** `+= points` (row-lock atomique, garde `FOUND`). |
| Même `SUM` → backfill O(N²) | LOW | Incrément O(1) + **réconciliation agrégée unique** (`total_xp == SUM`). Re-testé idempotent (886 inchangé). |
| `Lv.X` en `text-ink-400` échoue AA (3.46:1) sur clair | LOW | → `text-ink-500` (5.24:1, AA). |
| `HomeProgressCard` hors `<Suspense>` | NIT | Enveloppé en `<Suspense>` (streaming cohérent). |
| « infalsifiable » surpromis dans l'en-tête | (revue) | Reformulé « auditable / recalculable » + garde-fous farm explicités. |

Findings **assumés/différés** (non bloquants) : `released +4` uniforme vs audit `+8` sous-taille (déféré, faute de table de maille — cf `release_undersize`) ; test d'intégration SQL du barème (à ajouter quand John fige le barème) ; index `(user_id, created_at, id)` sur le hot path (inutile au volume actuel, éviterait un `unused_index`).

---

## Reste manuel John (post-sprint)

- **Valider** le **barème** (montants) et les **noms de rangs** (⚠️ marqués).
- **QA visuelle** (`qa-chrome`) : rang cohérent sur ton compte (`Seychi` → Pêcheur du dimanche, 250 XP) après backfill, sur `/u/Seychi` + `/home`.
- Relire → **merge `sprint-60` sur `main`** → déploiement (migration 098 déjà en prod ; `lib/types.ts` déjà régénéré).
- La migration 098 est **déjà appliquée en prod** (via connecteur write) : rien à rejouer côté DB.
