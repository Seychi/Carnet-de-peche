# 🗺️ Roadmap Carnet de Pêche

> **Document vivant.** À tenir à jour à chaque fin de sprint.
> **Dernière mise à jour** : 2026-05-20 (post-sprint 7 mergé + audit complet — sprint 7.5 converti en obligatoire).
> **Auteur** : Claude (web) + Claude Code, validé par John.

---

## Comment lire ce document

- ✅ Fait · 🚧 En cours · 🔜 À venir · ❓ Décision en attente
- 1 sprint = 2 semaines (sauf sprint 4 et sprint 12-19 explicitement plus longs)
- Les cibles MRR / utilisateurs sont des **objectifs internes** pas des promesses commerciales
- Les sprints **vert** sont obligatoires, les sprints **orange** sont des paris optionnels qu'on peut couper si on est en retard
- **Gates** (⛳) = points de décision Go/No-Go avant d'engager la phase suivante. À chaque gate, on relit ce doc avec César et on tranche.

Conventions de référence dans tout le doc :
- Quand je dis "carnet", c'est la table `catches` côté DB
- Quand je dis "tier", c'est `discovery` / `local` / `itinerant` (cf. CLAUDE.md §8)
- Quand je dis "fil", c'est `feed_posts` / `feed_comments` / `feed_likes` / `follows`
- Les chiffres MRR supposent un mix 70/30 mensuel/annuel et ~15 % de churn mensuel

---

## Vue d'ensemble — 3 horizons

| Horizon | Sprints | Objectif | KPI principal |
|---|---|---|---|
| **Court terme** : SaaS web complet | 8 → 11 | Produit web sentable, beta privée 50 testeurs | 50 testeurs actifs, NPS > 30 |
| **Moyen terme** : Mobile + lancement public | 12 → 23 | Apps iOS+Android, lancement public FR | 5 000 inscrits, 500 abonnés payants, MRR 2 500 € |
| **Long terme** : Monétisation secondaire + extensions | Phase 2+ | Diversifier revenus, étendre périmètre | MRR 15 000 €+, 30 % revenus non-abo |

```
    Sprints 7.5 8  9  10 11 | 12-13 14-15 16 17 18 19 | 20 21 22 23 | Phase 2
            ──────────────── ───────────────────────── ─────────── ────────
            Hygiène+Web      Mobile (Expo)             Lancement   Diversif.
                          ⛳                          ⛳           ⛳
                        Gate 1                      Gate 2       Gate 3
                     Go mobile ?                 Go lancement ? 5k abonnés ?
```

---

## 🔴 Sprint 7.5 — Hygiène produit + dette technique (OBLIGATOIRE, 3-5 jours)

**Status** : converti d'optionnel à **obligatoire** suite à l'audit du 2026-05-20 (`docs/AUDIT-2026-05.md`).

**Objectif** : aligner le site live avec la réalité produit, corriger les bugs SEO/UX P0 + dette technique critique, avant d'engager le pivot social du sprint 8 sur une base saine. **Pas de nouvelle feature**, uniquement du nettoyage.

**Pourquoi obligatoire** : l'audit a remonté un bug SEO majeur (`metadataBase` vercel.app au lieu de .com), 3 liens cassés en footer, des incohérences pricing (7j vs 14j), des promesses marketing non livrées (import/export, modération humaine, mode hors ligne sur la home), des témoignages fictifs et 365 erreurs lint pré-existantes. Empiler le sprint 8 par-dessus = ré-amplification de ces bugs.

**Composé de** : tâches P0 (audit) + sélection de P1 + dette spécifique sprint 7 (scoring inerte à neutraliser, lint 365 erreurs).

**Brief détaillé d'exécution** : voir `docs/sprint-7.5/brief-sprint-7.5.md` (chaque tâche avec fichiers, lignes, critères d'acceptation).

### Bloc A — Corrections marketing & SEO (≈ 4-5h)
- Corriger `metadataBase` dans `app/layout.tsx:19` → `.com` au lieu de `.vercel.app`
- Footer : créer 3 stubs `/fil`, `/especes`, `/techniques` OU commenter les liens (`components/layout/Footer.tsx:32-34`)
- Décision pricing 7j vs 14j → propager dans home + tarifs + CLAUDE.md
- Corriger les 4 CTAs `href="#"` du home + virer le toast "sprint 4" sur tarifs
- Aligner copy home : retirer ou marquer "bientôt" les promesses non livrées (import/export, modération ambassadeurs+IA, mode hors ligne dans la liste carnet, 217 spots), fix floutage 2 km → 1 km
- Retirer / remplacer les 3 témoignages fictifs Yann L. / Julien R. / François B.

### Bloc B — Dette technique sprint 7 (≈ 2h)
- **Neutraliser le scoring perso inerte sur fiches spots** : retirer le badge `⚡ Perso` du `SpotBestMomentsSection` et l'`InsightChip` du `BestMomentCard`/`DayBestMoments` tant que la logique n'est pas remplacée par le futur scoring "vraie performance" (cf RECAP sprint 7 § "À faire (suivi)")
- Garder uniquement le mode descriptif honnête sur `/profil` (PersonalScoreSection)

### Bloc C — Dette lint 365 erreurs (≈ 1-2h)
- Fix automatique des 365 `react/no-unescaped-entities` (apostrophes FR `'` → `&apos;` ou `'`) via script ou MultiEdit
- Une fois propre : retirer `eslint: { ignoreDuringBuilds: true }` de `next.config.ts`

### Bloc D — Infra & discipline (≈ 4h)
- `env.ts` : ajouter `SUPABASE_SERVICE_ROLE_KEY` (optionnel client, required serveur) + `CRON_SECRET`
- Réconciliation migrations local/remote : `supabase db diff`, identifier le drift documenté en migration 015, documenter la procédure dans `supabase/README.md`
- Régénérer `lib/types.ts` après migration 016
- Setup CI GitHub Actions minimal (`.github/workflows/check.yml`) : install + lint + typecheck + test
- Cleanup : nettoyer les routes dev exposées en prod (`/app/test`, `/api/dev-test`, `/dev/scoring-preview`, `/dev/test-photo` → guard `NODE_ENV` ou suppression), gitignore `dev-server.log`
- Vérifier Vercel env vars en prod : `CRON_SECRET` + `SUPABASE_SERVICE_ROLE_KEY`
- Déclencher manuellement le cron 1× pour peupler `spot_scores` (sinon markers carte gris)

