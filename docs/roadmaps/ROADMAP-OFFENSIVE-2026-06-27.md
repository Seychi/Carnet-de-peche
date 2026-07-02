# ⚔️ Roadmap Offensive — Carnet de Pêche (Sprints 37 → 41)

> **Date** : 2026-06-27 · **Auteur** : Claude (grounded sur audit live + cartographie code réelle) · **Pour** : John
> **Objet** : transformer le moat « carnet perso » en arme offensive contre FishFriender, Decathlon Fishing, Fishing Grid et spot-de-peche, via 8 nouvelles features réparties en 5 sprints.
>
> **Décisions de cadrage (validées John, 2026-06-27)** :
> - **Séquencement équilibré** : chaque sprint livre un quick win visible ET avance le moat profond.
> - **Hybride web/mobile** : on construit en web les fondations data + scoring (réutilisables tel quel par le mobile), on diffère au mobile la **capture caméra native** (F7) et le **push natif iOS** (F4). Zéro travail jeté.
> - **Boîte à matériel = leurres/montages d'abord** (pas de catalogue 160k produits à la FishFriender).
> - La perf carte et le réservoir vide **ne sont PAS traités ici** (décision John : ça tourne bien, pas des verrous). Cette roadmap **remplace** le créneau « S37 amorçage » de `ROADMAP-PRE-MOBILE-2026-06-26.md`.

---

## 1. La thèse offensive en 30 secondes

Tous les concurrents donnent la **même** donnée à tout le monde (météo générique, solunaire standard, spots flous). Notre seul terrain de victoire défendable, c'est la **personnalisation par le carnet**. Les 8 features visent un seul but : rendre ce moat **visible, partageable et proactif**, et planter un drapeau exactement sur les **3 faiblesses publiques** des concurrents :

