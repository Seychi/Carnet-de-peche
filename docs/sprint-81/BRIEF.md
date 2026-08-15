# Sprint 81 — Brief d'exécution
## La mesure honnête

> Rédigé le **2026-08-15**, après le RECAP du sprint 80. Durée cible : **1 semaine**.
> Contexte : `docs/roadmaps/ROADMAP-CONVERSION-2026-08-15.md` (§S81 **et §3.1**),
> `docs/sprint-80/RECAP.md` et `docs/sprint-79/RECAP.md` (à lire en premier, dans cet ordre),
> `docs/sprint-78/AUDIT-MOBILE-2026-08-15.html` §5, `docs/sprint-76/research/attribution.md`.
> **Décisions John du 2026-08-15, toujours en vigueur** : le score reste gratuit et n'est regaté
> nulle part · la phase mobile Expo reste gatée derrière le §4 de la roadmap · **les sprints
> s'enchaînent sans attente** (§3.1), un sprint démarre sur la preuve mécanique du précédent.

---

## ⛔ Préalable bloquant — lire avant toute chose

### 1. Ce sprint part de `main` APRÈS le sprint 80

Le S80 touche `components/consent/CookieBanner.tsx` (Bloc 5, cibles tactiles) et
`app/globals.css`. Ce brief touche les deux. Un fichier partagé, une règle : partir de l'état
post-merge, jamais d'avant.

| Fichier | Ce que le S80 y a fait | Ce que le S81 y fait |
|---|---|---|
| `components/consent/CookieBanner.tsx` | `min-h-11` sur « Refuser » / « Accepter », `py-2` sur « En savoir plus » | **Blocs 1 et 2** : affichage conditionnel du bandeau, `set_config` au refus |
| `components/analytics/PostHogProvider.tsx` | rien | **Bloc 1** : le mode de capture |
| `app/globals.css` | tailles de cibles tactiles | **Bloc 2** : rien à retirer — voir le garde-fou du Bloc 2 |
| `lib/analytics.ts` | rien | **Bloc 4** : un événement manquant |

> **Consigne** : `git log --oneline -15`, `docs/sprint-80/RECAP.md` existe, ses critères sont
> cochés. ⚠️ **Vérifier que le S80 est déployé**, pas seulement mergé — la moitié de ce sprint
> se mesure en production. La vérité est HEAD de `main` et la prod, jamais la ligne de statut
> d'un RECAP (leçon du S78, redite au S79 et au S80).

### 2. La relecture juridique du Bloc 1 — les trois cas

Le Bloc 1 est le seul de toute la roadmap dont le blocage n'est ni technique ni calendaire.
Le RECAP du S80 demandait de la lancer **pendant** le S80.

