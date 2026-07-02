# Sprint 70 — Brief d'exécution
## « Vérité & bugs express » : les 🟠/🟡 de l'audit, en passes parallèles

> Rédigé le 2026-07-02. Durée cible : 1 session Fable.
> Contexte : `docs/audits/AUDIT-2026-07-02.md` §3/§4/§7 (version corrigée du 02/07 au soir) · `docs/roadmaps/ROADMAP-POST-AUDIT-2026-07-02.md` Phase B.
> **Màj 02/07 au soir : le S71 « carte » est ANNULÉ** (contre-mesures : desktop sain + mobile testé sain sur appareil réel, audit §2.2) → **ce sprint tourne SEUL**, sur `main` post-S69, et récupère le reliquat bathy (Bloc D). Les règles dures du protocole ci-dessous restent valables pour ce sprint : **zéro migration, `lib/types.ts` intact, `package.json` gelé**.

---

## ⚠️ Protocole parallèle S70 ∥ S71 (CADUC — conservé pour référence si deux sprints repartent un jour en parallèle)

| Règle | S70 (ce brief) | S71 |
|---|---|---|
| Branche (depuis `main` post-S69) | `sprint-70` | `sprint-71` |
| Migrations | **ZÉRO** (interdit) | 106 réservée (si RPC allégée) |
| `lib/types.ts` | **ne pas régénérer** | régénéré si 106 |
| `package.json` / lockfile | gelé (aucune dépendance) | gelé (aucune dépendance) |
| Territoire | marketing home, tarifs, `middleware.ts`, `next.config.ts`, OG, profil, carnet (filtre), modération (UI), `content/guides/*.mdx`, crons `personal-window`, analytics, `.env.example`, `CLAUDE.md`, `docs/` | `app/(map)/**`, `components/map/**`, `components/spots/**`, `lib/` côté carte, migration 106 |
| Fichier du territoire adverse nécessaire ? | **NE PAS TOUCHER** → noter `HANDOFF S71` dans le RECAP | idem → `HANDOFF S70` |
| Merge | John merge le premier sprint fini ; le second **rebase sur `main`** avant sa VERIF finale. Après le 2e merge : passe d'intégration (tests + build + QA fumée). | idem |

**Préalable avant de démarrer (manuel John)** : S69 mergé + déployé ; dans le dashboard Vercel, vérifier le **WAF/Attack Challenge Mode** (503 intermittents sur les prefetches RSC + `/.well-known/vercel/jwe`, audit §3.2 — risque crawlers/SEO, et suspect n°1 de la fausse mesure perf carte). C'est un réglage dashboard, pas du code.

---

## 🚀 Ligne de lancement (à copier-coller par John, session dédiée)

> ultracode — effort xhigh. Exécute `docs/sprint-70/BRIEF.md` sur la branche `sprint-70`. Règles dures : zéro migration, `lib/types.ts` intact, package.json gelé. Lance les blocs A/B/C/D/E/F en parallèle dès maintenant, termine par le workstream VERIF. Ne push pas.

---

## 🧠 Connecteurs & sous-agents (cf `CLAUDE.md` §20)

| Quand | Sous-agent → connecteur | Pourquoi |
|---|---|---|
| Bloc B (bugs) | **deploy-watch** → Sentry | Lire les issues réelles (breadcrumbs, stacks) AVANT de fixer. |
| Bloc C (CSP) | **qa-chrome** | 0 violation console sur les pages clés avant de passer enforce. |
| Bloc E (analytics) | PostHog MCP | Vérifier que `signup_completed` arrive en live. |
| Avant tout code Next touché | **docs-researcher** → Context7 | Headers/metadata Next 15.5 à jour. |
| Clôture | **`/verif-sprint`** puis **deploy-watch** | Standard. |

## Objectif du sprint en une phrase

Zéro 🟠 de l'audit §3 encore ouvert côté code : chiffres honnêtes partout, console prod muette (hydratation, Sentry), CSP en enforce, signup mesurable, doc à jour — sans toucher un seul fichier du territoire carte (S71).

## Workstreams & dépendances

| WS | Bloc | Durée | Dépend de | Parallélisable jour 1 |
|----|------|-------|-----------|----------------------|
| A | Chiffres honnêtes | 0,25 j | — | ✅ |
| B | Hydratation & Sentry | 0,5 j | — | ✅ |
| C | Plateforme (CSP, middleware, OG) | 0,5 j | — | ✅ |
| D | Petit UX | 0,5 j | — | ✅ |
| E | Hygiène & mesure | 0,5 j | — | ✅ |
| F | Dette documentaire | 0,25 j | — | ✅ |
| VERIF | revue finale | 0,5 j | tous | ❌ (en dernier) |

---

## Bloc A — Chiffres honnêtes (157 → réalité)

En DB : **215 spots curés** (vérifié 02/07, `select source, count(*) from spots group by source`). Le hero lit déjà le compte live ; 5 copies statiques disent encore « 157 ».