| Concurrent | Sa faiblesse n°1 (vérifiée) | La feature qui frappe |
|---|---|---|
| **FishFriender** | Boîte à matériel **générique** (160k produits, mais zéro perso) | **F1** Boîte à matériel **personnalisée** (« ton shad chartreuse sort 60% de tes bars ») |
| **Decathlon Fishing** | « un spot c'est un GPS fixe, pas un point qui bouge » (avis cinglant) | **F2** Badge **spot GPS vérifié** |
| **Fishing Grid** | Marées imprécises (~30 min d'écart, avis publics) | **F3** Marées **vérifiées port par port** |
| **spot-de-peche** | Scoring 100% générique, aucun carnet | **F4** Notif **« fenêtre optimale selon TON historique »** + **F5** comparateur perso |

---

## 2. Principes directeurs (à respecter dans CHAQUE sprint)

Gravés dans le marbre du projet, à ne jamais enfreindre :

1. **Le moat reste gratuit.** Carnet, tendances perso, boîte à matériel, comparateur, fil : gratuit. On ne fait payer que ce qui se voit au mètre (coords GPS exactes, score par spot, bathy).
2. **Scoring DESCRIPTIF, jamais prédictif.** On dit « tu pêches mieux en descendante coef > 80 » (fait observé), jamais « ça va mordre à 14h » (prédiction). Aucun chiffre 0-100 perso.
3. **Floutage GPS 3 couches intact.** Aucune feature n'expose `geom` précis à un non-abonné ou via une image partageable. Co-pêchage = département + label texte, jamais de coords. OG images = espèces + façade + taux, jamais de point.
4. **Pas de leaderboard.** La gamification (badges, prise vérifiée) reste privée au propriétaire (`user_badges` RLS owner-only).
5. **Jamais inventer une donnée marine.** Pas de coef de marée fabriqué, pas de PM/BM non sourcé.
6. **Discipline migrations.** 1 fichier numéroté séquentiel par changement (`059_*` → `066_*`), RLS d'abord, puis policies, puis regen `lib/types.ts`. Jamais éditer un ancien fichier.
7. **Anti course-à-l'armement.** On ne court PAS après les 160k produits de FishFriender ni les 10 000 spots de spot-de-peche. On gagne en profondeur perso, pas en volume.
8. **Copy sans tiret cadratin** en prose visible (virgule / parenthèses / deux-points).

---

## 3. Vue d'ensemble des 5 sprints

| Sprint | Nom | Quick win (visible) | Moat (profond) | Migrations | Taille |
|---|---|---|---|---|---|
| **37** | Le matériel qui parle | **F2** Badge spot GPS vérifié | **F1** Boîte à matériel perso → nouveau facteur de scoring | `059_catch_gear`, `060_spot_verification` | L |
| **38** | Le partage qui rend viral | **F5** Partage social façon Strava (carte de prise virale) | Moat rendu **partageable** (carte « conditions gagnantes ») + **F3** marées vérifiées (second) | `061_shared_cards`, `062_tide_calibration` | M-L |
| **39** | Le carnet qui te prévient | **F7** (fondation) Prise vérifiée + badge | **F4** Notif « fenêtre optimale » en Web Push | `063_push_subscriptions`, `064_catch_verification` | M-L |
| **40** | La meute | (polish co-pêchage visible) | **F8** Muscler le co-pêchage (matching + chat + statuts) | `065_outings_muscle` | M-L |
| **41** | La carte dense | **F6** Carte 157 → 400+ spots | (qualité k-anon renforcée) | `066_spot_density` | L |

**Dépendances clés** (issues de la carto code) :
- Le **moteur de scoring perso** (`lib/scoring/personal/`) est le socle de **F1, F4, F5**.
- Le **schéma `catches`** débloque **F1 (gear)** et **F7 (vérif)** ; F1 **enrichit ensuite** le scoring d'un facteur « leurre ».
- **F2** est quasi prêt (`spots.verified` + `source` existent déjà, exposés au front) : surtout de la traçabilité + UI.
- **F4** réutilise le cron `personal-window` + `matchPersonalWindow()` déjà codés ; net-neuf = le **canal push** (VAPID + `push_subscriptions` + handler SW).
- **F3** et **F8** sont autonomes (réutilisent `verify-tides.ts` et le système de notif).

> **Ordre conseillé strict** : 37 → 38 → 39 → 40 → 41. F1 (S37) crée le facteur « leurre » que F5 (S38) projette ; F4 (S39) a besoin d'un carnet déjà enrichi pour être pertinent ; F6 (S41, le plus lourd) profite du badge vérifié de F2.

---

## 4. Sprint 37 — « Le matériel qui parle »

### Objectif
Frapper FishFriender sur son seul vrai avantage en le rendant **personnel**, et planter le drapeau « spot vérifié » contre Decathlon. À la fin : une prise peut porter son leurre/montage, et le carnet sait dire **« ton shad chartreuse sort 60% de tes bars »**.

### F1 — Boîte à matériel personnalisée (leurres/montages d'abord)

**Ce qui existe** : `catches` porte déjà 4 colonnes texte plates `lure_brand`, `lure_model`, `bait_type`, `bait` (saisies libres, jamais réutilisées), et le moteur `lib/scoring/personal/` bucketise 5 facteurs (`hour|weekday|season|wind|tide`) mais **ignore le matériel**.

**Workstreams** (parallélisables) :
- **WS1 — Schéma** (`059_catch_gear.sql`) : table `gear_items` (`id, user_id, kind {leurre|montage|appat}, brand, model, color, size_mm, notes, archived, created_at`), RLS owner-only, FK `catches.gear_id` (nullable, `ON DELETE SET NULL`). Migration de confort : backfill best-effort des `lure_brand/model` existants en `gear_items`. Regen `lib/types.ts`.
- **WS2 — Saisie** : dans `components/catches/CatchForm.tsx`, remplacer les champs texte libres par un **picker « ma boîte »** (autocomplete sur `gear_items` + création inline), conditionné à la technique (déjà géré : leurre ↔ appât). Garder la saisie libre en fallback.
- **WS3 — Scoring** : étendre `lib/scoring/personal/buckets.ts` + `config.ts` + `tendencies.ts` d'un **facteur `gear`** (bucket = `gear_item` dominant par espèce). Réutiliser la mécanique `sampleCount` + confiance existante. Afficher dans `components/scoring/PersonalTendencies.tsx` (« Ton meilleur leurre sur le bar : Shad chartreuse 10cm, 6 prises sur 10 »).
- **WS4 — Vue boîte** : page `/carnet/boite` (ou onglet) listant `gear_items` avec leur **taux de réussite par espèce** (lecture via `catches_for_viewer`). C'est le morceau partageable et addictif.

**Critères d'acceptation** :
- Loguer une prise en sélectionnant un leurre de sa boîte (ou en le créant) ; le leurre est réutilisable sur la prise suivante.
- Avec ≥ 3 prises sur une espèce, la tendance affiche le facteur leurre dominant + part + confiance.
- 0 chiffre prédictif ; tout reste descriptif et gratuit.
- `gear_items` invisible aux autres (RLS), aucun leak via le fil.

### F2 — Badge « spot GPS fixe vérifié »

**Ce qui existe** : `spots.verified` (boolean) **+** contrainte `verified ⇒ source='curated'`, et `get_spots_for_map` / `get_spot_by_slug` **exposent déjà** `verified` et `source` jusqu'au front (`lib/map/utils.ts:toSpotMarker`). Il manque la traçabilité, l'UI et le flip.

**Workstreams** :
- **WS5 — Traçabilité** (`060_spot_verification.sql`) : ajouter `spots.verified_at`, `verified_by` ; exposer `verified`/`source` aussi dans `nearby_spots` et `get_top_spots_for_species` (aujourd'hui absents) ; notif `spot_verified` au proposeur quand son spot passe vérifié.
- **WS6 — UI badge** : pastille « ✓ Coordonnée vérifiée » sur le marqueur carte, la fiche spot et les listes. Tooltip explicatif (« vérifié à la main, coordonnée fixe, pas un point communautaire approximatif »). C'est l'angle marketing anti-Decathlon : à mettre en avant dans la copy.
- **WS7 — Workflow modération** : dans `/moderation`, action « marquer vérifié » (modérateur) qui set `verified=true, verified_at, verified_by`.

**Critères d'acceptation** :
- Un spot curé affiche le badge partout ; un spot communautaire ne l'affiche jamais.
- Le proposeur reçoit une notif à la vérification.
- Aucune fuite de `geom` précis (le badge n'élève pas le tier).

**Estimation** : L (F1 est le gros morceau). **Décision pour John** : périmètre exact des `kind` de la boîte (leurre + montage + appât suffisent v1 ? on exclut canne/moulinet → oui, confirmé « leurres d'abord »).

---

## 5. Sprint 38 — « Le partage qui rend viral »

> **Détail complet et exécutable : `docs/sprint-38/BRIEF.md`.** Recentré (demande John 2026-06-27) sur un vrai moteur de partage social façon Strava, désormais la **pièce maîtresse** du sprint. F3 (marées) passe en second et peut slipper au sprint 39.

### Objectif
Transformer chaque belle prise en acquisition : générer en un tap une **carte image léchée** (de la prise, ou du résumé « conditions gagnantes ») partageable sur les réseaux via une page publique `/c/[slug]`, **sans jamais révéler le spot** (anti spot-burning = différenciateur). Munition directe pour la lane César (TikTok/Insta).

### F5 (élargi) — Moteur de partage social « façon Strava » (la pièce maîtresse)

**Architecture clé** : la génération d'image tourne en **edge** (`next/og`), qui ne peut lire ni le carnet, ni le scoring, ni la photo (bucket privé). Donc une **server action server-only** calcule un payload **public sans geom** et écrit une ligne `shared_cards` ; l'edge ne lit QUE `shared_cards` (client anon) et dessine la carte.

**Workstreams** (détail dans le brief) :
- **A — Infra** (`061_shared_cards.sql`) : table publique-en-lecture / écriture-owner + server action `createShareCard` (payload geom-free : carte de prise OU conditions).
- **B — Route OG edge** `app/og/card/[slug]` : template marin extrait, layouts **carte de prise** (espèce + taille héro + conditions + leurre + pastille « record perso ») et **carte « conditions gagnantes »**, aux formats **OG 1200×630** et **Story 1080×1920**.
- **C — Page publique `/c/[slug]` + UX partage** : preview OG soignée + CTA carnet ; upgrade du `navigator.share` existant pour partager **l'image** (Web Share avec fichier), fallback download desktop. Marque sur chaque carte (le « via Strava »).
- **D — Cadrage « record perso »** (max taille par espèce) + opt-in/privacy stricts.

**Critères d'acceptation** :
- Carte de prise + carte conditions générées ; collage du lien `/c/[slug]` = preview riche (X/Discord/iMessage) ; Web Share mobile **avec image** (Story 1080×1920).
- **0 coordonnée** dans le payload `shared_cards` (anti spot-burning), opt-in strict, carte révocable (→ 404).

### F3 — Marées « vérifiées port par port » (second, peut slipper)

Réutilise `scripts/verify-tides.ts` (compare déjà nos PM/BM dérivés d'Open-Meteo vs SHOM sur 5 ports, biais signé, verdict 15 min). Migration `062_tide_calibration.sql` (table de calibration lue par `lib/conditions/tide.ts`), audit élargi à 5 ports étalon par façade (Manche / Atlantique / Méditerranée), UI confiance sourcée + datée sur la fiche spot (« écart médian N min vs SHOM, audité le JJ/MM »). Argument anti-Fishing Grid.

**Critères d'acceptation** :
- 5 ports audités, stockés, datés, écart médian affiché ; aucun coef inventé.

**Estimation** : M-L (le moteur de partage est le gros morceau). **Si A-D consomment le sprint, F3 slippe au sprint 39.** **Décision (D3)** : afficher la précision mesurée (reco v1) ou appliquer l'offset en prod (v2) ?

---

## 6. Sprint 39 — « Le carnet qui te prévient »

### Objectif
La killer feature : pendant que les autres poussent du solunaire générique, **on prévient chacun selon SON historique**. Et on pose la fondation « prise vérifiée » (table stake) côté data, sans attendre le natif.

### F4 — Notif push « fenêtre optimale selon TON historique » (Web Push, hybride)

**Ce qui existe** : le **contenu** est déjà produit. Cron `app/api/crons/personal-window/route.ts` (Vercel `0 7 * * *`) : gate `current_tier ∈ {local,itinerant}`, idempotent/jour, `computePersonalTendencies` + `getDeptNextWindow` + `matchPersonalWindow()` → insert `notifications` (in-app Realtime OK). Net-neuf : **aucun canal push navigateur** (pas de VAPID, pas de `push_subscriptions`, le SW ne fait que du cache).

**Workstreams** (hybride : Web Push maintenant, push natif iOS différé au mobile) :
- **WS1 — Canal push** (`063_push_subscriptions.sql`) : table `push_subscriptions` (`user_id, endpoint, p256dh, auth, ua, created_at`), RLS owner. Clés **VAPID** en env (jamais commitées). Package `web-push` côté serveur.
- **WS2 — SW + opt-in** : handler `push` + `notificationclick` dans `public/sw.js` ; UX d'opt-in explicite (`Notification.requestPermission()`) au bon moment (après 1re prise, pas à froid), gérée RGPD comme l'optin email.
- **WS3 — Brancher le cron** : le cron `personal-window` envoie désormais le Web Push **en plus** de la notif in-app, aux abonnés Local/Itinérant ayant opté-in. Idempotence conservée.
- **WS4 — Réglages** : page notifs : toggles par type (fenêtre optimale, grandes marées, social), respect du gate tier.

**Couverture (hybride)** : Web Push couvre Android, desktop, et **PWA installée iOS 16.4+**. Le push natif iOS plein écran (hors PWA) reste pour la phase mobile (Expo Notifications). On documente la couverture, on ne jette rien.

**Critères d'acceptation** :
- Un abonné Local opté-in reçoit, le matin, un push « Belle fenêtre à 11h30 à Cap Sizun, descendante : c'est TA config gagnante » basé sur ses tendances.
- Un gratuit ne reçoit pas le push (gate tier respecté) mais voit la valeur (upsell).
- Opt-in/opt-out propre, 0 push à froid, `CRON_SECRET` requis.

### F7 (fondation) — Mesure / prise vérifiée + badge (capture native différée)

**Ce qui existe** : `catches` porte `size_cm`, `weight_g`, `photo_path`, mais **aucun champ de vérification** ; `recompute_my_badges()` (`056`) gère 6 badges privés, extensible.

**Workstreams (fondations web only ; caméra + IA espèce on-device = phase mobile)** :
- **WS5 — Schéma vérif** (`064_catch_verification.sql`) : `catches.photo_verified_at`, `measured_length_cm`, `reference_object` (ex : leurre de taille connue dans la photo) ; règle `prise_verifiee` dans `recompute_my_badges()` ; entrée catalogue dans `lib/gamification/badges.ts`.
- **WS6 — Flux manuel web** : dans le form, aide à la mesure (« pose un objet de référence », saisie longueur mesurée), flag « prise vérifiée » + badge privé. Pas d'IA ici : on prépare juste la donnée que le mobile remplira automatiquement.

**Critères d'acceptation** :
- Une prise peut être marquée « vérifiée » (mesure + photo) et débloque le badge privé.
- Schéma prêt pour que le mobile y branche caméra + reconnaissance espèce sans nouvelle migration.
- Badges restent privés (no leaderboard).

**Estimation** : M-L. **Décision (D2) tranchée** : photo/IA = **hybride**, data web maintenant, capture native au mobile.

---

## 7. Sprint 40 — « La meute »

### Objectif
Garder l'avance sur le collaboratif (Decathlon « sorties collaboratives », Fishing Grid « groupes + chat temps réel ») en musclant le co-pêchage déjà livré.

### F8 — Muscler le co-pêchage

**Ce qui existe** : `outing_proposals` + `outing_participants` (`053`), 5 actions (`proposeOuting`, `requestJoin` → notif, `respondToParticipant` → notif, `cancelOuting`, `withdrawJoin`), vue `outing_proposals_for_viewer`, page `/sorties`. Net-neuf : pas de chat, pas de matching (ni species ni spot FK ni geom sur la proposition), transitions de statut non automatisées.

**Workstreams** :
- **WS1 — Matching** (`065_outings_muscle.sql`) : colonnes `species[]` et `spot_id` (nullable) sur `outing_proposals` (toujours zéro coord exposée : on garde `area_label`), pour filtrer/proposer par espèce et zone. Transitions auto `open → full` à capacité, `→ cancelled/done`.
- **WS2 — Chat de sortie** : table `outing_messages` (`proposal_id, user_id, body, created_at`), RLS = participants acceptés + host uniquement, Realtime (réutiliser le pattern fil/notifs). Anti-leak : aucun message ne peut contenir de coordonnée poussée par le système.
- **WS3 — Notifs de groupe** : nouveaux types (`outing_full`, `outing_cancelled`, `outing_message`, `outing_reminder` la veille). Réutiliser `createNotification` + le canal Web Push de S39.
- **WS4 — UX** : fil de la sortie, liste des participants, statut, bouton « rappel veille ». Garder le ton anti-comparaison (pas de classement de pêcheurs).

**Critères d'acceptation** :
- Je filtre les sorties par espèce/zone, je rejoins, je discute dans un chat privé à la sortie, je reçois un rappel la veille.
- Toujours département + label, **jamais de coordonnée** (anti spot-burning).
- RLS fail-closed : un non-participant ne voit ni le chat ni la liste.

**Estimation** : M-L (le chat Realtime + RLS est le morceau sensible).

---

## 8. Sprint 41 — « La carte dense »

### Objectif
Ne plus paraître squelettique face aux 10 000 spots revendiqués par spot-de-peche, **sans** trahir nos principes (qualité curée + anonymat). Passer de 157 à 400+ points utiles.

### F6 — Densifier la carte (hybride curé + généré communautaire k-anon)

**Ce qui existe** : `spots.source` (`curated|community|imported`), blur 3 couches, `get_quality_cells` (heatmap k-anon K=3, `044`), gate freemium 3 spots/dépt (`029`), `scripts/import-osm-spots.ts`, process `docs/sprint-10/spots-curation.md`.

**Workstreams** :
- **WS1 — Curation accélérée** : lots de spots curés par façade (priorité Atlantique/Méditerranée sous-couverts), validés par John avant insert (process existant). Cible +150 curés.
- **WS2 — Couche « zones actives » générée** (`066_spot_density.sql`) : à partir des prises publiques agrégées en **cellules k-anon** (réutiliser `get_quality_cells`), exposer des « zones qui produisent » distinctes des spots curés. Jamais un point individuel sous le seuil K. C'est la densité **sans** spot-burning ni invention.
- **WS3 — Lisibilité** : distinguer visuellement curé-vérifié (F2) / communautaire / zone générée ; compteur « N spots + M zones actives par département ».
- **WS4 — Import OSM raisonné** : compléter via `import-osm-spots` (`source='imported'`), marqué comme tel, jamais « vérifié ».

**Critères d'acceptation** :
- 400+ points utiles affichés au total, **chaque source clairement étiquetée**.
- Aucune cellule générée sous K=3, aucun `geom` précis exposé au gratuit.
- Le gate freemium (3 spots/dépt) reste respecté.

**Estimation** : L (curation = travail de fond étalable ; la couche générée est le morceau technique).

---

## 9. Ce qui est explicitement REPORTÉ au mobile

Cohérent avec le choix « hybride ». On pose les fondations data en web, on finit en natif :

- **F4 — Push natif iOS plein écran** (hors PWA) : Expo Notifications. Le contenu + le ciblage perso + `push_subscriptions` sont déjà faits.
- **F7 — Capture caméra + reconnaissance d'espèce on-device + auto-mesure photo** : le schéma `catch_verification` les attend, zéro migration supplémentaire côté mobile.
- Rappel : l'IA reconnaissance d'espèce sur 6 espèces du bord a une faible valeur d'usage mais un fort potentiel d'acquisition (hook TikTok). À cadrer en phase mobile, pas avant.

---

## 10. Ce qu'on ne fait PAS (anti-scope)

Pour tenir la ligne et ne pas se disperser :

- ❌ Catalogue matériel à 160k produits (FishFriender). On reste leurres/montages perso.
- ❌ Course aux 10 000 spots (spot-de-peche) ou 266 fiches creuses (Fishing Grid). Densité k-anon + curation qualité.
- ❌ Scoring prédictif / « ça va mordre à 14h ». Descriptif only.
- ❌ Leaderboard / classement de pêcheurs. Gamification privée.
- ❌ Marketplace / affiliation matériel : post-MVP, hors de cette roadmap (cohérent CLAUDE.md).
- ❌ Toute exposition de `geom` précis via image, chat, co-pêchage ou zone générée.

---

## 11. Lignes de lancement (mode ultracode, à copier-coller)

Chaque sprint suit `docs/BRIEF-TEMPLATE.md` (workstreams parallèles, critères vérifiables, WS de vérif final). Exemple pour le premier :

> `ultracode xhigh` — Sprint 37 « Le matériel qui parle ». Implémente F1 (boîte à matériel perso leurres/montages : migration `059_catch_gear`, picker dans CatchForm, facteur `gear` dans lib/scoring/personal, vue /carnet/boite) et F2 (badge spot GPS vérifié : `060_spot_verification`, expose verified/source dans nearby_spots + get_top_spots_for_species, UI badge, action modération). Respecte : moat gratuit, scoring descriptif, RLS owner sur gear_items, floutage GPS intact, copy sans tiret cadratin. Découpe en workstreams parallèles + WS de vérif (Vitest + build + relecture anti-régression gating/floutage). Écris d'abord les migrations en fichiers numérotés, ne push pas sans ma validation.

Réplique le même cadre pour 38 → 41 en pointant les migrations et workstreams listés ci-dessus.

---

## 12. Récap décisions encore ouvertes pour John

1. **F3** : afficher seulement la précision mesurée (reco v1) ou appliquer l'offset marée en prod (v2) ?
2. **F1** : confirmer qu'on s'arrête à leurre + montage + appât (pas canne/moulinet) en v1. (Réponse actuelle : oui.)
3. **Numérotation** : ces sprints prennent les numéros 37 → 41 et **remplacent** le créneau « S37 amorçage » de la roadmap pré-mobile (le réservoir est volontairement déprioritisé). OK pour toi ?
4. **Marketing** : les quick wins F2 (badge vérifié), F3 (marées vérifiées) et F5 (cartes de partage façon Strava) sont les meilleures munitions pour César. On lui réserve la com de chaque sortie de sprint ?

---

*Roadmap grounded sur : audit `docs/audits/AUDIT-2026-06-27-SITE-10-AVANT-MOBILE.md` + cartographie code live (lib/scoring/personal, catches schema, notifications/cron, lib/conditions + verify-tides, spots/RPC, outings, og-images, gamification) + benchmark concurrents 2026-06-27. À convertir en briefs de sprint individuels au fil de l'eau.*
