# 🚀 Roadmap « Niveau supérieur » — Carnet de Pêche — H2 2026

> Suite de l'audit `docs/audits/AUDIT-2026-06-23.md` (post sprint 20 + carte v2). Objectif de John : **rendre le site complet et écraser la concurrence AVANT de passer à l'app mobile**. Caps choisis : profondeur produit + solidité/dette + croissance/SEO + monétisation, en menant **« build deep » et « launch-readiness » en parallèle**.
>
> Mode d'exécution : `ultracode` / effort `xhigh`, workstreams parallèles + workstream de vérif final (cf `CLAUDE.md §19`).

---

## 0. Le reframe (à garder en tête tout du long)

Tu n'as pas un problème de features — tu en as **plus** que tes concurrents. Tu as un problème de **promesse non tenue + réservoir vide** :

- Ton moat (« le carnet apprend de TES prises ») **n'est pas branché** (score générique solunar) et **pas nourri** (~5 prises publiques).
- Ton levier de croissance défendable (SEO espèces/réglementation/spots) est **en retard** alors qu'il marche **sans utilisateurs**.
- Une **fenêtre réglementaire 2026** (RecFishing + quotas) est **ouverte et inoccupée**.

La roadmap attaque dans cet ordre de valeur : **(1) rendre le moat réel → (2) le remplir + lancer → (3) prendre le terrain SEO/réglementaire → (4) convertir → (5) durcir → (6) mobile.**

---

## 1. Les gros chantiers (catalogue)

Chaque chantier est noté sur **Impact** (écraser la concurrence) × **Défendabilité** (dur à copier) × **Effort**. `★` = priorité.

---

### ★ CHANTIER A — « Le carnet qui parle » : rendre le scoring perso RÉEL et visible
**Axe : Profondeur · le vrai moat. Impact 🔥🔥🔥 · Défendabilité 🛡🛡🛡 · Effort : moyen-élevé.**

> C'est LE chantier qui transforme le produit. Aujourd'hui ta promesse est du marketing ; après, c'est un fait.

**Pourquoi.** Le multiplicateur perso est neutralisé depuis le sprint 7.5. La couche qualité C3b a une composante perso mais elle est gatée Itinérant et invisible ailleurs. Résultat : le score que tout le monde voit est un solunar générique = indifférenciable des concurrents.

**Ce qu'on fait.**
- **Overlay perso descriptif et honnête**, calculé depuis le carnet du user : *« Tu prends 70 % de tes bars en marée descendante, coef > 80, le matin, après 2 j sans pluie. »* Pas de boîte noire : on **montre les patterns**, on ne « prédit pas le mordant » (honnêteté 7.5 + solunar scientifiquement contesté → on assume « révèle TES patterns »).
- **« Score global vs TON score » côte à côte** sur la fiche spot, la carte (couche « Ton score » déjà amorcée) et bientôt la fiche espèce (Chantier B).
- **Dégradation gracieuse + niveau de confiance** : avec 3 prises → « tendance », avec 15 → « fiable ». Jamais de chiffre inventé ; on affiche la confiance.
- **Anti cold-start individuel** : à l'onboarding, « importe/saisis tes dernières sorties » pour amorcer le perso plus vite (le moat ne vaut que par le volume).
- **Notification proactive personnalisée** (préparée ici, livrée en push au mobile) : *« Demain 7-9 h à [ton spot] : 9/10 pour TOI. »*

**Critères d'acceptation.**
- Un user avec ≥ N prises voit un score perso distinct du global, décomposé et sourcé sur ses propres données.
- 0 chiffre perso affiché sans données réelles (sinon état honnête « loggue X prises pour débloquer »).
- Tests unitaires sur le calcul perso + cas « peu de données ».

