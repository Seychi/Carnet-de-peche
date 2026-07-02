# Roadmap post-audit — 2026-07-02 (démarre au sprint 69)

> Ce document **opérationnalise** `docs/audits/AUDIT-2026-07-02.md`. Le disque va jusqu'au sprint **68** (codes fondateurs, migrations 104/104b, **déployé le 2026-07-02**), donc on démarre à **69**.
>
> **Périmètre :** les trouvailles de l'audit du 02/07 + les 3 features offensives issues de la veille concurrentielle (alertes par port, validation communautaire, sorties groupées). La phase **mobile (Expo/React Native)** reste hors de ce document (cf `docs/roadmaps/ROADMAP-PRE-MOBILE-2026-06-26.md`) mais son **gate** est redéfini en §4.
>
> **Contexte stratégique (audit §6)** : Spot de Pêche a sorti son app Android le 29/06 en copiant notre pitch « VOTRE meilleur moment » (~5 installs) ; Fishing Grid dévie vers l'e-commerce. La fenêtre pour les prendre de vitesse est ouverte MAINTENANT — mais elle se gagne sur l'amorçage + la carte + la conversion, pas en empilant des features.

---

## 0. Comment lire / discipline

**Légende effort** : **S** = petite session · **M** = session focalisée · **L** = grosse session ou deux. Chaque sprint est taillé pour une passe Fable `ultracode` / effort `xhigh`.

**Rituel par sprint (inchangé) :**
1. Brief selon `docs/BRIEF-TEMPLATE.md` (ligne de lancement + workstreams parallèles + critères vérifiables + WS-Vérif dédié).
2. Migrations = fichiers numérotés à partir de **105**, jamais éditer un ancien ; appliquer via connecteur Supabase après validation ; **regénérer `lib/types.ts`**.
3. Terminer par **`/verif-sprint`**. Pas de « code-complet » sans ça.
4. Pas de push sans validation de John.

