# Sprint 87 — RECAP
## Le premier écran des gabarits SEO

> Exécuté le **2026-08-18**. Brief : `docs/sprint-87/BRIEF.md`.
> Mesure avant/après : `docs/sprint-87/BASELINE.md`.
> ⚠️ Fenêtre du sprint 83 ouverte jusqu'au **07/09** : aucun titre `<title>`, aucun
> maillage, aucun sitemap touché.

---

## 0. État en une ligne

Les six blocs sont livrés. **Zéro migration.** **1 637 tests verts** sur 1 638, le
seul échec étant le flake de charge connu depuis le sprint 83 (`security-headers`,
7 168 ms sous suite complète, **7/7 vert en isolation**). Build, types et lint propres.

**Le sprint est prouvé par une mesure, pas par une intention** :

| Gabarit | Réponse à la requête | 1er CTA de lecture | Titre |
|---|---|---|---|
| `peche` | **absente → 351 px** | **aucun → 882 px** | 3 → **2 lignes** |
| `guide` | sans objet (prose) | **aucun → 470 px** | 3 → **2 lignes** |
| `espece` | non marquée → **190 px** | non marqué → **492 px** | 2 → **1 ligne** |

Avant : 6 manquements. Après : `✅ les trois gabarits tiennent le premier écran.`

---

## 1. Bloc 1 — trois primitives, et un événement

- `components/seo/seo-title.tsx` — `SeoTitle`, server, `data-fold="title"`.
- `components/seo/key-facts.tsx` — `KeyFacts`, server, `data-fold="answer"`.
- `components/seo/seo-inline-cta.tsx` — `SeoInlineCta`, client, `data-fold="cta"` + `data-position`.
- `analytics.seoCtaClicked({ template, slug, position })`.

★ **Le contrat du brief était ambigu et a été tranché une fois pour les trois
gabarits.** Le Bloc 1 décrivait `note` comme venant « sous le libellé », donc sous
une phrase d'accroche, alors que les Blocs 2 et 3 appellent « libellé » **le texte
du bouton** (« Loguer une prise à Pointe du Raz », « Créer mon carnet gratuit »).
Les deux lectures ne pouvaient pas tenir ensemble. Retenu, et documenté dans le
composant : `label` = le bouton, `headline` = l'accroche, `note` = la rassurance.

⚠️ `SeoInlineCta` est un composant **client** (il lui faut le `onClick`), ce qui ne
rend **pas** la page dynamique : seule une API dynamique dans l'arbre **serveur** le
ferait. L'invariant du sprint 84 tient, et `check:prerender` le confirme sur
`/especes/bar`, `/guides/peche-au-bar-au-leurre` et `/peche/bar/leurres/finistere`.

---

## 2. Bloc 2 — `/peche`, 455 pages

Ordre du premier écran : fil d'ariane → titre → chapô → **L'ESSENTIEL** → **CTA** →
la prose. L'ESSENTIEL vivait en `not-prose` **entre** les paragraphes de technique,
donc sous le premier écran, alors que c'est **lui** la réponse à la requête.

★ **Le CTA porte désormais un spot en contexte.** Il pointait `/carnet/nouvelle`
**nu**, ce qui envoie un visiteur sans compte sur « Choisis d'abord ton spot », qui
le renvoie chercher ailleurs, alors que la page **liste déjà jusqu'à 5 spots** et
que tout le parcours anonyme des sprints 77 et 86 ne fonctionne **qu'avec** un spot
en contexte. Désormais :

- au moins un spot → `/carnet/nouvelle?spot_id=<uuid>`, bouton « Loguer une prise à … » ;
- sinon → `/spots?species=<dbKey>`, bouton « Trouver un spot à … ».

Vérifié **dans le code** et non supposé : `app/carnet/nouvelle/page.tsx` accepte
l'UUID comme le slug (`get_spot_by_id` / `get_spot_by_slug`, correctif du sprint 79
Bloc 3). Le nom du spot passe par `shortSpotName`, sinon le libellé du bouton
déborde à 390 px sur les noms importés d'OSM.

Le CTA de fin est conservé, même bloc navy et même copie, converti en
`position="footer"` pour être enfin instrumenté.

---

## 3. Bloc 3 — `/guides`, le gabarit le plus abîmé

