# Sprint 75 — RECAP (PARTIEL)
## « Le mur gratuit et la fiche qui convertit »

> État au 2026-08-08, branche `sprint-75` (base `13d42c8`). **Sprint NON terminé.**
> **Bloc 1, Bloc 4 (titles/metas) et le cœur du Bloc 2 livrés et vérifiés. Migration 109 en prod.**
> **Restent : fin du Bloc 2 (saisons, postes), Bloc 3, `guides-map.ts`, Bloc 5.**
> Code **non commité, non poussé**.
> Portes : `typecheck` OK · `lint` 0 warning · **1140 tests / 94 fichiers** · `build` OK.

---

## 1. Contexte d'exécution

Les 4 workstreams (Bloc 0, A, B, D) ont été lancés en parallèle puis **tués en vol par la limite de session**, chacun à mi-course. Le travail a été repris en boucle principale, en priorisant le Bloc 1 (le levier n°1 du brief) jusqu'à un état cohérent et vérifié, plutôt qu'en ouvrant des chantiers qui seraient restés cassés.

Artefacts récupérés des agents interrompus : `lib/gating/wall.ts` (+ tests), `components/map/SignupBanner.tsx`, les deux events dans `lib/analytics.ts`. Et trois modules **orphelins, non branchés** : `lib/especes/answer.ts`, `lib/especes/postes-puces.ts`, `lib/especes/seo.ts`.

---

## 2. Bloc 1 — Séparer le mur gratuit du mur payant ✅

Le bug : `isGated = userTier === 'anonymous' || userTier === 'discovery'` servait le même message aux deux publics. On vendait un abonnement à 4,90 € à des visiteurs qui n'ont pas encore de compte gratuit. Sur 30 jours : 35 paywalls vus depuis les moteurs, **0 clic**, 1 compte créé.

**La règle est désormais unique**, dans `lib/gating/wall.ts` :
`getWallKind(tier)` → `signup` (anonyme) · `upsell` (inscrit gratuit) · `none` (abonné). Défaut = `signup` : on ne vend jamais par défaut.

| Surface | Anonyme (avant → après) | Inscrit gratuit |
|---|---|---|
| `MapFilters` | « Passe en Local » → mur d'inscription | upsell inchangé |
| `MapShell` (bandeau) | aucun bandeau → `SignupBanner` (cookie dédié, 7 j) | `UpsellBanner` inchangé |
| `NearbyPanel` | rien → mur d'inscription en pied de panneau | upsell inchangé |
| `ScorePanel` | « Réservé aux abonnés » → mur d'inscription | upsell inchangé |
| `SpotPopup` | « Coords réservées aux abonnés + /tarifs » → mur d'inscription, retour sur la fiche après signup | upsell inchangé |
| `MapLayerSelector` | pilules « Débloquer » vers /tarifs → mention neutre « Abonnés », **sans lien de prix** | upsell inchangé |
| `/spots/[slug]` | « Voir les formules » → mur d'inscription | upsell inchangé |

**Décision de copy sur `MapLayerSelector`** : ces couches restent payantes même avec un compte. Y afficher « crée ton carnet » aurait été une **promesse fausse** (le compte gratuit ne les débloque pas). On s'est donc contenté de retirer la surface de prix aux anonymes ; le CTA d'inscription vit dans le bandeau de carte, où il est honnête.

**Invariants tenus** : aucune RPC, aucune policy RLS, aucun `current_tier` touché. Le gating des **données** (3 spots/département, coordonnées floutées, pas de score, pas de filtres) est strictement identique. `paywall_viewed` est désormais réservé aux inscrits gratuits ; les anonymes émettent `signup_wall_viewed` / `signup_wall_clicked` avec une `surface` stable.

---

## 3. Migration 109 — hors brief, trouvée en chemin ✅

`get_top_spots_for_species` est `SECURITY DEFINER` : elle **contourne la RLS** qui, elle, restreint bien `anon` aux spots approuvés. Son filtre interne ne portait que sur `visibility = 'public'`.

**Prouvé en prod avant correctif** (rôle `anon`, ids capturés puis vérifiés hors RLS) : `get_top_spots_for_species('bar', null, 24, 90)` renvoyait 24 lignes dont **1 `pending`**. Or `/spots/<slug>` filtre bien les non-approuvés et répond **404** : le bloc « meilleurs spots » des fiches espèces servait donc des **liens internes morts**, sur les pages mêmes que ce sprint veut faire convertir.

**Après correctif** : 0 non-approuvé sur `bar`, `mulet`, `congre`. Changement strictement restrictif (il ne peut que retirer des lignes), signature inchangée, gating des coordonnées et k-anon K=3 recopiés à l'identique.

