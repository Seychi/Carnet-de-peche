# Sprint 35 — Brief d'exécution
## « Vérité & bugs visibles » (P0 · ~3-5 j)

> Rédigé le 2026-06-26. Durée : 3-5 jours.
> Contexte : audit transverse `docs/audits/AUDIT-2026-06-26.md` + roadmap `docs/ROADMAP-PRE-MOBILE-2026-06-26.md`. C'est le **premier verrou** du gate web→mobile : zéro donnée fausse visible, durcissement sécurité, doc qui dit la vérité.
> Décisions John : aucune décision produit nécessaire pour ce sprint — tout est cadré et exécutable. (Les décisions de lancement D1/D2/D3 concernent les sprints 36/37, PAS celui-ci.)

**Préalable avant de démarrer** (manuel John) : rien de bloquant. Le sprint part de `main` (= prod). Si des branches sprint antérieures non mergées traînent, ce sprint ne les touche pas.

---

## 🚀 Ligne de lancement (à copier-coller par John)

> ultracode — effort xhigh. Exécute `docs/sprint-35/BRIEF.md`. Lance les workstreams
> A / B / C / E / F **en parallèle dès maintenant** (aucune dépendance entre eux), traite D
> en vérification légère, et termine par le workstream **VERIF** avant de me rendre la main.
> **Ne push pas.** Tout choix ouvert non tranché ici → `⚠️ DEMANDER À JOHN AVANT`, tu t'arrêtes, tu n'inventes pas.

---

## 🧠 Connecteurs & sous-agents (usage systématique — cf `CLAUDE.md` §20)

| Quand | Sous-agent → connecteur | Pourquoi |
|---|---|---|
| Avant de coder contre une lib externe (suncalc, Next headers, API BAN, MapLibre/Stripe/PostHog CSP) | **docs-researcher** → Context7 | API version-correcte (React 19, Next 15.5, zod v4 — pas de code de mémoire). |
| Index FK / migration 058 / advisors / types | **supabase-guard** → Supabase (RO) | Lire le schéma live AVANT ; migration = fichier numéroté ; regen `lib/types.ts` ; `get_advisors` après. |
| Récupérer la stack trace exacte de l'erreur `'rest'` (WS E) | **deploy-watch** → Sentry | Pointer le frame réel AVANT de coder un fix (ne pas deviner). |
| QA des écrans touchés (carnet/nouvelle, /home, /carte, /especes) | **qa-chrome** → Claude in Chrome + Playwright | Reproduire les bugs, vérifier les fixes, captures, console, anti-régression. |
| Après déploiement | **deploy-watch** → Vercel + Sentry | Zéro régression runtime + en-têtes HTTP servis. |
| Clôture | **`/verif-sprint`** | Tests + build + lint + types + revue indépendante + anti-régression GPS/gating/RLS. |

---

## Objectif du sprint en une phrase

À la sortie : **0 donnée fausse visible** (géocodage prise réparé, heures de soleil justes), **en-têtes HTTP de sécurité servis**, **`CLAUDE.md` à jour**, **Sentry propre**, **copy/DB/repo nettoyés** — sans aucune régression sur le floutage GPS, le gating freemium ou la perf.

## Workstreams & dépendances

| WS | Bloc | Durée | Dépend de | Parallélisable jour 1 |
|----|------|-------|-----------|----------------------|
| A | Géocodage du log de prise (M1) | 1-1,5 j | — | ✅ |
| B | Heures de soleil + score astro (M2) | 1 j | — | ✅ |
| C | En-têtes de sécurité HTTP (M3) | 0,5 j | — | ✅ |
| D | Resync `CLAUDE.md` (M4) — **déjà fait, vérif** | 0,25 j | — | ✅ |
| E | Hygiène Sentry (m5) | 0,5-1 j | — | ✅ |
| F | Polish copy + DB (migration 058) + repo (m1/m6/m7) | 0,5 j | — | ✅ |
| VERIF | revue finale indépendante | 0,5 j | tous | ❌ (toujours en dernier) |

> Aucun WS ne dépend d'un autre → **tous lançables jour 1 en parallèle**.

---

## Bloc A — M1 : géocodage du log de prise

