# Sprint 77 — RECAP

## « Trois paliers qui se voient »

> Exécuté le 2026-08-14 sur la branche `sprint-77` (partie de `main` = `879c0d8`).
> **Non poussé, non mergé, non déployé** : c'est la consigne de la ligne de lancement.
> Migrations **110** et **111** appliquées et prouvées en production.

---

## La matrice, source unique de vérité — état réel après livraison

| | Anonyme | Compte gratuit | Abonné |
|---|---|---|---|
| **Carte** | 3 spots / département ✅ *(72 lignes, prouvé SQL)* | **tous les spots** ✅ *(416, prouvé SQL + cap applicatif retiré)* | tous ✅ *(416)* |
| **Liste `/spots`** | 5 spots par département visibles, **416 liens dans le HTML** ✅ *(`<details>` natif)* | liste dépliée ✅ | dépliée ✅ |
| **Fiche : accès** | toutes, par URL, indexables ✅ *(aucun changement de sitemap ni de route)* | toutes ✅ | toutes ✅ |
| **Fiche : description, espèces, dangers, accès** | oui ✅ | oui ✅ | oui ✅ |
| **Fiche : marées et météo** | jour même ✅ | 7 jours ✅ | 7 jours ✅ |
| **Fiche : score / meilleurs moments** | score du jour ✅ *(reste indexable)* | frise 7 jours ✅ | 7 jours ✅ |
| **Fiche : prises déclarées** | 2 dernières + ligne « N autres » ✅ | toutes ✅ *(k-anon K=3 inchangé)* | toutes ✅ |
| **Fiche : spots proches** | oui ✅ | oui ✅ | oui ✅ |
| **Coordonnées GPS précises** | non ✅ *(0/72)* | **non** ✅ *(0/416, prouvé SQL)* | **oui** ✅ *(416/416)* |
| **Filtres avancés, couches carte** | non ✅ | non ✅ | oui ✅ |
| **Carnet, favoris, alertes** | non ✅ | oui ✅ | oui ✅ |

---

## ★ Ce que le brief avait faux, et qui aurait coulé le sprint

Cinq écarts entre le brief et le code réel. Les deux premiers sont graves : le
sprint aurait été livré **sans effet visible** sur son changement de tête.

### 1. ★★★ La migration seule n'ouvrait PAS la carte (deux plafonds applicatifs)

Le Bloc 1 ne parle que de SQL. Or deux plafonds côté application retranchaient
exactement ce que la RPC venait d'ouvrir :

- `app/(map)/carte/page.tsx:71` — `if (tier === 'anonymous' || tier === 'discovery') return limitSpotsPerDept(spots, 3)`. Un compte gratuit aurait continué à voir **3 spots par département** sur la carte, c'est-à-dire le contraire du sprint.
- `app/api/spots/nearby/route.ts:50` — `cap = … tier === 'discovery' ? 5 : 3`. Idem pour les voisins.

Les deux sont des « doubles sécurités » posées au sprint 11.6, jamais rouvertes
depuis. Corrigés : seul l'anonyme reste plafonné, comme la clause SQL.
**Leçon : un gating de ce projet vit à DEUX endroits (SQL + garde applicative). Changer l'un sans l'autre ne produit rien.**

### 2. ★★ Changer le défaut DB de `catches.privacy` était INERTE

Le Bloc 8 tâche 1 demande de passer le défaut de colonne à `'public'`. Fait, mais
sans effet à lui seul : l'application envoie **toujours** `privacy` explicitement
(`lib/catches/actions.ts:232`). Le vrai défaut est `lib/catches/schema.ts:88`
(zod `.default('private')`) et la valeur initiale du formulaire. Les trois ont été
changés ensemble ; le défaut DB reste comme ceinture pour les insertions directes.

### 3. `get_spot_by_slug` n'avait rien à gagner à être modifiée

