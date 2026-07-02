# QA visuelle OG Sprint 55 « le partage beau »

**Date :** 2026-06-30
**Commit prod :** `4539880` (sprint-55), Vercel READY, vérifié.
**Méthode :** rendu réel des PNG ouverts dans Chrome (+ zoom), recoupé avec les **logs runtime Vercel** (statuts réels) et la base.

## 🔴 Verdict visuel : NO-GO

Le moteur de polices marche (la carte espèce est superbe), mais **les cartes de partage cœur (prise, conditions) ont des glitches de mise en page visibles**, et **les nouvelles images OG SEO `/peche/*` renvoient 404**. Deux des quatre livrables du sprint ont des défauts visibles sur les vraies données. À corriger puis re-QA. Détail ci-dessous.

---

## Ce qui MARCHE ✅

- **Polices (WS-B)** : sur un rendu chaud, titres et chiffres sont **franchement gras**, les nombres en **JetBrains Mono**. La carte **espèce** le prouve nettement : `/especes/bar/opengraph-image-6xz4m8?6b51507bf0bbf051` rend « **Bar** » gras, propre, **sans débordement** (HTTP 200). Le mécanisme de fetch de polices fonctionne.
- **Emojis → icônes (WS-C)** : `/c/HSEwOyRMAe2F` n'a **plus aucun emoji** (0 détecté) ; les lignes (Espèce, Taille, Poids, Secteur, Date, Marée, Vent + badge Record) sont des **icônes Lucide** (19 SVG). 0 erreur console.
- **Dates Article (WS-D)** : JSON-LD `Article` sur `/especes/bar` → `datePublished` et `dateModified` = **2026-06-21** (vraie date, = « vérifié le 21/06/2026 »), `image` pointe vers **l'OG de l'espèce** (pas la marque générique). BreadcrumbList + FAQPage + ItemList présents. 0 erreur console.
- **Carte espèce OG** : rend en 200, propre et gras (cf ci-dessus).
- **Pas de 500** : 0 runtime error Vercel sur 6 h.

---

## Ce qui CLOCHE ❌

### 1. Cartes de partage `/og/card/*` : glitches de layout (WS-A non tenu)
Rendus **frais** (donc bien sprint-55, polices grasses) et pourtant glitchés :

- **Carte PRISE — paysage : le chiffre parasite n'a PAS disparu.** Un « **11** » (ou « 1 ») flotte en haut à droite, au-dessus de « cm », sans libellé. C'est exactement le « glitch 1 » que WS-A prétend corriger.
  URL : `https://www.carnet-de-peche.com/og/card/HSEwOyRMAe2F?cb=1` (ajoute un `?cb=...` pour forcer un rendu frais)
- **Carte PRISE — story (9:16) : le héros déborde.** Le contenu est à peu près centré verticalement (le « 70 % de vide » est amélioré), MAIS « MAQUEREAU **59 cm** » déborde et le chiffre est **coupé au bord droit** de la carte.
  URL : `https://www.carnet-de-peche.com/og/card/HSEwOyRMAe2F?format=story&cb=1`
- **Carte CONDITIONS — paysage : les chips sont cassées.** Dans chaque chip, le **pourcentage (86 %, 71 %, 57 %, 43 %) est superposé au libellé** (« au printemps », « le mercredi »…), et les libellés sont **coupés** (« printemps » → « printemp », « mercredi » tronqué). Le « texte coupé » que WS-A prétend borner est toujours là (en pire, superposé).
  URL : `https://www.carnet-de-peche.com/og/card/e77qiNmO8h9y?cb=1`

> Note de cause probable : la carte **espèce** (même moteur de polices) est nette. Donc le souci n'est pas global : ce sont les **gabarits CatchCard + ConditionsCard** (bornage du héros, layout des chips) qui restent buggés. À reprendre côté gabarit.

### 2. Images OG SEO `/peche/[...]/opengraph-image` : 404 (WS-D cassé)
La page `/peche/bar/leurres` (et toutes les `/peche/*`) référence un `og:image`… qui **renvoie 404**. **Confirmé dans les logs runtime Vercel** (pas un faux positif de mon côté), sur plusieurs routes et avant même mes tests :

