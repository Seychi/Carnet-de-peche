# Sprint correction de bugs — brief du 15/08/2026

Audit mené sur la production (`www.carnet-de-peche.com`), déploiement `dpl_BcBbukqekR33zjT3CL5MMNvLh5Cm`
(sprint 81). Sources : pilotage navigateur du parcours anonyme, base Supabase en lecture, advisors
Supabase, logs runtime Vercel, web vitals et error tracking PostHog.

**Non couvert** : le parcours connecté en navigateur. L'extension Chrome s'est déconnectée avant que
je puisse le jouer. Tout ce qui concerne le compte ci-dessous vient de la base et du SQL des RPC, pas
d'un écran vu. C'est signalé au cas par cas.

---

## P0 — les trois à corriger en premier

### 1. La couleur du marqueur ment sur la condition

Le plus grave, et il n'était pas dans le signalement.

La pastille est colorée d'après **`day_score`**, alors que la légende et le panneau de la fiche
parlent de **`current_quality`**. Les deux se contredisent sur des spots réels.

Mesure sur 21 spots scorés visibles, couleur relevée dans le DOM puis croisée avec la base :

| couleur pastille | `day_score` | `current_quality` en base |
|---|---|---|
| olive `rgb(188,175,111)` | 82 → 92 | `bonne` ×12, **`faible` ×2** |
| gris `rgb(125,124,120)` | 64 → 73 | `moyenne` ×4, `faible` ×3 |

Deux spots sont dessinés en olive, la couleur que la légende nomme **« Très Bonne »**, alors que leur
`current_quality` vaut `faible` et leur `current_score` vaut **0**. La carte annonce « très bon » sur
un spot que le site lui-même juge faible à cet instant.

Corollaire : la base contient `bonne` 103, `moyenne` 69, `faible` 41, `tres_bonne` 4,
`exceptionnelle` 0 sur 208 spots scorés, mais **la carte n'affiche jamais que 2 des 5 couleurs de la
légende**. Ni le jaune « Exceptionnelle » `rgb(254,232,56)` ni les bleus « Moyenne » et « Faible »
n'apparaissent nulle part.

**Correctif** — trancher une sémantique unique, c'est une décision produit avant d'être du code :

- soit la pastille passe sur `current_quality`, et la carte dit la même chose que la fiche ;
- soit elle reste sur `day_score`, et la légende comme le panneau disent explicitement « qualité de la
  journée », avec les 5 seuils alignés sur ceux réellement utilisés.

Aujourd'hui les deux sémantiques coexistent sans que rien ne le signale au pêcheur.

### 2. Les spots importés ne sont jamais scorés *(bug signalé)*

Ce n'est pas un défaut d'affichage, c'est la requête de scoring. `get_spots_for_scoring()` se termine
par :

```sql
and s.source in ('curated', 'community')
```

| contrôle | valeur |
|---|---|
| lignes dans `spot_scores` | 217 pour 4 605 spots |
| spots `imported` avec un score | **0 sur 4 387** |
| spots publiés (`approved` + `public`) sans score | **399 sur 607, soit 66 %** |
| marqueurs sans couleur, vue anonyme | 26 sur 72, soit 36 % |

Faute de ligne dans `spot_scores`, la carte retombe sur la couleur neutre `#B7C2C9`. La condition
affichée au clic est calculée à la volée (météo / marée), d'où l'incohérence exacte que tu décrivais :
la donnée existe, elle n'atteint simplement jamais le marqueur.

**Correctif** : retirer le filtre sur `source`, garder `moderation_status = 'approved'` et
`visibility = 'public'`. Le lot passe de 208 à 607 spots.

À faire **avant** de lancer : fiabiliser le cron (cf. P1 point 6, il laisse déjà 9 scores périmés sur
208), puis vérifier le quota Open-Meteo et la durée du job une fois le volume triplé.

### 3. Le retour depuis une fiche spot recharge toute la carte *(bug signalé)*

