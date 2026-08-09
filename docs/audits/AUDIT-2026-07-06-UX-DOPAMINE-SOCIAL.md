# 🎯 AUDIT UX / UI · DOPAMINE · SOCIAL — 2026-07-06 (pré-mobile, post-S69)

> **Commande de John** : « audit complet du site live en vue mobile ET desktop, pour voir ce qu'on peut améliorer par rapport à la concurrence et ce qu'il faut potentiellement ajouter avant de commencer la phase mobile. Focus : le reste des fonctionnalités, l'UX et l'UI, l'ajout/amélioration des éléments de dopamine (défis / XP…), et l'amélioration de l'aspect réseau social / communauté. »
>
> **Explicitement HORS périmètre** (déjà noté / traité par John, à NE PAS re-signaler) :
> - **Amorçage du réservoir** (base quasi vide) : John l'a déjà acté (lane amorçage / codes fondateurs S68). On ne le re-liste pas comme reco. On s'appuie juste dessus pour lire les états vides.
> - **Perf de la carte** : testée et validée saine sur appareil réel (S71 annulé). On ne l'audite pas. L'UX de la carte (gating, filtres, hiérarchie) reste dans le périmètre, mais pas sa vitesse.
>
> **Méthode** :
> 1. QA live prod, desktop 1920px, **compte modérateur + abonné Itinérant** (John) : `/home`, `/carnet`, `/carte`, `/fil`, `/classements`, `/sorties`, `/profil`, `/u/[username]`, `/especes`, `/tarifs`.
> 2. QA live prod, **compte gratuit fraîchement créé** (« ddddd », 0 prise) + navigation **anonyme** : landing marketing, gating carte free, écran d'inscription, **cold-start `/home`**.
> 3. Cartographie du code (2 sous-agents) : inventaire réel des couches **dopamine** (`components/gamification/*`, `lib/gamification/*`, migrations `098`→`107b`) et **sociale** (`app/actions/feed.ts`, `components/feed/*`, `components/cofishing/*`), avec évaluation du **surfaçage** (où c'est exposé, à quel point c'est visible).
> 4. Benchmark concurrents (sous-agent) : `docs/concurrents/*` + veille web juillet 2026 (Fishing Grid, spot-de-peche, FishFriender).
>
> ⚠️ **Caveat mobile** : le Chrome connecté était maximisé sur écran 1920px et refuse de descendre sous ~500px → **pas de capture téléphone réelle**. La critique du **layout mobile** s'appuie sur (a) le code responsif (`components/layout/TabBar.tsx`, `MoreMenu.tsx`, `AppSidebar.tsx`), (b) la DA `mobile.html`, (c) la validation appareil réel de John (audit 02/07). Les débordements pixel-près à 390px ne sont pas exclus — recommandation transverse : **smoke test Playwright device `iPhone 14`**.

---

## 0. Résumé exécutif

### 0.1 Le verdict en 6 lignes

Le produit web est **mûr, honnête et visuellement fort**. Le socle (carnet, carte, fil, co-pêchage, fiches espèces, tarifs) est de qualité, la DA v2 « instrument de précision » tient, et surtout : **toute la couche dopamine promise le 30/06 a été construite et est en prod** (XP, rangs, séries, badges à paliers, défis, Pokédex, classements opt-in k-anon, saisons). Ce n'est pas un problème de features manquantes. C'est un problème de **mise en scène**.

> **Le fil rouge de tout l'audit : tout est construit, presque rien n'est mis en scène.** La dopamine existe mais elle est **invisible hors d'une seule page**, **empilée en bas** de cette page, **sans destination dédiée**, et **déflatée à froid** (le nouveau pêcheur tombe sur un mur de « 0/100 XP » et 26 cases « à débloquer » avant d'avoir la moindre récompense). Côté social, le fil et le co-pêchage sont solides mais **enterrés sur mobile** et le seul vrai manque de mécanique face à Fishing Grid, c'est le **chat / les groupes temps réel** et une **boucle d'engagement quotidienne**.

Autrement dit : avant de partir sur le mobile natif, le chantier le plus rentable n'est pas d'ajouter des systèmes, c'est de **rendre visibles, désirables et séquencés** ceux qui existent déjà, puis de combler 3-4 mécaniques ciblées (boucle quotidienne, face-à-face entre pêcheurs, chat de groupe spot-safe).

### 0.2 Top priorités (le détail est en §4, §5, §7)

