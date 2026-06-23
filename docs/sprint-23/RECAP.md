# Sprint 23 — RECAP (Pôle Espèces : 20 espèces + score par espèce + maillage)

> Exécuté le 2026-06-23 (mode ultracode/xhigh). **CODE-COMPLET, non commité, non déployé.** Migrations = **fichiers** (application = John). Vérif finale : `tsc` ✓ · `eslint` ✓ · **357 tests Vitest** ✓ · `next build` ✓.

---

## En une phrase

`/especes` passe de **6 à 20 fiches profondes et sourcées**, chacune affiche un **score par espèce décomposé** (« le bar en ce moment sur tes côtes : X/100 », communauté k-anon + perso Itinérant), ses **meilleurs spots triés** et ses **créneaux saisonniers** ; le tout **maillé** (espèce ↔ spots ↔ carte ↔ guides ↔ réglementation), et le **bug des filtres carte** est corrigé.

---

## Décisions appliquées (tranchées par John avant le code)

- **D-B1** — liste finale = **20 espèces** : 6 cœur + 14 (seiche, mulet, sole, calmar, congre, vieille, rouget, dorade grise, pageot, oblade, maigre, tacaud, chinchard, plie).
- **D-B2** — `catchSpeciesEnum` étendu → on peut **loguer les 20** au carnet (rétro-compatible : `catches.species` = `text`, **0 migration**). Onboarding favoris dérivé du référentiel.
- **D-B3** — créneaux « par espèce » = **biais saisons** (`content.saisons`), pas un solunar générique maquillé. Le créneau fin du jour (marée + solunar) reste sur la fiche spot.
- **D-B4** — meilleurs spots = **nouvelle RPC `get_top_spots_for_species`** (migration **049**, fichier), tri par signal réel + gating coords réutilisé. Repli gracieux si la RPC n'est pas encore en base.

---

## WS-0 — Référentiel espèces unifié + fix bug filtres

- **Source unique** : `lib/seo/programmatic.ts` → `SPECIES` (20 entrées : label, dbKey, latin, article, articleDe, gender, flags `inCarnet`/`hasDeepSheet`/`hasProgrammatic`). Dérivés exportés : `SPECIES_SLUGS`, `SPECIES_BY_DB_KEY`, `ALL_SPECIES_DB_KEYS`, `CARNET_SPECIES_DB_KEYS`.
- **Fini les 4 listes parallèles** : `SPECIES_LABELS` (lib/labels.ts) et `catchSpeciesEnum` (lib/catches/schema.ts) **dérivent** désormais du référentiel ; `SPECIES_HABITAT` couvre les 20 (8 entrées ajoutées).
- 🔴 **BUG FILTRES CORRIGÉ** (§Diagnostic.3) : `spotSpeciesEnum` (nouveau, = 20 dbKeys) ; `spotFiltersSchema.species` + `parseFiltersFromSearchParams` valident contre lui. Avant, les 6 espèces additionnelles affichées par `MapFilters` étaient **rejetées au parse SSR** → filtrables visuellement mais sans effet. Verrouillé par test.
- **Anti thin content** : `SPECIES_TECHNIQUES` et `SPECIES_CONTENT` passés en `Partial` ; `getAllProgrammaticPages`/`resolveProgrammaticSlug` ne génèrent des pages `/peche/…` que pour les **6** espèces à contenu programmatique (les 14 nouvelles : fiche `/especes` profonde, **aucune** page programmatique creuse).
- **Test** : `lib/seo/__tests__/species-referential.test.ts` (6 tests) verrouille la cohérence (20 espèces, enum carnet = inCarnet, filtres = tout le référentiel, labels/habitat couvrent tout).

## WS-A — 14 fiches éditoriales profondes (le différenciateur)

