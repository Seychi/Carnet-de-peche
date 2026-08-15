# Roadmap Conversion — sprints 79 → 83

> Rédigée le **2026-08-15**, après l'audit mobile et la QA du sprint 78
> (`docs/sprint-78/AUDIT-MOBILE-2026-08-15.html`).
> Tous les chiffres de référence viennent d'une mesure faite ce jour : PostHog (projet 208730),
> SQL live sur la production, et 14 pages parcourues en émulation iPhone 13 contre la prod.
> **Cette roadmap FAIT FOI** pour les sprints 79 à 83. Elle repousse la phase mobile.

---

## 0. Le constat qui commande tout le reste

Le sprint 78 a bien travaillé. Le problème est ailleurs.

| Fait mesuré (mobile, 90 jours) | Chiffre |
|---|---|
| Murs d'inscription **vus** | **242** |
| Murs d'inscription **cliqués** | **2** *(0,83 %)* |
| Comptes créés attribuables au mobile | **0** *(voir §1, angle mort de mesure)* |
| Paywalls vus | **158** — pour **4 abonnés payants au total** |
| Clics sur le CTA d'accueil | **10** |
| Clics CTA sur `/especes` | **1** — pour 7 474 impressions/mois |

Le moteur d'acquisition fonctionne : ~28 000 impressions et ~1 495 clics Google par mois,
7,2 % de CTR sur `/spots` à la position 7,1. **81 % des visiteurs sont sur mobile.**
Ce trafic arrive et il repart.

> ### ★ La thèse de cette roadmap
>
> **Doubler l'inventaire doublerait un trafic qui ne convertit pas.** Le brief du sprint 78
> visait « 416 pages → un ordre de grandeur au-dessus ». C'est exécuté proprement, mais deux
> mesures disent que ce n'est plus le plafond : (1) le tunnel mobile produit zéro compte,
> (2) Google ne consacre que **~10 requêtes/jour à la découverte**, soit ~10 mois de file
> d'attente pour les 2 700 fiches restantes. Publier plus vite ne les indexera pas plus vite.
>
> **On arrête d'ajouter des pages jusqu'à ce qu'un compte puisse se créer depuis un téléphone.**
> Le lot 2 est explicitement gaté là-dessus (§S82).

---

## 1. Décisions John du 2026-08-15, verrouillées

| Décision | Ce qu'elle implique |
|---|---|
| **Le score reste gratuit, assumé.** | Il sort définitivement des arguments de vente (4 colonnes déjà nettoyées au S78). **Local se vend sur les alertes par port, les coordonnées précises et le hors-ligne.** On ne regate rien. Voir S83. |
| **La phase mobile (Expo / React Native) reste gatée derrière la conversion web.** | Aucun démarrage Expo, aucun monorepo, aucune dépendance RN tant que le gate du §4 n'est pas franchi. Une app native ne répare pas un CTA recouvert. |
| **Livrable : roadmap + brief du sprint 79 seulement.** | Les briefs S80 → S83 seront rédigés au fil de l'eau, à partir de ce document et du RECAP du sprint précédent. |
| ★ **Les cinq sprints s'enchaînent sans attente entre eux.** *(ajoutée le 15/08, après rédaction du brief S80)* | Un sprint démarre quand le précédent est **mergé, déployé et prouvé fonctionnellement** — pas quand son témoin comportemental a répondu. Les relevés J+3 / J+14 continuent, mais ils commandent désormais des **corrections en cours de route**, plus le départ du sprint suivant. **Trois freins restent en place** et ne sont pas concernés : le CTR `/spots` sous 6 % (dépublication du lot 1), la publication du lot 2 (§S82 Bloc 5), la relecture RGPD du §S81 Bloc 1. Règle complète et contrepartie : **§3.1**. |

---

## 2. Les repères d'avant (base du 2026-08-15)

À ne pas remesurer autrement que par les mêmes requêtes, sinon les comparaisons ne valent rien.

### Produit et tunnel (PostHog, 90 j, mobile, comptes de test exclus)

| Repère | Base | Cible fin S83 |
|---|---|---|
| `signup_wall_viewed` → `signup_wall_clicked` | **0,83 %** | **> 6 %** |
| `home_cta_clicked` / mois | 3,3 | > 25 |
| `species_page_cta_clicked` / mois | 0,3 | > 15 |
| `catch_log_started` → `signup_completed` | non mesurable | **mesurable, puis > 25 %** |
| Comptes / semaine | 16 | > 30 |
| Comptes ayant logué ≥ 1 prise (60 j) | **15 %** | > 35 % |
| Fiches avec ≥ 1 prise publique | **2 / 607 (0,3 %)** | > 3 % |
| Abonnés payants | **4** | > 15 |

