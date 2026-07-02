# 🔬 Audit approfondi — addendum « détails & fonctionnalités » — Carnet de Pêche

> **Date** : 2026-06-29 · **Auteur** : Claude (Cowork) · **Pour** : John
> **Demande** : pousser l'audit au maximum, tester toutes les fonctionnalités, être encore plus attentif aux détails, **en plus** des deux audits précédents.
> **Méthode** : 3 sous-agents de revue profonde (a11y + copy ; formulaires + états + cas limites ; SEO + perf + intégrité), requêtes d'anomalies en **base live**, et QA interactive live (notifications, carte, settings). Code lu au commit de prod (`git show HEAD` = `7c23f5c`).
> **Important** : ce document ne répète PAS les findings des audits `2026-06-28` et `2026-06-29-POST-S50` (légende, 6 espèces, modération, orphelins nav, partage story/polices/« 17 . », push A1/A2/A4, auto-confirm, tautologie reviews, alose/stickbait, perf carte « en général », etc.). **Tout ci-dessous est NOUVEAU.** Beaucoup de fausses pistes ont été écartées après lecture du vrai code (voir §5).

---

## 0. Verdict

Le code est **étonnamment discipliné** : zod côté serveur partout, `ActionResult`/`.ok` vérifié à quasi tous les call-sites, garde anti double-submit, rollback optimiste, crons idempotents, dates en locale `fr`. Donc les nouveautés ci-dessous sont de vrais trous, pas du bruit. **3 bugs méritent une action rapide** (Stripe `paused`, emails/analytics de renouvellement, root cause perf carte), puis une série de correctifs de qualité.

---

## 1. 🔴 P1 — nouveaux bugs à fort enjeu

### 1.1 Stripe `paused` fait planter le webhook → retry infini + tier figé
`lib/stripe/events.ts:114,128` écrit `status: sub.status` brut puis upsert. Le CHECK (`supabase/migrations/001_init.sql:148`) n'autorise que `active,trialing,past_due,canceled,incomplete,incomplete_expired,unpaid`. Or Stripe a aussi **`paused`** (pause_collection). Dès qu'un abonnement passe `paused` : l'upsert lève → le handler relève (`:133`) → la route renvoie 500 (`app/api/stripe/webhook/route.ts:78`) → **Stripe retente l'event indéfiniment** et la ligne locale ne se met plus jamais à jour (tier silencieusement faux). `lib/types.ts` type la colonne en `string`, donc TS ne l'attrape pas. **Fix** : ajouter `'paused'` au CHECK (migration `091`) ou clamper les statuts inconnus (`paused`→`past_due`) avant upsert.

### 1.2 `trial_converted` + email « Paiement reçu » ré-émis à CHAQUE renouvellement
`lib/stripe/events.ts:330-348` (`handleInvoicePaymentSucceeded`) ne garde que sur `amount_paid > 0`, sans test `billing_reason === 'subscription_create'`. Donc **chaque** `invoice.payment_succeeded` récurrent ré-émet `trackServer('trial_converted')` (`:337`) et **renvoie** `PaymentSuccessEmail` (`:348`). Un abonné 12 mois = 12 « conversions » (funnel corrompu) + 12 reçus en double (agacement, risque conformité). **Fix** : gater sur `inv.billing_reason === 'subscription_create'`.

### 1.3 Root cause perf `/carte` (TBT ~3,9 s) identifiée
`lib/hooks/useDeferredMount.ts:41-45` monte MapLibre via `requestIdleCallback(fire,{timeout:2000})`, appelé depuis `components/map/MapShell.tsx:271`. Sur mobile bridé, l'idle arrive ~1-2 s après le FCP → l'init WebGL synchrone de MapLibre (la longue tâche ~1,5 s que le defer voulait cacher) tombe **pile dans la fenêtre FCP→TTI** qui définit le TBT. Le mécanisme améliore le FCP mais **ne peut structurellement pas** réparer le TBT (vu live : tuiles en spinner > 4 s, 3 fois). **Fix (ROI max, ~1 ligne)** : `MapShell.tsx:271` repousser le fallback idle à ~4-5 s et privilégier le chemin « 1er geste » déjà présent (`useDeferredMount.ts:29` écoute pointer/scroll) → Lighthouse n'interagit jamais → l'init tombe **après** la fenêtre TBT ; l'utilisateur réel garde une carte instantanée au 1er toucher. Puis découper l'init en tâches < 50 ms (`MapView.tsx:478-567` : créer la map / poser les couches / `createPins` en blocs séparés via `requestAnimationFrame`).

