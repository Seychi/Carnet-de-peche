# Sprint 90 — RECAP

## « Rendre le budget de crawl à la découverte »

> Brief : `docs/sprint-90/BRIEF.md` · Base : `main` = `6ea2533`.
> Exécuté le **2026-08-26**. **Aucune migration.** Rien poussé.

---

## Résumé en une phrase

Les 9 routes applicatives passent en `noindex`, les 4 pages publiques gagnent leur canonique, un verrou empêche les deux défauts de revenir, et le brief s'est trompé sur un fichier que la vérification a rattrapé.

---

## Bloc 1 — `noindex` sur les routes applicatives

**9 routes traitées.** Convention du repo respectée : `robots: { index: false, follow: false }` dans le `metadata`, la même forme que les 8 pages qui en portaient déjà un.

| Route | Fichier |
|---|---|
| `/compte/abonnement` | `app/(app)/compte/abonnement/page.tsx` |
| `/compte/abonnement/cancel` | `…/cancel/page.tsx` |
| `/compte/abonnement/success` | `…/success/page.tsx` |
| `/sorties` | `app/(app)/sorties/page.tsx` |
| `/notifications` | `app/(app)/notifications/page.tsx` |
| `/moderation` | `app/(app)/moderation/page.tsx` |
| `/spots/proposer` | `app/(app)/spots/proposer/page.tsx` |
| `/spots/mes-propositions` | `app/(app)/spots/mes-propositions/page.tsx` |
| `/auth/reset-password` | ★ `app/auth/reset-password/**layout.tsx**` |

### ★ Le brief se trompait de fichier sur la neuvième

Il demandait de poser le `noindex` dans `app/auth/reset-password/page.tsx`. **Cette page porte `'use client'`** : un composant client ne peut pas exporter `metadata`, l'export aurait été **ignoré en silence** et la page serait restée indexable en donnant l'illusion du contraire.

Le `metadata` va donc dans le `layout.tsx` voisin, qui existe déjà et porte le `title` **pour exactement cette raison** depuis le sprint 9.5. Le commentaire du fichier le dit noir sur blanc : « La page reset-password est un client component → title défini ici (server). »

C'est un défaut qu'aucun test n'aurait attrapé et qu'un `curl` sur la preview aurait mis des semaines à révéler.

### Sur `follow: false`, et pourquoi `/auth/login` garde `follow: true`

Les 9 routes reçoivent `follow: false` : ce sont des pages privées, il n'y a rien à suivre depuis elles. `/auth/login` conserve délibérément `follow: true` (sprint 85, Bloc 1) parce que c'est une vraie page d'entrée qui pointe vers l'inscription et a donc des liens à transmettre. Les deux choix sont documentés dans leur fichier.

### `/carnet`, `/profil`, `/home`, `/onboarding` : laissés tels quels, et vérifié plutôt que supposé

Le brief demandait de constater qu'ils sont couverts par le `disallow` de `robots.ts`. Constat fait, et complété par une **mesure en production** :

```
/onboarding    307 → /auth/login?redirect=%2Fonboarding
/onboarding/1  307 → /auth/login?redirect=%2Fonboarding%2F1
/home          307 → /auth/login?redirect=%2Fhome
/profil        307 → /auth/login?redirect=%2Fprofil
```

★ **Une faille théorique que le brief n'avait pas vue, et qui n'en est pas une.** Le `disallow` porte `/onboarding/` **avec un slash final**, ce qui ne couvre pas la route nue `/onboarding`. Elle serait donc explorable. Sauf que le middleware la renvoie en 307 vers la connexion avant de servir quoi que ce soit : Googlebot n'y voit jamais de contenu.

Le groupe `(app)` est donc protégé par **deux couches indépendantes** — le garde du middleware, puis `robots.txt` — et le `noindex` en serait une troisième. Rien à corriger, mais la raison est maintenant mesurée.

`app/robots.ts` **n'a pas été touché**, conformément à l'encadré du brief.

---

