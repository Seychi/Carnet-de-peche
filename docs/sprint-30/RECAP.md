# Sprint 30 — RECAP
## « Aujourd'hui » : /home devient le cockpit du jour + désempilage de l'espace perso

> Exécuté le 2026-06-24. Mode : ultracode / effort xhigh. Branche : `sprint-30`.
> Brief : `docs/sprint-30/BRIEF.md`. Décision John (audit post-S28) : cockpit « Aujourd'hui », pas la fusion.

---

## En une phrase

`/home` répond désormais à « où/quand ça vaut le coup aujourd'hui, et qu'est-ce qui bouge près de moi » (présent + futur + progression), pendant que `/carnet` (le passé) et `/profil` (les réglages) cessent de se dupliquer. **Zéro nouvelle source de données, zéro migration** — on a recomposé l'existant.

---

## Ce qui a été fait

### Bloc 2 — Désempiler `/carnet` + dédupliquer `/profil` (fait en premier, le reste en dépend)
- **Gamification déplacée** : `GamificationHub` (Pokédex, streak, badges, défis) **retiré du bas de `/carnet`** → remonté sur `/home` dans la section « Ta progression ». Le carnet reste le **passé**.
- **Dédup `TES TENDANCES`** : `PersonalTendencies` (global, non-scopé) **retiré de `/profil`**. Il ne vit plus que sur **`/carnet`** (« ce que ton journal t'apprend »).
  - ⚠️ Nuance pour la VERIF : les usages **scopés** de `PersonalTendencies` (fiche spot « à ce spot », fiche espèce, panneau carte) sont **légitimes et hors périmètre** — ce sont des lectures contextuelles, pas le dashboard global. Le doublon visé par le brief (global sur `/carnet` **et** `/profil`) est bien supprimé.
- **`/profil`** = réglages uniquement (avatar + infos + espèces favorites + abonnement + zone de danger via `ProfileForm`). Plus aucun dashboard de patterns. Fetch allégé (plus de `getPersonalTendencies`/`getUserTier`).
- **`/carnet`** : journal + MES STATS + sorties + `PersonalTendencies` (1 fois) + insight créneau + filtres + liste. Respire mieux (un gros bloc en moins).

### Bloc 1 — Cockpit `/home` « Aujourd'hui »
Réécriture complète de `app/(app)/home/page.tsx` en dashboard **présent/futur/progression**, sections lourdes **streamées en `<Suspense>`** (premier paint immédiat). De haut en bas :
1. **En-tête** — `AUJOURD'HUI · {date} · {DÉPARTEMENT}` + `Salut {pseudo}` (composant `TodayHeader`).
2. **Maintenant** (`TodayForecast`) — bandeau de conditions **complémentaire** du bandeau instruments (eau/air/soleil, pas de doublon PM-BM/vent/houle) + **TON prochain créneau** : `ScoreRing` + `ScoreBreakdown` (score **solunar générique**, décomposé astro/marée/vent) + **overlay perso DESCRIPTIF distinct** (`TodayPersonalOverlay` : « Ce que ton carnet en dit » — top 1-2 tendances + confiance + lien vers le carnet, états vide/dégradé/plein honnêtes). **Pas** la carte « Tes tendances » du carnet → zéro doublon inter-pages.
3. **Cette semaine** (`TodayForecast`) — les 2-3 créneaux suivants (même pipeline solunar, 1 seul appel).
4. **Près de toi** (`NearYou`) — **compteur communautaire k-anon** « X prises partagées près de toi cette semaine » (via `get_catch_heatmap`) + 1-2 posts récents du fil départemental (lecture seule via `getFeedPage`). CTA « Ouvrir le fil ».
5. **Ta progression** — `GamificationHub` (streak + Pokédex 6/26 + badges + défis), déplacé ici.
6. **Action du jour** (`ActionOfTheDay`) — nudge honnête : sortie loguée aujourd'hui ✓ / sinon « note ta sortie, même bredouille » (liens `/carnet/nouvelle` + `/carnet/sortie`). Pas de coef inventé (Open-Meteo ne l'expose pas).

### Bloc 3 — États froids & honnêteté (réservoir vide)
- **Cold start (0 prise, dépt défini)** : `OnboardingBanner` (« dès 3 prises, ton carnet révèle TON score » + import/log) **par-dessus** un cockpit qui montre quand même la valeur du jour (conditions + créneau génériques). Jamais un score perso inventé.
- **Sans `home_department`** : `DeptChoosePrompt` (définir sa côte via `/profil`, ou explorer un fil) plutôt qu'un cockpit vide.
- **« Près de toi » vide** : message honnête « Sois le premier à loguer sur {dept} cette semaine ».
- **Progression à zéro** : états vides encourageants déjà gérés par les composants gamification (inchangés).