- **Avis rendu et favorable** → le Bloc 1 se code et se déploie dans ce sprint.
- **Avis pas encore rendu** → ⚠️ **le Bloc 1 se code quand même, et ne se déploie pas.** Il part
  derrière `NEXT_PUBLIC_ANALYTICS_COOKIELESS` (drapeau d'environnement, absent = comportement
  actuel à l'identique). Le RECAP dit noir sur blanc que le drapeau est off et pourquoi.
  ⚠️ **Le Bloc 2 dépend du Bloc 1 et glisse avec lui** : sans comptage sans cookie, faire
  disparaître le bandeau ferait perdre *toute* mesure, pas 170 px.
- **Avis défavorable** → ⚠️ **DEMANDER À JOHN.** Blocs 1 et 2 abandonnés, le sprint se réduit
  aux Blocs 3, 4, 5, 6 — et la roadmap doit être reprise, parce que sa condition n° 4 du gate
  mobile (« visiteurs PostHog > 70 % des clics GSC ») devient inatteignable par construction.

### 3. ★ Deux choses que la roadmap tient pour acquises, et qui ne tiennent pas

Vérifiées dans le code et les dates avant l'écriture de ce brief. **Ne pas les propager.**

#### 3a. « Le correctif d'attribution du S76 n'a pas réglé le fond » — non démontré

La roadmap (§S81 Bloc 3) et l'audit (§5) concluent à l'échec du correctif du S76 à partir des
**44,9 % d'auto-référencement** mesurés sur la fenêtre **16/07 → 14/08**.

Or :

| Fait | Source |
|---|---|
| `lib/analytics/attribution.ts` et `components/analytics/PostHogProvider.tsx` datent du **2026-08-14** | `stat` sur les deux fichiers |
| Le RECAP du S76 dit, le **14/08** : « **Non poussé, non mergé** » | `docs/sprint-76/RECAP.md`, ligne 3 |
| La fenêtre de mesure de l'audit court du **16/07 au 14/08** | `AUDIT-MOBILE-2026-08-15.html` §5 |

**La fenêtre est donc quasi intégralement antérieure au correctif.** Les 44,9 % mesurent le
comportement d'AVANT. On ne peut rien conclure sur l'efficacité du correctif à partir d'eux.

⇒ **Le Bloc 3 commence par une re-mesure sur une fenêtre postérieure au déploiement du S76.**
Si le taux est retombé, le bloc est clos en une heure et son budget va au Bloc 5. C'est la
troisième fois d'affilée qu'un brief de cette série pose une cause fausse : le S79 en a corrigé
cinq sur six, le S80 a démonté un « défaut » qui était un faux positif de `display: none`.

#### 3b. Le critère de sortie « visiteurs PostHog > 70 % des clics GSC » devient trompeur

En mode sans cookie, PostHog dérive l'identifiant d'un hachage
`hash(team_id, sel_du_jour, ip, user_agent, hostname)`, et **le sel change tous les jours**.
Conséquence documentée : *« les utilisateurs qui ne consentent pas apparaissent comme des
personnes différentes chaque jour »*.

Sur une fenêtre de 30 jours, un visiteur qui revient cinq fois compte donc jusqu'à cinq
personnes. **Le critère passerait mécaniquement, sans rien prouver.** Pire : il passerait
d'autant plus facilement que la mesure est mauvaise.

⇒ **Le témoin de ce sprint est redéfini au Bloc 0**, sur une base immunisée contre la rotation
du sel. ⚠️ **DEMANDER À JOHN** en fin de sprint s'il veut que la roadmap soit amendée en
conséquence (§S81 et §4 condition n° 4).

---

## 🚀 Ligne de lancement (à copier-coller par John)

> ultracode — effort xhigh. Exécute `docs/sprint-81/BRIEF.md`. Commence par le préalable
> bloquant, Bloc 0 compris : le S80 doit être déployé et sa preuve mécanique rejouée. Lance
> ensuite les workstreams A, B, C, D et E en parallèle, et termine par le workstream VERIF.
> ⚠️ Le Bloc 1 touche au consentement : lis son garde-fou avant d'écrire une ligne, et ne
> déploie rien de ce bloc sans mon feu vert explicite. Ce brief conteste deux affirmations de
> la roadmap au §3 du préalable : vérifie-les toi-même plutôt que de me croire. Ne push pas.

---

## 🧠 Connecteurs & sous-agents (usage systématique — cf `CLAUDE.md` §20)

| Quand | Sous-agent → connecteur | Pourquoi |
|---|---|---|
| **Bloc 1, avant d'écrire une ligne** | **docs-researcher** → Context7 | `posthog-js` est en **`^1.393.0`** (`package.json:46`). L'option `cookieless_mode` (`'always'` / `'on_reject'`) est récente : **vérifier qu'elle existe dans la version installée**, ce qu'elle fait exactement du `distinct_id`, et son interaction avec `opt_out_capturing_by_default` et `person_profiles`. Ne pas coder ça de mémoire — c'est un réglage de conformité, pas un réglage de confort. |
| **Blocs 0, 3, 4 — les chiffres** | PostHog (requêtes HogQL) | Chaque relevé de ce sprint se fait par requête datée et **consignée dans le RECAP**, pas par capture d'écran d'un tableau de bord. Le §3a montre ce que coûte un chiffre dont on a perdu la fenêtre. |
| **Bloc 5 — LCP** | **deploy-watch** → Vercel + Sentry | Les trois pages hors clous se re-mesurent en production, pas en local. Un LCP local sur une machine de dev ne veut rien dire. |
| **Bloc 6 — la colonne `department`** | **supabase-guard** → Supabase | ⚠️ Compter AVANT d'écrire. C'est la seule écriture en base de tout le sprint. |
| **Tous les blocs visuels** | **qa-chrome** → Claude in Chrome + Playwright | 390 × 664, fr-FR, Europe/Paris. Le Bloc 2 se juge à la capture du viewport. |
| **Clôture** | **`/verif-sprint`** | Tests + build + lint + types + revue croisée indépendante + passe anti-régression. |

---

## Objectif du sprint en une phrase

Voir enfin les deux tiers de visiteurs qui échappent à PostHog, sans capter une donnée de plus
qu'aujourd'hui — et récupérer au passage les ~170 px de bas d'écran que le bandeau occupe sur
chaque page mobile du site.

---

## Le chiffre qui commande ce sprint

**427 visiteurs vus dans PostHog sur 30 jours, contre ~1 495 clics Google sur la même fenêtre.**
On pilote une roadmap de conversion sur **~29 % du réel**, et sur la fraction la plus engagée du
public : celle qui a cliqué « Accepter ». Le taux de rebond de 19,6 % et la session de 5 min 54 s
ne sont pas les chiffres du site, ce sont les chiffres de ses visiteurs les plus patients.

Tant que c'est vrai, **tous les témoins de cette roadmap se lisent avec une réserve** — y compris
ceux du S79 et du S80, relevés sur ce même quart de trafic. C'est la raison pour laquelle le §6
de la roadmap interdit de couper le Bloc 1, quel que soit l'ordre de sacrifice.

---

## Workstreams & dépendances

| WS | Bloc(s) | Durée | Dépend de | Parallèle jour 1 |
|----|---------|-------|-----------|------------------|
| **—** | Bloc 0 — preuve mécanique du S80 + relevés qui tombent maintenant | 0,5 j | S80 déployé | ❌ **bloque tout le reste** |
| **A** | Bloc 1 — le comptage sans cookie | 2 j | Bloc 0 | ✅ |
| **B** | Bloc 2 — le bandeau qui disparaît | 0,5 j | **A** (dépendance dure) | ❌ |
| **C** | Bloc 3 — l'auto-référencement | 0,5 j *(re-mesure)* → 1 j *(si le défaut persiste)* | Bloc 0 | ✅ |
| **D** | Bloc 4 — le tableau de bord du funnel | 0,5 j | Bloc 0 | ✅ |
| **E** | Bloc 5 — les trois LCP hors clous | 1,5 j | Bloc 0 | ✅ |
| **F** | Bloc 6 — la colonne qui ment | 0,5 j | Bloc 0 | ✅ |
| **VERIF** | Revue finale | 0,5 j | tous | ❌ toujours en dernier |

---

## Bloc 0 — La preuve mécanique du S80, et les relevés qui tombent pendant ce sprint

Ce sprint est celui où **le témoin du S79 arrive à échéance** (§3.1 et §7 de la roadmap). C'est
le premier relevé de toute la série qui veut dire quelque chose.

> **Connecteurs** : **qa-chrome** pour rejouer le S80 ; PostHog pour les relevés.

### Tâches

1. **La preuve mécanique du S80**, en 390 × 664, sans cookie de consentement, **en production** :
   - `/spots/pointe-des-chats-groix` et `/spots/digue-d-amphise-osm1125927239` : la bande de
     conditions est visible **sans scroll** ;
   - `/carte` : des marqueurs sont visibles **en Méditerranée et sur l'Atlantique** dans le même
     écran ;
   - `/` : **zéro requête `api.maptiler.com` annulée** (`ERR_ABORTED`) ;
   - `/especes/bar` : les liens de spots font au moins 44 px de haut.

   Un échec ⇒ **s'arrêter et le dire à John.** C'est le seul cas d'arrêt du sprint.

2. ★ **Le relevé J+14 du S79**, le vrai. `signup_wall_clicked / signup_wall_viewed` sur mobile,
   fenêtre = du déploiement du S79 (15/08 ~14h05) à aujourd'hui, **en indiquant le nombre de
   jours**. Base : **0,83 %**. Cible : **> 3 %**.
   - **Au-dessus de 3 %** → on le consigne et on continue.
   - **En dessous** → ⚠️ **ce n'est pas un motif d'arrêt** (§3.1), c'est un motif de **reprise en
     tête de ce sprint** : avant les Blocs 3 à 6, comprendre pourquoi, et le dire à John avec ce
     qu'on a trouvé. Le tunnel prime sur la mesure.
   - ⚠️ **Si la fenêtre fait moins de 10 jours au moment où tu lis ceci**, dis-le et ne conclus
     pas : le volume quotidien de ce site est trop faible pour qu'une fenêtre courte signifie
     quoi que ce soit (2 clics sur 242 en 90 jours). Le RECAP du S80 est tombé dans ce cas et l'a
     écrit honnêtement — faire pareil.

3. **Le CTR `/spots`**, à J+7 et J+14 du S79 comme du S80. ⚠️ **Sous 6 %, c'est le seul frein non
   dégaté de la roadmap** : on revient en arrière sur le Bloc 1 du S80, puis on dépublie le lot 1
   (`update public.spots set moderation_status='pending' where generation_batch='S78-MED-01';`).

4. ★ **Redéfinir le témoin de ce sprint** (cf préalable §3b). Le critère « visiteurs PostHog
   > 70 % des clics GSC » ne survit pas à la rotation quotidienne du sel. Le remplacer par une
   base immunisée, et l'écrire dans le RECAP :

   > **Pages vues d'ENTRÉE dont `$referring_domain` contient `google`, sur 7 jours pleins**,
   > comparées aux **clics GSC des mêmes 7 jours**. Cible : **> 70 %**.

   Un clic Google **est** un chargement de page : la comparaison est de même nature des deux
   côtés, et un visiteur qui revient trois fois compte trois clics dans GSC comme trois entrées
   dans PostHog. **Relever la valeur d'avant le Bloc 1 sur cette définition**, sinon il n'y aura
   rien à quoi comparer après.

5. **Captures « avant »** en 390 × 664, bandeau visible : `/`, `/carte`,
   `/spots/pointe-des-chats-groix`. Elles servent au Bloc 2.

### Critères d'acceptation

- Les quatre preuves mécaniques du S80 sont rejouées **en production** et cochées avec preuve.
- Le relevé J+14 du S79 est consigné **avec sa fenêtre en jours**, et son interprétation
  explicitée (ou son abstention justifiée).
- Le témoin redéfini du point 4 a une **valeur d'avant** consignée, avec la requête qui l'a
  produite.
- Les trois captures « avant » existent dans `docs/sprint-81/`.

---

## Bloc 1 — Le comptage sans cookie pour les anonymes

C'est le bloc qui décide de la lisibilité de tout le reste de la roadmap. C'est aussi le seul du
sprint qui touche à la conformité. **On ne l'improvise pas.**

### L'état exact du code aujourd'hui

`components/analytics/PostHogProvider.tsx:35-44` :

```ts
posthog.init(key, {
  api_host: process.env.NEXT_PUBLIC_POSTHOG_HOST || 'https://eu.i.posthog.com',
  person_profiles: 'identified_only',
  capture_pageview: false,
  capture_pageleave: true,
  opt_out_capturing_by_default: true,   // ← rien n'est capturé avant « Accepter »
  disable_session_recording: true,
  autocapture: false,
})
```

Puis, lignes 46-49 : si le cookie `cdp-analytics-consent` vaut `granted`, `opt_in_capturing()`.

Le consentement vit dans `lib/consent.ts` : cookie **première partie**, `SameSite=Lax`,
**180 jours**. Le bandeau (`components/consent/CookieBanner.tsx:70-106`) écrit ce cookie, appelle
`opt_in_capturing()` ou `opt_out_capturing()`, et au refus pose déjà
`posthog.set_config({ persistence: 'memory' })` (ligne 100).

**Ce qui est donc déjà acquis, et qu'il ne faut ni refaire ni casser** : hébergement **EU**
(`eu.i.posthog.com`), **pas de session replay**, **pas d'autocapture**, **pas de profil pour les
anonymes** (`identified_only`), aucune PII dans les événements (invariant écrit en tête de
`lib/analytics.ts`), et l'attribution d'entrée du S76 qui **n'émet rien** avant consentement.

### Ce qui change

PostHog expose un mode sans cookie de premier ordre, `cookieless_mode`, avec deux valeurs :
`'always'` et `'on_reject'`. L'identifiant devient un hachage calculé côté serveur,
`hash(team_id, sel_du_jour, ip, user_agent, hostname)`, **le sel changeant chaque jour et étant
détruit après traitement**. Rien n'est écrit dans le navigateur : ni cookie, ni `localStorage`,
ni `sessionStorage`.

> **Connecteurs — obligatoire.** **docs-researcher** (Context7) sur `posthog-js` **avant
> d'écrire** : l'option existe-t-elle en `^1.393.0` ? Que devient `opt_out_capturing_by_default`
> quand `cookieless_mode` est posé ? `'on_reject'` couvre-t-il le visiteur qui **n'a pas encore
> répondu**, ou seulement celui qui a **refusé** ? Cette dernière question décide de la forme du
> correctif : **ne pas la trancher par déduction.**

### Ce que ça coûte, à dire dans le RECAP plutôt qu'à découvrir dans six semaines

| Effet | Conséquence ici |
|---|---|
| Le sel tourne chaque jour ⇒ un visiteur non consentant compte comme une personne **par jour** | **Le nombre de « personnes » sur 30 j devient ininterprétable.** D'où le témoin redéfini au Bloc 0. |
| Collisions de hachage possibles (même IP + même navigateur) | Deux pêcheurs sur le même réseau peuvent se confondre. Acceptable pour de l'audience, pas pour du nominatif — on ne fait pas de nominatif. |
| Pas d'enrichissement GeoIP | ⚠️ **Vérifier qu'aucun tableau de bord existant ne s'appuie sur le pays ou la région.** |
| Session replay et sondages indisponibles sans consentement | **Sans effet** : `disable_session_recording: true` depuis le S26, et aucun sondage. |
| Mise en cache des feature flags perdue | **Sans effet** : `grep` sur `isFeatureEnabled|getFeatureFlag|useFeatureFlag` dans `app/`, `components/`, `lib/`, `hooks/` ⇒ **aucune occurrence**. Le projet n'utilise pas les drapeaux PostHog. |

### La question de conformité, posée précisément pour le juriste

La CNIL exempte de consentement certains traceurs de **mesure d'audience**, sous conditions.
D'après sa page dédiée : finalité **strictement limitée** à la mesure d'audience (performance,
détection de problèmes de navigation, optimisation technique, dimensionnement serveur) ; **pas de
recoupement** avec d'autres traitements ni de transmission de données non anonymisées à des
tiers ; **pas de suivi de la navigation d'un site à l'autre** avec un identifiant commun ; durée
de vie du traceur **≤ 13 mois** non prorogée, conservation des données **≤ 25 mois**.
⚠️ **Il n'existe aucune liste officielle de solutions exemptées** : la CNIL fournit un outil
d'auto-évaluation, l'éditeur s'auto-déclare, et l'auto-évaluation « ne préjuge pas » de son
contrôle. **La responsabilité reste sur le responsable de traitement, c'est-à-dire nous.**

**Les trois questions à poser au juriste, formulées :**

1. Le mode sans cookie tel que décrit — aucun stockage navigateur, identifiant = hachage
   journalier détruit après traitement — sort-il du champ de l'article 82 (accès/inscription
   d'informations dans le terminal) ?
2. Nos événements ne sont pas que de l'audience : `signup_wall_viewed`, `paywall_viewed`,
   `catch_log_started`… relèvent de l'analyse de **parcours produit**. **Cette finalité entre-t-elle
   dans l'exemption**, ou faut-il séparer « audience sans consentement » et « produit avec
   consentement » ?
3. La combinaison IP + user-agent dans un hachage : acceptable telle que décrite, ou faut-il une
   garantie supplémentaire côté configuration du projet PostHog ?

⚠️ **Ces trois points sont à faire trancher, pas à trancher.** Un agent qui décide seul qu'une
configuration est licite fait du droit sans mandat.

### Tâches

1. **docs-researcher d'abord.** Ancrer l'API réelle de la version installée. Si `cookieless_mode`
   n'existe pas en `^1.393.0`, deux voies : monter la version (⚠️ **DEMANDER À JOHN**, c'est une
   dépendance de production), ou retomber sur `persistence: 'memory'` + `opt_in_capturing()` —
   **en documentant que ce n'est pas équivalent** (memory génère un identifiant neuf à chaque
   **chargement de page**, pas à chaque jour, et la navigation client-side d'App Router en
   conserve un seul par chargement).