| # | Priorité | Problème | Reco (résumé) | Impact | Effort |
|---|----------|----------|---------------|--------|--------|
| **P1** | 🔴 Mise en scène dopamine | XP/rang/série **invisibles** hors `/home` ; le header d'app ne porte aucun signal de progression | **Header de progression** persistant (chip rang + mini-barre XP + flamme de série), cliquable → destination | Très élevé | Faible |
| **P2** | 🔴 Cold-start déflateur | Le nouveau pêcheur voit un **mur de vide** (0 XP, 0/15 badges, 26 Pokédex « à débloquer ») avant toute récompense | **Séquencer le déblocage** : 1 seule action mise en avant, « prochaine récompense à 1 prise », masquer/replier le vide | Très élevé | Moyen |
| **P3** | 🟠 Pas de destinations | Défis/badges/classements/saisons n'ont **pas de page** (sauf `/classements`), tout vit dans un widget en bas de `/home` | Créer **`/defis`** et **`/progression`** (ou onglets), promouvoir dans la nav | Élevé | Moyen |
| **P4** | 🟠 Nav mobile enterre le compétitif | Sur mobile, **Classements** et **Co-pêchage** sont dans le sous-menu « Plus » | Refondre la **tab bar** : surfacer Classements ; FAB Loguer central | Élevé | Faible |
| **P5** | 🟠 Boucle quotidienne absente | Rien ne ramène le pêcheur chaque jour hors d'une vraie sortie | **Défi / quiz du jour** léger (se branche sur XP/notifs existants) | Élevé | Moyen |
| **P6** | 🟠 Face-à-face absent | Les classements existent mais pas de **confrontation 1v1** (le hook social-dopamine) | **Duel / rival** spot-safe (compare tes stats à un pote) | Élevé | Moyen |
| **P7** | 🟡 Gap social vs Fishing Grid | Pas de **chat / groupes** temps réel ; densité sociale faible | **Groupes départementaux + chat spot-safe** (S73 amorce) | Moyen | Élevé |
| **P8** | 🟡 Découvrabilité sociale | Profils `noindex` ; recherche par pseudo OK, mais **aucun annuaire navigable ni suggestions** | Annuaire opt-in, suggestions « pêcheurs de ta côte », suivre dès l'onboarding | Moyen | Moyen |
| **P9** | 🟡 Dopamine absente de l'acquisition | La landing vend le moat + le gratuit, **jamais** la compétition/gamification | Ajouter une section « progresse / grimpe » à la landing (post-pivot) | Moyen | Faible |
| **P10** | ⚪ Polish | Records éclatés (`/carnet` vs `/profil`), date `mm/dd/yyyy` (US) sur filtre sorties, etc. | Correctifs ciblés (§3.5) | Faible | Faible |

---

## 1. Méthode & périmètre (rappel)

Ce que j'ai réellement fait (voir en-tête pour le détail) : parcours live des 10 écrans clés en **abonné+modérateur**, parcours **visiteur anonyme** + **compte gratuit neuf** (cold-start), et double cartographie du code (dopamine + social) avec un focus « surfaçage ». Le benchmark concurrents s'appuie sur `docs/concurrents/` (à jour juin 2026) + une passe web juillet 2026.

Ce que je **n'ai pas** fait, volontairement : re-mesurer la perf carte, re-diagnostiquer le réservoir vide, tester le tunnel de paiement Stripe (déjà QA-validé), auditer la sécurité GPS/RLS en profondeur (couverte par l'audit 02/07, invariants intacts constatés sur les écrans vus : classements « que des pseudos et des stats », co-pêchage « aucune coordonnée partagée »).

---

## 2. Ce qui est fort (à ne pas casser)

Important de le nommer, parce que plusieurs de ces forces sont **le socle sur lequel brancher la dopamine** :

