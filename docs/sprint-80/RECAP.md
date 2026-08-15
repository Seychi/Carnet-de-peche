# Sprint 80 — RECAP
## La première réponse

> **Statut au 2026-08-15, 14h45** : code complet sur `main`, **non commité, non poussé** au
> moment où cette ligne est écrite. ⚠️ Ligne **datée** : la vérité est HEAD de `main` et la
> prod, jamais cette phrase.
>
> **Aucune migration.** Aucune RPC, aucune policy RLS touchée.
> **1320 tests verts** (108 fichiers), build OK, `tsc --noEmit` OK, `next lint` OK.

---

## Bloc 0 — La preuve mécanique (gate du sprint)

Le sprint 79 a été **poussé (`9b1109c`) et déployé** avant de commencer celui-ci, comme
l'exige le préalable §2. Déploiement Vercel constaté ~3,5 min après le push.

**Les quatre correctifs du S79, rejoués en PRODUCTION en 390 × 664 :**

| Correctif | Preuve | ✅ |
|---|---|---|
| Le CTA de `/carte` reçoit le clic, sans cookie de consentement | `elementFromPoint()` au centre renvoie le CTA. Barre z-40 **334 → 484**, bandeau z-60 **484 → 652**, colonne de FAB z-50 **198 → 322**. Chevauchement : **0** | ✅ |
| Le clic mène à la bonne page | Clic réel → `/auth/register?redirect=%2Fcarte`, **H1 = « Crée ton carnet »** | ✅ |
| `/carnet/nouvelle` ne redirige plus | HTTP 200, « Choisis d'abord ton spot. », URL inchangée. `?spot_id=<slug>` résout « Pointe des Chats » | ✅ |
| Un brouillon part avec l'espèce seule | Cookie `pending-catch` écrit : `{spot_id, spot_slug, species:"bar", caught_at, released, privacy}`, **sans technique** | ✅ |
| Aucun prix pour un anonyme | `/carte`, `/spots`, `/spots/[slug]`, `/especes/bar` : aucun `4,90`, `9,90`, « Itinérant », « /mois », « Voir les formules » | ✅ |

**Captures « avant »** : `docs/sprint-80/avant-{accueil,carte,fiche-spot-curee,especes-bar-spots}.png`.

**Témoin consigné, sans conclusion tirée** : le relevé
`signup_wall_clicked / signup_wall_viewed` sur mobile porte sur une fenêtre d'observation de
**moins d'une heure** au moment de ce RECAP (S79 déployé le 15/08 vers 14h05). À cette
échelle il ne veut **rien dire** : 2 clics sur 242 en 90 jours, le volume quotidien est
minuscule. C'est une base de comparaison pour le relevé à J+14, qui tombera pendant le S81.
**Ne pas en tirer de conclusion, ne pas s'arrêter dessus.**

---

## Ce que le brief avait faux

| Bloc | Le brief disait | La mesure dit |
|---|---|---|
| **5a** | Deux liens rendus à 0 × 0 sur les fiches, « issues de conversion mortes » | ❌ **Faux positif.** Ils sont en `display: none` (`hidden lg:block` / `hidden md:block`) : ce sont les variantes DESKTOP du motif responsive du site. `getBoundingClientRect()` renvoie 0 × 0 pour tout élément `display:none`. Leurs équivalents mobiles existent et sont bien dimensionnés (301 × 44). Il n'y a rien à corriger, et « les retirer du DOM mobile » demanderait de dupliquer partout une logique de rendu conditionnel. C'est le même genre d'erreur que le lien « Aller au contenu » à 1 × 1 px que le brief corrigeait lui-même au §3 |
| **5b** | Liens de spots `/especes/bar` × 15 | 8 liens, pas 15. Taille confirmée : **293 × 37** |

---

## Bloc 1 — La fiche répond dans le premier écran

`components/spots/SpotTodayBand.tsx` (nouveau) : marée, vent, score du jour, sur une ligne,
**placée juste sous le `<h1>`**, au-dessus de « zone approchée » et des étoiles.