### Tâches
1. Créer UNE constante partagée (ex. `lib/marketing/stats.ts`) : `SPOTS_CURATED_FLOOR = 200` + libellé « 200+ spots curés » pour toute copy statique (honnête et stable : on ne re-périmera pas à chaque lot de curation).
2. Remplacer les « 157 » : `app/(marketing)/page.tsx:18` (meta description), `components/marketing/home-v3/Hero.tsx:254` (fallback), `HomeSections.tsx:76` (fallback), `HomeMapSection.tsx:66`, `app/(marketing)/tarifs/page.tsx:87` (FAQ). Les fallbacks de compteurs live pointent sur la constante.

### Critères d'acceptation
- `grep -rn "157" app/ components/` → 0 occurrence liée aux spots.
- Home + tarifs affichent le compte live ou « 200+ », jamais un chiffre périmé.

---

## Bloc B — Hydratation & Sentry (écraser les bugs pendant qu'ils sont petits)

> **Connecteurs** : Sentry (lire AVANT de coder). Issues ouvertes (14 j, org carnet-de-peche) : `TypeError … null (reading 'parentNode')` sur **/carnet** (8 év.), **/u/:username**, **/carte** · `InvalidNodeTypeError: selectNode` **/spots/:slug** (4) · `TypeError: Failed to construct 'URL'` **/spots/:slug** (4) · `Error: unexpected response from server` **/carnet/nouvelle** (2) · React **#418** vu 1× en QA mobile (page non identifiée).

### Tâches
1. `parentNode` ×3 routes : lire stacks/breadcrumbs Sentry → très probablement UN bug de cleanup DOM (GSAP/`CelebrationOverlay`/unmount). Reproduire, fixer à la racine, y compris si elle est dans `components/map/**` (le S71 carte est annulé, le territoire est libre) — dans ce cas, passe anti-régression carte obligatoire (gating tier, floutage, k-anon).
2. `selectNode` + `Invalid URL` sur /spots/:slug : reproduire (probable code de partage/copie). Fixer.
3. React #418 : reproduire via qa-chrome en viewport étroit sur home/carnet/fil ; fixer la source (date/locale server vs client, pattern déjà vu au S59). Si non reproductible : ajouter un breadcrumb ciblé et le documenter au RECAP (pas de fix à l'aveugle).
4. `url.parse()` déprécié dans `/api/crons/personal-window` → `new URL()`.

### Critères d'acceptation
- QA live : 0 erreur console sur /carnet, /u/<pseudo>, /spots/<slug>, /carnet/nouvelle (desktop + étroit).
- Les issues Sentry correspondantes marquées resolved (ou documentées si non reproductibles).

---

## Bloc C — Plateforme : CSP enforce, middleware, OG

### Tâches
1. `next.config.ts` (:10-30, :80-90) : CSP **Report-Only → enforce**. D'abord inventorier les origines réelles (maptiler, supabase, posthog EU, sentry, stripe, vercel) via qa-chrome sur 8 pages clés ; passer enforce ; garder un `report-to` actif. Ajouter **`Permissions-Policy: camera=(), microphone=(), geolocation=(self)`** (la géoloc du log de prise reste self).
2. `middleware.ts:10` : `APP_ROUTES` += `/classements`, `/sorties`, `/notifications`, `/moderation`, `/spots/mes-propositions` (perte du `?redirect` — audit §3.8).
3. OG timeouts 25 s (`/og/spot/[slug]`, `/opengraph-image`, logs Vercel 30/06-01/07) : borner tout fetch interne (`AbortSignal.timeout(3000)` + fallback image statique de marque), vérifier runtime/edge et cache (`s-maxage` long — un OG de spot change rarement).

### Critères d'acceptation
- `curl -sI https://www.carnet-de-peche.com/` → CSP sans `Report-Only` + Permissions-Policy présents (après déploiement ; en local via `next start`).
- QA live 8 pages (home, carte, spot, espèces, tarifs, fil, /home, classements) : **0 violation CSP** en console (`worker-src`/`blob:` MapLibre vérifiés explicitement).
- Accéder à `/classements` déconnecté → login → retour sur `/classements`.
- Génération OG d'un spot < 3 s ou fallback propre (tester 3 slugs).

### Garde-fous
- ⚠️ Une CSP enforce qui casse MapLibre/PostHog en prod = pire que pas de CSP : la passe qa-chrome AVANT enforce est obligatoire, et `worker-src`/`blob:` (MapLibre) vérifiés explicitement.

---

## Bloc D — Petit UX

