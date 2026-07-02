# Sprint 70 — RECAP
## « Vérité & bugs express » : les 🟠/🟡 de l'audit du 02/07, en passes parallèles

> Exécuté le 2026-07-02 (1 session Fable, ultracode : 7 agents de bloc en parallèle + 3 relecteurs indépendants + orchestrateur).
> Branche `sprint-70` (depuis `main` post-S69 `e464b78`). **Règles dures tenues et prouvées** : zéro migration, `lib/types.ts` intact, `package.json`/lockfile gelés (`git diff --name-only main` vérifié).
> **VERIF : 778/778 tests Vitest (76 fichiers), tsc 0 erreur, ESLint 0 warning, build OK, CSP enforce prouvée en local (`next start` + curl).**

---

## Bloc A — Chiffres honnêtes + copy hero

**Fait**
- `lib/marketing/stats.ts` : `SPOTS_CURATED_FLOOR = 200` + `SPOTS_CURATED_LABEL = '200+ spots curés'` (215 curés en DB au 02/07, plancher stable partagé, testé).
- Tous les « 157 » remplacés : meta description home, fallback stat du hero, TrustStrip + CommunitySection (`HomeSections.tsx:76` et `:194`, la 2e non listée au brief mais trouvée au grep), FAQ tarifs, HomeMapSection (via l'agent D-carte), et le commentaire périmé de `home-data.ts:57` (revue).
- Hero : « Prochain créneau · **demain** 05:24 » quand le créneau tombe le lendemain (jour calendaire Europe/Paris, DST-safe). Préfixe calculé **post-montage** (useEffect, pattern LiveClock) → zéro mismatch d'hydratation malgré le cache SSR 1 h.

**Comment tester** : `grep -rn "157" app/ components/ lib/marketing/` → 0 occurrence spots ; home + /tarifs disent « 200+ spots curés » ou le compte live.

**Non fait (assumé)** : la MoatSection (`HomeSections.tsx`, server component caché 1 h) affiche l'heure sans « demain » ; l'étendre exigerait un îlot client, le composant `NextWindowLabel` est réutilisable si souhaité.

---

## Bloc B — Hydratation & Sentry

**Fait** (diagnostic AVANT code : 8 issues Sentry lues, stacks + breadcrumbs)
- **`parentNode` ×3 routes** (/carnet, /u/:username, /carte) : cause racine = runtime inline `$RS` du streaming React 19 saboté par un tiers (1 seul visiteur, Le Caire/Chrome 149, stacks 100 % dans le document HTML ; zéro `removeChild` suspect chez nous). Fix : filtre chirurgical `beforeSend` (`lib/sentry-filters.ts`, logique pure, 10 tests) — un `parentNode` venant de NOTRE code continue de remonter.
- **`selectNode` + `Failed to construct 'URL'`** (/spots/:slug) : script **Vercel Toolbar** `_next-live/feedback` qui crashe sur nos violations CSP Report-Only. Fix : `denyUrls` `_next-live`/`vercel.live`.
- **`unexpected response`** (/carnet/nouvelle) : POST Server Action → **400** non catché → formulaire figé en « saving ». Fix `CatchForm.tsx` : try/catch sur `createCatch`/`updateCatch` + filet `.catch()` + toast honnête, brouillon conservé, retry possible.
- **React #418** : non reproductible par lecture de code (timeZone Europe/Paris explicite partout côté client, patterns S59 en place) → enrichissement Sentry ciblé (tag `hydration: suspect` + pathname/viewport), **pas de fix à l'aveugle**.
- **`url.parse()` du cron personal-window : prémisse du brief FAUSSE** — la source est `web-push@3.6.7` (node_modules, dernière version), pas notre code. Documenté dans `route.ts` ; fix futur = `pnpm patch web-push`.
- **6 issues Sentry marquées resolved** avec justification (NEXTJS-4/A/B/C/D/E). Laissées ouvertes : NEXTJS-9 (bruit réseau iPhone).

### ★ NEXTJS-F fixé par l'orchestrateur (bonus VERIF)
`Error: Catch-all must be the last part of the URL` (1 év. prod 01/07, laissé « à surveiller » par le bloc B) a été **reproduit et fixé** : la convention metadata `opengraph-image.tsx` **dans** le segment catch-all `peche/[...slug]` générait une route `catch-all non terminal` → `next start`/`next dev` = **500 sur TOUTES les routes** (gotcha connu S62/S64/S65, désormais compris). Fix : OG déplacée en **route handler `app/og/peche/[...slug]/route.tsx`** (catch-all terminal, même pattern que `/og/spot/[slug]`) + `openGraph.images`/`twitter` dans le `generateMetadata` de la page. **Preuves locales** : `next start` 500 → 200 partout ; `/peche/bar/leurres` émet `og:image = /og/peche/bar/leurres` ; `GET /og/peche/bar/leurres` → 200 `image/png` + cache long. `next dev` et `next start` refonctionnent en local.

---

## Bloc C — Plateforme : CSP enforce, middleware, OG

**Fait**
- **CSP en ENFORCE** (`next.config.ts`) : fin du Report-Only du sprint 35, inventaire statique exhaustif. **Bug corrigé au passage : l'hôte PostHog du Report-Only était faux** (`eu.posthog.com` → `eu.i.posthog.com`) : passé tel quel en enforce, il aurait tué l'analytics. MapLibre couvert (`worker-src 'self' blob:` + `child-src blob:` + `img-src data: blob:`), Supabase https + **wss** Realtime, Sentry ingest, Stripe, MapTiler, BAN, Nominatim, Open-Meteo. `frame-ancestors 'none'`. **`report-uri` Sentry actif** (`report-to` volontairement absent : Chrome ignorerait `report-uri` sinon). `'unsafe-eval'` dev-only ; `vercel.live` preview-only.
- **Durci en revue croisée** : (1) `form-action` += `https://*.supabase.co` + `https://accounts.google.com` (le login Google no-JS/pré-hydratation redirige via supabase.co/authorize → accounts.google.com : sans ça, CSP le bloquait) ; (2) **origine PostHog dérivée de `NEXT_PUBLIC_POSTHOG_HOST` au build** (plus de valeur figée en dur qui divergerait de l'env Vercel).
- **`Permissions-Policy: camera=(), microphone=(), geolocation=(self)`**.
- **`middleware.ts`** : `APP_ROUTES` += `/classements`, `/sorties`, `/notifications`, `/moderation`, `/spots/mes-propositions` **+ `/spots/proposer`** (même bug, trouvé au passage). `/spots` et `/spots/[slug]` restent publics (15 tests).
- **OG timeouts 25 s tués** : polices bornées `AbortSignal.timeout(3000)` (`lib/og/fonts.ts`, couvre toutes les routes OG) ; fetchs Supabase bornés 3 s + fallback de marque (`lib/og/fallback.tsx`, 200 + cache court, **jamais de 500**) ; cache CDN long (`s-maxage=86400, swr=604800`) sur toutes les routes OG, y compris `especes/[slug]` et `peche/[...slug]` (handoff appliqué).

**Preuves locales (`next start` + curl)** : `/` → 200 avec `Content-Security-Policy` (SANS Report-Only) + `Permissions-Policy` ; `/classements` anonyme → `307 /auth/login?redirect=%2Fclassements` ; `/spots` → 200 ; `/og/peche/bar/leurres` → 200 png + cache long. + 26 tests Vitest (headers/middleware/fonts).

---

## Bloc D — Petit UX (hors carte)

**Fait**
- **Badge tier sur /profil** (§4.8) : « Découverte / Local / Itinérant » à côté du pseudo via `getUserTier()` existant, lien `/compte/abonnement`, mono uppercase AA, libellé texte toujours présent (daltonien-safe).
- **Filtre espèces carnet 6 → 26** (§4.7) : `CatchFiltersBar` consomme le référentiel (même source que le formulaire), replié = 6 espèces cœur + sélection, « Toutes les espèces (26) » pour déplier.
- **Copy géocodage** : « Position GPS récupérée » → « Position trouvée ».
- **/moderation « Re-vérifier »** (§4.10) : **le brief se trompait** — le « 0 spot(s) » permanent n'était pas un empty-state manquant mais une requête qui **échouait en silence** (select de `verified_at`/`verification_level`, colonnes jamais grantées : verrou colonne 028/043 ; la recherche renvoyait 0 aussi). Fix : select réduit aux colonnes grantées → l'onglet liste vraiment les spots ; erreur affichée explicitement. Perte temporaire : « Vérifié le {date} » → « Vérifié » (grant en migration future, cf reste manuel).
- **Bouton flottant « instruments »** (§4.9) : **PAS dans le code** — c'est la **Vercel Toolbar on production** (`vercel.live`, réglage projet, déjà identifiée par l'audit du 30/06 §1.5, visible uniquement connecté à Vercel). InstrumentsBar (sticky en flux) et FAB (62 px < pb 88 px) mesurés sains à 500 px. Aucune bidouille z-index appliquée (elle n'aurait rien corrigé). Effet de bord utile : la CSP enforce bloquera ce script en prod.

---

## Bloc D — Carte : embed home + bathy

**Fait**
- **Embed carte home réparé à la racine** (§3.6), `MapView.tsx` : sonde WebGL réelle (fini le message « navigateur non supporté » mensonger), délai de grâce 2,5 s sur les erreurs pré-load, garde `isStyleLoaded()` (fini les « markers sans fond »), **1 reprise auto silencieuse puis fallback honnête** « La carte n'a pas répondu, réessaie. » + bouton Réessayer. `HomeMapSection.tsx` : import de chunk résilient + fallback dernier recours. Jamais de trou silencieux.
- **Bathy lisible aux zooms 10-14** (§4.14), `lib/map/bathymetry-layer.ts` : `raster-saturation 0.35` + `raster-brightness-max 0.78` (profondeur seule ; substrat inchangé, ratio 0.55 en constante). **Pas de `raster-contrast`** : sur la rampe EMODnet quasi blanche, il CRAME les paliers (ordre shader saturation→contrast→brightness) — piège détecté et verrouillé par test. Luminosité monotone conservée (daltonien-safe). Preuves : `docs/sprint-70/captures/bloc-d-bathy-tuile-emodnet-z12-rade-brest-{avant,apres-simulation}.png` (simulation exacte des formules shader sur la vraie tuile z12 rade de Brest).
- 4 tests paint + 43/43 verts sur `lib/map`. **Zéro logique gating/floutage/k-anon touchée** (fichiers carte modifiés : `MapView.tsx`, `HomeMapSection.tsx`, `bathymetry-layer.ts` — cycle de vie et valeurs paint uniquement, relu par la revue sécurité).

---

## Bloc E — Hygiène & mesure

**Fait**
- **Tirets cadratins** : 7 headings du guide Bretagne + 5 champs `famille` espèces + 1 défi conservation corrigés. Le lint sort à **17 occurrences, toutes des exceptions tolérées §6 pré-existantes sur main** (placeholders `—`, libellés data `{code} — {label}`, séparateurs de title, numéros de section, console.warn) : **c'est la baseline actée** ; option future = étendre l'allow-list du script.
- **`.env.example`** : bloc VAPID ajouté (3 vars, alignées `lib/env.ts`).
- **PostHog `signup_completed` server-side** : helper `lib/analytics/server.ts` (fetch `/capture/`, `AbortSignal.timeout(1500)`, silencieux, no-op sans clé, zéro PII) branché dans `signUpWithPassword` après le redeem S68, propriété `comp_code_used`. Ne bloque jamais l'inscription. 9 tests. Note : `posthog-node` existait déjà (S26, webhooks Stripe) ; le helper fetch est préférable dans une Server Action (pas de flush avant redirect). Limite connue : les inscriptions Google OAuth/magic link n'émettent pas l'événement (flux callback).
- **Heures de soleil (§4.3) : NON-BUG prouvé** — `/home` calcule déjà au point côtier du département (`DEPARTMENT_SEA_COORDS['29']` = Iroise, <1 min de Brest ville) ; l'app affichait 22:22, les éphémérides réelles Brest 02/07 ≈ 22:23 (le « ~22:08 réel » de l'audit était erroné ; le point suspect 49.3N/5.5W aurait donné 22:32). Verrouillé par 5 tests (Brest ±3 min à date fixe + contre-preuve).

---

## Bloc F — Dette documentaire

**Fait**
- **Réorg docs vérifiée fichier par fichier (hash git)** : les 211 suppressions `docs/sprint-N/**` + roadmaps ont TOUTES un équivalent byte-identique sous `docs/sprints/**` / `docs/roadmaps/**` (23 captures PNG incluses). Cas particulier vérifié 2× (agent + orchestrateur, blob `9cef88b6` identique) : `docs/sprint-mobile/BRIEF.md` = doublon exact de `docs/sprints/sprint-12-13/BRIEF.md` → suppression sans perte, assumée ici.
- **`CLAUDE.md` resyncé** sur l'audit du 02/07 : §2 nouvelle synthèse 2026-07-02 qui FAIT FOI (sprints 59→69 dopamine en prod, S70 en cours, **S71 carte ANNULÉ**, 108 migrations `001`→`105b`, 695+ tests, 1 158 spots dont 215 curés) ; blocs 06-23/06-26 marqués historiques ; §9 roadmap courante = `docs/roadmaps/ROADMAP-POST-AUDIT-2026-07-02.md` ; chemins déplacés réparés + note de réorg en tête d'annexe généalogique (revue).
- `docs/ROADMAP-POST-AUDIT-2026-06-30.md` (contenu unique, à risque de `git clean`) déplacé vers `docs/roadmaps/`.
- RECAP S64 : existe et est tracké (`docs/sprint-64/RECAP.md`) — l'inquiétude de l'audit §7 est levée.
- Versionnés en plus (recommandation F) : les 11 audits `docs/audits/*.md` (référencés par CLAUDE.md/briefs/roadmaps), les BRIEF 64/65/66/72/73, `docs/maquette-v3/`. **Non committés (décision John)** : le `.docx` (doctrine §12 : Drive), `audit-design-carnet-de-peche.html`, `carte-desktop.png`/`login-mobile-390.png`, `qa-s26/`.

---

## Revue croisée (3 lentilles) et correctifs appliqués

| Finding | Sévérité | Correctif |
|---|---|---|
| Suite Vitest rouge : `actions.ts` importe `server-only` via `lib/analytics/server` | bloquant | `vi.mock('@/lib/analytics/server')` dans `actions.test.ts` → **76/76 suites vertes** |
| `form-action` CSP casse le login Google no-JS | important | `*.supabase.co` + `accounts.google.com` ajoutés + 2 assertions de test |
| Origine PostHog figée en dur dans la CSP | important | Dérivée de `NEXT_PUBLIC_POSTHOG_HOST` au build (fallback `eu.i.posthog.com`) |
| « Fichier perdu » `sprint-mobile/BRIEF.md` | mineur | **Réfuté par hash** (doublon byte-identique) — documenté ci-dessus |
| 2 « — » ajoutés dans des console.warn MapView | mineur | Remplacés par « : » |
| Commentaire « 157 » périmé `home-data.ts` | mineur | Mis à jour |
| Chemins docs cassés dans CLAUDE.md post-réorg | mineur | 6 chemins réparés + note d'annexe + roadmap 06-30 déplacée |

## VERIF (preuves)

- `pnpm test` → **778 tests / 76 fichiers, 0 échec** ; `npx tsc --noEmit` → 0 erreur ; ESLint 0 warning (hook par fichier + passes ciblées) ; `pnpm build` → OK.
- `node scripts/lint-copy-dashes.mjs` → 17 occurrences, toutes exceptions §6 pré-existantes (baseline, cf Bloc E).
- `next start` local : en-têtes CSP enforce + Permissions-Policy servis, redirect `?redirect` OK, OG png + cache OK (détail par bloc ci-dessus).
- **Règles dures** : `git diff --name-only main` → aucune migration, pas de `lib/types.ts`, pas de `package.json`/`pnpm-lock.yaml`.
- Anti-régression carte : fichiers carte touchés relus par la revue sécurité (aucune altération gating/floutage/k-anon) ; signatures `addBathyLayer`/`setBathyOpacity` inchangées.

## Reste manuel John (post-sprint)

1. **Merge `sprint-70` → `main`** + déploiement (la branche est poussée, rien mergé sans ton GO).
2. **Dashboard Vercel** : (a) WAF/Attack Challenge Mode (503 sur prefetches RSC, audit §3.2, suspect du 400 de /carnet/nouvelle) ; (b) **Toolbar → OFF en production** (= le vrai fix du « bouton flottant » §4.9) ; (c) vérifier la valeur de `NEXT_PUBLIC_POSTHOG_HOST` (la CSP la suit au build).
3. **Post-deploy** : `curl -sI https://www.carnet-de-peche.com/` (CSP sans Report-Only + Permissions-Policy) ; QA console 8 pages, **0 violation CSP** (worker blob MapLibre explicitement) — toute origine ratée remontera dans Sentry via `report-uri` ; deploy-watch 48 h (issues NEXTJS-* ne régressent pas, 0 timeout OG) ; inscription de test → `signup_completed` dans PostHog.
4. **Funnel PostHog** (projet 208730, EU) : `$pageview` → `signup_completed` → `catch_log_completed` (first time for user).
5. **QA visuelle** : bathy z12 rade de Brest couche active (compte Local+, capture « après » réelle) ; embed home 3 rechargements ; « demain HH:MM » tard le soir.
6. **Backlog sprint suivant** : migration `grant select (verified_at, verification_level) on public.spots` + restaurer « Vérifié le {date} » en modération ; `pnpm patch web-push` (DEP0169) ; `app/favicon.ico` (404 en prod, seul `icon.svg` existe) ; l'occurrence « Accès » avec tiret cadratin des fiches spots = **donnée curée en DB** (UPDATE de contenu, pas du code) ; événement signup pour les flux OAuth/magic link si le funnel doit les couvrir.
7. **À trancher** : fichiers non trackés restants (`.docx` → Drive, `audit-design-carnet-de-peche.html`, PNG racine, `qa-s26/`).