---

## 4. Bloc 4 — Titles et metas qui portent la réponse ✅

`generateMetadata` de `/especes/[slug]` ne décrit plus le site : il sert la **donnée actionnable** que les gens tapent. Construction pure et dégradante (`lib/especes/seo.ts`) : rien n'est inventé, une espèce sans maille retombe sur l'intention pêche, jamais sur « undefined ».

Les deux pages prioritaires du brief :

| Page | Avant | Après |
|---|---|---|
| `/especes/maigre` (894 impr., 1,9 %) | « Maigre : pêche du bord, saisons & taille légale » | **« Maigre : maille 45 à 50 cm (2026), saisons et spots du bord »** |
| `/especes/mulet` (834 impr., 2,5 %) | « Mulet : pêche du bord, saisons & taille légale » | **« Mulet : maille 30 cm (2026), saisons et spots du bord »** |

Description du maigre : « Maille du maigre : 50 cm en Manche et Atlantique, 45 cm en Méditerranée. Marquage obligatoire. En été, c'est la pleine saison. » Elle répond littéralement à la requête observée « maille du maigre 2026 ».

**Vérifié sur les 26 espèces réelles** : titles 51 à 60 caractères, descriptions 115 à 153, tous **distincts** (pas de duplicate content), zéro `undefined`, zéro tiret cadratin. Verrouillé par `lib/especes/__tests__/seo.test.ts` (114 tests, sur la donnée de production et non des fixtures). Canonical, OG et JSON-LD inchangés.

---

## 4bis. Bloc 4 — Liens vers les guides ✅ (le brief se trompait)

Le brief demandait de créer un mapping espèce → guides parce que « les 6 guides existants sont bons mais **orphelins** ». **C'est faux** : la fiche espèce (`especes/[slug]/page.tsx`) et la fiche spot (`spots/[slug]/page.tsx`) chargent et affichent déjà un bloc « Guides liés ». Créer un `guides-map.ts` aurait fait doublon.

**Le vrai défaut était ailleurs**, et il était silencieux. Les deux pages faisaient :

```ts
guides.filter((g) => g.species === label || g.species === 'Multi-espèces').slice(0, 3)
```

Un filtre sans tri, puis une coupe à 3 sur une liste ordonnée **par date**. Sur un catalogue de 6 guides dont 3 multi-espèces récents, `/especes/bar` pouvait n'afficher **aucun** de ses deux guides dédiés. La fiche spot allait jusqu'à documenter en commentaire (« espèces du spot d'abord, multi-espèces ensuite ») un comportement que le code ne faisait pas.

Corrigé par `lib/guides/related.ts` (`relatedGuidesFor`), règle écrite une seule fois et utilisée par les deux pages : dédiés d'abord, multi-espèces ensuite, ordre par date conservé à l'intérieur de chaque groupe. **7 tests** couvrent le catalogue réel, dont la régression exacte.

Catalogue vérifié : 6 guides publiés (2 bar, 1 dorade royale, 3 multi-espèces) ; le loader exclut déjà `_TEMPLATE` et les brouillons.

---

## 5. Bloc 2 — La réponse d'abord (cœur livré) ✅

`components/especes/species-answer.tsx`, inséré **entre le H1 et l'intro**. Il porte la maille par façade (mono, gros), le **statut du jour calculé** par façade, le quota journalier et le marquage, plus la date de vérification et la source. Tout est dérivé de `lib/regulation` via `lib/especes/answer.ts` (15 tests) : rien n'est écrit en dur, une donnée absente n'affiche rien.

**Daltonisme** : le statut n'est jamais porté par la teinte seule. Chaque état a son libellé explicite (« Pêche ouverte », « Pêcher-relâcher obligatoire jusqu'au 31 mars ») **et** sa forme d'icône distincte.

Ajouté aussi le **CTA contextuel précoce** (« Loguer une prise du maigre » + « Gratuit. Ton carnet te dira quand tes prises tombent »), là où l'ancien CTA était ligne 478 sur 494.

### Mesures (build de prod local, viewport 390 px)

| Fiche | H1 + maille + statut dans le 1er écran | 1er CTA de contenu | Débordement |
|---|---|---|---|
| `/especes/maigre` | ✅ | **6 %** (537 px) | 0 px |
| `/especes/mulet` | ✅ | **5 %** (475 px) | 0 px |
| `/especes/bar` | ✅ | **7 %** (654 px) | 0 px |

Le brief demandait un CTA avant 40 % de la hauteur : on est à 5-7 %, et dans le premier écran.

