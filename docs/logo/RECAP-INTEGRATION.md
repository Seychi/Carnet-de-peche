# Mini-sprint logo — RECAP : intégration du « carnet qui ferre »

> Exécuté le 2026-06-12 sur la branche `sprint-11` (**rien n'est committé ni pushé** — validation John requise).
> Brief : `docs/logo/BRIEF-INTEGRATION.md` · Planche : `docs/logo/logo-board.png` · Sources SVG (intouchées) : `public/logo/`.
> Vérification finale par agent VERIF indépendant : **255/255 tests verts (2,6 s)** + **build OK**.

## Ce qui était déjà fait (committé avant ce passage)

| Bloc | Contenu | État |
|---|---|---|
| **Bloc 1** | Composant central `components/ui-v2/Logo.tsx` (server-safe, variantes light/dark, wordmark optionnel, accessibilité `<title>`/`aria-hidden`) + remplacement dans `Header.tsx`, `AppHeader.tsx`, `Footer.tsx`, layout auth | ✅ committé (commits `0c012a0` et antérieurs) |
| **Bloc 3** | Images OG : `app/opengraph-image.tsx`, `app/og/spots/route.tsx`, `app/og/spot/[slug]/route.tsx` — picto dupliqué en JSX avec commentaire `source: public/logo/logo-icon.svg` (Satori ne supporte pas `<mask>`) | ✅ committé |

## Ce qui vient d'être fait (non committé, dans le working tree)

### Bloc 2 — favicon + icônes PWA

| Fichier | Quoi |
|---|---|
| `scripts/generate-icons.ts` | **Réécrit** avec la géométrie exacte de `public/logo/logo-icon-dark.svg` (mask d'échancrure inclus, rendu correctement par librsvg/sharp) : fond plein navy-950 `#04141C`, picto 70 % (icônes standard) / 55 % (maskable, zone de sécurité 20 %). Usage : `npx tsx scripts/generate-icons.ts`. Sharp via next/image, **0 dépendance ajoutée**. |
| `public/icons/icon-192.png` · `icon-512.png` | Régénérés, picto sombre 70 % |
| `public/icons/apple-touch-icon.png` (180×180) | Régénéré, même recette que icon-192 |
| `public/icons/icon-maskable-192.png` · `icon-maskable-512.png` | Régénérés, picto 55 % |
| `app/icon.svg` | **Nouveau** — favicon convention App Router, copie **byte-exacte** de `public/logo/logo-icon.svg` (variante claire, fond transparent). Apparaît bien comme route `○ /icon.svg` dans le build. |

Écart assumé vs brief : le brief demandait `scripts/generate-icons.mjs` ; le script existait déjà en `.ts` (`generate-icons.ts`) et a été réécrit **en place** — fonctionnellement équivalent, et ça élimine le risque de régression qu'aurait posé un vieux script orphelin. `app/layout.tsx` non modifié (le bloc `icons:` référence `/icons/apple-touch-icon.png`, chemin valide). Pas de `app/favicon.ico` dans le repo → pas créé, conforme au brief.

### Bloc 4 — balayage des occurrences restantes

**Zéro modification de code nécessaire** : le Bloc 1 avait déjà tout couvert. Détail des hits examinés :

| Emplacement | Décision |
|---|---|
| `app/` + `components/` + `lib/` — motifs `0 0 30 30`, `M5 19 C9 12` (onde), `\bonde\b` | Zéro hit — ancien picto éradiqué |
| `components/ui-v2/Logo.tsx:71` (`M31 6v31`) | Nouveau picto — composant central, emplacement autorisé |
| `app/opengraph-image.tsx`, `app/og/spots/route.tsx`, `app/og/spot/[slug]/route.tsx` | Nouveau picto — duplication autorisée (routes OG, commentaire source présent) |
| `components/layout/Footer.tsx:7/15/21` (viewBox 0 0 24 24) | Icônes réseaux sociaux (Instagram/TikTok/YouTube) — laissées ; la marque (l.57) utilise déjà `<Logo size={28} variant="dark"/>` |
| `components/layout/LegalLayout.tsx:25` | Chevron retour — laissé |
| `components/forms/PhotoInput.tsx:129/138` | Icône appareil photo + spinner — laissés |
| `app/auth/login/page.tsx:557/631` | Logos Google et Apple (marques tierces, boutons OAuth) — laissés |
| `app/(marketing)/page.tsx:98/137/166` (viewBox 0 0 400 300) | Mockups badgés « Exemple » (sprint 9.5 T1.5) — pas des logos, laissés |
| `components/ui-v2/tide-sparkline.tsx`, `components/ui-v2/bathy.tsx`, fonds bathy des 3 OG | Dataviz / décors DA v2 — laissés |
| `components/mobile-nav.tsx` | Aucun logo (uniquement icônes Lucide) — rien à faire ; modifs sprint-11 non committées préservées |
| `app/not-found.tsx:16` | `<Fish/>` Lucide décoratif (illustration 404) — la marque vient du Header/Footer déjà migrés |
| `app/(app)/onboarding/fini/page.tsx` | Aucun picto de marque (Bathy + TagData + TideSparkline) — rien à remplacer |
| Pages offline | Aucune dans le repo (la PWA sprint 11 n'en a pas encore) |
| `emails/components.tsx:48-50` (EmailShell) + `emails/*.tsx` + `lib/email/*` | Marque en texte « 📒 Carnet de Pêche » (emoji + texte, aucun SVG) — non touché, conformément au garde-fou du brief (changement de mise en page email = demander à John) |
| `scripts/generate-icons.ts` | Flaggé par le Bloc 4 (qui a balayé AVANT la réécriture du Bloc 2) — **résolu depuis** : le script porte maintenant la nouvelle géométrie, vérifié par l'agent VERIF |
| `docs/maquette-v2/*.html` (8 fichiers, 9 occurrences) | Ancien logo dans les maquettes de référence — hors périmètre brief (docs/), non touché, cf flags |

## Critères d'acceptation — vérifiés indépendamment (agent VERIF)

| Critère | État | Preuve |
|---|---|---|
| `pnpm test` ≥ 215 tests verts | ✅ | `pnpm test` → **`Test Files 17 passed (17)` · `Tests 255 passed (255)` · Duration 2.60s**. (Un premier run donnait 258/258 : l'écart de 3 = suppression d'un doublon `lib/catches/schema.test.ts` par le chantier sprint-10.6 concurrent, hors périmètre logo — les deux runs sont 100 % verts.) |
| `pnpm build` OK | ✅ | `rm -rf .next && pnpm build` → `✓ Compiled successfully in 26.5s` … `BUILD_EXIT=0` (52 pages, dont `○ /icon.svg`). ⚠️ Un premier build avait échoué sur un `.next` corrompu par un `next dev` resté ouvert sur :3000 — piège déjà documenté au RECAP 10.5, **pas une régression du code**. |
| `grep -rn 'viewBox="0 0 30 30"' components/ app/` vide | ✅ | exit code 1, aucun match |
| Aucune copie inline du path hors `Logo.tsx` + 3 routes OG | ✅ | grep `M31 6v31` repo entier → uniquement `Logo.tsx`, les 3 routes OG, `app/icon.svg` (asset favicon, exigé par le Bloc 2), `scripts/generate-icons.ts` (script de génération, exigé par le Bloc 2), `public/logo/*.svg` (sources) et le brief |
| 5 PNG `public/icons/` : mtime du jour + nouveau picto | ✅ | `ls --time-style=full-iso` → tous datés 2026-06-12 10:21 ; relecture visuelle de `icon-512`, `icon-maskable-512`, `apple-touch-icon` : carnet sand 3 lignes + hameçon teal traversant le bord droit avec échancrure nette, fond navy plein ; maskable bien plus petit (55 %) |
| `git diff public/manifest.webmanifest` vide | ✅ | `git diff --stat` → vide, `git status --porcelain` → vide |
| `git diff public/logo/` vide | ✅ | idem — les 4 SVG sources intouchés |
| `app/icon.svg` = géométrie du picto clair | ✅ | `cmp public/logo/logo-icon.svg app/icon.svg` → **byte-exact** |
| Aucune migration SQL ajoutée | ✅ | `git status --porcelain supabase/migrations/` → vide (dernière = 023, préexistante). `supabase/config.toml` + `seed_e2e.sql` non trackés = e2e sprint 11, hors périmètre logo |
| Sécurité : aucun secret dans le périmètre | ✅ | grep `sk_live|sk_test|whsec_|api[_-]?key|secret|password|token` sur `scripts/generate-icons.ts`, `app/icon.svg`, `Logo.tsx`, `docs/logo/` → seuls hits = le mot « secret » dans le texte du brief |
| Copy : français, tutoiement, pas de promesse | ✅ | Commentaires de `Logo.tsx` et `generate-icons.ts` en français tutoyé ; `<title>Carnet de Pêche</title>` ; aucun texte produit ajouté |

Périmètre exact des fichiers logo dans le working tree : `scripts/generate-icons.ts` (M), `public/icons/*.png` (5 × M), `app/icon.svg` (nouveau), `docs/logo/RECAP-INTEGRATION.md` (ce fichier). Les autres modifs non committées de la branche (`catches`, `solunar`, pages légales, `e2e/`, `playwright.config.ts`, `package.json`/`pnpm-lock` pour Playwright+LHCI, `vitest.config.ts`, `.gitignore`, `supabase/config.toml`, `seed_e2e.sql`…) **préexistent du sprint 11** et n'ont pas été touchées.

## Flags pour John

- ~~`scripts/generate-icons.ts` génère encore l'ancien picto~~ → **résolu** : le Bloc 4 avait balayé avant la réécriture du Bloc 2. Vérifié après coup : le script embarque bien la nouvelle géométrie (copie de `logo-icon-dark.svg`), plus aucune trace de l'onde ni du viewBox 30×30 dans `scripts/`. Aucun `generate-icons.mjs` créé (écart assumé : le `.ts` existant a été réécrit en place, voir plus haut).
- Les emails transactionnels (`emails/components.tsx`, EmailShell) utilisent « 📒 Carnet de Pêche » en texte+emoji comme marque d'en-tête — pas d'ancien picto, donc rien d'urgent, mais si tu veux le nouveau logo dans les emails il faudra une image hébergée (les SVG inline passent mal en email) et ça change la mise en page → décision à prendre hors Bloc 4.
- Les maquettes `docs/maquette-v2/*.html` (9 occurrences dans 8 fichiers) portent encore l'ancien logo : sans impact prod ni build, mais la référence design ne correspond plus à la marque. À rafraîchir un jour ou à laisser comme archive datée.
- Constat positif : le balayage Bloc 4 n'a nécessité **aucune** modification de code — le Bloc 1 avait déjà tout couvert (y compris `mobile-nav.tsx` qui n'a jamais porté de logo), et le critère « grep viewBox 0 0 30 30 sur components/ + app/ » est au vert (zéro match, vérifié).
- Un `next dev` traînait sur le port 3000 pendant la vérif (PID node lancé à 9h55) : il avait corrompu le cache `.next` du premier build. Le build propre passe. Pense à relancer ton `pnpm dev` (son cache a été purgé par le `rm -rf .next`).

## Comment tester en local

1. `pnpm dev` → ouvre http://localhost:3000 :
   - **onglet navigateur** : nouveau favicon (carnet + hameçon teal, traits navy, fond transparent) — force un rechargement (Ctrl+F5) si l'ancien persiste ;
   - `/` et `/tarifs` : nouveau picto dans le header (clair) et le footer (sombre) ;
   - `/home` et `/carnet` (connecté) : nouveau picto dans le header app ;
   - http://localhost:3000/opengraph-image : l'image OG de marque montre le nouveau picto.
2. Icônes PWA : ouvre directement `public/icons/icon-512.png` et `icon-maskable-512.png` — fond navy plein, picto sombre centré.
3. Pour régénérer les icônes si besoin : `npx tsx scripts/generate-icons.ts`.

## Reste manuel John (post-sprint)

- QA visuelle rapide sur mobile (tab bar + header instruments).
- Commit + push après validation → déploiement Vercel auto.
- Vider le cache navigateur / vérifier le favicon en prod (les favicons sont agressivement cachés — compte jusqu'à 24 h ou teste en navigation privée).
- Installer la PWA sur un téléphone de test pour valider les icônes launcher (standard + maskable Android).
