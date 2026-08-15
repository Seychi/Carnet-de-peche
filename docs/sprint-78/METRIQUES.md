# Sprint 78 — Métriques de référence (Bloc 6)

> Relevé le **2026-08-15**, sur la fenêtre **16/07 → 14/08 (30 jours)**, c'est-à-dire
> **AVANT** la publication du lot `S78-MED-01` (15/08) et avant le déploiement des
> correctifs du Bloc 1.
>
> Source : Google Search Console, tiré via le connecteur Supermetrics (compte
> `sc-domain:carnet-de-peche.com`). Chiffres produit : SQL live sur la production.

---

## 1. SEO par répertoire — la base d'avant

| Répertoire | Impressions | Clics | CTR | Position moy. |
|---|---|---|---|---|
| **`/spots`** | **12 894** | **928** | **7,2 %** | 7,13 |
| `/especes` | 7 474 | 106 | **1,42 %** | 8,57 |
| `/peche` | 4 967 | 295 | 5,94 % | 7,09 |
| `/` (racine) | 2 100 | 146 | 6,95 % | 7,16 |
| `/guides` | 545 | 20 | 3,67 % | 8,43 |
| `/auth` · `/legal` | 15 | 0 | 0 % | — |
| **Total** | **~27 985** | **~1 495** | — | — |

⚠️ **Écart avec le brief, à connaître** : le brief annonce « 691 clics par semaine ».
Sur 30 jours pleins, la mesure donne **1 495 clics, soit ~348 par semaine**. Le
chiffre du brief correspond vraisemblablement à une semaine de pointe et non à une
moyenne. C'est la moyenne 30 jours qui sert de base ici, parce que c'est elle qu'on
pourra comparer sans effet de fenêtre.

### ★ Le témoin, et la règle de sortie

**`/spots` est à 7,2 % de CTR.** C'est LA métrique qui décide du sort du Bloc 2.

> ⚠️ **Si le CTR de `/spots` passe sous 6 %, on dépublie le lot**, sans attendre.
> ```sql
> update public.spots set moderation_status='pending' where generation_batch='S78-MED-01';
> ```

La bascule est instantanée et sans déploiement : la base pilote le contenu.

### Bloc 4 — la base à battre

`/especes` est à **1,42 %** de CTR sur 30 jours (7 474 impressions, 106 clics).
Les 8 pages retravaillées au sprint 78 pesaient à elles seules **4 231 impressions
pour 54 clics sur 90 jours**. Rappel du brief : juger `/especes` sur les requêtes
d'**intention pêche** uniquement, pas sur l'agrégat, sinon le travail peut payer
sans que la moyenne bouge.

---

## 2. Produit (SQL live, 2026-08-15)

| Repère | Avant lot 1 | Après lot 1 |
|---|---|---|
| Spots approuvés | 416 | **607** |
| dont fiches générées | 0 | **191** |
| dont fiches curées à la main | 416 | **416** *(intactes)* |
| Spots en attente | 4 018 | 3 827 |
| **Part Méditerranée de l'inventaire** | **19 %** | **44,6 %** |
| URLs dans le sitemap | ~846 | **1 037** |
| Comptes | 45 | — |
| Prises (`public` / `private` / `friends`) | 7 / 19 / 1 | — |
| Spots avec ≥ 1 prise publique | **2 / 416 (0,5 %)** | — |
| Comptes ayant logué ≥ 1 prise (60 j) | **15 %** | cible > 35 % |

**Les 6 derniers comptes créés ont, à eux tous, zéro prise loguée.** Cinq sur six ont
fini l'onboarding : le point de chute est APRÈS l'inscription, ce que corrige le
Bloc 1. Ce sont eux le témoin d'activation à surveiller.

---

## 3. Délivrabilité (2026-08-15)

| Contrôle | Avant | Après |
|---|---|---|
| Apex `carnet-de-peche.com` | 200, aucune redirection | **308 vers `www`**, chemin conservé |
| DKIM `resend._domainkey` | ✅ | ✅ |
| SPF `send.carnet-de-peche.com` | 🔴 **NXDOMAIN** | ✅ `v=spf1 include:amazonses.com ~all` |
| MX `send.carnet-de-peche.com` | 🔴 absent | ✅ `feedback-smtp.eu-west-1.amazonses.com` |
| DMARC | `p=none`, aucun `rua` | ✅ `p=none; rua=mailto:bonjour@…` |
| SMTP d'authentification | SMTP partagé Supabase | Resend *(fait par John)* |
| Webhook rebonds | absent | ✅ `email.bounced` + `email.complained` |
| Adresses en liste de suppression | 0 | **2** *(rebonds durs de juin et juillet, importés depuis Resend)* |

---

## 4. Relectures