1. **La DA v2 tient et respire la donnée.** Bandeau d'instruments (dépt · vent · houle · TON créneau), chiffres en JetBrains Mono partout, cartes à liseré, anneaux de score. Le produit *ressemble* à un instrument. C'est un actif différenciant vs la chaleur artisanale de Fishing Grid.
2. **Le carnet est excellent.** `/carnet` = « 9 prises, et la carte commence à te connaître », stats espèces/techniques/mois, record par espèce, taux de relâche, **boîte à matériel** (« ce que chaque leurre rapporte »), **année de pêche** partageable, log de la bredouille. C'est le meilleur écran du produit et le cœur du moat.
3. **Le moment de célébration est le seul élément dopamine parfaitement placé.** Il se déclenche **à l'instant de valeur** (juste après le log d'une prise, `CatchForm.tsx`), avec feedback XP, et est réutilisé sur le redeem d'un code fondateur. **C'est le patron que tout le reste devrait suivre** : surfacer le signal là où le pêcheur est déjà, pas sur une page qu'il doit aller chercher.
4. **Les classements sont irréprochables sur le fond.** 4 métriques (XP / prises / plus grosse / espèces) × 4 portées (national / dépt / mes pêcheurs / saison), opt-in réversible, **k-anon K=3**, spot-safe. L'état vide est déjà honnête et bien fait (« Classement publié à partir de 3 pêcheurs. Il en manque 2. »). Sur le spot-safe + anti-farm, on a même une **avance qualitative** sur Fishing Grid.
5. **L'honnêteté de la copy est un actif de marque.** « Score générique, identique pour tous ; tes tendances perso vivent dans ton carnet. » ; « Pas un catalogue de 266 poissons » ; tarifs « la précision se paie ». Cette voix est crédible et distinctive.
6. **Le co-pêchage est étonnamment profond** : proposer une sortie, filtres (espèce, date, niveau d'hôte, départements voisins), chat de sortie, réputation, revues post-sortie. Beaucoup de valeur construite.
7. **Le cold-start `/home` a de bons réflexes** : bandeau « PREMIÈRE ÉTAPE — Dès 3 prises, ton carnet te dit OÙ et QUAND », CTA « Importer mes prises » / « Loguer une prise ». La logique d'amorçage individuel est là (voir §3.4 pour le revers).

---

## 3. Diagnostic transverse UX / UI

### 3.1 Architecture d'information : la couche compétitive est bien rangée sur desktop, enterrée sur mobile

Sur **desktop**, la sidebar (`components/layout/AppSidebar.tsx`) est bonne : Accueil · Mon carnet · Carte · Fil · Mes pêcheurs · Co-pêchage · **Classements** · Profil, puis Découvrir (Espèces, Guides) et Contribuer. La couche compétitive et sociale est top-level. ✔️

Sur **mobile**, c'est le problème structurel : la **tab bar** (`components/layout/TabBar.tsx`) n'a que 4 entrées — **Carnet · Carte · [+] · Fil** — et **Classements, Co-pêchage, Mes pêcheurs (follows), Accueil et Notifications sont repoussés dans une bottom-sheet « Plus »** (`components/layout/MoreMenu.tsx`). Conséquence : **le produit qu'on vient de repositionner « dopamine / compétition » (pivot du 28/06) cache son classement et son co-pêchage derrière un tap supplémentaire, sur la plateforme (mobile) qui est justement le but de toute la phase à venir.** C'est le mismatch le plus coûteux du produit.

### 3.2 Le header d'app ne porte AUCUN signal de progression

Le bandeau d'instruments persistant affiche `ALPES-MARITIMES · 06 | VENT SE 8 | HOULE 0,2 m · 3 s | TON CRÉNEAU : 17:30 → 19:30`. Excellent pour la mer. Mais un `grep` du header (`AppHeader.tsx` / `AppInstruments.tsx`) ne trouve **aucun** rang, XP, ou flamme de série. **Les deux choses qui devraient être « glanceable » en permanence dans un produit dopamine — ton niveau et ta série — n'existent nulle part dans le chrome persistant.** Il faut ouvrir `/home` et scroller jusqu'à la dernière section pour les voir. C'est la **P1**.

### 3.3 Le cockpit `/home` : 6 mécaniques empilées en bas d'une seule page, zéro destination

`/home` compose, dans l'ordre : hero → conditions du jour → « de quoi est fait ce créneau » → « ce que ton carnet en dit » → « cette semaine » → « près de toi » (fil) → **puis, tout en bas**, « TA PROGRESSION » qui empile d'un coup : rang + barre XP, série, **défis**, **badges** (8 familles), **Pokédex** (26 cases), **défis conservation**. Six mécaniques distinctes, **un seul emplacement, aucune page dédiée**.

En particulier : **les défis n'ont aucune page** (`/defis` n'existe pas), ils ne vivent que dans ce widget. Un pêcheur peut ne jamais les remarquer. Idem badges, Pokédex, saisons : aucune destination propre (sauf `/classements`). Voir **P3**.

### 3.4 Cold-start : le « mur du vide » (le revers du réservoir vide, mais côté UX ce n'est PAS que le réservoir)

Compte neuf « ddddd », 0 prise. Le haut de `/home` est bon (bandeau « PREMIÈRE ÉTAPE », CTA loguer/importer). **Mais dès qu'on scrolle, on tombe sur un mur** : « TA PROGRESSION » = Mousse Lv.1, **0/100 XP** ; série « démarre à ta première semaine » ; **4 défis tous à 0** ; **BADGES 0/15**, tout « À DÉBLOQUER » ; **POKÉDEX 0/26**, vingt-six lignes « pas encore capturé » ; puis 3 défis conservation vides. 

C'est **honnête et bien écrit**, mais **quantitativement déflateur** : le premier contact avec la couche « jeu » du produit, c'est ~50 items vides à faire défiler avant d'avoir gagné quoi que ce soit. Le paradoxe classique de la gamification à froid : on montre tout ce que tu **n'as pas**. Ce n'est pas (seulement) un effet du réservoir — même avec 10 000 utilisateurs, un compte neuf verrait ce mur. Il faut **séquencer** : mettre en avant **une** prochaine récompense atteignable, **replier** le reste. Voir **P2** + maquette.

### 3.5 Incohérences & polish (relevé live)

- **Records éclatés.** Les records par espèce s'affichent sur `/carnet` et `/u/[username]`, mais **`/profil` n'affiche aucun record** — seulement un bouton « Mes records » (partage). Modèle mental incohérent pour « mes accomplissements ».
- **Date en format US.** Le filtre « À partir du » de `/sorties` rend un input `mm/dd/yyyy` (format américain) au lieu de `jj/mm/aaaa`. Détail, mais visible et anti-« instrument français précis ».
- **`/carte` change de header.** La carte utilise un header marketing (Carte · Spots · Espèces · Guides · Tarifs) au lieu du chrome d'app (sidebar + instruments) des autres pages connectées. Discontinuité de navigation quand on vient de `/home`.
- **« Partager mes conditions » sur le bloc progression** de `/home` : le CTA du bloc « TA PROGRESSION » partage les conditions, pas la progression — libellé un peu à côté de la plaque.
- **Densité verticale de `/home`.** Même plein (compte abonné), l'empilement est très long. Une fois les destinations créées (P3), `/home` devrait **résumer** la progression (une bande compacte) et **déléguer** le détail aux pages dédiées.

### 3.6 Mobile (code + appareil réel)