### Reporté à plus tard (post sprint 7.5)
- Intégration WorldTides API (sprint 8-9 ou sprint 11)
- Audit RLS systématique (à faire au début du sprint 8 avant d'ajouter les tables `feed_*`)
- Tests E2E Playwright (sprint 11)

### Critères de sortie sprint 7.5
- `pnpm lint` = 0 erreur
- `pnpm typecheck` = 0 erreur
- `pnpm test` = 116/116 vert
- CI GitHub Actions vert sur `main`
- Lighthouse SEO ≥ 90 sur `/spots/[slug]` avec canonical `.com`
- Aucun CTA pointant vers `#` sur la home
- Aucune mention "sprint X" visible utilisateur
- Footer : 0 lien cassé
- Vercel env vars confirmées en prod
- Cron `compute-spot-scores` a tourné au moins 1× en prod (vérifiable dans `spot_scores`)

### Estimation totale
**3-5 jours ouvrés** (~10-15h de Claude Code + 2h de validation John).

---

## 🟢 Sprint 8 — Fil communautaire (2 semaines) ✅ **FAIT (branche `sprint-8`, 2026-05-21 — à merger/déployer après QA manuelle)**

> **Statut** : code-complet sur la branche `sprint-8`, migrations 017→020 appliquées en prod, 183 tests verts, build OK. Reste : QA manuelle (`docs/sprint-8/qa-checklist.md`), tests Realtime cross-onglets, merge `sprint-8` → `main` + déploiement. Détail complet : `docs/sprint-8/RECAP.md`.
> **Findings retenus** : audit RLS a corrigé 2 trous non prévus (lecture anonyme fil + graphe social → RLS-FIX-04/05 en migration 017). RLS-FIX-06 (geom catch en accès direct) → backlog ci-dessous. Whitelist côtière canonique = `lib/geo/departments.ts`.

**Objectif** : activer le pivot "réseau social" du produit. Les tables `feed_posts`, `feed_comments`, `feed_likes`, `follows`, `profiles` sont déjà en DB depuis sprint 1, dormantes. On allume.

**Pourquoi maintenant** : sprint 4-7 ont construit le carnet + carte + scoring. On a la matière (catches) pour alimenter un fil. Sans fil, pas de différenciation vs spot-de-peche.com qui est purement informationnel.

### Décisions à prendre AVANT de coder

1. **Granularité du fil** : un fil global France, ou un fil par département, ou les deux ?
   - Recommandation : **un fil par département** (29, 56, 22, 35, etc.) + onglet "Mes follows" pour ce que tu suis. Pas de fil global, ça noie les locaux.
2. **Posts génériques vs posts ancrés sur une catch** : on autorise les deux ou seulement les posts-catch ?
   - Recommandation : **les deux**. Un post peut être (a) le partage d'une prise du carnet (avec photo + conditions snapshot) ou (b) un texte libre (question matos, alerte spot pollué, etc.).
3. **Modération** : libre au lancement comme prévu, ou pré-modération sur le premier post de chaque user ?
   - Recommandation : **libre**, comme prévu. Ajouter juste un bouton "Signaler" qui crée une ligne dans `reports`. Modération auto Claude API → sprint post-beta.
4. **Limites tier** :
   - `discovery` : lecture seule du fil de son département principal (`profile.main_department`)
   - `local` : écriture + interactions sur son département
   - `itinerant` : écriture + interactions sur tous les départements côtiers FR

### Tâches techniques

**DB (migration 013)**
- Ajout colonne `feed_posts.department char(3)` (indexé) pour filtrage rapide par dept
- Ajout colonne `feed_posts.catch_id uuid references catches(id) on delete set null` (optionnelle, pour les posts-catch)
- Ajout vue `feed_posts_for_viewer` qui joint `profiles` + `catches_for_viewer` et applique le gating tier en lecture
- RLS policies : insert/update/delete réservés à `local`/`itinerant` sur leur(s) dept(s)
- Index GIN sur `feed_posts.body` pour future recherche

**Backend Server Actions**
- `app/actions/feed.ts` :
  - `createPost(input)` : zod validation, vérif tier, vérif dept, insert
  - `toggleLike(postId)` : upsert dans `feed_likes`
  - `addComment(postId, body)` : insert avec validation longueur
  - `deletePost(postId)` : RLS l'assure mais double-check côté action
  - `reportPost(postId, reason)` : insert dans `reports`
- `app/actions/follow.ts` :
  - `toggleFollow(targetUserId)` : upsert dans `follows`
  - `getFollowSuggestions(userId)` : RPC qui propose 5 users du même dept avec le plus de catches récentes

**Realtime Supabase**
- Subscription `feed_posts` filtrée par dept dans `app/(app)/fil/page.tsx` → nouveau post = prepend optimiste
- Subscription `feed_likes` + `feed_comments` filtrée par `post_id` dans `<PostCard>` → compteurs live

**Composants UI**
- `components/feed/PostCard.tsx` : carte post (avatar + pseudo + date + body + photo si catch_id + actions like/comment/share)
- `components/feed/PostComposer.tsx` : éditeur de post (mode "texte libre" / mode "partager une catch")
- `components/feed/CommentThread.tsx` : fil de commentaires avec reply (1 niveau, pas plus)
- `components/feed/FeedFilters.tsx` : tabs département / "Mes follows" / "Mes catches partagées"
- `components/profile/PublicProfile.tsx` : page profil public (`/u/[username]`) — bio, dept, espèces favorites, stats publiques, bouton suivre

**Signal social local (différenciateur clé)**
- Sur fiche spot `/spots/[slug]` :
  - Encart "Activité récente" : "X pêcheurs ont logué Y prises ici les 7 derniers jours"
  - Liste 3 dernières catches publiques sur ce spot (avatar + date + espèce + taille) — coords floutées par défaut
- RPC `get_spot_activity(spot_id, days)` qui agrège `catches` avec privacy = 'public' OR (privacy = 'friends' AND user follows viewer)

### Routes

```
app/(app)/fil/page.tsx              ← fil principal
app/(app)/fil/[department]/page.tsx ← fil départemental
app/(app)/u/[username]/page.tsx     ← profil public (avec follow)
app/(app)/follows/page.tsx          ← gestion de mes follows
app/api/feed/realtime/route.ts      ← endpoint Realtime token (si besoin RLS spécifique)
```

### Risques

| Risque | Impact | Mitigation |
|---|---|---|
| Fil vide au lancement (50 testeurs = peu de posts) | UX déprimante | Seed 20 posts via comptes test sur 3 dépts cibles avant beta |
| Realtime Supabase plafond connexions concurrentes | Bug perçu prod | Plan gratuit Supabase = 200 connexions concurrentes, OK pour beta. Surveiller dashboard |
| Modération libre = posts spam/inappropriés | Image marque | Bouton signaler + alertes email à John sur tout report. Si > 5 reports/jour, accélère sprint Claude API |
| Realtime + RLS = patterns subtils, fuite données | Sécurité | Audit RLS manuel + test "vue d'un autre user" avant deploy |

### Critères d'acceptation

- Un user `discovery` du dept 29 voit le fil du 29 en lecture, ne peut PAS poster
- Un user `local` du dept 29 voit + poste + commente + like sur le 29, mais pas sur le 56
- Un user `itinerant` voit + poste sur tous les dépts côtiers
- Un nouveau post apparaît chez les autres users connectés au fil du même dept en < 3 s
- La fiche spot affiche "Activité récente" si ≥ 1 catch publique sur les 7 derniers jours
- Tous les boutons signaler créent une ligne dans `reports` avec `reason`

### Métriques à suivre post-livraison

- Nb posts/jour par dept
- Ratio engagement = (likes + comments) / posts
- % users qui postent au moins 1 fois en 7 jours (rétention sociale)
- Nb reports/jour

### Stack additionnel : aucun nouveau package

Tout est déjà en place : Supabase Realtime, shadcn, date-fns. Pas de lib de markdown (posts en plain text + emoji uniquement v1, pour éviter XSS).

---

## 🟢 Sprint 9 — Paiements Stripe (2 semaines)

**Objectif** : remplacer les inserts manuels en DB par du vrai paiement Stripe. Gating réel des tiers Local/Itinérant.

**Pourquoi maintenant** : sans paiements, on ne peut pas commercialiser. Le sprint 8 a activé l'écriture sur le fil = première fonctionnalité "vraiment payante" → on doit avoir Stripe prêt avant la beta.

### Décisions à prendre AVANT

1. **Pricing exact côté Stripe** : on valide les 3 plans de CLAUDE.md §8 (4,90 €/mois et 9,90 €/mois + annuels) ? Oui par défaut.
2. **Essai 14 jours sans CB** : techniquement Stripe demande une CB en général. Deux options :
   - (a) Vrai essai Stripe avec CB capturée mais non facturée pendant 14j → friction inscription
   - (b) Faux essai côté DB (flag `trial_until` dans `subscriptions`), sans Stripe pendant 14j, redirect Checkout au J+14 → friction nulle
   - Recommandation : **(b)** — on est en early stage, on veut max conversion. On migre vers (a) quand le marketing tournera.
3. **Devise et zone géo** : EUR uniquement v1 ? Oui (FR seulement).
4. **VAT / TVA** : Stripe Tax activé ? Coût Stripe Tax = 0,5 % du transactionnel. Pour France only avec utilisateurs B2C, TVA forfaitaire 20 %. Décision : **Stripe Tax ON dès le départ**, sinon refonte douloureuse plus tard.

### Tâches techniques

**Stripe Dashboard**
- Créer produits : "Carnet de Pêche Local" / "Carnet de Pêche Itinérant"
- 4 prix par produit : mensuel EUR, annuel EUR, mensuel EUR avec coupon promo (sprint 11), annuel EUR avec coupon promo
- Activer Stripe Tax (France)
- Configurer Customer Portal : annulation libre, mise à jour CB, changement de plan
- Webhook endpoint pointant vers `/api/stripe/webhook`

**DB (migration 014)**
- Refactor table `subscriptions` :
  - `stripe_customer_id text unique`
  - `stripe_subscription_id text unique`
  - `stripe_price_id text`
  - `current_period_start timestamptz`
  - `current_period_end timestamptz`
  - `cancel_at_period_end boolean`
  - `trial_until timestamptz` (pour faux essai)
- Index sur `stripe_subscription_id`
- RLS : lecture user sur son propre row, écriture uniquement service_role

**Backend**
- `app/api/stripe/checkout/route.ts` : POST → crée session Checkout (price_id + customer_id si existant)
- `app/api/stripe/webhook/route.ts` : POST → vérif signature + handle events :
  - `checkout.session.completed` → crée/update subscription
  - `customer.subscription.updated` → update plan / status
  - `customer.subscription.deleted` → set `cancel_at_period_end = true`
  - `invoice.payment_failed` → email user + flag DB
- `app/api/stripe/portal/route.ts` : POST → crée session Customer Portal
- `lib/stripe/client.ts` : client Stripe singleton
- `lib/stripe/events.ts` : types webhook + helpers update DB

**Frontend**
- `app/(marketing)/tarifs/page.tsx` : refonte avec 3 cards, sélecteur mensuel/annuel (saving badge -17 %), CTAs Checkout
- `app/(app)/compte/abonnement/page.tsx` : page gestion (plan actuel, prochaine facture, lien Customer Portal, lien historique factures)
- Composant `<TrialBadge>` qui affiche les jours restants si `trial_until` futur
- Refactor `lib/auth/tier.ts` :
  - Si `trial_until > now()` → tier = price-mappé (`itinerant`/`local`)
  - Si `current_period_end > now()` ET pas `cancel_at_period_end` confirmé expiré → tier = price-mappé
  - Sinon → `discovery`

**Emails (Resend, à setup en sprint 11 mais on prévoit les templates ici)**
- Welcome trial : "Tu as 14 jours pour tester sans CB"
- Trial day 12 : "Plus que 2 jours, mets ta CB maintenant pour ne pas couper"
- Payment failed : "On n'a pas pu encaisser, mets à jour ta CB"
- Subscription canceled : "Reviens quand tu veux"

### Routes

```
app/api/stripe/checkout/route.ts
app/api/stripe/webhook/route.ts
app/api/stripe/portal/route.ts
app/(app)/compte/abonnement/page.tsx
app/(app)/compte/abonnement/success/page.tsx    ← redirect Stripe Checkout
app/(app)/compte/abonnement/cancel/page.tsx
```

### Risques

| Risque | Impact | Mitigation |
|---|---|---|
| Webhook Stripe rate ou désync DB | Users payés non-débloqués | Idempotency keys + retry queue Stripe natif + cron de réconciliation hebdo (lit Stripe → patch DB) |
| Faux essai exploité (créer comptes en boucle) | Perte revenus | Limite 1 essai/email + log IP + email de confirmation obligatoire avant essai |
| Stripe Tax cassé pour départements outre-mer | Conformité fiscale | v1 = métropole only, bloquer inscription depuis IP DOM-TOM avec message |
| Mauvais mapping price_id ↔ tier | Users sur-débloqués | Table en dur `STRIPE_PRICE_TO_TIER` dans `lib/stripe/pricing.ts` + tests unitaires |

### Critères d'acceptation

- Un user `discovery` peut cliquer "Essayer Local 14j" → sans CB → tier = `local` pendant 14 jours
- J+14, le tier auto-bascule en `discovery` si pas de Checkout
- Un user qui paie via Checkout voit son tier passer `local`/`itinerant` en < 5s post-paiement
- Un user qui annule via Customer Portal voit `cancel_at_period_end = true`, garde l'accès jusqu'à `current_period_end`, puis redescend
- Le webhook re-rejoué deux fois ne crée pas de doublon (idempotence)
- Page tarifs Lighthouse SEO ≥ 90

### Stack additionnel

| Package | Version | Raison |
|---|---|---|
| `stripe` | latest stable | SDK Node officiel |
| `@stripe/stripe-js` | latest stable | Client redirectToCheckout |

---

## 🟢 Sprint 10 — Guides éditoriaux + SEO programmatique (2 semaines)

**Objectif** : capter du trafic organique gratuit via guides longs + SEO programmatique massif sur la combinatoire espèce × département × technique.

**Pourquoi maintenant** : on a la carte indexable depuis sprint 4, les fiches spots, le sitemap. Il manque le contenu éditorial qui crée la matière à ranker.

### Décisions à prendre AVANT

1. **MDX vs CMS** : on stocke les guides en MDX dans le repo (versionnés, contrôlés) ou dans une table DB pour que César édite via une interface ?
   - Recommandation : **MDX dans `content/guides/*.mdx`**. César édite en Markdown via GitHub directement (formation 30 min). Pas de CMS = pas de coût, pas de surface de bug.
2. **Combien de guides au lancement** : 20 phares + N pages programmatiques ?
   - 20 guides éditoriaux longs (1500-3000 mots, écrits par César ou Claude web)
   - ~600 pages programmatiques (6 espèces × 25 dépts × 4 techniques = 600, dont ~100 combinaisons absurdes à filtrer)

### Tâches techniques

**Setup MDX**
- Install `@next/mdx` + `next-mdx-remote`
- `content/guides/*.mdx` avec frontmatter : `title`, `slug`, `species`, `technique`, `department`, `excerpt`, `cover_image`, `author`, `published_at`, `updated_at`
- Composants MDX custom : `<SpotCard slug="..." />`, `<TechniqueBadge type="..." />`, `<TideExplainer />`

**Pages programmatiques**
- Route catch-all `app/(marketing)/peche/[...slug]/page.tsx` qui résout :
  - `/peche/bar/leurres` → "Pêche du bar aux leurres en France"
  - `/peche/bar/leurres/finistere` → "Pêche du bar aux leurres dans le Finistère"
  - `/peche/dorade-royale/surfcasting/morbihan` → idem
- Génération statique via `generateStaticParams()` qui lit la combinatoire filtrée (whitelist `lib/seo/programmatic.ts`)
- Contenu : intro générée à partir de templates + 3-5 spots populaires du dépt (RPC) + stats live (nb prises 30j) + lien vers guide éditorial pertinent + CTA "Logue ta prise"

**SEO renforcé**
- `app/sitemap.ts` : ajouter les ~600 routes programmatiques + 20 guides
- `app/robots.txt` : OK déjà
- `<JsonLd>` Article schema sur chaque guide
- `<JsonLd>` HowTo schema sur les guides "comment pêcher X"
- Refonte `app/(marketing)/spots/[slug]/page.tsx` : ajouter encart "Guides liés" en bas

**Optimisation Lighthouse**
- Images `cover_image` en next/image avec `priority` sur la première
- Headings hiérarchisés (1 h1 par page, h2 sections)
- Internal linking dense entre guides / fiches spots / pages programmatiques

### Contenus à produire (en parallèle, hors code, par César + Claude web)

**20 guides phares (priorités SEO)**
1. Pêche du bar aux leurres pour débutants (déjà en draft : `docs/guides/peche-bar-leurre-debutant.md`)
2. Surfcasting de la dorade royale (déjà en draft)
3. Top 5 spots de pêche du bord en Bretagne (déjà en draft)
4. Pêche du lieu jaune au leurre souple
5. Comment lire une courbe de marée pour pêcher
6. Pêche du maquereau à la mitraillette pour débutant
7. Les meilleurs coefficients pour pêcher le bar
8. Pêche de l'orphie en surface
9. Pêche du sar aux appâts naturels
10. Comprendre le solunar : quand pêcher selon la lune
11. Choisir sa canne polyvalente pour la pêche du bord
12. Les meilleurs leurres souples pour le bar
13. Pêche en zone rocheuse : sécurité et techniques
14. Pêche depuis une jetée : 5 erreurs à éviter
15. Pêche nocturne du bar à la lune
16. Pêche du bar en été : adapter sa technique
17. Pêche d'automne en Manche : top espèces
18. Comment relâcher un poisson proprement (no-kill)
19. Tailles légales et quotas en mer 2026 (mise à jour annuelle)
20. Glossaire du pêcheur du bord

**Plan de production** :
- 5 guides finaux livrés par sprint à partir de sprint 10
- Sprint 10 finit avec 5-10 guides en ligne
- Sprint 11 : 5 de plus
- Post-lancement : 1-2 par semaine en continu

### Risques

| Risque | Impact | Mitigation |
|---|---|---|
| Pages programmatiques jugées "thin content" par Google | Pénalité SEO | Min 400 mots de contenu unique par page + données live (spots, stats) qui changent |
| MDX trop rigide pour César | Friction éditoriale | Doc dédiée `docs/guides/COMMENT-ECRIRE.md` + template `_TEMPLATE.mdx` |
| 600 pages programmatiques = build long | DX dégradée | `generateStaticParams` paresseux (ISR avec `revalidate: 86400`) au lieu de full SSG |

### Critères d'acceptation

- 5 guides longs en ligne avec metadata, OG image, JSON-LD
- ~600 routes programmatiques générées et accessibles
- Sitemap.xml soumis à Google Search Console (1 ping)
- Lighthouse SEO ≥ 95 sur 3 guides + 3 pages programmatiques tirées au sort
- Build time `next build` < 4 minutes

---

## 🟢 Sprint 11 — Polish + Beta privée (2 semaines)

**Objectif** : passer de "ça marche" à "c'est solide". Lancer 50 testeurs réels en beta privée.

### Tâches techniques

**Emails transactionnels (Resend)**
- Setup `RESEND_API_KEY` env var
- Templates React Email : welcome, trial start, trial ending, payment success, payment failed, password reset, weekly digest (optionnel)
- Cron Edge Function "weekly digest" qui envoie chaque dimanche : "Tes 3 plus belles prises de la semaine + 3 spots tendance dans ton dept"

**Monitoring (Sentry)**
- Setup `SENTRY_DSN` env var
- Source maps upload via Vercel integration
- Alertes Slack/Email sur erreurs critiques (5xx, webhook fail)
- Performance monitoring sur routes clés : `/carte`, `/spots/[slug]`, `/carnet`, `/fil`

**Tests E2E (Playwright)**
- Setup `@playwright/test`
- Scénarios cibles :
  - Inscription → onboarding → première catch loguée
  - Connexion → carte → ouvrir un spot → voir conditions
  - Souscrire essai Local → tier upgraded → fil accessible en écriture
  - Annuler abonnement via Customer Portal → tier downgrade à expiration
- CI GitHub Actions : Playwright sur PR + main

**Lighthouse CI**
- Setup `@lhci/cli` dans GitHub Actions
- Budget perf : First Contentful Paint < 2s, LCP < 2.5s, CLS < 0.1
- Bloque PR si régression > 10 %

**Optim perf**
- Audit bundle size : retirer dépendances non utilisées
- `next/dynamic` sur composants lourds (charts, map)
- Préchargement Images OG via `next/image` `priority`
- Audit RLS Supabase : explainer chaque policy pour les requêtes hot

**Accessibilité**
- Audit axe-core sur 5 pages principales
- Fix : contraste, labels, focus visible, navigation clavier sur la carte
- Test VoiceOver iOS + NVDA Windows sur 3 parcours critiques

**Beta privée**
- Liste 50 invités (mix : 20 pêcheurs Bretagne, 15 Atlantique, 15 Méditerranée)
- Code promo "BETA2026" → 6 mois Itinérant gratuit (via Stripe coupon)
- Canal Discord ou Slack privé "Beta Carnet de Pêche" pour feedback
- Formulaire feedback intégré au footer (modal Sentry-based)

### Risques

| Risque | Impact | Mitigation |
|---|---|---|
| Bugs trouvés en beta = sprint 12 décalé | Roadmap mobile en retard | Buffer 1 sprint avant 12, prioriser P0/P1 |
| 50 testeurs = trop peu de signal stat | Décisions mauvaises | Compléter avec interviews qualitatives (10 calls 30 min) |
| Sentry quota free dépassé | Cécité prod | Plan Team Sentry = 26 €/mois si besoin, à anticiper |

### Critères d'acceptation

- 50 invités créés en base avec code BETA2026 actif
- Sentry capture toutes les erreurs 5xx avec stack trace
- Playwright CI vert sur les 4 scénarios cibles
- Lighthouse Perf ≥ 70 mobile, ≥ 90 desktop sur `/carte`, `/spots/[slug]`, `/`
- NPS recueilli auprès des 50 testeurs (objectif ≥ 30)

### Stack additionnel

| Package | Version | Raison |
|---|---|---|
| `resend` + `react-email` | latest | Emails transactionnels |
| `@sentry/nextjs` | latest | Monitoring erreurs + perf |
| `@playwright/test` | latest | E2E |
| `@lhci/cli` | latest | Lighthouse CI |

---

## ⛳ Gate 1 — Go/No-Go Mobile (post-sprint 11)

**Question** : on engage 8 sprints (16 semaines) sur le mobile ou on attend ?

**Critères Go** :
- NPS beta ≥ 30
- ≥ 30/50 testeurs actifs (au moins 1 catch loguée en 14 jours)
- ≥ 5/50 testeurs ont demandé l'app mobile spontanément
- Aucun bug bloquant P0 ouvert
- Stripe webhook stable depuis 4 semaines (0 mismatch)

**Critères No-Go (auquel cas on prolonge le web)** :
- NPS < 15
- Aucune traction sur le fil (< 10 posts total semaine 4)
- Bug fondamental scoring/carte non résolu

**Si No-Go** : sprint 11b consacré à pivot/itération web avant de retenter Gate 1 à sprint 11c.

---

## 🟢 Sprints 12-13 — Setup Mobile + Auth (4 semaines)

**Pourquoi 4 semaines** : la première installation Expo + monorepo + partage de code est lourde. On prend large.

### Tâches techniques

**Monorepo Turborepo**
- Migration repo `Seychi/Carnet-de-peche` vers monorepo :
  ```
  apps/
    web/        ← Next.js actuel
    mobile/     ← Expo SDK 51
  packages/
    db/         ← types Supabase, RPC clients
    ui/         ← composants partagés (Button, Input, etc.)
    auth/       ← logique auth partagée
    config/     ← env validation, constantes
  ```
- `pnpm-workspace.yaml`, `turbo.json` avec pipelines build/dev/lint
- Migration progressive : web reste fonctionnel, mobile s'ajoute à côté

**Expo SDK 51**
- `pnpm create expo-app apps/mobile --template`
- Expo Router (file-based routing, same vibe que Next.js App Router)
- `@supabase/supabase-js` côté mobile (pas `@supabase/ssr` qui est web-only)
- AsyncStorage pour la persistance session

**Auth mobile**
- Écran login (email/password) + écran register
- Google Sign-In via `expo-auth-session/google`
- Apple Sign-In via `expo-apple-authentication` (obligatoire iOS store)
- Magic link désactivé sur mobile v1 (UX cassante)

**Design system partagé**
- Composants UI dans `packages/ui` avec props compatibles web + mobile (via `react-native-web` ou dual export)
- OU plus pragmatique : composants UI dupliqués mais design tokens (couleurs, spacing) partagés via JSON dans `packages/config`
- Recommandation : **design tokens partagés, composants dupliqués**. Cross-platform UI shared = piège classique.

### Critères d'acceptation

- App Expo démarre sur iOS Simulator et Android Emulator
- Connexion email/password fonctionne
- Connexion Apple Sign-In fonctionne sur device physique iOS
- Build EAS preview généré (lien à partager)
- Aucune régression sur le web

---

## 🟢 Sprints 14-15 — Carnet + Carte mobile (4 semaines)

**Tâches**

**Carnet (sprint 14)**
- Écran liste catches : `apps/mobile/app/(tabs)/carnet/index.tsx`
- Écran détail catch : photo, conditions, map mini
- Écran nouvelle catch : form + capture photo native + EXIF GPS auto-rempli (avec demande de permission)
- Photos : redimension client avant upload Supabase Storage (`expo-image-manipulator`)

**Carte (sprint 15)**
- `react-native-maps` (Google Maps Android, Apple Maps iOS) ou `@maplibre/maplibre-react-native`
- Recommandation : **MapLibre Native** pour cohérence avec le web (mêmes tuiles MapTiler, mêmes spots, mêmes styles)
- Markers spots + cercles floutés freemium
- Bottom sheet spot popup (RN Reanimated)
- Géoloc native via `expo-location`

### Critères d'acceptation

- Logger une catch depuis mobile crée la même ligne DB que depuis web
- Photo prise sur mobile s'upload + apparaît instantanément côté web
- Carte mobile affiche les mêmes spots que carte web avec mêmes filtres tier

---

## 🟢 Sprint 16 — Mode hors ligne (2 semaines)

**Pourquoi crucial** : sur la côte, 4G aléatoire. Si l'app ne marche pas sans réseau, c'est dead.

**Stratégie** :
- Carte : tuiles MapLibre mises en cache offline via package natif (~50 Mo par dept téléchargé à la demande)
- Marées 7 jours : pré-fetch au login + refresh quotidien quand online → stocké AsyncStorage / SQLite
- Spots du département principal : pré-fetch + stocké local
- Catches : queue d'envoi locale si offline, sync auto au retour réseau
- Indicateur visuel "Mode hors ligne" en header

**Tâches techniques**
- `expo-sqlite` ou `@tanstack/react-query` avec persistance pour le cache
- Service de queue offline : `lib/offline-queue.ts`
- Refactor toutes les mutations carnet pour passer par la queue
- UI : badge "Offline" + nb actions en attente

**Risque** : taille de l'app dépasse 100 Mo si tuiles embarquées → forcer téléchargement à la demande, par département.

---

## 🟢 Sprint 17 — Push notifications (2 semaines)

**Cas d'usage**
1. "Créneau exceptionnel demain matin à [spot suivi]" (basé sur solunar sprint 6)
2. "Grande marée ce week-end (coef 110)" (saisonnier)
3. "Un pêcheur que tu suis vient de loguer une prise" (social)
4. "Météo défavorable demain matin sur ta zone" (anti-déception)

**Tâches techniques**
- `expo-notifications` setup
- Permission demande dans onboarding mobile
- Edge Function Supabase cron quotidienne : calcule créneaux + envoie via Expo Push API
- Edge Function trigger Realtime : nouveau post de qqun que je suis → push
- Préférences notifications dans `/compte/notifications` (4 toggles)

**Risque** : spam = uninstall instantané. Limite stricte : max 3 push/jour/user.

---

## 🟢 Sprint 18 — IAP Apple + alignement Stripe (2 semaines)

**Contexte** : Apple impose les In-App Purchases pour tout abonnement vendu via l'app iOS (30 % puis 15 % commission). Pas le choix.

**Décisions**
- Pricing iOS = pricing web (4,90 € / 9,90 €), on absorbe la commission Apple
- OU pricing iOS plus haut (5,99 € / 11,99 €) pour préserver la marge → recommandation : **commission absorbée v1** pour ne pas créer de friction, on ajuste après 1 000 abonnés
- Android : Stripe via WebView OK (Google Play tolérant) → unifier sur Stripe

**Tâches techniques**
- `expo-in-app-purchases` ou `react-native-iap`
- Produits Apple Connect créés (mensuel + annuel × 2 plans = 4 SKUs)
- Backend : Edge Function `verify-apple-receipt` → valide auprès Apple servers → upsert `subscriptions` avec source = `'apple'`
- Conflict resolution : si user déjà abonné Stripe puis souscrit Apple → bloquer + message clair
- App Review Apple : préparer compte demo + documentation review

**Risque** : Apple review = 1-3 jours, parfois rejet. Buffer 1 semaine.

---

## 🟢 Sprint 19 — Polish mobile + TestFlight (2 semaines)

**Tâches**
- TestFlight build interne pour John + César + 5 amis
- TestFlight build externe (jusqu'à 10 000 testeurs si on veut)
- Internal beta Android via Google Play Console
- Pull-to-refresh partout
- Splash screen + icon (assets fournis par César)
- Onboarding mobile : 3 écrans + permission location + permission notifications
- Deep linking : `carnetdepeche://spot/[slug]` → ouvre la fiche dans l'app
- Universal links iOS + App Links Android (depuis liens web)
- Crash reporting Sentry mobile

**Critères d'acceptation**
- Build TestFlight live
- Build Play Console internal track live
- 0 crash en 1 semaine sur 5 testeurs internes
- Deep linking fonctionne depuis Safari + Chrome

---

## ⛳ Gate 2 — Go/No-Go Lancement Public (post-sprint 19)

**Critères Go** :
- 100 testeurs TestFlight + 50 testeurs Play Console actifs
- Crash-free rate ≥ 99 %
- NPS ≥ 35
- César a livré : plan acquisition + 5 partenariats fédérations signés + presse pêche briefée
- 30 guides éditoriaux en ligne
- 100 spots seedés en DB (versus 10 actuels)
- Backend Sentry stable depuis 4 semaines (0 incident P0)

**Si Go** : on enclenche sprint 20.
**Si No-Go** : 1-2 sprints supplémentaires de polish + plus de beta testeurs.

---

## 🟢 Sprint 20 — Pré-lancement (2 semaines)

**Tâches**
- Soumission App Store (review 1-3 jours)
- Soumission Play Store (review 1-2 jours)
- Page d'accueil refonte avec social proof (testimonials beta)
- Press kit complet : logos, screenshots, vidéo démo 60s, dossier de presse PDF (Claude peut le générer)
- Programme parrainage : "Invite 3 amis → 1 mois Local offert"
- Analytics Plausible + PostHog vérifiés en prod
- Plan crisis comm en cas de surge ou bug majeur jour J (procédure 1 page dans `docs/CRISIS-PLAN.md`)

---

## 🟢 Sprint 21 — Lancement public (2 semaines)

**Calendrier semaine 1**
- J-7 : annonce date sur les réseaux (César)
- J-3 : email tous les beta testeurs : "On lance"
- J0 : pushed live + post Linkedin (John) + thread Twitter (César) + post Insta (César)
- J+1 à J+7 : monitoring intensif erreurs, support ultra-réactif

**Calendrier semaine 2**
- Suivi métriques quotidien
- Hotfixes prioritaires
- Premiers contenus presse pêche (interview Le Pêcheur de France, Voile Magazine, etc. — César pilote)

**Cibles J+14**
- 500 inscriptions
- 50 essais Local démarrés
- 10 abonnés payants
- 0 incident P0 critique

---

## 🟢 Sprint 22 — Acquisition (J+30) (2 semaines)

**Leviers**
- SEO : 30 guides + 600 pages programmatiques = capter recherches longue traîne
- Partenariats fédérations : encart "App officielle / app partenaire" sur leurs sites (César)
- Influenceurs pêche YouTube (~20 ciblés par César) : codes promo dédiés tracking
- Plausible/PostHog : analyse funnel inscription → trial → payé
- A/B test pricing si conversion < 5 %

**Cibles J+45**
- 1 500 inscrits
- 200 essais
- 50 abonnés payants (MRR 300 €)

---

## 🟢 Sprint 23 — Itération post-lancement (2 semaines)

**Buffer dédié** : on ne planifie pas de feature, on réagit aux retours.

**Activités typiques** :
- Top 5 demandes utilisateurs récurrentes → choisir 2 à implémenter
- Refonte parcours où le funnel décroche (analyse Hotjar / PostHog session replays)
- Optim conversion essai → payant (timing des emails, copy tarifs, social proof)
- Optim retention semaine 2 → 4 (push notifs adaptées, weekly digest)

**Cibles J+60**
- 3 000 inscrits
- 400 essais cumulés
- 150 abonnés payants (MRR 900 €)
- Churn mensuel < 15 %

---

## ⛳ Gate 3 — 5 000 abonnés (T+6 mois) → monétisation secondaire

**Question** : on est-il prêt à diversifier les revenus ?

**Critères** :
- 5 000 abonnés payants actifs (MRR ~30 000 €)
- Churn stabilisé < 12 %
- Au moins 1 dept FR avec densité utilisateurs > 10 % de la cible
- 100k visiteurs uniques mensuels organique
- Équipe : John + César seuls toujours OK, ou hire 1 dev/com ?

**Si Go** : phase 2 démarre.

---

# 🎯 Phase 2 — Monétisation secondaire (T+6 mois post-lancement)

À ce stade, la base SaaS est saine. On ajoute des sources de revenus complémentaires SANS détourner du cœur produit.

## 2.1 — Affiliation matériel pêche

**Objectif** : 10-20 % du CA total via commissions affiliation.

**Cibles** : Decathlon (programme Awin), Pacific Pêche, Pacheco, Caperlan, marques de leurres (Storm, Megabass, etc.).

**Implémentation**
- Composant `<GearRecommend species="bar" technique="leurres" />` sur les fiches guides + dans la fiche catch ("Avec quel matos cette prise ?")
- Liens trackés via Awin / programmes affiliés (URL stable + tag)
- Page dédiée `/equipement/[species]/[technique]` listant le top matos avec notes/avis (générés à partir de l'historique catches anonymisé)
- **Pas de bandeaux pub display** — uniquement de la reco contextualisée, alignée éditorial

**Décisions** :
- Disclosure transparente : badge "Partenaire" + page "Affiliation et indépendance éditoriale"
- Refus catégorique des marques qu'on ne recommanderait pas sans commission
- Reversement aux abonnés Itinérant : -10 % sur le matos affilié via codes promo dédiés (deal négocié avec partenaires)

**Estimation revenus** : si 100k visiteurs/mois et 0,5 % click affiliation × 80 € panier moyen × 8 % commission = ~3 200 €/mois à 100k uniques.

## 2.2 — Marketplace guides locaux

**Objectif** : connecter pêcheurs Découverte/Local avec guides initiation.

**Concept** : un guide-pêcheur (pro ou expert local) propose des sorties 1:1 ou en petit groupe (initiation, perfectionnement, spot inconnu) → 50-150 € par sortie → commission Carnet de Pêche 15 %.

**Implémentation**
- Profil "Guide pêcheur certifié" (badge vérifié par John : diplôme + assurance vérifiés manuellement v1)
- Page guide : bio, dispos calendrier, tarifs, avis
- Booking system : Stripe Connect (paiement direct au guide, on prélève 15 %)
- Messagerie interne 1:1 (table `messages` à créer)
- Avis post-sortie (système réputation)

**Risques** :
- Responsabilité : sortie qui se passe mal → on doit pousser tous les guides à avoir une assurance pro + clause CGU décline
- Marché TAM en France : 500-2 000 guides estimés → revenus modestes (50 sorties/mois × 100 € × 15 % = 750 €/mois)

**Décision** : à activer SEULEMENT si demande organique s'exprime en beta (signal : > 5 % users ont posé la question "comment trouver un guide"). Sinon on garde dans le backlog.

## 2.3 — B2B fédérations

**Objectif** : 500-2 000 €/an par fédération licence, sur un univers de ~100 fédérations cibles (FFPM, fédés régionales, associations).

**Concept** : licence annuelle permettant à la fédération de :
- Cobranded landing page dans l'app
- Accès statistiques anonymisées sur leur dept (espèces les plus prises, tendances, top spots)
- Export rapports trimestriels (PDF auto-généré)
- Quota d'invitations Itinérant gratuit pour leurs membres (50/500/1 000 selon palier)

**Implémentation**
- Page B2B `/federations` avec formulaire contact (Resend → email John/César)
- Dashboard fédération `/federations/dashboard` (auth dédiée)
- Stripe Invoicing pour la facturation annuelle (pas de Subscription, plutôt Invoice)

**Décision** : commercial pilote = César, support tech = Claude Code + John. Démarchage progressif, 2-3 cibles pilotes en T+9 mois.

## 2.4 — Sponsoring marques sur le fil régional

**Objectif** : intégrations éditoriales contextualisées, JAMAIS bannières display.

**Format type** :
- "Carnet de Pêche × Storm — Présente le challenge bar du Finistère, juin 2026" → encart événement sur le fil 29 + page dédiée
- Partenariat 5 000-15 000 € par événement
- Maximum 1 partenariat actif simultané par dept (rareté = valeur)

**Implémentation**
- Table `sponsored_events` (titre, dept, partenaire, dates, contenu MDX)
- Card sponsorisée dans le fil avec mention "Partenaire" très visible
- Logique anti-spam : 1 card sponso max par session de scroll

**Décision** : pas avant 50k inscrits actifs. Avant ça, audience trop petite pour vendre une sponso.

---

# 🌌 Horizon long terme (T+12 mois et au-delà)

## Coach IA personnalisé

**Concept** : extension du scoring perso du sprint 7 vers un vrai assistant conversationnel.

**Forme** : chatbot dans l'app qui répond :
- "À quelle heure et où je pêche demain ?" → analyse météo + tes patterns historiques + spots à proximité + recommandation
- "Pourquoi je n'ai rien pris hier ?" → analyse conditions hier vs tes catches précédentes → diagnostic
- "Donne-moi un plan d'entraînement pour devenir bon au bar leurres" → curated guides + objectifs par session

**Stack envisagée** : Claude API (Sonnet pour le coach) + RAG sur l'historique du user + guides éditoriaux indexés.

**Coût** : ~0,01-0,05 € par conversation. À facturer ? Option : feature exclusive Itinérant ou add-on +5 €/mois.

**Décision** : à itérer en T+9 mois, dépendant de la maturité Claude API + coûts réels.

## Réalité augmentée

**Concept** : pointer son téléphone vers la mer + l'app affiche en overlay les contours bathymétriques, les courants, les zones de feeding bar à 18h.

**Faisabilité** : RA sur mer = très dur (pas de repères visuels), précision GPS limitée, batterie qui crame.

**Décision** : exploration interne en T+18 mois si la techno mûrit, sinon abandon. Pas un must-have, c'est de la story telling.

## Extension pêche eau douce

**Pourquoi pas en v1** : marché différent (étangs, rivières, lacs), réglementation différente (cartes de pêche fédération), techniques différentes (mouche, carpe, carnassier).

**Si extension** : duplication des tables avec namespace `freshwater_*` ou colonne `medium = 'sea' | 'freshwater'`. Probablement nouvelle app brand "Carnet de Pêche Eau Douce".

**Décision** : pas avant 20 000 abonnés en pêche mer. Ne pas se disperser tant qu'on n'a pas tout pris en mer.

## Internationalisation

**Marchés cibles potentiels** (ordre de priorité) :
1. **Espagne** (Côte basque + Catalogne + Galice) — culture pêche similaire, app pré-existante mais faible
2. **Portugal** — similaire
3. **Italie** (Méditerranée) — marché énorme
4. **UK** — barrière langue + concurrence Fishbrain

**Tâches** :
- i18n via `next-intl` (web) + `i18next` (mobile)
- Traductions pro EN + ES + PT + IT
- Localisation données (espèces locales : doraga vs daurade, etc.)
- SEO local
- Stripe multi-devise

**Décision** : pas avant 5 000 abonnés en France stables.

## Outils communauté avancés

- **Concours mensuels** par dept ("Le plus gros bar du Finistère en juin 2026" → leaderboard automatique)
- **Clubs/groupes privés** (table `groups`, sous-groupes du fil)
- **Carte des sorties** ("Qui pêche ce week-end et où ?" via opt-in)
- **Échange de spots** entre amis (gift d'un spot précis temporairement)
- **Système de badges** (1ère prise, 100 prises, 5 espèces différentes, etc.)

**Décision** : pilotés par traction observée post-lancement. Pas de calendrier ferme.

---

# 🪣 Backlog technique permanent

Flaggé depuis les sprints précédents, à intégrer quand pertinent :

| Item | Source | Sprint cible | Notes |
|---|---|---|---|
| **Domiciliation commerciale (pages légales)** | Sprint 7.5 (E1) | Post-sprint 8 | Remplacer l'adresse perso (627 Chemin des Impiniers, Vallauris) par une domiciliation (SeDomicilier/Kandbaz ~15 €/mois) dans les 3 pages légales |
| Désigner un médiateur de la consommation (CGU art. 14) | Sprint 7.5 (E1) | Avant sprint 9 (Stripe) | Liste sur economie.gouv.fr, ~75 €/an (CMAP, AME Conso…) |
| Markers carte colorisés par qualité | Sprint 6 | Sprint 7.5 ou post-beta | Edge Function cron + table `spot_scores` |
| Marée précise WorldTides / SHOM | Sprint 6 | Sprint 7.5 ou post-beta | Open-Meteo Marine ne fournit pas la marée astronomique |
| Coef de marée | Sprint 6 | Sprint 7.5 ou post-beta | Lié à WorldTides |
| Sync TideChart ↔ WeeklyCalendar | Sprint 6 | Backlog | Faible valeur en v1 |
| Affinement pondération solunar 40/35/25 | Sprint 6 | Post-beta | Calibrer sur vraies prises |
| Tests E2E Playwright | Sprint 4 | Sprint 11 | Setup en sprint 11 |
| Lighthouse CI | Sprint 4 | Sprint 11 | |
| Test 3G simulé `/carte` | Sprint 4 | Sprint 11 | |
| Test Safari desktop / Edge / Firefox | Sprint 4 | Sprint 11 | |
| Test accessibilité screen reader | Sprint 4 | Sprint 11 | |
| Optim `char(3)` → `varchar` department | Sprint 4 | Migration 015+ | Cosmétique, évite les `.trim()` partout |
| Polices custom dans OG images | Sprint 4 | Backlog | Satori demande TTF |
| Modération auto Claude API | CLAUDE.md §8 | Post-beta si volume reports élevé | Sinon backlog |
| **RLS-FIX-06 : durcir le RLS de `catches`** | Sprint 8 (audit A1) | Post-sprint 8 | La geom précise est lisible en accès **direct** table par ami/public sans respecter `precise_for_friends`/`reveal_precise_to_public` — le floutage n'est que dans la vue `catches_for_viewer`. Mitigé tant qu'on passe par les vues (règle CLAUDE.md #6). Déplacer le floutage au niveau ligne RLS. Touche au carnet (sprint 3) → tests de non-régression dédiés. Cf `docs/sprint-8/rls-audit.md`. |
| Validation éphémérides vs NOAA/IMCCE | Sprint 6 | Sprint 11 | Vérifier l'astronomie sur données de référence |

---

# 📊 KPIs par phase

| Phase | Période | Inscrits | Essais | Abonnés payants | MRR | NPS | Churn |
|---|---|---|---|---|---|---|---|
| Beta privée (S11) | T+11 sem | 50 | 50 | 0 (codes promo) | 0 € | ≥ 30 | n/a |
| Lancement (S21) J+14 | T+11 mois | 500 | 50 | 10 | ~60 € | ≥ 35 | n/a |
| Acquisition (S22) J+45 | T+11.5 mois | 1 500 | 200 | 50 | ~300 € | ≥ 35 | < 20 % |
| Post-lancement J+60 | T+12 mois | 3 000 | 400 | 150 | ~900 € | ≥ 40 | < 15 % |
| Gate 3 (T+6 post-launch) | T+18 mois | 30 000 | 5 000 | 5 000 | ~30 000 € | ≥ 45 | < 12 % |
| Phase 2 mature (T+24 mois) | T+30 mois | 100 000 | 15 000 | 12 000 | ~75 000 € + 25 000 € (affil + B2B + sponso) | ≥ 50 | < 10 % |

> Toutes ces cibles sont **internes**, à recalibrer à chaque gate selon le réel.

---

# 🚨 Risques principaux (toutes phases confondues)

| Risque | Probabilité | Impact | Mitigation |
|---|---|---|---|
| **Spot-de-peche.com répond avec un fil social** | Moyenne | Très fort | Vitesse d'exécution + lock-in carnet personnel + qualité communauté FR > exhaustivité |
| **FishFriender lance enfin une vraie offre FR ciblée** | Faible | Fort | Hyper-spécialisation "canne du bord mer FR" reste plus pointue |
| **Open-Meteo coupe ou paywall son API** | Faible | Très fort | Plan B SHOM (gratuit) en architecture déjà étudiée |
| **Supabase down ou changement pricing** | Faible | Très fort | Architecture transportable (Postgres standard) → fallback Neon ou self-hosted |
| **Stripe ferme le compte (CGU)** | Très faible | Fort | Backup compte Adyen ou Lemonsqueezy |
| **Apple rejette l'app v1** | Moyenne | Fort | Review prep soigné + alternative web app si rejet 3× |
| **Bug majeur fuite GPS spots privés** | Faible | Catastrophique (image, légal) | Audit RLS systématique chaque migration + bug bounty informel post-lancement |
| **César indisponible 2+ mois** | Faible | Fort | Documenter procédures community/marketing pour reprise possible par John ou freelance |
| **John burnout** | Moyenne | Catastrophique | Cadence soutenable, pas de death march, vacances obligatoires entre Gates |
| **Hiver = baisse activité pêche** | Certain (saisonnier) | Fort sur MRR | Capitaliser sur preparation matos + contenu hors saison + planning sorties printemps |

---

# 📎 Annexes

## Ce qu'on ne fera PAS en v1 (rappel)

- ❌ Pêche à pied
- ❌ Pêche en bateau
- ❌ Pêche en eau douce
- ❌ Marketplace équipement (vente directe — uniquement affiliation post-lancement)
- ❌ Marketplace guides (sauf si signal beta clair)
- ❌ Coach IA conversationnel
- ❌ Réalité augmentée
- ❌ Bathymétrie SHOM via API (utiliser tuiles statiques GEBCO/SHOM open data v1)
- ❌ Internationalisation
- ❌ Android natif sans Expo (on reste cross-platform)

## Décisions verrouillées (ne pas re-débattre sans raison forte)

- Stack : Next.js 15 + Supabase + Expo + MapLibre
- Pricing : 3 plans (gratuit / 4,90 / 9,90)
- Région DB : eu-west-3 (Paris)
- Source vérité abonnement : Stripe webhooks
- Open-Meteo Marine : v1 sans clé API, migration possible
- Floutage GPS : 1 km
- Onboarding : obligatoire, 6 écrans
- Modération : libre au lancement
- Langue v1 : FR seulement
- Tutoiement partout

## Ressources externes utiles

- Roadmap publique (à créer pour la communauté) : `/roadmap` (page marketing publique simplifiée extraite de ce doc, sans dates précises ni KPIs internes)
- Doc dev Next.js, Supabase, Stripe : voir CLAUDE.md §18
- Repo plan acquisition / community : géré par César, hors repo

---

# 📅 Calendrier prévisionnel (indicatif, à valider sprint par sprint)

> ⚠️ Hypothèse : cadence 2 semaines par sprint, sans interruption majeure. À recalibrer à chaque sprint.

| Sprint | Période estimée | Phase | Statut |
|---|---|---|---|
| **7.5** | **2026-05-21 → 2026-05-27** (3-5j) | **Hygiène + dette** | 🔴 **Obligatoire** |
| 8 | 2026-05-28 → 2026-06-10 | Fil | 🔜 |
| 9 | 2026-06-11 → 2026-06-24 | Stripe | 🔜 |
| 10 | 2026-06-25 → 2026-07-08 | Guides + SEO | 🔜 |
| 11 | 2026-07-09 → 2026-07-22 | Polish + Beta | 🔜 |
| ⛳ Gate 1 | ~2026-07-16 | Décision mobile | ❓ |
| 12-13 | 2026-07-17 → 2026-09-09 (été + buffer) | Setup mobile | 🔜 |
| 14-15 | 2026-09-10 → 2026-10-07 | Carnet + carte mobile | 🔜 |
| 16 | 2026-10-08 → 2026-10-21 | Hors ligne | 🔜 |
| 17 | 2026-10-22 → 2026-11-04 | Push | 🔜 |
| 18 | 2026-11-05 → 2026-11-18 | IAP Apple | 🔜 |
| 19 | 2026-11-19 → 2026-12-02 | Polish mobile | 🔜 |
| ⛳ Gate 2 | ~2026-12-03 | Décision lancement | ❓ |
| 20 | 2026-12-04 → 2026-12-17 | Pré-lancement | 🔜 |
| 21 | 2027-01-05 → 2027-01-18 (après trêve fêtes) | Lancement | 🔜 |
| 22 | 2027-01-19 → 2027-02-01 | Acquisition | 🔜 |
| 23 | 2027-02-02 → 2027-02-15 | Itération | 🔜 |
| Phase 2 | 2027 H2 / 2028 | Monétisation secondaire | 🔜 |
| ⛳ Gate 3 | ~2027-07 (T+6 launch) | Décision diversif | ❓ |

> Cible lancement public : **mi-janvier 2027** (saison reprise pêche post-hiver, gros coefs de marée vives-eaux, début des sorties printemps).

---

*Document à amender en continu. Toute décision majeure → update ici en plus de CLAUDE.md §9.*
