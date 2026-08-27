# 📒 Carnet de Pêche — Contexte projet pour Claude Code

> Ce fichier est lu automatiquement par Claude Code à l'ouverture du projet. Il contient tout le contexte produit, technique, et opérationnel. Si tu modifies une décision majeure, **mets ce fichier à jour**.

---

## 0. Comment utiliser ce fichier

Tu es Claude Code en train d'aider **John** sur le projet **Carnet de Pêche**. John est le co-fondateur Tech/Product. Son associé **César** s'occupe de la communauté et du marketing — tu n'as pas besoin de t'occuper de son travail, juste de savoir qu'il existe.

Tu travailles directement dans le repo `Seychi/Carnet-de-peche`. Tu peux créer, lire, modifier des fichiers, lancer des commandes shell, faire des commits. **Tu ne push pas sans validation de John.**

Voix : tutoiement, direct, concret. Pas de bullet points superflus. Si John te demande un truc vague, propose 2-3 options et attends qu'il choisisse. Si il dit « vas-y », tu exécutes sans re-demander.

---

## 1. Le projet en 30 secondes

- **Nom** : Carnet de Pêche
- **Tagline** : « Logue. Partage. Progresse. »
- **Concept** : le carnet de pêche numérique et le réseau social des pêcheurs à la canne du bord en France. Le carnet apprend de tes prises pour te dire QUAND et OÙ pêcher selon TES patterns — pas selon des moyennes génériques.
- **Périmètre v1** : pêche à la canne du bord uniquement. Pas de pêche à pied, pas de bateau, pas d'eau douce.
- **Espèces ciblées (cœur produit)** : bar, dorade royale, lieu jaune, maquereau, sar, orphie. Côté éditorial (décision 2026-06-11) : extension progressive à **~20 espèces pêchables du bord** au même standard de profondeur — le carnet/onboarding reste sur les 6.
- **Géographie** : France métropolitaine (Atlantique, Manche, Méditerranée).
- **Concurrent direct #1** : [spot-de-peche.com](https://spot-de-peche.com) — **sérieux, à ne pas sous-estimer**. Carte interactive avec heatmap de qualité, fiche spot complète (courbe de marée 24h avec curseur "maintenant", météo détaillée : vent + direction, temp air + eau, vagues + houle + période, précipitations + probabilité, pression, nébulosité), section "Meilleurs moments" avec scoring solunar (lever/coucher de lune, lever/coucher de soleil, justifications astronomiques par créneau), explorer en cascade (dépt → technique → espèce → spot), bouton itinéraire GPS. Forces = exhaustivité des données environnementales + UX maps soignée + couverture multi-techniques (pêche à pied + canne + leurre). Faiblesses = pas de carnet personnel, pas de fil social, scoring 100% générique (modèles océanographiques + solunar standard, identique pour tous), pas d'app mobile native, pas de personnalisation. **Notre angle vs eux** = carnet personnel + scoring qui apprend de TES catches + signal communautaire ("3 prises ici aujourd'hui") + app mobile native iOS/Android. Implication concrète : on ne peut PAS sortir une carte squelettique face à eux — les données environnementales (marées + météo + vagues) sont des table stakes, pas un différenciateur. C'est fusionné dans le sprint 4.
- **Concurrent direct #2** : [FishFriender](https://www.fishfriender.com/) — 4,7/5 sur 3 200 avis, lancé 2016, généraliste toutes pêches, 12 langues. Force = boîte de pêche numérique (130k produits scannables). Faiblesses = carte 100% paywall, pas spécialisé FR, pas de fil régional. Notre angle = hyper-spécialisation canne du bord en mer FR + carte basique gratuite + fil régional par département.
- **Concurrent direct #3** : [Fishing Grid](https://fishing-grid.fr/) — identifié juin 2026, **le plus proche de nous en esprit** (carnet + carte + communauté, made in France, 2 frères à Pornic, lancé public avril 2026, ~5K downloads Android, 4.7-4.8/5 sur ~120 avis). Forces = **apps natives iOS/Android déjà en prod**, **100% gratuit sans pub** (monétisation marketplace matériel), IA reconnaissance d'espèces on-device + Pokedex, défis/classements/quiz, 266 fiches espèces indexées (SEO), 209 groupes locaux + chat temps réel, vélocité élevée (~10 releases en 10 mois). Faiblesses = généraliste eau douce+mer sans profondeur métier mer, **marées imprécises** (avis publics : ~30 min d'écart à Pornichet), scoring solunaire 100% générique, pas de spots curés (carte = contenu communautaire uniquement), pas de revenus récurrents, positionnement incohérent (site « anti-dopamine, pas de leaderboard » vs app gamifiée). Notre angle = profondeur mer (marées/vagues/houle précises) + scoring personnalisé + spots curés + modèle éco viable. Implications : sprint 10 SEO durci (être plus profond qu'eux sur nos 6 espèces), option PWA à sonder en beta sprint 11, arbitrage pricing social ouvert. **Analyse complète + plan d'action : `docs/concurrents/fishing-grid.md`.**
- **Différenciateur principal défendable** : le **carnet personnel comme moat**. Les concurrents donnent les MÊMES infos environnementales à tout le monde (météo générique, marées astronomiques, solunar standard). Nous, on overlay TES patterns historiques par-dessus ces données : "Tu pêches mieux en marée descendante coef > 80, le matin, après 3 jours sans pluie". Cette personnalisation est impossible sans carnet utilisateur. Long terme, plus l'utilisateur log de prises, plus le produit devient irremplaçable pour LUI spécifiquement — c'est notre vrai lock-in.

---

## 2. État actuel du projet

> ✅ **État réel — vérifié le 2026-07-02** (audit transverse `docs/audits/AUDIT-2026-07-02.md` : 5 axes + 2 passes QA live prod + SQL live ; complété post-S69). **Cette synthèse FAIT FOI.** Les blocs datés plus bas (2026-06-26, 2026-06-23 et antérieurs) sont conservés comme **annexe généalogique** — ils étaient vrais à leur date, ce ne sont PLUS l'état courant.

**Où on en est : sprint 69 livré et EN PROD ; sprint 70 « Vérité & bugs express » EN COURS sur la branche `sprint-70`.** Tout l'arbre des sprints 35→69 est en prod (prod = HEAD de `main` = `e464b78`, S69), dont le **pivot ADN dopamine (§8) exécuté sur les sprints 59→69** : S59 vérité/polish · S60 fondations XP/rangs (ledger `xp_events`) · S61 records perso + célébrations · S62 séries actives + badges publics à paliers · S63 défis + cockpit + notifs proactives · S64 carte instantanée (filtre fantôme, preconnect MapTiler) · S65 mobile & copie honnête · S66 classements multi-joueur (opt-in `public_ranking`, spot-safe, k-anon K=3) · S67 saisons trimestrielles + rangs vivants · S68 codes fondateurs = abonnement offert (`comp_grants`, `current_tier` v2 = max(Stripe, comp)) · S69 intégrité XP infalsifiable (le ledger fait foi, anti-farm/anti-datage, photo obligatoire pour « vérifiée », rate-limit DB).

> ⚠️ **Piège récurrent à connaître** : les lignes « non poussé / reste merge John » à la fin des RECAP de sprint sont écrites quand le code est complet sur la branche, et **deviennent périmées** dès que John merge + déploie sans rééditer le vieux RECAP. **La vérité = HEAD de `main` = prod** (auto-deploy Vercel). Ne JAMAIS conclure « pas déployé » à partir de la ligne de statut d'un ancien RECAP — vérifier git/prod.