---

## 2. 🟠 P2 — bugs, data quality, a11y

### Bugs fonctionnels
- **Lien cassé** : `/spots/mes-propositions` lie les spots approuvés vers `/spot/<slug>` (singulier) → **404** à chaque clic. La vraie route est `/spots/[slug]` (`app/(app)/spots/mes-propositions/page.tsx:102`). Fix : `/spots/${p.slug}`.
- **UUID malformé `/carnet/[id]` → 500 au lieu de 404** : `lib/catches/queries.ts:57-68` `getCatchById` ne valide pas l'id ; `/carnet/pas-un-uuid` fait rejeter PostgREST (`22P02`) → throw → 500. Fix : `if (error.code==='22P02') return null`.
- **Filtre modération « OSM » mort** : `app/(app)/moderation/page.tsx:480` whiteliste `'osm'` puis `.eq('source','osm')` (`:635`), mais le CHECK n'autorise que `curated|community|imported` (`043:47`) → 0 résultat toujours. Fix : retirer `'osm'`.

### Data quality (saisies)
- **Prise datée dans le FUTUR** : `caught_at: z.string().datetime()` sans borne haute (`lib/catches/schema.ts:54`) + input sans `max` (`CatchForm.tsx:1117`). Une prise future pollue records, tendances « par moment » et la timeline. Fix : `max` = maintenant (input + refine zod).
- **Sortie solo future** (`started_at`, `lib/outings/schema.ts:11`) et **proposition co-pêchage PASSÉE** (`planned_at` sans borne basse, `lib/cofishing/schema.ts:25`) : mêmes gardes de date manquantes (le formulaire solo logue le passé, la proposition annonce le futur).
- **Bornes `measured_length_cm` incohérentes** : input `min=1 max=299` (`CatchForm.tsx:760`) vs zod `min(10).max(250)` → la saisie passe le navigateur puis se fait rejeter par un message qui ne colle pas au spinner. Pas de réconciliation `size_cm` ↔ `measured_length_cm` (on peut loguer 40 et 120). Fix : aligner les bornes + bloquer « Prise mesurée » si champs vides.

### Résilience / états
- **Aucun `error.tsx`/`loading.tsx` hors `/carnet`** : seuls `app/(app)/carnet/{error,loading}.tsx` existent. `carte, fil, /fil/[department], sorties, notifications, follows, home, profil, moderation, u/[username], especes/[slug], carnet/boite` n'en ont aucun → une erreur serveur remonte à la racine (perte de la nav/tab-bar/contexte) et plusieurs **blank-flash** sur réseau lent. Fix : au moins un `error.tsx` + `loading.tsx` partagés par groupe.
- **Username dupliqué en base** : la requête a trouvé **1 doublon** (insensible à la casse) sur 17 profils. Vérifier l'unicité `citext`/index (les usernames doivent être uniques). Fix : contrainte unique case-insensitive + nettoyage.

### SEO
- **`peche/[...slug]` (la plus grosse surface SEO du site) sans OG image dédiée** : `app/(marketing)/peche/[...slug]/page.tsx:60-63` ne pose pas d'`images`, pas de fichier `opengraph-image.tsx` → des centaines de pages partagent la carte de marque générique (vs `especes/[slug]` qui a son OG par espèce). Fix : ajouter `peche/[...slug]/opengraph-image.tsx`.
- **Schema Article des fiches espèces : date figée + champs manquants** : `especes/[slug]/page.tsx:116` `dateModified: '2026-06-21'` est une **string en dur** (toutes les fiches annoncent la même date, déjà 8 j périmée), sans `datePublished` ni `image`. Fix : dériver les dates d'un `verifiedAt` par `EspeceContent` (la donnée existe déjà) + `image` = OG par espèce.