**Garde-fous permanents :** floutage GPS, RLS, honnêteté des données, RGPD, anti spot-burning (aucune métrique/classement n'expose de coordonnée). **Nouveau depuis le pivot dopamine : intégrité compétitive** (aucun chemin XP/badge/rang crédité sans garde anti-farm — c'est l'objet du S69, à re-vérifier ensuite à chaque passe adversariale).

---

## 1. Vue d'ensemble

| Phase | Sprint | Objet | Dépend de | Effort |
|---|---|---|---|---|
| **A — Intégrité des classements** | **69** | Fermer les 4 trous anti-cheat + UX classements vides. **Bloquant avant de distribuer les codes fondateurs en masse.** | — | L |
| **B — Vérité & bugs express** | **70** | Tous les quick wins de l'audit (157→215, hydratation #418, CSP, middleware, saisons vides…). | — (∥ 69) | M |
| ~~C — Carte~~ | ~~71~~ | **ANNULÉ le 02/07** : desktop mesuré sain (2,9 s hard reload) ET mobile testé sain sur appareil réel par John (audit §2.2). Le numéro 71 reste vacant. Reliquats : bathy → S70 Bloc D, étude courants SHOM → stretch S72. | — | — |
| **D — Alertes par port** | **72** | LA feature de conversion : fenêtre optimale personnalisée par port favori (push + email) + vitrine /tarifs. Brief : `docs/sprint-72/BRIEF.md`. | A (notifs saines) | M/L |
| **E — Sorties groupées** | **73** | Posts de sortie façon « Trips » : densité sociale avec peu d'utilisateurs + wedge RecFishing. Brief : `docs/sprint-73/BRIEF.md`. | A | M |
| **F — Amorçage (lane John, continue)** | ops | Mint codes fondateurs, recruter 10-20 pêcheurs, curation des 942 imports, mesurer le funnel. | A livré | — |

**Ordre recommandé (dev solo)** : `69 → 70 → 72 → 73` — la lane **F** démarre dès la fin du 69 (ne PAS distribuer les codes à des inconnus avant : l'économie XP est actuellement farmable, audit §2.1). *(Màj 02/07 au soir : le sprint carte est ANNULÉ après contre-mesures, le numéro 71 reste vacant ; numérotation John : alertes = S72, sorties = S73. La phase mobile démarre à S74, cf `ROADMAP-MOBILE-2026-07-02.md`.)*

```
A 69 ─▶ B 70 ─▶ D 72 ─▶ E 73 ─▶ … phase mobile S74+ (gate §4)
   └─ F lane John (mint codes, recrutement, curation)
```

---

## 2. Les sprints en détail

### PHASE A — Sprint 69 — « Intégrité des classements » · Effort **L** · migrations : **105 (+105b si besoin)**

**Objectif :** rendre l'économie XP/badges/classements infalsifiable AVANT l'arrivée des fondateurs. Réf audit §2.1 + §4.1/4.2. Vérifié dans le code : boucle create/delete = +10/+50 illimités (`098_xp_progress.sql:126-179`, compteurs calculés sur `catches` vivantes, pas de révocation au DELETE) ; `photo_verified_at` posé sans photo (`lib/catches/actions.ts:144-163`) ; zéro rate-limit sur `createCatch`/`bulkCreateCatches` ; streaks/défis sur `caught_at` déclaratif (099:79-84, 100:126-151).

**Workstreams :**
- **WS1 — Anti-farm DB (migration 105)** : recalculer les compteurs (`v_same_day`, `v_prior_species`, `v_prior_best`) sur **`xp_events`** (ledger append-only) et non sur `catches` — OU trigger `AFTER DELETE ON catches` qui révoque l'XP de la prise. Choisir UNE stratégie, la documenter dans la migration. Plafond journalier sur `measured` (+15) et `released` (+4) comme sur `catch`. ⚠️ Backfill/rejouabilité : `award_catch_xp` doit rester idempotent.
- **WS2 — Photo obligatoire pour « vérifiée »** : `photo_verified_at` seulement si `photo_path` non nul (Server Action + contrainte/trigger DB en défense en profondeur). Copy du formulaire alignée (« mesurée avec photo »). ⚠️ Décider avec John : que faire des prises existantes photo_verified sans photo (7 prises publiques en base — probablement re-flagger honnêtement).
- **WS3 — Rate-limit prises** : même mécanique que feed/spots (ex. 20/24 h + burst 5/h), sur `createCatch` ET `bulkCreateCatches` (borne d'import distincte, généreuse). Erreur en français doux.
- **WS4 — Anti-datage cohérent** : streaks/défis crédités sur `created_at`, ou borner `caught_at` à ±48 h de `created_at` pour tout ce qui donne XP/badge/défi. Les prises historiques loguées a posteriori restent DANS le carnet/stats perso (le moat), elles ne créditent juste pas la compétition.
- **WS5 — UX classements vides (§4.1/4.2)** : afficher **son propre rang** même sous le seuil k-anon ; message « il manque X pêcheurs opt-in pour publier ce classement » + CTA « Invite-les » (lien codes fondateurs S68) ; masquer les saisons pré-lancement vides (Automne 2025, Hiver 2026) du sélecteur.
- **WS-Vérif** : matrice SQL anti-farm en prod (begin…rollback, comme S68) : create/delete/re-create → XP net inchangé ; 4e prise même espèce même jour → 0 ; antidatage → 0 streak ; photo manquante → pas de `photo_verified_at` ; rate-limit déclenche. + `/verif-sprint` + passe adversariale « comment je tricherais encore ? » par un agent indépendant.

**Critères d'acceptation :** la boucle create/delete ne crédite plus rien (prouvé SQL) ; aucun `photo_verified_at` sans `photo_path` (contrainte DB) ; 21e prise en 24 h refusée ; série impossible à fabriquer par antidatage ; l'utilisateur opté-in voit son rang + le seuil manquant ; 695+ tests verts.

---

### PHASE B — Sprint 70 — « Vérité & bugs express » · Effort **M** · migrations : 0

**Objectif :** liquider les 🟠/🟡 de l'audit qui se corrigent en petites passes parallèles. Réf audit §3 + §4 + §7.

**Workstreams (tous parallélisables, fichiers disjoints) :**
- **WS1 — Chiffres honnêtes** : 157→compte live/constante partagée dans `app/(marketing)/page.tsx:18`, `Hero.tsx:254`, `HomeSections.tsx:76`, `HomeMapSection.tsx:66`, `tarifs/page.tsx:87`.
- **WS2 — Hydratation & Sentry** : React #418 (mobile) + `TypeError parentNode` ×3 routes (10 év. Sentry — probablement un seul cleanup DOM GSAP/map) ; `url.parse()` déprécié dans `/api/crons/personal-window`.
- **WS3 — Plateforme** : CSP Report-Only → **enforce** (après lecture des rapports) + `Permissions-Policy` ; `middleware.ts:10` APP_ROUTES += `/classements`, `/sorties`, `/notifications`, `/moderation`, `/spots/mes-propositions` ; OG images en timeout 25 s → cache/edge + fetchs bornés.
- **WS4 — Petit UX** : badge tier sur /profil ; filtre carnet 6→26 espèces ; bouton flottant instruments qui chevauche le contenu mobile ; label « Position GPS récupérée » → « Position trouvée » ; hero « prochain créneau 05:24 » → mention « demain » ; onglet Re-vérifier de /moderation (état vide trompeur) ; embed carte home flaky (retry + fallback honnête).
- **WS5 — Hygiène** : em-dashes copy (~30 au lint, surtout headings MDX guides) ; `.env.example` += 3 vars VAPID ; event PostHog **`signup_completed`** + funnel visite→inscription→1re prise (pilotage amorçage) ; point de calcul des heures de soleil (~14 min d'écart à Brest, coord de référence en pleine mer ?).
- **WS6 — Dette doc** : committer la réorg docs (`docs/sprints/`, `docs/roadmaps/`, suppressions) ; **resync CLAUDE.md §2** sur l'audit du 02/07 ; vérifier RECAP S64.
- **WS-Vérif** : `/verif-sprint` + QA live express (console 0 erreur, headers via curl, funnel PostHog reçoit l'événement).

**Lane John (dashboard, hors code)** : vérifier le **WAF/Challenge Vercel** (503 sur prefetches RSC + `/.well-known/vercel/jwe` — risque crawlers/SEO) ; confirmer que le cron `compute-spot-scores` ne timeout plus (2× le 28/06).

**Critères :** 0 « 157 » hardcodé ; 0 #418 en QA mobile ; CSP enforce sans casse ; signup mesurable dans PostHog ; réorg docs commitée ; CLAUDE.md à jour.

---

### PHASE C — ❌ ANNULÉE (02/07 au soir)

> Le sprint « carte » est annulé après contre-mesures : **desktop sain** (hard reload : load 2,9 s, réseau stabilisé 4,3 s, 0 long task) et **perf + cadrage mobile testés sains par John sur appareil réel** (les captures « plein océan » = artefact du resize fenêtre à 500 px). Cf audit §2.2 corrigé. Reliquats redistribués : **lisibilité bathy** → S70 Bloc D · **étude courants 2D SHOM** → stretch du S72 « Alertes par port » (ou sprint dédié si l'étude est concluante). `docs/sprint-71/BRIEF.md` = tombstone ; **le numéro 71 reste vacant** (décision John 02/07 : alertes = S72, sorties = S73).

---

### PHASE D — Sprint 72 — « Alertes par port » · Effort **M/L** · migration : **106**

**Objectif :** l'argument de conversion n°1 du tier Local : « on te prévient quand TES conditions arrivent sur TON port ». Spot de Pêche le fait en générique (coef > seuil) ; nous on le personnalise via le carnet — inimitable sans nos données. Réf audit §6.B.

**Workstreams :**
- **WS0 — Vérifier l'existant** : la notif « optimal window » (S26) et son cron `personal-window` ; existe-t-il déjà un concept de spot/port favori ? Sinon migration 106 (`favorite_spots` ou favoris par port de référence marées, RLS own-only).
- **WS1 — Moteur** : croiser prévisions (marée/coef/vent Open-Meteo, déjà en cache) × patterns perso (tendances S22 : phase de marée, coef, moment, météo) × port favori → score de fenêtre ; seuil de déclenchement + dédup (1 alerte/fenêtre, pas de spam) ; fallback honnête pour les comptes sans historique (grandes marées génériques, clairement labellisées « générique »).
- **WS2 — Canaux** : push (PWA, `push_subs` existe) + email (Resend, opt-out existant) ; page réglages notifications enrichie (choix port(s), seuil, canaux).
- **WS3 — Vitrine** : bloc sur `/tarifs` + `/home` (« Ta prochaine fenêtre à [port] : samedi 06:10, coef 92 — conditions où tu réussis à 86 % ») ; upsell propre pour Découverte (teaser flouté, honnête).
- **WS4 (stretch, reliquat Phase C annulée)** : étude de faisabilité **courants 2D SHOM** (open data juin 2026, netcdf → tuiles, pipeline offline sans dépendance runtime) → `docs/sprint-72/courants-shom.md`, GO/NO-GO John pour un sprint dédié.
- **WS-Vérif** : tests moteur (cas riches/pauvres en données, dédup, timezone) ; `/verif-sprint` ; vérif RGPD (opt-in canaux, purge à la suppression de compte).

**Critères :** un compte avec historique reçoit une alerte personnalisée justifiée (« pourquoi ») ; un compte vide reçoit du générique labellisé ; 0 doublon d'alerte ; la feature est visible sur /tarifs.

---

### PHASE E — Sprint 73 — « Sorties groupées » · Effort **M** · migration : **107 si besoin**

**Objectif :** densité sociale avec très peu d'utilisateurs : 1 sortie = 1 post riche (N prises + co-pêcheurs tagués + conditions du jour), façon Fishbrain « Trips », branché sur `/sorties` (co-pêchage S25) et le fil. Réf audit §6.C.

**Workstreams :**
- **WS1 — Modèle** : lier prises ↔ sortie (la table outings existe) ; post de sortie agrégé (photos, espèces, stats de session, participants) ; privacy héritée des prises (floutage inchangé, la sortie n'expose JAMAIS plus précis que chaque prise).
- **WS2 — UX** : à la clôture d'une sortie (ou depuis le carnet : « regrouper en sortie »), composer pré-rempli ; tag des co-pêcheurs (follows) avec consentement (le tagué valide avant d'apparaître).
- **WS3 — Wedge RecFishing** : landing SEO « déclaration pêche mer 2026 » (obligatoire depuis 02/2026, app UE) : « logue une fois → déclare RecFishing + analyse tes patterns » ; lier le helper S24 ; 1 guide MDX dédié.
- **WS-Vérif** : `/verif-sprint` + passe adversariale privacy (tag sans consentement impossible, geom agrégée = la plus floue des prises).

**Critères :** une sortie à 2 pêcheurs produit un post riche visible fil + profils ; consentement tag effectif ; landing RecFishing indexable et liée depuis /especes et les guides réglementation.

---

## 3. Lane F — Amorçage (John, dès la fin du S69)

C'est la lane qui décide de tout le reste (audit §2.3 : 19 profils, 7 prises publiques, 1 post).

1. **Minter les codes** (`/moderation` → Invitations, S68) : d'abord 5-10 pour le cercle proche **dès maintenant** (risque anti-cheat acceptable entre amis), la vague « inconnus » (clubs, forums, groupes FB pêche) **après le S69**.
2. **Objectif chiffré 4 semaines** : 20 fondateurs actifs, 100 prises loguées (dont 30+ publiques), 1er classement départemental publié (seuil k-anon atteint naturellement).
3. **Curation des 942 spots importés** : rythme décidé (ex. 50/semaine via l'onglet « Imports à curer ») ; si trop lourd → mini-sprint « outillage curation IA » (préremplissage fiche + validation humaine).
4. **Mesure** : le funnel `signup_completed` (S70) devient le tableau de bord hebdo ; `paywall_viewed` (35/mois) vs `checkout_started` (1) = la conversion à surveiller quand les alertes S72 débarquent.
5. **César** : les surfaces à donner à manger aux réseaux existent (cartes de partage S45+, records, défis, saisons) — brancher le calendrier de contenu sur les sorties des fondateurs.

---

## 4. Gate mobile (redéfini post-audit)

On n'ouvre la phase Expo/React Native (cf `ROADMAP-PRE-MOBILE-2026-06-26.md`) que quand :
- ✅ S69 livré (intégrité) — la carte, elle, est vérifiée saine (contre-mesures 02/07) ;
- ✅ ≥20 fondateurs actifs et ≥1 classement publié (la dopamine multi-joueur prouvée à petite échelle) ;
- ✅ Alertes par port (S72) en prod = l'argument de rétention qui justifie le push natif ;
- ✅ Funnel PostHog en place (on saura mesurer le mobile dès J1).

Items réservés à la phase mobile : **mesure IA par photo sans objet de référence** (auto-remplissage carnet + anti-cheat ultime, cf onWater/Everyfish), IAP Apple, validation communautaire des défis en masse. Idée à garder au chaud : partenariat scientifique FR (Ifremer/CNRS) façon Fishbrain×Cefas.

---

*Rédigé le 2026-07-02 à partir de `docs/audits/AUDIT-2026-07-02.md` (audit 5 axes + 2 passes QA live). Prod au moment de l'écriture : `1014bf2` (S68, migrations 104/104b), 106+ migrations appliquées, 695 tests verts. Prochaine migration : 105. À la prochaine décision majeure, mettre à jour CLAUDE.md (§2 et §9 — le resync est un WS du S70).*
