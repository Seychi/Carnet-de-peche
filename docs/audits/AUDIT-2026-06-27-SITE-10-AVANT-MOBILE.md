# 🎯 Audit « Site à 10/10 avant le mobile » — Carnet de Pêche

> **Date** : 2026-06-27 · **Auteur** : Claude (audit live complet) · **Commanditaire** : John
> **Méthode** : lecture transverse du dossier (recaps sprints 22→36 + ~20 audits) + benchmark concurrents en live (FishFriender, Decathlon, spot-de-peche, Fishing Grid) + **vérification live** : git/prod, base Supabase (schéma, advisors, volumes), PostHog (usage réel), QA Chrome desktop + mobile sur la prod.
> **Angle** (choisi par John) : **priorité « passer le site à 10/10 »** avant de démarrer le mobile. Les nouvelles features offensives sont en §7 (secondaire). Illustrations d'espèces : **volontairement hors périmètre** (décision John, gardées pour plus tard).
> **Verdict en une ligne** : le site est **techniquement très mûr et honnête (~8,5/10 en qualité de build)**, mais **pas encore 10/10 en expérience** à cause de **2 verrous** : la **perf de `/carte`** (objectif non démontré) et le **réservoir vide** (le moat est codé et prouvé en local, mais invisible faute de données). Tout le reste est du polish bornable.

---

## 0. Ce qui a changé depuis le dernier audit (à lire en premier)

**Correction factuelle importante (piège des RECAP périmés).** Les RECAP des sprints 35 et 36 disaient « non poussé, attente validation John », et l'audit du 26/06 matin citait John (« S35 pas encore poussé »). **C'est désormais faux.** Vérifié sur git ce jour :

- Branche `main`, HEAD `8b21b44` (2026-06-26 20:12), et **`main == origin/main`** → déployé Vercel.
- Les commits **sprint-35** (`7bbae4a` vérité & bugs), **sprint-36** (`a62b935` carte instantanée), **fond-marin** (`e0fead4` proxy EMODnet) et **copy-IA** (`8b21b44` retrait tirets) **sont tous sur `main`**.

**Conséquence** : les correctifs M1 (géocodage prise), M2 (heures soleil), M3 (en-têtes sécurité), B1 (EMODnet) **sont en prod**, pas en attente. Confirmé en partie en live (cf §3). Le travail restant n'est donc plus « merger S35/S36 » mais « **vérifier que ça tient en prod** » + traiter les 2 vrais verrous.

---

## 1. Scorecard 10/10 par axe

Note = qualité de build **et** maturité d'expérience (un axe parfait en code mais vide compte comme incomplet, parce que l'objectif de John est un site « parfait » prêt à recevoir des utilisateurs).