### Accessibilité (NOUVEAU)
- **Champs cœur sans label** : `OutingComposer.tsx:83` (`<select>` département, pas de label/aria) et `:91` (`<input datetime-local>` sans nom accessible). `CatchForm.tsx:661/805/1151/1044/1057` : labels visibles sans `htmlFor`, inputs sans `id`/`aria-label` (le flow n°1 du produit). Fix : associer labels/ids.
- **`PhotoLightbox.tsx:29`** : lightbox plein écran = `<div onClick>` sans `role="dialog"`/`aria-modal`/gestion du focus (alors que `PhotoGalleryLightbox` le fait bien). Fix : aligner sur le bon composant.
- **Pas de lien « aller au contenu »** (skip-link) nulle part ; **Header desktop sans `aria-current`** (`Header.tsx:43`, alors que sidebar/tab-bar l'ont) ; **fil sans `role`/`aria-live`** (`PostList.tsx:67`, inserts optimistes muets pour lecteurs d'écran) ; **titres du cockpit `/home` en `<span>`** au lieu de `<h2>` (`home-ui.tsx:42`).
- **Contrastes < AA** : `text-ink-300` en vrai texte (StreakCard 9px, PokedexGrid, CatchGrid:151/168, PostComposer:307) ; libellé saison **`text-gold-500` « Bonne »** sur fond clair (`especes/[slug]/page.tsx:87`, `species-season-now.tsx:14`).

### Copy (NOUVEAU)
- **Tiret cadratin « — » dans des CTA visibles EN PROD** (ton tic IA n°1) : `Hero.tsx:243` `"Créer mon carnet — gratuit"` (CTA héro), `HomeSections.tsx:456` (2e occurrence), `species-score.tsx:129` `"… au score — Itinérant"` (upsell sur chaque fiche espèce). Fix : virgule/parenthèses/deux-points.
- **`PokedexGrid.tsx:84`** : texte sr-only « capturée » (féminin) codé pour les 26 espèces → faux pour les ~17 masculines (le bar, le maquereau, le congre…). Fix : dériver du champ `gender`.
- **`GuideLayout.tsx:117`** : `species.split(' ')[0]` tronque « Dorade royale » → « prise de **dorade** » et « Multi-espèces » → « multi-espèces ». Fix : libellé complet.

---

## 3. 🟢 P3 — polish & détails

- **PWA `start_url:'/home'` est auth-gated** → lancer la PWA installée déconnecté tombe sur une redirection login (`manifest.webmanifest` + `(app)/layout.tsx:34`). Fix : `start_url:'/'` (ou `/carte`).
- **Google OAuth contourne `INVITE_ONLY`** (`app/auth/login/actions.ts:362` sans check ; gate seulement dans `signUpWithPassword:221`) + le code d'invitation est consommé **avant** `auth.signUp` (`:235` vs `:283`) → un signup raté brûle un code à usage unique. Latent (flag OFF) mais à corriger avant la beta fondateurs.
- **`hrefFor()` notifs système** route `big_tide`/`species_closure`/`weekly_digest` vers `/fil` alors que les URL de push pointent `/carte`//`especes`//`home` (`notifications/page.tsx:103-118`). (Complète A2 du précédent audit.)
- **SEO mineur** : `<title>` fiches espèces 88-91 car. (tronqués en SERP) ; `tarifs` Product schema mélange une offre `price:'0'` + payantes sans `priceValidUntil`/`AggregateOffer` (warnings rich-results) ; routes `/spots?dept=&species=` s'auto-canonicalisent mais absentes du sitemap (indexables non déclarées) ; home `WebSite` JSON-LD sans `SearchAction`.
- **Perf mineur** : `posthog-js` (~50-60 KB) init **eager** sur le thread principal à chaque route, même avant consentement (`PostHogProvider.tsx:5,26`) → opt-out après coup ; **heatmap ON par défaut** refetch le RPC k-anon au load + à chaque `moveend` (`MapShell.tsx:211`, `useCatchHeatmap.ts:122`) sur un réservoir quasi vide ; JetBrains Mono 3 graisses chargées sur `/carte` où presque aucun texte mono ne s'affiche.
- **Détails saisie/UI** : `city` sans `maxLength` UI (cap serveur 100 → erreur générique) ; composer fil sans compteur de caractères (troncature silencieuse à 2000) ; pagination fil sans tie-breaker (`created_at` seul, risque de saut sur seed/bulk — `feed.ts:729`) ; realtime chat/fil sans gestion `SUBSCRIBED`/reconnect ; libellé notif non tronqué (`notifications/page.tsx:159`).
- **Microcopy FR** : apostrophes mélangées (droites dans les FAQ vs typographiques ailleurs : `tarifs:82,90`, `HomeSections:370`) ; espace insécable absent avant `? ! :` et dans les guillemets (onboarding, FAQ, modales) ; `WeatherGrid.tsx:80-100` métriques secondaires (`% risque`, `% nébulosité`) hors `font-mono` alors que la valeur principale est mono ; numérotation de section qui saute le `02` sur la home (`HomeSections.tsx:118,201`).
- **Code mort à nettoyer** : `lib/map/utils.ts:91,102` ; `lib/marketing/home-stats.ts:7` ; toute la chaîne `lib/marketing/brittany-coast.ts` + `components/marketing/home-visuals.tsx` (~200 lignes orphelines post-refonte home S34) ; `lib/gamification/badges.ts:95` + `streaks.ts:54` (référencés seulement par leurs tests).