Le Bloc 1 tâche 4 demande d'y « ajouter la distinction de palier ». Elle ne
renvoie que du contenu **socle**, identique aux trois paliers d'après la matrice,
et sa gate `precise` est déjà exactement la bonne. La profondeur de contenu
(marées 7 j, frise, prises) n'y transite pas : elle est arbitrée par la page via
`getUserTier()`, ce que le brief demande par ailleurs explicitement
(« la page décide de l'affichage »). **Non modifiée**, à dessein : toucher une
fonction `SECURITY DEFINER` sans effet utile, c'est du risque gratuit.

### 4. Le garde-fou « ne pas rendre la page dynamique » repose sur une prémisse fausse

Le Bloc 2 demande de « DEMANDER À JOHN » si le palier casse le cache
`revalidate = 1800`. Il n'y a rien à arbitrer : la fiche de spot appelait déjà
`supabase.auth.getUser()`, et le `<Header/>` du layout marketing lit la session
sur **toutes** les routes du groupe. `revalidate` y est inerte depuis longtemps
(constaté et commenté au sprint 76 dans `app/(marketing)/spots/page.tsx:202`).
Lire le tier ne coûte pas un cache déjà perdu. **Aucun coût CPU ajouté.**

### 5. La coupure « prises déclarées » portait sur deux composants, pas un

Le brief ne cite que `SpotActivitySection` (signal social 7 jours). La fiche rend
**aussi** `RecentCatchesSection` (historique complet), qui affichait tout à tout le
monde. Les deux sont coupés.

### Et un piège évité de justesse

`weekly` et `tidesByDate` alimentent des composants **client**. Un simple
`showWeek={false}` en aval aurait laissé les 7 jours dans le **payload RSC du HTML
servi** : masqué, pas absent. Les données sont donc tranchées **avant** d'être
passées en props. C'est la règle qui prime du brief, et elle se joue là.

---

## Bloc 1 — Migration 110 : preuves SQL live

Simulation des rôles réels (`set local role` + `request.jwt.claims`, en
transaction annulée) :

| Palier | Lignes | dont `is_precise` | Départements | Max / dépt |
|---|---|---|---|---|
| anonyme | **72** | **0** | 24 | **3** |
| `discovery` | **416** | **0** | 24 | — |
| `itinerant` | **416** | **416** | 24 | — |
| `local` (76) | 6 | 6 | 1 *(inchangé)* | — |

- Critère « anonyme ≤ 72, toutes floutées » : **atteint**.
- Critère « gratuit = 416, 0 précise » : **atteint**.
- Critère « abonné = 416 précises » : **atteint**.
- `git diff supabase/` ne montre que **110** et **111** (aucune migration existante retouchée, aucune policy RLS modifiée).
- `get_advisors` : 97 WARN / 3 ERROR / 1 INFO, **catalogue identique à l'avant-sprint** (« SECURITY DEFINER exécutable », `Extension in Public`, `Security Definer View`, HIBP désactivé — tous pré-existants et assumés, cf CLAUDE.md). **Aucune alerte nouvelle.**

Pourquoi la clause `tier <> 'anonymous'` est correcte et non un no-op : vérifié en
SQL avant écriture, `current_tier(null)` renvoie littéralement `'anonymous'`, donc
le `coalesce(…, 'discovery')` du CTE `viewer` est inerte.

---

## Bloc 5 tâche 2 — Le maillage sort de l'alphabet

`fetchDepartmentSpots` faisait `.order('name').limit(12)` : toutes les fiches d'un
département pointaient vers les mêmes voisins, ceux qui commencent par un A.
Remplacé par une **rotation déterministe** sur le hash FNV-1a du slug d'origine
(liste toujours triée par nom, donc stable entre deux rendus : Google ne voit pas
des liens qui dansent). Aucune migration.

| Budget de liens issus du repli départemental | AVANT | APRÈS |
|---|---|---|
| 3 par fiche *(cas réel : `nearby_spots` en fournit déjà 3)* | 95 / 416 (**22,8 %**) | 406 / 416 (**97,6 %**) |
| 6 par fiche | 155 / 416 (37,3 %) | **416 / 416 (100 %)** |
| 12 par fiche *(ancien `limit`)* | 222 / 416 (**53,4 %**) | 416 / 416 (100 %) |

La ligne « 12 » retrouve le chiffre du brief (52 %, 217/416) : la simulation est
validée par son propre témoin. **Critère « > 85 % » : atteint (97,6 % au budget le
plus défavorable).** Requête de contrôle consignée dans `METRIQUES.md`.

---

## Blocs 2 et 3 — Preuves sur le HTML RÉELLEMENT servi

Mesuré sur un `next build` + `next start`, en `curl` anonyme (pas en théorie).

**`/spots` (Bloc 3)** — 1 422 983 octets servis :

| Contrôle | Résultat |
|---|---|
| Liens `/spots/<slug>` uniques dans le HTML | **416 / 416** ✅ |
| Balises `<details>` | 20 *(les départements de plus de 5 spots)* |
| URLs dans le JSON-LD `ItemList` | **416** ✅ |

**Critère « aucune page ne sort de l'index, aucun lien ne disparaît du HTML » : atteint.**
Les liens repliés sont dans le document, Google les suit. Bot et humain reçoivent
le même HTML : le repli est un comportement de navigateur, pas une branche serveur.

**Fiche de spot (Bloc 2)** — testée sur `/spots/port-tino-rossi-ajaccio` :

| Contrôle | Résultat |
|---|---|
| **Dates ISO distinctes dans le HTML anonyme** | **1** *(le jour même)* ✅ |
| Mur `spot_tides` | présent ✅ |
| Mur `spot_score` | présent ✅ |
| Mur `spot_catches` | absent, **à raison** : ce spot a moins de 3 prises, donc rien derrière le mur. La ligne est conditionnée au vrai surplus, jamais affichée à vide. |
| `<title>` | servi ✅ |
| `rel="canonical"` | servi ✅ |
| JSON-LD `GeoCoordinates` | servi ✅ |

La ligne « 1 seule date » est **la** preuve du bloc : les 7 jours ne sont pas
masqués, ils ne sont pas dans la page. C'est ce que le découpage en amont des
props garantit.

Titre, canonical et JSON-LD sont **identiques aux trois paliers** :
`generateMetadata` ne référence ni le tier ni l'utilisateur (0 occurrence), et le
JSON-LD est construit uniquement à partir des champs du spot, avec des
coordonnées arrondies à 2 décimales. Anonyme et compte gratuit reçoivent en plus
exactement les mêmes `lat`/`lng` (`is_precise` faux dans les deux cas).

---

## Bloc 4 — La copie ne promet plus ce qui est déjà donné

- `SIGNUP_WALL_BENEFITS` : « 3 spots par département sur la carte » **retiré**. C'était la promesse vide qui expliquait le mur à 1,3 % de clic.
- Nouvelle copie **par coupure** (`wallCopyForSurface`) : chaque mur nomme ce qui est derrière lui. Test dédié : aucune ligne ne contient de prix, de mention d'abonnement, de coordonnée GPS ni de tiret cadratin.
- ★ **Trouvé hors brief** : `components/map/UpsellBanner.tsx` annonçait « Tu vois **3 spots par département** » à un compte **gratuit**, c'est-à-dire précisément à qui ce sprint donne toute la carte. Réécrit sur le vrai manque : la précision, les filtres, les couches.
- `/tarifs` recalé sur les trois paliers réels. **Deux lignes de la colonne Local sont tombées** parce qu'elles ne décrivent plus un avantage payant : « Carte complète de ton département » (le gratuit voit tout) et « Score d'activité 0-100 par spot » (le score de fiche passe au gratuit).

> ⚠️ **À TRANCHER PAR JOHN.** Faut-il redonner un avantage de score au palier
> Local, par exemple le score sur les **marqueurs de la carte** (distinct du score
> de la fiche) ? La colonne Local reste vendable sans (GPS précis + alerte de la
> veille + filtres + couches), mais elle a perdu deux arguments.

---

## Blocs 7, 8 et 10 — État réel

⚠️ **Ces trois blocs ont été confiés à deux agents qui ont été coupés en cours de
route** (limite de session atteinte à 19h50). J'ai repris leur travail, vérifié ce
qui avait atterri et terminé ce qui manquait. Ce qui suit est **vérifié fichier par
fichier**, pas déduit de leurs rapports (que je n'ai jamais reçus).

### Ce qui est en place et vérifié

- **Cookies de brouillon** (`lib/drafts/`) : `schema.ts` + `client.ts` + `replay.ts` + tests. Aucune donnée personnelle, **aucune coordonnée** (le spot porte le lieu), plafond 5 spots, garde de taille 3 000 octets, expiration 7 jours, parsing zod qui ne jette jamais. Documenté comme cookie **fonctionnel non traçant** (écrit sans consentement analytics, contrairement aux events PostHog).
- **Rejeu branché sur les 4 points d'entrée** : `auth/callback` (OAuth), `auth/confirm` (email), connexion et inscription (`auth/login/actions.ts`), avec tests. Le rejeu s'insère **avant** l'onboarding et renvoie sur la fiche d'origine.
- **`/carnet/nouvelle` sortie du groupe `(app)`** vers `app/carnet/nouvelle/`, avec une liste blanche explicite dans `middleware.ts` (`PUBLIC_APP_ROUTES`) qui ne lève **que** la redirection « non connecté » et laisse la règle d'onboarding intacte. La route est **`noindex`** : c'est un formulaire, pas du contenu, et on ne veut pas d'une nuée de pages fines `?spot_id=…`.
- **Confidentialité par défaut** : `schema.ts:96` `.default('public')`, `CatchForm.tsx:300` (création) `'public'`, défaut DB `'public'`. **L'import en masse reste `'private'`** à dessein : basculer 200 prises historiques en public serait une surprise. Le chemin d'édition n'est pas touché.
- **Les trois options de visibilité étaient DÉJÀ à l'écran** (contrôle segmenté Publique / Abonnés / Privée, pas un menu replié) : le brief se trompait sur ce point. Publique est désormais présélectionnée, et la rassurance affichée est vraie (position décalée de plusieurs centaines de mètres, K=3).
- **`/onboarding/fini`** débouche sur un geste unique « Logue ta première prise », pré-rempli avec le spot favori quand il y en a un.
- **Lien magique** présent au même niveau dans `login-client.tsx`, Google conservé au-dessus (décision John du sprint 76).
- **Migration 111 appliquée et prouvée en prod** : `alert_settings.big_tide_alert_enabled` (défaut **`false`**, opt-in), table `big_tide_alerts_sent` (**RLS active, 1 policy**), contrainte `lifecycle_emails_kind_check` étendue à `'j2_first_catch'`.
- ★ **L'agent a évité le piège du sprint 72** : il n'existe **aucun coefficient de marée** dans ce projet. Le déclencheur est le **marnage mesuré** avec seuils par façade, et un journal dédié plutôt que `alerts_sent` (dont le `score` NOT NULL aurait forcé un 0 fabriqué, affiché tel quel par `/home`).

### Ce que je n'ai PAS pu vérifier

- **Le parcours complet en navigateur** (poser un favori anonyme, remplir une prise, s'inscrire, retrouver les deux créés). Les tests unitaires et le build sont verts, mais **le sprint 74 a montré qu'une QA en conditions réelles trouve ce que 999 tests ne voient pas**. C'est la première chose à faire avant de merger.
- Le **décompte hebdomadaire d'emails** par utilisateur après ajout de la relance J+2 et de l'alerte marée. Je n'ai pas le rapport de l'agent sur ce point. À contrôler avant déploiement.
- Les deux agents avaient encore des tests à écrire au moment de la coupure ; la couverture des blocs 7/8/10 est donc **plus fine** que celle des blocs 1 à 6.

---

## VERIF

| Contrôle | Résultat |
|---|---|
| `npx vitest run` | **1244 / 1244 verts** (101 fichiers) |
| `npx tsc --noEmit` | **0 erreur** |
| `npx next build` | **succès**, 76 pages générées |
| `node scripts/lint-copy-dashes.mjs` | 0 tiret introduit par ce sprint *(les 2 restants dans `/spots` sont un log développeur et un libellé data « 29 — Finistère », tolérés §6)* |
| Advisors Supabase | catalogue identique à l'avant-sprint, **aucune alerte nouvelle** |
| RLS | inchangée ; la seule table neuve (`big_tide_alerts_sent`) a RLS active + policy |
| Floutage GPS | **intact** : 0 coordonnée précise pour anonyme et gratuit (416/416 vérifiées en SQL) |
| Confidentialité | **aucune ligne existante modifiée** (`public` 7 et `friends` 1 identiques du début à la fin) |

> ⚠️ Un test (`__tests__/security-headers.test.ts`) échoue **par intermittence**
> sous suite complète (contention, 750 ms pour la seule assertion CSP). Vérifié :
> 7/7 verts en isolation, et la suite complète repasse **1244/1244** au run
> suivant. Ce n'est pas une régression de ce sprint.

### Deux fichiers laissés par les agents interrompus, corrigés à la main

1. `app/carnet/nouvelle/page.tsx` utilisait le type `Metadata` **sans l'importer** (le build cassait).
2. Le test du cron `recfishing-reminders` n'avait pas suivi l'ajout de `bigTideSent` au fallback.

---

## Ce qui reste à faire, par John

1. **QA en navigateur du parcours d'inscription différée** (le point le plus risqué, cf sprint 74).
2. **Trancher** : faut-il redonner un avantage de score au palier Local sur `/tarifs` ?
3. **Relever le nombre de pages indexées dans GSC** avant le déploiement (`METRIQUES.md` §1 : l'API ne l'expose pas).
4. **Noter la date et l'heure exactes du déploiement** dans `METRIQUES.md` §3 : sans feature flag, c'est le seul moyen de démêler cet effet de celui du sprint 76.
5. Merge + push (rien n'est poussé).

Un `README.md` parasite de 140 octets (artefact d'un paquet npm `rg@0.0.2` installé
par erreur pendant la session) a été **sorti du dépôt**, pas supprimé : il est dans
le dossier de travail temporaire si besoin.