Trois défauts, tous corrigés :

1. Le seul CTA de l'article était **en toute fin**, libellé « Créer mon carnet
   gratuit » et pointant **`/auth/login`**. La promesse et la destination ne
   coïncidaient pas : c'est le défaut corrigé au sprint 85 sur `/tarifs`, resté ici.
   → `/auth/register`, et un CTA remonté **au-dessus du corps MDX**.
2. Le second CTA vendait **`/tarifs`**, donc un **abonnement**, à un lecteur sans
   compte : l'anti-motif documenté en tête de `lib/gating/wall.ts`. Il vivait en
   plus dans une sidebar `hidden lg:block`, donc **invisible aux 82 % de mobile**.
   → remplacé par le même CTA gratuit.
3. Hero `pt-10 pb-14` et `h1` au clamp global. → `pt-7 pb-8 sm:pt-10 sm:pb-12` + `SeoTitle`.

Plus aucun lien vers `/tarifs` ni vers `/auth/login` dans le gabarit (les 3
occurrences restantes du grep sont des **commentaires** qui expliquent le correctif).

La destination est `/spots?species=<dbKey>` quand le frontmatter porte une espèce
exploitable, sinon `/spots`. ⚠️ Le frontmatter porte un **libellé** (« Bar »), pas
une clé de base : la résolution se fait dans le gabarit, avec repli explicite sur
`/spots` pour « Multi-espèces ».

---

## 4. Bloc 4 — `/especes`, le titre et rien d'autre

C'est le **seul gabarit avec un avant mesurable** (sprint 75) : tout autre
changement aurait rendu sa comparaison illisible. Seuls le titre, le hero et les
marqueurs de mesure ont bougé.

★ **La position `sticky` est volontairement EXCLUE du marqueur `data-fold="cta"`.**
Une barre collante est par construction toujours dans le viewport : la marquer
ferait passer le garde-fou « un CTA existe avant 1 000 px » sur **n'importe quelle**
page, y compris une page dont le CTA de lecture serait retombé tout en bas. C'est
exactement la confusion du sprint 85 §3, où la barre collante de la fiche spot
émettait `spot_page` sans être un mur.

---

## 5. Blocs 0 et 5 — ce qui rend la règle vérifiable

`scripts/measure-fold.mjs` (mesure et compare) et `e2e/10-pli-mobile.spec.ts`
(interdit la régression en CI). Le doublon est volontaire.

★ **Leur raison d'être** : le sprint 75 a corrigé `/especes` sur exactement ce
critère, et `/peche` a dérivé pendant **douze sprints** sans que rien ne le signale.
Une règle qu'aucune commande ne vérifie n'est pas une règle.

Les deux excluent les éléments non peints via `getClientRects().length > 0` — la
règle unifiée du sprint 85. `offsetParent` aurait été **faux** : il vaut `null` pour
tout `position: fixed`.

⚠️ **`expectAnswer` est explicite, pas une exemption silencieuse.** Un guide est de
la prose : il n'a aucun bloc de réponse structuré. En fabriquer un à partir des
premiers paragraphes serait le gabarit interchangeable que le sprint 78 a appris à
refuser. À rouvrir le jour où le frontmatter des guides portera de vrais points-clés.

---

## 6. ★ Une correction au brief, mesurée

Le brief pose que le `h1` global (`clamp(32px, 8vw, 72px)`) fait exploser les titres
SEO en mobile. **À 390 px, c'est faux** : `8vw` vaut 31,2 px, donc le clamp tombe
déjà sur son **plancher de 32 px**, et les titres tenaient **déjà** en 3 lignes.

Le gain du `SeoTitle` est donc réel mais **modeste : environ 22 % de taille, une
ligne gagnée**. Le vrai gain du sprint est **la remontée de la réponse et du CTA**,
pas le titre. Le clamp global reste justifié à réduire sur les écrans larges, où
`8vw` atteint effectivement 72 px, mais ce n'était pas le problème du mobile.

---

## 7. ⚠️ Le piège de mesure, à lire avant de juger le sprint

`seo_cta_clicked` est un événement **NOUVEAU**, pas un renommage :
`species_page_cta_clicked` reste en place et garde la continuité du sprint 75.

