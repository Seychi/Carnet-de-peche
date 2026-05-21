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
- **Espèces ciblées** : bar, dorade royale, lieu jaune, maquereau, sar, orphie.
- **Géographie** : France métropolitaine (Atlantique, Manche, Méditerranée).
- **Concurrent direct #1** : [spot-de-peche.com](https://spot-de-peche.com) — **sérieux, à ne pas sous-estimer**. Carte interactive avec heatmap de qualité, fiche spot complète (courbe de marée 24h avec curseur "maintenant", météo détaillée : vent + direction, temp air + eau, vagues + houle + période, précipitations + probabilité, pression, nébulosité), section "Meilleurs moments" avec scoring solunar (lever/coucher de lune, lever/coucher de soleil, justifications astronomiques par créneau), explorer en cascade (dépt → technique → espèce → spot), bouton itinéraire GPS. Forces = exhaustivité des données environnementales + UX maps soignée + couverture multi-techniques (pêche à pied + canne + leurre). Faiblesses = pas de carnet personnel, pas de fil social, scoring 100% générique (modèles océanographiques + solunar standard, identique pour tous), pas d'app mobile native, pas de personnalisation. **Notre angle vs eux** = carnet personnel + scoring qui apprend de TES catches + signal communautaire ("3 prises ici aujourd'hui") + app mobile native iOS/Android. Implication concrète : on ne peut PAS sortir une carte squelettique face à eux — les données environnementales (marées + météo + vagues) sont des table stakes, pas un différenciateur. C'est fusionné dans le sprint 4.
- **Concurrent direct #2** : [FishFriender](https://www.fishfriender.com/) — 4,7/5 sur 3 200 avis, lancé 2016, généraliste toutes pêches, 12 langues. Force = boîte de pêche numérique (130k produits scannables). Faiblesses = carte 100% paywall, pas spécialisé FR, pas de fil régional. Notre angle = hyper-spécialisation canne du bord en mer FR + carte basique gratuite + fil régional par département.
- **Différenciateur principal défendable** : le **carnet personnel comme moat**. Les concurrents donnent les MÊMES infos environnementales à tout le monde (météo générique, marées astronomiques, solunar standard). Nous, on overlay TES patterns historiques par-dessus ces données : "Tu pêches mieux en marée descendante coef > 80, le matin, après 3 jours sans pluie". Cette personnalisation est impossible sans carnet utilisateur. Long terme, plus l'utilisateur log de prises, plus le produit devient irremplaçable pour LUI spécifiquement — c'est notre vrai lock-in.

---

## 2. État actuel du projet (à jour 2026-05-21, sprint 9 code-complet — branche `sprint-9`)

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
  - **Reporté en backlog** (`docs/ROADMAP.md`) : bloc C (lint ~360 apostrophes `react/no-unescaped-entities` + retrait `eslint.ignoreDuringBuilds`), date-picker FR custom (E3), domiciliation commerciale + médiateur conso
- **Sprint 8** (Fil communautaire — pivot social, sur branche `sprint-8`, **pas encore mergé/déployé**) :
  - Audit RLS complet (`docs/sprint-8/rls-audit.md`) → a trouvé 2 trous non prévus (lecture anonyme du fil + graphe social via clé publishable) corrigés en migration 017 (RLS-FIX-04/05)
  - Migrations **017→020 appliquées en prod** : tier gating (`can_post_in_department`), vue `feed_posts_for_viewer`, RPC `get_spot_activity` + `get_feed_unread_counts`, `reports.details`, Realtime (publication + replica identity)
  - Server Actions `app/actions/feed.ts` (createPost/toggleLike/addComment/deletePost/deleteComment/reportPost/getComments/getFeedPage) + `follow.ts` — **183 tests Vitest verts**
  - Hooks Realtime, 6 composants `components/feed/`, routes `/fil`·`/fil/[dept]`·`/u/[username]`·`/follows`, signal social fiche spot, seed dev `/dev/seed-feed`
  - **Reste avant merge** : QA manuelle (`docs/sprint-8/qa-checklist.md`), tests Realtime/tier cross-onglets, captures composer, puis merge `sprint-8` → `main` + déploiement. RLS-FIX-06 (geom catch en accès direct) → backlog. Voir `docs/sprint-8/RECAP.md`.

ℹ️ **Sprint 8 mergé** : `main` == `sprint-8` (commit `0bcb0cf`) → le fil communautaire est sur `main`.

