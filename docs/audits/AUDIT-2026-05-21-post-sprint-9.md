# 🔍 Audit UX / site live post-sprint 9 — Carnet de Pêche

> **Date** : 2026-05-21 (soir, après finalisation code sprint 9)
> **Auditeur** : Claude (Cowork), navigation Chrome en direct sur `www.carnet-de-peche.com`
> **Périmètre** : pages publiques uniquement (home, tarifs, auth, carte, spots, fiche spot, guides, légales, contact, 404). Pas d'auth, pas de carnet, pas de fil en mode connecté.
> **Branche en prod** : `main` = sprint 7.6 + sprint 8 mergés. Sprint 9 (Stripe) code-complet sur `sprint-9`, pas encore déployé.
> **Audits précédents** :
> - Fondateur : `docs/AUDIT-2026-05.md` (20/05)
> - Daily 21/05 matin : `docs/audits/AUDIT-2026-05-21.md`
> - Post-sprint-7.5 : `docs/audits/AUDIT-2026-05-21-post-sprint-7.5.md`
>
> **Décisions John post-audit (2026-05-21)** :
> - **P0.5 médiateur conso** : assumé, pas de souscription. Promesse retirée de la CGU Art. 14 (commit séparé). Risque résiduel documenté dans `docs/sprint-9.5-cleanup.md` §7.1.
> - **P1.1 durée guide bar** : assumée non-bloquante. À traiter naturellement au sprint 10 (Guides).

---

## 0. Synthèse exécutive

### Verdict en une ligne

**Le site est plus mature qu'au précédent audit (sprint 7.6 a bien tenu, sprint 8 a livré le fil), MAIS le sprint 8 a introduit deux régressions SEO significatives, le sprint 9 n'a pas pu réparer la durée guide bar incohérente, et un travers SEO majeur reste à investiguer : sur 6 pages publiques sur 10, les balises `<meta>` (description, og:*, twitter:*) sortent en `<body>` au lieu de `<head>`.**

### Top 3 alertes 🚨

🚨 **P0 SEO — Balises meta dans `<body>` au lieu de `<head>` sur la home et 5 autres pages**
Mesuré en console : `/`, `/tarifs`, `/auth/login`, `/contact`, `/especes`, `/techniques`, `/guides/peche-au-bar-au-leurre` ont `headMetas: 3` (`charset`, `viewport`, `next-size-adjust`) et `bodyMetas: 9` (description, og:title, og:description, og:site_name, og:locale, og:type, twitter:card, twitter:title, twitter:description). À l'inverse, `/spots` et `/spots/[slug]` ont `headMetas: 15-16` et `bodyMetas: 0` — tout est correctement dans le head.
**Conséquence** : Facebook / LinkedIn / Twitter / certains crawlers n'acceptent pas les `<meta property="og:*">` rendus hors du `<head>`. Les previews sociales pour la home et les pages clés sont probablement cassées. À vérifier avec le Facebook Sharing Debugger et le Twitter Card Validator (`cards-dev.twitter.com/validator`).
**Hypothèse code** : Les pages qui utilisent `generateMetadata` async (spots, fiche spot) marchent. Celles qui utilisent `export const metadata` statique ne ressortent que partiellement en head. Cause possible : `metadata.title` static qui rentre en conflit avec le `title` du `RootLayout`, ou une extension navigateur du poste de dev qui réécrit le DOM (vérifier en navigation privée sans extension).

🚨 **P0 SEO — `/fil` dans le sitemap mais redirige vers `/auth/login`**
`app/(app)/fil/page.tsx` (commit `b92eb55`, sprint 8) fait `redirect('/auth/login?redirect=/fil')` quand l'utilisateur n'est pas connecté. Or `/fil` est listé dans `app/sitemap.ts` (constaté dans `/sitemap.xml`). Googlebot tombe donc sur `/auth/login`, soit un soft-404. Le footer pointe également vers `/fil` ("Fil régional") → visiteurs froids redirigés vers l'auth sans contexte.
**Régression vs sprint 7.5** : le stub publique de `/fil` (créé au bloc A2) a été supprimé sans remplacement. Pas de teaser, pas de capture email, pas de mention "exclusif aux abonnés".
**Fix** : soit retirer `/fil` du sitemap + footer pour les anonymes, soit créer une page publique de teaser (similaire à `/especes`, `/techniques`).