- ★ **Màj 2026-08-17 (sprint 84, « Le cache qu'on croyait avoir »)** : le groupe `(marketing)` n'était **pas** rendu statique du tout. `<Header />` appelait `auth.getUser()` dans le layout, donc `cookies()`, donc **toutes** les pages SEO étaient dynamiques et `revalidate` / `generateStaticParams` inertes partout, depuis des mois et en silence. Mesure avant : `prerender-manifest.routes` = 2 (`/icon.svg`, `/robots.txt`), **0** fichier HTML pré-rendu. Après : **73 routes pré-rendues, 3 motifs ISR, 71 fichiers HTML**. Le correctif est 100 % applicatif (aucune migration) : header auth-aware côté client, middleware qui ne crée plus de client Supabase sur les routes publiques sans cookie de session, lectures publiques passées sur `createAnonClient()`, deltas connectés déplacés côté navigateur. Deux verrous empêchent la régression, cf §6. ⚠️ Exception connue : `/spots` reste dynamique parce qu'elle lit `searchParams` (facettes `?dept=` / `?species=`), pas à cause de l'auth. Détail : `docs/sprint-84/RECAP.md`.
- **Métriques (2026-07-02)** : **108 fichiers de migration** (`001`→`105b` ; 105/105b appliquées + prouvées en prod), **695+ tests Vitest**, **26 espèces** (carnet + onboarding + éditorial), **1 158 spots** (215 curés + 942 importés à curer + 1 communautaire, 24 départements côtiers), ~50 routes. Stack inchangée : Next **15.5.x** (App Router) + React **19** + TypeScript 5.9 + Tailwind **v4** + zod **v4** + @supabase/ssr 0.10 + Stripe SDK **22.x** + @sentry/nextjs **10** + maplibre-gl **5.x** + suncalc + Node **24**.
- **Réservoir toujours quasi vide** (19 profils, 21 prises dont 7 publiques, 1 post, 12 follows, 0 code d'invitation émis) : toute la couche dopamine tourne à vide. La réponse = **lane amorçage John** (minter les codes fondateurs S68 ; objectif 4 semaines : 20 fondateurs actifs, 100 prises, 1er classement départemental publié) + curation des **942 spots importés** (rythme à décider).
- **Carte : SAINE, chantier fermé** (contre-mesures du 02/07, audit §2.2 : desktop mesuré sain — TTFB 89 ms, load 2,9 s en hard reload, 0 long task — et perf + cadrage mobile **testés sains par John sur appareil réel** ; les captures « plein océan » étaient un artefact de resize fenêtre). **Le sprint 71 « carte » est ANNULÉ, le numéro reste vacant.** Ne PAS rouvrir ce chantier sans nouvelle mesure instrumentée (leçon : chiffre de perf/layout = mesure instrumentée ou appareil réel, jamais une impression d'agent). Reliquat mineur : lisibilité bathy (S70 Bloc D).
- **Mobile : PAS encore commencé** (aucune dépendance Expo/RN, pas de monorepo). Phase mobile = **S74+**, gate redéfini dans `docs/roadmaps/ROADMAP-POST-AUDIT-2026-07-02.md` §4 (S69 livré ✅ + ≥20 fondateurs actifs + alertes par port S72 en prod + funnel PostHog en place) ; détail : `docs/roadmaps/ROADMAP-MOBILE-2026-07-02.md`.
- **Chantiers ouverts au 2026-07-02 (audit §3/§4)** : CSP encore en Report-Only + `Permissions-Policy` absent ; 503 intermittents Vercel Challenge/WAF sur les prefetches RSC (risque crawlers/SEO, réglage dashboard John) ; OG images en timeout 25 s ; hydratation React #418 + `TypeError parentNode` ×3 routes (Sentry) ; copies « 157 spots » périmées (215 curés en DB) ; `APP_ROUTES` du middleware incomplet (perte du `?redirect`) ; aucun événement signup PostHog (funnel d'amorçage non mesurable). → **Tous traités au Sprint 70 : `docs/sprint-70/BRIEF.md`** (qui inclut aussi la dette doc : réorg `docs/sprints/` + `docs/roadmaps/` et le resync de ce fichier).

---

> 🗄️ **Bloc historique — synthèse 2026-06-26 (sprint 34), conservée telle quelle ci-dessous (n'EST PLUS l'état courant ; voir la synthèse 2026-07-02 ci-dessus qui FAIT FOI).**

> ✅ **État réel — vérifié le 2026-06-26** (audit transverse `docs/audits/AUDIT-2026-06-26.md` + QA live prod + revue code/DB). ~~Cette synthèse FAIT FOI.~~ → **périmée, cf 2026-07-02.** Les blocs datés plus bas (2026-06-23 et antérieurs) sont conservés comme **annexe généalogique** — ils étaient vrais à leur date, ce ne sont PLUS l'état courant.

**Où on en était (2026-06-26) : ~sprint 34. La refonte « home production » (sprint 34) + tout l'arbre des sprints 22→33 sont EN PROD** (vérifié live le 2026-06-26 : prod = HEAD de `main`, déployée Vercel, 0 erreur console sur les pages testées).

- **Livré ET en prod (vérifié live 2026-06-26)** : carnet (CRUD prises + photos + conditions auto + helper RecFishing) ; **scoring perso descriptif réel** — « le carnet qui parle », tendances par espèce/spot/moment (sprint 22 ; le moat n'est PLUS neutralisé) ; **26 fiches espèces** profondes sourcées (`/especes`, sprints 23/29) ; **carte v2** (vivante/heatmap k-anon, multi-source curé+communauté+OSM, bathy EMODnet, qualité par espèce) + gating freemium ; **moteur réglementation par façade + helper RecFishing** sourcé/daté (sprint 24) ; **co-pêchage** `/sorties` + **log de la bredouille** + **codes d'invitation beta** (gate `INVITE_ONLY`, sprint 25) ; **PostHog EU + consentement RGPD**, **emails dunning/win-back** (opt-out), **notif perso « optimal window »**, **gamification anti-comparaison** (Pokédex/streaks/badges privés, **zéro leaderboard** — sprint 26) ; **nav/IA unifiée** + tab bar mobile + hero auth-aware (sprint 27) ; polish « feel natif » (sprint 28) ; **cockpit `/home`** « Aujourd'hui » (présent/semaine/près-de-toi/progression — sprint 30) ; **carnet 26 espèces** + fixes honnêteté/INP (sprint 31) ; **refonte home production** (hero MapLibre réel + mer WebGL GLSL + motion GSAP/Lenis, sprint 34) ; **fil social** (posts/likes/commentaires/follows, Realtime, **100 % gratuit**) ; notifications in-app Realtime ; modération `/moderation` ; **Stripe** (Checkout + Portal + webhooks + essai 7j + Tax FR, QA LIVE OK) ; **RGPD** (pages légales + **suppression de compte en cascade, vérifiée live** — purge profil+prises+posts) ; **PWA** (manifest + SW + offline).
- **Métriques (2026-06-26)** : **58 fichiers de migration** (`001`→`057`), **~540 tests Vitest**, **26 espèces** (carnet + onboarding + éditorial), **157 spots curés / 24 départements côtiers**. Stack : Next **15.5.x** (App Router) + React **19** + TypeScript 5.9 + Tailwind **v4** + zod **v4** + @supabase/ssr 0.10 + Stripe SDK **22.x** + @sentry/nextjs **10** + maplibre-gl **5.x** + suncalc + Node **24**. *(⚠️ Chiffres historiques du 2026-06-26, périmés — au 2026-07-02 : 108 fichiers `001`→`105b`, 695+ tests, 1 158 spots dont 215 curés.)*
- **Mobile : PAS encore commencé** — aucune dépendance Expo/React Native dans `package.json`, pas de monorepo Turborepo/`pnpm-workspace`. C'est la **prochaine phase** ; le gate web→mobile est dans **`docs/roadmaps/ROADMAP-PRE-MOBILE-2026-06-26.md`**.
- **Bugs / chantiers ouverts au 2026-06-26 (cf audit `docs/audits/AUDIT-2026-06-26.md`)** : 🔴 **perf `/carte`** (Lighthouse mobile ~35, TBT ~3,9 s — sprint perf « carte instantanée » jamais exécuté) ; 🔴 **réservoir vide** (6 prises publiques / 1 post / 0 invitation → le moat « scoring perso » est codé mais invisible faute de données — décision de lancement) ; 🟠 **géocodage du log de prise par nom de ville cassé** (« Position requise » sauf coords manuelles) ; 🟠 **heures de soleil fausses sur `/home`** (`08:19–00:23` à Brest) ; 🟠 **en-têtes HTTP de sécurité absents** (CSP, X-Frame-Options…). → traités au **Sprint 35 « Vérité & bugs » : `docs/sprints/sprint-35/BRIEF.md`**.

---

> 🗄️ **Bloc historique — synthèse 2026-06-23 (sprint 20-21), conservée telle quelle ci-dessous (n'EST PLUS l'état courant ; voir la synthèse 2026-07-02 en tête de §2 qui FAIT FOI).**

> ✅ **État réel — vérifié le 2026-06-23** (audit transverse `docs/audits/AUDIT-2026-06-23.md` ; mis à jour au sprint 21). ~~Cette synthèse FAIT FOI~~ → **périmée, cf 2026-06-26**. Le détail « sprints 1 → 11.6 » plus bas est conservé comme **annexe généalogique** (historique des décisions), PAS comme état courant.

**Où on en était (2026-06-23) : fin du sprint 20 + épique carte v2 (C1→C3b) livrée et DÉPLOYÉE.**

- **Prod = HEAD de `main`** (`5a17509`), `main == origin/main`, déployée sur Vercel. **Aucun backlog de merge** (toutes les branches sprint/carte-v2 sont mergées — le « backlog de déploiement » est un mythe). Migrations sur disque jusqu'à **046** (047 = sprint 21, non appliquée). ⚠️ Dérive d'historique : 025/026/027/044 appliquées en prod mais absentes de `supabase_migrations` → `migration repair` à faire avant tout `db push`.
- **Livré ET en prod** : carnet (CRUD prises + photos WebP resize client + conditions auto-loggées + stats + privacy/floutage) ; **fiches espèces** (`/especes` + 6 fiches profondes sourcées/datées, sprint 15) ; **carte v2** (C1 vivante/heatmap k-anon · C2 multi-source curé+communauté+OSM · C3a bathy EMODnet · C3b **qualité par espèce** `get_quality_cells`) ; **fil social** (posts/likes/commentaires/follows, Realtime, **100 % gratuit**) ; **notifications** in-app Realtime ; **photos** (prises/posts/avatars) ; **modération** (`/moderation`, sprint 17) ; **Stripe** (Checkout + Portal + webhooks + essai 7j + Tax FR, QA LIVE OK) ; **RGPD** (pages légales + suppression de compte RPC) ; **PWA** (manifest + SW + offline).
- **Catalogue** : **157 spots curés sur 24 départements côtiers** (Bretagne, Manche, Atlantique, Méditerranée, Corse) — objectif sprint 10 (100-120) **dépassé**.
- **Sécurité** : floutage GPS verrouillé sur **3 couches** (grants colonne `geom` 028b/041 → anon/authenticated SANS SELECT ; vues `*_for_viewer` ; RPC gatées tier renvoyant `ST_Centroid(geom_public)` ≈ 500-900 m). **389+ tests Vitest** ; catch CRUD + RLS désormais testés (sprint 21).
- **Le vrai chantier n'est PAS technique** : (1) le **moat « scoring perso » n'est pas encore réel** (score affiché = solunar **générique** `spot_scores` ; perso neutralisé depuis 7.5) ; (2) **réservoir vide** (~5 prises publiques, 15 profils → pré-lancement de fait) ; (3) **éditorial en retard** (6 espèces/~20, ~5-6 guides/~20). → Roadmap H2 : `docs/roadmaps/ROADMAP-2026-H2.md` (résumé §9).

> 🧬 **Annexe généalogique (historique daté, NON l'état courant).** Le détail ci-dessous trace l'évolution sprint par sprint jusqu'au sprint 11.6 — utile pour comprendre POURQUOI une décision a été prise (chaque « État au … » était vrai à sa date). Pour l'état réel, voir la synthèse ci-dessus + l'audit 2026-06-23. ⚠️ **Chemins docs de l'annexe** (réorg 2026-07-02) : les `docs/sprint-N/…` cités ci-dessous vivent désormais sous `docs/sprints/sprint-N/…`, et les `docs/ROADMAP-*.md` sous `docs/roadmaps/` (les citations ne sont pas réécrites).

✅ **Fait (sprints 1 à 7.5)**
- Décisions stratégiques validées (nom, périmètre, stack, tarifs)
- Maquette HTML cliquable (5 pages) — voir `docs/maquette/`
- Repo GitHub privé : <https://github.com/Seychi/Carnet-de-peche>
- Projet Supabase + Vercel en prod, auto-deploy depuis `main`
- **Site live** : <https://www.carnet-de-peche.com>
- **Sprint 1-2** : Next.js 15 + Supabase (SSR) + auth (email/password + Google OAuth + reset) + onboarding 6 étapes + design system Tailwind v4 / shadcn
- **Sprint 3 + 3.5** : Carnet complet (CRUD prises, photos Storage, conditions auto-loggées Open-Meteo, profil, stats, polish form + flèche retour mobile)
- **Sprint 4** : Carte MapLibre + clustering + freemium gating (3 spots/dépt gratuit) + fiche spot riche (marées, météo, vagues, houle, soleil) + SEO programmatique (sitemap, JSON-LD, OG dynamiques) + mobile UX
- **Sprint 6** : "Meilleurs moments" solunar (suncalc, calendrier 7j, scoring 40/35/25, badges, justifications astronomiques)
- **Sprint 7** : Scoring personnalisé (mode descriptif "où et quand tombent tes prises") + cron Vercel `compute-spot-scores` + markers carte colorisés + table `spot_scores` + 116 tests Vitest verts
- 16 migrations Supabase appliquées (001 → 016)
- **Audit complet** du projet livré le 2026-05-20 → `docs/AUDIT-2026-05.md`
- **Sprint 7.5** (hygiène produit post-audit, déployé 2026-05-21) :
  - **Bloc A** — SEO domaine `.com` (metadataBase, sitemap, robots, canonical, OG), stubs footer `/fil`·`/especes`·`/techniques`, essai aligné **7 jours avec CB** (décision verrouillée), CTAs `#` branchés, copy home assainie (fin des affirmations mensongères : exports, "217 spots", floutage 1 km), témoignages fictifs → bloc "Pourquoi maintenant"
  - **Bloc B** — badge `⚡ Perso` neutralisé sur les fiches spots (multiplicateur non démontrable, cf `docs/sprint-7.5/scoring-perso-deferred.md`)
  - **Bloc D** — `lib/env.ts` durci (CRON_SECRET + SERVICE_ROLE_KEY requis en prod), discipline migrations documentée (`supabase/README.md`), `lib/types.ts` regen, CI GitHub Actions, cleanup routes dev, **cron `spot_scores` passé en quotidien + validité 26h** (plan Hobby)
  - **Bloc E** (audit Claude-in-Chrome) — **pages légales RGPD/LCEN complètes** (mentions/confidentialité/CGU avec vrai SIRET), `/home` refondu en mini-dashboard, messages de validation **zod en français**, placeholder lat/long, corrections copy, carnet de test nettoyé, tap targets ≥ 44 px, skeleton carte, itinéraire multi-app (Google/Plans/Waze)
  - **Reporté en backlog** (`docs/roadmaps/ROADMAP.md`) : bloc C (lint ~360 apostrophes `react/no-unescaped-entities` + retrait `eslint.ignoreDuringBuilds`), date-picker FR custom (E3), domiciliation commerciale + médiateur conso
- **Sprint 8** (Fil communautaire — pivot social, sur branche `sprint-8`, **pas encore mergé/déployé**) :
  - Audit RLS complet (`docs/sprint-8/rls-audit.md`) → a trouvé 2 trous non prévus (lecture anonyme du fil + graphe social via clé publishable) corrigés en migration 017 (RLS-FIX-04/05)
  - Migrations **017→020 appliquées en prod** : tier gating (`can_post_in_department`), vue `feed_posts_for_viewer`, RPC `get_spot_activity` + `get_feed_unread_counts`, `reports.details`, Realtime (publication + replica identity)
  - Server Actions `app/actions/feed.ts` (createPost/toggleLike/addComment/deletePost/deleteComment/reportPost/getComments/getFeedPage) + `follow.ts` — **183 tests Vitest verts**
  - Hooks Realtime, 6 composants `components/feed/`, routes `/fil`·`/fil/[dept]`·`/u/[username]`·`/follows`, signal social fiche spot, seed dev `/dev/seed-feed`
  - **Reste avant merge** : QA manuelle (`docs/sprint-8/qa-checklist.md`), tests Realtime/tier cross-onglets, captures composer, puis merge `sprint-8` → `main` + déploiement. RLS-FIX-06 (geom catch en accès direct) → backlog. Voir `docs/sprint-8/RECAP.md`.

ℹ️ **Sprint 8 mergé** : `main` == `sprint-8` (commit `0bcb0cf`) → le fil communautaire est sur `main`.

✅ **Sprint 9 — Paiements (Stripe) — CODE-COMPLET (branche `sprint-9`, pas encore mergé/déployé)**
Stripe Checkout + Customer Portal + webhooks idempotents + essai 7j avec CB + Stripe Tax FR + gating réel des tiers via RPC `current_tier` (remplace les inserts manuels / seed dev). Migration 021 appliquée en prod. **~265 tests verts, build OK.** Flow Checkout validé en mode test le 2026-05-21.
- **Reste avant merge** (manuel John) : QA `docs/sprint-9/qa-checklist.md` + captures écran, vars **LIVE** dans Vercel + endpoint webhook prod, arbitrer 2 comptes seed payés sans Stripe (cf `supabase/README.md` § anti-traîne). Voir `docs/sprint-9/RECAP.md`.
- **Finding API** : SDK Stripe 22.x / API `2026-04-22.dahlia` → `current_period_*` sur les SubscriptionItem, `Invoice` → `parent.subscription_details.subscription`.

✅ **Sprint 9.5 — Cleanup pré-merge — CODE-COMPLET (branche `sprint-9.5-cleanup`, pas encore mergé/déployé)**
> ℹ️ État git réel (vérifié) : le code des sprints 8 **et 9** est déjà sur `main` (commits `feat(sprint-9)` … `c79057d`). `sprint-9.5-cleanup` part de `main` → il n'y a PAS de merge `sprint-9` → `main` à faire, seulement `sprint-9.5-cleanup` → `main`.

Nettoyage des bloquants UX/SEO de l'audit `docs/audits/AUDIT-2026-05-21-post-sprint-9.md`. **Build OK + ~265 tests verts.**
- **T0.1** — « metas in body » = **fausse alerte** (extension navigateur ; SSR brut propre, vérifié). Ajout d'un **og:image de marque** par défaut (`app/opengraph-image.tsx`) car la home/pages marketing n'en avaient aucun → previews sociales muettes.
- **T0.2** — `/fil` : **stub publique** (`app/(marketing)/fil/page.tsx`, teaser + CTA ; redirige les connectés vers leur fil dépt). Sort du soft-404 sitemap. `/fil/[dept]` reste protégé dans `(app)`.
- **T0.3** — markers carte visibles en **Discovery** : un pin coloré (cliquable) est posé sur **tous** les spots, y compris floutés (centre `geom_public`), en plus du disque 1 km.
- **T0.4** — carte plus noire au mount : `map.resize()` ajouté au handler `load` de `MapView`.
- **T1.2 / T1.3** — titres `<title>` spécialisés (`/auth/*` via layout server car pages client, 404) + 404 avec Header/Footer.
- **T1.4** — **marées disponibles sur TOUS les spots** : Open-Meteo Marine expose bien `sea_level_height_msl` (commentaire « absent » obsolète). Courbe + PM/BM approximés à l'heure. Réduit le besoin WorldTides.
- **T1.5** — mockups home (carnet, année, communauté) marqués « Exemple ».
- **T1.6** — tab `/auth/login` synchronisé avec l'URL (`history.replaceState`).
- **Retirés (décision John 2026-05-21)** : T0.5 médiateur conso (promesse retirée de la CGU, risque L612-1 assumé) + T1.1 durée guide bar.
- **Reste avant merge** (manuel John) : relire → `sprint-9.5-cleanup` → `main` → déploiement → QA Stripe LIVE (`docs/sprint-9/RECAP.md`). Détail : `docs/sprint-9.5-RECAP.md`.

✅ **État au 2026-06-11 (vérifié git + prod)** : `main` == `origin/main` (commit `2854c4f`) contient les sprints 8, 9, 9.5, **10.5 (DA v2)** et les **Blocs 0 + 4 du sprint 10** — tout est déployé. **QA Stripe LIVE validée par John (2026-06-11)**. Migration 022 (`social_free`) appliquée en prod. La prod compte **10 spots** (8 en Finistère, 2 en Morbihan).

✅ **État au 2026-06-13 (vérifié git + Vercel + Supabase)** : `main` == `origin/main` (commit `698f7c2`) = **branche de production Vercel**, déployée. Le **sprint 10.6** (fixes fil) **et le sprint 11** (PWA installable + manifest + SW, Sentry câblé, emails Resend, E2E Playwright + Lighthouse CI, perf bundle, a11y AA) sont **mergés sur main et en prod**. Migrations **023 (modération, colonne `is_moderator` + policies) + 024 (perf RLS initplan + index)** appliquées en prod.
- **Incident résolu** : la prod tournait sur un commit `sprint-11` promu à la main par-dessus la branche `main`, **sans que 023/024 soient appliquées** → le code déployé interrogeait `profiles.is_moderator` inexistant → `/fil/[dept]` en erreur (`column does not exist`) et `/fil` connecté renvoyé en cul-de-sac `/profil` (compte John sans `home_department`). Corrigé : migrations appliquées, `home_department` de John = `06`, John flaggé **modérateur**, et `/fil` sans département affiche désormais un **sélecteur de côte** au lieu de `/profil`.
- **⚠️ Reste (dashboard Vercel, hors outils Claude)** : ajouter `NEXT_PUBLIC_SUPABASE_URL` + `NEXT_PUBLIC_SUPABASE_ANON_KEY` à l'env **Preview** — sans elles, **tous les builds de branche/PR + la CI E2E échouent** (prod non affectée). Leçon : appliquer les migrations Supabase en prod **avant** de promouvoir le code qui en dépend.

✅ **État au 2026-06-21 (post-audit, vérifié git + Supabase live)** : la prod compte **38 spots** (lot 1 Bretagne curé inséré le 2026-06-21, commits `feat(spots): lot 1` — dernier commit prod avant ce sprint : `05ee5bd`). Région Supabase réelle = **eu-west-1 (Irlande)** (la doc disait eu-west-3 Paris, corrigé). **Audit transverse 2026-06-21 traité** (`docs/audits/AUDIT-2026-06-21.md`) via le **sprint 11.5** (`docs/sprint-11.5/BRIEF.md`) : 🟠 fuite GPS partiellement traitée au 11.5 : seul `get_spots_for_scoring` était visé (migration **025**) ; les 2 vrais vecteurs (flou `geom_public` cosmétique = **0 m** mesuré + colonne `spots.geom` lisible par `anon`) restaient GRANDS OUVERTS, fermés au **sprint 11.6** (migrations **028/029**). ⚠️ Les effets DDL de **025/026/027** sont présents dans le schéma prod (appliqués à la main via SQL Editor) mais l'historique `list_migrations` **s'arrête à 024** → à réconcilier via `supabase migration repair --status applied 025 026 027` (NON fait au 2026-06-21 ; l'ancienne mention « 025 appliquée + vérifiée en prod » était fausse). Durcissement `search_path` + index FK (**026/027**), lint réactivé + bloquant, SEO (canonical/JSON-LD home·tarifs·especes, noindex `/techniques`), tests (`env`, régression floutage, E2E downgrade Stripe, Lighthouse a11y+seo), build aligné **Node 24** (LTS active) + région Vercel **`dub1`**, hygiène code/docs. **~265 tests Vitest.**

✅ **Sprint 11.6 — remédiation audit QA live (`docs/sprint-11.6/`) — CODE-COMPLET sur branche `sprint-11.6`, PAS encore mergé/déployé (2026-06-21).** Ferme les 18 bugs de `docs/audits/AUDIT-QA-LIVE-2026-06-21.md` : 🔴 fuite GPS réelle (jitter aléatoire `blur_spot_geom` via buffer recentré + **verrou colonne `geom`** (revoke table + grant colonnes sauf geom) + gating de tier dans les 4 RPC spots → migrations **028/029**) ; 🟠 suppression de compte RGPD via le RPC SECURITY DEFINER `delete_my_account` (owner postgres → migration **033** ; `auth.admin.deleteUser` échouait : « permission denied for table feed_posts » car `supabase_auth_admin` n'a pas DELETE sur les tables public) + nettoyage Storage ; FK `feed_posts.moderated_by`/`reports.resolved_by` → `ON DELETE SET NULL` → **030**) ; vues `*_for_viewer` en `security_invoker` (**031**) ; liste canonique **24 départements côtiers** (métropole + Corse, **sans la Somme 80**) centralisée dans `lib/geo/departments.ts` + onboarding/profil alignés + `can_post_in_department` (**032**) ; `/follows` réparé + fil optimistic (post/suppression sans reload) ; carte resize fiable (plus de canvas noir au mount) ; copy assainie (retrait export GPX/« 27 départements »/« Corse fin 2026 ») + accord de genre espèces ; auth `?redirect=` + contexte `plan` conservés ; polish UX (modale suppr post, timezone prise, onglets fil mobile, autofill off) ; perf onboarding (`useTransition` + skeleton). **Migrations 028→032 APPLIQUÉES + vérifiées en prod le 2026-06-21** (via connecteur Supabase ; flou mesuré 510-898 m, `anon` ne lit plus `geom`, FK suppression en SET NULL, 3 vues en `security_invoker`, `spots_for_viewer` gardée definer assumée). **Fait par John (2026-06-21)** : `lib/types.ts` régénéré, vars Vercel confirmées. **HIBP (Leaked Password Protection) NON activé — décision John : Pro-only, projet en plan Free → WARN advisor `auth_leaked_password_protection` assumé (ne pas le re-signaler comme TODO).** **Reste** : merger `sprint-11.6` + déployer le code. Détail : `docs/sprint-11.6/RECAP.md`.

🔜 **SUITE — Sprint 10, Blocs restants 1 → 2 → 3 → 5** (brief : `docs/sprints/sprint-10/BRIEF.md`) : MDX + guides, ~500 pages programmatiques, fiches espèces profondes, SEO global. **Élargi le 2026-06-11 (décisions John, riposte Fishing Grid)** :
- **Curation de spots** : objectif **100-120 spots curés**, priorité Bretagne → façade Atlantique, par lots validés par John avant insertion — plan et lots dans `docs/sprint-10/spots-curation.md`. C'est le préalable pour tenir la copy home « 100+ spots curés » et Gate 2.
- **Fiches espèces étendues** : les 6 profondes d'abord (Bloc 3 inchangé), **puis extension à ~20 espèces mer du bord** (mulet, vieille, congre, chinchard, oblade, pageot…) au même standard : réglementation sourcée + datée (`verified_at`), saisons par façade. On ne court PAS après leurs 266 fiches creuses.

Puis sprint 11 : polish + **PWA installable** + beta.

🔜 **Suite (sprints 10 → 23 + phase 2)**
Voir `docs/roadmaps/ROADMAP.md` pour le découpage complet (Stripe → Guides → Beta → Mobile → Lancement → Phase 2). Résumé section 9 plus bas dans ce fichier.

---

## 3. Équipe & rôles

- **John (toi le user actuel)** — fondateur, pêcheur passionné, **Product & Tech Lead**. Pilote Claude Code. Possède le repo, valide les sprints, gère les déploiements.
- **César** — co-fondateur, **Community & Growth Lead**. Hors repo, sur les réseaux sociaux et la communauté. Tu n'interagis pas avec lui.
- **Claude Code (toi)** — exécution massive du code, des configs, des migrations, du contenu technique.
- **Claude web** — utilisé en parallèle par John pour les décisions stratégiques et les documents longs (docx, plans).

---

## 4. Stack technique

| Couche | Choix | Note |
|---|---|---|
| **Web Frontend** | Next.js 15 (App Router) + TypeScript + Tailwind v4 + shadcn/ui | SSR/ISR pour SEO |
| **Mobile** | React Native + Expo (Expo Router) — **non démarré** | ⚠️ PAS encore en place (re-vérifié 2026-07-02) : aucune dépendance Expo/RN, pas de dossier mobile. Phase S74+ (gate redéfini : `docs/roadmaps/ROADMAP-POST-AUDIT-2026-07-02.md` §4 ; détail : `docs/roadmaps/ROADMAP-MOBILE-2026-07-02.md`). **Viser un SDK Expo récent au démarrage — « SDK 51 » (mi-2024) est obsolète, à trancher avec John.** |
| **Backend / DB / Auth** | Supabase (PostgreSQL 15+ avec PostGIS + RLS + Auth + Storage + Edge Functions + Realtime) | Région eu-west-1 (Irlande) |
| **Cartographie** | MapLibre GL JS (web) + Native (mobile) + tuiles MapTiler | Free tier suffit jusqu'à 100k tiles/mois |
| **Marées + météo + vent + houle** | **Open-Meteo Marine** (gratuit, sans clé API) | Pas de SHOM en v1. Migration possible plus tard. |
| **Bathymétrie** | GEBCO + SHOM Geoservices (open data, sans convention) | Conversion en MBTiles |
| **Paiements** | Stripe Subscriptions (web) + Apple IAP (iOS plus tard) | Mode test à utiliser pour le dev |
| **Push notifications** | Expo Notifications | Mobile uniquement |
| **Email** | Resend + React Email | 3 000 mails/mois gratuits |
| **Modération (plus tard)** | Claude API (Haiku + Vision) | Pas en v1, modération libre au lancement |
| **Analytics** | Plausible (web) + PostHog (produit) | À setup Sprint 4 |
| **Monitoring** | Sentry | À setup Sprint 6 |
| **Monorepo** | Turborepo + pnpm (cible) | ⚠️ **Non mis en place** (2026-06-26 : pas de `turbo.json` ni `pnpm-workspace.yaml`) — repo encore mono-package Next.js. À faire au démarrage mobile. |
| **CI/CD** | GitHub Actions + Vercel + EAS Build (mobile) | Vercel auto-deploy déjà branché |

**Versions précises (vérifiées dans `package.json` au 2026-06-26)**
- Node **24** (LTS active — Node 20 EOL depuis avril 2026) ; `.nvmrc` = 24, `engines.node` = 24.x
- pnpm 9+
- TypeScript **5.9**
- Next.js **15.5.x** (App Router obligatoire, pas pages router)
- **React 19** + React-DOM 19
- Tailwind **v4** (setup CSS-first)
- zod **v4** (⚠️ pas v3 — l'API diffère)
- @supabase/ssr **0.10** + @supabase/supabase-js 2.105 (pas @supabase/auth-helpers, déprécié)
- Stripe SDK **22.x** (API `2026-04-22.dahlia`, cf §2 sprint 9 findings) · @sentry/nextjs **10** · maplibre-gl **5.x** · suncalc 1.9

---

## 5. Variables d'environnement

Crée un fichier `.env.local` à la racine avec ces valeurs (NE JAMAIS commit ce fichier — vérifier qu'il est dans `.gitignore`) :

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://glgciwwnpmgifyhbvxsw.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=sb_publishable_lNVe6dgxvg8KRq8NnHrU7w_Rn-kxIUU
SUPABASE_PROJECT_REF=glgciwwnpmgifyhbvxsw

# Service role (à demander à John quand on aura besoin pour les Edge Functions)
# SUPABASE_SERVICE_ROLE_KEY=

# Stripe (sprint 9) — requis selon VERCEL_ENV (LIVE en prod, TEST en dev/preview).
# sk_ et whsec_ = serveur uniquement, jamais NEXT_PUBLIC_. Liste complète : .env.example.
# LIVE : STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET, NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY + 4 STRIPE_PRICE_*
# TEST : STRIPE_TEST_SECRET_KEY, STRIPE_TEST_WEBHOOK_SECRET, NEXT_PUBLIC_STRIPE_TEST_PUBLISHABLE_KEY + 4 STRIPE_TEST_PRICE_*

# À ajouter plus tard
# NEXT_PUBLIC_MAPTILER_KEY=
# RESEND_API_KEY=
# SENTRY_DSN=
# ANTHROPIC_API_KEY=
```

Crée aussi un `.env.example` (sans valeurs, à commit) qui sert de template pour les futurs collaborateurs.

**Vercel** : ces vars doivent aussi être ajoutées dans Vercel Project Settings → Environment Variables (Production + Preview + Development pour les `NEXT_PUBLIC_*`).

---

## 6. Architecture & conventions de code

### Structure cible du repo

```
Carnet-de-peche/
├── CLAUDE.md                          ← ce fichier
├── README.md                          ← pour visiteurs GitHub
├── .gitignore
├── .env.example                       ← committé (template)
├── .env.local                         ← PAS committé (vraies clés)
├── .nvmrc                             ← Node 24
├── package.json
├── pnpm-lock.yaml
├── tsconfig.json
├── next.config.ts
├── tailwind.config.ts                 ← ou config CSS-first selon Tailwind v4
├── postcss.config.mjs
├── components.json                    ← shadcn/ui config
├── app/                               ← Next.js App Router
│   ├── layout.tsx
│   ├── page.tsx                       ← accueil public
│   ├── globals.css
│   ├── (auth)/                        ← route group
│   │   ├── login/page.tsx
│   │   ├── register/page.tsx
│   │   └── callback/route.ts
│   ├── (app)/                         ← route group authentifié
│   │   ├── layout.tsx                 ← guard auth
│   │   ├── carnet/page.tsx
│   │   ├── carte/page.tsx
│   │   ├── spot/[slug]/page.tsx
│   │   └── onboarding/page.tsx
│   └── api/
│       └── health/route.ts            ← healthcheck Vercel
├── components/
│   ├── ui/                            ← shadcn primitives
│   └── ...                            ← composants métier
├── lib/
│   ├── supabase/
│   │   ├── client.ts                  ← createBrowserClient
│   │   ├── server.ts                  ← createServerClient
│   │   └── middleware.ts              ← refresh session
│   ├── env.ts                         ← validation env vars (zod)
│   └── types.ts                       ← types Database depuis Supabase
├── public/                            ← assets statiques (logos, favicon)
├── supabase/
│   ├── README.md                      ← documentation BDD
│   ├── migrations/
│   │   ├── 001_init.sql
│   │   ├── 002_rls.sql
│   │   ├── 003_indexes_views.sql
│   │   └── 004_functions_triggers.sql
│   └── seed.sql
└── docs/
    ├── BRIEF.md                       ← brief projet
    ├── SETUP-CHECKLIST.md             ← setup compte
    ├── ROLES.md                       ← répartition John/César
    └── maquette/                      ← maquettes HTML pour le design
        ├── index.html
        ├── carte.html
        ├── spot.html
        ├── guide.html
        ├── tarifs.html
        └── assets/style.css
```

### Conventions

- **Langue** : code et identifiants en **anglais**, commentaires et UI en **français** (tutoiement).
- **Naming** : `camelCase` en TypeScript, `snake_case` en SQL, `kebab-case` pour les fichiers et routes.
- **Imports** : utilise les alias `@/*` configurés dans `tsconfig.json` (`@/components`, `@/lib`, etc.).
- **Server vs Client Components** : par défaut Server Component. Ajoute `'use client'` uniquement si tu utilises des hooks, événements, ou des libs client-only.
- **Données** : préfère les Server Components qui font les requêtes Supabase directement (avec `createServerClient`), pas de fetch côté client sauf nécessité (Realtime).
- **Validation** : `zod` partout (env vars, form inputs, API responses).
- **Erreurs** : pas de `try/catch` silencieux. Toujours logger et remonter à l'utilisateur.
- **Tests** : pas obligatoire en sprint 1-4, mais quand on en écrit : Vitest + Playwright.
- **Commits** : Conventional Commits (`feat:`, `fix:`, `chore:`, `docs:`). Messages en français OK.
- ★ **Rendu statique du groupe `(marketing)` (sprint 84, verrouillé)** : **aucun composant rendu par `app/(marketing)/layout.tsx` ni par `app/not-found.tsx` ne doit lire les cookies**, ni directement (`cookies()` de `next/headers`) ni indirectement (`createClient()` de `@/lib/supabase/server`). Un SEUL accès aux cookies dans l'arbre serveur rend **tout le groupe** dynamique et neutralise `revalidate` et `generateStaticParams` sur **toutes** les pages SEO, en silence. C'est arrivé pendant des mois, personne ne l'a vu. Pour une donnée publique, utiliser `createAnonClient()` de `@/lib/supabase/anon` ; pour une donnée qui dépend du visiteur, la sortir du rendu serveur et la lire côté client après hydratation (modèles : `components/layout/HeaderAuthSlot.tsx`, `components/marketing/HeroPrimaryCta.tsx`). Deux verrous automatiques le vérifient : le test `__tests__/marketing-layout-is-static.test.ts` (parcourt le graphe d'imports, sans build) et `pnpm check:prerender` (lit `.next/prerender-manifest.json` après un build). **Corollaire : aucune donnée utilisateur ne doit jamais apparaître dans un HTML mis en cache.**
- ★ **Canonique et `noindex` (sprint 90, verrouillé)** : **toute page de `(marketing)` porte SOIT une `alternates.canonical`, SOIT un `robots: { index: false }`** ; **toute page de `(app)` porte un `noindex` ou tombe dans le `disallow` de `app/robots.ts`**. Sans canonique, Google en choisit une seul et compte les variantes de query (`?utm_*`, `?redirect=`) comme des doublons : il y en avait **17** au 23/08. Et chaque route applicative indexable prend du budget d'exploration aux pages SEO, alors que **305 pages détectées attendaient** d'être explorées. ⚠️ **Ne JAMAIS mettre au `disallow` une page qu'on veut désindexer** : bloquée au crawl, elle ne peut pas voir son `noindex` et reste indexée. Le verrou est `__tests__/seo-canonical-and-robots.test.ts`, qui lit le `disallow` **depuis `app/robots.ts`** et non une copie. Si la page est `'use client'`, le `metadata` va dans le `layout.tsx` voisin (modèle : `app/auth/reset-password/layout.tsx`) — le test regarde les deux fichiers.
- **Copy / ponctuation (anti-tic IA)** : **jamais de tiret cadratin « — » dans une chaîne de copy visible** (prose des pages, fiches espèces, guides, emails, UI). C'est le tic IA n°1 du projet (cf sprint Copy-IA, `docs/sprint-copy-ia/`). À la place, selon le sens : **virgule** (incise/aside), **parenthèses** (apposition secondaire), **deux-points** (explication/liste), **point** (rupture forte). **Exceptions tolérées** : placeholder de donnée vide `'—'`, séparateur de `<title>`/OG `'… — Carnet de Pêche'`, libellés data `'29 — Finistère'` / `'— 10 m'`, et commentaires de code. Lint conseil (non bloquant) : `node scripts/lint-copy-dashes.mjs`.

### Style UI

> ✅ **DA v2 « Instrument de précision marine » = charte courante** (implémentée au sprint 10.5, 2026-06-11, branche `sprint-10.5-ui` — RECAP : `docs/sprint-10.5/RECAP.md`). Référence : `docs/maquette-v2/DA.md` + maquettes HTML. Tokens dans `app/globals.css` (@theme) : navy-950 `#04141C`, gold-500 `#D9A53C`, coral-500 `#E5604F`, teal-300, sémantique score (high teal / mid gold / low ink). **Règle d'or : tout chiffre métier passe en JetBrains Mono** (`font-mono`) — coords, coefs, horaires PM/BM, tailles, stats. Composants signature dans `components/ui-v2/` (TagData, ScoreRing, TideSparkline, InstrumentsBar, Bathy, Chip) — vitrine sur `/dev/ui-v2`. App shell : tab bar mobile + FAB < 960px (`--breakpoint-desk`), sidebar desktop, bandeau instruments.

Charte v1 définie dans la maquette HTML (`docs/maquette/assets/style.css`) :

- **Couleurs**
  - `--navy-900`: `#0A2F3D` (primaire)
  - `--teal-500`: `#14B8A6` (accent)
  - `--sand-50`: `#FBF8F2` (fond clair)
  - `--ink-900`: `#0E1A22` (texte)
- **Typo** : Inter (UI) + Space Grotesk (titres)
- **Radius** : `8px` (sm), `14px` (md), `22px` (lg), `32px` (xl)
- **Spacing** : multiples de 4
- **Tone of voice** : tutoiement systématique, voix pêcheur, pas de jargon corporate

---

## 7. Schéma base de données

**Le SQL est dans `supabase/migrations/`** — 4 fichiers à appliquer dans l'ordre :

1. `001_init.sql` — Tables : profiles, spots, catches, feed_posts, feed_comments, feed_likes, follows, subscriptions, conditions_cache, reports. Extensions : postgis, pgcrypto, citext, pg_trgm.
2. `002_rls.sql` — Row Level Security activé partout. Helper `has_active_subscription(uid)`.
3. `003_indexes_views.sql` — Index PostGIS GiST + B-tree + GIN. Vues `catches_for_viewer` et `spots_for_viewer`.
4. `004_functions_triggers.sql` — Triggers `handle_new_user`, `touch_updated_at`, floutage GPS automatique, fonctions `nearby_spots()`, `catch_visible_geom()`, `spot_visible_geom()`.
5. (optionnel) `seed.sql` — 10 spots Bretagne pour le dev.

**Comment appliquer** :
- **Option A (dashboard)** : Supabase Studio → SQL Editor → coller chaque fichier dans l'ordre → Run.
- **Option B (CLI)** : `supabase link --project-ref glgciwwnpmgifyhbvxsw` puis `supabase db push`.

### Tables clés à connaître

- **`profiles`** : étend `auth.users`. Auto-créé par trigger à l'inscription. Champ `onboarded boolean default false` — le frontend doit rediriger vers `/onboarding` tant que `false`.
- **`spots`** : spots de pêche. `geom` = précis, `geom_public` = flouté **~500-900 m** (jitter recentré, migration 028 ; + verrou colonne `geom` 028b/041 → `anon`/`authenticated` SANS SELECT). Visibilité `public` / `subscriber` / `private`.
- **`catches`** : **LE CARNET — cœur du produit**. Chaque prise loguée. `conditions` jsonb contient le snapshot Open-Meteo. Privacy `private` / `friends` / `public`. Deux booleans `precise_for_friends` (default true) et `reveal_precise_to_public` (default false).
- **`feed_posts`** : mur communautaire. `moderation_status` default `approved` (modération libre au lancement).
- **`subscriptions`** : source de vérité = Stripe webhook. Plans `discovery` / `local` / `itinerant`.

> ⚠️ **L'intro « 4 fichiers » ci-dessus est HISTORIQUE.** Il y a aujourd'hui **108 fichiers de migration** numérotés (`001`→`105b`, voir `supabase/migrations/` ; vérifié 2026-07-02). `conditions_cache` **n'existe plus** (droppée en 046). `has_active_subscription` est remplacé par la RPC **`current_tier`** (source = webhook Stripe, étendue en 104 : max(Stripe, comp fondateur) — jamais de downgrade payant).

**Tables / objets ajoutés depuis (migrations 023→046) :**

- **Social** : `feed_comments`, `feed_likes`, `follows`, `feed_post_photos` (galeries de posts ; FK `user_id` indexée en 047), `reports` (modération), `notifications` (in-app + Realtime).
- **Météo** : `weather_cache` (045, cache Open-Meteo écrit en **service-role**, lu en session) — remplace `conditions_cache`.
- **Scoring / carte v2** : `spot_scores` (014, cron quotidien — solunar **générique**, pas perso) ; multi-source spots (043, `source` curated/community/osm) ; RPC `get_catch_heatmap` (040, k-anon K=3), `get_quality_cells` (044, qualité par espèce **décomposable** communauté k-anon + perso Itinérant + fond).
- **Sécurité GPS** : `spots.geom` / `catches.geom` **verrouillées au niveau colonne** (028b/041 → `anon`/`authenticated` sans SELECT) ; floutage spots = jitter recentré **~500-900 m** (028, plus « 1 km » fixe) ; vues `*_for_viewer` en `security_invoker` SAUF `catches_for_viewer` + `spots_for_viewer` (`security_definer` **assumé** — cf migration 047 §3 pour le pourquoi).

### Helpers SQL utiles (à utiliser depuis le frontend)

```ts
// Tier courant — source de vérité = webhook Stripe (REMPLACE has_active_subscription)
const { data: tier } = await supabase.rpc('current_tier', { uid: user.id });
// → 'anonymous' | 'discovery' | 'local' | 'itinerant'

// Spots proches d'une position
const { data } = await supabase.rpc('nearby_spots', {
  lat: 48.04,
  lng: -4.73,
  radius_km: 50,
  species_filter: ['bar', 'lieu_jaune'],
  technique_filter: ['leurres']
});

// Prises visibles par l'utilisateur courant (avec géoloc adaptée)
const { data } = await supabase.from('catches_for_viewer').select('*');

// Spots avec geom adaptée selon abonnement
const { data } = await supabase.from('spots_for_viewer').select('*');
```

---

## 8. Décisions produit verrouillées

### ★ PIVOT ADN — « produit dopamine / compétition » (décision John 2026-06-28)

> **Changement de cap majeur, assumé.** L'ADN « anti-comparaison / anti-dopamine » des sprints 1-48 (zéro leaderboard, gamification 100 % privée) **est ABANDONNÉ**. Nouveau cap : **produit dopamine, compétitif, gamifié à fond**, pensé pour la nouvelle génération « addict » à ces mécaniques.
>
> **Concrètement, c'est désormais autorisé / recherché** : leaderboards (classements par dépt, espèce, saison), XP / niveaux / rangs, streaks et badges **publics** (plus seulement privés), défis compétitifs, événements saisonniers, notifications d'engagement (rang qui bouge, défi qui se termine), records **comparés** entre pêcheurs.
>
> **Ce qui NE change PAS** (garde-fous toujours fermes) : floutage GPS / anti spot-burning (jamais de coordonnée exposée, même dans un classement), RLS, honnêteté des données (pas de chiffre inventé), conformité RGPD. La compétition se fait sur des métriques **sans fuite de spot**.
>
> Les anciennes mentions « zéro leaderboard / gamification anti-comparaison » (lignes historiques §2, Chantier G, mémoire sprint-26) sont **périmées** : ne plus les invoquer comme invariant. Plan d'exécution dopamine : à cadrer en brief dédié.

### Floutage GPS
- **Spots** : utilisateurs **gratuits** voient `geom_public` (jitter recentré **~500-900 m**, migration 028 — plus « 1 km » fixe). **Abonnés** Local/Itinérant voient `geom` précis. Géré par la vue `spots_for_viewer` + RPC gatées au tier (`current_tier`). Verrou colonne : `geom` non lisible par `anon`/`authenticated` (028b/041).
- **Catches** : par défaut **non-amis** voient `geom_public` (jitter **~500-900 m**). **Amis** voient `geom` précis SI `precise_for_friends=true` (default). Le pêcheur peut activer `reveal_precise_to_public` pour partager précisément à tous. Toujours passer par la vue `catches_for_viewer`.

### Onboarding
- **Obligatoire** dès la première connexion. Le frontend doit bloquer l'accès à toutes les routes `(app)/*` tant que `profile.onboarded = false` — redirige vers `/onboarding`.
- **Questions à poser** (6 écrans) :
  1. Pseudo (username) — unique, validé en temps réel
  2. Ville (texte libre) + département principal (select)
  3. Technique(s) principale(s) — multi-select : leurres, surfcasting, flottante, vif
  4. Espèces favorites — multi-select : bar, dorade royale, lieu jaune, maquereau, sar, orphie
  5. Niveau : débutant / intermédiaire / expert
  6. Fréquence de pêche : rare / hebdomadaire / quotidienne / saisonnière + années de pratique
- À la fin, set `profile.onboarded = true` et `onboarded_at = now()`.

### Modération
- **Libre au lancement.** `feed_posts.moderation_status` default `'approved'`.
- On bascule en `'pending'` plus tard quand on aura intégré Claude API pour la modération auto.

### Tarification (verrouillée)

**3 formules claires** (vs. 5 confuses chez Spot de Pêche, 6 paliers chez FishFriender) :

> ⚠️ **Màj 2026-06-11 (décision John, riposte Fishing Grid)** : le **social est passé 100% gratuit** (fil en lecture ET écriture, likes, commentaires, follows — tous tiers, tous départements côtiers). Implémentation = Bloc 0 du sprint 10 (migration 022 + retrait checks tier dans `feed.ts`/`follow.ts` + rate-limit anti-spam + copy tarifs/home). Cf `docs/concurrents/fishing-grid.md` §6C.

**Découverte — gratuit, illimité**
- Carnet de pêche illimité
- Carte BASIQUE : 3 spots populaires/département uniquement, coords floutées 1 km, pas de score, pas de filtre (carte limitée à 1 département)
- Marées + météo (1 ville)
- Guides éditoriaux complets (SEO)
- **Fil régional complet : lecture + écriture + likes/commentaires/follows, tous dépts côtiers**

**Local — 4,90 €/mois ou 49 €/an (-17 %)**
- Carte COMPLÈTE du département : tous les spots, coords précises, score 0-100, filtres espèces/techniques
- Mode hors ligne (carte + marées 7 jours)
- Notifications push (créneaux optimaux, grandes marées)
- Couches avancées (bathymétrie, vent, courants)
- Stats avancées du carnet
- Photos HD illimitées

**Itinérant — 9,90 €/mois ou 99 €/an (-17 %)**
- Tous les départements côtiers FR
- Bathymétrie SHOM premium
- Itinéraires GPS multi-spots
- Accès anticipé nouvelles features
- Support prioritaire

**Essai 7 jours avec CB** sur Local/Itinérant. **Garantie satisfait ou remboursé.**

> ✅ **Stripe opérant depuis le sprint 9** (code-complet) : Checkout + Customer Portal + webhooks, prix TTC `inclusive`, Stripe Tax FR. Le tier est lu via la RPC `current_tier` (source de vérité = webhook Stripe). DOM-TOM bloqués v1.

**Règle d'or implémentation** :
- Ce qui se TOUCHE / se VOIT précisément (coords GPS exactes, score, filtres) → **payant**
- Ce qui est ÉDUCATIF / SOCIAL / produit PAR l'utilisateur (carnet perso, guides, **tout le fil**) → **gratuit**

### Revenus secondaires (post-MVP, à partir de 5 000 abonnés)

À ajouter en backlog roadmap après le sprint 12 :
- **Affiliation matériel** (Decathlon, Pacific Pêche, marques de leurres) — 10-15 % commission
- **Marketplace guides locaux** (sorties initiation 1:1) — 15 % commission
- **B2B fédérations** — licences 500-2 000 €/an
- **Sponsoring marques** sur le fil régional (intégrations éditoriales, jamais bannières)

### Périmètre fonctionnel v1
**IN** : carnet de pêche, carte intelligente, fil régional, marées+météo, guides éditoriaux, profils utilisateurs, follows, formules d'abonnement.

**OUT** : pêche à pied, pêche en bateau, eau douce, modération IA, marketplace équipement, coach IA, app Android (phase 2), réalité augmentée.

---

## 9. Roadmap par sprint

> 🟦 **Mise à jour 2026-07-02 (FAIT FOI) : la roadmap courante est `docs/roadmaps/ROADMAP-POST-AUDIT-2026-07-02.md`** (issue de l'audit `docs/audits/AUDIT-2026-07-02.md` ; toutes les roadmaps, y compris les historiques, sont désormais archivées dans `docs/roadmaps/`). Résumé :
>
> - **S69 « Intégrité des classements »** (anti-farm XP, ledger fait foi, migrations 105/105b) : **livré**. Préalable dur avant de distribuer les codes fondateurs à des inconnus.
> - **S70 « Vérité & bugs express »** (quick wins audit : 157→215, CSP enforce, middleware, hydratation/Sentry, signup PostHog, dette doc) : **EN COURS** (`docs/sprint-70/BRIEF.md`).
> - **S71 « carte » : ANNULÉ** (contre-mesures 02/07, audit §2.2 — desktop et mobile sains ; le numéro reste vacant). Puis **S72 « Alertes par port »** (LA feature de conversion du tier Local, migration 106, brief `docs/sprint-72/BRIEF.md`) → **S73 « Sorties groupées »** (densité sociale + wedge RecFishing, brief `docs/sprint-73/BRIEF.md`).
> - **Lane F — Amorçage (John, dès maintenant)** : minter les codes fondateurs, objectif 4 semaines = 20 fondateurs actifs / 100 prises / 1er classement publié ; curation des 942 spots importés ; funnel `signup_completed` comme tableau de bord.
> - **Gate mobile (S74+)** : S69 livré ✅ + ≥20 fondateurs actifs + alertes S72 en prod + funnel PostHog en place → alors seulement Expo/React Native (`docs/roadmaps/ROADMAP-MOBILE-2026-07-02.md`).
> - **Màj 2026-08-05** : S70, S72 et S73 sont **livrés et en prod** (prod = `c62ce30` ; migrations jusqu'à 107b). Diagnostic activation du 05/08 (SQL live + PostHog) : 9 inscrits en 60 j, **0 revenu après J+1** ; l'onboarding est fini par quasi tous (le point de chute est APRÈS), `emails/welcome.tsx` jamais branché, alertes S72 sans aucun abonné pour les recevoir (0 réglage), codes fondateurs 2/20 utilisés. → **S74 « Première valeur en 60 secondes »** : brief `docs/sprint-74/BRIEF.md` (fini v2 spot favori + créneau, emails lifecycle J+1/J+3/hebdo vendredi, migration 108 `lifecycle_emails`, funnel PostHog). **La phase mobile glisse à S75+**, gate inchangé.
> - **Màj 2026-08-06 — S75 « Le mur gratuit et la fiche qui convertit »** : brief `docs/sprint-75/BRIEF.md`. Analyse GSC 90 j (Supermetrics) : 893 clics / 15 821 impressions / CTR 5,6 %, **82 % mobile**, **92 % du trafic en requêtes anonymisées** (longue traîne). `/spots` 8,4 % et `/peche` 7,3 % de CTR contre **`/especes` 1,7 % pour 36 % des impressions**. Conversion cassée : 94 visiteurs moteurs → 35 paywalls → 1 compte, parce que `MapFilters.tsx:197` traite `anonymous` comme `discovery` (on vend un abonnement à qui n'a pas de compte). S75 = séparer le mur inscription du mur abonnement, refondre les fiches espèces mobile-first, mailler espèces → spots, titles/metas par intention, instrumenter le funnel SEO → compte.
> - **Lane contenu/SEO (2026-08-05)** : la curation des **941 spots importés** (backlog `pending` depuis la migration 072) est **exécutée par Claude lot par lot** : playbook autonome `docs/contenu/curation-spots/PLAYBOOK.md` + état vivant `LOTS.md` (Lot 0 assainissement d'abord : ~94 doublons internes, 33 quasi-doublons du catalogue curé, 28 noms suspects). Backlog SEO ordonné : `docs/roadmaps/LANE-SEO-2026-08-05.md`. **Bug sitemap corrigé le 05/08** (les 941 `pending` étaient déclarés à Google alors que leurs fiches servent du vide → filtre `moderation_status='approved'` ajouté dans `app/sitemap.ts`, à déployer).

> 🗄️ **Notes historiques (périmées, conservées pour la généalogie) :**
>
> 🟥 **La roadmap d'origine (sprints 1→23) est ATTEINTE et DÉPASSÉE.** Le découpage par sprint historique a été retiré d'ici (sprints 1→20 livrés/déployés, cf §2). ~~La roadmap **COURANTE**, issue de l'audit 2026-06-23, s'organise en **chantiers** + **phases** et FAIT FOI dans `docs/ROADMAP-2026-H2.md`~~ → archivée dans `docs/roadmaps/ROADMAP-2026-H2.md`, remplacée par la 🟦 ci-dessus.
>
> 🟩 **Mise à jour 2026-06-26 :** les chantiers **A** (carnet qui parle, S22), **B** (pôle espèces 26, S23/29), **C** (conformité + RecFishing, S24), **D + G2** (lancement/amorçage, S25), **F + G3** (monétisation/gamification, S26) sont **livrés en code et en prod**. Reste : remplir le réservoir (amorçage réel — décision John) + perf carte *(chantier carte fermé depuis : sain, cf §2)*. **La prochaine phase est le MOBILE** — gate web→mobile dans `docs/roadmaps/ROADMAP-PRE-MOBILE-2026-06-26.md` *(gate redéfini depuis dans la roadmap post-audit 02/07)*.

**Chantiers H2 2026 (résumé historique — détail, critères d'acceptation et décisions John dans `docs/roadmaps/ROADMAP-2026-H2.md`)**

- **Chantier 0 — Vérité & Solidité** (socle) : tests catch CRUD + RLS, hygiène pré-lancement (og:image, copy, JSON-LD), DB (index FK, `migration repair`, D-2 `catches_for_viewer`), réécriture doc. ← **C'est le sprint 21 (Phase P1).**
- ★ **Chantier A — « Le carnet qui parle »** : rendre le **scoring perso** RÉEL et visible (le vrai moat ; aujourd'hui le score est un solunar générique).
- ★ **Chantier B — « Pôle Espèces »** : 6 → ~20 espèces + **score par espèce sur la fiche** + maillage croisé.
- ★ **Chantier C — « Conformité & Confiance »** : moteur réglementation FR + RecFishing + IA espèces (Fishial.AI) + **audit/correctif marées** (cf `docs/sprints/sprint-21/marees-med.md`).
- ★ **Chantier D — « Amorçage & Lancement »** : remplir le réservoir (beta « fondateurs », seed honnête ?) + **log de la bredouille** + time-to-value à froid.
- **Chantier E — « Croissance SEO + contenu »** (parallèle) : 5-6 → 20+ guides phares + pages programmatiques deep.
- **Chantier F — « Monétisation »** : faire du scoring perso l'argument de conversion (après A/B).
- ★ **Chantier G — « Communauté vivante & prises vérifiées »** : mesure taille/poids par photo, co-pêchage, gamification compétitive (cf §8 pivot ADN dopamine).

**Séquencement (phases) :** **P1** Socle (sprint 21 = Chantier 0) → **P2** Le moat réel (A puis B) → **P3** Conformité (C + G1) → **P4** Lancement (D + G2) → **P5** Monétisation (F + G3) → puis **Mobile** (Expo iOS/Android, IAP — la PWA fait le pont). Le Chantier **E** (SEO/contenu, lane éditoriale + César) tourne **en parallèle** de P1→P5.

---

## 10. Premier sprint — actions concrètes (à exécuter MAINTENANT)

Quand John dit « vas-y » :

1. **Setup Node + pnpm**
   ```bash
   echo "24" > .nvmrc
   nvm use 24 || true
   corepack enable
   corepack prepare pnpm@latest --activate
   ```

2. **Init Next.js 15**
   ```bash
   pnpm dlx create-next-app@latest . --typescript --tailwind --app --eslint --import-alias "@/*" --use-pnpm --no-src-dir
   ```
   - Garde `app/` au root (pas `src/`)
   - TypeScript : oui
   - Tailwind : oui
   - App Router : oui

3. **Installer les dépendances projet**
   ```bash
   pnpm add @supabase/supabase-js @supabase/ssr
   pnpm add zod react-hook-form @hookform/resolvers
   pnpm add maplibre-gl @types/maplibre-gl
   pnpm add date-fns
   pnpm add lucide-react
   pnpm add -D @types/node
   ```

4. **Initialiser shadcn/ui**
   ```bash
   pnpm dlx shadcn@latest init -d
   pnpm dlx shadcn@latest add button input label form card dialog dropdown-menu avatar select toggle separator sonner
   ```

5. **Créer la structure de fichiers** (cf. section 6)
   - `lib/supabase/client.ts`
   - `lib/supabase/server.ts`
   - `lib/supabase/middleware.ts`
   - `middleware.ts` (à la racine)
   - `lib/env.ts` (validation zod des env vars)
   - `lib/types.ts` (placeholder pour les types Database)

6. **Setup auth**
   - Routes `(auth)/login`, `(auth)/register`, `(auth)/callback`
   - Utiliser `@supabase/ssr` (pas la lib client-only)
   - Activer dans Supabase Dashboard : Email + Google OAuth (à configurer plus tard) + Apple OAuth (plus tard)

7. **Page d'accueil**
   - Reprendre le hero de `docs/maquette/index.html`
   - Tailwind + composants shadcn pour les CTAs
   - Mobile-first responsive

8. **Configurer Vercel**
   - Confirmer que les env vars sont bien settées
   - Premier `git push` → Vercel auto-deploy
   - URL preview : `carnet-de-peche.vercel.app`

9. **Appliquer les migrations SQL**
   - Soit via Supabase Studio SQL Editor (copier-coller chaque fichier)
   - Soit via `supabase link` + `supabase db push`

10. **Générer les types TypeScript depuis Supabase**
    ```bash
    pnpm dlx supabase gen types typescript --project-id glgciwwnpmgifyhbvxsw > lib/types.ts
    ```
    (à refaire après chaque migration)

---

## 11. Règles à toujours respecter

1. **Ne JAMAIS commit `.env.local`** — vérifier `.gitignore` avant chaque push.
2. **Ne JAMAIS partager le `SUPABASE_SERVICE_ROLE_KEY`** — il n'est utilisé que côté serveur dans des Edge Functions, jamais dans le frontend.
3. **Ne JAMAIS désactiver RLS** sur une table. Si tu ajoutes une table, RLS d'abord, puis policies.
4. **Toujours valider les inputs** côté serveur avec zod, jamais faire confiance au frontend.
5. **Toujours utiliser les helpers Supabase server-side** pour les vraies données sensibles. Le client browser est OK pour les opérations utilisateur.
6. **Toujours utiliser la vue `catches_for_viewer`** pour afficher les catches (jamais directement la table) — sinon tu risques de leaker des geom précis.
7. **Toujours générer un fichier de migration séparé** pour chaque changement de schéma. Ne modifie pas les anciens fichiers `001_*`, `002_*`, etc.
8. **Tutoyer l'utilisateur partout** dans l'UI. Pas de "vous".
9. **Photos uploadées** : toujours redimensionner côté client avant upload (max 1920px largeur). Toujours stocker dans `storage/catches/<user_id>/<catch_id>.webp`.
10. **Performance** : utiliser le mode `dynamic = 'force-static'` ou `revalidate` sur les pages publiques (accueil, guides), `force-dynamic` uniquement sur les pages utilisateur.

---

## 12. Où trouver quoi

| Tu cherches… | C'est ici |
|---|---|
| Le brief produit complet | `docs/BRIEF.md` |
| La checklist setup comptes | `docs/SETUP-CHECKLIST.md` |
| La répartition John / César | `docs/ROLES.md` |
| Les maquettes design | `docs/maquette/*.html` + `docs/maquette/assets/style.css` |
| Le schéma SQL Supabase | `supabase/migrations/*.sql` |
| La doc BDD détaillée | `supabase/README.md` |
| Les seed data (10 spots Bretagne) | `supabase/seed.sql` |
| Les credentials | `.env.local` (NON committé) |
| Les types TS Database | `lib/types.ts` (à régénérer après chaque migration) |

Les **rapports stratégiques en Word** (analyse concurrentielle, plan de dev) ne sont **pas** dans le repo — John les garde sur son Drive personnel.

Le **brief César** et le **playbook Rôle B** ne sont **pas** dans le repo — ils sont chez César.

---

## 13. Workflow Git

- **Branche principale** : `main`
- **Pas de PR au départ** (un seul dev, John) — commits directs sur `main` OK
- **Conventional commits** : `feat:`, `fix:`, `chore:`, `docs:`, `refactor:`, `style:`
- **Push** : seulement quand John dit « push » ou « commit + push »
- **Format des messages** : courts, en français OK

Exemple : `feat: ajoute la page d'onboarding avec les 6 étapes`

---

## 14. Workflow Supabase

- **Migrations** : 1 fichier par changement, numéroté (`005_*.sql`, `006_*.sql`...). Ne pas éditer les anciens.
- **Local dev** : possible avec `supabase start` (Docker), mais on peut aussi développer directement contre le projet cloud en dev.
- **Génération de types** : à refaire après chaque migration → `pnpm dlx supabase gen types typescript --project-id glgciwwnpmgifyhbvxsw > lib/types.ts`
- **Edge Functions** (plus tard) : dans `supabase/functions/<nom>/index.ts`. Déploiement via `supabase functions deploy <nom>`.

---

## 15. À ne pas faire

- ❌ Ajouter une feature qui n'est pas dans la roadmap sans en parler à John.
- ❌ Changer la stack (passer de Tailwind à autre chose, etc.).
- ❌ Toucher au schéma SQL existant sans créer un nouveau fichier de migration.
- ❌ Commit des secrets (clés API, mots de passe).
- ❌ Push sans validation de John.
- ❌ Implémenter de la pêche à pied, pêche en bateau, eau douce, ou bathymétrie SHOM API en v1.
- ❌ Donner une date de lancement publique précise dans le code (UI, emails, etc.).

---

## 16. Comment parler à John

- John n'est **pas développeur de métier** — explique en termes accessibles quand il y a un concept tech.
- Il est intelligent et apprend vite — ne sois pas condescendant.
- Pose 1-2 questions max avant d'exécuter. Si tu peux trancher seul intelligemment, tranche.
- Quand tu finis un livrable, montre : « Voilà ce que j'ai fait, comment tester, ce qui reste. »
- Si tu détectes une décision produit ambiguë, demande avant de coder.

---

## 17. Aide en cas de blocage

Si tu bloques sur une décision produit, ouvre un issue GitHub ou note-la dans `docs/QUESTIONS.md` (à créer). John y répondra entre deux sessions.

Si tu bloques sur une erreur technique :
1. Lis le message d'erreur en entier
2. Vérifie les versions des packages
3. Cherche dans la doc Supabase / Next.js / shadcn
4. Si vraiment coincé, explique le problème à John et propose 2-3 pistes

---

## 18. Ressources externes utiles

- **Next.js 15 App Router** : <https://nextjs.org/docs/app>
- **Supabase + Next.js** : <https://supabase.com/docs/guides/auth/server-side/nextjs>
- **shadcn/ui** : <https://ui.shadcn.com>
- **Tailwind v4** : <https://tailwindcss.com/docs/v4-beta>
- **MapLibre GL JS** : <https://maplibre.org/maplibre-gl-js/docs/>
- **Open-Meteo Marine API** : <https://open-meteo.com/en/docs/marine-weather-api>
- **PostGIS** : <https://postgis.net/docs/>
- **Stripe Subscriptions** : <https://docs.stripe.com/billing/subscriptions/overview>

---

## 19. Mode d'exécution Fable (décision John 2026-06-11)

À partir du sprint 10, John lance les sessions de dev avec **Claude Fable** en mode effort maximal. Règles :

- **Mots-clés d'invocation** : John inclut `ultracode` (active l'orchestration multi-agents / workflows) et demande l'effort `xhigh` dans son message de lancement. Ces mots-clés agissent **par message** — ils doivent figurer dans le prompt de John, pas seulement dans un fichier. Si le message contient `ultracode`, découpe le travail en workstreams parallèles confiés à des agents (exploration, implémentation par bloc, QA), au lieu de tout faire séquentiellement.
- **Briefs de sprint** : tout nouveau brief doit être écrit pour exploiter ce mode. Suivre `docs/BRIEF-TEMPLATE.md` : ligne de lancement prête à copier-coller (avec les mots-clés), blocs découpés en workstreams avec dépendances explicites (ce qui est parallélisable doit l'être), critères d'acceptation vérifiables par un agent, et un workstream final de vérification dédié (tests + build + revue croisée par un agent indépendant).
- **Vérification systématique** : chaque sprint exécuté dans ce mode se termine par un agent de vérification (suite Vitest verte, build OK, relecture des critères d'acceptation du brief). Pas de « code-complet » déclaré sans cette passe.
- **Docker (optionnel — décision John 2026-06-21)** : John a Docker en local. À utiliser **seulement si nécessaire** (jouer une migration sensible en local avant la prod, reproduire un bug dur), **pas un passage obligé**. `supabase start` lance le stack Supabase local.
- **Posture d'exécution (exigence John 2026-06-21)** : effort maximal + **très attentif et critique**. Le brief est un guide, pas une vérité — vérifier chaque hypothèse contre le vrai code, **remettre en cause le brief** s'il se trompe, faire une passe adversariale anti-régression (gating de tier, floutage GPS, RLS, perf, SEO), et préférer `⚠️ DEMANDER À JOHN` à l'invention. Rappelé dans chaque brief (cf `docs/BRIEF-TEMPLATE.md`).

---

## 20. Connecteurs MCP & usage systématique (le « plein potentiel »)

> Mis en place le 2026-06-22 (décision John : brancher large, gourmand assumé, mais usage discipliné). Tout le dispositif est **versionné dans le repo** (`.mcp.json`, `.claude/`).

**Philosophie.** Trois couches distinctes, ne pas les confondre :
- **superpowers = la méthode** (comment on bosse : clarify → design → plan → code → verify, TDD, debug, code review). On ne la duplique pas.
- **Les connecteurs = la portée** (ce que Claude peut toucher : la vraie base, les vrais logs, la doc à jour).
- **Cette section = le protocole** (quand dégainer quoi). C'est ça qui rend l'usage *systématique*.

**Note honnête sur le « gourmand ».** Sur MCP, brancher beaucoup coûte du contexte en permanence — celui-là même dont Claude a besoin pour raisonner sur le code. On assume le choix de tout brancher, MAIS on garde deux garde-fous : (1) on **isole les appels connecteurs dans des sous-agents** (le gros des tool-calls se fait dans LEUR contexte, le principal reste propre) ; (2) en session pur front, on **coupe les serveurs inutiles** via `/mcp`.

### 20.1 Deux surfaces — ne pas confondre

| Surface | Où | Connecteurs |
|---|---|---|
| **DEV** (ce repo, via `.mcp.json`) | Claude Code | `supabase` (read-only), `vercel`, `sentry`, `github`, `context7`, `stripe` (read-only), `microsoft-learn` + plugins projet : **superpowers** (méthode), **playwright** (E2E/QA) |
| **CONTENU** (hors repo) | Cowork / app desktop | Canva, ElevenLabs, HeyGen, Gmail, Agenda, Drive — pour le marketing & le skill `video-courte-peche` (côté César). **PAS pour coder.** Ne pas les attendre dans Claude Code. |

### 20.2 Protocole — quel connecteur, quand (réflexes systématiques)

| Moment | Connecteur → sous-agent | Réflexe |
|---|---|---|
| **Avant de coder contre une lib externe** (Next 15, @supabase/ssr, Tailwind v4, MapLibre, suncalc, Stripe SDK, zod…) | `context7` → **docs-researcher** | Doc version-correcte d'abord. Évite le bug « API périmée » (cf. finding Stripe 22.x du sprint 9). |
| **Schéma / migration / RLS / perf / types** | `supabase` (RO) → **supabase-guard** | Inspecter en lecture AVANT (`list_tables`, `get_advisors`, `get_logs`). Migration = fichier numéroté + CLI. Regen `lib/types.ts`. |
| **Mesurer le volume d'inscriptions** | `supabase` (RO), jamais PostHog | Le nombre d'inscrits se lit dans `auth.users`, pas dans PostHog : écart mesuré de **40 %** le 17/08 (sprint 85, 47 comptes réels contre 28 vus par PostHog — PostHog ne voit que les visiteurs consentants). PostHog reste fiable pour les **taux** et les comportements (le biais de consentement touche numérateur et dénominateur, il se compense). Rejouer `pnpm reconcile:signups -- --posthog <n>` à chaque sprint de conversion. |
| **Après un déploiement / bug prod** | `vercel` + `sentry` → **deploy-watch** | Corréler build/runtime logs + issues Sentry + advisors Supabase → cause racine. |
| **QA d'un écran live ou preview** | Claude in Chrome + `playwright` → **qa-chrome** | Captures desk+mobile, console, réseau, passe anti-régression (GPS, gating, perf, SEO). |
| **PR / issues / branches / historique** | `github` | Contexte repo sans quitter Claude Code. |
| **Inspecter Stripe** (customers, subs, prix en test) | `stripe` (RO) | Lecture seule sur un compte LIVE — jamais d'écriture. |
| **Doc Microsoft / Azure** | `microsoft-learn` | Rare ici, mais branché. |

### 20.3 Où ça se branche dans la méthode superpowers

- **design** → lance **docs-researcher** (context7) pour verrouiller les signatures d'API.
- **code** → **supabase-guard** en lecture pendant tout changement DB.
- **verify** → la commande **`/verif-sprint`** (tests + build + lint + types + revue croisée indépendante + passe anti-régression), puis **deploy-watch** et **qa-chrome** si pertinent. Pas de « code-complet » sans cette passe (§19).

### 20.4 Sécurité des connecteurs (aligne §11)

- `stripe` est en **read-only**. **`supabase` est passé en WRITE** dans `.mcp.json` (`read_only=false`, décision John 2026-06-23) → Claude peut appliquer les migrations directement via `apply_migration`. La discipline tient malgré tout : **toute migration s'écrit d'abord en fichier numéroté** (`supabase/migrations/NNN_*.sql`), puis on l'applique ; **jamais de SQL destructif en prod sans confirmer avec John d'abord** ; après application, regénérer `lib/types.ts`. Le connecteur ne prend le mode write qu'après **reconnexion** (`/mcp` → supabase → reconnect, ou redémarrage).
- **Zéro secret dans `.mcp.json`** : OAuth navigateur (`supabase`/`vercel`/`sentry`/`stripe` au 1er appel) ou `${ENV}` (`github`, `stripe`). Les tokens vivent dans l'env Windows (`setx`), jamais commités.
- **Hooks** (`.claude/settings.json`) : `guard-git` **bloque** tout commit de secret (`.env*`, clés) et **demande confirmation** avant un `git push` (§13) ; `lint-changed` relance ESLint sur chaque fichier TS modifié.

### 20.5 Setup one-time (à faire par John)

```powershell
setx GITHUB_PAT "github_pat_xxx"     # fine-grained, repo Seychi/Carnet-de-peche : contents RO + issues + PR
setx STRIPE_MCP_KEY "rk_live_xxx"    # clé Stripe RESTREINTE read-only (pas STRIPE_SECRET_KEY)
# setx CONTEXT7_API_KEY "xxx"        # optionnel (rate-limit). Context7 marche sans.
```
Puis : relancer le terminal + Claude Code → `/mcp` (déclenche les OAuth supabase/vercel/sentry/stripe) → vérifier avec `claude mcp list`.

### 20.6 Garder la tête claire même « à fond »

- `/mcp` pour activer/couper un serveur **par session**. Session pur front (Tailwind/React) → coupe `supabase`/`stripe`/`sentry`, garde `context7`.
- Les sous-agents existent pour ça : ils encaissent les gros tool-calls, le contexte principal reste pour le code.

### 20.7 Les fichiers du dispositif

`.mcp.json` (serveurs) · `.claude/settings.json` (hooks + plugins + permissions) · `.claude/hooks/*.mjs` (Node, cross-platform Windows) · `.claude/agents/` (docs-researcher, supabase-guard, qa-chrome, deploy-watch) · `.claude/commands/verif-sprint.md`. **`.claude/` est désormais versionné** (seul `settings.local.json` reste local).

---

*Dernière mise à jour : 2026-07-02 (resync sprint 70 Bloc F, post-audit transverse `docs/audits/AUDIT-2026-07-02.md` : §2 état réel = sprints 59→69 « pivot dopamine » livrés et en prod (XP/rangs, records, badges publics, défis, classements k-anon opt-in, saisons, codes fondateurs comp, intégrité XP 105/105b), S70 en cours sur `sprint-70`, **S71 « carte » ANNULÉ** (carte vérifiée saine, numéro vacant), métriques 108 migrations `001`→`105b` / 695+ tests / 26 espèces / 1 158 spots dont 215 curés ; §7 compte migrations corrigé ; §9 roadmap courante = `docs/roadmaps/ROADMAP-POST-AUDIT-2026-07-02.md` (S70 → S72 alertes par port → S73 sorties groupées → mobile S74+ sous gate), anciennes notes marquées historiques ; réorg docs : anciens sprints → `docs/sprints/`, roadmaps → `docs/roadmaps/`). Précédent : 2026-06-26 (resync post-audit transverse `docs/audits/AUDIT-2026-06-26.md` : §2 état réel ~sprint 34 — refonte home + sprints 22→33 en prod, métriques 58 migrations / ~540 tests / 26 espèces ; §4 stack mobile/monorepo « non démarré » + versions réelles React 19 / zod v4 / Next 15.5 / Stripe 22 / Sentry 10 / MapLibre 5 ; §7 `current_tier` remplace `has_active_subscription`, 58 fichiers ; §8 floutage ~500-900 m + verrou colonne ; §9 chantiers A-G livrés, prochaine phase = mobile, gate `docs/ROADMAP-PRE-MOBILE-2026-06-26.md`. Bugs ouverts = Sprint 35 `docs/sprint-35/BRIEF.md`). Précédent : 2026-06-22 (§20 ajouté : connecteurs MCP & usage systématique — dev pack supabase/vercel/sentry/github/context7/stripe, sous-agents connecteurs, hooks guard-git/lint, commande /verif-sprint ; `.claude/` versionné). Précédent : 2026-06-21 (§19 enrichi : Docker optionnel + posture effort max/esprit critique ; track Excellence UX+social = briefs sprints 12-15 + 12.5 rédigés, cf `docs/excellence/ROADMAP.md` ; sprint 11.5 — sécurité GPS, lint, SEO, tests, perf). À tenir à jour à chaque décision majeure.*

**Maintenant, attends que John te dise « vas-y » et exécute la section 10 dans l'ordre.**