### Audience et mesure

| Repère | Base |
|---|---|
| Visiteurs PostHog 30 j (tous appareils) | **427** — contre **~1 495 clics GSC** ⇒ **~29 % du réel visible** |
| Part mobile des visiteurs | **81 %** (348 / 427) |
| Auto-référencement `www.carnet-de-peche.com` | **44,9 %** des visiteurs mobiles |
| Rebond mobile affiché | 19,6 % *(non représentatif, biais de consentement)* |

### SEO (GSC 30 j, source `docs/sprint-78/METRIQUES.md`)

| Répertoire | Impressions | CTR |
|---|---|---|
| `/spots` | 12 894 | **7,2 %** ← **témoin de sortie, ne doit pas passer sous 6 %** |
| `/especes` | 7 474 | 1,42 % |
| `/peche` | 4 967 | 5,94 % |
| `/` | 2 100 | 6,95 % |
| Débit de découverte Google | **~10 URL/jour** | |

### Inventaire

607 fiches approuvées (**416 curées à la main + 191 générées au S78**), 3 827 en attente
dont 2 905 éligibles à la porte de qualité. Méditerranée : 44,6 % de l'inventaire publié.

---

## 3. Les cinq sprints

### Vue d'ensemble

| Sprint | Titre | Durée | Ce qu'il débloque | Témoin de sortie *(à relever — ne commande plus le départ du suivant, cf §3.1)* |
|---|---|---|---|---|
| **S79** | Le tunnel qui s'ouvre | ~1 sem. | Les 5 défauts bloquants + la mesure minimale | `signup_wall_clicked` mobile **> 3 %** à J+14 |
| **S80** | La première réponse | ~1,5 sem. | Ce que voit un mobile dans les 3 premières secondes | Rebond `/carte` **< 30 %**, CTA accueil **> 15/mois** |
| **S81** | La mesure honnête | ~1 sem. | Les deux tiers de trafic invisibles, l'auto-référencement, 170 px d'écran | Visiteurs PostHog **> 70 %** des clics GSC |
| **S82** | La matière fraîche | ~1,5 sem. | Le chaînon jamais fait : des prises réelles sur les fiches | Fiches avec ≥ 1 prise **> 1 %** |
| **S83** | Local se vend sur les alertes | ~1 sem. | Une offre payante cohérente avec « le score est gratuit » | Abonnés payants **> 10** |

**Lane contenu/SEO** tourne en parallèle du début à la fin, sans jamais mobiliser le sprint
principal. Détail au §5.

---

### ★ 3.1 Enchaînement — la règle, depuis la décision du 15/08

> **Les cinq sprints s'enchaînent. On ne s'arrête plus entre deux pour attendre un relevé.**
> Ce paragraphe remplace, partout dans ce document, la lecture « gate franchi / gate non franchi »
> comme condition de démarrage. Il ne retire aucun garde-fou de sécurité — voir la liste plus bas.

#### Deux preuves que la version d'origine confondait

| | Ce qu'elle établit | Disponible quand |
|---|---|---|
| **Preuve mécanique** | Le défaut est corrigé. Le CTA reçoit le clic, la page ne redirige plus, le brouillon part avec l'espèce seule. | **Le jour du déploiement.** Elle se rejoue à la main en dix minutes, `elementFromPoint()` à l'appui. |
| **Preuve comportementale** | Le corriger a changé le comportement des visiteurs — le fameux 3 %. | **14 jours minimum**, quoi qu'on fasse. C'est le délai du trafic, pas celui du code. |

Le sprint suivant a besoin de la première. La version d'origine exigeait la seconde : c'était
payer deux semaines d'arrêt entre chaque sprint pour une information qui ne change rien à ce
qu'il y a à faire dans le sprint d'après. **Sur cinq sprints, ça faisait deux mois d'attente pure.**

#### Ce qui commande le départ d'un sprint

1. Le sprint précédent est **mergé sur `main` et déployé** — pas « code-complet sur une branche ».
2. Ses **critères d'acceptation sont cochés avec preuve** dans son RECAP.
3. Son **parcours de sortie se rejoue à la main** et va au bout, en 390 × 664, sans cookie de
   consentement. **C'est le seul cas d'arrêt** : si le parcours échoue, le correctif n'a pas tenu,
   et on le reprend avant d'aller plus loin.

#### Ce qui ne le commande plus

Les seuils comportementaux à J+14. **On les relève quand même**, au calendrier du §7 — ils
tombent maintenant *pendant* un sprint au lieu de *entre* deux. Un mauvais relevé ouvre une
**reprise dans le sprint en cours**, en tête de priorité, il ne fait pas reculer le calendrier.