**⚠️ Zéro requête ajoutée.** La bande ne fetch rien : `conditions` et `weekly[0]` étaient
déjà chargés pour les sections du bas de page. Le score servi est celui que la page donne
déjà à un anonyme (`weeklyForView`, tronqué à 1 jour) : le gating reste à un seul endroit.

Hero resserré **sur mobile uniquement** (les valeurs `md:` ne bougent pas) : `pt-8 pb-14` →
`pt-5 pb-8`, et trois marges internes. Aucun contenu retiré.

**Prouvé en 390 × 664 :**

| Fiche | Bande | Position | Sans scroll |
|---|---|---|---|
| `pointe-des-chats-groix` (curée, Atlantique) | `PLEINE MER 19h32 · VENT O 22 km/h · SCORE DU JOUR 84/100` | top **241 px** | ✅ |
| `digue-d-amphise-osm1125927239` (générée, Méditerranée) | `MER Ridée · 0.2 m · VENT SO 14 km/h · SCORE DU JOUR 90/100` | top **231 px** | ✅ |

Cible du brief : premier pixel au-dessus de 560 px. Atteint avec 320 px de marge.
**Méditerranée : aucun argument de marée**, conformément au garde-fou (`isLowTidalRangeDepartment`).

★ Détail attrapé à la mesure, pas à la relecture : en 390 px les trois cellules font 66 px, et
« 22 km/h O » y était **tronqué en « 22 km/h… »**. La direction est passée dans le libellé
(`VENT O`), qui est en 10 px et a la place. Une valeur tronquée est pire que pas de valeur :
elle a l'air juste.

### Anti-régression SEO — la passe la plus importante du sprint

Comparaison du HTML servi **avant (prod) / après (build local)**, sur une fiche curée et une
fiche générée :

| | title | description | canonical | JSON-LD (sha) | H1 |
|---|---|---|---|---|---|
| `pointe-des-chats-groix` | IDENTIQUE | IDENTIQUE | IDENTIQUE | **IDENTIQUE** | IDENTIQUE |
| `plage-de-bodri-osm113823751` | IDENTIQUE | IDENTIQUE | IDENTIQUE | **IDENTIQUE** | IDENTIQUE |

Le hash des blocs JSON-LD est identique au caractère près. Script :
`scratchpad/seodiff.py` (jetable, non commité).

**Non fait** : tâche 6, le cadrage de `SpotMiniMap` sur les 5 types de poste. Voir « Reste ».

---

## Bloc 2 — L'accueil montre quelque chose

`<h1>` ramené à **2 lignes** en 390 px (taille et interlignage seuls ; le texte ne change pas),
sous-titre et CTA resserrés sur mobile, padding du hero `py-24` → `py-10` sous `sm:`.

**Prouvé en 390 × 664, sans cookie de consentement :**

- CTA du corps « Créer mon carnet, c'est gratuit » : **333 → 381 px**, visible sans scroll,
  `elementFromPoint()` le renvoie. Il porte déjà `home_cta_clicked` (`TrackedCta`).
- Preuve chiffrée visible sans scroll : **26 espèces · 607 spots de pêche · 100 % fil gratuit**.
- Idem avec consentement accordé.
- `<h1>` textuel et JSON-LD inchangés.

---

## Bloc 3 — `/carte` s'ouvre sur les deux façades

`COASTAL_DEFAULT_BOUNDS = [[-5.2, 41.3], [9.6, 51.1]]` + `fitBounds` avec padding, passé à
`MapView` via `initialBounds`. **Des bornes plutôt qu'un centre et un zoom**, précisément
parce que le zoom qui cadre en portrait ne cadre pas en paysage : `fitBounds` dérive le zoom
du ratio réel du conteneur.

`COASTAL_DEFAULT_CENTER` / `_ZOOM` sont **inchangés** : ils servent aussi la section carte de
l'accueil et le sélecteur de position. Seul `/carte` passe par les bornes, et seulement quand
aucun département n'est détecté (`getCenterForDepartment` garde la priorité).