Le formulaire « nouvelle prise » accepte un **nom de ville en texte libre** (`location_label`) mais ne le convertit **jamais** en coordonnées : taper « Camaret » → autocomplétion absente → à la soumission « Position requise. Utilise le GPS ou saisis les coordonnées. » Sur desktop sans géoloc (ou pour loguer une ancienne prise), l'utilisateur est **bloqué**. Le cœur du produit (loguer une prise) doit marcher au clavier. **Ne PAS toucher** au floutage GPS ni à l'écriture EWKT côté serveur.

> **Connecteurs** : **docs-researcher** (Context7) pour l'usage exact de l'API BAN + le pattern d'autocomplétion accessible en React 19. **qa-chrome** pour reproduire (desktop sans géoloc) puis valider.

### Tâches
1. Fichier cible : `components/catches/CatchForm.tsx` (route `app/(app)/carnet/nouvelle/page.tsx`). Repères actuels : bascule de mode `locationMode` (~L161), champ « Ville ou lieu » `location_label` (~L758-763 mode GPS, ~L811 mode manual), `handleGPS` (~L323-348, bouton ~L754), « Saisir manuellement » (~L765-774) + champs lat/long bruts (~L778-803), message d'erreur (~L831, validation ~L442). Il existe déjà un **reverse-geocoding** inline `reverseGeocode` (~L308-321, Nominatim OSM) ; il n'existe **aucun forward-geocoding** dans le repo (à créer).
2. Créer un util **forward-geocoding** (ville → coordonnées) via l'**API BAN** `https://api-adresse.data.gouv.fr/search/?q=<query>&type=municipality&limit=5` (gratuite, FR, sans clé). Le mettre dans `lib/geo/` (ex. `lib/geo/geocode.ts`) à côté de `bbox.ts`/`departments.ts`.
3. Transformer le champ « Ville ou lieu » en **autocomplétion** : suggestions (libellé + `citycode`/coords) ; sélectionner une suggestion **renseigne `latitude`/`longitude`** (et garde le label). Conserver les 2 chemins de secours existants : « Utiliser ma position GPS » et « Saisir manuellement » (lat/long).
4. Si l'utilisateur tape une ville **sans** choisir de suggestion puis soumet : tenter un géocodage « best match » au submit ; si aucun résultat, afficher une erreur FR explicite (zod en français) plutôt que le générique actuel.
5. Garder l'écriture serveur inchangée (la prise s'enregistre déjà correctement avec des coords).

### Critères d'acceptation
- **Repro qa-chrome (desktop, géoloc refusée)** : sur `/carnet/nouvelle`, je tape « Camaret », je choisis une suggestion, je remplis espèce + taille + technique, je soumets → **la prise s'enregistre sans avoir saisi de lat/long à la main** et apparaît dans `/carnet`.
- Le bouton GPS et la saisie manuelle fonctionnent toujours (non régressés).
- Test e2e (Playwright) couvrant le chemin « ville → suggestion → submit ».
- Aucune coordonnée ne transite par une URL/query (cf. règles privacy) ; appel BAN côté client OK (données non sensibles).

### Garde-fous
- Ne pas toucher : `catches_for_viewer`, l'écriture EWKT `geom`, le floutage.
- ⚠️ DEMANDER À JOHN AVANT : si tu veux remplacer Nominatim (reverse) par BAN aussi — hors périmètre de ce sprint, ne le fais pas sans accord.

---

## Bloc B — M2 : heures de soleil fausses + impact score astro

Sur le cockpit `/home` (utilisateur Brest/Finistère), le bandeau affiche **« Soleil 08:19–00:23 »**. Attendu à Brest le 26/06 : lever **~06:17**, coucher **~22:14**. Un coucher à 00:23 est aberrant. **Risque aggravant** : si la cause est un mauvais calcul (et non un simple formatage), elle peut aussi **fausser la composante « astro » (solunar) du score générique**.

> **Connecteurs** : **docs-researcher** (Context7) pour la signature exacte de **suncalc** (`SunCalc.getTimes(date, latitude, longitude)`) et la gestion timezone. **qa-chrome** pour vérifier l'affichage corrigé sur `/home` et une fiche spot.