🚨 **P0 UX — Markers de la carte invisibles**
Sur `/carte`, le compteur sidebar indique "5 spots" (gating Discovery, cohérent), mais `document.querySelectorAll('.maplibregl-marker').length === 0` quel que soit le zoom (France entière, Bretagne, Finistère zoomé). Pour un visiteur Discovery, l'écran reste vide même sur la zone Bretagne où sont concentrés les 10 spots seed.
**Hypothèse** : les markers sont rendus mais filtrés par CSS (`opacity:0`, `visibility:hidden`) ou les `LngLat` ne sont pas accessibles côté client en gating Discovery. À confirmer dans `components/map/MapView.tsx` (ou équivalent).
**Bonus** : la carte est entièrement noire au chargement initial sur `/carte` ET sur la fiche spot — il faut interagir (clic, zoom, etc.) pour qu'elle se rende. Bug de timing d'init `map.resize()`.

### ⚠️ Top 5 alertes P1

⚠️ **P1 — Durée guide bar incohérente (déjà flaggée le 21/05 matin, jamais fixée)**
- `/guides` (card) : "8 min de lecture"
- `/guides/peche-au-bar-au-leurre` (page) : "20 min de lecture"
Bug E11 du sprint 7.5 reporté au sprint 7.6, **toujours présent** en sprint 9 prod.

⚠️ **P1 — `Données de marée non disponibles` sur Pointe du Raz**
La Pointe du Raz est exposée plein ouest sur l'Atlantique. Open-Meteo Marine fournit normalement les marées pour la côte atlantique française. Soit l'appel API rate sur cette coordonnée précise, soit la `tide_cache` est vide pour ce spot, soit le composant rend "non disponibles" en cas d'erreur silencieuse côté serveur. **Effet visiteur** : c'est le spot le plus iconique de la sélection, et il manque LA donnée principale qu'on promet sur la home ("Marées + météo pour ta ville").

⚠️ **P1 — Titres `<title>` des pages auth génériques**
`/auth/login` (avec ou sans `?tab=register`), `/auth/login?tab=register` et `/inexistant-404` ont tous le même `<title>` : `"Carnet de Pêche — Le réseau des pêcheurs à la canne du bord"` (héritage layout). Pour les analytics, pour le SEO et pour l'utilisateur multi-onglets, il faut un title spécifique ("Connexion · Carnet de Pêche", "Inscription · Carnet de Pêche", "Page introuvable · Carnet de Pêche").

⚠️ **P1 — Mockups marketing non marqués "exemple"**
Trois blocs visuels en home contiennent des chiffres et noms inventés qui peuvent passer pour de la data réelle :
- Hero phone : "Mon carnet · 14 prises · 7 sessions ce mois", "Bar · 67 cm · 06 mai · Coef. 88 · Shad kaki"
- "Mon année 2026 · 14 sessions · 23 prises", "PLUS BELLE PRISE · Bar · 71 cm · 12 avril · Pointe du Raz"
- Bloc communauté : Yann Le Bras, Sophie Marec, Loïc Briand avec photos initiales et prises chiffrées
Le commentaire `pas de témoignages réels` du sprint 7.5 (bloc A6) a remplacé les "vrais" témoignages par un bloc "Pourquoi maintenant", **mais** les 3 prises chiffrées du bloc Communauté ressemblent toujours à des contenus de membres existants. À soit marquer "Exemple" subtilement, soit retirer.

⚠️ ~~**P1 — Médiateur de la consommation non désigné**~~ — **assumé non-bloquant, décision John 2026-05-21**. La promesse de désignation a été retirée de la CGU Art. 14 (renommé « Règlement des litiges »). Risque résiduel L612-1 documenté dans `docs/sprint-9.5-cleanup.md` §7.1.

### Reporté assumé / backlog

- Bloc C lint (~360 erreurs `react/no-unescaped-entities`) — toujours `eslint.ignoreDuringBuilds: true`. Cohérent avec la décision sprint 7.5.
- Sentry + Plausible + PostHog — prévus sprint 11.
- Date picker FR custom (E5) — backlog.
- Tests E2E Playwright — sprint 11.
- Audit mobile sur device physique — sprint 11.

### Décision recommandée

**Avant de merger `sprint-9` sur `main`** : faire un sprint 9.5 court (1 jour ouvré) couvrant les **3 P0** ci-dessus + médiateur conso + 2-3 P1 hauts (titres auth, durée guide, marées Pointe du Raz). Le détail des tickets actionnables est dans `docs/sprint-9.5-cleanup.md`.

