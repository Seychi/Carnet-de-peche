# Sprint 38 — Brief d'exécution
## « Le partage qui rend viral » (moteur de partage social façon Strava · ~6-7 j)

> Rédigé le 2026-06-27. 2ᵉ sprint de la roadmap offensive (`docs/ROADMAP-OFFENSIVE-2026-06-27.md` §5). **Recentré** sur la demande explicite de John : un vrai moteur de partage social, comme le résumé de course Strava, pour créer **virularité + acquisition** (répond au trou « 0 trafic organique » de l'audit `docs/audits/AUDIT-2026-06-27-SITE-10-AVANT-MOBILE.md` §5).
> Contenu : **F5 élargi** = générer une belle **carte image partageable** (d'une prise, et du résumé « tes conditions gagnantes »), avec page publique + preview réseaux sociaux, **sans jamais révéler le spot** (anti spot-burning = différenciateur). **F3** (marées vérifiées port par port) reste en second (WS E, peut slipper au sprint 39 si le moteur consomme le sprint).
> Décisions John 2026-06-27 : partage social = **priorité**. Une décision ouverte (D1, photo) à trancher.

**Préalable** (manuel John) : partir de `main` (sprint 37 mergé de préférence, car la carte de prise affiche le leurre `gear_id`). Trancher **D1** (photo sur la carte) avant le WS B+, sinon l'agent ship la carte « instrument » sans photo (chemin par défaut) et s'arrête sur le garde-fou pour la variante photo.

---

## 🚀 Ligne de lancement (à copier-coller par John)

> ultracode — effort xhigh. Exécute `docs/sprint-38/BRIEF.md`. Lance **WS A et WS E en parallèle dès maintenant**, puis WS B (dépend de A), WS C (dépend de A+B), WS D (dépend de A). La carte image se génère **server-side via `next/og`** (déjà dans le repo), PAS via html2canvas. Invariants : **zéro coordonnée GPS dans une carte partagée**, opt-in explicite, scoring **descriptif**, copy sans tiret cadratin. Migrations en fichiers numérotés `061`/`062`, applique, régénère `lib/types.ts`. Termine par **VERIF** avec **QA partage réelle** (preview OG + Web Share mobile). **Ne push pas.** Décision ouverte → `⚠️ DEMANDER À JOHN`.

---

## 🧠 Connecteurs & sous-agents (cf `CLAUDE.md` §20)

| Quand | Sous-agent → connecteur | Pourquoi |
|---|---|---|
| `next/og` (`ImageResponse`/Satori), Web Share API, React 19 edge | **docs-researcher** → Context7 | API version-correcte (Satori ne supporte pas tout le CSS ; Web Share `files`). |
| Migration `shared_cards` / `tide_calibration`, RLS public-read, vues | **supabase-guard** → Supabase (RO d'abord) | Pattern RLS « lecture publique par slug / écriture owner », regen types, `get_advisors`. |
| QA partage : preview OG (debugger), rendu carte, Web Share device | **qa-chrome** → Claude in Chrome + Playwright | Vérifier l'image générée, les meta OG, le partage mobile réel, 0 fuite GPS. |
| Après déploiement | **deploy-watch** → Vercel + Sentry | Routes edge OG sans erreur runtime. |
| Clôture | **`/verif-sprint`** | Tests + build + lint + types + revue indépendante. |

---

## Objectif en une phrase
Permettre à un pêcheur de générer, en un tap, une **carte image léchée** de sa prise (ou de ses « conditions gagnantes ») et de la partager sur les réseaux via une page publique `/c/[slug]` à preview soignée, **sans jamais exposer ses coordonnées**, pour transformer chaque belle prise en acquisition.

## ⚠️ Garde-fous transverses (à lire avant tout)

1. **Architecture edge obligatoire** : la route OG tourne en `runtime='edge'` (`app/og/spot/[slug]/route.tsx:6`) → elle **ne peut PAS** lire `catches_for_viewer`, appeler `getPersonalTendencies` (server-only, `lib/scoring/personal/fetch.ts:1,26`), ni signer une photo privée. **Donc** : une **server action server-only** calcule le payload et écrit une ligne `shared_cards` (payload **public, sans geom**) ; l'**edge ne lit QUE `shared_cards`** via client anon (exactement comme `lib/conditions/openmeteo.ts:126-137` lit `weather_cache` en anon).
2. **Zéro spot-burning** : un payload `shared_cards` ne contient **jamais** de `geom`/coordonnée. La carte montre `location_label` + département (texte), jamais un point. C'est aussi un argument marketing (« partage ta prise sans cramer ton spot »).
3. **Opt-in strict** : `catches.privacy` vaut `private` par défaut (`001_init.sql:83`). Créer une carte = action explicite de l'utilisateur sur SA prise. On prévient « ta carte sera publique (sans tes coordonnées) ». Carte révocable (suppression de la ligne → 404).

## Workstreams & dépendances

| WS | Bloc | Durée | Dépend de | Parallèle J1 |
|----|------|-------|-----------|--------------|
| A | Infra partage : `061_shared_cards` + server action `createShareCard` (payload geom-free : prise + conditions) | 1,5 j | — | ✅ |
| B | Route OG edge `app/og/card/[slug]` (template marin extrait, layouts prise+conditions, formats OG 1200×630 + Story 1080×1920) | 2 j | A | ⚠️ après A |
| C | Page publique `/c/[slug]` + UX partage (Web Share avec image, download, points d'entrée) | 1,5 j | A, B | ⚠️ après A/B |
| D | Cadrage « record perso » + garde-fous opt-in/privacy | 0,5 j | A | ⚠️ après A |
| E | F3 — Marées vérifiées port par port (`062_tide_calibration` + verify-tides + UI) | 1 j | — | ✅ (peut slipper) |
| VERIF | revue + QA partage réelle | 0,5 j | tous | ❌ |

**Parallèle jour 1 : A + E.** Puis B (sur A), C (sur A+B), D (sur A).

---

## WS A — Infra de partage (`061_shared_cards` + `createShareCard`)

La fondation : une table publique-en-lecture qui porte tout ce qu'une carte affiche, sans rien de privé.

> **Connecteurs** : supabase-guard (pattern RLS lecture-publique/écriture-owner ; lire la déf. de `catches_for_viewer` `059:70-118` et le type `ConditionsSnapshot` avant) ; docs-researcher au besoin.

### Tâches
1. `supabase/migrations/061_shared_cards.sql` — table `shared_cards` :
   - `id uuid pk default gen_random_uuid()`, `slug text unique not null` (slug **aléatoire non énumérable**, ex. 12 car. base62 généré côté action), `user_id uuid not null references auth.users(id) on delete cascade`, `kind text not null check (kind in ('catch','conditions'))`, `payload jsonb not null`, `created_at timestamptz default now()`.
   - **RLS** (gabarit confirmé) : `enable row level security` ; `select` **public** `for select to anon, authenticated using (true)` (modèle `weather_cache` `045:32-41`) ; `insert` **owner** `for insert to authenticated with check (user_id = (select auth.uid()))` (modèle `gear_items` `059:44-46`) ; `delete` **owner** (révocation). Index `shared_cards_user_idx`, `shared_cards_slug_idx`.
   - `COMMENT ON TABLE` : « cartes de partage social, payload PUBLIC sans geom ».
2. Server action `app/actions/share.ts` → `createShareCard(input: { kind:'catch', catchId } | { kind:'conditions' }): Promise<{ slug }>` (server-only) :
   - **kind 'catch'** : lire la prise via `catches_for_viewer` (jamais la table) en scoping `auth.uid()` (refuser si la prise n'appartient pas à l'user). Construire un **payload geom-free** : `{ species, size_cm, weight_g, caught_at, location_label, department, gear_label, conditions: { tide_state, tide_range_m, wind_speed_kmh, water_temperature_c }, is_personal_best }`. **Aucun** `geom`, `lat`, `lng`, `spot_id` résolvant à des coords. Les clés conditions viennent de `ConditionsSnapshot` (`lib/conditions/openmeteo.ts:8-29` : `tide_state:24`, `tide_range_m:25` = marnage, `wind_speed_kmh:13`, `water_temperature_c:12`). `tide_coefficient` est **toujours null** (`:26`) → ne pas l'afficher.
   - **kind 'conditions'** : appeler `getPersonalTendencies()` (sans scope = récap global, `fetch.ts:26`) ; payload = `{ sampleCount, tendencies: [{factor,label,share,confidence}], generatedFor: 'YYYY-MM' }` (type `Tendency` `types.ts:29-37`). Si `sampleCount < minToUnlock`, renvoyer une erreur « pas assez de prises » (pas de carte vide).
   - Réutiliser une carte récente identique si elle existe (éviter les doublons), sinon insérer. Retourner le `slug`.
3. Régénérer `lib/types.ts`.

### Critères d'acceptation
- `createShareCard({kind:'catch', catchId})` sur MA prise → ligne `shared_cards`, payload **sans aucune clé geo** (vérif : `select payload from shared_cards` ne contient ni `geom`/`lat`/`lng`/`spot_id`).
- Tenter de partager la prise d'un autre user → refus (scoping `auth.uid()`).
- Lecture publique : un client **anon** peut lire `shared_cards` par slug (test supabase-guard), écriture impossible côté anon.
- `kind:'conditions'` sous le seuil → erreur propre, pas de carte.

### Garde-fous
- Lecture des prises **toujours** via `catches_for_viewer` (jamais `catches`). Aucune écriture service-role nécessaire (insert-own suffit).
- Slug aléatoire (cartes non énumérables).

---

## WS B — Route OG edge `app/og/card/[slug]` (le visuel qui circule)

La carte image elle-même, façon Strava : stat héro + stats secondaires + cadrage + marque.

> **Connecteurs** : docs-researcher (limites Satori/`next/og`, pas de `<mask>`) ; qa-chrome (rendu image + ratios).

### Tâches
1. **Extraire un template marin partagé** depuis `app/og/spot/[slug]/route.tsx` (aujourd'hui tout y vit, pas de module commun) vers `lib/og/template.tsx` : palette hex `:9-14` (`NAVY950 #04141C`, `NAVY700 #155A73`, `TEAL #14B8A6`, `TEAL300 #5EEAD4`, `SAND50 #FBF8F2`), isobathes `:42-46`, labels profondeur `:48-52`, fond `<svg viewBox="0 0 1400 700">` `:89-105`, **logo SVG inline** `:233-249` (Satori-safe, NE PAS utiliser `<mask>`), footer marque+URL `:217-259`. Réutiliser **verbatim**.
2. Route `app/og/card/[slug]/route.tsx` : `export const runtime='edge'` ; `GET(req, {params})` lit `shared_cards` par slug via `createClient(@supabase/supabase-js, ANON_KEY)` (modèle `app/og/spot/[slug]/route.tsx:26-38`) ; 404 si absent. Deux **layouts** selon `payload.kind` :
   - **`catch`** : héro = espèce + **taille** en gros `font-mono` (ex. « BAR · 62 cm »), poids en sous-titre ; rangée de « stats » instrument (marée descendante, marnage `tide_range_m` m, vent km/h, temp eau) ; ligne lieu = `location_label` + département (**jamais de coord**) ; date ; leurre (`gear_label`) ; pastille **« Record perso »** si `is_personal_best`.
   - **`conditions`** : titre « Mes conditions gagnantes » + 3-4 tendances dominantes (`label` + `share`%), façon « wrapped ».
3. **Deux formats** via `?format=` : `og` (1200×630, défaut, pour les previews de lien) et `story` (1080×1920, 9:16, pour le post Stories/TikTok). Dimensions passées à `new ImageResponse(jsx, { width, height })` (modèle `:262`).
4. Marque toujours présente (logo + `carnet-de-peche.com`) pour que même une capture d'écran fasse de l'acquisition (le « via Strava » de Strava).

### Critères d'acceptation
- `/og/card/{slug}` rend une image 1200×630 léchée pour une prise ; `?format=story` rend 1080×1920.
- **0 coordonnée** visible ; lieu = label + département seulement.
- Rendu correct des accents FR et du `font-mono` pour les chiffres ; pas d'erreur Satori (pas de `<mask>`).
- Carte `conditions` lisible et descriptive (aucun score 0-100, aucune formulation prédictive).

### Garde-fous
- Edge : pas de `server-only`, pas d'accès `catches_for_viewer` ni `getPersonalTendencies` (uniquement `shared_cards` en anon).
- Ne pas régresser les routes OG existantes (`/og/spot`, `/og/spots`, especes) en extrayant le template.

---

## WS C — Page publique `/c/[slug]` + UX de partage (la boucle virale)

> **Connecteurs** : docs-researcher (Web Share API `files`, fallback) ; qa-chrome (Web Share sur device, preview OG via debuggers).

### Tâches
1. Page publique `app/(marketing)/c/[slug]/page.tsx` (groupe **marketing = public** ; `middleware.ts:9` `APP_ROUTES` ne contient pas `/c` → jamais redirigé vers login). Rend : la carte (image `/og/card/{slug}`) + un récap HTML + **CTA fort « Crée ton carnet en 30 s »**. `generateMetadata` : `openGraph.images` + `twitter.card='summary_large_image'` pointant `/og/card/{slug}` (preview riche sur iMessage/Discord/X/Facebook).
2. **Upgrade du partage existant** : `components/catches/CatchActionsDropdown.tsx:40-52` fait déjà un `navigator.share({title,url})` mais ne partage que l'URL de la prise (privée) et **aucune image**. Le réécrire : (a) appeler `createShareCard` → obtenir le slug ; (b) `navigator.share({ files:[imageFile], title, text, url:'/c/{slug}' })` en récupérant le blob de `/og/card/{slug}?format=story` (Web Share avec **fichier** = iOS Safari 15+/Android Chrome) ; (c) fallback desktop : copier le lien + bouton **« Télécharger l'image »**. Garder le toast « Lien copié » existant `:46-47`.
3. **Points d'entrée** : bouton « Partager ma prise » sur la fiche/ligne de prise (carnet) ; bouton « Partager mes conditions » sur le cockpit `/home` et le carnet (kind `conditions`).
4. Avertissement opt-in avant création (« ta carte sera publique, sans tes coordonnées ») + accès « gérer / supprimer mes cartes partagées » (révocation = delete RLS owner).

### Critères d'acceptation
- Coller un lien `/c/{slug}` sur X/Discord/iMessage affiche la grande carte (validé via OG debuggers / qa-chrome).
- Sur mobile, « Partager ma prise » ouvre la feuille de partage native **avec l'image** (Story 1080×1920) ; sur desktop, lien copié + image téléchargeable.
- La page `/c/[slug]` convertit (CTA carnet visible) et reste accessible sans login.
- Supprimer une carte → `/c/{slug}` renvoie un 404 propre.

### Garde-fous
- Ne jamais partager l'URL d'une prise privée à la place de `/c/[slug]`.
- `⚠️ DEMANDER À JOHN AVANT` d'ajouter un partage automatique (toujours opt-in manuel).

---

## WS D — Cadrage « record perso » (le hook Strava) + privacy

> **Connecteurs** : supabase-guard (lecture record via `catches_for_viewer`).

### Tâches
1. Calcul **record perso par espèce** (net-neuf) : `max(size_cm)` par `species` sur `catches_for_viewer` filtré `auth.uid()` (la vue applique déjà floutage + confidentialité). Exposer `is_personal_best` au payload `catch` (WS A) → pastille « Nouveau record perso » sur la carte (WS B).
2. Respect strict **anti-comparaison** (`lib/gamification/badges.ts:5-9`, `types.ts:4-5`) : « ton record perso de bar : 62 cm », **jamais** de classement ni « tu es meilleur que X ». Pas de leaderboard.
3. Vérifier l'**EXIF** : si D1 = carte avec photo, s'assurer que la photo poussée en public est **strippée EXIF** (le resize client `browser-image-compression` / `lib/storage/image-resize.ts` réencode en WebP → vérifier que la géoloc EXIF ne survit pas).

### Critères d'acceptation
- Une prise qui bat le record perso de l'espèce affiche « Record perso » ; sinon non.
- Aucune comparaison inter-pêcheurs nulle part.

### Garde-fous
- Record = strictement personnel et privé jusqu'à ce que l'user partage SA carte.

---

## WS E — F3 · Marées vérifiées port par port (second, peut slipper)

Transformer notre rigueur marées en argument anti-Fishing Grid (marées imprécises). Réutilise l'existant.

> **Connecteurs** : supabase-guard (table calibration) ; docs-researcher (Open-Meteo Marine si besoin).

### Tâches
1. Productioniser `scripts/verify-tides.ts` (compare déjà PM/BM dérivés vs SHOM sur 5 ports, biais signé, verdict 15 min) : étendre à **5 ports étalon par façade** (Manche / Atlantique / Méditerranée), figer + dater les résultats.
2. `supabase/migrations/062_tide_calibration.sql` : table `tide_calibration` (`port, lat, lng, facade, median_error_min, bias_min, sample_window, verified_at, source`), lecture publique (modèle `weather_cache` `045:32-41`), écriture service-role/seed.
3. UI confiance sur la fiche spot : « Marées calées sur le port de référence X, écart médian mesuré N min vs SHOM, audité le JJ/MM » (sourcé + daté, comme les fiches espèces). Honnête : si l'écart dépasse le seuil sur une façade, on l'affiche.

### Critères d'acceptation
- 5 ports audités, stockés, datés ; écart médian affiché sur la fiche spot.
- Aucun coef de marée inventé (`tide_coefficient` reste null).

### Garde-fous
- ⚠️ **DEMANDER À JOHN (D3)** : afficher juste la précision mesurée (reco v1) ou appliquer l'offset marée en prod (v2) ? Si non tranché → afficher seulement.
- Si le moteur de partage (A-D) consomme le sprint, **slipper E au sprint 39** (le noter dans le RECAP).

---

## Workstream VERIF (obligatoire, agent indépendant)
1. `/verif-sprint` : `pnpm test` + `pnpm build` + `pnpm typecheck` + `pnpm lint` + revue croisée.
2. **QA partage réelle (qa-chrome)** : générer une carte prise + une carte conditions ; vérifier le rendu image (OG 1200×630 + Story 1080×1920), la preview OG (coller le lien), et le **Web Share mobile avec image**. Captures avant/après.
3. **Passe sécurité / anti spot-burning (NON négociable)** : inspecter un échantillon de `shared_cards.payload` → **aucune** clé `geom`/`lat`/`lng`/`spot_id`/coord ; carte créée **uniquement** par le propriétaire de la prise ; lecture publique OK, écriture anon refusée ; `catches_for_viewer` toujours `security definer` + floutage intact ; advisors = pas de nouvelle alerte ; si D1=photo, EXIF strippé + bucket privé `catches` non exposé.
4. **Passe copy** : tutoiement, zod en français, **aucun tiret cadratin en prose** (`node scripts/lint-copy-dashes.mjs`), scoring descriptif (0 prédictif), pas de promesse mensongère.
5. **deploy-watch** (Vercel + Sentry) : routes edge OG sans erreur runtime.
6. Livrer `docs/sprint-38/RECAP.md` : fait / comment tester / reste manuel John / statut D1 + WS E (fait ou slippé).

---

## Décisions pour John
- **D1 (photo sur la carte)** — le bucket des photos de prise est **privé** (`006_catches_storage_extension.sql:66-74`, URL signées 1 h via service-role, `lib/catches/media.ts:56`) → une route **edge** ne peut pas l'afficher. **Reco** : v1 = **carte « instrument » sans photo brute** (toujours fiable, zéro risque privacy, droit dans la DA marine). **Fast-follow recommandé** (fort levier viral, le poisson = le money-shot) : variante **avec photo** via un **bucket public dédié au partage** (modèle `avatars` `036_avatars_storage.sql:24-32` + `getPublicUrl`), copie opt-in **EXIF strippée**. À trancher : ship la photo dans ce sprint (scope +1 j, +1 migration bucket public) ou en sprint 39 ?
- **D2 (carte « sortie/résumé de course »)** — ta référence Strava = le résumé d'activité. La **carte de prise** (WS B) en est l'équivalent le plus fréquent/viral. Une **carte de sortie** (« Sortie du 27/06 : 2h, 3 prises, meilleure 42 cm ») est l'extension naturelle, mais demande de lier les prises à une `outing` (colonne `outing_id` sur `catches`, net-neuf). Reco : v1 = carte prise + carte conditions ; carte sortie en fast-follow une fois le lien prises↔sorties posé. OK ?
- **D3 (F3 marées)** — afficher la précision mesurée (reco) ou appliquer l'offset en prod ? (cf WS E.)

## Reste manuel John (post-sprint)
- Relire le diff, merger `sprint-38` → `main`, déploiement (auto Vercel), **QA partage en conditions réelles** : générer une carte, la partager sur ton compte Insta/TikTok story, coller le lien sur Discord (vérifier la preview).
- Brancher César : c'est SA munition (chaque belle prise communautaire = une carte à repartager, boucle d'acquisition).

---

> **Invariants (rappel)** : pas de push sans validation de John · RLS jamais désactivé (nouvelle table → RLS d'abord) · migrations = nouveaux fichiers (`061`, `062`) + regen `lib/types.ts` · **aucune coordonnée GPS dans une carte partagée (anti spot-burning, passe adversariale obligatoire)** · partage **opt-in** uniquement · scoring **descriptif jamais prédictif** · zéro leaderboard · carte image **server-side `next/og`** (pas html2canvas) · copy sans tiret cadratin.
