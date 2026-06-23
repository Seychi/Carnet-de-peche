# Sprint 22 — Brief d'exécution
## Le carnet qui parle — scoring perso RÉEL et visible (Chantier A)

> Rédigé le 2026-06-23. Durée cible : ~5-7 jours (le plus gros sprint de la P2). Phase **P2 — Le moat réel**.
> Contexte : `docs/audits/AUDIT-2026-06-23.md` + `docs/ROADMAP-2026-H2.md` (Chantier A). C'est LE sprint qui transforme le produit : aujourd'hui le score affiché partout est un solunar **générique**, donc on ressemble à « un solunar de plus ». Après, le carnet **parle** : il montre où et quand tombent TES prises.
> Décisions John 2026-06-23 : roadmap P2 validée. **Trois décisions produit bloquantes restent à trancher (cf §Décisions) avant le code.**

**Préalable avant de démarrer (manuel John)** : sprint 21 (socle) idéalement mergé (tests catch CRUD + RLS en place). Trancher les décisions D-A1/D-A2/D-A3 ci-dessous.

> ⚠️ **Correction de cadrage vs la roadmap (important).** L'exemple « tu prends 70 % de tes bars en marée descendante, **coef > 80** » **n'est pas réalisable en v1** : vérifié en prod, `catches.tide_state` est NULL sur 16/16 prises et **aucun coefficient de marée n'est calculé** (choix assumé : `lib/conditions/tide.ts` n'invente aucun coef). Le perso honnête v1 porte donc sur **l'heure, le jour, le mois/saison** (dérivés de `caught_at`, fiables à 100 %) et **partiellement le vent**. La marée/coef est un **workstream conditionnel** (WS-D) à financer ou à exclure explicitement de l'UI.

---

## 🚀 Ligne de lancement (à copier-coller par John)

> **ultracode — effort xhigh.** Exécute `docs/sprint-22/BRIEF.md`. **Ne démarre PAS** tant que les décisions D-A1/D-A2/D-A3 ne sont pas tranchées (elles sont en tête du brief). Une fois tranchées : lance **WS-A (unification moteur) et WS-C (anti cold-start) en parallèle** ; **WS-B (UI) dépend de WS-A** ; **WS-D (marée) seulement si D-A2 = oui**. Termine **obligatoirement** par le **workstream VERIF** (agent indépendant). **Ne push pas, ne déploie pas, n'applique aucune migration en prod.** Invariants : **descriptif jamais prédictif** (cf 7.5), `auth.uid()`/`user.id` serveur jamais un uid client, tutoiement, zod FR, RLS jamais désactivé, migration = fichier numéroté + regen `lib/types.ts`.

---

## 🧠 Connecteurs & sous-agents (cf `CLAUDE.md` §20)

| Quand | Sous-agent → connecteur | Pourquoi |
|---|---|---|
| Avant de toucher au modèle perso / aux RPC | **supabase-guard** → Supabase (RO) | Confirmer l'état des données (`select count(*) filter (where tide_state is not null) from catches`, désync `wind_speed_kmh` colonne↔`conditions`), le modèle `get_quality_cells` (auth.uid), `current_tier`. **Lecture seule.** |
| Avant lib externe (SunCalc, date-fns TZ, Vitest) | **docs-researcher** → Context7 | API version-correcte. Pas de code de mémoire. |
| QA réelle fiche spot + carte + profil | **qa-chrome** → Claude in Chrome | Vérifier l'overlay perso (états plein/dégradé/vide), gating, copy non-prédictive. |
| Après déploiement (John) | **deploy-watch** → Vercel + Sentry | Zéro régression runtime. |
| Clôture | **`/verif-sprint`** | tests + build + types + lint + revue indépendante + passe anti-régression. |

---

## Objectif du sprint en une phrase

Sur la fiche spot, la carte et le profil, l'utilisateur connecté voit **son score global générique ET, à côté, SES tendances descriptives** (« 70 % de tes prises de bar ici : le matin »), calculées depuis son carnet, **avec un niveau de confiance**, **dégradant proprement** quand il a peu de prises — le tout via **un seul** moteur perso (fini les 3 systèmes divergents).

---

## Diagnostic (établi par lecture du code + prod — point de départ)