---

## 4. 📊 Observations base live (réservoir)

- **5 / 17 profils non onboardés** et **5 sans `home_department`** (probables comptes de test/seed ou abandons d'onboarding). Impact : `/fil` sans département pour eux.
- **`verification_level` ne vaut jamais que `'equipe'` (ou null)** → les niveaux `communaute`/`ambassadeur` (S48) sont du **code mort** côté données (cohérent avec C2 du précédent audit).
- **Cartes de partage : seuls `catch` et `conditions` existent ; `recap` (Wrapped) et `records` (S47) ne sont JAMAIS créés** → fonctionnalités livrées mais **dormantes** (réservoir vide). À garder en tête pour la mesure d'usage.
- **19 prises sur 5 espèces** seulement (bar, dorade_royale, maquereau, orphie, sar) ; **2 modérateurs** ; **report unique en `dismissed`** ; 1 proposition, 1 post, 1 commentaire, 29 notifs. Spots curés : **0 description manquante, 0 difficulté invalide, 0 doublon** (data curée propre). Seules anomalies espèces/techniques : `alose` + `stickbait` (déjà connues).

---

## 5. ✅ Vérifié propre (résultats négatifs, rassurants)

Pour éviter de partir en chasse inutile : **crons** tous câblés dans `vercel.json`, `CRON_SECRET` fail-closed, idempotents (marqueurs DB / count-before-send), pas d'email en double sur retry ; **webhook Stripe** vérifie la signature + upsert idempotent `onConflict:user_id` ; `current_tier` dégrade bien `past_due`/`canceled`/`expired` → discovery ; `lib/env.ts` fail-fast en prod ; routes dev/seed inertes en prod ; **la quasi-totalité des formulaires** ont zod serveur + surfaçage d'erreur (`toast.error`) + garde double-submit + rollback optimiste ; **aucun autre `ActionResult` avalé** que la modération (déjà connue) ; dialogs base-ui avec focus-trap ; dates toujours en locale `fr`, décimales à la virgule ; **aucune fuite « vous »** hors pages légales ; maplibre/recharts **pas** dans le bundle partagé (lazy/off-route) ; spots anon cappés 3/dépt côté serveur. Beaucoup de fausses pistes des agents ont été écartées après lecture du code (orphelins d'upload, perte de texte optimiste, énumération email auth, ownership prise : tous **correctement gérés**).

---

## 6. Top priorités (ordre conseillé)

1. **Stripe `paused`** (1.1) — un seul abonnement en pause corrompt un tier pour toujours + spamme les retries. Migration `091` + clamp.
2. **Renouvellement : analytics + emails en double** (1.2) — gate `billing_reason`.
3. **Lien 404 `/spots/mes-propositions`** (2) — 1 ligne.
4. **Perf carte TBT** (1.3) — repousser le defer hors fenêtre Lighthouse, ~1 ligne, gros gain mesurable.
5. **Gardes de date** (futur/passé) sur prises/sorties/propositions + bornes `measured_length_cm`.
6. **`error.tsx`/`loading.tsx`** partagés sur les groupes `(app)`.
7. **a11y labels** (OutingComposer, CatchForm) + **tiret cadratin** dans le héro + contrastes.
8. **SEO** : OG `peche/[...slug]` + dates Article dynamiques.
9. Le reste (P3) en lot polish.

Invariants tenus : RLS d'abord, migrations numérotées + regen `lib/types.ts`, zéro coordonnée exposée, pas de tiret cadratin dans la copy visible, pas de push sans ta validation.

---

*Addendum approfondi 2026-06-29. Complète `AUDIT-2026-06-28-SITE-COMPLET.md` et `AUDIT-2026-06-29-SITE-COMPLET-POST-S50.md` (findings non répétés). Vérifié contre HEAD `7c23f5c` (= prod), base live, et QA interactive. Fausses pistes écartées en §5.*