**Indexabilité vérifiée sur le HTML servi** (`curl` sur le build de prod) : `Réglementation en bref`, `Taille minimale`, `50 cm`, `Aujourd'hui`, `Pêche ouverte` (une par façade), `Marquage obligatoire` et le nouveau `<title>` sont tous présents côté serveur. Rien n'est monté au clic.

### « Où se poster » élagué ✅

Les 3 paragraphes deviennent **4 à 6 puces** (label mono + phrase concrète, `lib/especes/postes-puces.ts`). Chaque puce est la condensation d'une phrase existante, jamais un fait ajouté. Règle appliquée : une phrase vraie pour n'importe quelle espèce dégage ; on garde les chiffres, les seuils et les postes nommés.

**La prose d'origine reste dans le HTML servi**, dans un `<details>` natif (jamais un montage au clic). Vérifié en live : « dernières heures de montante et la première heure de descendante concentrent… » est bien présent dans le HTML de `/especes/bar`.

### Saisons compactées ✅

`components/especes/species-seasons.tsx` : les 8 blocs de prose (4 saisons × 2 façades) deviennent une **frise de 4 lignes**, l'activité des deux façades côte à côte. La saison **en cours** est mise en avant (fond teinté + badge « EN COURS ») et sa note est la seule ouverte par défaut, sous le libellé « Ce qui se passe en ce moment ». Les autres notes sont dans un `<details>` natif, donc **toujours dans le HTML servi**.

Sémantique de couleur reprise telle quelle de la fiche d'origine (DA v2 : high teal / mid gold / low ink) : j'avais commencé par l'inverser, corrigé. L'activité reste lisible sans la teinte (nombre de pastilles pleines + libellé texte).

### Longueur de page, mesurée à chaque étape

| Fiche | Avant sprint | Après Bloc 3 | Après compaction |
|---|---|---|---|
| maigre | 8 857 px | 8 662 px | **8 324 px** |
| mulet | 9 018 px | 8 967 px | **8 573 px** |
| bar | 8 928 px | 9 211 px | **8 873 px** |

Lecture honnête : le gain net en pixels est modeste (2 à 6 %). Ce que la page a vraiment gagné, c'est **ce qu'elle contient à hauteur égale** : le bloc réponse, un CTA à 5-7 % de la hauteur, et tout le maillage vers les spots et les pages `/peche`, qui n'existaient pas avant.

---

## 6. Bloc 3 — Le pont espèce → spots → carte ✅

`SpeciesTopSpots` étendu (le composant existait déjà, cf §7) : spots **groupés par département**, 8 au lieu de 6, lien vers la landing de l'espèce, et maillage vers les pages programmatiques.

**Garde-fou anti-404** (`lib/especes/programmatic-links.ts`) : on ne construit jamais une URL à la main, on **filtre la liste des pages réellement générées** par `getAllProgrammaticPages()`. Seules 6 des 26 espèces ont des pages `/peche`, et chacune seulement sur les départements où elle est pêchable. Vérifié en live sur `/especes/bar` : **6 liens générés, les 6 répondent 200.**