**Pourquoi pas direct sprint 10 (Guides)** :
- Le bug "metas in body" est silencieux mais sabote 100% des partages sociaux home / tarifs (les pages les plus partagées potentiellement).
- `/fil` dans sitemap → soft-404 = perte de jus SEO sur 24 URLs (sitemap entier impacté).
- Carte sans markers visibles = la promesse "Plus la communauté pêche, plus la carte est précise" est invisible pour le visiteur froid.
- Sprint 9 ne peut pas activer Stripe en prod sans le médiateur conso (risque juridique direct).

---

## 1. Inventaire des findings (par sévérité)

### P0 — Bloquants avant Stripe live ou avant SEO push

| # | Finding | Page(s) | Source | Fix estimé |
|---|---|---|---|---|
| P0.1 | Metas `description`, `og:*`, `twitter:*` rendues en `<body>` au lieu de `<head>` | `/`, `/tarifs`, `/auth/login`, `/contact`, `/especes`, `/techniques`, `/guides/peche-au-bar-au-leurre` | Console : `bodyMetas: 9 / headMetas: 3` | 2-3h investigation + 1h fix |
| P0.2 | `/fil` redirige vers `/auth/login` mais reste dans le sitemap | `/fil`, `app/sitemap.ts`, footer | `app/(app)/fil/page.tsx:14` | 1h (stub publique ou retrait sitemap) |
| P0.3 | Markers de la carte non rendus (0 marker / `5 spots` annoncés) | `/carte` | `document.querySelectorAll('.maplibregl-marker').length === 0` | 2h investigation, probable bug CSS ou serializer côté Discovery |
| P0.4 | Carte noire au chargement initial (canvas vide) | `/carte`, `/spots/[slug]` | Confirmé visuellement, débloque sur interaction | 1h (probable `map.resize()` après mount) |
| ~~P0.5~~ | ~~Médiateur conso non désigné dans CGU Art. 14~~ — **assumé, promesse retirée de la CGU** | ~~/legal/cgu~~ | Décision John 2026-05-21 | ✅ commit séparé |

### P1 — À fixer avant ou en début de sprint 10

| # | Finding | Page(s) | Source | Fix estimé |
|---|---|---|---|---|
| ~~P1.1~~ | ~~Durée guide bar incohérente (8 vs 20 min)~~ — **assumé non-bloquant, sera traité au sprint 10** | ~~/guides~~ | Décision John 2026-05-21 | — |
| P1.2 | Marées non disponibles sur Pointe du Raz | `/spots/pointe-du-raz` | "Données de marée non disponibles pour ce spot" | 2h (debug Open-Meteo Marine + cache) |
| P1.3 | Title pages `/auth/*` et 404 = title layout par défaut | `/auth/login`, `/auth/login?tab=register`, `/inexistant-404` | Console : `document.title` non spécialisé | 30 min (3 fichiers, `export const metadata` ou `generateMetadata`) |
| P1.4 | Mockups home non marqués "exemple" (Yann/Sophie/Loïc + chiffres carnet) | `/` | Body text constaté | 30 min copy + badge "Exemple" |
| P1.5 | `/inexistant-404` : pas de header/footer, title générique | `/inexistant-404` | Capture écran | 30 min (`app/not-found.tsx`) |
| P1.6 | Tab state désynchronisé sur `/auth/login?tab=...` | `/auth/login` | Switch onglet ne met pas à jour `?tab=login` | 15 min (router.replace) |
| P1.7 | Drawer "Spots autour de moi" sans fallback ville | `/carte` | "Géolocalisation refusée..." → impasse | 1h (input ville + nearby_spots) |
| P1.8 | "Lune au zénith" 18:00-20:00 à la Pointe du Raz le 21/05 — invraisemblable astronomiquement | `/spots/pointe-du-raz` (Meilleurs moments) | Visuel confirmé | 30 min vérif algo suncalc |

### P2 — Polish, à programmer dans le sprint 10 ou plus tard