Reproduit en anonyme : carte zoomée → clic sur un marqueur → « Voir le spot complet » → retour.
Résultat : **0 marqueur**, puis la carte revient au cadrage France par défaut. Le zoom est perdu, et
le compteur du panneau affiche « 72 spots » pendant que la carte est vide.

Deux causes, la seconde documentée par une capture :

- le retour refait un chargement complet de `/carte` au lieu d'une navigation client, donc la carte se
  remonte de zéro et perd son viewport ;
- **la Skew Protection est désactivée** : les assets `_next/static/...` ne portent aucun paramètre
  `?dpl=`. Avec 5 déploiements sur la seule journée du 15/08, un visiteur qui a la page ouverte
  pendant un déploiement voit ses requêtes RSC échouer. J'ai capturé un **`503` sur
  `/spots/bec-de-sormiou-osm747711726?_rsc=…` à 13h43**, pendant le déploiement `dpl_BcBbuk…`. Le
  chunk `app/(map)/error.js` est chargé sur la page : une frontière d'erreur qui se déclenche donne
  très exactement « la carte se reset et plus aucun spot n'apparaît ».

**Correctif** : activer Skew Protection (Vercel → Settings → Advanced) avec
`experimental.useDeploymentId` côté Next, et conserver le viewport de la carte au retour — état dans
l'URL, ou vraie navigation client.

> Réserve honnête : j'ai d'abord mesuré ~30 s de carte vide, mais l'onglet piloté était en
> arrière-plan (`document.hidden`) et la carte ne se monte pas tant qu'aucune image n'est peinte. Les
> web vitals réels donnent `/carte` à **LCP p75 1 538 ms** sur 30 jours. Le rechargement et la perte
> de zoom sont réels ; les 30 s ne le sont pas, ne cale pas un ticket perf dessus.

---

## P1 — à traiter dans le même sprint

**4. S'abonner à Local fait *perdre* des spots.** Le plafond de `get_spots_for_map` ne vise que le
tier `anonymous` ; `discovery` passe au travers. Nombre de spots servis, calculé sur les mêmes clauses
que la fonction :

| tier | spots sur la carte | coordonnées |
|---|---|---|
| anonyme | 72 (3 × 24 départements) | floutées |
| Découverte, gratuit | **607** | floutées |
| Local, 4,90 €, dept 13 | **36** | précises |
| Local, 4,90 €, dept 29 | 94 | précises |
| Itinérant, 9,90 € | 607 | précises |

Un pêcheur des Bouches-du-Rhône qui paie 4,90 € voit sa carte passer de 607 à 36 spots. La page tarifs
le dit (« Votre département » vs « Tous les spots de France »), donc ce n'est pas un mensonge — mais
c'est un piège de conversion : le premier réflexe après paiement est de se sentir volé. À arbitrer,
pas forcément à coder.

**5. 171 spots `moderation_status = 'rejected'` sont encore `visibility = 'public'`.** Ils sont exclus
de la carte par le statut, donc pas exposés aujourd'hui. Mais l'état est contradictoire, et le jour où
un filtre oublie `moderation_status`, ils sortent.

**6. 9 scores périmés, le plus ancien calculé il y a 9 jours.** Le cron de scoring ne couvre déjà pas
son lot actuel de 217. À corriger avant de le tripler au point 2.

**7. Aucune page n'est mise en cache CDN.** `/carte`, `/spots`, `/especes`, `/guides`, `/tarifs`
répondent toutes en `x-vercel-cache: MISS` avec `cache-control: private, no-cache, no-store`. Ce sont
des pages SEO publiques rendues intégralement à chaque visite : c'est le levier direct sur les
1 247 ms de moyenne relevés en GSC.

**8. Des fonctions *trigger* sont exposées en RPC publique.** L'advisor Supabase remonte
`handle_new_user()`, `broadcast_public_catch()`, `enforce_*_rate_limit()`, `enforce_spot_dedup()`,
`favorite_spots_enforce_limit()`, `feed_post_photos_enforce_limit()`, `sync_outing_status()` comme
appelables par `anon` via `/rest/v1/rpc/…`. PostgreSQL refuse d'exécuter une fonction trigger appelée
directement, donc l'exploitabilité est proche de zéro — mais ces fonctions n'ont rien à faire dans la
surface d'API. Un `revoke execute … from anon, authenticated` sur le lot, en une migration.