### Helpers (réutilisation, zéro nouvelle API)
- `lib/solunar/next-window.ts` → **`getUpcomingWindows(daily, count)`** (pur : filtre passé, tri chrono, slice).
- `lib/conditions/dept-window.ts` → **`getDeptUpcomingWindows(dept, count)`** : même pipeline (et même cache `spot-forecast-week`) que `getDeptNextWindow` → **aucun appel Open-Meteo supplémentaire**. La 1re fenêtre alimente « Maintenant », les suivantes « Cette semaine ».
- `lib/community/near-you.ts` (+ `near-you-core.ts` client-safe) → **`getNearbyCatchSignal(dept, days)`** : somme les counts des cellules **k-anon** de `get_catch_heatmap` sur une bbox département. Best-effort (jamais d'erreur), sous-estime plutôt que de fuiter.

---

## Garde-fous respectés

- **GPS** : « Près de toi » lit **exclusivement** la RPC `get_catch_heatmap` (migration 040) — agrège `geom_public` (jamais `geom`), **k-anon K=3 strict**, ne renvoie que des centroïdes de grille + des counts. On n'affiche qu'un **compte agrégé**, jamais un point. Aucune table directe requêtée, **aucune migration**, **aucune RPC/vue de floutage touchée**.
- **Honnêteté du scoring** : le seul chiffre 0-100 affiché est le **solunar générique** (identique pour tous). Le perso reste **descriptif** (où/quand tombent tes prises) — jamais un score perso fabriqué.
- **Perf** : réutilise les caches existants (`weather_cache` + `unstable_cache` solunar) → pas de double-fetch ; sections lourdes en `<Suspense>`. Aucune dépendance ajoutée.
- **Gating** : inchangé. Aperçu gratuit (créneau + tendance) ; l'alerte proactive reste l'upsell Local+ via `PersonalTendencies` (cf décision ci-dessous).

---

## Comment tester

1. **`/home` avec dépt + prises** : header du jour, « Maintenant » (conditions + créneau + score décomposé + overlay perso), « Cette semaine » (2-3 créneaux), « Près de toi » (compteur k-anon + posts), « Ta progression » (gamification), « Action du jour ».
2. **Cold start** : compte sans prise → bannière d'amorçage + cockpit générique honnête.
3. **Sans département** : compte `home_department` vide → invite à choisir sa côte.
4. **`/carnet`** : plus de gamification en bas ; `PersonalTendencies` toujours présent (1 fois).
5. **`/profil`** : plus de bloc TES TENDANCES — réglages uniquement.
6. **Réseau** : vérifier qu'ouvrir `/home` n'ajoute pas d'appel Open-Meteo redondant (cache partagé avec le bandeau instruments) et que « Près de toi » ne renvoie que des comptes (jamais de lat/lng de prise).

---

## Reste manuel John (post-sprint)

- **Trancher le gating du score perso du cockpit** : appliqué par **défaut = aperçu gratuit** (créneau + tendance descriptive gratuits ; l'alerte proactive reste l'upsell Local+). À confirmer ou basculer vers « accroche payante » (Chantier F) si tu préfères.
- **Relire `/home` sur ton téléphone** (c'est LA page quotidienne) — `qa-chrome` device n'a pas pu tourner avant déploiement (preview non publiée). Vérifier au pouce + les états froids.
- **Merge** `sprint-30` → `main` → déploiement.
- Note : le cockpit prépare directement le futur **« tab Aujourd'hui »** natif + le contenu des **notifications push** (sprint à venir).

---

## Fichiers

**Modifiés** : `app/(app)/home/page.tsx` (réécrit), `app/(app)/carnet/page.tsx`, `app/(app)/profil/page.tsx`, `lib/conditions/dept-window.ts`, `lib/conditions/spot-forecast.ts` (mémoïsation React `cache()`), `lib/solunar/next-window.ts`.
**Nouveaux** : `components/home/{home-ui,TodayForecast,TodayPersonalOverlay,NearYou}.tsx`, `lib/community/{near-you,near-you-core}.ts`, tests `lib/community/__tests__/near-you.test.ts` + `lib/solunar/__tests__/next-window.test.ts`.

## VERIF (workflow multi-agents : gates + 3 revues indépendantes)

- **Gates GREEN** : `typecheck` ✓ · `lint` ✓ (0 warning) · `test` ✓ (**527** tests, 51 fichiers, dont +10 nouveaux) · `build` ✓ (toutes routes compilées).
- **Sécurité GPS : pass** — « Près de toi » lit exclusivement la RPC k-anon ; aucune migration / RPC / vue de floutage touchée ; aucune coord n'atteint le client.
- **Correction & honnêteté : pass** — aucun score perso 0-100 inventé ; 4 états froids honnêtes ; tutoiement partout ; liens valides.
- **Correctifs appliqués après la revue archi** :
  1. **(major) overlay perso distinct** : `/home` n'utilise plus la carte globale `PersonalTendencies` (qui serait un doublon de `/carnet`) mais un `TodayPersonalOverlay` dédié → critère « `PersonalTendencies` sur une seule page (`/carnet`) » **tenu à la lettre**.
  2. **(minor) `fetchSpotConditions` mémoïsé** (React `cache()`) → plus de double lecture entre bandeau et cockpit, plus de course en cache froid.
  3. **(minor) `NearYou` allégé** : lecture directe de 2 posts sur `feed_posts_for_viewer` au lieu de charger/signer 20 via `getFeedPage`.
  4. **(minor honnêteté) copy** : titre cold start « te révéler TON score » → « te dit OÙ et QUAND ça mord pour toi » (pas de promesse de score chiffré).