Basé sur le code responsif et la validation de John : la structure (tab bar + FAB + bottom sheets, DA `mobile.html`) est saine et le rendu a été jugé bon sur appareil réel. Les deux vrais sujets mobiles sont : **(a)** la hiérarchie de nav (§3.1, P4) et **(b)** l'absence de signal de progression dans le bandeau condensé (§3.2, P1). Reco process : ajouter un **smoke test Playwright `iPhone 14`** pour fermer le trou de méthode (overflow 390px) une bonne fois.

---

## 4. Couche DOPAMINE — diagnostic + recommandations

> 🎨 **Maquettes associées** : `docs/audits/maquettes-2026-07-06.html` (ouvrir dans un navigateur — même DA v2 que `docs/maquette-v2/`). Sections : header de progression, cockpit restructuré, page `/defis`, carte de duel, tab bar mobile.

### 4.1 État réel (ce qui est en prod, ne PAS reconstruire)

Rappel factuel pour ne pas proposer ce qui existe : `xp_events` + rangs (mig. 098), records + célébrations (066), séries + badges à paliers publics (099), défis solo + événement saisonnier (100), notifications d'engagement (101), classements opt-in national/dépt/espèce/saison k-anon (102), saisons trimestrielles + rareté de rang (103), codes fondateurs (104), intégrité XP anti-farm (105/105b). **Tout est branché et en prod.** Le travail ci-dessous est **présentation + 2-3 mécaniques**, pas de la refonte de fond.

### 4.2 🔴 Problème n°1 — la dopamine est invisible hors `/home` → **header de progression** (P1)

C'est le correctif au meilleur ratio impact/effort de tout l'audit. Aujourd'hui ton niveau et ta série ne se voient nulle part en permanence.

**Reco** : ajouter au chrome persistant un **cluster de progression** :