### Tâches
1. **Diagnostiquer d'abord** (ne pas patcher à l'aveugle). Pistes à vérifier dans l'ordre :
   a. **Ordre des arguments** passés à suncalc : `SunCalc.getTimes(date, lat, lng)` — un **swap lat/lng** produirait des heures aberrantes ET fausserait le score. Vérifier tous les appels.
   b. **Timezone d'affichage** : suncalc renvoie des `Date` en UTC ; vérifier que l'affichage formate en **Europe/Paris** (et pas en UTC ni en heure locale du serveur).
   c. **Date utilisée** (bonne journée, pas de décalage J+1).
2. Fichiers : moteur `lib/solunar/astronomy.ts` (calcul sunrise/sunset via suncalc), labels `lib/solunar/scoring.ts` (~L125-128), poids `lib/solunar/config.ts` (`WEIGHTS = { solunar:0.40, tide:0.35, wind:0.25 }` ~L8-12 ; `SOLUNAR_WEIGHTS` ~L29+). Affichage : `components/ui-v2/instruments-bar.tsx` + `components/layout/AppInstruments.tsx`, `components/home/TodayForecast.tsx`, `components/conditions/WeatherGrid.tsx`, `components/solunar/DayBestMoments.tsx`, `components/spots/SpotConditionsSection.tsx`, `components/map/SpotPopup.tsx` ; forecast `lib/conditions/spot-forecast.ts`.
3. Corriger la cause racine (calcul et/ou formatage). Si le calcul était faux, **documenter l'impact sur le score** (avant/après) dans le RECAP.
4. Ajouter un **test de non-régression solunar** : pour Brest (48.39, -4.49) le 2026-06-26, `sunrise` ≈ 06:1x et `sunset` ≈ 22:1x (heure locale FR), et le score reste cohérent.

### Critères d'acceptation
- `/home` (utilisateur Finistère) affiche un lever ~**06:17** et un coucher ~**22:14** (plus jamais « 00:23 »). Vérifié qa-chrome.
- Les autres surfaces qui affichent lever/coucher (fiche spot, WeatherGrid, DayBestMoments) sont cohérentes.
- Test solunar vert ; **impact sur la composante astro du score chiffré et documenté** (« nul » si c'était purement de l'affichage, sinon avant/après).

### Garde-fous
- Ne pas changer les **poids** `WEIGHTS`/`SOLUNAR_WEIGHTS` (hors périmètre) — on corrige une donnée, pas le modèle.
- Ne pas casser le mode « score générique identique pour tous » ni la copie d'honnêteté associée.

---

## Bloc C — M3 : en-têtes de sécurité HTTP

`next.config.ts` ne définit **aucune** fonction `headers()`. Manquent : CSP, `X-Frame-Options`, HSTS, `X-Content-Type-Options`, `Referrer-Policy`. À ajouter avant toute ouverture publique élargie.

> **Connecteurs** : **docs-researcher** (Context7) pour la syntaxe `async headers()` de Next 15.5 et une CSP compatible MapLibre + Stripe (Checkout/Portal) + PostHog EU + Supabase + Sentry. **qa-chrome** + **deploy-watch** pour vérifier les en-têtes servis et l'absence de régression.

### Tâches
1. Fichier : `next.config.ts` (contient déjà `experimental.serverActions`, `outputFileTracingIncludes`, `images.remotePatterns`, un `webpack` avec `resolve.symlinks=false`, et le wrap `withSentryConfig` — **ajouter** un `async headers()`, ne rien écraser).
2. En-têtes fermes (toutes routes) : `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`, `Strict-Transport-Security: max-age=63072000; includeSubDomains; preload`.
3. **CSP en `Content-Security-Policy-Report-Only`** d'abord (NE PAS enforcer) — recenser les domaines réellement utilisés (MapTiler/MapLibre, `*.supabase.co`, Stripe `js.stripe.com`/`api.stripe.com`/`checkout.stripe.com`, PostHog `eu.posthog.com`, Sentry, `api-adresse.data.gouv.fr` ajouté au WS A, Nominatim). Collecter les violations avant d'envisager l'enforce (sprint ultérieur).

### Critères d'acceptation
- `curl -sI https://<preview-url>/` montre `x-frame-options`, `x-content-type-options`, `referrer-policy`, `strict-transport-security`, et `content-security-policy-report-only`.
- **Aucune régression fonctionnelle** vérifiée qa-chrome : la **carte** charge, le tunnel **Stripe** s'ouvre, **PostHog** track, les **images** Supabase s'affichent. (Si la CSP report-only loggue des violations légitimes, les inclure — mais ne pas enforcer ce sprint.)