```
GET /peche/bar/leurres/opengraph-image-1g1b64            404
GET /peche/dorade-royale/leurres/opengraph-image-1g1b64  404
GET /peche/sar/surfcasting/gironde/opengraph-image-1g1b64 404
GET /peche/orphie/flottante/vendee/opengraph-image-1g1b64 404
GET /peche/bar/leurres/alpes-maritimes/opengraph-image-1g1b64 404
```

Conséquence : **chaque page SEO `/peche/*` partage un aperçu sans image** (Facebook/Twitter/LinkedIn reçoivent un 404). La carte espèce, elle, n'est PAS touchée (route différente, 200).
URL à vérifier (FB Sharing Debugger) : `https://www.carnet-de-peche.com/peche/bar/leurres`

---

## Nuances / à creuser

- **Polices grasses pas garanties sur le 1er rendu.** Le **tout premier** rendu de la carte prise (URL canonique, sans `?cb=`) et la version **embarquée dans `/c/HSEwOyRMAe2F`** étaient en police **fine (fallback système)**, pas grasse. Or les OG sont en `Cache-Control: public, immutable, max-age=31536000` (**1 an**). Risque réel : le **premier** rendu d'une carte (cold start → fallback) se **fige 1 an** chez le 1er scraper. À vérifier (purge + 1er rendu à froid) ; idéalement pré-charger/bundler les polices au lieu d'un fetch runtime.
- **Rate-limiting Vercel** : à force d'ouvrir des routes OG rapidement, j'ai déclenché des **503** (firewall) sur `/.well-known/vercel/jwe` et des prefetch RSC. Ce sont des artefacts de mon test, **pas** des erreurs prod (0 runtime error loggée). Le 404 `/peche`, lui, est réel (loggé côté serveur).
- **3 kinds de carte non testés** : la base ne contient que `catch` (HSEwOyRMAe2F) et `conditions` (e77qiNmO8h9y). **recap / records / gearbox / sortie n'existent pas** → non vérifiés. Vu que les 2 gabarits existants glitchent, génère-en une de chaque via le flux de partage et re-teste (même template OG).

---

## Réponses point par point

| Point | Verdict |
|---|---|
| 1. Polices grasses + chiffres mono (pas Arial plat) | ✅ **OK** sur rendu chaud (carte espèce nette ; prise/conditions grasses) — ⚠️ 1er rendu/embed parfois en fallback fin (cache 1 an) |
| 2a. Plus de chiffre parasite « 1 » | ❌ **KO** : « 11 » en haut à droite de la carte PRISE (paysage) |
| 2b. Aucun texte coupé/débordé | ❌ **KO** : chips CONDITIONS superposées + coupées ; héros PRISE coupé en story |
| 2c. Story 9:16 centré verticalement | 🟡 **Mieux** (contenu vers le milieu) mais gâché par le débordement du héros |
| 3a. OG `/peche/.../opengraph-image` carte dédiée | ❌ **KO** : 404 (route cassée, confirmée logs) |
| 3b. JSON-LD espèce : dates réelles + image OG espèce | ✅ **OK** (2026-06-21 ; image → OG espèce qui rend en 200) |
| 4a. `/c/` emojis → icônes propres | ✅ **OK** (Lucide, 0 emoji) |
| 4b. Console 0 erreur | ✅ **OK** (/especes, /c) |
| 4c. Aucune route OG en 500 | ✅ **OK** pour 500 — ❌ mais `/peche/*` OG en **404** |

## À corriger avant un GO
1. Gabarit **CatchCard** : retirer le chiffre parasite « 11/1 » (paysage) + borner/réduire le héros pour qu'il ne déborde pas en **story**.
2. Gabarit **ConditionsCard** : layout des chips (libellé + % côte à côte/empilés, plus de superposition ni de coupe).
3. Route **`/peche/[...]/opengraph-image`** : répare le 404 (l'image dédiée ne se génère pas).
4. (Reco) Polices OG : bundler au lieu de fetch runtime, OU purger le cache immutable après correctif pour ne pas figer des cartes fines/glitchées 1 an.
5. Re-QA visuelle des 6 kinds (générer recap/records/gearbox/sortie).
