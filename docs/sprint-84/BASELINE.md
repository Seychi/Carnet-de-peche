# Sprint 84 — BASELINE (mesure d'AVANT)

> Gelée le **2026-08-17**, WS A / Bloc 0, **avant toute modification du sprint 84**.
> Base git : `4977311` (`docs(sprint-83): date de deploiement et renvoi vers la QA 390 px`).
> Prod mesurée : `https://www.carnet-de-peche.com`, déploiement du sprint 83 (17/08 11:53 heure de Paris).
>
> Ce fichier ne se réécrit pas : c'est le point de comparaison. Les mesures d'APRÈS vont dans le RECAP.

---

## 1. Build de production courant : rien n'est pré-rendu

Sortie exacte des deux commandes de la section « Le fait » du BRIEF, sur le build de production courant :

```bash
node -e "const m=require('./.next/prerender-manifest.json'); console.log(Object.keys(m.routes), Object.keys(m.dynamicRoutes))"
# → routes: ["/icon.svg","/robots.txt"]   dynamicRoutes: []

find .next/server/app -name '*.html' | wc -l
# → 0
```

Lecture : **2 routes pré-rendues** (une icône et un fichier texte, aucune page HTML), **0 route ISR**,
**0 fichier `.html` généré au build**. Les 1 088 pages SEO sont rendues à chaud, à chaque requête.

Objectif du sprint : `Object.keys(m.routes).length` ≥ 30 après le Bloc 1, et `.html` > 0.

---

## 2. Prod : TTFB et `x-vercel-cache`, 3 tirs × 5 URLs

Mesure du **2026-08-17 à 10:59 UTC**, depuis le poste de John (FR), PoP Vercel `cdg1`, fonction `dub1`.
Commande par tir :

```bash
curl -s -o /dev/null -D - -w 'TTFB %{time_starttransfer}\n' <url> | grep -iE 'x-vercel-cache|TTFB'
```

Les 5 URLs ont d'abord été vérifiées : **toutes répondent 200**.

| URL | Tir | TTFB (s) | Total (s) | `x-vercel-cache` | `Age` |
|---|---|---|---|---|---|
| `/` | 1 | **0,702** | 0,782 | `MISS` | 0 |
| `/` | 2 | **0,517** | 0,602 | `MISS` | 0 |
| `/` | 3 | **0,522** | 0,615 | `MISS` | 0 |
| `/spots` | 1 | **0,835** | 1,143 | `MISS` | 0 |
| `/spots` | 2 | **0,625** | 0,928 | `MISS` | 0 |
| `/spots` | 3 | **0,618** | 1,041 | `MISS` | 0 |
| `/spots/pointe-du-grand-minou` | 1 | **0,631** | 0,707 | `MISS` | 0 |
| `/spots/pointe-du-grand-minou` | 2 | **0,717** | 0,788 | `MISS` | 0 |
| `/spots/pointe-du-grand-minou` | 3 | **0,734** | 0,812 | `MISS` | 0 |
| `/especes/bar` | 1 | **0,411** | 0,547 | `MISS` | 0 |
| `/especes/bar` | 2 | **0,431** | 0,519 | `MISS` | 0 |
| `/especes/bar` | 3 | **0,676** | 0,764 | `MISS` | 0 |
| `/peche/bar/leurres/finistere` | 1 | **0,319** | 0,375 | `MISS` | 0 |
| `/peche/bar/leurres/finistere` | 2 | **0,383** | 0,441 | `MISS` | 0 |
| `/peche/bar/leurres/finistere` | 3 | **0,438** | 0,486 | `MISS` | 0 |

### Ce que ces 15 tirs prouvent

**15 `MISS` sur 15, `Age: 0` partout, y compris au 3e tir consécutif de la même URL.** Le CDN ne
garde rien, jamais. Ce n'est pas un cache froid : c'est un cache qui n'existe pas. C'est la
confirmation réseau du diagnostic du prerender-manifest.

