# Sprint 87 — BASELINE

> Relevé le **2026-08-18**, avant déploiement. Mesure faite par
> `node scripts/measure-fold.mjs`, iPhone 13 émulé (**390 × 844**), contre la
> production, qui tourne encore le code d'avant (commit `b491217`).

---

## ⚠️ Pourquoi cette mesure a dû passer par l'émulation

Chrome desktop sous Windows **refuse de descendre sous ~500 px de large**. La QA du
17/08 s'est donc faite en **501 × 660**, pas en 390 × 844, et ses chiffres de
position ne sont pas comparables aux nôtres. L'émulation d'appareil de Playwright
est la seule façon d'obtenir un vrai 390 px sur cette machine.

---

## L'AVANT (production, 18/08)

| Gabarit | Page témoin | Titre (y / lignes) | Réponse | 1er CTA de lecture |
|---|---|---|---|---|
| `peche` | `/peche/dorade-royale/surfcasting/morbihan` | 174 px / **3 lignes** | **absente** | **aucun** |
| `guide` | `/guides/comment-lire-une-courbe-de-maree` | 209 px / **3 lignes** | absente (prose) | **aucun** |
| `espece` | `/especes/dorade-royale` | 150 px / **2 lignes** | **non marquée** | **non marqué** |

Verdict du script : **6 manquements**.

⚠️ **« Aucun CTA » ne veut pas dire « aucun lien »** : `/peche` et `/guides` avaient
bien un CTA, mais **en fin de page**, hors de portée d'un visiteur mobile qui ne
déroule pas, et **sans aucun événement d'analytics**. `/especes` avait déjà les
siens (sprint 75) mais sans marqueur de mesure.

---

## ★ Une correction au brief, mesurée

Le brief pose que le `h1` global (`clamp(32px, 8vw, 72px)`) fait exploser les titres
SEO en mobile. **À 390 px, c'est faux** : `8vw` vaut 31,2 px, donc le clamp tombe
déjà sur son **plancher de 32 px**. Les titres tenaient en 3 lignes avant le sprint.

Le gain du `SeoTitle` (`clamp(25px, 5.6vw, 42px)` → 25 px à 390 px) est donc réel
mais **modeste : environ 22 % de taille, soit une ligne gagnée**. Le vrai gain du
sprint n'est pas le titre, c'est **la remontée de la réponse et du CTA**.

Le clamp global reste en revanche pleinement justifié à corriger sur les écrans
larges, où `8vw` peut atteindre 72 px.

---

## L'APRÈS (build local, même commande, même émulation)

| Gabarit | Titre | Réponse | 1er CTA | Verdict |
|---|---|---|---|---|
| `peche` | 154 px / **2 lignes** | **351 px** | **882 px** (2 au total) | ✅ |
| `guide` | 197 px / **2 lignes** | sans objet (prose) | **470 px** (2 au total) | ✅ |
| `espece` | 138 px / **1 ligne** | **190 px** | **492 px** | ✅ |

`✅ measure-fold : les trois gabarits tiennent le premier écran.`

**Ce qui a le plus bougé** : sur `/peche`, la réponse à la requête passe
d'introuvable à **351 px**, et le premier CTA d'inexistant à **882 px**. Sur
`/guides`, le CTA passe de la fin de page à **470 px**.

---

## ⚠️ Le piège de mesure, à lire AVANT de juger le sprint

`seo_cta_clicked` est un événement **NOUVEAU**. Il ne remplace rien :
`species_page_cta_clicked` reste en place sur `/especes` et garde la continuité du
sprint 75.

**`/peche` et `/guides` partaient de ZÉRO événement, pas d'un taux bas.** Aucun
« avant/après » en taux n'est possible sur ces deux gabarits : il n'y a pas d'avant.

- **Le repère est le VOLUME hebdomadaire absolu de `seo_cta_clicked`**, découpé par
  `template`, jamais un taux.
- **La base est 0 pour `peche` et `guide`.** Toute valeur non nulle est un gain.
- `/especes` est le **seul** gabarit avec un avant comparable, et c'est aussi la
  raison pour laquelle le Bloc 4 n'y a touché QUE la taille du titre : tout autre
  changement aurait rendu sa comparaison illisible.

Même piège que la discontinuité `spot_page` du sprint 85 §3 et que celle de
`pending_catch` du sprint 86 §5. C'est la troisième fois : un changement de surface
change le dénominateur, et le taux devient incomparable.

---

## Comment rejouer

```bash
node scripts/measure-fold.mjs                       # contre la prod
node scripts/measure-fold.mjs http://localhost:3000 # contre un build local
```
