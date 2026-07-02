# Sprint 35 — RECAP « Vérité & bugs visibles »

> Exécuté le 2026-06-26 sur la branche `sprint-35` (depuis `main`). **Non poussé** (attente validation John).
> Mode : ultracode (fan-out recherche 8 agents → implémentation boucle principale → revue croisée indépendante).
> Contrainte env : les agents background n'ont PAS Edit/Write → recherche + revue en agents, **edits en boucle principale**.

## TL;DR

Tous les workstreams A/B/C/D/E/F livrés. **0 donnée fausse visible** (géocodage prise réparé, heures de soleil justes), **en-têtes HTTP de sécurité servis** (CSP report-only), **6 issues Sentry fermées**, **migration 058 appliquée en prod**, copy/repo nettoyés. **Aucune régression** (GPS/gating/RLS intacts — vérifié par agent indépendant).

**Gate VERIF** : `tsc` 0 · `next lint` 0 · **Vitest 554/554** (+11) · `next build` OK · revue sécurité **GO 7/7** · revue correction **0 bloquant** (2 HIGH + 2 nits corrigés).

---

## Ce qui a été fait (par workstream)

### WS A — Géocodage du log de prise (M1) ✅
Le formulaire acceptait un nom de ville en texte libre **jamais converti en coords** → « Position requise » au clavier (desktop sans GPS / ancienne prise).
- **Nouveau** `lib/geo/geocode.ts` : `geocodeMunicipality(query, signal)` via l'**API BAN** (`api-adresse.data.gouv.fr`, gratuit, FR, sans clé). Ordre GeoJSON `[lng, lat]` respecté.
- **Nouveau** `components/catches/CityAutocomplete.tsx` : combobox accessible (ARIA 1.2, ↑↓/Entrée/Échap, debounce 250 ms, `AbortController`). Choisir une suggestion **renseigne `latitude`/`longitude`** via `setValue`.
- `components/catches/CatchForm.tsx` : les 2 champs « Ville ou lieu » (modes GPS + manual) deviennent l'autocomplétion. **Best-match au submit** : si une ville est tapée sans choisir de suggestion, on géocode avant validation ; sans résultat → message FR explicite. Les 2 chemins de secours (GPS, saisie lat/long manuelle) sont **intacts**. Écriture serveur EWKT **inchangée**.
- **Nouveau** e2e `e2e/08-catch-city-geocode.spec.ts` : ville → suggestion → submit (BAN mocké, compte `disco29`).
- **Garde anti double-submit** (suite revue) : le best-match ajoute un `await` avant validation → ref synchrone + check de phase pour éviter une double création sur double-clic.
- **Garde « suggestion fantôme »** (suite revue) : l'autocomplétion ne fetch que sur frappe utilisateur (comparaison `lastTypedRef`), donc le reverse-geocode après GPS n'ouvre plus de dropdown qui pourrait écraser les coords GPS.