### Tâches
1. Badge tier (Local/Itinérant/Découverte) sur `/profil` (audit §4.8) — lecture `current_tier` existante, zéro logique nouvelle.
2. Filtre espèces du carnet : 6 → 26, même source de vérité que le formulaire (audit §4.7).
3. Bouton flottant « instruments » qui chevauche le contenu mobile (audit §4.9) : localiser le composant (app shell), corriger offset/z-index/safe-area. *(App shell = territoire S70.)*
4. Copy : « Position GPS récupérée » → « Position trouvée » (géocodage) ; hero « PROCHAIN CRÉNEAU · 05:24 » → afficher « demain 05:24 » quand le créneau est le lendemain (`components/marketing/home-v3/Hero.tsx`).
5. `/moderation` onglet « Re-vérifier » : état initial trompeur (« 0 spot(s) » avant toute recherche) → afficher les premiers résultats par défaut OU un empty-state explicite « Lance une recherche ».
6. Embed carte de la home flaky (audit §3.6) : retry + fallback honnête (« La carte n'a pas répondu, réessaie »), à fixer à la racine (y compris `components/map/**` — territoire libre depuis l'annulation du S71 carte), avec anti-régression carte si un fichier partagé est touché.
7. **Lisibilité bathy (reliquat carte, audit §4.14)** : vérifier minzoom/contraste/opacité de la couche EMODnet pour qu'elle soit perceptible aux zooms d'usage (10-14) sans écraser le fond. Preuve : capture avant/après au zoom 12 sur une zone côtière.

### Critères d'acceptation
- QA visuelle : badge tier visible ; 26 espèces filtrables au carnet ; plus de chevauchement du bouton instruments sur especes/bar + /home à 500 px ; « demain » affiché le cas échéant ; embed home OK sur 3 rechargements consécutifs.

---

## Bloc E — Hygiène & mesure

### Tâches
1. Tirets cadratins : `node scripts/lint-copy-dashes.mjs` — corriger les ~30 occurrences en prose visible (surtout headings `content/guides/*.mdx` ; les exceptions tolérées de `CLAUDE.md` §6 restent).
2. `.env.example` += `NEXT_PUBLIC_VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT` (audit §4.13, alignement `lib/env.ts`).
3. **PostHog `signup_completed`** (audit §3.9) : capture server-side dans le flux d'inscription réussie (`app/auth/login/actions.ts`, là où vit le redeem S68), propriétés `{ comp_code_used: boolean }`. Documenter au RECAP l'insight funnel à créer (visite → signup → 1re prise) — la création du funnel = John.
4. Heures de soleil ~14 min d'écart à Brest (audit §4.3) : localiser le calcul (grep `suncalc`/`getTimes`), vérifier la coordonnée de référence (suspect : point ≈ 49.3N/5.5W en pleine mer) → utiliser les coords ville/département de l'utilisateur.

### Critères d'acceptation
- `lint-copy-dashes` : 0 occurrence hors exceptions.
- Une inscription de test en preview fait apparaître `signup_completed` dans PostHog (vérifié via connecteur).
- Lever/coucher pour un profil brestois ≈ éphémérides réelles à ±3 min.

---

## Bloc F — Dette documentaire

### Tâches
1. Committer la réorg docs en attente (suppressions `docs/sprint-N/` + nouveaux `docs/sprints/`, `docs/roadmaps/` — audit §7) : `chore(docs): réorganisation sprints/roadmaps`. **Vérifier avant** qu'aucun fichier unique n'est perdu (les RECAP supprimés existent bien dans `docs/sprints/`).
2. Resync `CLAUDE.md` : §2 (état réel post-S69 : ~107 migrations, 695+ tests, 26 espèces, 1 158 spots dont 215 curés, sprints 59→69 dopamine+intégrité livrés, S70/71 en parallèle) + §9 (roadmap courante = `docs/roadmaps/ROADMAP-POST-AUDIT-2026-07-02.md`) + retirer les « 58 migrations / ~540 tests » périmés.
3. Vérifier que `docs/sprints/sprint-64/RECAP.md` (ou équivalent) existe ; sinon le signaler au RECAP (travail S64 non documenté).

### Critères d'acceptation
- `git status` propre côté docs après commit ; `CLAUDE.md` ne contredit plus l'audit du 02/07.

---

## Workstream VERIF (obligatoire, agent indépendant)

1. `/verif-sprint` (tests, build, typecheck, lint, lint copy-dashes). Puis **deploy-watch** après déploiement (Sentry : les issues du Bloc B ne reviennent pas ; Vercel : 0 timeout OG sur 48 h).
2. Relire chaque critère d'acceptation, ✅/❌ avec preuve (greps, curl, captures, événement PostHog).
3. **Vérifier les règles dures** : `git diff --name-only main` ne contient aucune migration, pas de `lib/types.ts`, pas de `package.json`. Si des fichiers carte ont été touchés (Blocs B/D), la passe anti-régression carte (gating tier 2 comptes, floutage GPS, k-anon heatmap) est OBLIGATOIRE.
4. Passe copy FR (tutoiement, pas de tiret cadratin ajouté) + anti-régression standard (gating, floutage — non concernés en théorie : le prouver).
5. Livrer `docs/sprint-70/RECAP.md` : fait / comment tester / reste manuel John.

## Reste manuel John (post-sprint)

- Dashboard Vercel : WAF/Challenge Mode (cf préalable) + confirmer visuellement les headers en prod.
- Créer le funnel PostHog depuis `signup_completed`.
- Merge → main, déploiement, QA fumée.