| # | Finding | Page(s) | Effort |
|---|---|---|---|
| P2.1 | Typo « Vagues Scelerats » → « Vagues scélérates » (féminin pluriel + accents) | `/spots/pointe-du-raz` (Dangers) | 5 min |
| P2.2 | Hero images 2/3 absentes sur `/guides` (cards Bar et Dorade royale en navy uni) | `/guides` | 1h (assets visuels) |
| P2.3 | "Modération IA prévue post-beta" sur home : promesse non datée + non roadmappée | `/` | 15 min copy |
| P2.4 | "Export GPX/JSON prévu cette année" : engagement public sans ticket roadmap | `/` | 15 min copy + ticket roadmap |
| P2.5 | "100+ spots ciblés · couverture France entière" sur home : actuellement 10 spots Bretagne seed uniquement | `/` | À reformuler "objectif lancement" plus explicitement |
| P2.6 | `/especes`, `/techniques` stubs : pas de capture email seul (visiteurs froids → register direct) | `/especes`, `/techniques` | 1h (mini-form Resend) |
| P2.7 | Toast "3 spots gratuits par département" et toast géoloc se superposent (z-index) | `/carte` | 15 min |
| P2.8 | Liens sociaux footer pointent vers `instagram.com/carnetdepeche`, `tiktok.com/@carnetdepeche`, `youtube.com/@carnetdepeche` — comptes César, à vérifier qu'ils existent et publient | Footer | À vérifier avec César |
| P2.9 | Confidentialité dit "Stripe Inc. (à venir)" — à mettre à jour quand sprint 9 sera mergé | `/legal/confidentialite` | 5 min, simultané au merge sprint-9 |
| P2.10 | "Apple OAuth · Bientôt" affiché : promesse implicite, à vérifier date | `/auth/login` (tab register) | À décider |
| P2.11 | Filtre département `/spots` : `Tous les départements` uniquement (pas de pré-sélection / empty state à tester) | `/spots` | À tester quand >1 dept seedé |
| P2.12 | "Coordonnées approchées — abonne-toi pour le GPS précis" : très bon gating, mais pourrait offrir un "voir d'abord 1 spot précis gratuit pour comprendre la valeur" | `/spots/[slug]` | UX A/B test |

### Non-findings (re-vérifiés, OK)

- ✅ `metadataBase` sur `.com` (sprint 7.5 A1)
- ✅ Pages légales complètes, SIREN 977 995 174 visible
- ✅ Tutoiement strict CGU (24/0) et Confidentialité (23/0)
- ✅ Validation FR sur form inscription (3 messages confirmés)
- ✅ Footer `/contact` opérationnel (vraie page créée sprint 7.6, plus 404)
- ✅ Itinéraire GPS multi-app (Google Maps / Plans / Waze) — QW3 sprint 7.5
- ✅ Robots.txt et sitemap.xml structurés correctement (24 URLs)
- ✅ OG images dynamiques `/og/spots` et `/og/spot/[slug]` rendues côté serveur (1200×630, beau design)
- ✅ JSON-LD `ItemList` sur `/spots`, `Place` sur fiche spot
- ✅ Page 404 charmante avec copy "Cette page a glissé du hameçon" + 2 CTAs
- ✅ Bloc "Meilleurs moments" sur fiche spot : 4 créneaux/jour avec scoring + qualitatif + justification astronomique (sprint 6 OK)
- ✅ Score créneau "Maintenant" mis en avant (UX claire)
- ✅ Aucune fuite "Sprint X" ou TODO/FIXME observée dans les markup publics
- ✅ Pas de placeholder `[À COMPLÉTER]` détecté
- ✅ Social icons footer : `aria-label`, `target="_blank"`, `rel="noopener noreferrer"`
- ✅ Page contact riche (carte mail + 3 cards motifs : Question / RGPD / Bug)
- ✅ Sprint 7.5 fixes E1-E12 sont toujours en place

---

## 2. Détail des P0

### P0.1 — Metas SEO dans `<body>`

**Symptôme**
Sur la home, console retourne :
```
{
  headMetas: 3,                  // charset, viewport, next-size-adjust
  bodyMetas: 9,                  // description + og:* (5) + twitter:* (3)
  canonical: 'MISSING',
  ogImage: 'MISSING',
  ogUrl: 'MISSING'
}
```

**Pages touchées (confirmées)** : `/`, `/tarifs`, `/auth/login`, `/contact`, `/especes`, `/techniques`, `/guides/peche-au-bar-au-leurre`.

**Pages OK** : `/spots`, `/spots/pointe-du-raz` (les pages qui utilisent `generateMetadata` async retournent `headMetas: 15-16`).