| # | Axe | Note | Pourquoi pas 10 |
|---|---|---|---|
| 1 | **Carnet / Moat scoring perso** | **6/10** | Le code est réel, honnête et déployé (sprint 22, « le carnet qui parle »). Tu l'as prouvé en local avec heatmap. **Mais en prod il est invisible : 19 prises, 6 publiques.** Le moat ne se démontre pas à un visiteur. |
| 2 | **Carte** | **7/10** | Riche et concurrentielle (heatmap k-anon, multi-source, bathy, score). **Perf mobile rouge** (cf §4) et **157 spots** face aux 10 000 revendiqués par spot-de-peche. |
| 3 | **Espèces** | **8,5/10** | 26 fiches profondes, sourcées et datées : excellent. Manque les illustrations (reporté) et les **guides (5/26)**. |
| 4 | **Social / Fil** | **8/10** | Complet, gratuit, Realtime, modération. **Vide** (1 post) : l'effet réseau ne tourne pas encore. |
| 5 | **Conformité / Réglementation** | **9/10** | Moteur façade, maille/quota sourcés + datés, RecFishing, correctif marées Med. Solide. |
| 6 | **Monétisation / Stripe** | **9/10** | Flux complet QA LIVE OK (Checkout + Portal + webhooks + essai 7j + Tax). 0 abonné payant (pré-lancement). |
| 7 | **RGPD / Légal** | **9,5/10** | Suppression de compte en cascade **vérifiée live**, pages légales complètes, copy honnête. |
| 8 | **SEO / Contenu** | **6,5/10** | SEO technique excellent (sitemap ~536 URLs, JSON-LD, canonical). **Mais 0 acquisition organique** (cf §5), **contenu mince** (guides 5/26), **0 présence stores**. |
| 9 | **Performance** | **5/10** | `/carte` est le gros caillou (cf §4). Les autres pages vont bien. |
| 10 | **Sécurité** | **9/10** | Floutage GPS 3 couches, RLS solide, en-têtes déployés, advisors propres (rien d'actionnable non assumé, cf §3). |
| 11 | **Design / DA** | **9/10** | DA v2 « instrument marin » cohérente, refonte home premium (hero MapLibre + mer WebGL). |
| 12 | **UX / Cohérence** | **8/10** | Forte. Incohérences mineures (profil 6 espèces favorites vs 26, copy résiduelle). |
| 13 | **Analytics / Observabilité** | **8/10** | PostHog EU + Sentry câblés, events funnel instrumentés. **0 goal de conversion configuré**, 0 volume. |
| — | **Mobile-readiness (infra)** | **2/10** | Attendu : pas démarré (ni Expo, ni Turborepo, ni pnpm-workspace). C'est la phase d'après, pas un défaut du site. |

**Moyenne « site web » (axes 1-13) ≈ 7,8/10.** La qualité d'ingénierie est plus haute que ça (≈ 8,5), mais deux trous d'**expérience** (perf carte + réservoir) la tirent vers le bas. **Le site n'est pas encore à 10/10.** Le chemin est court et clair (§6).

---

## 2. Ce qui est livré ET en prod (vérifié)

Rien de cassé en surface publique. QA live sur la prod ce jour :

- **Home** : rendu propre, on-message (le moat, 26 espèces, 157 spots, freemium), **hero MapLibre réel** qui s'affiche, compteurs animés, nav claire (Carte / Spots / Espèces / Guides / Tarifs / Mon carnet). 0 erreur console.
- **`/carte`** : se charge, tuiles MapTiler 200 OK, **0 erreur console** en public, Sentry actif.
- **`/home` (connecté, ta session)** : cockpit rendu, bon département (Alpes-Maritimes), bonne date (samedi 27 juin), 0 erreur console capturée.
- **Stack confirmée** : Next 15.5.18 (App Router), React 19, TS 5.9, Tailwind v4, Stripe SDK 22, Sentry 10, MapLibre 5. **59 fichiers de migration** sur disque (001→058), **base alignée** (migrations appliquées jusqu'à 058). **56 fichiers de test** (~540-568 cas selon docs).

---

## 3. Base de données & sécurité (Supabase, live)

### Volumes réels (confirment le « réservoir vide »)

| Table | Lignes | Lecture |
|---|---|---|
| profiles | **17** | dont 12 onboardés (docs) |
| catches | **19** | 6 publiques : le moat n'a rien à montrer |
| feed_posts | **1** | le fil est désert |
| feed_comments / feed_likes | 1 / 2 | |
| follows | 12 | |
| subscriptions | 17 | 0 payant actif |
| spots | **158** | 157 curés + alentours |
| spot_scores | 157 | scoring générique calculé |
| outings | 1 | log de bredouille amorcé |
| invite_codes | **0** | beta jamais lancée |
| user_badges | 3 | |
| notifications | 17 | |
| weather_cache | 271 | cache météo sain |
| guide_waitlist / feed_post_photos | 0 / 0 | |

→ **Le produit est en pré-lancement de fait.** Le code du moat est là, la donnée non.

### Advisors sécurité : RAS actionnable (tout est déjà assumé)

71 findings, **aucun nouveau problème** :

- **3 ERROR** : 2 `security_definer_view` (`catches_for_viewer`, `spots_for_viewer`) = **décision documentée** (migration 047 §3) ; 1 `rls_disabled` sur `spatial_ref_sys` = **table système PostGIS**, non modifiable, bénin.
- **67 WARN** : 60 « fonction SECURITY DEFINER exécutable par anon/authenticated » = **tes RPC gatées au tier** + bruit PostGIS (comportement voulu) ; 3 `function_search_path_mutable` = **toutes dans le schéma `stripe`** (connecteur, pas ton code) ; 3 `extension_in_public` (citext/pg_trgm/postgis) = bénin ; 1 `auth_leaked_password_protection` = **déjà tranché** (HIBP = Pro-only, plan Free, assumé).
- **1 INFO** : `invite_codes` RLS sans policy = **fail-closed volontaire** (accès uniquement via RPC SECURITY DEFINER).

### Advisors performance : propre

Que des INFO (index inutilisés, surtout le schéma `stripe` du connecteur + quelques index `public` jamais sollicités faute de trafic) et des WARN `multiple_permissive_policies` (overlap policies modérateur+propriétaire sur catches/feed_posts/spots) : **micro-perf, sans impact à cette échelle**. Rien à corriger avant le mobile.

**Conclusion DB** : sécurité et perf base **propres**. Le seul « chantier » DB est de l'hygiène/repro (des GRANT/REVOKE et verrous colonne `geom` vivent en prod **hors fichiers de migration**, héritage de dérive : un `db reset` ne les reproduit pas). Non bloquant prod, à régulariser avant de monter une équipe.

---

## 4. Le verrou n°1 : performance de `/carte`

C'est **le** point technique qui empêche le 10/10.

- **Lighthouse CI du repo** (localhost, build prod) : `/carte` **perf 0,42** (cible 0,70), **TBT ~2 730-2 960 ms** (cible 600), **LCP ~6 350-7 250 ms** (cible 4 000). **Les 3 assertions échouent.**
- Le sprint 36 « carte instantanée » (montage MapLibre différé) **est déployé**, mais **n'a pas fait passer la cible en CI**. Le RECAP S36 le dit honnêtement.
- En prod ce jour, `/carte` se charge correctement à l'œil et sans erreur console, mais **je n'ai pas de mesure Lighthouse prod fiable** (les outils navigateur ne lancent pas Lighthouse). Localhost ≠ prod (pas de CDN), donc le chiffre prod est probablement meilleur, **mais non prouvé**.

**Anomalie à investiguer** : une requête `HEAD https://www.carnet-de-peche.com/carte` renvoie **503** (le GET document, lui, est 200). Possiblement transitoire Vercel ou handler HEAD manquant. À vérifier (impact SEO/monitoring si récurrent).

**Action** : lancer un **Lighthouse mobile sur la prod** (`npx lhci autorun` pointé prod, ou PageSpeed Insights). Deux cas :
1. Prod ≥ 70 / TBT < 600 → **verrou levé**, c'était un artefact localhost. Documente-le et referme.
2. Prod toujours rouge → exécuter le **plan B du S36 : montage de la carte au geste** (n'instancier MapLibre qu'au tap/scroll), seule option qui sort vraiment le long task d'init du chemin critique.

---

## 5. Le verrou n°2 : réservoir vide & acquisition (décision business)

**PostHog, 30 derniers jours** : **8 visiteurs uniques, 218 pages vues, 25 sessions**, durée moyenne 19 min 41 s (= toi + quelques testeurs), **sources 100 % directes** (aucune acquisition organique), **0 goal de conversion configuré**. Top pages : `/carte`, `/home`, `/auth/login`, `/`, `/fil/06`.

Bonne nouvelle : **l'instrumentation est en place** (events `catch_log_started`/`catch_log_completed`, `paywall_viewed`, `checkout_started`, `trial_started`, `upsell_clicked`). La plomberie analytics est prête, il manque juste les utilisateurs et la config des goals.

**C'est moins un bug qu'une décision (D1 de la roadmap pré-mobile).** Le moat « scoring perso » que tu as validé en local ne peut pas convaincre un nouveau visiteur si la carte et le fil sont vides. **Avant de te lancer dans le mobile, il faut une stratégie d'amorçage** : beta « fondateurs » via les `invite_codes` (codés, 0 émis), seed honnête et balisé, ou objectif chiffré de premières prises par façade. Sans ça, le site restera « parfait mais désert ».

---

## 6. Plan d'action pour atteindre le 10/10 (priorisé)

### 🔴 Bloquants (les 2 verrous)

1. **Prouver la perf `/carte` en prod.** Lancer un Lighthouse mobile prod. Si rouge → plan B « montage au geste ». **C'est le gate technique n°1.**
2. **Trancher l'amorçage (D1) et l'exécuter.** Choisir : beta fondateurs (émettre des `invite_codes`) / seed honnête / objectif de prises. Configurer au passage les **goals PostHog** (inscription, 1re prise, trial). **C'est le gate expérience n°1.**

### 🟠 Importants : vérifier en prod ce qui est déployé (passe de confirmation)

3. **M1 géocodage prise** : tester en prod le log d'une prise par nom de ville (autocomplete BAN) sans saisie de coords. Confirmer la fin du « Position requise ».
4. **M2 heures de soleil** : sur `/home` connecté, vérifier visuellement que le bloc météo n'affiche plus « 08:19–00:23 » (offset TZ). Le fix `formatWeatherTime` est déployé, reste la confirmation à l'œil.
5. **M3 en-têtes sécurité** : présents dans `next.config.ts` sur `main` (X-Frame-Options DENY, nosniff, Referrer-Policy, HSTS, CSP **report-only**). Confirmer via les en-têtes de réponse prod, puis **planifier le passage CSP report-only → enforce** une fois les rapports analysés.
6. **B1 EMODnet (fond marin)** : couche proxifiée (déployée). Se connecter en Itinérant, activer la couche, confirmer 0 erreur réseau console.
7. **B2 hydration React #418** : vérifier qu'elle a disparu (même cause racine TZ que M2).
8. **`HEAD /carte` → 503** : investiguer (transitoire ou handler manquant).

### 🟡 Polish (étalable, n'empêche pas le 10/10 mais le solidifie)

9. **Guides 5/26** : le plus gros trou de contenu, aussi un trou SEO et concurrentiel (Fishing Grid 266 fiches, spot-de-peche guides profonds). Viser 12-15 guides phares sur tes 6 espèces cœur. Lane éditoriale / César.
10. **Profil : 6 espèces favorites affichées vs 26 loggables** : aligner le modèle.
11. **Copy-IA** : le commit `8b21b44` a retiré les tirets cadratin en prose. Confirmer que les ~557 occurrences signalées (fiches espèces, guides) sont bien nettoyées.
12. **QA du parcours 100 % gratuit** : jamais audité visuellement (tous les audits faits en compte Itinérant/essai). Trou de méthode récurrent. Plan prêt (`docs/sprint-31/qa-gratuit.md`).
13. **Hygiène DB/repro** : régulariser en fichiers de migration les GRANT/REVOKE + verrous `geom` appliqués à la main (dette DR).
14. **Densifier la carte** (157 → 300-400 spots curés) : voir §7, c'est aussi offensif.

### Séquencement recommandé (cohérent avec `ROADMAP-PRE-MOBILE-2026-06-26.md`)

La roadmap définit « Web parfait = S35 + S36 + S37 verts et déployés ». S35/S36 sont déployés. Donc :

**(a)** passe de confirmation prod (points 3-8) → **(b)** lever le verrou perf (point 1) → **(c)** S37 = amorçage (point 2, le vrai gate) → **(d)** guides en parallèle → **(e)** alors seulement, le mobile.

---

## 7. Secondaire : enrichir l'app pour écraser FishFriender & Decathlon

Benchmark live ce jour. **Intel à intégrer à ton radar** :

- **spot-de-peche s'est durci** : revendique désormais **10 000+ spots, 2 500 actifs, app mobile en beta, itinéraires GPS, prévision 10 jours**, pricing **à la carte** (5,90 € = 1 carte/1 espèce, +3 € par ajout, « Itinérant » 8,90 € pour 6 cartes). Leur seul gros gap (pas d'app) se referme.
- **FishFriender** : son moat réel n'est pas la carte (payante, 7,99 €/mois, **au-dessus de ton Local à 4,90 €**) mais la **boîte à matériel (160 000 produits)** + la **reconnaissance IA d'espèces** (« le Shazam du poisson », on-device). Avis 2026 : « pas trop d'évolution depuis des années ».
- **Decathlon Fishing** : **concurrent réel et actif** (édité par FishingTheSpot, Bordeaux ; 4,1★ ; maj juin 2026), carnet + indice du jour gratuits, 45 000 spots premium + sorties collaboratives. **Faiblesse béante** (avis cinglants) : « un spot c'est un GPS fixe, pas un point qui bouge… payer 10 € pour ça c'est n'importe quoi ». Mérite **sa propre fiche concurrent** (tu n'en as pas, contrairement à Fishing Grid).