1. **Le multiplicateur perso est du code mort.** Le câblage `personalMultiplier` existe (`lib/solunar/scoring.ts` → `index.ts`) mais **aucun des 5 call-sites** de `computeWeeklyForecast` ne le passe. → à **retirer**, pas à raviver (raviver = refaire l'erreur 7.5).
2. **Le perso descriptif existe DÉJÀ en double.** Système A : `lib/scoring/{patterns,insights,catch-analysis,personal-fetcher}.ts` → `components/scoring/PersonalScoreSection.tsx` → **/profil**. Système B : `lib/catches/insights.ts` → `app/actions/map-insights.ts` (`getMapScoreInsights`) → `components/catches/PersonalInsights.tsx` → **panneau carte `components/map/ScorePanel.tsx`** (gaté Local/Itinérant). Deux barèmes, deux conventions jour/nuit. → **unifier en un module + un composant.**
3. **La donnée pour parler marée/coef n'existe pas.** `tide_state` NULL 16/16 ; coef jamais calculé. Le snapshot `conditions` (jsonb, `lib/conditions/openmeteo.ts`) remplit air/eau temp, **vent**, pression, nébulosité, précip, vagues — mais `tide_state`/`tide_coefficient`/`next_*_tide_at` = toujours `null`. → v1 perso = **heure/jour/saison (fiable) + vent (partiel, à fiabiliser : désync colonne 5/16 vs jsonb 12/16)**.
4. **Cold-start = le cas normal.** Prod : 16 prises, 6 users, max 8/user, **1 seul** user ≥5 prises. Sans dégradation gracieuse + import de prises passées, la feature est **vide pour ~tout le monde**.
5. **Contrainte 7.5 (à graver).** Descriptif (« où/quand tombent tes prises »), **jamais** prédictif (« tu pêches mieux / tu prendras plus »). Composante absente = **omise**, jamais inventée. Toujours afficher `sampleCount` + confiance (`lib/scoring/insights.ts:confidence()` : <5 low / ≤20 medium / >20 high). **« TON score » n'est PAS un nombre 0-100 concurrent du global** — ce serait re-fabriquer le multiplicateur. C'est un bloc de **tendances**.
6. **Le scoring global est sain** (`spot_scores` : 157/157 spots, pipeline OK) — on n'y touche pas, on l'augmente d'un volet perso à côté.

---

## Décisions à trancher AVANT le code (⚠️ DEMANDER À JOHN)

- **D-A1 — Tier de l'overlay perso sur la fiche spot.** Le carnet est positionné « moat **gratuit** » (§8 CLAUDE.md), mais le panneau carte « Ton score » est gaté Local+. Quel tier pour le bloc perso de la fiche spot : **gratuit** (cohérent moat carnet) ou **Local+** (cohérent carte) ? *Reco : gratuit pour les tendances descriptives perso (c'est TA donnée), Local+ seulement pour les couches premium. À confirmer.*
- **D-A2 — Marée/coef perso : on finance WS-D ou on l'exclut de la v1 ?** Si oui → enrichir `tide_state` + un « marnage » honnête (pas un coef SHOM inventé) + backfill. Si non → **interdire toute mention marée/coef** dans l'UI perso v1.
- **D-A3 — Formulation « global vs TON score ».** Valider que « TON score » = **tendances descriptives** (pas un chiffre 0-100 concurrent). *Reco : oui (anti-7.5).*

---

## Workstreams & dépendances

| WS | Bloc | Durée | Dépend de | Parallèle J1 |
|----|------|-------|-----------|--------------|
| **A** | Unifier le moteur perso descriptif (+ kill code mort) | 2 j | décisions | ✅ (après décisions) |
| **B** | UI « score global + TES tendances » (fiche spot, carte, profil) | 2 j | A, D-A1 | ❌ après A |
| **C** | Anti cold-start : import de prises passées | 1,5-2 j | décisions | ✅ |
| **D** | *(conditionnel D-A2)* Enrichissement marée des prises + backfill | 1,5 j | D-A2 = oui | ✅ si financé |
| **VERIF** | Revue finale indépendante | 0,5 j | tous | ❌ (dernier) |

---

## Bloc A — Unifier le moteur perso descriptif (+ supprimer le code mort)

Un seul module perso, segmentable **par espèce** et **par proximité de spot**, réutilisé partout.

