# 🔍 Audit complet du site — Carnet de Pêche

> **Date** : 2026-06-28 · **Auteur** : Claude (Cowork) · **Pour** : John
> **Demande** : audit le plus complet possible, tester toutes les pages + fonctionnalités, trouver tout ce qui manque ou cloche, et corriger.
> **Méthode** : revue du code **au commit de prod** (`git show HEAD` = `3d0f931`, sprint-46, = ce qui tourne en ligne), requêtes **base live** (Supabase `glgciwwnpmgifyhbvxsw`), **advisors** sécurité/perf, **Sentry**, et preuves visuelles (les 2 captures de cartes de partage fournies par John). 4 sous-agents d'audit ont ratissé navigation, carte, espèces, modération et partage.

> ⚠️ **Note de fiabilité importante** : le **working tree local est corrompu** (voir P0-A). Tous les constats ci-dessous sont donc vérifiés contre **HEAD (= la prod)** et la **base live**, PAS contre les fichiers du disque (qui sont tronqués). Les numéros de ligne renvoient à la version commitée.

---

## 0. Synthèse priorisée (le tableau qui fait foi)

| # | Constat | Domaine | Sév. | Effort | Nouveau vs roadmap 42-50 ? |
|---|---|---|---|---|---|
| **A** | **Dépôt local corrompu** : fichiers tronqués (ne build pas) + `index.lock` bloqué | Repo / env | 🔴 P0 | 5 min | **NOUVEAU** |
| **B** | **Cartes de partage cassées visuellement** : texte qui déborde du cadre (titre coupé, chips hors-champ) | Partage | 🔴 P0-visuel | ~1 j | partiel (47 ne couvre pas l'overflow) |
| **C** | Légende carte : lignes fantômes « Zone active » + « Importé » (couche supprimée S42.1, légende oubliée) | Carte | 🟠 P1 | 10 min | **NOUVEAU** |
| **D** | 6 espèces (barracuda, tassergal, liche, marbre, lieu-noir, merlan) sur **0 spot** | Espèces / data | 🟠 P1 | ~2 h | **NOUVEAU** |
| **E** | Modération : « supprimer » un message signalé **semble ne rien faire** (résultat d'action avalé) | Modération | 🟠 P1 | ~1 h | **NOUVEAU** |
| **F** | Pages **orphelines** : « Proposer un spot » + « Mes propositions » accessibles **uniquement** depuis la carte ; « Mes sorties » caché si 0 sortie | Navigation | 🟠 P1 | ~2 h | **NOUVEAU** |
| **G** | Cartes de partage : **aucune police chargée** dans l'image OG (gras qui s'effondre, rendu plat) | Partage | 🟠 P1 | ~3 h | **NOUVEAU** |
| **H** | Cartes de partage : **pas de photo du poisson** (image = texte sur fond navy) | Partage | 🟡 P2 | ~1 j | roadmap S47 (WS-A) |
| **I** | Filtre carte : 6 chips d'espèces qui renvoient toujours 0 résultat (= les 6 du point D) | Carte | 🟡 P2 | inclus dans D | **NOUVEAU** |
| **J** | Données : `alose` sur 3 spots sans fiche ; technique `stickbait` sur 5 spots (non canonique) | Data hygiène | 🟡 P2 | ~30 min | **NOUVEAU** |
| **K** | Partage : description qui affiche « dans 17 . » au lieu du nom du département | Partage | 🟡 P2 | 15 min | **NOUVEAU** |
| **L** | Nav : `/techniques` est un stub « bientôt » mais lié comme une vraie page ; `/spots` ne renvoie pas vers `/carte` | Navigation | 🟡 P2 | 30 min | **NOUVEAU** |
| **M** | Advisors DB : `spatial_ref_sys` sans RLS (table système PostGIS), policies permissives multiples, FK non indexées | Sécurité / perf | 🟢 P3 | ~1 h | **NOUVEAU** |
| **N** | Partage : emoji bruts (📏⚖️🌊) dans la page `/c/[slug]` au lieu d'icônes Lucide | Partage | 🟢 P3 | 30 min | roadmap S47 |

**Bon à savoir, ce qui VA bien (vérifié, ne pas toucher) :**
- ✅ Les **942 spots importés** (OSM, `pending`, espèces vides) sont **correctement masqués** de la carte publique et des filtres. Pas de spot « squelette » visible. La peur n°1 n'a pas lieu.
- ✅ **Sentry est propre** : 2 issues seulement, **0 utilisateur impacté** (2 et 1 events). Rien d'urgent.
- ✅ **RLS modération correcte** : les policies `feed_posts_delete_moderator` / `feed_comments_delete_moderator` existent et marchent (le bug E est côté UI, pas base).
- ✅ **Aucune fuite GPS** dans le partage : payloads sans coordonnées, `sanitizeLocationLabel` filtre les chaînes de type coordonnée. Le design privacy est bon.
- ✅ **Gating freemium carte** intact (3 spots/dépt gratuit, geom flouté côté serveur).
- ✅ **Pickers d'espèces** (onboarding + formulaire de prise) proposent bien les **26** espèces, pas seulement 6.

---

## P0-A — 🔴 Le dépôt local est corrompu (à régler AVANT toute correction)

**Constat (vérifié à la main, lecture seule) :**
- Plusieurs fichiers source sur le disque sont **tronqués en plein milieu d'une instruction** :
  - `app/og/card/[slug]/route.tsx` : 534 lignes, se termine sur `.slice(0, story ? 6 : 5)`, **0 handler `GET`** (en prod il y en a un ligne 619). Ce fichier ne compile pas.
  - `app/actions/share.ts` : 351 lignes (656 en prod), se termine sur `return fail(ID_MS` (coupé).
  - `components/map/MapLegend.tsx` : 53 lignes, se termine sur `flex items-center g` (coupé).
  - `git diff` global : **~−3 900 lignes** sur ~73 fichiers, beaucoup tronqués pareil.
- Un fichier `.git/index.lock` (0 octet) est **présent et bloque l'index git** (processus git interrompu).
- **HEAD = `3d0f931` (sprint-46) = la prod.** Donc le **code commité est sain et déployé** : seul ton **copie de travail locale** est abîmée (probable sync/écriture interrompue, cf. warnings `CRLF will be replaced by LF` en masse).
- **Aucun `git stash`** présent.

**Conséquence :** en l'état, `pnpm build` / `pnpm dev` **échoueraient** en local, et appliquer des correctifs par-dessus des fichiers tronqués ne ferait qu'empiler les dégâts.

**Remède recommandé (destructif, donc ton feu vert) :** comme HEAD = prod et qu'il n'y a pas de stash, les modifs non commitées sont du **bruit corrompu** (pas du travail sprint-47 réel : le brief `docs/sprint-47/BRIEF.md` existe mais **aucun code n'a été écrit**). Donc :
```bash
del .git\index.lock           # libère l'index (aucun git en cours)
git restore .                 # ramène le disque à HEAD (= prod, sain)
git status                    # doit être clean
pnpm install && pnpm build    # doit repasser au vert
```
Cela **ne perd rien de récupérable** (le sprint-46 est déjà commité ; les fichiers tronqués sont illisibles de toute façon). À valider par toi avant exécution.

---

## P0-B — 🔴 Les cartes de partage débordent du cadre (le « c'est moche » visuel)

**Preuve directe (tes 2 captures) :**
- Carte **« Mes conditions gagnantes »** (format story) : le titre chevauche le sous-titre « Ce que disent 7 de mes prises », et les chips de droite sont **coupés hors du cadre** : « au pr… », « le me… », « par v… », « la nu… ». Le contenu sort de la zone 1080 px.
- Carte **« MAQUEREAU · RECORD PERSO »** : le mot **MAQUEREAU déborde** sur le bord droit (coupé).

**Diagnostic :** au-delà du problème de police (G), la mise en page de l'image OG **ne contraint pas la largeur** du contenu (pas de `max-width` / wrap / auto-size de la typo selon la longueur du texte). Les libellés longs et les espèces longues passent par-dessus bord. C'est LE responsable du « ça rend vraiment pas bien ».

**Fix :** dans `app/og/card/[slug]/route.tsx` + `lib/og/template.tsx` : conteneur en `display:flex` avec `width` fixe et `overflow:hidden`, `flexWrap` sur les rangées de chips, et **taille de police adaptative** (réduire la taille du titre quand le texte est long, ou tronquer proprement avec `…`). À traiter en même temps que G (polices) et B/H (refonte carte). C'est la partie la plus visible pour César côté com.

---

## P1 — Bugs importants

### C — Légende carte : lignes « Zone active » et « Importé » fantômes
- `components/map/MapLegend.tsx` (prod, HEAD) lignes **61 (« Importé »)** et **69 (« Zone active »)** : ces deux entrées de légende décrivent des couches qui **n'existent plus**.
- La couche « Zones actives » a été supprimée au commit `8ed364c` (sprint-42.1, « doublon de la heatmap ») — hook, toggle et RPC `get_active_zones` retirés — **mais la ligne de légende a été oubliée**. C'est exactement ce que tu as repéré.
- « Importé » est aussi mort en pratique : les 942 spots importés sont `pending`, donc **aucun marqueur importé ne s'affiche jamais**. (« Communauté » idem : le seul spot communautaire est `rejected`.)
- **Fix** : supprimer le bloc `<span>` « Zone active » (lignes ~63-70) ; retirer ou requalifier « Importé » et « Communauté » tant qu'aucune donnée ne les produit. ~10 min.

### D — 6 espèces référencées sur **0 spot** (le bug que tu as vu)
- Le code définit **26 fiches espèces** (`lib/especes/content/index.ts`). La base ne tague que **21** valeurs distinctes sur les spots.
- **Sur 0 spot** : `barracuda`, `tassergal`, `liche`, `marbre`, `lieu_noir`, `merlan` — **les 6 espèces du sprint-29**. (Les 14 du sprint-23 sont bien taguées : seiche 157, mulet 113, congre 115, etc.)
- Conséquences : leur **fiche espèce n'affiche pas de « Meilleurs spots »** (le bloc se masque silencieusement, `components/especes/species-top-spots.tsx:14` `if (spots.length===0) return null`), elles n'apparaissent sur **aucune fiche spot**, et leur **chip de filtre carte renvoie toujours 0 résultat** (point I).
- **Ce n'est PAS un bug de code** : le référentiel, les slugs (underscore↔tiret : `lieu-noir`→`lieu_noir`), les pickers et les liens fiche↔spot sont **cohérents et corrects**. C'est un **trou de données** : personne n'a tagué ces 6 espèces sur des spots curés.
- **Fix (migration data, append-only, idempotent)** : taguer chaque espèce sur les spots curés plausibles, par liste de slugs explicites (curation honnête, pas un `UPDATE region=`) :
  - `lieu_noir` → pointes/digues rocheuses Manche/Atlantique déjà taguées `lieu_jaune` (Barfleur, La Hague, St-Mathieu, Pointe du Raz, Cap Fréhel…).
  - `merlan` → jetées sableuses Manche/Mer du Nord (Courseulles, St-Vaast, Pointe d'Agon, Hauts-de-France).
  - `barracuda` / `tassergal` / `liche` / `marbre` → Méditerranée + Corse (caps, digues, plages déjà taguées bar/sar/oblade).
  ```sql
  -- patron (1 UPDATE par espèce) :
  update public.spots
  set species = (select array(select distinct unnest(species || array['lieu_noir'])))
  where source='curated' and slug in ('pointe-de-barfleur-gatteville','cap-de-la-hague-goury', ...);
  ```
  Migration numérotée `058_tag_sprint29_species.sql`. Listes de slugs à valider par toi.

### E — Modération : suppression d'un message signalé « ne marche pas »
- **Cause racine (vérifiée) :** ce n'est **pas** la base. Les policies RLS `feed_posts_delete_moderator` (`using is_moderator()`) et l'équivalent commentaires existent et fonctionnent (les 2 signalements en prod pointent d'ailleurs vers des posts **déjà supprimés**).
- Le vrai bug est dans `app/(app)/moderation/page.tsx` (prod, lignes 49-50) :
  ```ts
  async function deletePostAction(formData: FormData) {
    'use server'
    await moderatorDeletePost(formData.get('postId') as string)  // ← résultat ignoré
  }
  ```
  `moderatorDeletePost` **renvoie** `{ ok:false, error }` au lieu de lever une exception. Le wrapper **jette le résultat à la poubelle** et il n'y a ni toast ni `useActionState` → **tout échec est invisible**. Idem pour commentaires, `dismissReport`, et les 4 actions spots (lignes 52-75).
- Le cas qui te tombe dessus : un post **déjà supprimé** (le signalement reste en liste car `reports.target_id` n'a pas de cascade) → `moderatorDeletePost` renvoie `fail('Post introuvable.')` → **avalé** → le bouton « semble ne rien faire ». Exactement ton symptôme.
- **Fix (2 parties, aucune migration)** :
  1. Surfacer l'erreur : dans chaque wrapper, `const res = await moderatorDeletePost(...); if (!res.ok) throw new Error(res.error)` (ou un toast via `useActionState`).
  2. Traiter « déjà supprimé » comme un **succès** : dans `app/actions/feed.ts` (~475 post, ~518 commentaire), si `deleted.length===0`, résoudre quand même le signalement (`resolveReportsForTarget`) et `return ok(...)`.

### F — Pages orphelines dans la navigation
- 🔴 **« Proposer un spot » (`/spots/proposer`) + « Mes propositions » (`/spots/mes-propositions`)** : accessibles **uniquement** depuis l'intérieur de la carte (`components/map/MapShell.tsx:479` desktop / `:787` mobile). Aucune entrée dans la sidebar, la tab bar, le MoreMenu ni le menu avatar. Un utilisateur qui n'ouvre pas `/carte` (surtout mobile) **ne peut jamais** proposer un spot ni suivre le statut de ses propositions. → Ajouter un groupe « Mes spots » dans `MoreMenu.tsx` + `AppSidebar.tsx`.
- 🟠 **« Mes sorties » (`/carnet/sorties`)** : le lien sur `/carnet` est sous condition `outingStats.totalOutings > 0` (`app/(app)/carnet/page.tsx:137`). Avec 0 sortie loguée, **la page est inatteignable**. → retirer le garde `> 0` (afficher un état vide).
- 🟠 **Collision de noms `/sorties` vs `/carnet/sorties` vs `/carnet/sortie`** : `/sorties` = co-pêchage (social), `/carnet/sorties` = mes sessions, `/carnet/sortie` = loguer une sortie. Les trois libellés se ressemblent → l'utilisateur cherchant « mes sorties » tombe sur le co-pêchage et croit la page disparue. C'est probablement une grosse part de ton « certaines pages ne sont pas accessibles ». → clarifier les libellés, stabiliser l'entrée « Mes sorties ».
- ℹ️ Un test garde-fou `nav-reachability.test.ts` existe mais **ne couvre pas** ces routes → l'étendre.

### G — Cartes de partage : aucune police chargée (typo plate)
- Les 4 routes OG (`app/og/card/[slug]/route.tsx:647`, `app/og/spot/[slug]/route.tsx`, `app/opengraph-image.tsx`, `app/og/spots/route.tsx`) appellent `new ImageResponse(...)` **sans tableau `fonts:`**.
- Satori (moteur de `next/og`) n'embarque qu'**un seul poids d'une seule police**. Sans police fournie, **tous les `fontWeight: 900/800/700` retombent en regular** → titres fins et plats. `lib/og/template.tsx:21-26` l'avoue même en commentaire pour le « faux » JetBrains Mono.
- **Fix** : un `lib/og/fonts.ts` qui `fetch` les .ttf (Space Grotesk 700, Inter 400/600/700, JetBrains Mono 500/700) et passe le tableau `fonts` aux 4 `ImageResponse`. C'est LE correctif typo n°1. ~3 h.

---

## P2 — À corriger (qualité / data hygiène)

### H — Cartes de partage : pas de photo du poisson
L'image est du texte sur fond navy, même pour un beau bar de 59 cm. Le payload `catch` ne porte aucune image (bucket privé non signable côté edge). → adopter le **WS-A du sprint-47** (bucket public opt-in + strip EXIF serveur via `sharp` déjà installé + `photo_url` dans le payload + `<img>` héro). C'est le levier viral n°1, déjà planifié dans ta roadmap.

### I — Filtre carte : 6 chips d'espèces toujours à 0 résultat
`components/map/MapFilters.tsx:28` construit la liste depuis les **26** dbKeys. Sélectionner une des 6 espèces du point D envoie une valeur valide → la RPC renvoie 0 spot → dead-end « Aucun spot · élargis les filtres ». **Résolu mécaniquement par D** (taguer les spots). Option complémentaire : griser les chips à 0 spot, ou piloter la liste depuis les espèces réellement présentes.

### J — `alose` et `stickbait` : données orphelines
- `alose` taguée sur **3 spots** (estuaires Nouvelle-Aquitaine : Port-Médoc 33, Adour-Anglet 64, Txingudi-Hendaye 64) mais **aucune fiche** (absente du référentiel). Sur la fiche spot elle s'affiche en **texte gris non cliquable** (dégradation propre, pas de 404), mais le filtre carte ne l'offre pas. → **Reco : la retirer** de ces 3 spots (`array_remove(species,'alose')`) — espèce amphihaline, marginale pour la pêche du bord en mer, et faire une fiche imposerait une réglementation sourcée pour 3 spots. (Alternative : créer la 27e fiche.) Corriger aussi le commentaire faux `seed-spots-lot-8.sql:32` (« alose déjà dans SPECIES_LABELS » : faux).
- `stickbait` taguée comme **technique** sur 5 spots : c'est un **type de leurre**, pas une technique canonique (le filtre n'offre que leurres/surfcasting/flottante/vif). → normaliser `stickbait` → `leurres`.

### K — Description de partage : « dans 17 . »
La meta `og:description` live affiche « …dans **17 .** » au lieu de « dans Charente-Maritime ». Cause : `department` stocké avec un espace de fin (« 17 »), passé brut (`app/actions/share.ts:269`) et non trimé au lookup (`app/(marketing)/c/[slug]/page.tsx` `deptLabel`). → `department: row.department?.trim()` + trim au lookup. C'est ce que voient les gens dans l'aperçu iMessage/WhatsApp. 15 min.

### L — Navigation : stubs et raccourcis manquants
- `/techniques` est un stub « bientôt disponible » (`noindex`) mais **lié comme une vraie destination** depuis `Footer.tsx:37` et `MoreMenu.tsx:45`. → masquer ou libeller « Techniques (bientôt) » tant que ce n'est pas livré.
- `/spots` (annuaire SEO) **ne renvoie pas vers `/carte`** (ni l'inverse de façon claire) alors que les deux cohabitent dans le header → ajouter « Voir sur la carte » sur `/spots` et `/spots/[slug]`.
- Maillage SEO : les ~330 pages `/peche/[...slug]` n'ont qu'**une seule porte d'entrée** humaine (cartes techniques d'une fiche espèce). → ajouter des liens depuis `/guides/[slug]` et l'index `/especes`.

---

## P3 — Mineur (à planifier, non bloquant)

### M — Advisors base de données
- **`spatial_ref_sys` sans RLS** (signalé « critique » par l'advisor) : c'est la **table système de PostGIS** (8 500 lignes de référentiels de projection, aucune donnée sensible). Cas quasi-universel, **bénin**. Si tu veux faire taire l'advisor : `ALTER TABLE public.spatial_ref_sys ENABLE ROW LEVEL SECURITY;` **mais** sans policy ça casse les requêtes spatiales → laisser tel quel est l'option raisonnable (décision toi).
- **Policies permissives multiples** (perf) sur `catches` (3 policies SELECT) et `feed_posts`/`feed_comments`/`spots` (DELETE/UPDATE moderator+own) : chaque policy est évaluée à chaque requête. Impact réel faible aux volumes actuels. À consolider plus tard.
- **FK non indexées** : `outing_messages.user_id`, `spots.verified_by`. Index B-tree simple. ~10 min.
- **~45 index inutilisés** : surtout le schéma `stripe.*` (normal, peu de trafic) + quelques-uns côté `public` (feed, push). À ne PAS supprimer tant que le réservoir est vide (faux négatifs). Surveiller.

### N — Page `/c/[slug]` : emoji bruts
`CatchRecap`/`OutingRecap` utilisent 📏 ⚖️ 🗓️ 🌊 🌡️ 🎣 🐟 comme icônes de ligne → rendu incohérent vs les icônes Lucide du reste. → remplacer par `Ruler`, `Scale`, `Calendar`, `Waves`, `Thermometer`… (déjà importées ailleurs).

---

## 1. Ce qui n'a PAS encore été testé (recommandé en suite)

L'audit ci-dessus couvre le **code + la data + les advisors + Sentry**. Il reste à faire une **QA visuelle live page par page** (desktop + mobile) via le navigateur, pour attraper les soucis purement visuels que le code ne révèle pas :
- home (hero MapLibre + mer WebGL), `/carte` (perf mobile : Lighthouse ~35 connu), `/carnet` + détail prise, `/fil`, `/especes` + une fiche à 0 spot (barracuda) pour voir le bloc manquant, `/spots` + une fiche spot, `/tarifs`, `/compte/abonnement`, onboarding, pages légales.
- Rendu réel des cartes de partage (story + 1200×630) après correctifs B/G/H.

Je peux enchaîner cette passe live dès que tu veux (capture desk+mobile + console + réseau).

---

## 2. Plan de correction proposé (ordre d'exécution)

1. **P0-A** — stabiliser le dépôt (`index.lock` + `git restore`), rebuild au vert. *(ton feu vert requis)*
2. **Lot « bugs rapides » (P1, faible risque)** — C (légende), E (modération), F (nav orphelines), K (dept), J (alose/stickbait). ~1 j, 1 migration éventuelle (data) + petits fixes UI.
3. **D** — migration data : taguer les 6 espèces sprint-29 (listes de spots à valider). ~½ j.
4. **Lot « partage » (P0-B + G + H)** — refonte carte OG : contrainte de largeur + polices + photo poisson. ~2-3 j (recoupe ton sprint-47).
5. **P2/P3 restants** — maillage SEO, advisors, emoji, polish.

Tout cela respecte les invariants projet (RLS d'abord, migrations numérotées + regen `lib/types.ts`, zéro coordonnée exposée, pas de tiret cadratin dans la copy visible, pas de push sans ta validation).

---

*Audit consolidé le 2026-06-28. Constats vérifiés contre HEAD `3d0f931` (= prod) et la base live. Détail technique fichier:ligne dans le corps du document. Les correctifs C/E/F/K sont prêts à appliquer dès que le dépôt est stabilisé (P0-A).*