## Bloc 2 — `canonical` sur les 4 pages publiques

| Page | Canonique posée |
|---|---|
| `/contact` | `https://www.carnet-de-peche.com/contact` |
| `/legal/cgu` | `https://www.carnet-de-peche.com/legal/cgu` |
| `/legal/confidentialite` | `https://www.carnet-de-peche.com/legal/confidentialite` |
| `/legal/mentions-legales` | `https://www.carnet-de-peche.com/legal/mentions-legales` |

Les quatre restent indexées, c'était le but : le correctif est d'ajouter la balise, pas de sortir les pages.

**Contrôle du chemin de `/contact` contre le sitemap** : `app/sitemap.ts:11` définit `BASE_URL = 'https://www.carnet-de-peche.com'` et la ligne 27 déclare `` `${BASE_URL}/contact` ``. La canonique posée est identique au caractère près.

---

## Bloc 3 — Le verrou

**`__tests__/seo-canonical-and-robots.test.ts`**, 6 cas, sans build. Deux règles :

1. Toute page de `(marketing)` porte **soit** une `alternates.canonical`, **soit** un `robots: { index: false }`.
2. Toute page de `(app)` et de `auth/` porte un `noindex` **ou** tombe dans le `disallow`.

Le `disallow` est **lu depuis `app/robots.ts`** par expression régulière, jamais recopié : si quelqu'un retire un préfixe du fichier, le test se resserre tout seul au lieu de valider sur une copie périmée.

### Preuve qu'il mord

Régressions injectées, puis retirées :

```
canonical retiré de /contact  →  ⛔ /contact      (échec)
noindex retiré de /sorties    →  ⛔ /sorties      (échec)
```

Chaque échec nomme la route exacte et explique quoi faire, avec l'avertissement « ne PAS la mettre au disallow pour aller plus vite ».

### ★ Le test s'est trompé avant moi, et c'est instructif

Premier passage : **3 échecs** sur `/especes/[slug]`, `/peche/[...slug]` et `/spots`. Ces trois pages **ont** une canonique, écrite en **propriété abrégée** : `alternates: { canonical }`, la valeur ayant été calculée juste au-dessus. Ma regex cherchait `canonical\s*:` et ne la voyait pas.

C'était **le détecteur qui avait tort, pas les pages**. Corrigé en cherchant le mot `canonical` après retrait des commentaires. La leçon vaut d'être écrite : un verrou qu'on n'exécute pas avant de le croire est un verrou qui ment.

Au passage, mon relevé manuel initial avait déclaré le groupe `(marketing)` « propre » à tort, à cause d'une précédence fautive dans un `if ! grep … && grep …` de shell. **C'est le test qui a rattrapé le relevé humain**, pas l'inverse.

### `CLAUDE.md` §6

Une ligne ajoutée à côté des verrous du sprint 84, avec l'anti-pattern en avertissement dur.

---

## Bloc 4 — Hôtes, redirections, 404

Bloc de constat, **aucun code modifié**.

### ★ Le brief annonçait un 301, la réalité est un 308

Mesuré depuis la machine de John, donc une IP résidentielle (le WAF Vercel répond 403 aux IP datacenter, cf sprint 88 Bloc 6) :

| URL | Code | Cible |
|---|---|---|
| `https://carnet-de-peche.com/` | **308** | `https://www.carnet-de-peche.com/` |
| `https://carnet-de-peche.com/spots` | **308** | `https://www.carnet-de-peche.com/spots` |
| `https://carnet-de-peche.com/especes/bar` | **308** | `https://www.carnet-de-peche.com/especes/bar` |
| `https://www.carnet-de-peche.com/` | 200 | |
| `https://www.carnet-de-peche.com/spots` | 200 | |
| `https://www.carnet-de-peche.com/especes/bar` | 200 | |