> **Connecteurs** : **supabase-guard** (RO) pour valider les champs réellement remplis avant de coder les buckets ; **docs-researcher** pour date-fns/SunCalc si calcul jour/nuit.

### Tâches
1. Fusionner `lib/scoring/{insights,patterns,catch-analysis,personal-fetcher}.ts` + `lib/catches/insights.ts` en **un** module perso (proposition : `lib/scoring/personal/`), barème + seuils + convention jour/nuit **uniques**. Sortie par insight : `{ factor, label, sampleCount, confidence, hasData }`, **segmentable par espèce**.
2. **Supprimer le code mort** : `personalMultiplier` dans `lib/solunar/{scoring,index}.ts` ; `insights-matcher.ts` / `InsightChip.tsx` (déjà `@deprecated`) ; le `revalidateTag('personal-profile-…')` **no-op** dans `lib/catches/actions.ts`.
3. **Fiabiliser le vent** : réconcilier `catches.wind_speed_kmh` (colonne) avec `conditions.wind_speed_kmh` (jsonb) — préférer le jsonb si la colonne est nulle (désync 5/16 vs 12/16).
4. Lecture des prises **toujours** via `catches_for_viewer` filtré sur `user.id` serveur (uniformiser `personal-fetcher` qui lit la table brute), jamais un uid client (modèle `get_quality_cells`).

### Critères d'acceptation
- `grep -rn "personalMultiplier" lib app` = **0** (hors archive/docs). `InsightChip`/`insights-matcher` supprimés.
- `pnpm vitest run lib/scoring lib/catches` vert ; nouveaux tests : buckets heure/jour/saison + segmentation par espèce + `confidence()` par paliers.
- Aucun insight produit sans `sampleCount`. Un appel avec l'uid d'un **autre** user ne renvoie rien (test anti-usurpation).

### Garde-fous
- ⚠️ Ne PAS réintroduire de multiplicateur/score perso chiffré. Descriptif uniquement.
- Ne pas toucher au scoring global (`spot-scores-job`, `spot_scores`).

---

## Bloc B — UI « score global + TES tendances »

Un composant perso unique, réutilisé sur fiche spot + carte + profil, avec 3 états : plein / dégradé / vide.

> **Connecteurs** : **qa-chrome** pour les 3 états sur `/spots/[slug]`, `/carte` (panneau Ton score), `/profil`.

### Tâches
1. Composant `components/scoring/PersonalTendencies.tsx` (remplace `PersonalScoreSection` + `PersonalInsights`), props : insights unifiés (Bloc A) + `sampleCount` + `confidence` + contexte (espèce/spot).
2. **Fiche spot** `app/(marketing)/spots/[slug]/page.tsx` : sous `SpotBestMomentsSection` / dans `ScoreBreakdown`, ajouter « Tes tendances pour [espèce] ici » (filtré espèces du spot + proximité). Gating selon **D-A1**. Passer `userTier` (via `lib/auth/tier.ts`).
3. **Carte** `components/map/ScorePanel.tsx` : remplacer `PersonalInsights` par le composant unifié (gating inchangé).
4. **Profil** `app/(app)/profil/page.tsx` : remplacer `PersonalScoreSection` par le composant unifié.
5. **États** : plein (assez de prises) / **dégradé** (« encore N prises pour débloquer tes tendances de bar ») / vide (CTA loguer + import WS-C). Confiance visible (libellé, pas que couleur — DA v2, daltonien-safe).

### Critères d'acceptation
- `/spots/[slug]` connecté : si l'user a des prises de l'espèce → bloc tendances ; sinon → état dégradé/vide honnête. **Aucun chiffre 0-100 perso** à côté du global (revue anti-7.5).
- Carte + profil affichent le **même** composant (plus de divergence visuelle).
- Copy 100 % descriptive : `grep -rniE "pêch(e|es) mieux|tu prendras|prédit" components app` = 0 sur les blocs perso.

### Garde-fous
- ⚠️ Gating = décision D-A1. Par défaut, ne pas gater plus que la carte ne l'est déjà sans go de John.
- DA v2 : chiffres en `font-mono`, info jamais portée par la seule couleur.

---

## Bloc C — Anti cold-start : import de prises passées

Sans volume, le perso est vide. On permet d'amorcer son carnet rétroactivement.

