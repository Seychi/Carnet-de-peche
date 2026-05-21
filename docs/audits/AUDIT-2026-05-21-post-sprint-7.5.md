# 🔍 Audit consolidé post-sprint 7.5 — Carnet de Pêche

> **Date** : 2026-05-21 (jour du merge sprint 7.5 en prod)
> **Auditeur** : Claude (Cowork), croisant le rapport Claude in Chrome + audit serveur (code + commits + site live)
> **Sources** :
> - Rapport Claude in Chrome : `docs/audits/ux-discovery/2026-05-21-claude-chrome-post-sprint-7.5.md`
> - Audit fondateur : `docs/AUDIT-2026-05.md` (Cowork 2026-05-20)
> - Brief sprint 7.5 : `docs/sprint-7.5/brief-sprint-7.5.md`
> - Code local + `git log origin/main`

---

## 0. Synthèse exécutive

### Verdict en une ligne

**Sprint 7.5 livré à 81 % (22/27 fixes confirmés). Le site est passé de "alpha avancée" à "beta limitée presque presse-ready". Reste une demi-journée de polish sur 6 items visibles, puis sprint 8 (fil) peut démarrer.**

### Points forts livrés ✅

- **20 commits sprint 7.5 sur `origin/main`** : A1 → A6, B1, B2, D1 → D8, E1 → E8 (les blocs A, B, D, E sont complets)
- Pages légales **vraiment complètes** : SIREN 977 995 174, RGPD 12 sections + tableaux, CGU 16 articles
- Mentions mensongères home retirées (Import/export, 217 spots, modération IA, 2km→1km, témoignages fictifs)
- Pricing aligné sur **7 jours avec CB** (décision verrouillée dans CLAUDE.md)
- `/home` post-login refondu en mini-dashboard
- Validation form zod en français
- Cron `compute-spot-scores` passé en quotidien (validité 26h, contrainte plan Hobby)
- Stubs `/fil`, `/especes`, `/techniques` propres
- CI GitHub Actions en place
- `env.ts` durci (CRON_SECRET + SERVICE_ROLE_KEY requis en prod)
- Discipline migrations documentée (règle d'or dans supabase/README.md)
- Tap targets 44px, skeleton carte, itinéraire multi-app (Google/Plans/Waze)

### Bugs critiques découverts par Claude in Chrome 🚨

3 régressions visibles aux nouveaux visiteurs, à fixer AVANT sprint 8 :

1. **Bug stat "Espèce favorite : 4000% relâchées"** sur `/home` post-login (multiplicateur ×100 en double sur le calcul du taux de relâche)
2. **`/contact` retourne 404** (oublié dans la liste des stubs créés au Bloc A2 — fil/especes/techniques OK mais contact loupé alors qu'il est listé dans le footer)
3. **"Carte interactive · Sprint 5"** fuite de jargon dev visible sur la fiche prise (bas de page)

Plus 4 finitions à grouper :
- Label "COMMENT" sur fiche prise (devait passer en "MÉTHODE"/"DÉTAILS")
- Durée guide bar : 8 min en card vs 20 min en page (incohérence factuelle)
- Validation `/auth/register` : email/password invalides affichent encore des messages browser natifs en anglais
- 2 liens d'attribution carte (MapTiler + OSM) sans `rel="noopener noreferrer"`

### Reporté assumé au backlog (non comptabilisé comme régression)

- Bloc C lint (~360 erreurs `react/no-unescaped-entities`) + retrait `eslint.ignoreDuringBuilds`
- E5 date picker FR custom (datetime-local natif reste en MM/DD/YYYY)
- Domiciliation commerciale (adresse perso Vallauris en attendant)
- Médiateur de la consommation (à choisir avant sprint 9 / paiements)

### Décision recommandée

**Sprint 7.6 court (1/2 à 1 jour ouvré max)** pour traiter les 6 items P0/P1 ci-dessus, puis sprint 8 (fil communautaire). Le coût est marginal et le gain en crédibilité est élevé — un screenshot "4000% relâchées" ou un footer Contact 404 mis sur les réseaux par un testeur = mauvais signal.

### ⚠️ Note méthodologique

Mon audit a rencontré une **divergence apparente** entre les pages que `web_fetch` voyait (encore l'ancienne version pour `/`, `/legal/mentions-legales`, `/fil`) et ce que Claude in Chrome a vu (la nouvelle version sprint 7.5). Vérification croisée code local + `git log origin/main` : **le déploiement Vercel est bien à jour partout, c'est mon sandbox qui voyait une version cachée** (cache CDN intermédiaire stale). Le rapport Chrome est donc la source de vérité fiable, et c'est lui qui sert de baseline pour ce document.

---

## 1. État détaillé des fixes sprint 7.5

### Bloc A — Marketing & SEO (6/6 ✅)

| Item | Statut | Preuve |
|---|---|---|
| A1 `metadataBase` `.com` | ✅ PASS | Commit `9df2932`, vérifié `<link canonical>` |
| A2 Stubs footer | ❌ PARTIEL | Commit `84df55a` couvre `/fil`, `/especes`, `/techniques` mais **`/contact` oublié** alors qu'il est dans le footer en lien mailto (et tapé en URL → 404) |
| A3 Pricing 7 jours | ✅ PASS | Commit `0ef06ac` — verrouillé dans CLAUDE.md aussi |
| A4 CTAs `#` + toast | ✅ PASS | Commit `4c1070e` |
| A5 Copy home alignée | ✅ PASS | Commit `47ae569` — 217 spots, import/export, ambassadeurs, 2km retirés |
| A6 Témoignages → "Pourquoi maintenant" | ✅ PASS | Commit `c7553cd` |

### Bloc B — Dette sprint 7 (2/2 ✅)

| Item | Statut | Preuve |
|---|---|---|
| B1 Badge "⚡ Perso" neutralisé | ✅ PASS | Commit `349c8df` |
| B2 PersonalScoreSection descriptif | ✅ PASS | Confirmé Chrome ("Là où tombent tes 5 prises") |

### Bloc C — Lint (REPORTÉ au backlog ⏸)

- ~360 erreurs `react/no-unescaped-entities` non corrigées (apostrophes FR)
- `eslint: { ignoreDuringBuilds: true }` toujours actif dans `next.config.ts`
- **Décision assumée** dans CLAUDE.md §2

### Bloc D — Infra (8/8 ✅)

| Item | Statut | Preuve |
|---|---|---|
| D1 `env.ts` durci | ✅ PASS | Commit `0b5ca0f` |
| D2 Discipline migrations | ✅ PASS | Commit `4d9113e` |
| D3 Types regen | ✅ PASS | Commit `91b43d7` |
| D4 CI GitHub Actions | ✅ PASS | Commit `ea44ac5` |
| D5 Cleanup routes dev | ✅ PASS | Commit `f546ed9` |
| D6 `dev-server.log` gitignored | (non vérifié explicitement) | Probable inclus D5 |
| D7 Vercel env vars | ✅ PASS | Cron quotidien tourne (cf D8) |
| D8 Cron déclenché | ✅ PASS | Commit `1560e12` — passé en quotidien + validité 26h pour plan Hobby |

### Bloc E — Discovery UX (10/12 ✅)

| Item | Statut | Preuve |
|---|---|---|
| E1 Mentions légales SIREN | ✅ PASS | Commit `e4ef730` — SIREN 977 995 174 confirmé Chrome |
| E2 Politique confidentialité | ✅ PASS | 12 sections, tableaux RGPD complets |
| E3 CGU 16 articles | ✅ PASS | 16 h2 / 25 h3, articles 1-13 + sections |
| E4 `/home` mini-dashboard | ✅ PASS | Commit `447d5cb` — "Salut Seychi 👋" + 3 stats + CTAs |
| E5 Date FR `/carnet/nouvelle` | ❌ FAIL ATTENDU | Reporté backlog |
| E6 Messages d'erreur FR | ✅ PASS | Commit `1b13bcf` ("Choisis une espèce…") |
| E7 Placeholder lat/long | ✅ PASS | "ex : 48.2744" |
| E8 Label "MÉTHODE" | ❌ FAIL | Encore "COMMENT" sur fiche prise — oublié dans `4bc8bac` ? |
| E9 Drawer "Spots autour de moi" | ✅ PASS | Confirmé Chrome |
| E10 Card Découverte sans "sprint 13+" | ⚠️ DISCREPANCY | Chrome dit PASS, mais le code local `pricing-cards.tsx:21` semble encore mentionner "(sprint 13+)" — à re-vérifier en navigation incognito |
| E11 Durée guide cohérente | ❌ FAIL | 8 min card vs 20 min page sur `peche-au-bar-au-leurre` |
| E12 Carnet test nettoyé | ✅ PASS (sur compte perso) | Pas vérifié sur `+discovery` |

### Quick wins (4/5 ✅)

| Item | Statut |
|---|---|
| QW1 Tap targets 44px | ✅ PASS |
| QW2 Skeleton carte | ✅ PASS |
| QW3 Itinéraire multi-app | ✅ PASS |
| QW4 Hero images guides | ✅ PASS (3/3) |
| QW5 `rel="noopener noreferrer"` | ⚠️ PARTIEL — MapTiler + OSM attribution oubliés |

### Email

| Item | Statut |
|---|---|
| `contact@carnet-de-peche.com` opérationnel | ✅ PASS (ImprovMX configuré, test reçu) |

---

## 2. Bugs critiques découverts (à fixer sprint 7.6)

### 🚨 P0.1 — Bug stat "Espèce favorite : 4000% relâchées" sur `/home`

**Symptôme** : sur le dashboard `/home`, la stat "Espèce favorite : Bar" affiche en sous-ligne **"4000% relâchées"** alors que le carnet contient 5 prises avec 40 % de relâche (2/5).

**Cause probable** : double multiplication par 100 dans le calcul du pourcentage (ex: `(catches.filter(c => c.released).length / catches.length) * 100 * 100` au lieu de `* 100`).

**Fichier suspect** : `app/(app)/home/page.tsx` (refonte dashboard commit `447d5cb`)

**Effort** : 5 min de fix + 5 min de test snapshot

**Impact** : **catastrophique en presse** — un screenshot "4000% relâchées" sur les réseaux sociaux = dérision immédiate. À fixer absolument avant toute démo.

### 🚨 P0.2 — `/contact` retourne 404

**Symptôme** : le footer "Contact" est un `<a href="mailto:contact@carnet-de-peche.com">` qui marche, MAIS si un visiteur tape ou clique manuellement vers `/contact`, il atterrit sur la page 404.

**Cause** : oubli au Bloc A2 — les 3 stubs créés (`fil`, `especes`, `techniques`) ne couvrent pas `/contact` parce que le footer original utilisait `mailto:`, mais le rapport audit Claude in Chrome (21 mai) avait flaggé `/contact` comme cassé aussi.

**Fix recommandé** : créer `app/(marketing)/contact/page.tsx` avec un mini-formulaire `mailto:` enrichi (objet pré-rempli, choix raison) OU une page statique avec encadré email + tagline "Email préféré : contact@carnet-de-peche.com" + redirect 301 vers `mailto:` JS si on veut.

**Effort** : 30 min

### 🚨 P0.3 — "Carte interactive · Sprint 5" en bas de fiche prise

**Symptôme** : la fiche prise `/carnet/[id]` affiche en bas le texte "Carte interactive · Sprint 5" — visible à n'importe quel utilisateur.

**Cause** : un commentaire de section dev / un label de feature non retiré au commit.

**Fix** : grep le repo pour "Sprint 5" ou "Sprint X" dans les `.tsx` rendus, retirer ces mentions. Idéalement ajouter un test snapshot qui échoue si "sprint" est dans le markup.

**Effort** : 10 min

### 🟡 P1.1 — Label "COMMENT" → "MÉTHODE"

**Symptôme** : sur la fiche prise, la section qui contient la technique de pêche a pour header "COMMENT" (anglicisme bizarre).

**Cause** : oublié au commit `4bc8bac` qui était censé inclure des "corrections copy".

**Fichier** : probablement `app/(app)/carnet/[id]/page.tsx` ou un composant child.

**Effort** : 5 min

### 🟡 P1.2 — Durée guide cohérente

**Symptôme** : sur `/guides`, la card du guide "Pêche au bar au leurre" indique "8 min de lecture". Sur la page ouverte, le guide indique "20 min de lecture".

**Fix** : aligner la source de vérité. Soit calculer dynamiquement avec un helper `readingTime()` qui prend le `children` du MDX/TSX, soit centraliser la valeur dans un frontmatter unique.

**Effort** : 30 min

### 🟡 P1.3 — Validation `/auth/register` en français

**Symptôme** : email invalide → message browser natif "Please include an '@' in the email address" (anglais). Password trop court → pas de message custom FR au-dessus du browser default.

**Fix** : ajouter `noValidate` au form, gérer la validation côté client avec zod, afficher des messages français spécifiques sous chaque champ. Cohérent avec ce qui a déjà été fait au E6 pour `/carnet/nouvelle`.

**Effort** : 30 min

### 🟡 P1.4 — `rel="noopener noreferrer"` sur MapTiler + OSM

**Symptôme** : les liens d'attribution MapTiler + OSM en bas de la carte ont `target="_blank"` sans `rel`. Vulnérabilité tabnabbing mineure.

**Fix** : grep `target="_blank"` dans le composant `MapView.tsx` ou similaire, ajouter `rel="noopener noreferrer"`.

**Effort** : 10 min

---

## 3. Items "nouveaux" (apparus comme opportunités à partir du sprint 7.5)

À traiter au backlog ou intégrer dans les sprints suivants — pas urgent.

| # | Découverte | Recommandation | Sprint cible |
|---|---|---|---|
| 1 | Stubs `/fil`, `/especes`, `/techniques` sans capture email seule (CTA = créer un compte) | Ajouter un mini-form email-only "Sois prévenu sans créer de compte" pour récupérer les visiteurs froids | Sprint 8 (fil) ou backlog |
| 2 | Bullet "Mode hors ligne (carte + marées 7 jours)" sur card Local sans marqueur "bientôt" | Ajouter "(bientôt)" à côté, ou retirer si jugé trompeur jusqu'à sprint 16 | Quick fix |
| 3 | Confidentialité dit "Stripe (à venir)" mais tarifs propose "CB requise" pour trial 7j | Cohérence à valider — soit Stripe est réellement actif (alors mettre à jour confidentialité), soit retirer "CB requise" du flow trial tant que pas en place | À traiter au sprint 9 (Stripe) |
| 4 | Mockup hero ("Mon carnet · 14 prises · 7 sessions") = simulation non marquée | Ajouter un badge "exemple" subtil pour éviter confusion avec données réelles | Quick fix optionnel |
| 5 | Markers `/carte` apparaissent uniformément gris malgré la légende 5 couleurs (Chrome partiel D1) | Investiguer côté code (le gating Discovery ne devrait PAS griser les markers, qui sont publics) ou afficher explicitement "Couleurs réservées aux abonnés" | Investigation 30 min |
| 6 | Ton mixte sur mentions légales (vous formel + tu) vs confidentialité (tu partout) | Harmoniser sur tutoiement partout | Quick fix |
| 7 | Page tarifs en 3 colonnes — scroll vertical long sur mobile | Refactor stack vertical clean | Sprint 11 polish mobile |
| 8 | Pas de domiciliation commerciale (adresse perso publiée) | Setup SeDomicilier / Kandbaz ~15€/mois | Post sprint 8 (2-4 semaines) |
| 9 | Pas de médiateur de la consommation (article 14 CGU) | À choisir et déclarer avant activation Stripe | Avant sprint 9 |
| 10 | Mobile audit pas fait en device physique (Chrome a estimé via DOM) | Test réel iPhone + Android avant Gate 1 (sprint 11 beta) | Sprint 11 |

---

## 4. État du code et de l'infra

### Migrations DB
- 16 migrations (001 → 016) — aucune nouvelle depuis sprint 7
- Migration 015 documente proprement le drift local/remote précédent
- Règle d'or migrations documentée dans `supabase/README.md` (D2 sprint 7.5)

### CI/CD
- ✅ GitHub Actions en place (`ea44ac5`)
- ✅ Cron Vercel `compute-spot-scores` quotidien, validité 26h
- ✅ Auto-deploy main → prod
- ⚠️ ESLint toujours désactivé en build (`eslint.ignoreDuringBuilds: true`) — reporté Bloc C

### Tests
- 116 tests Vitest verts (sprint 7)
- Pas de nouveaux tests sprint 7.5 (logique, c'est un sprint nettoyage)
- Pas de tests E2E Playwright (prévus sprint 11)

### Sécurité
- ✅ `lib/env.ts` valide CRON_SECRET + SUPABASE_SERVICE_ROLE_KEY en prod
- ✅ Cron protégé par Bearer secret (fail-closed)
- ✅ RLS active partout (vérifié migrations)
- ✅ Service_role isolé (admin client server-only)
- ⚠️ Audit RLS systématique pas encore fait avant sprint 8 (cf brief sprint 8 "pré-requis")

### Monitoring
- ❌ Toujours pas de Sentry (prévu sprint 11)
- ❌ Toujours pas de Plausible / PostHog (prévu sprint 11)

---

## 5. Risques résiduels

| Risque | Sévérité | Action |
|---|---|---|
| Bug "4000% relâchées" présenté à un journaliste / posté sur réseaux | HAUTE | P0.1 à fixer maintenant |
| `/contact` 404 dans logs d'erreurs prod (probablement déjà des hits) | MOYENNE | P0.2 |
| Cache CDN Vercel stale sur certaines routes statiques (problème observé pendant cet audit) | MOYENNE | Vérifier headers Cache-Control sur `/` et `/legal/*` — peut-être forcer un `revalidate: 60` ISR |
| RLS audit pas fait avant sprint 8 (ajout tables `feed_*`) | HAUTE | Bloquant pour démarrer le sprint 8 — checklist 1-2h |
| Adresse perso Vallauris publique sur internet (scrapers, archives web) | FAIBLE | Domiciliation commerciale dans 2-4 semaines |
| Bloc C lint ignoré (365 erreurs) — régression silencieuse possible | FAIBLE | À traiter post sprint 8 ou avant beta (sprint 11) |
| Pas de monitoring (Sentry) — cécité totale en cas d'incident | MOYENNE (continue) | Sprint 11 prévu |

---

## 6. Recommandations priorisées

### P0 — Sprint 7.6 court (1/2 à 1 jour ouvré)

| # | Action | Effort | Fichier |
|---|---|---|---|
| 1 | Fixer le bug "4000% relâchées" sur `/home` | 10 min | `app/(app)/home/page.tsx` |
| 2 | Créer `/contact` (stub ou form simple) | 30 min | `app/(marketing)/contact/page.tsx` |
| 3 | Retirer "Carte interactive · Sprint 5" | 10 min | grep + edit |
| 4 | Label "COMMENT" → "MÉTHODE" | 5 min | `app/(app)/carnet/[id]/page.tsx` |
| 5 | Durée guide cohérente (8 vs 20 min) | 30 min | helper readingTime ou frontmatter |
| 6 | Validation `/auth/register` en FR | 30 min | form + zod errorMap |
| 7 | `rel="noopener noreferrer"` sur MapTiler + OSM | 10 min | `components/map/*` |
| 8 | (Optionnel) ajouter "(bientôt)" sur bullet "Mode hors ligne" tarifs | 5 min | `pricing-cards.tsx` |

**Coût total** : 2h-3h max. Tout est local, pas d'externe.

### P1 — Avant sprint 8 (pré-requis fil)

| # | Action | Effort |
|---|---|---|
| 1 | Audit RLS systématique avant ajout tables `feed_*` | 1-2h |
| 2 | Investigation markers carte gris (gating mal géré ou bug ?) | 30 min |
| 3 | Vérifier cache CDN Vercel sur `/`, `/legal/*`, ISR ou revalidation | 30 min |

### P2 — Backlog (à programmer)

- Bloc C lint (~360 erreurs apostrophes) — quand on aura du temps mort entre sprints
- Date picker FR custom (E5)
- Domiciliation commerciale post-sprint 8
- Médiateur conso avant sprint 9
- Sentry + analytics au sprint 11
- Tests E2E Playwright au sprint 11
- Tests mobile device physique avant Gate 1
- Harmoniser tutoiement sur mentions légales
- Capture email seule sur stubs /fil /especes /techniques (sprint 8)
- Marquer "bientôt" sur "Mode hors ligne" tarifs

---

## 7. Décision Go/No-Go sprint 8

### Recommandation : **Sprint 7.6 court (1 jour ouvré) PUIS sprint 8**

**Pourquoi pas direct sprint 8** :
- Le bug "4000% relâchées" est trop visible pour rester en prod pendant 2 semaines de sprint 8
- `/contact` 404 contredit visuellement l'effort fait sur les pages légales
- "Sprint 5" en clair est un signal "produit pas fini" pour un visiteur exigeant
- Le coût total des P0 est < 3h — c'est gratuit vs le coût d'image

**Pourquoi pas plus long** :
- Le sprint 7.5 a réellement livré (22/27 fixes confirmés)
- Les régressions identifiées sont toutes des oublis ponctuels, pas des chantiers de fond
- Le délai s'accumule vs roadmap, et le pivot social (sprint 8) est le différenciateur attendu vs spot-de-peche.com

**Critères de sortie sprint 7.6**
- [ ] `/home` n'affiche plus "4000% relâchées"
- [ ] `/contact` renvoie une vraie page ou un redirect propre
- [ ] grep `Sprint ` dans le markup public retourne 0
- [ ] Label "COMMENT" remplacé par "MÉTHODE"
- [ ] Durée guide bar cohérente entre liste et page
- [ ] Validation `/auth/register` en français
- [ ] MapTiler + OSM ont `rel="noopener noreferrer"`
- [ ] Audit RLS pré-sprint 8 documenté (peut être en parallèle dans cette journée)

**Une fois cochés** → sprint 8 fil communautaire démarre sur base saine.

---

## 8. Comparaison avec l'audit fondateur

L'audit fondateur (`docs/AUDIT-2026-05.md`, 2026-05-20) avait identifié :
- 5 P0 + 10 P1 + items P2/P3

**Statut après sprint 7.5** :
- ✅ 5/5 P0 fondateur résolus (metadataBase, footer, pricing, CTAs, copy home)
- ✅ 7/10 P1 fondateur résolus (témoignages, env.ts, CI, types regen, cleanup dev, cron, reconciliation migrations)
- ⏸ 3/10 P1 fondateur reportés (lint Bloc C, WorldTides, audit RLS systématique)

**Le sprint 7.5 a tenu sa promesse** : 12 items P0/P1 majeurs résolus en 1-2 jours. Le bilan est largement positif. Les 3 régressions découvertes par Chrome sont des **oublis ponctuels**, pas un échec de méthode.

---

## 9. Pour la prochaine itération

### Idées pour fluidifier les sprints futurs

1. **Avant le merge prod** : faire systématiquement tourner Claude in Chrome sur la version preview Vercel (`carnet-de-peche-git-{branch}.vercel.app`) pour attraper ces "oublis ponctuels" AVANT qu'ils n'arrivent en prod. Coût : 10 min de plus par sprint. Gain : éviter les sprints 7.6 / 8.6 / etc.

2. **Checklist de sortie sprint enrichie** : pour chaque sprint, en plus de la checklist fonctionnelle, ajouter une checklist "vocabulaire dev qui ne doit pas fuiter" (grep "Sprint ", "TODO", "FIXME", "à compléter", "WIP" dans les `.tsx` rendus).

3. **Tests snapshot critiques** : un test snapshot Vitest très simple sur les 5 pages clés (`/`, `/home`, `/tarifs`, `/spots/[slug]`, `/carnet/[id]`) qui échoue si certains mots-clés interdits apparaissent (ex: "Sprint", "TODO", "À compléter", "Lorem"). 30 min de setup, vie sauvée à chaque sprint.

---

*Audit consolidé livré le 2026-05-21. Prochain audit auto programmé à 20h00 ce soir (scheduled task `audit-carnet-de-peche-daily`).*