**Prouvé** : marqueurs visibles **en Méditerranée et sur la façade atlantique dans le même
écran**, Corse dans le cadre. Capture `apres-carte.png`.

⚠️ **Réserve honnête** : avec le bandeau de consentement **et** la barre d'inscription
affichés en même temps (première visite), les deux overlays occupent ~440 px des 664, et le
sud-est passe derrière eux. Aucun cadrage ne peut y échapper sans rendre la France
illisible. C'est un état **transitoire** (premier écran, avant réponse au bandeau), et le
S81 fait justement disparaître ce bandeau. Le padding bas est réglé à 168 px pour dégager la
barre d'inscription, qui elle est permanente.

---

## Bloc 4 — La carte du hero

**Deux causes distinctes, traitées séparément.**

1. **`ERR_ABORTED` × 3.** `spots` est un **tableau** en dépendance de `useEffect` : il change
   d'identité à chaque rendu du parent, même à contenu égal. L'effet se rejouait, et son
   nettoyage appelait `map.remove()` **pendant que le style, le sprite et les tuiles étaient
   en vol**. L'effet ne dépend plus que de primitives ; les spots sont lus dans une ref.
   **Prouvé : 26 requêtes `api.maptiler.com`, toutes en 200, zéro annulation.**
2. **Cadrage sur les Cornouailles.** `pitch: 40` + `zoom: 7.4` faisaient regarder très loin
   « devant » la caméra, et `bearing: -18` orientait ce devant au nord-nord-ouest : depuis un
   spot breton, ça tombait sur Truro et Exeter. Passé à `pitch: 22`, `zoom: 8.2`.
   **Vérifié sur la région servie au moment du test : aucun toponyme étranger lisible.**
   ⚠️ `hero.position` varie : à confirmer sur 2 autres régions pendant ta QA.
3. **Dégradation** : si MapTiler ne répond pas, `ready` reste `false` et le conteneur reste en
   `opacity-0` — le hero garde son dégradé et son instrument. Comportement déjà en place,
   vérifié par lecture, pas par coupure réseau.

---

## Bloc 5 — Cibles tactiles