**Hypothèses à tester (par ordre de probabilité)**
1. Conflit entre la `title` statique de `RootLayout` (`app/layout.tsx`) et les `title` enfants — Next.js peut décider de re-rendre les metas en client si le merge échoue.
2. Une extension navigateur (password manager, traducteur) déplace les nodes au-dessus du `<head>` après hydration. **Re-vérifier en navigation privée + sans extension.**
3. Un composant client utilisateur (ex: `<Toaster>`, `<Header>`) insère un nœud qui clôt le `<head>` prématurément côté serveur.

**Diagnostic conseillé**
1. Comparer `view-source:https://www.carnet-de-peche.com/` (HTML SSR brut) entre `/` (KO) et `/spots` (OK). Si les metas sont bien dans `<head>` côté SSR brut, c'est un problème client side.
2. Tester dans Chrome incognito **sans extension** : si les metas reviennent dans le `<head>`, c'est une extension du poste de dev.
3. Outils crawler : Facebook Sharing Debugger (`developers.facebook.com/tools/debug/?q=https://www.carnet-de-peche.com`) et Twitter Card Validator. Ce sont les bots Facebook/Twitter qui valident, pas Chrome.

**Action immédiate** : reproduire en incognito **avant** de modifier le code. Si OK en incognito → c'est une fausse alerte côté audit (mais à documenter pour ne pas repartir en chasse). Si KO en incognito → fix à investiguer.

### P0.2 — `/fil` dans sitemap mais redirigé

**Constat**
- `/sitemap.xml` contient `<loc>https://www.carnet-de-peche.com/fil</loc>` (priorité 0.5).
- `app/(app)/fil/page.tsx` ligne 14 : `if (!user) redirect('/auth/login?redirect=/fil')`.
- Footer `Footer.tsx` lien "Fil régional" → `/fil`.

**Impact SEO** : Googlebot suit le sitemap, atterrit sur `/auth/login`. Sur cette page le contenu est minimal (form login), pas d'info sur le fil. Google interprète comme soft-404, **dégradation du jus SEO du domaine entier**.

**Impact UX** : un visiteur froid qui scrolle le footer voit "Fil régional", clique, atterrit sur l'auth → pas de teaser, pas de capture, pas de promesse claire.

**Régression sprint 8** : le commit `b92eb55` (bloc F sprint 8) a remplacé le stub publique de `/fil` (commit `84df55a` sprint 7.5 bloc A2) par une route protégée. La route `/fil/[department]` est aussi protégée, donc tout le `/fil/*` est anonyme-hostile.

**Fix recommandé** :
- **Option A (minimale)** : retirer `/fil` du sitemap + footer "Fil régional" tant qu'on n'a pas de version publique. 15 min.
- **Option B (sprint 9.5)** : créer `app/(marketing)/fil/page.tsx` (priorité haute en route group) qui montre un teaser : exemples de posts anonymisés, capture email "Sois prévenu quand le fil sera ouvert aux non-abonnés" ou direct "Crée ton compte pour rejoindre le fil de ton département". Conserve le SEO et capte des leads froids. 2h.
- **Option C (post-sprint 11)** : ouvrir partiellement la lecture du fil aux non-abonnés (déjà couvert par RPC `get_feed_page` + RLS tier-gated, juste à exposer une route publique read-only). Demande arbitrage stratégique.

### P0.3 — Markers carte invisibles

**Constat**
- `document.querySelectorAll('.maplibregl-marker').length === 0` sur `/carte` à tous les zooms.
- Compteur sidebar : "5 spots" (cohérent avec gating Discovery : `nearby_spots` retourne 3 par dept × 2 dept seedé = potentiellement plus, mais limité à 5).
- Légende couleurs présente (Exceptionnelle, Très Bonne, Bonne, Moyenne, Faible).

**Hypothèses (ordre)**
1. Les markers sont rendus mais avec une `opacity: 0` ou `visibility: hidden` pour les visiteurs Discovery. Probable : sprint 7 mentionne que le scoring perso n'a pas de multiplicateur démontrable et le badge "⚡ Perso" a été neutralisé — peut-être que la couleur a été neutralisée aussi sans le `display`.
2. Le commit `0bcb0cf` du 20/05 ("retire position:relative inline sur les marqueurs") a peut-être cassé le rendu. À examiner.
3. Les markers utilisent un `<canvas>` overlay qui ne se rend pas. (Mais on a `allCanvasCount: 1` qui est le canvas MapLibre.)