#### Les trois freins qui restent, et qui ne sont pas des attentes

| Frein | Pourquoi il reste |
|---|---|
| **CTR `/spots` sous 6 % ⇒ dépublication du lot 1** | C'est un **retour en arrière**, pas une attente. Une requête SQL, effet immédiat, déjà consignée. Rien à gagner à l'assouplir. |
| **Lot 2 gaté** (§S82 Bloc 5) | C'est la thèse même de cette roadmap : on n'ajoute pas de pages tant qu'un compte ne peut pas se créer depuis un téléphone. ✅ **Et il ne coûte rien au calendrier** : le S82 démarre à ~J+17 du déploiement du S79, le lot 2 se publie en cours de sprint vers J+25 — **le relevé à J+14 existera à ce moment-là.** Le seul gate qui protège vraiment le site est aussi le seul qui n'impose aucune attente. |
| **Relecture RGPD avant le §S81 Bloc 1** | Arbitrage juridique, pas technique, et le seul délai de toute la chaîne qui ne dépend pas de nous. ⚠️ **À lancer pendant le S80, pas au démarrage du S81.** Si l'avis n'est pas rendu, le S81 fait ses Blocs 2 à 5 d'abord — mais le Bloc 2 (disparition du bandeau) dépend du Bloc 1 et glisse avec lui. |

#### ⚠️ La contrepartie, non négociable

**Chaque sprint est mergé et déployé dès qu'il est vert, avant que le suivant démarre.** Cinq
sprints empilés sur des branches et déployés d'un bloc à la fin, ce serait six semaines de travail
sans un seul témoin — exactement ce que cette roadmap reproche au sprint 78. Sans déploiement
continu, l'enchaînement ne fait pas gagner du temps : il fait perdre la mesure.

#### Calendrier indicatif (J0 = déploiement du S79)

| Période | Sprint en cours | Relevés qui tombent pendant |
|---|---|---|
| J0 → J+10 | **S80** | J+3 S79 *(indicatif, volume trop faible pour conclure)* |
| J+10 → J+17 | **S81** | **J+14 S79** — le témoin du tunnel · CTR `/spots` J+7 et J+14 |
| J+17 → J+28 | **S82** | J+14 S80 · J+7 S81 · publication du lot 2 en cours de sprint |
| J+28 → J+35 | **S83** | — |
| après | — | J+30 S82 · les 5 conditions du gate mobile (§4) |

Les durées sont celles du tableau ci-dessus ; les dates réelles dépendent des déploiements.
**Le §4 (gate mobile) n'est pas concerné par cette décision** : c'est le passage à une autre
phase, pas un enchaînement de sprints, et là, attendre est précisément le sujet.

---

### ★ S79 — « Le tunnel qui s'ouvre »

> **Brief détaillé et exécutable : `docs/sprint-79/BRIEF.md`.**

**Objectif en une phrase :** qu'un pêcheur arrivé de Google sur un téléphone puisse créer un
compte sans rencontrer un seul obstacle mécanique, et qu'on puisse le prouver.

| Bloc | Contenu | Effort |
|---|---|---|
| **0 — Mesure minimale** | `$device_type`, `$os`, `$browser` sur `signup_completed` et `onboarding_finished` (aujourd'hui émis côté serveur, sans appareil ⇒ **aucun funnel mobile ne peut se terminer**). | 0,5 j |
| **1 — `/carte` : le CTA recouvert** | Le bandeau de consentement (z-60, 482→652 px) recouvre **92 %** de la barre d'inscription (z-40, 514→664 px). `elementFromPoint()` au centre du CTA ne renvoie pas le CTA. Le mécanisme correctif existe déjà (`app/globals.css:423`), il n'a pas été appliqué ici. **`/carte` déclenche 106 des 242 murs mobiles, soit 44 %.** | 0,5 j |
| **2 — `/carte` : le CTA qui mène à la connexion** | `MapShell.tsx:697` pointe vers `/auth/login?tab=register`, page dont le H1 est « Connexion à ton carnet ». `buildSignupHref()` existe déjà et fait le bon travail. | 15 min |
| **3 — `/carnet/nouvelle` : la redirection client** | Le serveur rend le formulaire, **le client redirige vers `/auth/login` après hydratation** quand il n'y a pas de `spot_id` UUID valide. Le `?redirect=` perd au passage le `spot_id`. | 1 j |
| **4 — Le brouillon sauvable avec l'espèce seule** | Aujourd'hui : espèce → technique → **modèle de leurre** avant qu'un brouillon parte. Et `/auth/register` ne rappelle pas le brouillon, contrairement à ce qu'annonce le RECAP du S78. | 1 j |
| **5 — Le paywall après le compte, jamais avant** | 158 paywalls vus sur mobile, 4 abonnés. Chaque paywall montré à un anonyme prend la place d'une invitation à créer un carnet. **Décision John : le score est gratuit** ⇒ le paywall n'a plus d'argument avant S83. | 0,5 j |
| **6 — Vérité des chiffres** | L'accueil affiche **« 607 spots curés & vérifiés »** (191 n'ont eu aucune relecture humaine) **et « 200+ »** ailleurs dans la même page. Meta descriptions à ramener sous 155 car. (accueil : 266). | 0,5 j |