L'en-tête de réponse le dit littéralement (relevé sur `/especes/bar` et `/spots/pointe-du-grand-minou`) :

```
Cache-Control: private, no-cache, no-store, max-age=0, must-revalidate
Vary: rsc, next-router-state-tree, next-router-prefetch, next-router-segment-prefetch
X-Matched-Path: /especes/[slug]
X-Vercel-Cache: MISS
```

`private, no-store` est ce que Next émet pour une route **rendue dynamiquement**. Tant que cet
en-tête est là, aucun réglage Vercel ne pourra mettre la page en cache. C'est le critère
d'après-sprint le plus simple à vérifier : sur une page ISR, cette ligne doit devenir
`s-maxage=…, stale-while-revalidate` et `x-vercel-cache` doit passer à `HIT` au 2e tir.

### Deux réserves d'honnêteté sur ces chiffres

1. **Ces TTFB (0,32 à 0,84 s) sont plus bas que les 1 247 ms cités dans le plan trafic.** Normal :
   `curl` depuis une connexion fixe française vers le PoP `cdg1` est le meilleur cas possible.
   Le 1 247 ms vient du terrain (mobile, réseaux variés). Comparer l'après avec **cette** table,
   pas avec le 1 247 ms.
2. Un seul poste, un seul réseau, un seul moment de la journée. C'est une base de comparaison
   valable parce qu'on refera la même mesure de la même façon, pas une mesure de population.

---

## 3. Rappel LCP p75 PostHog (relevé du 17/08, fenêtre 28 jours)

Pour situer l'enjeu côté utilisateur réel. Non remesuré ici, recopié tel quel.

| Page | LCP p75 |
|---|---|
| `/spots/pointe-du-guern-telgruc` | **7 232 ms** |
| `/spots/cap-couronne` | **4 448 ms** |
| `/spots/jetees-de-dieppe` | **3 980 ms** |
| `/spots/cap-bear` | **3 290 ms** |
| `/spots/pointe-du-grand-minou` | **2 789 ms** |
| `/spots/cap-dramont` | 300 ms |
| `/especes/vieille` | 380 ms |

L'écart entre 7 232 ms et 300 ms sur deux fiches du **même gabarit** est le symptôme : la page
lente est celle qu'on rend à froid, la page rapide celle qui a eu de la chance sur un conteneur
déjà chaud. Un cache CDN supprime cette loterie.

---

## 4. Consommation Active CPU du mois en cours

> ⛔ **NON RELEVÉ — à relever par John dans Vercel → Usage → Active CPU.**
>
> Cette donnée n'est pas accessible depuis les outils de l'agent (dashboard Vercel uniquement).
> Aucun chiffre n'est inventé ici. À reporter avant le déploiement du sprint 84, sinon la
> comparaison J+7 du « reste manuel John » n°4 sera impossible.

| Métrique | Avant (à remplir) | J+7 après déploiement |
|---|---|---|
| Active CPU (mois en cours) | _(vide)_ | _(vide)_ |
| Période couverte | _(vide)_ | _(vide)_ |

---

## 5. Verrous posés par ce bloc

| Verrou | Fichier | Rôle |
|---|---|---|
| `pnpm check:prerender` | `scripts/check-prerender.mjs` | Lit `.next/prerender-manifest.json` et sort en code 1 si une route témoin n'est pas pré-rendue. Témoins : `/`, `/especes/bar`, `/guides/peche-au-bar-au-leurre`, `/peche/bar/leurres/finistere`. |
| Test verrou d'imports | `__tests__/marketing-layout-is-static.test.ts` | Parcourt le graphe d'imports statiques depuis `app/(marketing)/layout.tsx` et `app/not-found.tsx` et échoue si un module atteint `lib/supabase/server` ou `next/headers` sans franchir une frontière `'use client'`. Attrape la régression **sans build**. |

Les deux échouent volontairement sur l'état actuel du code. Sorties exactes dans le RECAP.