### Opportunités de features, classées impact / effort

Les 4 premières renforcent ton **moat personnel** là où **tous** les concurrents sont génériques : c'est le seul terrain où tu gagnes sans course à l'armement.

1. **Boîte à matériel *personnalisée*** (impact élevé / effort moyen) : associer leurres/montages aux prises et dire « ton shad chartreuse sort 60 % de tes bars ». Tu prends le seul vrai avantage de FishFriender et tu le rends perso (eux restent génériques).
2. **Badge « spot GPS fixe vérifié »** (élevé / faible) : capitaliser frontalement sur la critique n°1 de Decathlon. Quick win marketing.
3. **Marées « vérifiées port par port »** (élevé / faible) : auditer tes PM/BM sur 5 ports étalon SHOM et en faire un argument. Frappe la faiblesse de Fishing Grid (marées imprécises).
4. **Notif push « fenêtre optimale selon TON historique »** (élevé / moyen) : déjà partiellement codée (sprint 26). En faire la killer feature, là où les autres ne poussent que du solunaire générique.
5. **Comparateur « tes conditions gagnantes » exportable** (moyen / faible) : une fiche partageable « tu pêches mieux en descendante, coef > 80, après 3 j sans pluie ». Matérialise le moat et devient un levier d'acquisition (TikTok/Insta, lane César).
6. **Densifier la carte 157 → 400+** (élevé / élevé) : tu ne peux pas rester squelettique face à 10 000. Approche hybride curé + génération communautaire k-anon.
7. **Mesure taille/poids par photo + IA espèce** (moyen / moyen-élevé) : table stake qu'aucun ne fait proprement, crédibilise les « prises vérifiées » et alimente le carnet. Décision web-first vs natif-first (D2 de la roadmap).
8. **Muscler le co-pêchage** (`/sorties`, déjà livré) : Decathlon et Fishing Grid avancent sur le collaboratif, garde l'avance.