**Preuve de départ du S80** *(immédiate)* — les cinq correctifs se rejouent à la main en
390 × 664 et vont au bout. C'est elle qui ouvre le sprint suivant, pas le témoin ci-dessous (§3.1).

**Témoin de sortie** *(à relever, ne bloque plus)* — `signup_wall_clicked / signup_wall_viewed`
sur mobile **> 3 % à J+14** (base 0,83 %). Ce relevé tombe **pendant le S81**. En dessous, on
ouvre une reprise du tunnel en tête du sprint en cours — on ne fait pas reculer le calendrier.

**Garde-fous** — CTR `/spots` ne descend pas sous 6 %. Floutage GPS, k-anon K=3 et RLS
intouchables. Aucune migration nécessaire dans ce sprint : si un agent en propose une, c'est
qu'il a mal lu.

---

### S80 — « La première réponse »

**Objectif en une phrase :** que les trois surfaces d'entrée du site répondent, dans le premier
écran d'un téléphone, à la question qui a amené le visiteur.

| Bloc | Contenu |
|---|---|
| **1 — La fiche de spot** | C'est le meilleur actif du site (12 894 impressions, 7,2 % de CTR). Aujourd'hui le premier écran mobile donne : fil d'Ariane, deux badges, le nom, **« ZONE APPROCHÉE »**, une note 3/5 et trois pastilles d'espèces. **Aucune marée, aucune météo, aucun score, aucune description.** → Marée du jour, vent, score au-dessus de la pliure ; « zone approchée » et la note descendent. |
| **2 — L'accueil mobile** | Premier écran = logo + H1 sur trois lignes + une phrase et demie + bandeau cookies. Zéro preuve, zéro capture produit, zéro CTA dans le corps. → Une preuve visuelle réelle et un CTA au-dessus de la pliure. |
| **3 — La carte MapTiler de l'accueil** | Trois requêtes en `ERR_ABORTED` (`tiles.json`, `sprite@2x.json`, `sprite@2x.png`), et le rendu affiche **les Cornouailles britanniques (« Truro »)** en fond d'un site de pêche française. |
| **4 — Le cadrage de `/carte`** | La vue par défaut mobile est centrée Brest–Nantes–La Rochelle. **La Méditerranée fait 44,6 % de l'inventaire et n'est pas dans le cadre.** → France entière, ou département détecté. Le travail du Bloc 3 du S78 devient visible. |
| **5 — Les liens morts et les cibles tactiles** | Deux liens rendus **0 × 0 px** sur les fiches (« Créer mon carnet », « + Loguer une prise ici »). 22 cibles sous 44 px sur `/especes/bar` — dont la liste de spots que le S78 vient de remonter en haut de page (308 × **37** px). Le lien d'évitement « Aller au contenu » est à **1 × 1 px** sur toutes les pages. |
| **6 — Les libellés qui promettent à côté** | La barre collante des fiches dit « Voir les conditions à X, gratuit » et mène à `/auth/register`. Les conditions sont déjà sur la page. |

**Témoins de sortie** *(à relever pendant le S82, ne bloquent pas le S81)* — rebond `/carte`
mobile **< 30 %** (base 40 %) · `home_cta_clicked` **> 15/mois** (base 3,3) ·
`species_page_cta_clicked` **> 8/mois** (base 0,3).

**Preuve de départ du S81** *(immédiate)* — les quatre captures « après » en regard des « avant »,
et la réponse écrite à la question du VERIF : *un pêcheur qui arrive de Google obtient-il une
réponse utile sans scroller ?*

**Garde-fous** — ⚠️ Ne pas refondre la fiche de spot : la **réordonner**. C'est elle qui ranke.
Toute modification qui touche au rendu de `/spots/[slug]` se vérifie sur une fiche générée
**et** une fiche curée.

---

### S81 — « La mesure honnête »