✅ **Sprint 9 — Paiements (Stripe) — CODE-COMPLET (branche `sprint-9`, pas encore mergé/déployé)**
Stripe Checkout + Customer Portal + webhooks idempotents + essai 7j avec CB + Stripe Tax FR + gating réel des tiers via RPC `current_tier` (remplace les inserts manuels / seed dev). Migration 021 appliquée en prod. **215 tests verts, build OK.** Flow Checkout validé en mode test le 2026-05-21.
- **Reste avant merge** (manuel John) : QA `docs/sprint-9/qa-checklist.md` + captures écran, vars **LIVE** dans Vercel + endpoint webhook prod, arbitrer 2 comptes seed payés sans Stripe (cf `supabase/README.md` § anti-traîne). Voir `docs/sprint-9/RECAP.md`.
- **Finding API** : SDK Stripe 22.x / API `2026-04-22.dahlia` → `current_period_*` sur les SubscriptionItem, `Invoice` → `parent.subscription_details.subscription`.

🔜 **SUITE — Sprint 10 : Guides éditoriaux** (MDX + 20 guides + SEO programmatique).

🔜 **Suite (sprints 10 → 23 + phase 2)**
Voir `docs/ROADMAP.md` pour le découpage complet (Stripe → Guides → Beta → Mobile → Lancement → Phase 2). Résumé section 9 plus bas dans ce fichier.

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
| **Mobile** | React Native + Expo SDK 51 + Expo Router | À implémenter Sprint 13+, code partagé avec web |
| **Backend / DB / Auth** | Supabase (PostgreSQL 15+ avec PostGIS + RLS + Auth + Storage + Edge Functions + Realtime) | Région eu-west-3 (Paris) |
| **Cartographie** | MapLibre GL JS (web) + Native (mobile) + tuiles MapTiler | Free tier suffit jusqu'à 100k tiles/mois |
| **Marées + météo + vent + houle** | **Open-Meteo Marine** (gratuit, sans clé API) | Pas de SHOM en v1. Migration possible plus tard. |
| **Bathymétrie** | GEBCO + SHOM Geoservices (open data, sans convention) | Conversion en MBTiles |
| **Paiements** | Stripe Subscriptions (web) + Apple IAP (iOS plus tard) | Mode test à utiliser pour le dev |
| **Push notifications** | Expo Notifications | Mobile uniquement |
| **Email** | Resend + React Email | 3 000 mails/mois gratuits |
| **Modération (plus tard)** | Claude API (Haiku + Vision) | Pas en v1, modération libre au lancement |
| **Analytics** | Plausible (web) + PostHog (produit) | À setup Sprint 4 |
| **Monitoring** | Sentry | À setup Sprint 6 |
| **Monorepo** | Turborepo + pnpm | Préparation phase mobile |
| **CI/CD** | GitHub Actions + Vercel + EAS Build (mobile) | Vercel auto-deploy déjà branché |

**Versions précises au lancement**
- Node 20+ (utiliser `nvm use 20` ou `.nvmrc`)
- pnpm 9+
- TypeScript 5.5+
- Next.js 15.0+ (App Router obligatoire, pas pages router)
- Tailwind v4 (utiliser le nouveau setup CSS-first)
- @supabase/ssr (pas @supabase/auth-helpers, déprécié)

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
├── .nvmrc                             ← Node 20
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

### Style UI

Charte définie dans la maquette HTML (`docs/maquette/assets/style.css`) :

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
- **`spots`** : spots de pêche. `geom` = précis, `geom_public` = flouté **1 km** (généré par trigger). Visibilité `public` / `subscriber` / `private`.
- **`catches`** : **LE CARNET — cœur du produit**. Chaque prise loguée. `conditions` jsonb contient le snapshot Open-Meteo. Privacy `private` / `friends` / `public`. Deux booleans `precise_for_friends` (default true) et `reveal_precise_to_public` (default false).
- **`feed_posts`** : mur communautaire. `moderation_status` default `approved` (modération libre au lancement).
- **`subscriptions`** : source de vérité = Stripe webhook. Plans `discovery` / `local` / `itinerant`.

### Helpers SQL utiles (à utiliser depuis le frontend)