**Action** : ouvrir `components/map/MapView.tsx` (ou le composant équivalent) et chercher la logique de rendu des markers. Le sprint 7 mentionne "markers carte colorisés". Le finding #5 de l'audit post-sprint-7.5 disait déjà "Markers /carte apparaissent uniformément gris". Avec le commit `0bcb0cf`, ils sont peut-être devenus invisibles.

### P0.4 — Carte noire au chargement initial

**Constat** : au premier `navigate('/carte')`, le canvas MapLibre est rempli d'une couleur uniforme (gris/teal foncé). Idem sur la mini-carte de `/spots/[slug]`. Un clic, un zoom ou même un resize de fenêtre suffisent à déclencher le rendu correct.

**Diagnostic typique** : le conteneur du MapLibre a une `height: 0` au mount, le `map.resize()` n'est pas appelé après que le layout définisse une hauteur. Solution standard : observer le ResizeObserver du conteneur et appeler `map.resize()` à chaque changement.

**Fix attendu** : 5-10 lignes dans le composant `MapView`. 1h.

### P0.5 — Médiateur de la consommation

**Constat exact** (Article 14 CGU, repris):

> Conformément à l'article L612-1 du Code de la consommation, en cas de litige et après une réclamation préalable infructueuse auprès de l'éditeur (contact@carnet-de-peche.com), tu peux saisir gratuitement un médiateur de la consommation. **Le médiateur compétent sera désigné par l'éditeur au plus tard lors de l'activation des abonnements payants, et mentionné ici.**

**Action John** :
1. Souscrire à un médiateur de la consommation (FEVAD propose un médiateur dédié e-commerce, sinon Médiateur national de la consommation ou ANM Conso). Coût ~50-150€/an pour solo.
2. Mettre à jour Article 14 CGU avec le nom, l'adresse postale et le site web du médiateur.
3. Vérifier que la mention du médiateur figure aussi sur la page de paiement (`/tarifs` ou checkout Stripe), c'est une obligation L616-1.

**Bloquant** : tant que ce point n'est pas réglé, **ne pas activer Stripe en mode LIVE**. C'est une obligation légale, pas une best practice.

---

## 3. État vs. audits précédents

### Items P0 fondateur (20/05) — bilan définitif

| Item | 20/05 | 21/05 matin | 21/05 soir |
|---|---|---|---|
| P0.1 `metadataBase` `.com` | 🔴 | 🔴 | ✅ |
| P0.2 Footer stubs | 🔴 | 🔴 | ✅ (fil/especes/techniques/contact) |
| P0.3 Pricing 7j | 🔴 | 🔴 | ✅ verrouillé |
| P0.4 CTAs `#` + toast sprint 4 | 🔴 | 🔴 | ✅ |
| P0.5 Copy home alignée | 🔴 | 🔴 | ✅ majeur ; 3 promesses encore (P2.3, P2.4, P2.5) |

### Items P0 sprint 7.5 — bilan post-7.6

| Item | Post-7.5 | Sprint 7.6 | Constat 21/05 soir |
|---|---|---|---|
| Bug "4000% relâchées" `/home` | 🔴 | ✅ corrigé | non testé (auth requise) |
| `/contact` 404 | 🔴 | ✅ corrigé | ✅ confirmé |
| "Carte interactive · Sprint 5" | 🔴 | ✅ corrigé | ✅ confirmé (grep "Sprint" = 0) |
| Label "COMMENT" | 🟡 | ✅ corrigé | non testé |
| Durée guide bar cohérente | 🔴 | ❌ reporté | ⚪ **assumé non-bloquant** (décision 21/05) |
| Validation `/auth/register` FR | 🔴 | ✅ corrigé | ✅ confirmé (3 messages) |
| MapTiler / OSM `rel` | 🔴 | ? | non re-vérifié explicitement |

### Items "nouveaux" sprint 7.5 — bilan