**Objectif en une phrase :** voir enfin les deux tiers de visiteurs qui échappent à PostHog, et
récupérer 170 px de bas d'écran au passage.

| Bloc | Contenu |
|---|---|
| **1 — Comptage sans cookie pour les anonymes** | `PostHogProvider` est en `opt_out_capturing_by_default: true` : **aucune capture avant clic sur « Accepter »**. Résultat : 427 visiteurs vus pour ~1 495 clics Google. Passer les anonymes en mode sans cookie (`persistence: 'memory'`, pas d'identifiant persistant) — suffisant pour volume, entrées, rebonds — et ne réserver le bandeau qu'à l'identification. ⚠️ **Relecture RGPD obligatoire avant déploiement**, et la page `/legal/confidentialite` suit. |
| **2 — Le bandeau qui disparaît** | Si le Bloc 1 passe, le bandeau ne s'affiche plus par défaut. **170 px rendus au bas de l'écran mobile sur toutes les pages** — et la cause racine du défaut n° 1 du S79 disparaît. Garder le correctif du S79 quoi qu'il arrive : ceinture et bretelles. |
| **3 — L'auto-référencement** | 44,9 % des visiteurs mobiles sont attribués à `www.carnet-de-peche.com`. Le correctif d'attribution du S76 n'a pas réglé le fond : les sessions se coupent et repartent en se référençant elles-mêmes. Piste n° 1 : durée de session PostHog face à une navigation lente. Piste n° 2 : les 16 visiteurs qui passent encore par l'apex. |
| **4 — Le funnel en tableau de bord** | Un dashboard PostHog unique : visite → mur vu → mur cliqué → compte → onboarding → 1<sup>re</sup> prise, segmenté mobile/desktop, avec les témoins de chaque sprint de cette roadmap. Sans ça, chaque revue coûte une heure de requêtes. |
| **5 — Les trois LCP hors clous** | `/onboarding/1` à **3 708 ms** (au pire endroit possible), `/home` à 2 793 ms, `/spots/pointe-du-guern-telgruc` à **7 232 ms**. |

**Témoins de sortie** *(à relever, ne bloquent pas le S82)* — visiteurs PostHog **> 70 %** des
clics GSC sur la même fenêtre · auto-référencement **< 10 %** · LCP p75 mobile **< 2 500 ms**
sur `/onboarding/1`.

**Preuve de départ du S82** *(immédiate)* — le comptage sans cookie capture bien un visiteur
anonyme *(ou, si l'avis juridique n'est pas rendu, le Bloc 1 est explicitement reporté et écrit
comme tel dans le RECAP)* · le dashboard funnel du Bloc 4 existe et affiche les six étapes.

**Garde-fous** — ⚠️ DEMANDER À JOHN AVANT tout déploiement du Bloc 1 : c'est un arbitrage
juridique, pas technique. Ne jamais capter de donnée identifiante sans consentement.
⚠️ **Ce frein n'est pas dégaté par la décision du 15/08** (§3.1) : il est de nature juridique, pas
calendaire. Il se prépare en amont — la relecture se lance **pendant le S80**.

---

### S82 — « La matière fraîche »

**Objectif en une phrase :** qu'une fiche de spot cesse d'être une compilation de données
publiques que n'importe qui peut refaire.

C'est le **Bloc 5 du brief 78, jamais exécuté** — et le brief avait raison de l'appeler
« le chaînon qui décide si le site devient défendable ou reste substituable ».
**2 fiches sur 607 ont une prise publique. 0,3 %.**

| Bloc | Contenu |
|---|---|
| **1 — Rendre la rareté visible** | Sur une fiche sans prise : « Personne n'a encore déclaré de prise ici. Sois le premier » — contextualisé, à la place d'une section vide. Le geste le moins cher de toute la roadmap. |
| **2 — Le contexte suit le brouillon** | Après S79, un anonyme peut remplir une prise sur une fiche. Vérifier de bout en bout que le spot, l'espèce et les coordonnées survivent à l'inscription et se retrouvent dans le carnet. |
| **3 — Amorçage John** | Les codes fondateurs : **2 utilisés sur 20**. Objectif 4 semaines : 20 fondateurs actifs, 100 prises. C'est du travail humain, pas du code — mais rien ne le remplace. |
| **4 — Les relances lifecycle** | Elles ne servaient à rien tant que les emails partaient en indésirables. Le S78 a réglé SPF, DKIM, DMARC et la liste de suppression. Elles sont maintenant utiles : relance J+1 sur un brouillon non enregistré, J+3 sur un compte sans prise. |
| **5 — Lot 2, sous condition** | ⚠️ **Gaté, et ce gate-là ne bouge pas** (§3.1) : on ne publie le lot 2 que si le CTR `/spots` tient au-dessus de 6 % **et** que le témoin du S79 est au-dessus de 3 %. ✅ Dans le plan enchaîné, ce bloc tombe vers **J+25** du déploiement du S79 : **le relevé à J+14 existe déjà**, la condition est donc vérifiable sans attendre quoi que ce soit. Si le témoin du S79 est mauvais, **on ne publie pas** — c'est la thèse de cette roadmap, pas une formalité. Cadence alignée sur le débit de découverte réel (~10 URL/jour) : **un lot toutes les 3 semaines**, pas un par semaine. Avant le lot 2, corriger le gabarit — voir ci-dessous. |
| **6 — Le gabarit méditerranéen** | 🔴 **Défaut confirmé du S78** : le paragraphe « type de poste » du gabarit *plage* dit « les zones où l'eau reste plus sombre **à marée basse** gardent du poisson **à marée montante** » — juste avant « sur cette façade, le marnage est négligeable ». Le test cherchait « coefficient de marée » et ne pouvait pas le voir. Rebrancher ce paragraphe sur `facadeOf()`, élargir le test à **toute** occurrence de « marée » dans une fiche méditerranéenne, et republier le lot 1 (la requête de dépublication est déjà consignée). |
| **7 — La variance du contenu** | « 191/191 descriptions distinctes » est vrai octet par octet et faux à la lecture : deux plages à 400 km d'écart ont le même texte au nom et au département près, **liste d'espèces comprise**. Faire entrer une donnée qui varie : orientation du poste, exposition au vent dominant, profondeur proche, distance au port. Ces données existent déjà. |

**Témoins de sortie** — zéro occurrence de « marée » dans une fiche méditerranéenne (test
automatisé) : celui-là est **immédiat et vérifiable en fin de sprint**, c'est la preuve de départ
du S83. Les deux autres sont des relevés qui tombent plus tard : fiches avec ≥ 1 prise publique
**> 1 %** (base 0,3 %) et **20 fondateurs actifs** — quatre semaines de travail humain (Bloc 3),
qui court en parallèle et ne retient pas le S83.

**Garde-fous** — ⚠️ Ne jamais fabriquer de fausse prise ni de « prise d'exemple ». Le jour où
un pêcheur s'en aperçoit, la confiance ne revient pas. Le k-anon K=3 et le floutage restent
intouchables.

---

### S83 — « Local se vend sur les alertes »

**Objectif en une phrase :** reconstruire une offre payante qui tient debout maintenant que le
score est gratuit.

**Décision John du 15/08 : le score est gratuit, assumé.** Il ne revient dans aucune colonne de
vente. Ce qui reste défendable pour Local :

| Ce qui se paie | Pourquoi c'est tenable |
|---|---|
| **Les alertes par port** (livrées au S72) | Zéro abonné les a réglées aujourd'hui, faute d'abonnés. C'est la seule feature du produit qui vaut un abonnement récurrent : elle travaille quand l'utilisateur dort. |
| **Les coordonnées précises** | Le floutage 500-900 m est le gating historique, il est propre, il est compris. |
| **Le hors-ligne** (carte + marées 7 j) | Un pêcheur au bord de l'eau n'a pas de réseau. Argument concret, démontrable. |
| **Les couches avancées** (bathymétrie, vent, courants) | Déjà en place. |

| Bloc | Contenu |
|---|---|
| **1 — Retirer le paywall du parcours anonyme** | Confirmer que le S79 Bloc 5 tient : un anonyme ne voit jamais de prix, seulement une invitation à créer un carnet. |
| **2 — Reconstruire `/tarifs` autour des alertes** | Le S78 a nettoyé 7 surfaces de copie mensongère. Il reste à réécrire la proposition de valeur, pas seulement à retirer le faux. |
| **3 — L'upsell au bon moment** | Pas à la première visite : au moment où l'utilisateur a un spot favori et trois prises. `upsell_clicked` = 5 sur 90 j parce qu'il est montré à des gens qui n'ont rien à gagner encore. |
| **4 — Une démonstration d'alerte** | Faire vivre l'alerte une fois, gratuitement, sur le spot favori. On ne vend pas une notification en la décrivant. |

**Témoins de sortie** — abonnés payants **> 10** (base 4) · `upsell_clicked / paywall_viewed`
**> 8 %** (base 3 %) · au moins 1 abonné a réglé une alerte par port. C'est le dernier sprint de
la chaîne : ici, plus rien n'est « en attente de ». Ces trois relevés servent au §4, et le §4 est
le seul endroit de ce document où attendre est le sujet.

**Garde-fous** — ⚠️ Ne pas regater le score. La décision est prise, et la reprendre serait
reprendre une valeur déjà donnée, avec le coût de confiance correspondant.

---

## 4. Le gate mobile (S84+)

La phase Expo / React Native ne démarre **que** si les cinq conditions suivantes sont vraies.
Elles remplacent le gate de `docs/roadmaps/ROADMAP-POST-AUDIT-2026-07-02.md` §4.

| # | Condition | Base 15/08 |
|---|---|---|
| 1 | `signup_wall_clicked / viewed` mobile **> 6 %** | 0,83 % |
| 2 | **> 30 comptes / semaine** | 16 |
| 3 | **> 35 %** des comptes ont logué ≥ 1 prise | 15 % |
| 4 | Visiteurs PostHog **> 70 %** des clics GSC *(sinon on pilotera à l'aveugle)* | ~29 % |
| 5 | **> 10 abonnés payants** *(sinon l'app n'a pas de modèle à porter)* | 4 |

> ⚠️ **La raison d'être de ce gate** : le web mobile et l'app native partagent le même tunnel,
> les mêmes murs et les mêmes libellés. Tout ce qui bloque aujourd'hui sur un téléphone
> bloquerait à l'identique dans une app — en coûtant, en plus, deux stores et un cycle de
> release. Réparer d'abord, porter ensuite.

**Si le gate est franchi**, `docs/roadmaps/ROADMAP-MOBILE-2026-07-02.md` reprend, avec une
réserve : **le SDK Expo qui y est cité est périmé, à retrancher avec John au démarrage.**

---

## 5. Lane contenu / SEO (en parallèle, jamais dans le sprint principal)

Elle avance en fond et ne mobilise pas le sprint de conversion.

| Chantier | État | Note |
|---|---|---|
| **`/especes`, 5 à 8 pages suivantes** | Bloquée depuis le S78 : il manque l'export GSC des impressions par page `/especes/*`. La méthode est écrite et testée (`lib/especes/seo.ts`, `lib/especes/content/*.ts`). | **John : envoyer l'export.** C'est du contenu, pas du code. |
| **Titre `/especes` à 76 caractères** | 🔴 Viole le critère d'acceptation du S78 (« aucun titre > 60 »). | Correctif immédiat, 5 minutes. |
| **Curation des 2 905 spots éligibles** | Suspendue jusqu'au S82 Bloc 5. | Cadence cible : **un lot de 200 toutes les 3 semaines**, calée sur les ~10 URL/jour de découverte. |
| **Alléger `/spots`** | 1,98 Mo de HTML, 7 739 nœuds, 685 liens, 24 587 px, TTFB 748 ms. | **C'est le vrai levier d'indexation** : Google module son débit sur le temps de réponse (1 247 ms de moyenne pondérée). À traiter au S81 ou dans la lane. |
| **Les 404** | 1,46 % des demandes d'exploration (~107). | À regarder dans `Pages → Non indexée → Introuvable`. |
| **Balises canoniques manquantes** | Absentes sur `/auth/register` et `/auth/login`, tous deux en `Allow` dans `robots.txt`. `/auth/login` est la 2<sup>e</sup> page d'entrée mobile. | À traiter au S79 Bloc 6. |

---

## 6. Ordre de sacrifice, s'il faut couper

**Le S79 ne se sacrifie jamais.** C'est une semaine qui décide si les sprints 75 à 78 ont servi
à quelque chose. Ses blocs 1, 2 et 3 valent à eux seuls tout le reste de la roadmap.

Ensuite, dans l'ordre où on coupe :

1. **S83** (monétisation) — 4 abonnés, ce n'est pas là que ça se joue ce trimestre.
2. **S82 blocs 5 et 7** (lot 2 et variance du contenu) — le S82 se réduit à ses blocs 1, 2, 3, 6.
3. **S81 blocs 3 et 5** (auto-référencement, LCP) — le Bloc 1 (sans cookie) ne se coupe pas :
   il conditionne la lecture de tous les témoins.
4. **S80 blocs 5 et 6** (cibles tactiles, libellés) — les blocs 1 à 4 restent.

**Ce qui ne se coupe jamais, quel que soit le sprint :** le floutage GPS, le k-anon K=3, la RLS,
l'honnêteté des chiffres affichés, et le témoin `/spots` à 6 %.

---

## 7. Relectures

> **Réécrit le 15/08 avec la décision d'enchaînement (§3.1).** Ces relevés ne sont plus des feux
> rouges entre deux sprints : ils tombent **pendant** un sprint et déclenchent une **action
> corrective**, pas un arrêt. La colonne de droite dit ce qu'on fait, pas ce qu'on attend.

| Échéance | Tombe pendant | Ce qu'on regarde | Ce qu'on fait si c'est mauvais |
|---|---|---|---|
| **J+3 après S79** | S80 | `signup_wall_clicked` mobile, quotidien | ⚠️ **Ne rien conclure d'un volume aussi faible.** Le seul cas d'action : si le compteur est resté **exactement à zéro** alors que `signup_wall_viewed` progresse, c'est un signe que le correctif n'est pas déployé ou qu'un autre obstacle subsiste ⇒ rejouer le parcours à la main, avant de continuer le S80. |
| **J+14 après S79** | S81 | Taux de clic du mur, comptes/semaine, CTR `/spots` | **Sous 3 %** ⇒ on ouvre une reprise du tunnel **en tête du S81**, avant ses propres blocs : le S79 n'a pas suffi et c'est plus important que la mesure. **CTR `/spots` sous 6 %** ⇒ dépublier le lot 1 **immédiatement** (requête consignée au §S82 Bloc 5) — frein inchangé. |
| **J+14 après S80** | S82 | Rebond `/carte`, CTA accueil, CTA espèces | Sous les cibles ⇒ arbitrer dans le S82 : reprendre le premier écran fautif, ou l'assumer et le consigner. ⚠️ Ce relevé conditionne aussi la lecture du lot 2 : un accueil et une carte qui ne convertissent toujours pas rendent la publication de 200 pages de plus discutable. |
| **J+7 après S81** | S82 | Visiteurs PostHog vs clics GSC | Si l'écart persiste, **tous les témoins précédents sont à relire avec prudence** — y compris ceux du S79 et du S80, qui auront été relevés sur la minorité qui consent. C'est la raison pour laquelle le Bloc 1 du S81 ne se coupe jamais (§6). |
| **Publication du lot 2** | S82 | Témoin S79 **> 3 %** **et** CTR `/spots` **> 6 %** | ⚠️ **Le seul gate de démarrage qui subsiste, et il ne coûte aucune attente** : les deux relevés existent déjà à ce moment-là. Conditions non réunies ⇒ **on ne publie pas**, et le S82 se termine sur ses blocs 1, 2, 3, 6, 7. |
| **J+30 après S82** | après S83 | Fiches avec ≥ 1 prise, fondateurs actifs | Sous les cibles ⇒ la lane amorçage (Bloc 3, travail humain) continue et devient le sujet principal. Ça ne retient pas le S83, qui aura déjà tourné. |
| **Fin S83** | — | Les 5 conditions du gate mobile (§4) | Démarrage Expo, ou nouveau tour de conversion. **C'est le seul endroit de ce document où attendre est le sujet** — et il n'est pas concerné par la décision du 15/08. |

### Le risque assumé de l'enchaînement, écrit noir sur blanc

En enchaînant, on peut construire les S80 → S83 par-dessus un S79 qui a mécaniquement fonctionné
mais n'a pas changé le comportement. **C'est un risque réel et c'est un choix, pas un oubli.**
Ce qui le rend acceptable :

1. Les quatre sprints suivants ne dépendent pas du **résultat** du S79, seulement de son
   **fonctionnement** — un premier écran qui répond, une carte cadrée, une mesure honnête et des
   prises réelles valent d'être faits quel que soit le taux de clic du mur.
2. Les relevés ont lieu **quand même**, à la même date qu'avant. On ne perd pas l'information, on
   perd seulement le temps mort qui la précédait.
3. Le seul geste **irréversible** de la chaîne — publier 200 pages de plus — reste conditionné,
   et arrive après que le relevé décisif est tombé.
4. ⚠️ Ce qui ne tient que si **chaque sprint est déployé dès qu'il est vert.** C'est la
   contrepartie du §3.1, et c'est le seul point qui peut faire échouer ce plan.

---

*Rédigée le 2026-08-15. **Amendée le 2026-08-15** (décision John : enchaînement des sprints sans
attente — §1, §3.1, §7 réécrits ; les « gates de sortie » deviennent des témoins à relever, les
trois freins de sécurité sont conservés et listés au §3.1). Source des chiffres : audit
`docs/sprint-78/AUDIT-MOBILE-2026-08-15.html`, PostHog projet 208730, SQL live prod, GSC via
`docs/sprint-78/METRIQUES.md`.
Remplace, pour les sprints 79 à 83, la séquence prévue dans
`docs/roadmaps/ROADMAP-POST-AUDIT-2026-07-02.md`.*