- 14 fichiers `lib/especes/content/<slug>.ts` (`EspeceContent`), enregistrés dans l'index (20 au total). ~1080-1315 mots/fiche, **4 FAQ** chacune, JSON-LD `Article`+`BreadcrumbList`+`FAQPage` (parité avec les 6 existantes).
- **Réglementation SOURCÉE + DATÉE (verifiedAt 23/06/2026), vérifiée contre Légifrance primaire** via un workflow recherche → vérification adversariale (28 agents) + 1 agent pour la vieille. **Zéro chiffre inventé** (`null` honnête là où il n'y a pas de maille). Contrôle anti-dérive automatique : les 14 valeurs (maille/façade + marquage) **correspondent exactement** à la table validée.

### Table réglementaire vérifiée (à re-valider par John)

| Espèce | Manche/Atl. | Médit. | Marquage | Note |
|---|---|---|---|---|
| Seiche | — | — | non | pas de maille (18 cm = reco maturité, non légale) |
| Mulet | **30 cm** | — | non | Mugil spp. |
| Sole | **25 cm** | **24 cm** | **OUI** | harmonisé 25 cm (arrêté 12 mai 2023) |
| Calmar | — | — | non | (11 cm = PRO, pas loisir) |
| Congre | **60 cm** | **60 cm** | non | PNMGL local jusqu'à 120 cm |
| Vieille | — | — | non | croissance lente → no-kill recommandé |
| Rouget-barbet | **15 cm** | **15 cm** | non | PNMGL local 20 cm + quota |
| Dorade grise | **23 cm** | **23 cm** | non | griset / canthare |
| Pageot | — | **15 cm** | non | ⚠️ **voir flag** |
| Oblade | — | — | non | Médit. seule ; PNMGL local 20 cm |
| Maigre | **50 cm** | **45 cm** | **OUI** | Atl. relevé à 50 cm (arrêté 23 août 2022) |
| Tacaud | — | — | non | (19 cm = reco maturité) |
| Chinchard | **15 cm** | **15 cm** | non | ⚠️ **pêche loisir interdite zone CIEM VIIIa** (Gascogne/Vendée, règl. UE 2024/257) |
| Plie | **27 cm** | absente | non | Manche/Atl. uniquement |

> **⚠️ Flag John (pageot)** : il s'agit du **pageot commun/rouge (Pagellus erythrinus)** — la fiche lève l'ambiguïté pour ne PAS le confondre avec la **dorade rose / pageot rose (Pagellus bogaraveo : 40/33 cm + marquage)** ni le pageot acarne. À valider.
> Plusieurs valeurs corrigent mes hypothèses initiales (sole 25/24 + marquage, mulet 30, congre 60, maigre 50/45 + marquage, dorade grise 23/23) : à vérifier en priorité.

## WS-B — Score par espèce + meilleurs spots + créneaux

- **Score régional décomposé** (`lib/especes/score.ts` + `components/especes/species-score.tsx`) : réutilise `get_quality_cells` (044) sur le **département** de l'utilisateur (bbox bornée, `lib/geo/bbox.ts` ; repli national pour anon/sans département). `ScoreRing` (font-mono = l'info, daltonien-safe) + décomposition communauté (k-anon) / perso (Itinérant). **Anon → communauté seule.** Sous-signal → état honnête « pas encore assez de prises » (jamais fabriqué).
- **Meilleurs spots** (`lib/especes/top-spots.ts` + `species-top-spots.tsx`) : RPC **049** (tri par prises de l'espèce au spot, k-anon ; coords gatées comme 039) + **repli gracieux** (`contains(species)`) tant que la migration n'est pas appliquée. Remplace la sidebar non triée. JSON-LD `ItemList`.
- **Créneaux saisons** (`lib/especes/season.ts` + `species-season-now.tsx`) : met en avant la saison **en cours** + la pleine saison, par façade, depuis `content.saisons` (honnête, dérivé de l'espèce).
- **Perso réutilisé** (`species-personal.tsx`) : `getPersonalTendencies({ species })` du sprint 22, segmenté par espèce (« tes tendances de bar »).
- Tous montés en `<Suspense>` (la coquille éditoriale ne bloque pas sur les requêtes live).

## WS-C — Maillage & SEO

- **Fiche spot → fiche espèce** : libellés d'espèces cliquables (hero + sidebar de `/spots/[slug]`) vers `/especes/<slug>`.
- **Fiche espèce → spots** : `ItemList` JSON-LD des meilleurs spots ; **« Autres espèces du bord »** (cross-link interne) ; réglementation = section dédiée (les liens espèce y mènent).
- **Programmatique** : aucune page `/peche/…` creuse (gating WS-0). Sitemap = **20** fiches espèces + 6 espèces × techniques programmatiques.
- **Guides** : aucun des 6 guides existants ne concerne une nouvelle espèce → rien à ajouter. Les guides « Multi-espèces » (marée, Bretagne) remontent déjà sur toutes les fiches. *(Quand un guide visera une nouvelle espèce, ajouter `species: "<Label exact>"` au frontmatter.)*

---

## Comment tester

1. `pnpm test` (357 ✓), `npx tsc --noEmit` (✓), `npx eslint …` (✓), `npx next build` (✓) — déjà passés.
2. `/especes` → 20 fiches. Ouvrir p.ex. `/especes/seiche`, `/especes/sole`, `/especes/oblade` (Médit. seule), `/especes/plie` (Manche/Atl. seule) : réglementation sourcée + datée, saisons, FAQ, score décomposé, meilleurs spots, « tes tendances ».
3. `/carte` → cocher **Seiche** (ou vieille/mulet…) : l'URL `?species=seiche` **filtre réellement** (avant : sans effet). Vérifier qu'aucune espèce affichée n'est rejetée.
4. `/spots/<slug>` → cliquer un libellé d'espèce → arrive sur `/especes/<slug>`.
5. Onboarding étape 4 : les 20 espèces sélectionnables ; loguer une seiche dans `/carnet/nouvelle`.

## Reste manuel John (post-sprint)

1. **Appliquer la migration 049** en prod (`get_top_spots_for_species`) — actuellement **absente** (vérifié), repli actif sans elle. Puis **regénérer `lib/types.ts`** + `get_advisors`. Le cast `as unknown as` dans `top-spots.ts` reste inoffensif après regen.
2. **Valider la réglementation** des 14 fiches (exactitude légale — surtout les corrections signalées + le flag **pageot** + la restriction **chinchard zone VIIIa**).
3. ⚠️ Dérive d'historique migrations connue (`migration repair`) — voir CLAUDE.md §2.
4. Relire → commit → merge `main` → déploiement → `deploy-watch` + `qa-chrome` (score espèce, gating, maillage, daltonien).

## Anti-régression (vérifié)

- **Aucune RPC existante modifiée** : 049 est purement additive ; `get_quality_cells`/`nearby_spots`/`get_spot_activity` inchangées. **Aucune migration appliquée** par les agents (049 absente de prod).
- **Floutage GPS** : 049 réutilise le pattern de gating de 039 (précis si Itinérant/Local-home/owner, sinon `ST_Centroid(geom_public)`) ; counts en k-anon K=3 ; perso via `auth.uid()` + tier Itinérant (pas d'usurpation).
- **Honnêteté 7.5** : score perso jamais fabriqué (composante absente = dite/omise).
- **Daltonien** : score & saisons portent l'info par le **chiffre/texte/forme**, pas la seule teinte.
- **Cohérence des 3 ex-listes d'espèces** : verrouillée par test (le bug filtres ne peut pas réapparaître silencieusement).

---

## Fichiers (synthèse)

- **Référentiel/fix** : `lib/seo/programmatic.ts`, `lib/labels.ts`, `lib/catches/schema.ts`, `lib/spots/filters-schema.ts`, `lib/spots/filter-url.server.ts`, `lib/conditions/species-habitat.ts`, `app/(app)/onboarding/[step]/onboarding-step.tsx`, `app/(marketing)/especes/page.tsx`, `lib/seo/content/index.ts`, `app/(marketing)/peche/[...slug]/page.tsx`, `lib/seo/__tests__/species-referential.test.ts`.
- **Fiches** : `lib/especes/content/{seiche,mulet,sole,calmar,congre,vieille,rouget,dorade-grise,pageot,oblade,maigre,tacaud,chinchard,plie}.ts` + `index.ts`.
- **Score/spots/créneaux** : `supabase/migrations/049_top_spots_for_species.sql`, `lib/especes/{score,top-spots,season}.ts`, `lib/geo/bbox.ts`, `components/especes/{species-score,species-top-spots,species-personal,species-season-now}.tsx`, `app/(marketing)/especes/[slug]/page.tsx`.
- **Maillage** : `app/(marketing)/spots/[slug]/page.tsx`.

## Revue croisée indépendante (agent code-reviewer)

**Verdict : GO** — 0 critique, 0 high, 2 medium (corrigés), 4 low (notés). Aucune régression sécurité : gating GPS de la 049 confirmé identique à 039/029, k-anon K=3 (counts + pêcheurs) tenu, perso via `auth.uid()` sans usurpation, anti-thin-content solide, fix filtres correct, daltonien OK.

**Corrigés suite à la revue :**
- 🟠 `lib/especes/score.ts` + `species-score.tsx` : un score « de zone » ne s'affiche plus jamais à partir des **seules** prises perso (sans signal communautaire) — ce cas route désormais vers l'état honnête « pas encore assez de prises partagées » + une reconnaissance séparée « toi, tu y as pris X » (pas de verdict de zone fabriqué).
- 🟠 `lib/especes/top-spots.ts` : commentaire de garde ajouté — `lng/lat/is_precise` (coords gatées par la RPC) sont volontairement omis de `TopSpot`, ne jamais les forwarder au client.
- 🟢 `especes/[slug]/page.tsx` : « autres espèces » en fenêtre tournante (maillage réparti sur tout le référentiel).

**Notés (non bloquants, décisions assumées) :**
- 🟢 `SpeciesPersonal` (sidebar) visible pour tout user connecté : **voulu** — les tendances perso du carnet sont un aperçu gratuit (cohérent avec la décision D-A1 sprint 22, « perso descriptif gratuit »). Le **score** perso, lui, reste Itinérant.
- 🟢 `ESPECES_CONTENT: Record<SpeciesSlug, …>` force les 20 entrées à la compilation (fail au build, pas au runtime — comportement souhaité).
- 🟢 Tant que la migration 049 n'est pas appliquée, le badge « X PRISES 90J » des meilleurs spots n'apparaît pas (repli sans counts) — normal.

*RECAP produit le 2026-06-23 (mode ultracode/xhigh). Vérif finale : tsc ✓ · eslint ✓ · 357 tests ✓ · build ✓ · revue indépendante GO.*