2. **Trois états de consentement, pas deux.** Aujourd'hui le cookie vaut `granted`, `denied` ou
   `null`, et `null` se comporte comme `denied` (rien n'est capturé). Après ce bloc :
   - `granted` → comportement actuel, identification comprise ;
   - `denied` **et** `null` → **capture sans cookie**, sans identifiant persistant, sans profil.
   `lib/consent.ts` n'a pas besoin de changer : c'est sa lecture dans le provider qui change.
3. **Le drapeau de déploiement.** `NEXT_PUBLIC_ANALYTICS_COOKIELESS` : absent ou `'0'` ⇒
   comportement **strictement actuel**. C'est ce qui permet de livrer le code sans attendre
   l'avis juridique (préalable §2), et de revenir en arrière sans redéploiement de code.
4. **Ne jamais identifier un anonyme.** `analytics.identify()` (`lib/analytics.ts:126-130`) n'est
   appelé que pour un compte. Vérifier que le mode sans cookie ne crée **aucun** profil personne :
   `person_profiles: 'identified_only'` reste tel quel, et un test le verrouille.
5. **La bascule au consentement.** Un visiteur compté sans cookie qui clique ensuite
   « Accepter » : que devient sa session ? Le `$pageview` de la page de consentement est déjà
   émis par `CookieBanner.tsx:83-86`. Vérifier qu'on ne produit pas **deux** pageviews pour la
   même page, l'un sans cookie et l'autre après opt-in. ⚠️ Un doublon ici fausserait le témoin
   du Bloc 0 dans le sens flatteur.
6. **La page `/legal/confidentialite` suit** (`app/(marketing)/legal/confidentialite/page.tsx`).
   Décrire ce qui est réellement fait : mesure d'audience sans cookie ni identifiant persistant
   pour qui n'a pas consenti, identification seulement après consentement, hébergement EU,
   durées de conservation. ⚠️ **La page doit être exacte avant que le drapeau passe à `1`**, pas
   après.

### Critères d'acceptation

- **Sans aucun cookie de consentement**, en 390 × 664 : un chargement de `/` produit un
  `$pageview` visible dans PostHog **sous 5 minutes**, et `document.cookie` **ne contient aucune
  clé `ph_*`**, `localStorage` et `sessionStorage` non plus (hors `cdp-entry-attribution`, qui
  est du stockage première partie sans émission, invariant du S76).
- Après **« Refuser »** : idem — la mesure d'audience continue, sans stockage.
- Après **« Accepter »** : comportement d'aujourd'hui, identification comprise, et **un seul**
  `$pageview` pour la page de consentement.
- **Aucun profil personne** n'est créé pour un visiteur anonyme : vérifiable dans PostHog.
- Drapeau absent ⇒ **diff de comportement nul** : mêmes requêtes réseau, mêmes cookies qu'avant
  le sprint. Preuve par comparaison réseau.
- `/legal/confidentialite` décrit exactement le dispositif retenu.

### Garde-fous

- ⚠️ **DEMANDER À JOHN AVANT tout déploiement de ce bloc.** C'est un arbitrage juridique, pas
  technique. Le drapeau existe précisément pour que la question de John soit « on l'allume ? » et
  pas « on le code ? ».
- ⚠️ **Ne jamais capter de donnée identifiante sans consentement.** Pas de profil, pas d'`identify`,
  pas d'email, pas de pseudo, pas de coordonnée. L'invariant en tête de `lib/analytics.ts` est le
  contrat.
- Ne pas toucher : le gating de tier, `lib/gating/wall.ts`, les RPC, les policies RLS. **Aucune
  migration dans ce bloc.**
- Ne pas retirer `opt_out_capturing_by_default` sans le remplacer par un mécanisme au moins aussi
  strict pour le mode identifié. **Le consentement ne recule pas, c'est son périmètre qui change.**

---

## Bloc 2 — Le bandeau qui disparaît, et les pixels rendus

Si le Bloc 1 passe, le bandeau n'a plus à s'afficher par défaut : il ne sert plus qu'à **activer
l'identification**, pas à autoriser la mesure. Il devient un réglage, pas un péage.

**Ce que ça rend** : le S79 a mesuré `--consent-banner-height` à **168 px** en 390 px. ⚠️ **Le S80
a posé `min-h-11` sur « Refuser » et « Accepter »** (`CookieBanner.tsx:134, 142`) : le bandeau est
donc **plus haut qu'au moment de cette mesure**. **Re-mesurer, ne pas recopier 168.**

> ### ★ Ce que ce bloc débloque vraiment
> La cause racine du défaut n° 1 du S79 — le bandeau qui recouvrait 92 % du CTA de `/carte` —
> **disparaît**. Et la réserve honnête du RECAP du S80 (Bloc 3 : « avec le bandeau **et** la barre
> d'inscription, les deux overlays occupent ~440 px des 664, le sud-est passe derrière ») tombe
> avec elle : le cadrage Méditerranée + Atlantique devient enfin lisible dès le premier écran.

> **Connecteurs** : **qa-chrome**, 390 × 664, captures avant/après du Bloc 0.

### Tâches

1. Le bandeau ne s'affiche plus au premier chargement quand le drapeau du Bloc 1 est actif.
   `CookieBanner.tsx:63-68` (`setShow(readConsent() === null)`) est le point unique à faire
   évoluer.
2. **Un accès permanent au réglage reste obligatoire**, et il doit être trouvable : un lien
   « Mesure d'audience » dans le pied de page, menant à `/legal/confidentialite` où le choix se
   fait et se change (accepter l'identification, ou refuser). ⚠️ **Un dispositif qu'on ne peut
   plus refuser n'est pas un dispositif exempté** — c'est aussi ce que le juriste regardera.
3. ⚠️ **Ne rien retirer du mécanisme d'empilement.** `--consent-banner-height`,
   `data-consent-pending`, `.sticky-bottom-bar`, `.map-fab-stack`, `useBottomBarHeight` : tout
   reste. Le bandeau réapparaît pour qui va le régler, et le jour où un autre élément fixe
   arrivera en bas d'écran, le contrat sera encore là. **Ceinture et bretelles**, comme le dit la
   roadmap.
4. Vérifier les deux états de mise en page sur les quatre surfaces du S80 (`/`, `/carte`,
   `/spots/[slug]`, `/especes/bar`) : **avec** bandeau et **sans**. Le S80 a travaillé son premier
   écran en supposant le bandeau présent ; il ne doit pas laisser un trou de 170 px une fois le
   bandeau parti.

### Critères d'acceptation

- Drapeau actif, aucun cookie : **aucun bandeau** au chargement, sur les quatre surfaces.
- La hauteur rendue au bas de l'écran est mesurée **avant et après**, et le gain est chiffré dans
  le RECAP (capture à l'appui). Attendu : **> 165 px**.
- Le réglage reste atteignable en **deux clics au plus** depuis n'importe quelle page, et permet
  de revenir en arrière dans les deux sens.
- Drapeau inactif : le bandeau s'affiche **exactement comme avant**, empilement compris — le test
  `components/map/__tests__/bottom-stack.test.ts` du S79 reste vert.
- Aucune des quatre surfaces ne présente d'espace vide là où était le bandeau.

### Garde-fous

- ⚠️ **Ce bloc ne se déploie jamais sans le Bloc 1.** Un bandeau retiré sans comptage sans cookie,
  c'est la mesure qui passe de 29 % à 0 %.
- Ne pas toucher aux règles d'empilement de `app/globals.css` (§3 ci-dessus).

---

## Bloc 3 — L'auto-référencement : re-mesurer d'abord, diagnostiquer ensuite

⚠️ **Lire le préalable §3a avant ce bloc.** Le correctif du S76 date du 14/08 et le RECAP du S76
le dit non poussé ce jour-là ; la fenêtre 16/07 → 14/08 qui produit les 44,9 % est donc
antérieure au correctif. **La prémisse de ce bloc n'est pas établie.**

> **Connecteurs** : PostHog. Ce bloc est d'abord une requête, pas un correctif.

### Tâches

1. **Établir la date de mise en production du correctif du S76** (git + Vercel), et la consigner.
2. **Re-mesurer sur une fenêtre qui commence après cette date** : part des visiteurs mobiles dont
   `$referring_domain` vaut `www.carnet-de-peche.com`. Base d'avant : **44,9 %**. Cible : **< 10 %**.
3. **Si le taux est retombé** : le bloc est **clos**. L'écrire dans le RECAP avec les deux
   fenêtres en regard, corriger l'affirmation de la roadmap, et **verser le temps restant au
   Bloc 5**. C'est le résultat le plus probable, et ce serait une bonne nouvelle.
4. **Si le taux persiste**, alors seulement, chercher — et **chercher à réfuter avant de
   corriger**. L'hypothèse la plus consistante avec le code, à traiter comme une hypothèse :

   > `PostHogProvider.tsx:92` mémorise `firstCaptureDone` dans un `useRef`, c'est-à-dire **par
   > montage de page**. L'attribution d'entrée n'est donc rattachée qu'au **premier `$pageview`
   > d'un chargement**. Or PostHog fait tourner sa **session** sur inactivité (~30 min par
   > défaut). Un pêcheur qui lit une fiche 35 minutes puis clique repart dans une **session
   > neuve**, dont le référent est lu sur `document.referrer` — c'est-à-dire **nous**. Le
   > correctif du S76 couvre le premier `$pageview` d'un chargement, pas le premier d'une
   > session.

   **Comment la réfuter** : si elle est vraie, les événements auto-référencés portent un
   `$session_id` **différent** de celui du premier événement du même `distinct_id`, et l'écart de
   temps entre les deux dépasse le seuil d'inactivité. Si les auto-référencements tombent sur le
   **premier** événement d'une session, l'hypothèse est fausse et il faut chercher ailleurs.
5. **La seconde piste de la roadmap** : les **16 visiteurs qui passent encore par l'apex**
   (4,0 %). Le 308 apex → www est en place depuis le S78. Vérifier s'ils viennent de liens
   externes anciens, de favoris, ou d'une chaîne de redirection qui perd le référent.
6. **Si l'hypothèse 4 se confirme** : rattacher l'attribution d'entrée à **chaque nouvelle
   session** plutôt qu'à chaque montage — `sessionStorage` la conserve déjà pour l'onglet
   (`lib/analytics/attribution.ts`, clé `cdp-entry-attribution`), il n'y a rien de plus à
   stocker, seulement une condition à changer.

### Critères d'acceptation

- La date de production du correctif du S76 est établie et consignée.
- Le taux est re-mesuré sur une fenêtre **postérieure**, avec la requête consignée.
- **Soit** le bloc est clos avec preuve, **soit** une cause est démontrée (pas supposée) et
  corrigée, et le taux visé est **< 10 %**.
- Aucun stockage supplémentaire côté navigateur. L'invariant du S76 — ce module **n'émet rien** —
  tient.

---

## Bloc 4 — Le funnel dans un tableau de bord, et l'événement qui manque

Sans ça, chaque revue de sprint coûte une heure de requêtes reconstruites de mémoire, et deux
personnes ne mesurent jamais la même chose. C'est aussi ce qui rend le §7 de la roadmap tenable.

> **Connecteurs** : PostHog. Les noms d'événements sont dans `lib/analytics.ts` — **les lire, ne
> pas les deviner** : `signup_wall_viewed` et `paywall_viewed` sont **délibérément distincts**
> depuis le S75 (l'un = anonyme, l'autre = inscrit gratuit), et les confondre casserait la
> lecture de toute la roadmap.

### Tâches

1. **Un tableau de bord unique**, six étapes :
   `$pageview` → `signup_wall_viewed` → `signup_wall_clicked` → `signup_completed` →
   `onboarding_finished` → `catch_log_completed`.
   Segmenté **mobile / desktop** via `$device_type` — qui existe enfin sur les événements serveur
   depuis le S79 Bloc 0 (`lib/analytics/server.ts`, `lib/analytics/user-agent.ts`).
2. **Les témoins de chaque sprint de la roadmap**, sur le même tableau de bord, avec leur base et
   leur cible : `signup_wall_clicked / viewed` (S79) · `home_cta_clicked`,
   `species_page_cta_clicked`, rebond `/carte` (S80) · le témoin redéfini au Bloc 0 (S81) ·
   fiches avec ≥ 1 prise (S82) · `upsell_clicked / paywall_viewed` et abonnés (S83).
3. ⚠️ **Segmenter par état de consentement.** Après le Bloc 1, le tableau de bord mélange des
   visiteurs comptés sans cookie et des visiteurs identifiés. Une étape de funnel qui exige un
   identifiant stable **sur plusieurs jours** ne sera fiable que pour les seconds. **Le dire dans
   le tableau de bord lui-même**, sous forme de note, pas seulement dans le RECAP : c'est là que
   la question se posera dans six semaines.
4. **`catch_log_abandoned` sur mobile** — reste du S79 Bloc 4 tâche 5, explicitement non fait
   faute de budget de session. L'événement n'apparaît qu'en Desktop sur 90 jours : soit il ne se
   déclenche pas sur mobile, soit il perd sa propriété. **Les deux cas sont un bug.** Diagnostiquer
   (`analytics.catchLogAbandoned`, `lib/analytics.ts:33-35`, et son appelant dans
   `components/catches/CatchForm.tsx`) et corriger.
5. **Consigner les requêtes** qui produisent chaque témoin dans `docs/sprint-81/METRIQUES.md`,
   sur le modèle de `docs/sprint-78/METRIQUES.md`. Un témoin sans sa requête est un chiffre qu'on
   ne saura pas reproduire — c'est exactement ce qui a rendu le §3a de ce brief nécessaire.

### Critères d'acceptation

- Le tableau de bord existe, les six étapes retournent une valeur, le filtre mobile/desktop
  fonctionne sur **toutes** les étapes — y compris `signup_completed`, ce qui était impossible
  avant le S79.
- `catch_log_abandoned` se déclenche en émulation mobile et porte `$device_type = "Mobile"`.
- `docs/sprint-81/METRIQUES.md` contient chaque témoin, sa requête, sa fenêtre et sa base.
- La note sur la fiabilité des étapes multi-jours en mode sans cookie est visible **dans** le
  tableau de bord.

---

## Bloc 5 — Les trois LCP hors clous

Les temps de chargement du site sont globalement bons — LCP p75 mobile entre 300 et 540 ms sur la
plupart des pages. **Trois exceptions**, mesurées le 15/08 :

| Page | LCP p75 mobile | Pourquoi ça compte |
|---|---|---|
| `/spots/pointe-du-guern-telgruc` | **7 232 ms** | Seule page classée « poor ». 9 autres fiches, toutes bretonnes, sont entre 2,5 et 3,7 s |
| `/onboarding/1` | **3 708 ms** | **Au pire endroit possible** : la première étape après l'inscription, sur un site dont le point de chute est juste après le compte |
| `/home` | 2 793 ms | Écran d'accueil du connecté |

> ### ⚠️ Deux avertissements avant de toucher quoi que ce soit
> **1. Ces chiffres viennent des visiteurs consentants**, c'est-à-dire ~29 % du trafic, et
> probablement les plus patients. Après le Bloc 1, la population mesurée change. **Relever la
> base AVANT le déploiement du Bloc 1**, sinon l'avant et l'après ne seront pas comparables — et
> le dire dans le RECAP.
> **2. Ce brief ne donne aucune cause, à dessein.** Le S79 a démonté cinq diagnostics sur six, le
> S80 en a démonté un de plus. Ce qui suit est une liste de **pistes à réfuter**, pas de causes.
> Reproduire d'abord, en production, en 390 × 664.

> **Connecteurs** : **deploy-watch** (Vercel + Sentry) pour la mesure réelle ; **qa-chrome** pour
> le profil de chargement ; **docs-researcher** si tu touches au streaming Next 15.

### Pistes, à confirmer ou à écarter

- **`/onboarding/1`** : `app/(app)/onboarding/[step]/onboarding-step.tsx` fait **25 890 octets**
  de composant, pour un `loading.tsx` de 1 380 octets. Une page qui stream derrière un
  `loading.tsx` déplace le LCP vers le contenu réel — c'est exactement le mécanisme que le S79 a
  démonté sur `/carnet/nouvelle` (le `redirect()` serveur qui dégénère en saut client). **Même
  famille, même méthode d'analyse.**
- **`/spots/pointe-du-guern-telgruc`** : commencer par vérifier que la page est toujours à 7 s
  **après le S80** — le Bloc 1 du S80 a resserré le hero des fiches et n'a ajouté aucune requête,
  ça a pu bouger dans un sens comme dans l'autre. Les 9 autres fiches lentes étant **toutes
  bretonnes**, chercher ce qu'elles ont en commun (densité de spots proches, mini-carte, données
  de marée) plutôt qu'un défaut propre à celle-ci.
- **`/home`** : cockpit du connecté, plusieurs sections de données. Regarder ce qui est au-dessus
  de la pliure et ce qui bloque le rendu.

### Tâches

1. Reproduire les trois LCP **en production**, en 390 × 664, et identifier **quel élément** est le
   LCP sur chacune. Sans ça, on optimise à l'aveugle.
2. Corriger, en visant `/onboarding/1` **en premier** : c'est celle dont l'impact produit est le
   plus direct.
3. ⚠️ **Ne pas dégrader les deux pages que la roadmap protège** : `/spots/[slug]` (12 894
   impressions/mois) et `/` — le S80 vient d'y travailler, leurs LCP sont un critère de son
   VERIF.

### Critères d'acceptation

- LCP p75 mobile de `/onboarding/1` **< 2 500 ms**, mesuré en production à J+3.
- `/spots/pointe-du-guern-telgruc` **sort de « poor »** (< 4 000 ms), ou une explication
  documentée de pourquoi c'est hors de portée dans ce sprint.
- `/`, `/carte` et `/spots/[slug]` **ne se dégradent pas** : relevé avant/après.
- La base d'avant-Bloc-1 est consignée, avec sa population de mesure.

---

## Bloc 6 — La colonne qui ment

L'audit du 15/08 relève, et personne ne l'a repris depuis : la colonne `spots.department`
contient des valeurs **avec une espace finale** (`"34 "`, `"2A "`). Dans un sprint intitulé « la
mesure honnête », une clé de regroupement qui se dédouble en silence a sa place.

**Ce que ça casse potentiellement** : les filtres par département de `/carte` et `/spots`, les
agrégats par façade, le calcul de la part Méditerranée (**44,6 %**, témoin du Bloc 3 du S78), et
les landings `/spots?dept=` qui sont dans le sitemap.

> **Connecteurs** : **supabase-guard**. ⚠️ **Compter avant d'écrire.**

### Tâches

1. **Mesurer d'abord** :
   ```sql
   select department, count(*) from public.spots
   where department <> btrim(department) group by department order by 2 desc;
   ```
   Puis vérifier si `"34"` **et** `"34 "` coexistent — c'est ce cas-là qui casse un agrégat.
2. **Chercher la source.** Import OSM, script de curation, générateur de fiches du S78 ? Corriger
   à la source, sinon la prochaine vague réintroduit le défaut. C'est la leçon du §2.3 du S78 :
   chercher par motif sur tout le dépôt, pas seulement là où on a déjà regardé.
3. **Vérifier le code de comparaison** : tout `department === '34'` ou `.eq('department', dept)`
   échoue silencieusement sur `"34 "`. `lib/geo/departments.ts` porte la liste canonique des
   24 départements côtiers : **c'est la référence**.
4. **Une migration numérotée** (`supabase/migrations/NNN_*.sql`) qui nettoie l'existant
   (`btrim`) et **empêche la récidive** — contrainte `check` ou normalisation à l'écriture.
   ⚠️ **DEMANDER À JOHN AVANT d'exécuter en production** : c'est la seule écriture en base du
   sprint. Le fichier s'écrit, l'application attend son feu vert.
5. Régénérer `lib/types.ts` si le schéma change (il ne devrait pas : c'est de la donnée).

### Critères d'acceptation

- Le nombre de lignes affectées est consigné **avant** correction.
- Après correction : `select count(*) from public.spots where department <> btrim(department)`
  renvoie **0**.
- La part Méditerranée est **recalculée** après nettoyage et comparée à 44,6 % — si elle bouge,
  c'est que le défaut faussait bien un témoin de la roadmap, et il faut le dire.
- Un test refuse une valeur non normalisée à l'écriture.
- **Aucune policy RLS, aucune RPC touchée.** Floutage GPS et k-anon K=3 intacts.

---

## Ce que ce sprint ne fait PAS, et où ça part

Écrit ici pour que personne ne le « rattrape » au passage et fasse déborder une semaine.

| Sujet | Pourquoi pas ici | Destination |
|---|---|---|
| **Alléger `/spots`** (1,98 Mo, 7 739 nœuds, TTFB 748 ms) | C'est le vrai levier d'indexation, et c'est un chantier à part entière. L'ajouter à ce sprint ferait sauter la semaine | **Lane contenu/SEO** (roadmap §5). ⚠️ **DEMANDER À JOHN** s'il veut en faire un sprint dédié : c'est ce qui commande les ~10 URL/jour de découverte, donc l'indexation des 2 700 fiches restantes |
| **Cadrage de `SpotMiniMap`** sur les 5 types de poste | Reste du S80 Bloc 1 tâche 6. Visuel, pas mesure | **S82**, avec le travail sur les fiches |
| **Test automatisé des cibles 44 px** | Reste du S80 Bloc 5. Demande Playwright (`e2e/`), pas Vitest — l'environnement de test du dépôt est `node` et ne mesure aucun rectangle | **`e2e/`**, au prochain sprint qui y touche |
| **Données structurées sur `/carte` et `/fil`** | Relevé de l'audit §6, jamais repris. SEO, pas mesure | **Lane contenu/SEO** |

---

## Workstream VERIF (obligatoire, agent indépendant qui n'a pas écrit le code)

1. **`/verif-sprint`** : `pnpm test` + `pnpm build` + `pnpm typecheck` + `pnpm lint`, revue croisée
   indépendante, passe anti-régression. Puis **deploy-watch** après déploiement.
2. Relire **chaque** critère d'acceptation et cocher ✅ / ❌ **avec preuve** (commande, requête,
   URL, capture).
3. ★ **Passe consentement — la plus importante du sprint.** En 390 × 664, dans cet ordre, et pour
   **chacun** des deux états du drapeau :
   - navigateur vierge → charger `/` → inventorier `document.cookie`, `localStorage`,
     `sessionStorage` → **aucune clé `ph_*`** quand le drapeau est actif ;
   - « Refuser » → même inventaire, plus : la mesure d'audience continue-t-elle ?
   - « Accepter » → identification présente, **un seul** `$pageview` pour la page du clic ;
   - revenir en arrière depuis `/legal/confidentialite`, dans les deux sens.

   **Drapeau inactif : le comportement doit être identique à celui d'avant le sprint, au réseau
   près.** C'est la preuve qu'on peut livrer sans déployer.
4. **Passe anti-régression S79 + S80** : rejouer intégralement la preuve mécanique du Bloc 0. Les
   correctifs des deux sprints précédents doivent tenir, bandeau retiré compris — ⚠️ le S79 Bloc 1
   et le S80 Bloc 3 ont tous deux été conçus **avec** le bandeau à l'écran.
5. **Passe sécurité** : aucune RPC ni policy modifiée ; floutage GPS, k-anon K=3, gating de tier
   des coordonnées précises intacts ; aucun secret commité ; la seule migration autorisée est
   celle du Bloc 6, et seulement après le feu vert de John.
6. **Passe témoin** : le CTR `/spots` n'est pas affecté. Aucun changement de ce sprint ne devrait
   toucher au rendu de `/spots` — **le vérifier plutôt que le supposer.**
7. **Passe copie** : tutoiement, aucun tiret cadratin dans la copie visible
   (`node scripts/lint-copy-dashes.mjs`), et la page `/legal/confidentialite` décrit le dispositif
   **réellement déployé**, pas celui qui est codé.
8. Livrer `docs/sprint-81/RECAP.md` et `docs/sprint-81/METRIQUES.md` : fait / comment tester /
   reste manuel John. ⚠️ **Dater toute ligne de statut** (« non poussé au 15/08 à 14h ») — c'est
   la troisième fois que ce rappel figure dans un brief de cette série, et le §3a de celui-ci
   montre ce que coûte un chiffre dont on a perdu la fenêtre.

---

## Reste manuel John (post-sprint)

1. ⚠️ **Le feu vert du Bloc 1.** Rien ne se déploie sur le consentement sans ton mot. Le code
   arrive derrière un drapeau : la question est « on l'allume ? », pas « on le code ? ».
2. ⚠️ **Le feu vert du Bloc 6**, l'unique écriture en base du sprint.
3. **Merger et déployer tout de suite**, puis enchaîner le S82. C'est la contrepartie du §3.1 :
   un sprint non déployé ne produit aucun témoin.
4. **Relevé J+7 du témoin redéfini** (Bloc 0, point 4) : entrées Google dans PostHog vs clics GSC,
   même fenêtre. Cible **> 70 %**. Il tombera **pendant le S82**.
5. ⚠️ **Surveiller le CTR `/spots` à J+7 et J+14.** Sous 6 %, on revient en arrière sur le Bloc 1
   du S80, puis on dépublie le lot 1. **Seul frein non dégaté de la roadmap.**
6. **Trancher l'amendement de la roadmap** (préalable §3b) : le critère « visiteurs PostHog > 70 %
   des clics GSC » du §S81 **et** la condition n° 4 du gate mobile §4 reposent tous deux sur un
   décompte de personnes que le mode sans cookie rend ininterprétable. Je peux les réécrire sur la
   définition du Bloc 0 dès que tu le dis.
7. **Export GSC des impressions par page `/especes/*`** — la lane contenu est bloquée dessus
   **depuis le sprint 78**, et le S80 vient de rendre `/especes/bar` utilisable au doigt. C'est
   maintenant le plus vieux point ouvert de la série.
8. **Préparer le S82** : son Bloc 3 (amorçage, 20 fondateurs actifs, 100 prises) est **quatre
   semaines de travail humain**, pas du code. Si tu veux qu'il ait produit son effet à la fin de
   la chaîne, **il se lance maintenant**, en parallèle de ce sprint.

---

*Rédigé le 2026-08-15, après `docs/sprint-80/RECAP.md`. Les faits de code cités (chemins, lignes,
versions, absence de feature flags, tailles de fichiers) ont été relevés dans le dépôt le
2026-08-15 ; les faits PostHog et CNIL viennent de leurs documentations publiques à cette date,
et sont à re-vérifier via **docs-researcher** avant d'écrire du code qui en dépend.*