**9. 3 profils sur 46 sans `home_department` et onboarding non terminé.** C'est la configuration qui
avait produit le cul-de-sac `/fil` en juin. À vérifier sur l'écran quand je reprendrai le parcours
connecté.

**10. `vercel.live/_next-live/feedback/feedback.js` répond 503 en production.**

**11. `spatial_ref_sys` sans RLS**, remonté « ERROR » par l'advisor. Table système PostGIS, impact réel
nul, mais l'alerte reviendra à chaque audit — soit on l'active, soit on la documente une fois pour
toutes comme acceptée.

---

## Vérifié sain — ne pas rouvrir

- **Aucun risque de fuite de payload entre tiers.** `/carte` n'est pas mise en cache CDN, donc le
  payload d'un abonné (coordonnées précises) ne peut pas être resservi à un anonyme. C'était le risque
  à écarter en priorité, `get_spots_for_map` étant `SECURITY DEFINER` et dépendant de `auth.uid()`.
- **Les fonctions d'administration sont correctement gardées.** `create_invite_codes`,
  `disable_invite_code` et `revoke_comp_grant` sont exécutables par `authenticated` (l'advisor le
  signale), mais toutes trois commencent par `if not public.is_moderator(auth.uid()) then raise
  exception 'moderator_only'`. `redeem_comp_code` exige une session, verrouille la ligne en
  `for update` et contrôle disabled / expired / exhausted / already_redeemed. Pas d'escalade
  possible : un compte gratuit ne peut pas se fabriquer un abonnement.
- **Intégrité de la base** : 0 slug dupliqué, 0 spot sans slug, 0 spot approuvé sans `geom`, 0
  département non normalisé (le `char(3)` du sprint 81 tient).
- **Ledger XP cohérent** : 0 écart entre `sum(xp_events.points)` et `user_progress.total_xp`.
  L'intégrité du sprint 69 tient.
- **Web vitals réels** : `/carte` LCP p75 1 538 ms, FCP 1 070 ms, INP 128 ms (n = 72). `/spots` LCP
  983 ms (n = 202). Rien d'alarmant côté client.
- **Erreurs runtime Vercel sur 7 jours** : 5 groupes, tous nominaux — refresh token expiré, lien email
  expiré, mot de passe erroné, inscription en doublon, webhook Resend sans signature.
- **PostHog error tracking** : 0 issue sur 30 jours. La capture d'exceptions passe par Sentry, pas par
  PostHog — si tu veux les erreurs client dans PostHog il faut activer `capture_exceptions`.
- **`auth_leaked_password_protection`** reste désactivé : décision assumée (plan Free), déjà consignée
  dans CLAUDE.md. Ne pas le re-signaler.

---

## Ordre de passage suggéré

1. **Skew Protection** — une case à cocher, et elle protège tous les correctifs suivants pendant
   qu'ils se déploient. À faire en premier pour cette raison seule.
2. **Sémantique de la couleur** (P0-1) — décision produit, puis code.
3. **Fiabiliser le cron de scoring** (P1-6), puis l'ouvrir aux importés (P0-2) — dans cet ordre.
4. **Viewport de la carte au retour** (P0-3, seconde moitié).
5. **Cache des pages SEO** (P1-7).
6. Le reste en hygiène : `revoke execute` sur les triggers, les 171 `rejected` publics, feedback.js.

## Reste à auditer

Le parcours connecté en navigateur : `/home`, `/carnet`, l'ajout d'un favori, le mur d'abonnement vu
d'un compte Découverte, et surtout le comportement de la carte à 607 spots — c'est là que tes clusters
apparaissent, et c'est le volume auquel le bug de reset a le plus de chances de se voir. Rebranche
l'extension Chrome et je le joue.