```ts
// Vérifier abonnement actif
const { data } = await supabase.rpc('has_active_subscription', { uid: user.id });

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

### Floutage GPS
- **Spots** : utilisateurs **gratuits** voient `geom_public` (rayon 1 km flouté). **Abonnés** Local/Itinérant voient `geom` précis. Géré par la vue `spots_for_viewer`.
- **Catches** : par défaut **non-amis** voient `geom_public` (jitter ~1 km). **Amis** voient `geom` précis SI `precise_for_friends=true` (default). Le pêcheur peut activer `reveal_precise_to_public` pour partager précisément à tous.

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

**Découverte — gratuit, illimité**
- Carnet de pêche illimité
- Carte BASIQUE : 3 spots populaires/département uniquement, coords floutées 1 km, pas de score, pas de filtre
- Marées + météo (1 ville)
- Guides éditoriaux complets (SEO)
- Fil régional EN LECTURE SEULE
- 1 département uniquement

**Local — 4,90 €/mois ou 49 €/an (-17 %)**
- Carte COMPLÈTE du département : tous les spots, coords précises, score 0-100, filtres espèces/techniques
- Mode hors ligne (carte + marées 7 jours)
- Notifications push (créneaux optimaux, grandes marées)
- Couches avancées (bathymétrie, vent, courants)
- Fil régional en ÉCRITURE + interactions sociales (likes, commentaires, follows)
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
- Ce qui est ÉDUCATIF / SOCIAL / produit PAR l'utilisateur (carnet perso, guides, lecture fil) → **gratuit**

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

Chaque sprint = 2 semaines. **Roadmap révisée mai 2026 après analyse concurrentielle approfondie** : spot-de-peche.com est plus fort que prévu (cf. section 1), donc fusion des ex-sprints 5+6+7 dans le sprint 4 pour ne pas paraître squelettique au lancement. Le scoring (ex-sprint 8) reste séparé mais avec un angle "personnalisé" qui devient le vrai différenciateur. La numérotation décale de 3 sprints à partir de l'ex-sprint 9.

| Sprint | Période | Livrable |
|---|---|---|
| **1-2** | S1-S2 | **Foundations** ✅ : Next.js + Supabase + auth + page d'accueil + onboarding + design system |
| **3** | S3 | **Carnet de pêche** ✅ : CRUD prises, photo upload Storage, conditions auto-loggées, page profil + stats |
| **3.5** | — | **Polish hors sprint** ✅ : bug fix form carnet (reset champs au changement de technique), flèche retour mobile, refonte auth (email/password + Google OAuth, magic link en option) |
| **4** | S4-S5 | **Carte + spots + données environnementales** (gros sprint, ~3 semaines, fusion ex-5/6/7) : MapLibre intégré, freemium gating (3 spots/dépt vs tout), filtres espèces/techniques/dépt, fiches spots avec marées 24h + météo complète + vagues/houle (Open-Meteo Marine), RPC nearby_spots, SEO programmatique (sitemap, JSON-LD), mobile UX polish |
| **6** | S6 | **"Meilleurs moments" solunar** : library suncalc, calcul des fenêtres optimales par jour/spot (lever/coucher lune + marée + vent), calendrier 7 jours par spot, badges qualitatifs (Faible/Bonne/Très Bonne/Exceptionnelle) avec justifications astronomiques. Match au minimum la feature équivalente de spot-de-peche. |
| **7** | S7 | **Scoring personnalisé** (notre vrai différenciateur) : overlay sur les conditions = "Tu pêches mieux quand…" basé sur l'historique des catches du user. Algorithme côté Edge Function. Affiché sur fiche spot + sur la carte sous forme de "ton score" en plus du "score global". |
| **8** | S8 | **Fil communautaire** : feed_posts, Realtime, profils sociaux, follows + signal social local ("X prises ici aujourd'hui à Y heure") qui exploite le carnet pour créer de la valeur communautaire. |
| **9** | S9 | **Paiements** : Stripe Checkout + Customer Portal + webhooks + essai 7j + gating réel des tiers Local/Itinérant (remplace les inserts DB manuels du sprint 4). |
| **10** | S10 | **Guides éditoriaux** : MDX + 20 guides phares + SEO programmatique (espèces × départements × techniques). |
| **11** | S11 | **Polish + Beta privée** : emails transactionnels (Resend), optimisations perf, monitoring Sentry, 50 testeurs invités. |
| **12-19** | S12-S19 | **Mobile iOS/Android** : Expo + mode hors ligne (carte + marées 7 jours) + push notifications (créneaux optimaux, grandes marées) + IAP Apple. |
| **20-23** | S20-S23 | **Lancement public** : App Store + Play Store + campagne acquisition (organique + partenariats fédérations + presse pêche). |

---

## 10. Premier sprint — actions concrètes (à exécuter MAINTENANT)

Quand John dit « vas-y » :

1. **Setup Node + pnpm**
   ```bash
   echo "20" > .nvmrc
   nvm use 20 || true
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

*Dernière mise à jour : mai 2026, par Claude (web) avant le sprint 1. À tenir à jour à chaque décision majeure.*

**Maintenant, attends que John te dise « vas-y » et exécute la section 10 dans l'ordre.**
