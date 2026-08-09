# 🎣 Stratégie de gamification — Le moteur d'engagement de Carnet de Pêche

> Écrit le 2026-07-06, en prolongement de l'audit `docs/audits/AUDIT-2026-07-06-UX-DOPAMINE-SOCIAL.md` et du pivot ADN dopamine du 28/06 (CLAUDE.md §8).
>
> **La demande de John** : « une stratégie de gamification, un peu comme les jeux d'argent, pour rendre le pêcheur accro. »
>
> **Ce que je te livre, et le parti pris assumé** : tu veux la puissance d'accroche d'une machine à sous. Je te donne **tout l'arsenal comportemental qui fait cette puissance** (récompense variable, aversion à la perte, near-miss, complétion, compétition, FOMO, ancrage d'habitude) — c'est exactement ce qui rend Duolingo, Strava, Pokémon GO et Fishing Grid difficiles à lâcher. Je le mappe sur ton produit, feature par feature.
>
> **Mais je tire une ligne nette**, et ce n'est pas de la morale : c'est du business. Les mécaniques *littéralement* casino (loot payant, tirage à l'argent, fausse rareté, faux rivaux) te feraient (1) perdre ton **seul vrai moat qui est l'honnêteté** — « pas de chiffre inventé », « score générique identique pour tous » — , (2) t'exposer juridiquement (loot boxes = terrain glissant, surtout avec un public qui inclut des mineurs), et (3) faire fuir les pêcheurs, qui détestent qu'on les prenne pour des pigeons. **La bonne nouvelle : tu n'en as pas besoin.** Tu as quelque chose qu'aucun casino n'a — voir §1.

---

## 1. Le principe fondateur : la mer EST ta machine à sous. Et elle ne triche pas.

Une machine à sous accroche par une seule chose : la **récompense à ratio variable**. Tu tires le levier, tu ne sais pas ce que tu vas gagner, parfois c'est gros, souvent rien — et c'est précisément l'imprévisibilité qui rend le cerveau accro (le pic de dopamine est plus fort à l'**anticipation** incertaine qu'à la récompense elle-même). Le problème du casino : cette imprévisibilité est **truquée** et **coûte de l'argent au joueur**. C'est ça qui est prédateur.

**Ton produit a la même mécanique, mais honnête et gratuite : chaque sortie de pêche est un tirage à ratio variable dont l'aléa est réel.** Tu ne sais jamais si ça va mordre, ce que tu vas sortir, quelle taille. C'est la nature qui tient le levier. C'est **le variable-ratio le plus puissant qui soit — et personne ne se fait plumer.**

> 🎰 **La thèse de toute la stratégie** : ne PAS simuler une machine à sous par-dessus la pêche. **Amplifier la machine à sous que la pêche est déjà.** Ton rôle : capturer, célébrer et prolonger l'excitation du tirage réel (« qu'est-ce que je vais sortir aujourd'hui ? »), puis empiler des couches de récompense honnêtes par-dessus. C'est ton avantage injuste sur Candy Crush et sur le casino : ton aléa est gratuit, vrai, et déjà addictif.

Tout le reste du document découle de ça : on prend les 10 leviers qui font l'accoutumance au jeu, et on les branche sur le tirage réel qu'est une sortie de pêche.

---

## 2. La boucle centrale (le « Hook ») appliquée

Le modèle de référence des produits addictifs (Nir Eyal, *Hooked*) : **Déclencheur → Action → Récompense variable → Investissement**, en boucle. Plus on tourne, plus l'habitude se grave. Voici ta boucle :

| Étape | Machine à sous | Carnet de Pêche |
|---|---|---|
| **Déclencheur** | Lumières, sons, « rejoue » | *Externe* : notif « ton créneau optimal : 17:30 », « @Marco vient de te doubler », « ta série expire ce soir ». *Interne* : l'ennui, la question « ça mord aujourd'hui ? » |
| **Action** | Tirer le levier | Le geste minimal : ouvrir l'app pour voir le score du jour ; **loguer une prise en 3 taps** |
| **Récompense variable** | Gain aléatoire | La prise elle-même (aléa réel) + XP variable + surprise (badge, case Pokédex, palier) + le score du lendemain |
| **Investissement** | Remettre une pièce | Chaque prise loguée **améliore ton scoring perso** et **complète ta collection** → tu t'enfermes toi-même (plus tu investis, moins tu peux partir) |

L'**investissement** est le génie de ton produit : c'est ton moat. Chaque donnée que le pêcheur rentre rend le produit meilleur *pour lui spécifiquement* et sa collection plus complète. C'est l'effet IKEA + coût irrécupérable : au bout de 200 prises loguées, changer d'app = tout perdre. **Le carnet n'est pas qu'une feature, c'est le piège à sortie fermée le plus éthique qui soit** (le pêcheur reste parce qu'il a construit quelque chose de vrai, pas parce qu'on le manipule).

---

## 3. L'arsenal psychologique — les 10 leviers, mappés à ton produit

Pour chaque levier : la mécanique, où elle se branche (✅ existe déjà / ➕ à ajouter), et un exemple concret.

### 3.1 🎰 Récompense à ratio variable — *le cœur réacteur*
**Mécanique** : l'imprévisibilité du gain. **Branche** : ➕ le « coffre de session » (§5). En plus de l'aléa naturel de la prise, l'**XP devient variable** (pas « +10 » fixe, mais « +8 à +25 » révélé après coup), avec une **chance de bonus surprise** (case Pokédex rare, palier de badge, « moment double XP »). ✅ La célébration existe déjà (`CelebrationOverlay`) — on la transforme en **reveal** à suspense.
**Exemple** : tu logues un bar. L'écran : « Prise enregistrée… » → l'anneau tourne → « **+18 XP** » (variable) → *ping* « 🎁 Bonus : tu débloques la case Pokédex **Bar** ! » → parfois « ⚡ Série chaude : XP x2 sur cette prise ». Tu ne sais jamais ce que le log va lâcher.

### 3.2 💔 Aversion à la perte — *2× plus fort que le gain*
**Mécanique** : on déteste perdre plus qu'on aime gagner. **Branche** : ✅ séries (`StreakCard`), ✅ saisons trimestrielles, ➕ rang qui décline si inactif, ➕ créneau du jour « qui expire ».
**Exemples** : « 🔥 Ta série de 4 semaines expire dimanche soir » ; « La Saison Été finit dans 6 jours — verrouille ton rang » ; « Ton meilleur créneau du jour se ferme à 19:30 ». **Garde-fou honnêteté** : le « joker » mensuel (déjà en place) évite la culpabilisation ; on prévient d'une perte réelle, on n'invente pas d'urgence.

### 3.3 🎯 Near-miss (presque gagné) — *le plus grand moteur du casino*
**Mécanique** : « à un cheveu » motive plus que l'échec net (les machines à sous truquent les near-miss ; les tiens sont **réels**). **Branche** : ➕ partout où il y a un seuil.
**Exemples** : « À **2 cm** de ton record de bar ! » ; « Tu es **1 prise** derrière @Marco au classement du 29 » ; « Il te manquait **5 XP** pour le Lv.4 » ; « 3 espèces sur 4 pour compléter la Méditerranée ». Le near-miss est honnête ici parce que le seuil est vrai — et c'est redoutablement efficace.

### 3.4 📈 Gradient d'objectif — *l'effort accélère près du but*
**Mécanique** : on pousse plus fort quand la barre est presque pleine. **Branche** : ✅ barres XP/paliers existantes → toujours montrer **la prochaine marche** et **la distance restante**, jamais le vide.
**Exemple** : afficher « Volume de prises 9/10 → plus qu'**1** pour le badge Argent » plutôt qu'un « 9 ». Astuce d'amorçage (endowed progress) : démarrer une barre **déjà partiellement remplie** (« 2/10, tu as déjà commencé »).

### 3.5 🧩 Collection & complétion — *l'effet Zeigarnik (l'inachevé obsède)*
**Mécanique** : un set incomplet démange jusqu'à ce qu'on le complète. **Branche** : ✅ Pokédex 26 espèces, ✅ familles de badges à paliers, ➕ sets géographiques/saisonniers.
**Exemples** : « Il te manque **3 espèces** pour compléter la Méditerranée » ; « Collection Été : 5/8 » ; « Tu n'as jamais logué de seiche — case vide dans ton Pokédex ». Le vide d'une case appelle son remplissage (cf audit §4.4 : à froid on montre 3-4 cases, pas 26, pour ne pas déprimer — l'obsession vient quand tu en as déjà quelques-unes).

### 3.6 🏆 Comparaison sociale & compétition — *la rétention long terme la plus forte*
**Mécanique** : se situer par rapport aux autres est un moteur inépuisable. **Branche** : ✅ classements opt-in k-anon, ➕ **duel/rival** (audit §4.6), ➕ « rival de la semaine ».
**Exemples** : « Sur ta côte, tu es **#3** cette saison » ; « **Défie @Marco** » → carte de duel ; « @Marco t'a doublé, reprends ta place ». La compétition entre pêcheurs de niveau proche (opt-in) crée une boucle sociale sans fin. **Garde-fou** : que des compteurs (XP, nb, taille), **jamais un spot**.

### 3.7 ⏳ Rareté & FOMO temporelle — *honnête, parce que le poisson EST saisonnier*
**Mécanique** : le limité dans le temps déclenche l'action immédiate. **Branche** : ✅ saisons, ✅ événement « Saison du Bar », ➕ badges limités datés.
**Exemples** : « Badge **Bar d'Octobre** — dispo ce mois seulement » ; « Événement week-end : double XP sur la dorade » ; « La fenêtre à gros coef, c'est ce week-end ». Ta rareté est **vraie** (biologie + marées), donc crédible — contrairement aux « offres qui expirent » bidon.

### 3.8 🔁 Ancrage d'habitude & check-in quotidien — *la boucle qui ne dépend PAS d'une prise*
**Mécanique** : un rendez-vous quotidien grave l'habitude (tu ne pêches pas tous les jours, mais l'app doit vivre tous les jours). **Branche** : ➕ boucle quotidienne (audit §4.5).
**Exemples** : le **créneau du jour** (« tu vises 17:30 ? +5 XP »), le **quiz/anecdote du jour**, un **streak quotidien léger** distinct de la série de pêche. Ancre-le sur une habitude existante : le pêcheur **checke déjà la marée/météo avant de sortir** → deviens ce réflexe-là.

### 3.9 🪪 Identité & statut — *on reste pour ce qu'on est devenu*
**Mécanique** : quand le rang fait partie de l'identité, on ne quitte plus. **Branche** : ✅ rangs (Mousse → …), ➕ titres, ➕ cosmétiques déblocables.
**Exemples** : « Tu es un **Habitué du bord** » ; titre « Spécialiste du bar » affiché sur ton profil ; cadre d'avatar doré au rang élevé. Le profil public devient une vitrine de soi qu'on entretient. Statut = gratuit, purement cosmétique (§8).

### 3.10 ✨ Surprise, célébration & effet peak-end — *on se souvient du pic et de la fin*
**Mécanique** : un moment de joie intense marque la mémoire et donne envie de revenir. **Branche** : ✅ `CelebrationOverlay` (confetti GSAP) → en faire un **pic** (son, haptique sur mobile, animation généreuse au 1er log, au record, au passage de rang).
**Exemple** : record battu → plein écran, confetti, « **NOUVEAU RECORD — Bar 71 cm** », partage en un tap. La règle peak-end : soigne le sommet (le record) et la fin de session (« belle sortie, +45 XP cette semaine »).

---

## 4. La cadence d'engagement — le rythme qui crée le retour

L'accoutumance vient de la **fréquence des boucles**, à plusieurs échelles de temps qui s'emboîtent. C'est ce qui manque le plus aujourd'hui (tout dépend d'une vraie sortie). On veut une raison de revenir **chaque jour**, **chaque semaine**, **chaque saison**.

| Échelle | Le rendez-vous | Récompense | Dépend d'une prise ? |
|---|---|---|---|
| **Quotidien** | Créneau du jour + « tu vises ? » · quiz du jour · check-in série | +5 XP, streak quotidien léger | ❌ Non (clé !) |
| **Par session** | Loguer une prise → coffre de session (reveal) | XP variable + surprise + célébration | ✅ Oui |
| **Hebdomadaire** | Série de pêche · récap de la semaine · reset classement hebdo · rival de la semaine | Badge régularité, place au classement | Partiel |
| **Saisonnier (trim.)** | Saison + événement (Saison du Bar) · rang qui se verrouille/renouvelle | Rang de saison, badge daté rare | Partiel |
| **À vie** | Rangs, complétion Pokédex, stats de carrière | Statut, identité | Cumulatif |

Le **quotidien** est la pièce manquante n°1 : sans lui, le pêcheur oublie l'app entre deux sorties (parfois des semaines). Le créneau du jour + quiz + streak léger donnent un battement de cœur quotidien qui **ne réclame pas d'aller à l'eau**.

---

## 5. Le système de récompense variable en détail — « le coffre de session »

C'est la mécanique signature, l'équivalent honnête du levier de machine à sous. 🎨 **Maquette : `docs/STRATEGIE-GAMIFICATION-maquette.html`.**

**Le moment** : juste après avoir logué une prise (l'action à plus forte valeur). Aujourd'hui : célébration + « +X XP » fixe. Demain : un **reveal à suspense** en 3 temps.

1. **L'anticipation** (0,8 s) : « Prise enregistrée… » + l'anneau de score qui tourne (le « levier »). Le suspense EST la dopamine.
2. **La récompense de base, variable** : `+8 à +25 XP` révélé, pas un chiffre fixe. La variabilité est **plafonnée et transparente** (jamais 0, jamais un jackpot faussé) — on amplifie l'aléa réel de la prise (une plus grosse = plus d'XP), on n'invente pas un hasard.
3. **La couche surprise** (probabiliste, honnête) : selon la prise, un ou plusieurs *drops* :
   - 🐟 nouvelle **case Pokédex** (si 1re de l'espèce) — le drop le plus fort,
   - 🏅 **palier de badge** franchi (« Volume 10/10 → Argent »),
   - ⚡ **moment double XP** (si série chaude / créneau optimal respecté) — récompense un vrai bon comportement,
   - 🎯 **near-miss annoncé** (« à 2 cm de ton record ! ») qui arme la prochaine session.

**Pourquoi c'est accro sans être du casino** :

- L'aléa est **réel** (la mer), pas un RNG truqué. Tu ne paies pas pour tirer. Tu ne peux pas « perdre » (jamais 0). La variabilité récompense un **fait vérifié** (une vraie prise, mesurée), pas un pari.
- ⚠️ **Interdits** (sinon on bascule dans le jeu d'argent) : pas de « ouvre un coffre payant », pas de tirage acheté avec de l'argent, pas de « retente ta chance pour 0,99 € », pas de récompense de hasard échangeable contre du cash. Le coffre s'ouvre en **pêchant**, jamais en payant.

**Variante quotidienne sans prise** : le « check-in » (créneau visé, quiz réussi) ouvre un **mini-coffre** à petit XP variable — le battement de cœur des jours sans sortie.

---

## 6. Le moteur de notifications — les déclencheurs de retour

Une machine à sous n'existe que si le joueur revient. Tes **déclencheurs externes**, c'est la notif (push mobile à venir, in-app + email aujourd'hui). C'est le levier de ré-engagement le plus puissant — et le plus facile à sur-jouer. Chaque notif doit apporter une **info vraie** (sinon désabonnement + perte de confiance).

**Les 6 familles de déclencheurs** (par ordre de puissance) :

1. **Opportunité réelle** (valeur pure) : « ⚡ Ton créneau optimal aujourd'hui : 17:30–19:30, TRÈS BONNE » ; « Grand coef ce week-end sur ta côte ». *C'est ta notif reine : utile ET elle ramène à l'app.*
2. **Near-miss / rival** (compétition) : « @Marco vient de te doubler au 29 — 1 prise d'écart » ; « À 5 XP du Lv.4 ».
3. **Aversion à la perte** (série/saison) : « 🔥 Ta série expire ce soir » ; « La saison finit dans 3 jours ».
4. **Preuve sociale de vie** (FOMO doux) : « 3 pêcheurs ont sorti du bar dans le 29 aujourd'hui » ; « @Léa a battu son record ».
5. **Progression / drop** : « Nouveau défi de la semaine : +40 XP » ; « Tu peux débloquer le badge Régularité ».
6. **Rendez-vous quotidien** : « Ton quiz du jour t'attend (+5 XP) » ; « Quel est ton plan aujourd'hui ? ».

**Règles anti-usure (= anti-désabonnement)** :

- **Personnalisation** : n'envoie que ce qui concerne SES espèces, SON dépt, SES rivaux. Une notif générique = une désinstallation.
- **Fréquence plafonnée** : ~1/jour max en régime normal, priorité à la notif « opportunité réelle ». Regroupe, ne spamme pas.
- **Heures calmes** : jamais la nuit ; caler la notif « créneau » sur l'heure utile (avant la marée).
- **Opt-in granulaire** : ✅ déjà en place (`NotificationTypeToggles`). Le pêcheur choisit ses déclencheurs. Un système opt-out serré retient mieux qu'un matraquage.
- ⚠️ **Sécurité** (spécifique pêche, cf §9) : ne JAMAIS pousser « sors maintenant » quand les conditions sont dangereuses (grosse houle, coup de vent). Une notif d'engagement ne doit jamais mettre un pêcheur à l'eau dans le mauvais temps pour tenir une série.

---

## 7. Onboarding — accrocher dans les 3 premières minutes

La fenêtre d'accoutumance se joue au tout début. Objectif : **une première victoire + un premier investissement + une première récompense variable, avant la fin de l'onboarding**.

1. **Endowed progress** : le pêcheur finit l'onboarding avec une barre XP **déjà entamée** (« +20 XP pour avoir créé ton carnet ») et son rang Mousse **déjà affiché**. Il ne part pas de zéro, il part de « déjà commencé ».
2. **Première victoire immédiate** : pousser à **loguer/importer une prise tout de suite** (même ancienne). Ce premier log déclenche le **coffre maximal** (célébration généreuse, 1re case Pokédex qui s'illumine, gros XP) — le premier hit doit être le plus fort.
3. **Engagement / commitment** : lui faire **choisir un objectif** (« viser le badge Régularité », « compléter la Méditerranée ») → cohérence + coût d'abandon.
4. **Premier lien social** : proposer de **suivre 2-3 pêcheurs actifs de sa côte** (audit §5.3) → un fil vivant dès la 1re minute, un rival potentiel.
5. **Le rendez-vous de demain** : finir sur « Reviens demain pour ton créneau + ton quiz » → armer le retour J+1 (la rétention J1 est la métrique reine).

Anti-pattern à éviter (cf audit §4.4) : ne PAS ouvrir sur un mur de 26 cases vides et 15 badges à 0. On montre **la prochaine marche**, pas l'escalier vide.

---

## 8. Le lien avec l'argent — deux monnaies qui ne se croisent JAMAIS

Point critique pour ne pas tuer ton pricing ni basculer dans le jeu d'argent :

- **L'XP / les rangs achètent du STATUT** (cosmétique) : titres, cadres d'avatar, couleurs de pseudo, thèmes de carte, badges. Gratuit, gagné en pêchant. C'est la récompense de l'engagement.
- **L'abonnement achète de la PRÉCISION** (utilité) : coords GPS exactes, score par spot, alertes, bathy. C'est ton modèle actuel, honnête (« la précision se paie »).
- ⚠️ **Les deux ne se croisent jamais.** On ne vend PAS d'XP contre de l'argent. On ne débloque PAS une donnée payante avec de l'XP. On ne met PAS de « coffre premium » à 2,99 €. Le jour où l'argent achète du hasard ou de l'avantage, tu es (a) en zone jeu d'argent réglementée, (b) en rupture avec ta promesse de marque.

**Comment la gamification nourrit quand même le revenu** (indirectement, proprement) : un pêcheur accro **pêche plus → veut les coords précises et les alertes → convertit en Local**. L'engagement est le tunnel de conversion. Le near-miss marche aussi côté produit : « Ce spot a un score de 92 — passe en Local pour voir où » (un paywall honnête sur une info réelle, pas un teasing bidon).

---

## 9. Les garde-fous — pourquoi on s'arrête AVANT le vrai casino (et pourquoi c'est plus malin)

Ce ne sont pas des scrupules : ce sont les **conditions pour que la stratégie tienne dans la durée** au lieu de t'exploser à la figure.

1. **L'honnêteté est ton moat — ne le brûle pas.** Ta marque tient sur « pas de chiffre inventé », « score identique pour tous ». Un faux rival, une fausse rareté, un faux « il ne reste que 2 places » : le jour où un pêcheur le découvre (et ils sont malins, méfiants, entre eux), tu perds la confiance qui te différencie de Fishing Grid. **Tout aléa doit être réel, tout compteur doit venir du ledger.**
2. **Pas de mécanique de jeu d'argent au sens légal.** Pas de loot payant, pas de tirage à l'argent, pas de récompense de hasard convertible en valeur. Ton public inclut des **mineurs** (la pêche du bord, ados compris) → les loot boxes sont un aimant à régulateur et à mauvaise presse. Tu n'en as pas besoin : ton aléa gratuit (la mer) est déjà plus fort.
3. **Sécurité physique — la ligne rouge absolue.** Une appli de pêche qui pousse à sortir peut mettre quelqu'un en danger (rochers, houle, nuit, tempête). **Jamais** de mécanique qui incite à pêcher dans de mauvaises conditions pour tenir une série ou grimper un classement. Le « joker » de série, la pause météo (« conditions dangereuses ce week-end, ta série est gelée, reste au sec »), c'est à la fois éthique ET malin (ça évite l'accident qui ferait la une contre toi).
4. **Anti-culpabilisation & respect.** Séries sans punition (joker déjà en place), langage qui encourage sans harceler, **compétition 100 % opt-out** (`public_ranking` réversible), pas de dark pattern de rétention (désabonnement facile). Un pêcheur qui se sent manipulé churne — et le dit.
5. **RGPD & données.** Tout opt-in, réversible ; les métriques d'engagement servent le produit, pas la revente.

> **La formule** : vise **90 % de l'accroche d'une machine à sous** avec des mécaniques honnêtes, gratuites, légales et on-brand — et laisse les **10 %** (le loot payant, le hasard truqué) qui te feraient épingler, délister et perdre la confiance qui est ton vrai actif. Ce n'est pas la version « soft » : c'est la version **qui dure**.

---

## 10. Les métriques d'« addiction » (engagement) à suivre

Pour piloter, instrumenter dans PostHog (déjà branché) :

- **Rétention J1 / J7 / J30** (la reine — l'onboarding §7 la vise directement).
- **DAU / MAU** (le « stickiness » : un ratio > 20 % = habitude installée).
- **Longueur de série moyenne** et **% de séries maintenues** (proxy direct de l'accoutumance).
- **Sessions par semaine** et **jours actifs/semaine** (le battement quotidien §4 doit le monter).
- **Taux de log par sortie**, **prises loguées / utilisateur** (l'investissement §2 = le moat).
- **CTR des notifications par famille** (§6) → couper ce qui ne performe pas, garder « opportunité réelle ».
- **Taux d'opt-in classement / duel** (l'appétit compétitif).
- **Funnel signup → 1re prise → 3e prise** (le seuil où le scoring perso s'active = le point d'accroche du moat).

Cible d'accroche : amener un maximum de pêcheurs au **seuil des 3 prises** (là où le carnet devient irremplaçable) le plus vite possible après l'inscription.

---

## 11. Séquencement — ce qui existe déjà vs ce qu'il faut ajouter

Bonne nouvelle : **80 % des briques existent** (S60-S69). La stratégie est surtout de l'**orchestration + 3 ajouts**. Aligné avec le backlog de l'audit (§7-§8).

**Déjà en prod, à orchestrer/amplifier** : XP ledger, rangs, séries + joker, badges à paliers, défis, classements opt-in k-anon, saisons, Pokédex, célébration, notifs (moteur + opt-in granulaire), profils publics. Anti-farm/ledger = la garantie d'honnêteté (§9-1).

**Les 3 ajouts qui débloquent la stratégie** :

1. **Le coffre de session (récompense variable)** — §5. Transformer la célébration en reveal à XP variable + drops. *Cœur réacteur. Effort moyen, impact énorme.*
2. **La boucle quotidienne** — §3.8 / §4. Créneau-défi + quiz + streak léger. *Le battement de cœur des jours sans pêche. La pièce manquante n°1.*
3. **Le face-à-face (duel/rival) + le moteur de notifs personnalisé** — §3.6 / §6. *La couche sociale-compétitive qui ne s'épuise jamais.*

Plus les **prérequis de mise en scène** de l'audit (sans lesquels rien ne se voit) : header de progression (P1), cold-start séquencé (P2), pages `/defis` + `/progression` (P3), tab bar mobile (P4).

**Ordre proposé** : (1) mise en scène [audit P1-P4] → (2) coffre de session → (3) boucle quotidienne → (4) duel + notifs perso. Chaque étape est jouable et mesurable indépendamment.

---

## 12. Décisions à trancher (⚠️ John)

- **Amplitude de l'XP variable** : fourchette serrée (+8 à +15, doux) ou large (+5 à +40, plus « slot ») ? Recommandation : commencer serré, élargir en mesurant.
- **Streak quotidien léger** : on l'ajoute en plus de la série de pêche hebdo, ou on garde une seule série pour ne pas surcharger ?
- **Coffre quotidien sans prise** : oui/non ? (risque : diluer la valeur du log réel — à tester).
- **Cosmétiques déblocables** : est-ce qu'on investit dans un système de cosmétiques (cadres/titres/thèmes) comme récompense d'XP, ou on reste badges/rangs pour l'instant ?
- **Notifs push** : c'est surtout mobile — on cadre le moteur maintenant (web/email) pour qu'il soit prêt au lancement natif, ou on attend le mobile ?

---

*Stratégie rédigée le 2026-07-06. Complète l'audit `docs/audits/AUDIT-2026-07-06-UX-DOPAMINE-SOCIAL.md`. Principe directeur : amplifier l'aléa réel de la pêche (honnête, gratuit, déjà addictif) plutôt que simuler un casino (truqué, payant, risqué). Garde-fous §9 non négociables : honnêteté, pas de jeu d'argent, sécurité pêche, RGPD, opt-out.*