| # | Discovery | Statut sprint 9 |
|---|---|---|
| 1 | Capture email-only sur stubs | ⏸ backlog (P2.6) |
| 2 | Bullet "Mode hors ligne (bientôt)" | non re-vérifié |
| 3 | Confidentialité "Stripe (à venir)" | encore "à venir" → à mettre à jour au merge sprint-9 |
| 4 | Mockups marqués "exemple" | ⏸ backlog (P1.4) |
| 5 | Markers carte gris | ⚠️ pire, maintenant invisibles (P0.3) |
| 6 | Tutoiement légales harmonisé | ✅ corrigé (24/0 et 23/0) |
| 8 | Domiciliation commerciale | ⏸ backlog |
| 9 | Médiateur conso | ⚪ assumé, promesse retirée de la CGU (décision 21/05) |

### Nouveautés sprint 8 (fil) constatées en navigation publique

- `/fil` route ajoutée (avec auth gate) — **régression SEO** (P0.2)
- `app/(app)/fil/[department]/page.tsx` et `app/(app)/u/[username]/page.tsx` ajoutés (`generateMetadata` async — donc metas en head si la page se rend)
- Social icons footer (`instagram.com/carnetdepeche` etc.) — à confirmer avec César

### Nouveautés sprint 9 (Stripe) **pas encore en prod**

Le code est sur la branche `sprint-9` mais `main` ne contient pas encore les routes `/api/stripe/*`, `/compte/abonnement`, ni les modifs `/tarifs` (POST checkout). Donc l'audit live ne peut rien dire sur Stripe en prod. La QA `docs/sprint-9/qa-checklist.md` reste le bon outil avant merge.

---

## 4. Recommandations chiffrées

### Avant merge `sprint-9` → `main`

**Bloquants juridiques** : ~~P0.5 médiateur~~ — assumé, retiré (cf §0 décisions).

**Bloquants UX/SEO** (P0.1, P0.2, P0.3, P0.4)
- [ ] Investiguer + fixer "metas in body" (2-3h)
- [ ] Décider /fil : retrait sitemap ou stub publique (1-2h selon option)
- [ ] Markers carte visibles pour Discovery (2h)
- [ ] Carte chargement initial (1h)

**Quick wins** (sélectionner 3-4)
- [ ] Title `/auth/*` et `/inexistant-404` spécialisés (30 min)
- [ ] Mockups home badgés "exemple" (30 min)
- [ ] Marées Pointe du Raz : diagnostic (2h, à confirmer cause)
- [ ] 404 avec navbar/footer (30 min)

**Total estimé** : ~1 jour ouvré sur une branche `sprint-9.5-cleanup` avant `git merge sprint-9 main`. Cf détail dans `docs/sprint-9.5-cleanup.md` §6.

### Après merge sprint-9, avant sprint 10

- Mettre à jour `/legal/confidentialite` : retirer "(à venir)" sur Stripe.
- Lancer Facebook Sharing Debugger + Twitter Card Validator sur 6 URLs pour confirmer P0.1 résolu.
- Vérifier `lastmod` du sitemap pour les pages modifiées.

### Backlog sprint 10+

Tous les P2 + items "nouveaux" du sprint 7.5 non traités, en particulier :
- Domiciliation commerciale (post-sprint 11 idéalement)
- Capture email seule sur stubs (sprint 10 ou 11 quand on aura Resend en place)
- Lune au zénith / vérification suncalc (sprint 10)
- A/B test "voir 1 spot précis gratuit" (sprint 22+)

---

## 5. Outils utilisés pour cet audit

- **Navigation** : Chrome via MCP, fenêtre 1440×900 (resize en 380px n'a pas fonctionné dans l'env — mobile non audité)
- **DOM** : `querySelectorAll`, `document.head.children`, `document.body.querySelectorAll('meta')`
- **Network** : `read_network_requests` (carte tile requests, redirections, codes 503 Vercel benign)
- **Console** : `read_console_messages` (aucune erreur JS visible côté public)
- **Validation form** : `form_input` + `left_click` (test register OK, 3 messages FR confirmés)

**Limites de l'audit** :
- Pas d'auth utilisée (pas de credentials demandés). Donc `/home`, `/carnet`, `/onboarding`, `/fil/[dept]`, `/u/[username]`, `/profil`, `/compte/abonnement` non testés en mode connecté.
- Resize mobile cassé dans l'env (innerWidth reste à 1920). Mobile audit reporté.
- Sprint 9 (Stripe) pas en prod, donc pas testable live.

---

*Audit livré le 2026-05-21 (Cowork). Prochain audit auto programmé à 20h00 par la scheduled task `audit-carnet-de-peche-daily`.*