- [ ] **J+3 (18/08)** — CTR `/spots`, impressions, position. Indexation du lot 1 dans GSC.
- [ ] **J+7 (22/08)** — ⚠️ **si `/spots` est sous 6 %, dépublier le lot avant d'aller plus loin.** Sinon, publier le lot 2.
- [ ] **J+14 (29/08)** — CTR des 191 nouvelles fiches (cible > 4 %), CTR `/especes` sur l'intention pêche (cible > 3 %), activation des comptes (cible > 35 %).

### Requêtes de contrôle

```sql
-- Témoin : les fiches curées n'ont pas bougé
select count(*) from spots where moderation_status='approved' and generation_batch is null; -- doit rester 416

-- Le lot
select count(*), count(distinct description) from spots where generation_batch='S78-MED-01';

-- Activation
with c as (select id from auth.users where created_at >= now() - interval '60 days'),
     p as (select user_id from catches group by user_id)
select count(*) comptes, count(p.user_id) ont_logue from c left join p on p.user_id=c.id;
```

---

## 5. Statistiques d'exploration Google (Bloc 0, relevé John du 2026-08-15)

Export GSC sur **64 jours (11/06 → 13/08)**, soit AVANT la publication du lot 1 et
avant le 308 de l'apex.

### ★★★ Il n'y a AUCUN 503. La prémisse du brief est fausse.

| Réponse servie à Googlebot | Part |
|---|---|
| **OK (200)** | **98,22 %** |
| Introuvable (404) | 1,46 % |
| Déplacement permanent (301) | 0,26 % |
| Déplacement temporaire (302) | 0,07 % |
| **5xx (dont 503)** | **0,00 %** |

Le brief ouvre sur « des **503 servis aux crawlers** » et en fait le garde-fou qui
interdit toute publication (« ne pas publier une seule fiche avant que le taux de
503 soit connu »). **Sur 7 339 demandes d'exploration en 64 jours, Google n'a reçu
aucune erreur serveur.** Le constat venait de l'audit du 2026-07-02 (Vercel
Challenge sur les prefetches RSC) et n'est plus d'actualité.

⚠️ Conséquence : la décision de John de publier sans attendre était **la bonne**, et
pour une raison que ni lui ni moi ne connaissions au moment de la prendre.

### ★★★ Le vrai plafond n'est pas l'erreur, c'est le débit de découverte

| Mesure | Valeur |
|---|---|
| Demandes d'exploration | 115/jour sur 64 j · **90/jour sur 30 j** · 124/jour sur 14 j |
| Objectif **Actualisation** | 88,96 % |
| Objectif **Découverte** | **11,04 %**, soit **~10 demandes par jour** |
| Part HTML des demandes | 23,55 % *(JavaScript : 30,89 %)* |
| Temps de réponse moyen pondéré (30 j) | **1 247 ms**, 10 jours au-dessus de 1 000 ms, pic à 2 754 ms |

Google ne consacre que **10 requêtes par jour à découvrir des URLs nouvelles**. À ce
rythme :

| À publier | Jours de découverte |
|---|---|
| Lot 1 (191 fiches) | **~19 jours** |
| Les 2 905 éligibles | **~293 jours, soit près de 10 mois** |

⚠️ **Le critère d'acceptation du brief « premier lot indexé à plus de 70 % à J+14 »
n'est pas atteignable** à ce débit : 191 pages demandent ~19 jours rien que pour
être explorées une première fois. Ne pas conclure à l'échec du gabarit sur ce
chiffre à J+14 : ce serait juger le contenu sur une contrainte de crawl.

### Ce sur quoi agir, par ordre d'effet

1. **Le temps de réponse.** 1 247 ms de moyenne pondérée : Google module son débit
   dessus. C'est le premier levier, et c'est ce que le passage en Pro plus
   l'allègement de `/spots` (1,42 Mo) viennent servir. Le vrai argument pour Pro
   n'était donc pas les 503, c'est celui-là.
2. **Le 308 de l'apex, déjà fait.** L'apex captait **405 demandes sur 7 339, soit
   5,5 % du budget d'exploration**, pour servir un doublon de chaque page. Gain
   immédiat et gratuit.
3. **Le poids du JavaScript.** 30,89 % des demandes vont à du JS, contre 23,55 % à
   du HTML. Moins d'un quart du budget sert les pages elles-mêmes.
4. **Les 404.** 1,46 % (~107 demandes). À regarder dans `Pages → Non indexée →
   Introuvable` : probablement des URLs de spots retirés ou des liens périmés.

### Ce que ça change pour la cadence des lots

Publier le lot 2 à J+7 mettrait 200 pages de plus dans une file déjà longue de
19 jours. **Le rythme de publication devrait suivre le débit de découverte, pas le
calendrier** : un lot toutes les 3 semaines colle mieux à la réalité mesurée qu'un
lot par semaine, tant que le temps de réponse n'a pas baissé.