**308 et non 301.** Les deux sont des redirections permanentes et Google transmet les signaux de la même façon, donc **rien à corriger** : la redirection fonctionne. Mais le brief l'annonçait en 301 par déduction depuis la ligne « Déplacement permanent (301) : 0,19 % » du rapport d'exploration, et cette ligne agrège vraisemblablement les 308 sous le libellé 301. La différence est sans conséquence ici ; elle méritait d'être constatée plutôt que reconduite.

La redirection n'est ni dans `vercel.json`, ni dans `next.config.ts`, ni dans `middleware.ts` : elle vient bien de la configuration de domaine Vercel.

### Les 9 « Introuvable » et le 5xx : arrêt demandé par le brief

Leur liste nominative n'est lisible que dans la Search Console (Pages → Introuvable → exemples), inaccessible depuis la session. **⚠️ Le bloc s'arrête là**, comme le brief l'impose, et l'export est demandé au reste manuel.

---

## Vérifications

| Contrôle | Résultat |
|---|---|
| `pnpm typecheck` | ✅ 0 erreur |
| `pnpm lint` | ✅ `No ESLint warnings or errors` |
| `pnpm test` | ✅ **1704 / 1704**, 135 fichiers sur 135 |
| `pnpm build` | ✅ exit 0, à froid |
| `pnpm check:prerender` | ✅ 5 témoins sur 5 |
| **Routes pré-rendues** | ✅ **83**, contre **73** exigées par le brief : le rendu statique du sprint 84 est intact |
| `git diff app/robots.ts app/sitemap.ts` | ✅ **vide**, les deux fichiers intacts |
| `<title>` de `/spots/*` et `/especes/*` | ✅ aucun touché (fenêtre S83 jusqu'au 07/09) |
| Migrations | ✅ aucune |
| `lint-copy-dashes` | ✅ 16 occurrences, **toutes préexistantes**, aucune dans les fichiers du sprint |

### ⚠️ Sur les tests, une précision qui compte

Deux exécutions successives de `pnpm test` ont donné **12 échecs puis 3**, sur des fichiers différents à chaque fois. Ce n'est pas une régression, c'est la contention déjà documentée aux sprints 88 et 89 : des tests qui dépassent le délai de 5 000 ms quand la machine est chargée.

Plutôt que de le déclarer par confort, je l'ai **démontré** :

```
pnpm vitest run --no-file-parallelism --testTimeout=30000
→ Test Files 135 passed (135)   Tests 1704 passed (1704)
```

Zéro échec en exécution séquentielle. C'est la façon de trancher la question à l'avenir.

---

## ★ Un défaut trouvé dans un test existant, et corrigé

`__tests__/seo-metadata-length.test.ts` a échoué en annonçant trois titres de **249, 255 et 264 caractères**. Les titres concernés en font une trentaine.

Cause : `literalValue` lit d'une clé de métadonnée jusqu'à la suivante, et **avalait les lignes de commentaire** placées entre deux clés, dont les guillemets étaient comptés comme du titre. Le message d'échec accusait donc la longueur du titre et envoyait chercher au mauvais endroit.

Ce n'est pas mon code qui était fautif, c'est le parseur : mes commentaires n'ont fait que révéler un angle mort qui attendait n'importe quel commentaire écrit entre deux clés.

Corrigé en neutralisant les lignes de commentaire avant lecture, en préservant la structure des lignes dont dépendent les regex. **Vérifié dans les deux sens** : le test passe sur l'état courant, et il attrape toujours un vrai titre trop long (98 caractères, correctement rapporté).

---

## Reste manuel John

1. **Resoumettre le sitemap** dans la Search Console. En attente depuis le 17/08, c'est le reste manuel n°5 du RECAP 83.
2. **Exporter la liste des 9 « Introuvable (404) »** et du 1 « Erreur serveur (5xx) » : Search Console → Pages → cliquer la ligne → onglet Exemples. Sans cette liste, le bloc 4 ne peut pas se clore.
3. **Relever le rapport de couverture à J+21**, soit vers le **16/09**. La ligne « Page en double sans URL canonique » doit être passée de **17 à 0**. ★ C'est le seul critère de succès de ce sprint, et il ne se lit pas avant.
