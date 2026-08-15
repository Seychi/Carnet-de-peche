# Sprint 78 — RECAP (en cours)

> Exécuté le 2026-08-15 sur `main`. **Rien n'est poussé.**
> Migration **112** appliquée et prouvée en production.
> 1293 tests verts, `tsc` sans erreur, build de production vert.

---

## Préalable — les trois gestes de délivrabilité

Décision John : **la confirmation d'email reste désactivée.** C'est défendable,
l'exiger viderait de son sens l'inscription différée du sprint 77 (un brouillon
rejoué dans un compte inutilisable tant qu'on n'a pas ouvert sa boîte n'a aucun
intérêt). Mais ça **déplace** le problème au lieu de le régler : des adresses
invalides continueront d'entrer en base, et le sprint 77 vient d'ajouter deux flux
d'emails qui vont leur écrire.

La protection est donc passée côté envoi.

| Geste | État |
|---|---|
| **Migration 112 `email_suppressions`** | ✅ appliquée en prod, **RLS active, 0 policy** (service-role seul, même discipline que `season_results`) |
| **Webhook Resend signé** | ✅ `/api/resend/webhook`, signature Svix vérifiée à la main (pas de dépendance ajoutée), fenêtre anti-rejeu de 5 min |
| **Garde à l'envoi** | ✅ dans `getEmailRecipient`, le point de passage unique : webhooks Stripe, crons et actions y passent tous |
| **Contrôle MX à l'inscription** | ✅ `lib/auth/email-domain.ts` |
| **SMTP Resend côté Supabase** | ⚠️ **reste à faire par John** (tableau de bord, je n'y ai pas accès). C'est le geste qui règle réellement les indésirables. |
| **SPF + `rua` DMARC** | ⚠️ **reste à faire par John** (DNS) |

Trois décisions de conception qui méritent d'être connues :

1. **On ne coupe que sur un rebond PERMANENT.** `email.bounced` couvre aussi les
   rebonds passagers (boîte pleine). Couper quelqu'un parce que sa boîte était
   pleine un mardi serait une perte sèche. Test dédié.
2. **La garde vaut aussi pour le transactionnel.** L'enjeu n'est pas le
   consentement (un rebond n'est pas un choix de l'utilisateur) mais la réputation
   du domaine : continuer d'écrire à une boîte morte dégrade la délivrabilité de
   tout le reste, alerte de marnage comprise.
3. **Le contrôle MX échoue OUVERT.** Un DNS lent, en panne ou une réponse
   inattendue laisse passer, et il y a une borne de 2 s. Le coût d'un faux négatif
   (une adresse morte de plus) est sans commune mesure avec celui d'un faux positif
   (un vrai pêcheur qu'on refuse). Les fournisseurs courants ne déclenchent aucune
   requête DNS du tout.

`RESEND_WEBHOOK_SECRET` est **optionnel même en prod**, à dessein : l'endpoint doit
pouvoir être déployé avant d'être déclaré côté Resend. Sans secret il répond 500 et
rien d'autre ne casse. À passer en requis une fois branché.

---

## Base réelle après suppression des comptes de test

| Repère | Valeur (2026-08-15) |
|---|---|
| Comptes | **45** *(dont 1 compte de test résiduel du 09/08)* |
| Prises | **27** — `public` 7 · `private` 19 · `friends` 1 |
| Spots avec ≥ 1 prise publique | **2 / 416 (0,5 %)** |
| Spots approuvés / en attente / rejetés | **416 / 4 018 / 171** |

⚠️ Deux corrections par rapport au brief :

- **« 3 spots avec une prise publique » → 2.** Le troisième était le spot de la
  prise de test, parti avec le compte. La base du Bloc 5 est donc **0,5 %**.
- Le total de comptes n'a pas baissé malgré 2 suppressions : **3 inscriptions
  réelles** sont arrivées entre-temps.

### Le chiffre qui résume le sprint

**Les 6 derniers comptes créés ont, à eux tous, zéro prise loguée.** Cinq sur six
ont fini l'onboarding. Le point de chute n'est pas l'inscription, il est juste
après, et c'est exactement ce que le Bloc 1 corrige. Ces six comptes sont le témoin
à surveiller.

---

## Bloc 1 — Les quatre correctifs

| # | Défaut | Correctif |
|---|---|---|
| 1 | Les 3 CTA d'une fiche pointaient vers `/auth/login`, **zéro lien vers `/carnet/nouvelle` dans le HTML servi** | `ctaHref` mène désormais au formulaire pour les deux paliers |
| 2 | Le champ date naissait **invalide** : `value` réécrite en heure locale par React, `max` figée en UTC par le serveur ⇒ soumission refusée par le navigateur, dans toute la France, toute l'année | `max` n'est plus rendu côté serveur, il est posé après montage |
| 3 | Le bandeau de consentement recouvrait le CTA collant à **83 %** et le rendait inatteignable au doigt | Le bandeau publie sa hauteur mesurée, les barres collantes s'y adossent |
| 4 | `/auth/register` oubliait le brouillon | Il nomme la prise, le spot et le nombre de favoris |

**Sur le défaut 2, la leçon compte autant que le correctif** : React traite `value`
comme une propriété contrôlée (réécrite après montage) et `max` comme un attribut
(figé au rendu serveur). Le `suppressHydrationWarning` posé au sprint 59 ne couvrait
que `value`. Le défaut datait du sprint 53 mais dormait, parce que la route
s'atteignait par navigation client ; **le sprint 77 en a fait une entrée par URL
rendue par le serveur et l'a réveillé.**

**Sur le défaut 1, la leçon d'audit est à retenir pour les briefs suivants** : le
critère du sprint 77 était « la route répond 200 », c'est-à-dire une DESTINATION.
Il faut prouver le CHEMIN (« il existe un lien cliquable vers X dans le HTML
servi »), sinon on valide une porte qui n'a pas de poignée.

---

## §2.3 — La promesse fausse, cherchée cette fois systématiquement

Au sprint 77 j'avais corrigé `UpsellBanner` et `/tarifs` en me félicitant d'avoir
trouvé le premier hors brief, et j'étais passé à côté du reste. Cette fois la
promesse a été cherchée par motif sur tout le dépôt.

**7 surfaces trouvées, dont 4 que l'audit ne listait pas :**

| Surface | Ce qui était faux |
|---|---|
| Page d'accueil | « 3 spots/dépt » au gratuit **et** « carte complète » vendue comme avantage Local |
| Relance d'abonnement | vantait la carte complète et le score à qui les a gratuitement |
| **CGU** *(contractuel)* | décrivait comme payante une prestation devenue gratuite |
| En-tête `/tarifs` ★ | « tu paies pour la carte complète et le score » |
| `emails/welcome-trial` ★ | idem |
| `emails/payment-success` ★ | idem |
| `emails/post-trial-winback` ★ | idem |

★ = hors audit.

⚠️ **Constat qui dépasse la copie : le score n'est plus gaté du tout.** Ni sur la
fiche (matrice du sprint 77), ni sur la carte (`fetchScores` ne filtre pas le
palier). Il n'est donc plus un argument payant nulle part, et je l'ai retiré des
quatre colonnes de vente. **À trancher par John** : soit on l'assume comme gratuit,
soit on regate le score des marqueurs de carte pour redonner de la matière à Local.

---

## Bloc 4 — `/especes`

### ★ Le sprint 77 n'avait pas produit son effet, et voici pourquoi

L'audit disait que sur `/especes/bar` les spots nommés arrivent après la FAQ. Le
code, lui, place `SpeciesTopSpots` juste après le hero depuis le sprint 77. J'ai
tranché sur la production plutôt que sur le code :

| Section | Offset dans le HTML servi |
|---|---|
| Réglementation | 14 624 |
| FAQ | 44 207 |
| Autres espèces | 46 790 |
| **OÙ PÊCHER BAR** | **160 169** *(dernier du document)* |

**Cause : la frontière `<Suspense>`.** Elle émet son contenu à la FIN du flux, et
c'est le client qui le remet en place. L'humain voyait le bloc au bon endroit, le
document servi non. Or la page est **entièrement statique**
(`generateStaticParams` + `revalidate = 86400` + `dynamicParams = false`) : le
Suspense n'achetait aucune latence, il ne coûtait que l'ordre du document.

Suspense retiré, le composant est rendu en ligne. **C'est la même famille de piège
que le sprint 77** (les props d'un composant client finissent dans le payload RSC) :
ce que le serveur ÉMET compte plus que ce que le JSX suggère.

### Ce qui reste

⚠️ **Tâche 1 non faite, faute de données.** Le brief demande « les 5 à 8 pages
suivantes **par impressions** ». Je n'ai pas accès à GSC et je ne vais pas inventer
un classement. **Donne-moi l'export des impressions par page `/especes/*`** et je
les traite dans la foulée : la méthode est déjà écrite et testée
(`seoTitle` / `seoDescription` dans `lib/especes/content/*.ts`).

---

## Bloc 2 — L'usine à fiches, tournée À BLANC

**Aucune fiche n'a été publiée.** Le brief l'interdit tant que le taux de 503 n'est
pas connu (Bloc 0, qui est ton travail), et cette contrainte est respectée.

### Le livrable du bloc : combien passent la porte

Porte appliquée aux 4 018 spots en attente :

| Résultat | Nombre | Part |
|---|---|---|
| **Passent la porte** | **2 905** | **72,3 %** |
| Rejet : type de poste non identifié | 1 113 | 27,7 % |
| Rejet : coordonnées invalides | **0** | 0 % |
| Rejet : doublon à moins de 150 m | **0** | 0 % |

Le **seul** motif de rejet est l'absence de type de poste. Les 2 905 éligibles se
répartissent en plage (1 669), pointe rocheuse (767), cale (223), digue (222),
passe (23), estuaire (1).

### ★ La détection de doublons contredit le brief

Le brief pose que « 4 018 imports OSM contiennent forcément des quasi-doublons » et
demande de consigner le nombre. Mesuré :

| Seuil | Spots en attente concernés |
|---|---|
| 150 m d'un spot approuvé | **0** |
| 500 m | 290 |
| 2 km | 1 423 |
| Doublons internes à 150 m | **1** |

La distance minimale entre un spot en attente et un spot approuvé est **exactement
150 m** : une passe de curation antérieure a déjà appliqué ce seuil, et c'est ce que
sont les 171 rejetés. **Le vrai sujet n'est donc pas la détection mais le choix du
seuil** : 150 m est faible pour une plage, où deux points distants de 300 m peuvent
désigner le même poste. ⚠️ À trancher : garder 150 m, ou monter à 500 m et écarter
290 fiches de plus.

### Le générateur

`lib/spots/fiche-generator.ts`, fonctions **pures**, 18 tests.

⚠️ **L'invariant du module : il n'invente aucun fait.** Il ne dit jamais qu'un
poisson a été pris ici ni qu'une espèce y est présente. Il décrit le **poste**, la
**façade** et la **saison**, et il écrit noir sur blanc « aucune prise n'a encore
été déclarée ici ». Les espèces sont annoncées comme **plausibles pour ce type de
poste**, avec la mention explicite « pas un relevé de prises ». Trois tests
verrouillent ça.

Longueur produite : **789 à 883 caractères** sur les 12 combinaisons poste × façade
(seuil du brief : 400), 3 à 4 espèces par fiche.

**Garde-fou du Bloc 3 déjà en place** : une fiche méditerranéenne ne parle jamais de
coefficient de marée. Elle dit que le marnage y est négligeable et bascule sur le
vent, l'état de la mer et la lumière. Testé dans les deux sens.

### Priorisation Méditerranée (Bloc 3)

| Dépt | Approuvés | Éligibles à la porte |
|---|---|---|
| 83 Var | 11 | **334** |
| 2A Corse-du-Sud | 9 | 213 |
| 13 Bouches-du-Rhône | 11 | 154 |
| 06 Alpes-Maritimes | 9 | 121 |
| 2B Haute-Corse | 9 | 98 |
| 66 · 34 · 11 · 30 | 31 | 160 |

**1 080 fiches éligibles en Méditerranée pour 80 publiées.** Le Var seul vaut plus
qu'un lot entier.

### ★ Lot 1 PUBLIÉ (décision John du 15/08)

John a tranché : on publie sans attendre le passage en Vercel Pro, qui suivra dans
quelques jours. Le garde-fou du brief (« ne pas publier avant de connaître le taux
de 503 ») est donc **levé sur sa décision**, prise en connaissance du risque.
Cadence retenue : lots de 200, Méditerranée d'abord. Seuil de doublon : **500 m**.

**Lot `S78-MED-01`, publié le 2026-08-15 :**

| Contrôle | Résultat |
|---|---|
| Fiches publiées | **191** |
| Descriptions distinctes | **191 / 191** (zéro doublon de contenu) |
| Longueur | 761 à 883 caractères (seuil : 400) |
| Champs manquants | **0** |
| **Fiches curées historiques touchées** | **0** (les 416 sont intactes) |
| Total approuvé | 416 → **607** |
| **Part Méditerranée** | **19 % → 44,6 %** (cible du Bloc 3 : > 35 %, **atteinte dès le lot 1**) |

Dépublication d'un lot, en une requête :

```sql
update public.spots set moderation_status='pending' where generation_batch='S78-MED-01';
```

### ★★ Deux défauts de qualité trouvés APRÈS publication, et corrigés

Le lot est parti à 200 fiches. Le contrôle post-publication en a retiré **9** :

1. **6 fiches portaient une étiquette OSM, pas un nom** : « Accès plage »,
   « Mise à l'eau », « mise à l'eau plaisance ». Une page intitulée « Accès plage »
   ne veut rien dire pour un pêcheur et ne peut ranker que sur du bruit. Pire,
   plusieurs points OSM distants de plusieurs kilomètres portent le même libellé
   générique et produisaient donc un contenu **strictement identique**.
2. **3 paires de vraies homonymes** (« Le Clapotis », « Le Petit Travers »,
   « Plage de la Vieille Nouvelle ») produisaient deux fiches jumelles qui se
   cannibalisent. Un exemplaire de chaque paire a été dépublié.

**La porte de qualité a été durcie en conséquence** (`nom_generique`), avec des
tests qui refusent les libellés génériques mais acceptent un nom qualifié comme
« Mise à l'Eau du Vidourle ». Le lot 2 ne peut plus reproduire ça.

⚠️ **Leçon** : mes tests d'origine cherchaient des mensonges (« cette fiche
affirme-t-elle quelque chose de faux ? ») et pas de la **lisibilité**. Deux autres
défauts du même genre étaient passés au travers avant publication et n'ont été vus
qu'en lisant la sortie réelle : « dans les Bouches-du-Rhône (Bouches-du-Rhône) » et
« se prête à au sar ». Sur 2 900 pages, une tournure bancale répétée est le signal
le plus clair possible que le contenu est fabriqué. Des tests de lisibilité ont été
ajoutés.

⚠️ **Troisième défaut, attrapé juste avant l'écriture** : trois de mes clés de
dangers (`maree_montante`, `courant_fort`, `vase`) **n'existaient pas** dans
`HAZARDS_LABELS`. Les 200 fiches auraient affiché la clé brute à l'écran. Un test
vérifie désormais que **toute** clé produite (danger, technique, espèce) a un
libellé.

### Ce qui reste

- **Lots 2 et suivants** : ~2 700 fiches éligibles restantes, à publier après
  7 jours d'observation, en réutilisant la même requête (consignée ci-dessus).
- **Pas de relecture humaine des 20 fiches** tirées au hasard : c'est un critère
  d'acceptation qui demande un humain, pas moi. Le générateur est prêt à produire
  l'échantillon quand tu veux.
- La colonne « fiche générée » en base (pour dépublier un lot en une requête)
  viendra avec la migration de publication, pas avant : je ne crée pas de schéma
  pour une fonctionnalité qu'on n'exécute pas encore.

---

## Reste à faire, par John

1. **Bloc 0, entièrement de ton côté** : 301 apex → www, relevé des 503 dans GSC,
   arbitrage Vercel Pro, SMTP Resend, SPF + `rua` DMARC. **Le Bloc 2 est gaté
   dessus.**
2. **Déclarer le webhook Resend** (`https://www.carnet-de-peche.com/api/resend/webhook`,
   événements `email.bounced` et `email.complained`) et poser `RESEND_WEBHOOK_SECRET`
   dans Vercel.
3. **Trancher le score** : gratuit assumé, ou regaté sur les marqueurs de carte ?
4. **Trancher le seuil de doublon** : 150 m ou 500 m ?
5. **M'envoyer l'export GSC** des impressions par page `/especes/*` pour finir le Bloc 4.
6. Rien n'est poussé : merge et push quand tu veux.