### Garde-fous
- ⚠️ Ne PAS passer la CSP en mode enforce ce sprint (risque de casser MapLibre/Stripe) — **report-only uniquement**.
- Ne pas toucher au wrap Sentry ni au `webpack.symlinks` (fix poste Windows de John).

---

## Bloc D — M4 : resync `CLAUDE.md` (DÉJÀ FAIT — vérification seulement)

Le `CLAUDE.md` a **déjà été resynchronisé le 2026-06-26** (dans le cadre de l'audit) : §2 (état ~sprint 34 + piège des RECAP périmés), §4 (stack mobile/monorepo « non démarré » + versions réelles), §7 (`current_tier`, 58 migrations), §8 (floutage ~500-900 m + verrou colonne), §9 (chantiers A-G livrés + gate mobile), footer daté. L'ancien contenu est conservé en annexe.

> **Connecteurs** : aucun. Lecture seule.

### Tâches
1. Relire `CLAUDE.md` et confirmer qu'il n'y a **plus de contradiction** avec l'audit `docs/audits/AUDIT-2026-06-26.md`.
2. Fermer **F12** (la tâche « hygiène CLAUDE.md » du brief sprint 33 `docs/sprint-33/BRIEF.md`) — la marquer faite.
3. Si une nouvelle dérive est repérée (ex. un fait changé par les WS A/B/C de ce sprint), l'ajouter.

### Critères d'acceptation
- Un lecteur neuf du `CLAUDE.md` a l'état réel ; aucune affirmation périmée résiduelle.

### Garde-fous
- Ne PAS supprimer l'annexe généalogique ni les blocs historiques datés (« sans rien perdre de l'ancien »).

---

## Bloc E — m5 : hygiène Sentry

7 issues non résolues, **toutes 0 user** (bruit/transitoire). Objectif : Sentry propre + comprendre le seul potentiellement réel.