### WS B — Heures de soleil fausses (M2) ✅ — **impact score = NUL**
`/home` (Brest) affichait « Soleil 08:19–00:23 ».
- **Cause racine** (diagnostiquée, pas devinée) : Open-Meteo, appelé avec `&timezone=Europe/Paris`, renvoie un ISO **local naïf** (`"2026-06-26T06:17"`). `new Date(iso)` le lit en **UTC** (runtime Vercel) puis `Intl({timeZone:'Europe/Paris'})` le re-décale de **+2 h** → 08:17 / 00:14 ≈ observé. **Ni swap lat/lng, ni bug suncalc.**
- **Fix centralisé** : nouveau helper `formatWeatherTime` (`lib/conditions/format.ts`) qui lit `HH:MM` directement dans la chaîne naïve (filet défensif si un fuseau `Z`/offset est présent). Utilisé par `TodayForecast.tsx` (le site buggé) ; `WeatherGrid.tsx` et `SpotConditionsSection.tsx` (qui utilisaient déjà le bon regex) refactorés vers le helper pour cohérence.
- **Impact sur le score : NUL.** Le score solunaire est calculé sur un **chemin de code séparé** (`lib/solunar/astronomy.ts` → `SunCalc.getTimes(date, lat, lng)`, **bon ordre d'args**, formaté Europe/Paris via `formatLocalTime`). Le bug ne touchait que l'**affichage** des chaînes Open-Meteo. Confirmé par test : pour Brest 2026-06-26, le chemin suncalc donne lever ~06 h / coucher ~22 h.
- **Tests** : `lib/conditions/__tests__/format.test.ts` (9) + `lib/solunar/__tests__/sun-times.test.ts` (2, dont une sentinelle anti-swap).

### WS C — En-têtes de sécurité HTTP (M3) ✅
`next.config.ts` n'avait aucun `headers()`.
- Ajout d'un `async headers()` (toutes routes) : `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`, `Strict-Transport-Security: max-age=63072000; includeSubDomains; preload`.
- **CSP en `Content-Security-Policy-Report-Only`** (const `cspReportOnly`) couvrant MapTiler/MapLibre (`blob:`+worker), Supabase (`wss`), Stripe (js/api/checkout/hooks), PostHog EU, Sentry, BAN, Nominatim, Open-Meteo, images Supabase/Unsplash. **NON enforce** (observation seule).
- `withSentryConfig`, `webpack.symlinks`, `experimental`, `images` **non touchés**.

### WS D — Resync `CLAUDE.md` (M4) ✅ (vérification)
- Confirmé : `CLAUDE.md` (déjà resynchronisé le 2026-06-26 dans le working tree) est **cohérent avec `docs/audits/AUDIT-2026-06-26.md`** — sprint 34, `current_tier`, floutage ~500-900 m, 26 espèces, mobile non démarré. Aucune contradiction. Annexe généalogique conservée.
- **F12** (tâche « hygiène CLAUDE.md » du brief sprint 33) marquée **FAITE** dans `docs/sprint-33/BRIEF.md`.

### WS E — Hygiène Sentry (m5) ✅
- **6 issues résolues** (avec commentaire d'audit) : `NEXTJS-1` (Server Action stale), `NEXTJS-2` (delete user capté volontairement — la suppression marche), `NEXTJS-3` (`'waiting'` SW/extension, dev/localhost), `NEXTJS-6` + `NEXTJS-7` (`'rest'`), `NEXTJS-8` (extension navigateur).
- **`'rest'` (NEXTJS-6/7)** : **vrai bug** (méthode RPC supabase-js déstructurée dans `lib/especes/top-spots.ts` à la release `f983eb1` → `this.rest` undefined), **déjà corrigé** par `ca409c6` (appel direct `supabase.rpc(...)`), **ancêtre de HEAD = déployé en prod**. Slug `seiche` valide (pas un 404). Stack trace réelle vue avant fermeture (pas deviné). **Aucun code à changer.**
- `NEXTJS-4` (`/carnet/nouvelle`, Server Action générique, 0 user) : **laissée en surveillance**, à corréler avec le fix WS A (resolve si plus d'event après déploiement).

### WS F — Copy + DB + repo (m1/m6/m7) ✅
- **Copy** : `MapShell.tsx` bandeau anonyme « Crée ton carnet pour **voir tous les spots** » → « …pour **débloquer la carte complète** » (le gratuit = 3 spots/dépt). Reste de la copy vérifié honnête (pas d'autre occurrence à corriger).
- **Migration 058** : `supabase/migrations/058_fk_indexes_invite_outings.sql` (2 index FK : `invite_codes.created_by`, `outings.spot_id`). **Appliquée en prod** via connecteur Supabase. `get_advisors(perf)` ne liste **plus** ces 2 FK comme non indexées (il ne reste que `stripe._managed_webhooks`, schéma wrapper, hors scope).
- **Types** : un index ne change **aucun** type généré (pas de table/colonne/enum) → `lib/types.ts` laissé inchangé (évite un diff de format parasite). Documenté ici.
- **Repo** : `.playwright-mcp/` ajouté à `.gitignore` + **20 fichiers dé-trackés** (`git rm --cached`). `git status` ne montre plus de fichiers `.playwright-mcp` suivis.

---

## Comment tester

- **WS A** (le critère cœur) : sur `/carnet/nouvelle` (desktop, géoloc refusée), taper « Camaret » → choisir une suggestion → espèce + taille + technique → **Loguer** → la prise s'enregistre **sans saisir de lat/long** et apparaît dans `/carnet`. Vérifier aussi : bouton GPS et saisie manuelle toujours OK ; taper une ville inconnue + submit → message FR explicite.
- **WS B** : `/home` (utilisateur Finistère) → bandeau « Soleil » montre ~**06:1x–22:1x** (plus jamais « 08:19–00:23 »). Idem fiche spot / WeatherGrid / DayBestMoments.
- **WS C** : `curl -sI https://<preview>/` → présence de `x-frame-options`, `x-content-type-options`, `referrer-policy`, `strict-transport-security`, `content-security-policy-report-only`. Vérifier qa-chrome qu'aucune fonction ne casse (carte, Stripe, PostHog, images Supabase).
- **WS F** : carte anonyme → bandeau dit « débloquer la carte complète » ; `get_advisors(perf)` sans les 2 FK ; `git status` propre côté `.playwright-mcp`.

---

## Reste manuel John (post-sprint)

1. Relire le diff / la PR, **merge `sprint-35` → `main`**, déploiement (auto Vercel).
2. **QA prod rapide** (qa-chrome) : `/carnet/nouvelle` (ville → suggestion → submit), `/home` (heures soleil), `/carte` (carte + bandeau copy), `/especes/bar`.
3. Vérifier les en-têtes en prod : `curl -sI https://www.carnet-de-peche.com/`.
4. **Décider plus tard** (sprint séparé) le passage de la CSP en **enforce** après analyse des rapports report-only (optionnel : brancher un endpoint `report-uri`/`report-to` Sentry pour collecter les violations centralement — aujourd'hui console-only, conforme au brief).
5. `NEXTJS-4` : vérifier après déploiement qu'il ne se reproduit plus (sinon investiguer) → resolve.
6. **Post-merge, mettre à jour `CLAUDE.md` §2** : bump migrations (→ 059 fichiers, 001→058) et marquer M1/M2/M3 « réglés au sprint 35 » (NON fait maintenant : `CLAUDE.md` fait foi = prod ; tant que sprint-35 n'est pas déployé, les bugs sont encore en prod — éviter le piège du RECAP périmé).

---

## Notes / dette

- L'annotation de fermeture **F12** vit dans `docs/sprint-33/BRIEF.md`, qui est dans un **dossier non-tracké** (`docs/sprint-33/`, hérité d'une session antérieure) → hors du commit sprint-35. À committer par John s'il veut versionner le brief sprint 33.
- Dérive d'historique migrations connue (baselines 001-005/013 absentes de `list_migrations`) : non bloquant, n'affecte pas 058 (enregistrée proprement après 057).
- CSP report-only : `'unsafe-inline'` requis (scripts d'hydratation Next, pas de nonce) — à durcir au passage enforce.