- **Chip rang** cliquable : `⚓ Mousse · Lv.1` (couleur selon rareté de rang, déjà en DB mig. 103).
- **Mini-barre XP** : `80 / 100 XP` en mono, la barre se remplit ; micro-animation quand l'XP monte.
- **Flamme de série** : `🔥 2 sem.` (grisée si série à risque cette semaine, pour créer l'urgence douce).
- Sur **desktop** : dans le header, à droite, avant l'avatar. Sur **mobile** : intégré au **bandeau d'instruments condensé** (une pastille compacte `⚓3 · 🔥2` tapable qui ouvre `/progression`).
- **Cliquable → `/progression`** (nouvelle page, §4.3). Le célèbre pattern « la barre d'XP toujours visible » : chaque page devient un rappel discret que tu progresses.

Garde-fou honnêteté : la série ne culpabilise pas (le « joker mensuel » existe déjà) ; la barre XP ne clignote pas en rouge. On reste « instrument », pas « machine à sous ».

### 4.3 🟠 Problème n°2 — aucune destination → créer `/progression` et `/defis`, alléger `/home` (P3)

Six mécaniques ne peuvent pas vivre empilées en bas d'une page. Reco :

- **`/progression`** (ou `/moi`) : la page « trophée » du pêcheur — rang + XP + prochain palier, séries, **badges** (la grille 0/15 y a enfin sa maison), **Pokédex** 26 cases, historique XP (aujourd'hui l'intégrité anti-farm est réelle mais **invisible** : un mini-journal « +15 XP · prise mesurée » donnerait du sens au système). C'est aussi la version privée du `/u/[username]` public.
- **`/defis`** : les défis ont des mécaniques d'événement saisonnier réelles mais **zéro destination**. Une page dédiée (défis du moment, événement de saison, défis conservation, + la future boucle quotidienne §4.5) leur donne de la présence et un endroit où notifier « nouveau défi ».
- **Alléger `/home`** en conséquence : le cockpit garde une **bande de progression compacte** (rang + XP + série + « 2 défis en cours ›») qui **renvoie** vers les pages, au lieu de tout dérouler. `/home` redevient « aujourd'hui sur ta côte », les pages dédiées portent le jeu.

Alternative si on veut éviter 2 nouvelles routes : un `/progression` unique avec **onglets** (Progression · Défis · Badges · Pokédex). Mais des URLs distinctes = notifications profondes + partage + SEO interne.

### 4.4 🔴 Problème n°3 — cold-start déflateur → séquencer le déblocage (P2)

Le nouveau pêcheur ne doit pas voir 50 cases vides. Reco concrètes, par ordre :

1. **Une seule prochaine récompense mise en avant.** Remplacer le mur par une carte unique : « **Ta première prise débloque : le badge Première prise, +10 XP, et ta 1re case Pokédex.** » avec le CTA Loguer. Une cible, atteignable en 1 action.
2. **Replier le vide.** Badges non commencés et Pokédex : afficher **3-4 items** + « voir les 26 › » (vers `/progression`). On ne déroule pas 26 « à débloquer » sur `/home`.
3. **Escalier de valeur visible** : « À 1 prise : … · à 3 prises : ton scoring perso s'active · à 5 espèces : badge Explorateur ». On montre la **pente**, pas le trou.
4. **Récompense immédiate au log #1** : la célébration existe déjà — s'assurer qu'au tout premier log elle est **maximale** (rang gagné, 1re case Pokédex qui s'illumine, barre XP qui bouge). Le premier hit doit être gros.

Le principe : à froid, on montre **la prochaine marche**, pas l'escalier entier vide.

### 4.5 🟠 Mécanique manquante — la **boucle quotidienne légère** (P5)

Aujourd'hui, rien ne ramène le pêcheur **chaque jour** sauf une vraie sortie. Fishing Grid a un **quiz du jour** (cf `docs/concurrents/fishing-grid.md` §2) précisément pour ça. Reco : un **rendez-vous quotidien** qui se branche sur le moteur XP/notifs **déjà en place** (mig. 100/101), utile justement quand le réservoir est maigre car il **ne dépend pas d'une prise** :

- **Le créneau du jour** (on l'a déjà !) transformé en mini-engagement : « Ton meilleur créneau aujourd'hui : 17:30–19:30. Tu sors ? [Je vise] / [Pas aujourd'hui] » → +5 XP pour la prévision, bonus si tu logues une prise dans le créneau.
- **ou** un **quiz/anecdote pêche du jour** (1 question, +5 XP, badge « curieux ») — se marie avec le contenu espèces existant (26 fiches).
- Objectif : un **streak quotidien léger** distinct de la série hebdo de pêche (qui, elle, exige une sortie). Un pêcheur ne pêche pas tous les jours ; l'app peut quand même avoir un rendez-vous quotidien.

### 4.6 🔴 Mécanique manquante — le **face-à-face** (duel / rival), spot-safe (P6)

Les classements donnent un rang **global**. Ce qui accroche vraiment en dopamine sociale, c'est la **confrontation 1v1** avec quelqu'un que tu connais. C'est absent. Reco :

- **Duel amical** : depuis le profil d'un pêcheur que tu suis, « **Défier** » → compare sur une période (saison en cours) : XP, nb de prises, plus grosse, nb d'espèces. Résultat = une **carte de duel** partageable (réutilise l'infra de share cards existante).
- **Rival de la semaine** : le système te désigne un pêcheur de niveau proche dans ton dépt (opt-in) → « Tu es à 2 prises de doubler @X cette semaine ». Notification d'engagement (type `rank_overtake` existe déjà, mig. 101) rendue **personnelle**.
- **100 % spot-safe** : la confrontation porte sur des **compteurs** (XP, nb, taille), **jamais** un lieu. Aligné au garde-fou du pivot (§8 CLAUDE.md : « la compétition se fait sur des métriques sans fuite de spot »).

C'est le pont naturel entre la couche sociale (follows) et la couche dopamine (classements) — deux systèmes construits qui ne se parlent pas encore.

### 4.7 🟡 La dopamine est absente de l'acquisition (P9)

La landing (`/`) vend **3 choses** : le moat (scoring perso), la carte, le gratuit/communauté. Elle ne dit **rien** de la couche compétitive/gamifiée — alors qu'on a pivoté « dopamine » le 28/06 et tout construit. Un nouveau visiteur ne sait pas qu'il y a des rangs, des défis, des classements. Reco : une **section « 05 — Progresse »** (dans la structure éditoriale numérotée existante) qui montre rang + série + un classement anonymisé (« grimpe le classement de ton dépt, sans jamais dévoiler un spot »). Le hook « addict » que la nouvelle génération cherche doit être **visible avant l'inscription**, pas seulement après.

### 4.8 Récompenses concrètes — que débloque l'XP, au fond ?

Question de fond à trancher (⚠️ décision John) : aujourd'hui l'XP donne des **rangs cosmétiques**. Pour tenir la dopamine dans la durée, un niveau/rang devrait débloquer **quelque chose de tangible et gratuit** (sinon la courbe s'essouffle) :

- Cosmétique : cadres d'avatar, couleur de pseudo, titres (« Spécialiste du bar »), thème de carte — **zéro impact sur le payant**, pur statut.
- **Sans jamais** vendre un avantage de données payant contre de l'XP (ça casserait le pricing « la précision se paie »). La règle : l'XP achète du **statut**, l'abonnement achète de la **précision**. Les deux monnaies ne se croisent pas.

### 4.9 Récap garde-fous dopamine (à réafficher dans le brief)

Ne jamais exposer `geom` / `geom_public` / ville / coordonnée dans une mécanique compétitive ; le département reste un **filtre d'entrée**, jamais une **donnée de sortie** (pattern mig. 102). Pas de culpabilisation sur les séries. Pas de chiffre inventé (les compteurs viennent du ledger). RGPD : tout opt-in réversible (déjà le cas pour `public_ranking`).

---

## 5. Couche SOCIALE / COMMUNAUTÉ — diagnostic + recommandations

### 5.1 État réel

En prod et de bonne qualité : **fil** par département + onglets (Ton département / Tes follows / Toute la côte), composer avec **tag prise**, photos (galeries, lightbox), likes + commentaires + follows en Realtime, **notifications in-app** (cloche dans le header — le seul *signal* social toujours visible ; une recherche de pêcheurs par pseudo est aussi dans le header), **co-pêchage** complet (proposer/filtrer/chat/réputation/revues), **profils publics** `/u/[username]` (rang, XP, badges, prises, posts, réputation), modération. La cloche de notif est bien le seul morceau de chrome social persistant — et c'est une bonne chose à généraliser (cf §4.2 pour la progression).

### 5.2 🟡 Le vrai gap vs Fishing Grid — **chat / groupes temps réel** (P7)

C'est **le** point où un concurrent nous dépasse en social (`docs/concurrents/fishing-grid.md` §3 : 209 groupes locaux + chat temps réel). Notre fil départemental est asynchrone (poste/commente) ; il **n'a pas de messagerie de groupe vivante**. Reco, **en spot-safe** :

- **Groupes** par département (et par technique ?) avec **chat temps réel** (on a déjà Supabase Realtime + un `OutingChat` qui fait 20KB — la brique technique existe, à généraliser).
- **Règle d'or** : jamais de partage de coordonnée précise dans un chat public (le RDV exact des sorties se cale déjà « en privé, hors appli » — garder cette discipline).
- S73 « Sorties groupées » amorce la densité sociale ; un vrai **canal de discussion départemental** est le cran au-dessus. À arbitrer : est-ce pré-mobile (web) ou une feature phare du lancement mobile ? (le chat est très « mobile » par nature).

### 5.3 🟡 Découvrabilité sociale : la recherche existe, la découverte non (P8)

Correctif d'exactitude (vérifié dans le code) : une **recherche de pêcheurs par pseudo existe déjà** (icône recherche du header → `SearchModal` → `searchUsers`, sur tous les profils onboardés). Donc si tu connais le pseudo, tu trouves le profil. **Ce qui manque, c'est la découverte non-dirigée.** Les profils publics sont `noindex`, il n'y a **aucun annuaire navigable**, aucune suggestion, et on ne tombe sur un profil qu'en cliquant l'auteur d'un post, une liste de follows, ou en tapant un pseudo qu'on connaît déjà. Résultat : **la preuve sociale qui devrait alimenter la boucle dopamine ne se découvre presque jamais** (il faut déjà savoir qui chercher). Reco (ne PAS reconstruire la recherche, elle existe) :

- **Annuaire navigable opt-in** des pêcheurs `public_ranking = true` : « les pêcheurs de ton dépt », triables par activité récente — un endroit à **parcourir**, pas juste une barre de recherche. C'est le complément naturel des classements.
- **Suggestions** : après l'onboarding, proposer de **suivre 2-3 pêcheurs actifs de sa côte** (amorce le graphe social dès la 1re minute — attaque le cold-start social).
- **Découverte depuis la prise** : sur une prise du fil, « voir les autres prises de bar dans le 29 » → mène vers des profils/prises, pas un cul-de-sac.

### 5.4 🟡 Densité : faire remonter la vie dans le fil

- **Sorties dans le fil** (S73 déjà prévu) : une sortie groupée devient un post (N prises, participants taggés) — bon multiplicateur de contenu par événement.
- **Auto-post opt-in** : proposer (jamais imposer) de partager une prise loguée dans le fil de son dépt au moment du log. Aujourd'hui log (carnet) et post (fil) sont deux gestes séparés ; les relier **doublerait** le contenu du fil sans effort utilisateur.
- **Réactions plus riches** que le seul like (« beau poisson », « quel spot… enfin, quel dépt 😏 ») — micro-engagement.

### 5.5 Le social comme antidote au cold-start

Le point clé transverse : **le meilleur remède au réservoir vide côté ressenti, c'est de faire suivre quelqu'un dès l'onboarding.** Un fil vide déprime ; un fil avec 3 pêcheurs actifs de ta côte donne l'impression d'un lieu vivant. Ça ne coûte pas de « fabriquer » des données (garde-fou honnêteté) : ça met juste en relation les vrais comptes existants plus tôt. (Se combine avec la lane amorçage de John, sans la remplacer.)

---

## 6. Benchmark concurrents (dopamine + social + UX)

> Source : `docs/concurrents/*` (juin 2026) + veille web juillet 2026. **Note importante** : les docs concurrents datent d'AVANT le pivot du 28/06 et décrivent encore Carnet de Pêche comme « anti-comparaison, zéro leaderboard ». **C'est périmé** — la matrice ci-dessous reflète l'état réel post-S69.

| Axe | **Carnet de Pêche** (prod S69) | **Fishing Grid** | **FishFriender** | **spot-de-peche.com** |
|---|---|---|---|---|
| **Dopamine / jeu** | XP, rangs, saisons, rareté de rang, badges à paliers, défis, records comparables, **anti-farm (ledger)** | Défis saisonniers, classements, **quiz du jour**, **Pokédex + IA espèces**, stories | Faible | Solunar générique, pas de compte |
| **Social** | Fil par dépt, follows, likes/commentaires, Realtime, **co-pêchage** profond. 100% gratuit | **209 groupes + chat temps réel** (le plus riche), stories | Partage entre amis (généraliste) | **Aucun** |
| **Carte** | Curée (215) + communauté + OSM, heatmap k-anon, bathy, qualité/espèce | Communautaire + **nouveau « Spot Assistance »** (vue globale) | **100% paywall** | **Excellente** (heatmap, explorer cascade) |
| **Données mer** | Marée/vagues/houle/vent/soleil/coef, fiches spot riches | **Pauvres + marées imprécises** (~30 min) | Météo + lune sur la prise | **Les plus exhaustives** |
| **Scoring** | Solunar **+ perso qui apprend de tes prises** (moat) | **Générique** | Rétrospectif | Générique |
| **UX / UI** | DA « instrument », mono, WebGL, mobile-first web | v2 gamifiée/vivante, DA marketing **incohérente** | Mûr mais généraliste | UX maps très soignée |
| **Plateforme** | **Web + PWA** (natif = à venir) | **iOS + Android natifs** ✅ | iOS + Android ✅ | Web seul |
| **Monétisation** | Freemium 4,90/9,90 € (récurrent) | **100% gratuit** (marketplace, pas de récurrent) | Freemium | Freemium |

### 6.1 Où ils nous dépassent, spécifiquement (dopamine + social)

1. **IA reconnaissance d'espèces + Pokédex** — *Fishing Grid*. Leur hook viral n°1. À retourner à notre avantage : chez nous, l'auto-remplissage du carnet **sert le moat** (moins de friction = plus de prises = meilleur scoring perso). À requalifier de « gadget phase 2 » en **réducteur de friction du carnet** (phase mobile, on-device).
2. **Quiz / boucle quotidienne** — *Fishing Grid*. Cf **P5 / §4.5**.
3. **Stories éphémères** — *Fishing Grid*. Format natif mobile, à réserver au mobile.
4. **Chat / groupes temps réel** — *Fishing Grid*. Cf **P7 / §5.2**. Notre seul vrai déficit social.
5. **Apps natives** — *Fishing Grid + FishFriender*. Le gap structurel qui bride toute la dopamine mobile. C'est déjà la prochaine phase (gate S74+).

**Nuance à garder en tête** : sur XP / classements / saisons / anti-farm / spot-safe, on est **à parité ou en avance**. Les gaps réels sont **peu nombreux et ciblés** (boucle quotidienne, duel, chat de groupe, IA espèces), plus le mobile. Le reste (marées précises, scoring perso, spots curés, profondeur mer) est **à notre avantage**.

### 6.2 À surveiller

**« Spot Assistance » de Fishing Grid** (nouveauté juillet 2026, passe web) : ils comblent leur faiblesse « carte vide hors zones actives » avec une vue globale France. À re-vérifier : spots **curés** (menace directe sur notre différenciateur) ou simple densité communautaire ? `docs/concurrents/fishing-grid.md` §6-D prévoyait déjà « s'ils sortent des spots curés mer → réévaluer immédiatement ».

---

## 7. Fonctionnalités à ajouter avant le mobile — backlog priorisé

Filtre : ce qui **densifie l'expérience web dopamine + social AVANT** de la porter en natif, pour que l'app mobile arrive sur un produit déjà « addictif » et vivant (et pas juste un portage). Aligné avec le gate mobile S74+ (§9 CLAUDE.md) et les sprints déjà planifiés (S70 en cours, S72 alertes, S73 sorties groupées).

| Prio | Feature | Catégorie | Impact | Effort | Dépend de |
|---|---|---|---|---|---|
| **P1** | Header de progression (rang + XP + série) desktop & mobile | Dopamine / surfaçage | 🟢🟢🟢 | 🔵 faible | — |
| **P2** | Cold-start séquencé (1 prochaine récompense, replier le vide) | Dopamine / onboarding | 🟢🟢🟢 | 🔵🔵 moyen | — |
| **P3** | Pages `/progression` + `/defis` ; alléger `/home` | Dopamine / IA | 🟢🟢 | 🔵🔵 moyen | — |
| **P4** | Refonte tab bar mobile (surfacer Classements) | UX mobile | 🟢🟢 | 🔵 faible | — |
| **P5** | Boucle quotidienne (créneau-défi / quiz du jour, +XP) | Dopamine / rétention | 🟢🟢 | 🔵🔵 moyen | moteur XP/notifs (fait) |
| **P6** | Duel / rival spot-safe (compare 1v1) | Dopamine × social | 🟢🟢 | 🔵🔵 moyen | classements + follows (faits) |
| **P7** | Suggestions de follow à l'onboarding + annuaire navigable opt-in *(la recherche par pseudo existe déjà)* | Social / cold-start | 🟢🟢 | 🔵🔵 moyen | profils publics (faits) |
| **P8** | Auto-post opt-in prise → fil au moment du log | Social / densité | 🟢 | 🔵 faible | feed (fait) |
| **P9** | Section « Progresse » sur la landing (acquisition dopamine) | Acquisition | 🟢 | 🔵 faible | — |
| **P10** | Groupes départementaux + chat temps réel (spot-safe) | Social | 🟢 | 🔵🔵🔵 élevé | Realtime (fait) |
| **P11** | Historique XP + micro-journal (rendre l'anti-farm lisible) | Dopamine / confiance | 🟡 | 🔵 faible | ledger (fait) |
| **P12** | Récompenses de statut (cadres/titres cosmétiques par rang) | Dopamine / durée | 🟡 | 🔵🔵 moyen | rangs (faits) |
| **P13** | Polish : records sur `/profil`, date FR sorties, header carte | Polish | 🟡 | 🔵 faible | — |
| **⏭️** | IA espèces + Pokédex auto / stories | Dopamine mobile | 🟢🟢 | 🔵🔵🔵 | **phase mobile** (on-device) |

### 7.1 Décisions à trancher par John (⚠️)

- **`/progression` + `/defis` = 2 routes, ou 1 page à onglets ?** (§4.3)
- **La boucle quotidienne** : créneau-défi (colle au moat) **ou** quiz (colle à l'éditorial) **ou** les deux ? (§4.5)
- **Chat de groupe** : pré-mobile (web) ou feature phare du lancement mobile ? (§5.2)
- **Récompenses d'XP** : on confirme « XP = statut cosmétique uniquement, jamais de précision payante débloquée par XP » ? (§4.8)
- **Duel** : opt-in mutuel (comme un défi accepté) ou ouvert à quiconque te suit ? (§4.6)

---

## 8. Découpage en sprints proposé (pré-mobile)

Séquencé pour livrer d'abord le **ratio impact/effort maximal** (mise en scène de l'existant), puis les mécaniques neuves, puis la densité sociale lourde. S'insère après S70 (en cours) et à côté / avant S72-S73 déjà planifiés.

**Sprint « Mise en scène dopamine » (P1 + P3 + P4)** — *le sprint le plus rentable*
Header de progression persistant (desktop + bandeau mobile), pages `/progression` et `/defis`, allègement de `/home` en bande compacte, refonte de la tab bar mobile (surfacer Classements). Zéro nouvelle mécanique, 100 % de valeur déjà construite enfin rendue visible. Critères : rang/XP/série visibles sur toutes les pages app ; défis et badges ont une URL ; Classements atteignable en 1 tap sur mobile.

**Sprint « Cold-start + acquisition » (P2 + P7 + P8 + P9)**
Séquencer le cockpit à froid (1 prochaine récompense, escalier de valeur, replier le vide), suggestions de follow à l'onboarding, auto-post opt-in au log, section « Progresse » sur la landing. Critères : un compte neuf ne voit plus jamais >4 items vides d'affilée ; il suit ≥2 pêcheurs à la fin de l'onboarding ; la landing mentionne la progression.

**Sprint « Boucle & face-à-face » (P5 + P6 + P11 + P12)**
Boucle quotidienne (créneau-défi ou quiz), duel/rival spot-safe, historique XP lisible, récompenses de statut cosmétiques. Critères : un rendez-vous quotidien qui donne de l'XP sans exiger une sortie ; pouvoir défier un pêcheur suivi ; l'XP débloque au moins un statut cosmétique.

**Sprint « Densité sociale » (P10 + annuaire + réactions)** — *plus lourd, peut chevaucher S73*
Groupes départementaux + chat temps réel spot-safe, annuaire opt-in, réactions enrichies. À arbitrer vs le planning S73 « sorties groupées » (complémentaires : S73 = contenu événementiel dans le fil, ce sprint = canal de discussion vivant).

**Transverse (à glisser dans le premier sprint)** : polish §3.5 (records sur `/profil`, date FR, header carte) + smoke test Playwright `iPhone 14`.

---

## 9. Annexe

### 9.1 Livrables de cet audit

- Ce document : `docs/audits/AUDIT-2026-07-06-UX-DOPAMINE-SOCIAL.md`
- Maquettes : `docs/audits/maquettes-2026-07-06.html` (DA v2, ouvrable au navigateur)

### 9.2 Écrans parcourus en live (2026-07-06)

Abonné+modérateur (desktop 1920) : `/home`, `/carnet`, `/carte`, `/fil` (`/fil/06`), `/classements`, `/sorties`, `/profil`, `/u/SHW`, `/especes`, `/tarifs`. Visiteur anonyme : `/` (landing), `/carte` (gating), `/auth/login?tab=register`. Compte gratuit neuf « ddddd » : cold-start `/home`.

### 9.3 Références code clés (pour briefer les sprints)

- Nav / chrome : `components/layout/{AppHeader,AppInstruments,AppSidebar,TabBar,MoreMenu,NotificationBell}.tsx`
- Cockpit : `app/(app)/home/page.tsx` + `components/gamification/DopamineCockpit.tsx`
- Dopamine : `components/gamification/*` + `lib/gamification/*` (`levels`, `streaks`, `badges`, `challenges`, `leaderboard`, `season`) ; migrations `098`→`105b`
- Social : `app/actions/feed.ts` + `components/feed/*` ; co-pêchage `app/(app)/sorties/page.tsx` + `components/cofishing/*` (`OutingChat.tsx`) ; profils `app/(app)/u/[username]/page.tsx`
- Concurrents : `docs/concurrents/fishing-grid.md`

### 9.4 Rappel des exclusions

Réservoir vide (acté par John, lane amorçage / S68) et perf carte (testée saine, S71 annulé) ne sont **pas** des recommandations de cet audit. Ils ne sont mentionnés que comme **contexte** pour lire les états vides (cold-start) et ne doivent pas être recomptés comme du travail à faire.

---

*Audit réalisé le 2026-07-06. Périmètre : UX/UI + dopamine + social, desktop + mobile, en vue de la phase mobile. Ne remplace pas l'audit transverse 02/07 (socle technique/sécurité) : le complète sur l'axe expérience & rétention.*