> **Connecteurs** : **deploy-watch** → **Sentry** (récupérer la **stack trace exacte** de chaque issue AVANT d'agir — ne pas deviner le frame).

### Tâches
1. **Résoudre** (transitoires confirmés) : `NEXTJS-3` (`'waiting'` sur `/tarifs`, burst d'un ancien déploiement, ne se reproduit plus), `NEXTJS-2` (`Database error deleting user` — la suppression de compte fonctionne, vérifiée live + purge en base), `NEXTJS-1` (Server Action stale post-déploiement), `NEXTJS-8` (signature d'extension navigateur, pas notre bug).
2. **Investiguer** `NEXTJS-6/7` (`TypeError ... reading 'rest'` sur `GET /especes/[slug]`) : récupérer la stack trace Sentry pour pointer le frame réel. La page `app/(marketing)/especes/[slug]/page.tsx` est bien gardée (`slug in SPECIES`, optional-chaining) et **ne contient aucun `.rest` littéral** — le crash vient probablement d'une **forme de données runtime** d'une RPC (`get_quality_cells` via `lib/especes/score.ts`, ou `get_top_spots_for_species` via `lib/especes/top-spots.ts`) ou d'une dépendance. Si c'est un **bot sur un mauvais slug**, confirmer que `dynamicParams = false` (`especes/[slug]/page.tsx` ~L26) renvoie bien un 404 framework (et noter que le `notFound()` ~L93 est de fait **mort**).
3. `NEXTJS-4` (`/carnet/nouvelle`) : n'a pas reproduit en QA ; à corréler avec le WS A (peut disparaître). Marquer surveillé.

### Critères d'acceptation
- Issues transitoires **fermées** dans Sentry.
- Cause de `'rest'` **identifiée** (frame réel) + corrigée, **ou** confirmée comme trafic bot inoffensif (avec preuve : slug + 404).

### Garde-fous
- Ne pas « résoudre » `'rest'` sans avoir vu la stack trace réelle.

---

## Bloc F — m1/m6/m7 : polish copy + DB (migration 058) + repo

> **Connecteurs** : **supabase-guard** (RO) pour confirmer les 2 FK avant la migration ; regen `lib/types.ts` après.

### Tâches
1. **Copy (m1)** : remplacer la copy qui sur-vend le gratuit. Le bandeau carte « Crée ton carnet pour voir **tous les spots** » et toute formulation similaire → « …pour débloquer la **carte complète** » (le gratuit = **3 spots/dépt**, pas « tous »). Chercher « tous les spots » dans `app/`/`components/` (composant carte + éventuelle copy tarifs).
2. **DB (m6) — migration `058`** : créer `supabase/migrations/058_fk_indexes.sql` avec les 2 index FK manquants :
   - `invite_codes.created_by` → `create index if not exists invite_codes_created_by_idx on public.invite_codes (created_by);` (FK déf. `052_invite_codes.sql:16`).
   - `outings.spot_id` → `create index if not exists outings_spot_id_idx on public.outings (spot_id);` (FK déf. `051_outings.sql:18`).
   Appliquer via le connecteur Supabase (mode write), **après** l'avoir écrite en fichier numéroté ; puis **regénérer `lib/types.ts`** ; relancer `get_advisors` (perf) pour confirmer la disparition des 2 « unindexed foreign key ».
3. **Repo (m7)** : ajouter `.playwright-mcp/` à `.gitignore` ; **dé-tracker** les fichiers déjà suivis (`git rm -r --cached .playwright-mcp/`). Optionnel si rapide : signaler (ne pas exécuter sans accord) la liste des branches sprint mortes à élaguer.

### Critères d'acceptation
- Plus aucune occurrence de « voir tous les spots » côté gratuit ; la copy reflète « 3 spots/dépt gratuit, carte complète = abonné ».
- `get_advisors` (perf) ne liste plus `invite_codes.created_by` ni `outings.spot_id` en FK non indexée ; `lib/types.ts` régénéré.
- `git status` ne montre plus de fichiers `.playwright-mcp/` ; `.gitignore` les ignore.

### Garde-fous
- Migration = **nouveau fichier 058** (ne jamais éditer une migration existante). `create index` simple (les tables sont petites — pas besoin de `CONCURRENTLY`, qui ne passe pas dans une transaction de migration).
- ⚠️ DEMANDER À JOHN AVANT de supprimer des branches git.

---

## Workstream VERIF (obligatoire, agent indépendant)

1. Lancer **`/verif-sprint`** : `pnpm test` + `pnpm build` + `pnpm typecheck` + `pnpm lint` + revue croisée indépendante + passe anti-régression. Puis **deploy-watch** (Vercel + Sentry) après déploiement.
2. Relire chaque critère d'acceptation des blocs A-F et cocher ✅/❌ **avec preuve** (URL, commande `curl`, requête, capture qa-chrome).
3. **Passe sécurité / anti-régression** (non négociable) : floutage GPS intact (les coords précises restent réservées aux abonnés, `geom` non lisible par `anon`) ; gating freemium carte intact (3 spots/dépt, filtres verrouillés) ; nouvelle migration 058 = index seulement (aucune RLS modifiée) ; aucun secret commité ; en-têtes HTTP servis sans casser carte/Stripe/PostHog ; **perf `/carte` non dégradée** (ce sprint n'est pas censé la toucher).
4. **Passe copy** : tutoiement partout, zod en français, aucune promesse produit mensongère (la copy gratuit/abonné est juste).
5. Livrer `docs/sprint-35/RECAP.md` : fait / comment tester / reste manuel John (+ impact score du WS B chiffré, + statut des issues Sentry).

## Reste manuel John (post-sprint)

- Relire la PR/diff, **merge `sprint-35` → `main`**, déploiement (auto Vercel), QA prod rapide (qa-chrome) sur `/carnet/nouvelle`, `/home`, `/carte`, `/especes/bar`.
- Vérifier les en-têtes en prod (`curl -sI https://www.carnet-de-peche.com/`).
- Décider plus tard (sprint séparé) le **passage de la CSP en enforce** après analyse des rapports report-only.

---

> **Invariants (rappel) :** pas de push sans validation de John · RLS jamais désactivé · migrations = nouveaux fichiers numérotés (058) · regénérer `lib/types.ts` après migration · toujours passer par `*_for_viewer` pour les geom · tutoiement + zod FR · ancrer les faits sensibles via **supabase-guard** avant de coder.