**Décision John requise.** Fenêtre temporelle du perso (30 j ? saison ? illimité = meilleur pour le moat) ; seuil N minimal ; gating (le perso descriptif reste-t-il Itinérant, ou devient-il l'argument de conversion Local ?).

---

### ★ CHANTIER B — « Pôle Espèces » : 20 espèces + score par espèce sur la fiche + tout connecter
**Axe : Profondeur + SEO. Impact 🔥🔥🔥 · Défendabilité 🛡🛡 · Effort : élevé (surtout éditorial).**

> Ta demande explicite, faite *correctement* : pas « plus de pages », mais des fiches **profondes + scorées + connectées**.

**Pourquoi.** 6 fiches aujourd'hui (objectif ~20), et **aucun score par espèce dessus**. Fishing Grid a 266 fiches creuses ; on gagne en **profondeur**, pas en quantité.

**Ce qu'on fait.**
- **Étendre 6 → ~20 espèces du bord** au même standard (réglementation sourcée + datée, saisons par façade) : mulet, vieille, congre, chinchard, oblade, pageot, plie, flet, bar moucheté, rouget, seiche/calmar (céphalopodes pêchés au bord), etc. (liste à arbitrer).
- **Surfacer un « score par espèce » sur la fiche espèce** : *« Le bar en ce moment sur tes côtes : 8/10 »* (réutilise `get_quality_cells` + solunar + ton perso), + **meilleurs spots pour cette espèce** + **meilleurs créneaux 7 j**.
- **Maillage croisé** : espèce ↔ spots (où la pêcher) ↔ couche carte qualité ↔ guides ↔ réglementation. Une espèce devient un *hub*.
- **og:image par fiche** (trou SEO actuel) + harmonisation JSON-LD.

**Critères d'acceptation.**
- ~20 fiches en ligne, chacune avec score espèce + top spots + créneaux + og:image + Breadcrumb.
- Sitemap et maillage interne à jour ; 0 fiche orpheline.

**Décision John requise.** Liste exacte des ~20 espèces (priorité par volume de recherche + pêchabilité du bord) ; le score espèce sur la fiche est-il gratuit (aperçu) ou gaté ?

---

### ★ CHANTIER C — « Conformité & Confiance » : moteur réglementation FR + RecFishing + IA espèces + marées
**Axe : Profondeur + SEO + Trust, ultra-défendable. Impact 🔥🔥🔥 · Défendabilité 🛡🛡🛡 · Effort : moyen.**

> La fenêtre 2026. Datée dans le temps : à prendre maintenant.

**Ce qu'on fait (4 briques, priorisables séparément) :**
1. **Moteur réglementation sourcé/daté/localisé** comme produit SEO de fond : pages espèce × façade × département, citant les arrêtés (Légifrance), `verified_at` visible, **refresh trimestriel**. Coche les 3 leviers SEO 2026 (freshness = facteur de citation IA, E-E-A-T, local).
2. **Helper RecFishing intégré au carnet** : depuis une prise (bar, lieu jaune…), « préparer ma déclaration » + rappels quota/maille/fenêtre datés par façade. *(Vérifier d'abord ce que l'API/portail RecFishing permet — ne pas sur-promettre l'export auto.)* **Zéro concurrent ne le fait pour le bord.**
3. **IA reconnaissance d'espèces via Fishial.AI** (API cloud, 865 espèces — pas de modèle à entraîner) : la photo **pré-remplit la prise ET vérifie la maille** (*« ce bar ~38 cm < 42 cm : à relâcher »*). On transforme une commodité en **garde-fou réglementaire français**. Comble la table stake manquante.
4. **Audit précision marées** (risque de confiance #1) : vérifier Open-Meteo Marine vs SHOM sur un panel de ports (dont Med/Corse où on a vu 0/35) ; bascule **WorldTides/SHOM** si l'écart est gênant.

**Critères d'acceptation.** Réglementation par espèce/façade vérifiée + datée + sources ; flux « loguer → déclarer/rappel » fonctionnel ; reco photo branchée avec vérif maille ; rapport marées avec décision go/no-go SHOM.

---

### ★ CHANTIER D — « Amorçage & Lancement » : remplir le réservoir + ouvrir
**Axe : Lancement + Croissance. Impact 🔥🔥🔥 · Défendabilité 🛡 · Effort : moyen (produit) + fort (growth, lane César).**

> Sans data, les Chantiers A/B et la carte v2 restent des coquilles vides.

**Ce qu'on fait.**
- **Hygiène pré-lancement** (rapide, cf Chantier 0) : purger le seed de test du fil, og:image, copy « Bretagne » → couverture nationale réelle (24 dépts).
- **Stratégie d'amorçage de la data** (décision produit, cf plus bas) : (a) **beta « pêcheurs fondateurs »** invités à loguer publiquement pour allumer heatmap/qualité ; et/ou (b) **seed de prises de démo crédibles** clairement signalées ; et/ou (c) **assouplir temporairement le seuil k-anon** d'aperçu.
- **Log de la sortie bredouille (le « zéro »)** : petit à coder, gros pour la data (sans les zéros, pas de scoring honnête) — et faille publique de FishFriender/Fishing Grid.
- **Time-to-value à froid** : un nouvel user sans historique reçoit quand même de la valeur (solunar + espèces + spots + communauté) et des **empty-states qui vendent le futur** (« loggue 5 prises → débloque ton score perso »).
- **Boucle d'acquisition réglementaire** : RecFishing comme hook (« l'app qui t'aide à être en règle »).

**Critères d'acceptation.** Carte « vivante » non vide en démo ; nouvel utilisateur a une première valeur en < 2 min ; plan beta prêt (invitations, objectifs de volume de prises).

**Décision John requise (importante).** Seed de démo **oui/non** et sous quelle forme honnête (le produit a une culture forte d'anti-fake — à respecter) ; canal beta (César) ; objectif chiffré de prises publiques avant ouverture large.

---

### CHANTIER E — « Croissance SEO + contenu » : le moteur qui tourne sans utilisateurs
**Axe : Croissance. Impact 🔥🔥 · Défendabilité 🛡🛡 · Effort : éditorial soutenu.**

**Ce qu'on fait.**
- **Guides 5-6 → 20+ « phares »** (le vrai retard plan/live).
- **Pages programmatiques DEEP** : espèce × département × technique, **500-800 mots vraiment locaux** (les templates « ville swappée » ne rankent plus en 2026 ; AI Overviews cannibalisent le générique).
- **Harmonisation SEO** : JSON-LD (ItemList sur `/guides`, Breadcrumb sur guides détail), og:image partout, freshness datée (avantage `verified_at`).
- **Vidéo courte data-driven** (skill `video-courte-peche`, lane César) branchée sur les hubs espèces/réglementation → canal de découverte n°1 en 2026.

**Critères d'acceptation.** ≥ 20 guides ; pages programmatiques indexées et profondes ; 0 incohérence JSON-LD ; calendrier de refresh trimestriel.

---

### CHANTIER F — « Monétisation intelligente » : convertir une fois le moat réel
**Axe : Monétisation. Impact 🔥🔥 · Défendabilité 🛡🛡 · Effort : moyen.**

> À faire **après** A/B (il faut quelque chose qui mérite d'être payé).

**Ce qu'on fait.**
- **Faire du scoring perso (Chantier A) l'argument de conversion** : c'est ÇA qu'on paie, pas juste « coords précises + filtres ». Le social reste gratuit (aligné sur ce qui marche : l'abo est le seul modèle prouvé en pêche ; **la marketplace est un cimetière** — Fishbrain l'a tuée).
- **Tunnel de conversion** : onboarding → essai 7 j → payant ; relances ; **push annuel** (-17 %) ; satisfait-ou-remboursé mis en avant.
- **Notification perso proactive** = feature payante à forte valeur perçue.
- **Affiliation matériel** (Decathlon/Caperlan via Rakuten, ~6-7 %) en *complément discret*, pas en pilier.

**Critères d'acceptation.** Funnel mesuré (PostHog), point de conversion clair branché sur le moat, pas de dark pattern.

---

### ★ CHANTIER G — « Communauté vivante & prises vérifiées » (validé John, 2026-06-23)
**Axe : engagement + rétention + confiance. Impact 🔥🔥 · Défendabilité 🛡🛡 · Effort : moyen.**

> Trois briques qui s'emboîtent : des prises **vérifiées** nourrissent une gamification **crédible** et un fil **plus vivant**. C'est le pilier « rétention » qui manquait à la roadmap.

**G1 — Mesure taille/poids par photo + « prises vérifiées ».**
- Estimation de la taille (et du poids approx.) via un **objet de référence** sur la photo, cadrée honnêtement comme **assistive** (pas forensique).
- **Réutilise le pipeline photo du Chantier C** (capture → Fishial.AI reco espèce → vérif maille) : même flux, on ajoute la mesure. Une prise devient « vérifiée » (espèce + taille plausibles) avec un badge léger.
- Débloque : **confiance du signal social** (heatmap/qualité plus fiables) + une base saine pour des défis/badges **sans triche évidente** (prérequis de G3).

**G2 — Co-pêchage (sorties entre membres).**
- Matcher des pêcheurs pour sortir ensemble (par secteur, espèce visée, niveau, créneau). Primitive sociale que ComptoirDesPêcheurs a et qu'on n'a pas.
- Synergie forte avec le **fil régional gratuit** : plus de raisons de revenir, contenu local généré, rétention. Bon accélérateur d'amorçage (P4).
- **Garde-fous** : respect strict du floutage GPS (aucune divulgation de spot précis via le co-pêchage), modération + signalement (le panel existe déjà), consentement explicite au partage de présence.

**G3 — Gamification « anti-comparaison ».**
- **Streaks perso** (régularité), **Pokédex perso d'espèces** (collection individuelle), **défis conservation / science citoyenne**, badges de progression — **sans classement public de tailles**.
- Prend Fishing Grid à revers : ils prêchent l'« anti-leaderboard » mais shippent un classement → on occupe *crédiblement* ce terrain. **Moat = cohérence de marque** (eux ne peuvent plus se repositionner sans se renier).
- S'appuie sur **G1** (prises vérifiées) pour des badges crédibles ; couplé à la rétention/conversion (P5).

**Critères d'acceptation.** Une prise peut être marquée « vérifiée » (taille estimée + espèce) ; un membre peut proposer/rejoindre une sortie sans fuite de spot précis ; un user a des streaks + une collection d'espèces **sans aucun classement public de tailles**. Tests sur l'estimation taille + les garde-fous GPS du co-pêchage.

**Décision John requise.** Périmètre du co-pêchage v1 (national vs par département) ; niveau de « vérification » affiché (badge léger vs score de confiance) ; nature des défis conservation (partenariat asso ? lien RecFishing ?).

---

### CHANTIER 0 — « Vérité & Solidité » : le socle (rapide, fait en premier)
**Axe : Dette. Impact 🔥 (débloque le reste) · Effort : faible-moyen.**

- **Tests des 2 zones critiques** : catch CRUD (`lib/catches/actions.ts`) + **tests d'intégration RLS** (attaquer la base en anon/gratuit : floutage GPS, gating tier, k-anon).
- **Ops** : vars Supabase en env **Preview** Vercel (débloque PR + CI E2E) ; supprimer ~17 branches mergées ; committer/jeter `lib/types.ts`.
- **DB** : `migration repair` (025/026/027/044) ; trancher `catches_for_viewer` (invoker vs definer assumé) ; confirmer `get_spots_for_scoring` non exposé client ; indexer `feed_post_photos.user_id`.
- **Hygiène prod** : purge seed de test, confirmer Sentry NEXTJS-4 fermé après le hotfix upload.
- **Doc** : réécrire `CLAUDE.md` §2/§9 + schéma BDD (gravement périmés).

---

## 2. Séquencement proposé (sprints 21+)

> 5 phases. Les pistes **Croissance/SEO (E)** et **Amorçage/growth (D)** tournent **en parallèle** des phases produit (lane partiellement César + éditorial).

| Phase | Sprints | Chantiers | But |
|---|---|---|---|
| **P1 — Socle & Vérité** | 21 | **Chantier 0** + hygiène pré-lancement (part de D) | Base saine, tests des zones sensibles, doc à jour. Rapide. |
| **P2 — Le moat réel** ★ | 22-23 | **A** (scoring perso) puis **B** (pôle espèces + score espèce) | La transformation. C'est là qu'on cesse de ressembler à un solunar de plus. |
| **P3 — Conformité & Confiance** ★ | 24 | **C** + **G1** (prises vérifiées — pipeline photo partagé) | Prendre la fenêtre 2026, combler la table stake IA, marées fiables, prises vérifiées. |
| **P4 — Lancement & Amorçage** ★ | 25 | **D** + **G2** (co-pêchage) | Remplir le réservoir + engager la beta (sorties entre membres) → les couches vivantes s'allument. |
| **P5 — Monétisation & rétention** | 26 | **F** + **G3** (gamification anti-comparaison) | Convertir (valeur perçue) + retenir (streaks, collection d'espèces, défis). |
| **Parallèle** | 21→26 | **E** (SEO/guides/vidéo, lane éditoriale + César) | Croissance organique qui tourne sans attendre. |
| **Ensuite** | 27+ | **Mobile** (Expo iOS/Android, IAP) — plan d'origine, après web complet | PWA déjà en place comme pont. |

**Ordre logique des dépendances :** 0 débloque tout → A est le prérequis de F (il faut un moat à vendre) et nourrit B → C et D peuvent partir en parallèle après A → **G1 réutilise le pipeline photo de C ; G3 (gamification) s'appuie sur G1 (prises vérifiées) ; G2 (co-pêchage) accélère l'amorçage de P4** → E tourne en continu.

---

## 3. Points de décision pour John (à trancher avant P2)

1. **Scoring perso** : fenêtre temporelle (30 j / saison / illimité), seuil minimal de prises, et **gating** (le perso descriptif devient-il l'argument de conversion **Local**, ou reste-t-il Itinérant ?).
2. **Liste des ~20 espèces** (priorité recherche × pêchabilité du bord) + score espèce gratuit ou gaté.
3. **Amorçage data** : seed de démo **oui/non** et forme honnête ; canal beta ; objectif chiffré de prises avant ouverture large.
4. **Marées** : budget pour basculer SHOM/WorldTides si l'audit montre un écart gênant (la précision est le risque de confiance #1).
5. **Ordre P3 vs P4** : prendre la fenêtre réglementaire d'abord (C) ou remplir la data d'abord (D) ? (Recommandé : C et D en parallèle dès P3.)

---

## 4. Paris créatifs (bonus — au-delà des chantiers cœur)

Idées plus audacieuses, à piocher selon l'énergie. Classées par défendabilité.

> ✅ **Promus en Chantier G (décision John, 2026-06-23)** : gamification anti-comparaison, co-pêchage et mesure taille/poids par photo ne sont plus des « paris » — ils sont entrés dans la roadmap (phases P3→P5). Voir le Chantier G ci-dessus.

- 🛡🛡🛡 **« Spots vérifiés terrain »** : fusionner curation (ta force) + fraîcheur communautaire (« confirmé pêchable par 4 membres ce mois-ci »). Boucle que ni les cartes 100 %-communauté (Fishing Grid) ni 100 %-curées (spot-de-peche) n'ont. *(À distinguer des « prises vérifiées » du Chantier G : ici c'est le SPOT qui est confirmé frais, pas la prise.)*
- 🛡🛡 **Couche « réserves / cantonnements / zones protégées »** sourcée sur la carte — inexistante proprement côté mer du bord. Renforce le positionnement « sérieux + conforme » et le SEO local.
- 🛡🛡 **Distribution presse régionale** (le vrai malin de ComptoirDesPêcheurs avec Ouest-France) : syndiquer un « où ça mord ce week-end en [région] » à la PQR. Move growth pour César, défendable par la relation.

---

## 5. Ce qu'on NE fait pas (anti-roadmap)

- ❌ **Marketplace matériel** comme pilier de revenus (Fishbrain l'a tuée en 2023 ; Fishing Grid en dépend = fragile). Affiliation discrète max.
- ❌ **Course aux 266 fiches creuses** de Fishing Grid. On gagne en profondeur sur ~20, pas en quantité.
- ❌ **Sur-promettre le scoring** (« prédit le mordant »). On reste sur « révèle TES patterns » (honnête + défendable, le solunar pur est contesté).
- ❌ **Mobile avant que le web soit complet** (décision John maintenue) — la PWA fait le pont en attendant.
- ❌ DOM-TOM / pêche à pied / bateau / eau douce en v1 (périmètre verrouillé).

---

## Annexe — Sources concurrence & réglementation (juin 2026)

Concurrents : [spot-de-peche](https://spot-de-peche.com/) · [abonnements](https://spot-de-peche.com/abonnements/) · [SimilarWeb](https://www.similarweb.com/website/spot-de-peche.com/) · [FishFriender Premium](https://www.fishfriender.com/premium) · [FishFriender Google Play](https://play.google.com/store/apps/details?id=com.halieuticom.fishfriender) · [avis FR critique boatfishing](https://www.boatfishing.fr/application-fishfriender-mon-avis-sur-cette-application-indice-de-peche-carnet-de-prise/) · [Fishing Grid Google Play](https://play.google.com/store/apps/details?id=com.fishinggrid.fishinggrid&hl=fr) · [Fishing Grid App Store FR](https://apps.apple.com/fr/app/fishing-grid/id6739852593) · [Fishing Grid site](https://fishing-grid.fr/)

Autres : [Fishbrain BiteScore](https://fishbrainhelp.zendesk.com/hc/en-us/articles/26184333240092-What-is-BiteScore) · [Fishbrain marketplace dissoute 2023](https://fishingtackleretailer.com/fishbrain-dissolves-direct-e-commerce-marketplace/) · [ComptoirDesPêcheurs — Indice de Pêchabilité](https://comptoirdespecheurs.com/le-club/indices-et-previsions) · [maree.info (SHOM)](https://maree.info/) · [Fishial.AI (API 865 espèces)](https://www.fishial.ai/) · [Decathlon affiliation (Rakuten)](https://www.decathlon.fr/affiliation_lp-PBUQMW)

Tendances/SEO : [AI Overview stats mars 2026](https://thestacc.com/blog/google-ai-overview-statistics/) · [Ahrefs — AI Overviews & clics](https://ahrefs.com/blog/ai-overviews-reduce-clicks-update/) · [State of Subscription Apps 2026 (RevenueCat)](https://www.revenuecat.com/state-of-subscription-apps/) · [Solunar : science ou fiction](https://windy.app/textbook/what-is-solunar.html)

Réglementation FR 2026 : [UE lance RecFishing (12/01/2026)](https://oceans-and-fisheries.ec.europa.eu/news/eu-launches-recfishing-digital-system-simplify-recreational-fishing-data-collection-2026-01-12_en) · [Obligation au 12/02/2026 (peche.com)](https://www.peche.com/article/51243/recfishing-l-obligation-de-declaration-entre-en-vigueur-le-12-fevrier-2026) · [Conseil d'État rejette le recours (18/06/2026)](https://www.lofficieldesmetiers.fr/recfishing-rejet-du-recours-des-moniteurs-guides-de-peche/) · [Bar 42 cm Manche/Atlantique (FFPSA)](https://www.ffpsa.net/nouvelle-reglementation-de-la-peche-du-bar-dicentrarchus-labrax-en-manche-et-en-atlantique/) · [Lieu jaune 2026 (FFPSA)](https://www.ffpsa.net/connaitre-la-reglementation-2026-de-la-peche-de-loisir-du-lieu-jaune-sur-le-littoral-de-la-manche-et-atlantique/)

---

*Roadmap produite le 2026-06-23 à partir de l'audit transverse. À refléter dans `CLAUDE.md §9` après arbitrage de John.*
