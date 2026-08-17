# Sprint 83 · Bloc 2 — QA visuelle 390 px de la liste compacte

> Relevé le 2026-08-17, **avant déploiement**, sur le composant réel
> `components/spots/NearbySpotsSection.tsx` (état du working tree).

## Comment cette QA a été faite, et ce qu'elle ne prouve pas

L'extension Claude in Chrome n'était pas connectée : impossible de piloter le
navigateur de John. Le composant a donc été rendu dans **Chromium réel, en 390 × 844,
DPR 2**, avec :

- le **markup exact** des deux branches du composant (compact et cartes) ;
- le **thème Tailwind v4 réel** (`@theme` de `app/globals.css` : `sand-200`,
  `navy-900`, `ink-500/600`, `teal-700`) compilé par le vrai Tailwind ;
- les **polices réelles** (Inter, Space Grotesk, JetBrains Mono) — les métriques de
  texte sont donc justes, ce qui est décisif pour une troncature ;
- des **données de production** : les 12 noms les plus longs du Finistère
  (`moderation_status='approved'`, Supabase, 2026-08-17), dont 3 avec distance
  (comme `nearby_spots` en sert à un anonyme) et 9 issues du repli départemental.

✅ Ce que ça prouve : la géométrie, la troncature, les cibles tactiles et les
débordements de la section, sur du texte réel.
❌ Ce que ça ne prouve pas : l'intégration dans la page complète (sections voisines,
hydratation, position dans le défilement). **Une passe sur un déploiement de
prévisualisation reste nécessaire** avant de clore le Bloc 2.

---

## 1. Mesures — la section fait ce qu'elle promet

| Variante | Entrées | Hauteur section | Hauteur/ligne | Cible tactile min | Débordements |
|---|---|---|---|---|---|
| **Compacte (sprint 83)** | **12** | **634 px** | 44 px | **44 px** ✅ | **0** |
| Cartes (avant) | 6 | 625 px | 78,5 px | 75 px | 0 |
| Compacte, au seuil | 7 | 409 px | 44 px | 44 px | 0 |
| Cartes, au seuil | 6 | 625 px | 78,5 px | 75 px | 0 |

★ **Le résultat qui valide le bloc : 12 liens en 634 px contre 6 liens en 625 px.**
On double le maillage interne pour **9 px de défilement supplémentaire**. Le
commentaire du composant annonçait « ~48 px par entrée » : la mesure donne **44 px**,
soit la borne d'accessibilité exactement tenue, pas approchée.

La bascule au seuil est correcte : 7 entrées passent en compact, 6 restent en cartes
(`COMPACT_THRESHOLD = 6`, comparaison `> 6`).

### Budget horizontal du nom, mesuré

| Contexte | Largeur disponible | Caractères qui tiennent |
|---|---|---|
| Ligne **avec** pastille de distance | **223 px** | **~36** |
| Ligne **sans** pastille de distance | **277 px** | **~43** |

Sur les 607 fiches publiées : **36 noms (5,9 %) dépassent 36 caractères** et seront
tronqués sur une ligne à distance ; **8 (1,3 %) dépassent 43** et le seront partout.
La troncature fonctionne (le `min-w-0` fait son travail, zéro débordement mesuré) et
le texte complet reste dans le DOM.

---

## 2. Trois constats qu'un harnais de géométrie ne pouvait pas voir

### 🔴 a) Le tiret cadratin arrive par la BASE, pas par le code

Rendu réel de la première ligne : `Aber Wrac'h — dunes de Sainte-…`

**113 des 607 fiches publiées (18,6 %) portent un « — » dans `spots.name`.** Le
composant affiche `entry.name` brut, donc le cadratin atterrit dans de la copie
visible, contre `CLAUDE.md` §6.

★ **`scripts/lint-copy-dashes.mjs` ne peut pas l'attraper** : il lit les chaînes du
**code source**, et ce tiret vient d'une **colonne de base**. C'est exactement par là
que l'invariant fuit.

Le correctif existe déjà : `lib/seo/spot-title.ts` expose `fullSpotName()`, qui
remplace le cadratin par une virgule — écrit au sprint 76 pour cette raison précise,
sur les titres. Il suffit de l'appliquer ici. Bénéfice secondaire : `, ` est plus
étroit que ` — `, donc quelques troncatures disparaissent au passage.

**Coût : un import et un appel.** À faire avant le déploiement, parce que ça touche
18,6 % des fiches.

### 🟠 b) La colonne espèce ne dit rien et coûte la troncature

En compact, `EntryMeta` est appelé avec `max={1}` : **9 lignes sur 12 affichent le
seul mot « Bar »**. Sur la côte bretonne, le bar est sur presque tous les spots — la
colonne répète le même mot et n'aide à choisir aucun lien.

Elle coûte **54 px** de budget horizontal (223 contre 277), c'est-à-dire précisément
le budget qui provoque la troncature.

Deux sorties possibles, à trancher :

1. **Supprimer l'espèce en mode compact** (garder la distance seule). Le nom récupère
   277 px et les fiches tronquées passent de **36 à 8**.
2. **Afficher l'espèce qui distingue** plutôt que la première du tableau : celle que
   le spot courant n'a pas, ou la plus rare du département. Plus utile, plus cher.

Recommandation : l'option 1 maintenant, l'option 2 en backlog. La liste compacte sert
le maillage et le scan, pas la fiche d'identité.

### 🟡 c) L'espacement de la distance en `font-mono`

`3.4  km`, `12  km` : l'espace d'une police à chasse fixe est large, le nombre et
l'unité se détachent. Purement cosmétique. Espace insécable fine dans
`formatDistance`, ou unité hors `font-mono`.

---

## 3. Ce qui est validé et qu'il ne faut PAS retoucher

- **Le filet sous chaque ligne, dernière incluse** : sur une grille à 2 ou 3 colonnes,
  un `last:border-b-0` ne retirerait le filet qu'au 12e élément. Uniforme = correct
  aux trois largeurs. Le commentaire du composant a raison.
- **`min-w-0` sur le nom** : mesuré, zéro débordement sur 390 px. Sans lui, un enfant
  de flex a `min-width: auto` et `truncate` ne tronque rien.
- **`nearbyTitle`** : il exige désormais que **toutes** les entrées portent une
  distance avant de promettre « à moins de X km », sinon il retombe sur « Autres spots
  dans le Finistère ». Avec 3 entrées proches et 9 du département, le titre servi est
  donc honnête. C'est le bon correctif, il tient au rendu.

---

## 4. Verdict

| # | Constat | Gravité | Avant déploiement ? |
|---|---|---|---|
| a | Cadratin de la base rendu brut (18,6 % des fiches) | 🔴 invariant copy | **oui** |
| b | Colonne espèce redondante, coûte 54 px et 28 troncatures | 🟠 qualité | recommandé |
| c | Espacement `font-mono` de la distance | 🟡 cosmétique | non |

**La géométrie du Bloc 2 est validée.** Les trois constats portent sur le contenu des
lignes, pas sur la mise en page. Aucun ne remet en cause la bascule compacte, qui
tient sa promesse : deux fois plus de liens internes pour 9 px de défilement.

> Reste dû : la passe sur la page complète (déploiement de prévisualisation ou
> extension Chrome connectée). Cette QA valide la section isolée, pas son voisinage.