> **Connecteurs** : **docs-researcher** (parsing CSV léger éventuel) ; **supabase-guard** pour vérifier le flag `out_of_coverage` à l'enrichissement rétro.

### Tâches
1. Flow « Ajouter mes prises passées » : saisie rapide multi-prises (espèce, date, taille, spot/approx). CSV optionnel (décision périmètre).
2. Enrichissement best-effort des prises rétro via `fetchConditionsAt(date, lat, lng)` (openmeteo historique) → remplit `conditions` (vent, etc.) ; flag `out_of_coverage` si hors zone.
3. Point d'entrée à l'onboarding **et** dans le carnet (`/carnet`).

### Critères d'acceptation
- Un compte test passe de 0 à ≥5 prises via l'import et **voit l'overlay perso s'activer** (Bloc B).
- Prises rétro hors zone correctement flaggées `out_of_coverage` (exclues des stats, comme l'existant).
- Validation zod FR ; aucune prise créée sans espèce/date valides.

### Garde-fous
- ⚠️ DEMANDER À JOHN : périmètre import v1 (saisie manuelle seule vs + CSV).
- Respecter le floutage : les prises importées suivent les mêmes règles de privacy/geom que les prises normales.

---

## Bloc D — *(conditionnel D-A2)* Enrichissement marée des prises

Le plus risqué. **Ne se lance que si D-A2 = oui.** Sinon, ce bloc est remplacé par une règle : **interdire toute mention marée/coef dans l'UI perso v1**.

> **Connecteurs** : **docs-researcher** (Open-Meteo Marine : dispo `sea_level_height_msl`, dérivation extrema) ; **supabase-guard** pour le backfill (lecture d'abord).

### Tâches
1. Dériver `tide_state` (montante/descendante via pente des extrema de `lib/conditions/spot-forecast.ts`) au moment du log (`fetchConditionsAt`/`createCatch`).
2. Dériver un **« marnage » honnête** (amplitude PM-BM), **jamais** un « coefficient SHOM » inventé (libellé « marnage », pas « coef »).
3. **Backfill** des prises passées (migration data + script) — lecture d'abord, écriture confirmée par John.

### Critères d'acceptation
- `select count(*) filter (where tide_state is not null) from catches` > 0 après backfill.
- `lib/conditions/tide.ts` n'invente toujours aucun coefficient officiel ; l'UI dit « marnage », pas « coef SHOM ».
- Le moteur perso (Bloc A) peut alors ajouter un facteur marée **descriptif** (omis si données insuffisantes).

### Garde-fous
- ⚠️ Si D-A2 = non : **ce bloc n'existe pas**, et l'UI perso ne mentionne ni marée ni coef (sinon promesse vide).
- Ne pas appliquer le backfill en prod depuis l'agent (fichier + script ; application = John).

---

## Workstream VERIF (obligatoire, agent indépendant)

1. `/verif-sprint` : `pnpm test` + `typecheck` + `lint` + `build` (Node 24), puis revue croisée du `git diff main...HEAD` contre les AC.
2. **Passe anti-régression ciblée** : (a) **honnêteté** — grep anti-copy prédictive sur tous les blocs perso ; (b) **anti-usurpation** — lecture perso refuse un uid d'autrui ; (c) `geom` précis jamais lu en gratuit ; (d) gating de tier cohérent (D-A1) ; (e) scoring global inchangé (`spot_scores` intact).
3. Vérifier qu'aucune migration/backfill n'a été appliqué en prod par les agents.
4. Livrer `docs/sprint-22/RECAP.md` : fait / comment tester / reste manuel John.

---

## Reste manuel John (post-sprint)

1. Relire la branche → merge `main` + déploiement.
2. Si WS-D : appliquer la migration/backfill marée en prod, puis regen `lib/types.ts`.
3. QA réelle (qa-chrome) des 3 états perso sur device.
4. deploy-watch : zéro régression ; vérifier que la copy live reste descriptive.

---

## Dépendance vers le sprint 23

Le composant perso unifié (Bloc A/B) sera **réutilisé sur la fiche espèce** (sprint 23, score par espèce). Garder l'API du module perso **segmentable par espèce** dès maintenant.

*Brief produit le 2026-06-23 (mode ultracode/xhigh, suit `docs/BRIEF-TEMPLATE.md`). Cartographie source : exploration code scoring 2026-06-23.*