| Cible | Avant | Après | Fichier |
|---|---|---|---|
| Liens de spots `/especes/bar` (**priorité du brief**) | 293 × 37 | **min-h-11** + zone élargie `-mx-2 px-2` | `components/especes/species-top-spots.tsx` |
| « Comment c'est calculé ? » | 14 × 14 | **size-11** sous `sm:` | `SpotBestMomentsSection.tsx` |
| « Logue ta prise ici → » | 124 × 20 | **min-h-11** | `SpotActivitySection.tsx` |
| Pastilles d'espèces + structure (hero fiche) | 46–117 × 32 | **min-h-11** | `spots/[slug]/page.tsx` |
| CTA collant de fiche | py-3 | **min-h-11** | `SpotSignupCta.tsx` |
| Onglets Connexion / Inscription | 144 × 38 | **min-h-11** | `login-client.tsx` |
| « Afficher le mot de passe » | 16 × 16 | **size-11** (l'icône ne bouge pas) | `login-client.tsx` |
| « Ouvrir les filtres » | 36 × 36 | **size-11** | `MapShell.tsx` |
| « Refuser » / « Accepter » / « En savoir plus » | 99×38 / 107×36 / 85×16 | **min-h-11** / `py-2` | `CookieBanner.tsx` |

**Exemptions assumées, et pourquoi** : les liens d'espèces **en pleine phrase** (22 × 17) et
l'attribution MapLibre (« © MapTiler », « © OpenStreetMap ») restent sous 44 px. WCAG 2.5.8
exempte explicitement les liens inline dans un texte, et l'attribution est du DOM tiers que
la carte injecte elle-même. Les forcer à 44 px casserait la prose, ou demanderait de patcher
un contrôle MapLibre.

⚠️ **Le test automatisé demandé (critère 2 du Bloc 5) n'est PAS écrit.** L'environnement
Vitest de ce dépôt est `node` : il n'a aucun moteur de mise en page, donc aucune mesure de
rectangle possible. Un vrai test de cible tactile demande Playwright (`pnpm e2e`), qui est un
runner distinct. Voir « Reste ».

---

## Bloc 6 — Le libellé qui promettait à côté

`« Voir les conditions à {nom}, gratuit »` → **`« Suis {nom}, c'est gratuit »`**.

Après le Bloc 1, l'ancien libellé était devenu factuellement faux : il proposait d'aller voir
ce que le visiteur a désormais **dans son premier écran**, et livrait un formulaire
d'inscription. Ce que l'inscription apporte réellement ici : garder le spot, être prévenu, y
loguer ses prises.

- La copie est changée **dans `SpotSignupCta`**, source unique, pas dans les appelants.
- `signup_wall_clicked` (surface `spot_page`) est **toujours émis** : le témoin ne disparaît
  pas avec le libellé.
- Balayage par motif (`Voir les conditions`, `Voir la marée`, `Voir le score`,
  `Débloquer les conditions`) : **plus aucune occurrence** hors commentaires et tests.
- Tests mis à jour + un test qui échoue si le libellé promet à nouveau « voir les conditions ».
- Lint de copie : aucun tiret cadratin ajouté.

---

## Passe sécurité

- Aucune migration, aucune RPC, aucune policy. Rien dans `supabase/migrations/`.
- Floutage GPS, k-anonymat K=3, gating de tier des coordonnées précises : **intouchés**.
  La bande de conditions ne lit aucune coordonnée, et `is_precise` n'entre pas dedans.
- Aucun secret dans le diff.
- **Non-régression S79** : le parcours du Bloc 0 a été rejoué APRÈS les changements du S80,
  sur le build local. Les correctifs du sprint précédent tiennent.

---

## Reste manuel, John

1. **Merger et déployer tout de suite**, puis enchaîner le S81. C'est la contrepartie du
   préalable §2 : un sprint non déployé ne produit aucun témoin.
2. **QA sur un vrai téléphone**, les quatre surfaces, pouce compris. L'émulation mesure des
   pixels, elle ne dit pas si une cible de 44 px se vise en marchant.
3. **Vérifier le hero de l'accueil sur 2 autres régions** (`hero.position` varie) : aucun
   toponyme étranger dominant.
4. ⚠️ **Surveiller le CTR `/spots` à J+7 et J+14.** Sous 6 %, **on revient en arrière sur le
   Bloc 1** avant toute autre chose. Le titre, la description, le canonical et les JSON-LD
   sont prouvés identiques, mais c'est le seul frein non dégaté de la roadmap.
5. **LCP p75 mobile** de `/`, `/carte`, `/spots/[slug]` à J+3 (PostHog Web Vitals) : aucun des
   trois ne doit se dégrader.
6. **Export GSC des impressions `/especes/*`** — la lane contenu est bloquée dessus depuis le
   S78, et le Bloc 5 vient de rendre `/especes/bar` utilisable au doigt.
7. ⚠️ **À lancer PENDANT le S81, pas après** : la relecture juridique du Bloc 1 du S81
   (PostHog sans cookie). C'est le seul délai qui ne dépend pas de nous.

### Non fait dans ce sprint, à reprendre

- **Bloc 1, tâche 6** : cadrage de `SpotMiniMap` sur les 5 types de poste (plage, pointe
  rocheuse, digue, cale, estuaire). Sur `pointe-des-chats-groix` la mini-carte montre encore
  l'intérieur des terres avec la mer au bord du cadre.
- **Bloc 5, critère 2** : le test automatisé des cibles à 44 px. Il doit vivre dans `e2e/`
  (Playwright), pas dans Vitest — l'environnement `node` ne mesure aucun rectangle.
- **Bloc 0, tâche 3** : le relevé du témoin est consigné, mais sa fenêtre d'observation est
  de moins d'une heure. Le vrai relevé est à J+14, pendant le S81.
