# Sprint 38 — RECAP
## « Le partage qui rend viral » (moteur de partage social façon Strava)

> Exécuté le 2026-06-27 (ultracode). **Pas poussé** (John relit + merge). Base : `main` @ `987c8ae` (sprint 37). Migrations 061/062/063 **appliquées en prod** + `lib/types.ts` régénéré.

---

## Décisions John (tranchées en début de sprint)
- **D1 = carte « instrument » sans photo** (pas de bucket photo public, pas de migration bucket). Variante photo = fast-follow sprint 39.
- **D2 = carte SORTIE incluse** → `kind ∈ {catch, conditions, outing}`.
- **WS E (F3 marées) = fait, affichage de la précision mesurée seulement** (D3 v1, pas d'offset appliqué, `tide_coefficient` reste null).

---

## Fait (code complet, VERIF verte)

### Migrations (fichiers numérotés, appliquées, types régénérés)
- **`061_shared_cards.sql`** — table `shared_cards` (`slug` unique non énumérable, `user_id`, `kind` check catch/conditions/outing, `payload jsonb`). RLS : **SELECT public** (la carte est publique par slug), **INSERT/DELETE owner**. Payload PUBLIC, geom-free.
- **`062_tide_calibration.sql`** — table `tide_calibration` (port, lat, lng, façade, écart médian, biais, fenêtre, date, source). RLS SELECT public, écriture service-role. **Seedée** avec 5 ports mesurés (Saint-Malo, Brest, Pornichet, Les Sables-d'Olonne, Arcachon).
- **`063_catches_viewer_outing_id.sql`** (fix nécessaire, hors brief) — expose `outing_id` sur `catches_for_viewer` (append-only, DEFINER préservé). **Pourquoi** : `catches.outing_id` (ajoutée en 051 après le verrou colonne 041) n'a pas de SELECT pour authenticated → la carte sortie ne pouvait PAS lire les prises liées sans ça. Conforme à l'invariant « lecture prises toujours via la vue ».

### WS A — Infra de partage (`app/actions/share.ts`)
`createShareCard({kind})` pour catch / conditions / outing. Lecture via `catches_for_viewer` (jamais la table), scoping `auth.uid()` (refus si pas SA donnée), slug base62 aléatoire (`lib/share/slug.ts`), record perso `is_personal_best` (`lib/share/personal-best.ts`), dédup 24h. Payloads **geom-free** (vérifié : aucune clé geom/lat/lng/spot_id ; conditions = 4 clés copiées, jamais le jsonb complet). Conditions = `getPersonalTendencies()` descriptif (refus sous le seuil). Outing = agrégat geom-free (count, meilleure prise, espèces, bredouille).

### WS B — Route OG edge (`app/og/card/[slug]`)
`runtime='edge'`, lit **uniquement** `shared_cards` en anon (découplé de share.ts, types locaux `lib/og/types.ts`). Template marin **extrait** dans `lib/og/template.tsx` (palette, isobathes, logo SVG Satori-safe, footer marque) et `/og/spot` refactorée pour le réutiliser **sans régression**. 3 layouts (catch/conditions/outing) × 2 formats (`og` 1200×630, `story` 1080×1920 via `?format=story`). Chiffres en mono tabulaire (pas de fetch de police → zéro risque de 500, accents FR via la police par défaut). Pastille « Record perso » = étoile + texte (daltonien-safe). Marque toujours présente.

### WS C — Page publique + UX partage
Page `app/(marketing)/c/[slug]/page.tsx` (publique, jamais redirigée), image + récap + CTA « Crée ton carnet en 30 s », `generateMetadata` (openGraph.images + twitter summary_large_image → preview riche). `CatchActionsDropdown` réécrit : ne partage plus l'URL privée, fait `createShareCard` → Web Share **avec image** (blob story) si `canShare({files})`, sinon fallback desktop (lien copié + téléchargement image). Points d'entrée : prise (carnet), conditions (`/home` + carnet), sortie (succès du form sortie). Opt-in (dialog « publique, sans tes coordonnées »). Révocation : `deleteShareCard`/`listMyShareCards` + UI `ManageShareCards` (supprimer → /c 404).

### WS E — Marées vérifiées port par port
`scripts/verify-tides.ts` étendu (façades + bloc seed), lancé contre l'API réelle. `docs/sprint-38/tide-calibration-results.md` (figé + daté). Encart fiche spot `components/spots/TideCalibrationNote.tsx` (« Marées calées sur le port X, écart médian N min vs SHOM, audité le JJ/MM »), lecture `tide_calibration` selon la façade du département.

---

## VERIF (gate verte)
- `pnpm typecheck` **0 erreur** · `pnpm lint` **0** · `pnpm test` **574 verts** · `pnpm build` **exit 0** (route edge `/og/card/[slug]` + `/c/[slug]` compilées, `/og/spot` non régressée).
- `scripts/lint-copy-dashes.mjs` : 31 warnings, **tous pré-existants**, 0 dans les fichiers du sprint 38.
- **Anti spot-burning (vérifié au code)** : `ConditionsSnapshot` ne contient aucune coordonnée ; le payload catch copie 4 clés conditions, jamais le jsonb complet ; le `.select()` ne lit pas lng/lat ; payloads = 0 clé geo. `catch_id`/`outing_id` = uuid de dédup, pas des coords.
- **Sécurité DB** : `shared_cards` RLS (SELECT public + INSERT/DELETE owner) ; `tide_calibration` RLS (SELECT public, écriture service-role) ; `catches_for_viewer` toujours `security_invoker=false` (DEFINER) après 063 ; advisors = **toujours exactement 2 `security_definer_view`** (aucune nouvelle alerte).
- **QA partage (locale, dev server)** : routes `/og/card/[slug]` (og + story) et `/c/[slug]` renvoient un **404 propre** (pas de 500) sur slug absent → module edge + lecture anon OK ; le **template Satori rend une vraie image PNG 1200×630** (validé sur `/og/spot` refactorée, même template), 0 erreur dev log. ⚠️ Le rendu visuel des 3 layouts `/og/card` avec un vrai payload + le **Web Share mobile réel** n'ont PAS été testés en local (le connecteur Supabase était down pour seeder une carte de test, pas de clé service-role en local) → **à couvrir par la qa-chrome post-déploiement de John** (déjà dans ses tâches).

---

## Comment tester (post-merge)
1. Loguer une prise → menu « ⋯ » → « Partager » : accepter l'opt-in → sur mobile, feuille de partage native avec l'image (story) ; sur desktop, lien copié + image téléchargeable.
2. Coller le lien `/c/{slug}` sur Discord/iMessage/X → grande carte (preview OG).
3. `/home` ou carnet → « Partager mes conditions » (≥ 3 prises).
4. Supprimer une carte (gestion en bas du carnet) → `/c/{slug}` = 404.
5. Fiche spot d'un département Manche/Atlantique → encart « Marées calées sur le port X, écart médian N min ».

---

## ⚠️ Findings & décisions pour John

1. **🟠 Marées : écarts MESURÉS grands (31 à 93 min vs SHOM), biais de phase systématique.** L'audit honnête (D3 = afficher la mesure) montre qu'on ne peut **PAS** revendiquer « marées à la minute » face à Fishing Grid. L'encart affiche le chiffre brut (transparent). MAIS le **résidu après soustraction du biais est minuscule (1 à 8 min)** : l'erreur est presque entièrement un décalage de phase constant par port → un **offset par port (la v2 que tu as écartée)** corrigerait à < 10 min. **À rouvrir si tu veux en faire un vrai argument marketing.** Méditerranée non auditée (micro-marée, honnête, pas d'encart là-bas).
2. **🟠 Point d'entrée « carte sortie » faible.** `/sorties` = propositions de **co-pêchage** (table distincte des sorties perso `outings`). Il n'existe **aucune liste/détail de sortie perso** dans l'UI → « Partager ma sortie » est placé sur l'écran de succès du form `/carnet/sortie` (seul endroit avec un `outing.id` réel). Une bredouille reste partageable (carte faible). Si tu veux mieux : créer une vraie liste de sorties perso (fast-follow).
3. **Migration 063** ajoutée (non prévue au brief) : nécessaire pour que la carte sortie lise les prises liées via la vue (cf ci-dessus).
4. **Carte avec photo (D1)** et **offset marées (D3 v2)** : fast-follows possibles.

---

## Reste manuel John
- Relire le diff, merger `sprint-38` → `main`, déployer (auto Vercel).
- **QA partage en conditions réelles** : générer une carte, la partager sur Insta/TikTok story, coller le lien sur Discord (vérifier la preview), tester le Web Share sur ton mobile.
- **deploy-watch** (routes edge OG sans erreur runtime) après déploiement.
- Brancher César : chaque belle prise = une carte à repartager (boucle d'acquisition).

---

> **Invariants tenus** : aucune coordonnée GPS dans une carte partagée (vérifié au code) · partage opt-in strict · scoring descriptif (0 prédictif) · zéro leaderboard · carte image server-side `next/og` (pas html2canvas) · RLS owner/public correct · `catches_for_viewer` toujours DEFINER · copy sans tiret cadratin · **pas de push**.