**`/peche` et `/guides` partaient de ZÉRO événement, pas d'un taux bas.** Aucun
avant/après en taux n'est possible sur ces deux gabarits, il n'y a pas d'avant.

- **Le repère est le VOLUME hebdomadaire absolu**, découpé par `template`.
- **La base est 0** pour `peche` et `guide` : toute valeur non nulle est un gain.
- `/especes` est le seul gabarit comparable.

C'est la **troisième fois de suite** qu'un sprint change une surface et rend un taux
incomparable (sprint 85 §3 `spot_page`, sprint 86 §5 `pending_catch`). Le réflexe à
prendre : quand la surface bouge, le dénominateur change, et seul le volume parle.

---

## 8. ⚠️ Un problème réel, NON causé par ce sprint : `/` n'est plus pré-rendue en local

`pnpm check:prerender` échoue sur **1 témoin sur 4** : la home est rendue
dynamiquement. **Reproductible sur deux builds consécutifs**, donc ce n'est pas le
bruit documenté au sprint 85.

**Ce n'est pas le sprint 87**, et voici pourquoi :

- `app/(marketing)/page.tsx`, `lib/marketing/home-data.ts` et toute leur chaîne
  d'imports sont **non modifiés** (`git status`) ;
- **aucun** de mes fichiers n'est importé par la home (vérifié par grep) ;
- les deux tests de staticité (`marketing-layout-is-static`, `seo-pages-are-static`)
  sont **verts** : aucun accès aux cookies dans l'arbre serveur ;
- la **production sert `/` depuis le cache** (`Age: 2787` au moment du contrôle),
  donc le build déployé, antérieur à ce sprint, l'a bien pré-rendue.

Reste une cause probable, non prouvée : la home dépend d'appels externes
(`fetchSpotConditions`, Open-Meteo) au moment du build, et quatre builds en une
heure depuis la même IP peuvent avoir déclenché une limitation. **À confirmer sur le
build Vercel** : si `/` y est pré-rendue, c'était bien local. Sinon, c'est un
chantier à ouvrir, et il est antérieur à ce sprint.

---

## 9. Passe de vérification

| Contrôle | Résultat |
|---|---|
| `pnpm test` | **1 637 / 1 638** (le flake `security-headers`, 7/7 en isolation) |
| `pnpm build` · `pnpm typecheck` · `pnpm lint` | verts, 0 erreur, 0 warning |
| `node scripts/measure-fold.mjs` (build local) | ✅ les 3 gabarits |
| `pnpm check:prerender` | ⚠️ 3/4, cf §8 |
| Routes pré-rendues | 74 → **79** |
| `git diff -- supabase/migrations/` | **vide** |
| Sprint 83 : `spot-title.ts`, `SpotUpLinks`, `NearbySpotsSection`, `sitemap.ts`, `robots.ts` | **vide** |
| Sprint 86 : `lib/drafts/` | **vide** |
| `lint-copy-dashes` | 16, repère inchangé |

---

## 10. Reste manuel John

1. Merger, déployer, **noter l'heure exacte**.

   > Poussé sur `main` le **18/08/2026 à 01:35** (commit `4be7129`). Vercel déploie
   > automatiquement depuis `main`. **J+14 = 01/09/2026** pour le volume de
   > `seo_cta_clicked` par `template`.

2. ★ **Vérifier `/` sur le build Vercel** (cf §8). C'est le seul point ouvert du
   sprint, et il décide s'il y a un chantier ou non.
3. Rejouer `node scripts/measure-fold.mjs` **contre la prod** après déploiement :
   les chiffres doivent rejoindre ceux de l'après du `BASELINE.md`.
4. **Rejouer le parcours sur un vrai téléphone.** Toute la mesure de ce sprint passe
   par une émulation, faute de pouvoir descendre sous 500 px dans Chrome desktop.
5. À J+14 : le **volume** hebdomadaire de `seo_cta_clicked` par `template`. Base 0
   pour `peche` et `guide`. **Ne pas lire de taux** (cf §7).
6. Restes des sprints précédents, inchangés : le cas « cookies bloqués » du sprint 86
   à exercer, l'insight PostHog d'activation, le reset sur Gmail et Outlook.
7. `_to_delete/` traîne toujours en non suivi (deux fichiers de verrou git vides,
   résidus d'un `index.lock` orphelin) : supprimable sans risque.