Compteur honnête : `countSpotsForSpecies` passe par la **RLS** (client de session), donc il compte exactement ce que `/spots?species=` affichera. Vérifié : « Voir les 367 spots à bar », et `anon` voit bien 367 en base. *(L'écart avec les 350 mesurés en début de sprint vient de la lane curation qui approuve des spots en parallèle : le compteur suit la donnée réelle.)*

Coût DB : **+1 requête** par fiche (un `count` en `head: true`, lancé en parallèle de la RPC existante). Pas de N+1.

### Passe anti-fuite GPS

Aucune coordonnée n'est exposée : le type `TopSpot` ne porte pas `lng`/`lat` (la RPC les gate et le mapping les omet). Recherche de paire lat/lng dans le HTML servi : **0**. Les 3 nombres à 4+ décimales trouvés sont, après vérification, une valeur d'échantillonnage Sentry et la chaîne décorative `47.8709°N · 4.3741°O` **codée en dur** dans `components/layout/Footer.tsx:166` (`aria-hidden`, motif DA v2 présent sur toutes les pages).

---

## 7. Bloc 5 — Mesurer le funnel SEO → compte ✅

Quatre events, tous côté client via `lib/analytics.ts` (donc gatés par le consentement RGPD S26, no-op si refusé) :

| Event | Propriétés | Où |
|---|---|---|
| `signup_wall_viewed` | `surface` | les 7 surfaces de gating (Bloc 1) |
| `signup_wall_clicked` | `surface` | CTA de chaque mur d'inscription |
| `species_page_cta_clicked` | `species`, `position` | CTA de fiche espèce (`inline` aujourd'hui) |
| `species_to_spot_clicked` | `species`, `spot_slug` | chaque lien fiche espèce → fiche spot |

`paywall_viewed` et `upsell_clicked` restent **réservés aux inscrits gratuits** : c'est cette séparation qui permet enfin de répondre à « le trafic SEO bute-t-il sur *crée un compte* ou sur *paie un abonnement* ». Instrumentation portée par `components/especes/tracked-links.tsx`, la plus petite frontière client possible : la fiche reste un Server Component et son contenu reste dans le HTML servi.

### Requête de suivi (HogQL) — à relancer à J+14 et J+30

```sql
SELECT
  countIf(event = 'signup_wall_viewed')        AS murs_inscription_vus,
  countIf(event = 'signup_wall_clicked')       AS murs_cliques,
  countIf(event = 'paywall_viewed')            AS paywalls_vus_inscrits,
  countIf(event = 'species_page_cta_clicked')  AS cta_fiche_espece,
  countIf(event = 'species_to_spot_clicked')   AS espece_vers_spot,
  countIf(event = 'signup_completed')          AS comptes_crees
FROM events
WHERE timestamp > now() - INTERVAL 14 DAY
```

Le même funnel par page d'entrée, pour isoler le trafic moteurs :

```sql
SELECT
  properties.$entry_pathname                    AS page_entree,
  uniqIf(person_id, event = 'signup_wall_viewed')  AS visiteurs_mur_vu,
  uniqIf(person_id, event = 'signup_wall_clicked') AS visiteurs_clic,
  uniqIf(person_id, event = 'signup_completed')    AS comptes
FROM events
WHERE timestamp > now() - INTERVAL 14 DAY
  AND properties.$entry_referring_domain LIKE '%google%'
GROUP BY page_entree
ORDER BY visiteurs_mur_vu DESC
LIMIT 20
```

⚠️ Rappel du S74 : **PostHog sous-compte d'un facteur ~2** face à la DB (gate de consentement). Utiliser ces chiffres pour les **ratios** entre étapes, pas pour les volumes absolus.

### Suivi SEO mensuel (Supermetrics GSC)

Compte `redkps4@gmail.com`, site `sc-domain:carnet-de-peche.com`. Trois vues à rejouer chaque mois, identiques à l'analyse du 06/08 :
1. **Par `pathlevel1`** (clics, impressions, CTR, position) : c'est elle qui a révélé `/especes` à 1,7 % contre `/spots` à 8,4 %.
2. **Par `query`** : sépare les requêtes-définitions (CTR 0 %, abandonnées) des requêtes pêche.
3. **Par `device`** : elle a établi les 82 % de mobile qui commandent toutes les décisions d'UI du sprint.

**Le repère à surveiller** : CTR de `/especes` avant/après. Base de départ = **1,7 %** sur 90 jours (97 clics / 5 667 impressions).

---

## 8. Ce qui reste à faire

| Bloc | État |
|---|---|
| Bloc 0 — `anchor.md` | ❌ non écrit (données recueillies, cf §6) |
| Bloc 2 — bloc réponse + CTA précoce | ✅ cf §5 |
| Bloc 2 — postes élagués | ✅ cf §5 |
| Bloc 2 — saisons compactées | ✅ cf §5 |
| Bloc 3 — maillage espèce → spots | ✅ cf §6 |
| Bloc 4 — liens vers les guides | ✅ cf §4bis (le brief se trompait, cf §10) |
| Bloc 5 — mesure du funnel | ✅ cf §7 |
| VERIF — QA carte anonyme/connecté en 390 px | ✅ 9/9, cf §9 |

**Le plus rentable à reprendre** : compacter les 8 blocs de saisons (4 saisons × 2 façades) en un tableau ou une frise, avec la saison en cours mise en avant et la prose au dépliement. C'est le seul levier restant sur la longueur de page, qui reste à ~8 700-9 200 px.

Puis la QA carte : le Bloc 1 a été vérifié par le typecheck, le lint et le build, mais **pas encore par un parcours anonyme réel sur `/carte`**. C'est le contrôle qui manque pour affirmer « zéro mention de prix pour un visiteur sans compte ».

---

## 9. QA réelle du Bloc 1 (build de prod local, 390 px) — 9/9 ✅

Pilotée au navigateur sur les données Supabase de production. Script : `scratchpad/qa-carte.mjs`. C'est le contrôle qui manquait : le typecheck et le build disent que le code prévoit la bonne chose, seul un parcours réel prouve ce que voit un visiteur.

| Vérification | Résultat |
|---|---|
| `/carte` anonyme : zéro mention de prix (`4,90`, `€`, « Voir les tarifs », « Passe en Local »…) | ✅ |
| `/carte` anonyme : mur d'inscription visible avec CTA | ✅ |
| Panneau Filtres anonyme : zéro prix | ✅ |
| Fiche spot anonyme : zéro prix, mur d'inscription présent | ✅ |
| Anonyme : aucune erreur JS | ✅ |
| **Anti-régression : le compte gratuit voit TOUJOURS l'upsell Local** | ✅ |
| Le compte gratuit ne voit PAS le mur d'inscription | ✅ |

Capture `carte-anonyme-390.png` : bandeau « Crée ton carnet, c'est gratuit. Tes prises, les marées de tes spots et le fil de ton département. » + CTA « Créer mon carnet », sans recouvrir les FAB géoloc de la colonne droite.

Compte de test utilisé pour le tier gratuit : `redkps4+qa74@gmail.com` (créé à la QA du sprint 74).

---

## 10. Fichiers du sprint

**Nouveaux** : `lib/gating/wall.ts` (+ tests) · `components/map/SignupBanner.tsx` · `lib/especes/answer.ts` (+ 15 tests) · `lib/especes/seo.ts` (+ 114 tests) · `lib/especes/postes-puces.ts` · `lib/especes/programmatic-links.ts` · `components/especes/species-answer.tsx` · `components/especes/tracked-links.tsx` · `supabase/migrations/109_top_spots_approved_only.sql`

**Modifiés** : `components/map/{MapFilters,MapShell,NearbyPanel,ScorePanel,SpotPopup,MapLayerSelector}.tsx` · `app/(map)/carte/page.tsx` · `app/(marketing)/spots/[slug]/page.tsx` · `app/(marketing)/especes/[slug]/page.tsx` · `components/especes/species-top-spots.tsx` · `lib/especes/top-spots.ts` · `lib/analytics.ts`

⚠️ **Hors périmètre, ne pas commiter avec le sprint** : `scripts/import-osm-spots.ts`, `supabase/seed-spots-import-osm-*`, `docs/contenu/curation-spots/*` appartiennent à la lane curation (autre session).

---

## 10. Trois corrections au brief, pour la reprise

1. **Le composant `SpeciesTopSpots` existe déjà** sur la fiche espèce (`app/(marketing)/especes/[slug]/page.tsx:441`). Le Bloc 3 est une **extension** (groupement par département, passage à ~8, lien « voir les N spots »), pas une création.
2. **Seules 6 espèces ont des pages `/peche/*`** : `bar`, `dorade-royale`, `lieu-jaune`, `maquereau`, `sar`, `orphie` (matrice `SPECIES_TECHNIQUES` de `lib/seo/programmatic.ts`, volontairement partielle). Mailler les 20 autres fabriquerait des 404.
3. **Piège de slug** : la colonne DB utilise des underscores (`dorade_royale`, `lieu_jaune`), les slugs SEO des tirets (`dorade-royale`). Toute jointure espèce ↔ spots doit convertir.

### Fausse alerte levée (à ne pas re-découvrir)

J'ai d'abord cru que `/spots` listait 807 spots non approuvés, dont 150 rejetés. **C'est faux** : mes requêtes tournaient en service-role et bypassaient la RLS. L'annuaire sert bien 354 liens, tous valides. Seule la voie `SECURITY DEFINER` échappait au filtre, d'où la 109.

### Données du Bloc 3 (déjà mesurées)

Les 26 espèces ont toutes des spots approuvés : `bar` 350 (24 dépts), `seiche` 216, `maquereau` 204, `dorade_royale` 203, `mulet` 187, `congre` 165 … `marbre` 14 (7 dépts). Le « cas vide » du Bloc 3.4 ne se déclenchera jamais en pratique, mais reste à implémenter défensivement.

---

## 7. Reste manuel John

- Décider de la suite : reprendre par la fiche espèce (Bloc 2, le plus gros morceau) ou par le reste.
- Rien n'est commité : `git status` sur la branche `sprint-75` montre l'état exact.
- **Décision Vercel toujours ouverte** : CPU Hobby dépassé (7 h 34 / 4 h), les 503 servis aux crawlers pénalisent un trafic qui monte.
- ⚠️ Les fichiers `scripts/import-osm-spots.ts`, `supabase/seed-spots-import-osm-*` et `docs/contenu/curation-spots/*` appartiennent à ta lane curation (autre session) : je n'y ai pas touché et ils ne sont pas dans mon périmètre.