→ **À faire maintenant** (quick wins quasi gratuits) : **#2 et #3** (positionnement/badges) et **#5** (comparateur partageable). Le reste (#1, #6, #7) est de l'enrichissement post-10/10 / ère mobile.

---

## 8. Réponse directe à ta question

**« Mon site est-il à 10/10 avant de démarrer le mobile ? »** → Pas encore, mais tu en es proche et le chemin est net. Il manque **deux choses, pas vingt** :

1. **Prouver (ou réparer) la perf de `/carte`** : une mesure Lighthouse prod tranche, plan B prêt si besoin.
2. **Décider et exécuter l'amorçage** : ton moat est excellent et prouvé, mais un visiteur tombe aujourd'hui sur une carte et un fil vides.

Le reste (les 4 fixes du sprint 35 déjà déployés à confirmer, B1/B2, guides, polish) est **bornable et sans risque**. La base technique, la sécurité, la conformité, le paiement et le design sont **au niveau**. Les illustrations d'espèces restent volontairement de côté.

Mon conseil : **passe de confirmation prod → verrou perf → sprint d'amorçage**, puis tu démarres le mobile la conscience tranquille, avec un site qui se démontre tout seul. Les features offensives (#1 à #8) seront le carburant de la phase mobile pour écraser FishFriender et Decathlon, pas un prérequis du 10/10.

---

### Annexe — sources de l'audit

- **Dossier** : `docs/audits/AUDIT-2026-06-26.md`, `AUDIT-2026-06-26-authentifie.md`, `AUDIT-COPY-IA-2026-06-26.md`, `AUDIT-SEO-ACQUISITION-2026-06-25.md`, `AUDIT-UX-2026-06-24.md` · `docs/ROADMAP-PRE-MOBILE-2026-06-26.md` · RECAP sprints 22→36.
- **Concurrents** : `docs/concurrents/fishing-grid.md` + recherche live (fishfriender.com & Google Play, Decathlon Fishing / FishingTheSpot, spot-de-peche.com, fishing-grid.fr).
- **Live** : git (`main` @ `8b21b44`) · Supabase (list_tables, advisors security+perf, list_migrations) · PostHog (web-analytics 30 j, schéma events) · Chrome QA prod (home, /carte, /home connecté, mobile) · Lighthouse CI repo (`.lighthouseci/assertion-results.json`).
