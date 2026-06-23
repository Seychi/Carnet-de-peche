# Sprint 23 — Brief d'exécution
## Pôle Espèces — ~20 espèces + score par espèce sur la fiche + tout connecter (Chantier B)

> Rédigé le 2026-06-23. Durée cible : ~6-8 jours (le poste éditorial domine). Phase **P2 — Le moat réel**, après le sprint 22 (scoring perso).
> Contexte : `docs/audits/AUDIT-2026-06-23.md` + `docs/ROADMAP-2026-H2.md` (Chantier B). Ta demande, faite **correctement** : pas « plus de pages » mais des fiches **profondes + scorées + connectées**. On gagne en **profondeur** (vs les 266 fiches creuses de Fishing Grid), pas en quantité.
> Décisions John 2026-06-23 : roadmap P2 validée. **Quatre décisions produit à trancher (cf §Décisions) avant le code.**

**Préalable avant de démarrer (manuel John)** : sprint 22 mergé (le composant perso unifié est réutilisé sur la fiche espèce). Trancher D-B1→D-B4. Lancer la requête prod de répartition des espèces (cf WS-0).

---

## 🚀 Ligne de lancement (à copier-coller par John)

> **ultracode — effort xhigh.** Exécute `docs/sprint-23/BRIEF.md`. **Lance WS-0 (référentiel unifié + fix filtre) en TOUT PREMIER** — il débloque le reste. Ensuite **WS-A (éditorial fiches, par lots) et WS-B (score par espèce) en parallèle** ; **WS-C (maillage/SEO) dépend de WS-A et WS-B**. Termine **obligatoirement** par le **workstream VERIF**. **Ne push pas, ne déploie pas** ; les migrations sont des **fichiers** (application = John). Invariants : réglementation **sourcée + datée** (jamais inventée ; `null` honnête si pas de maille), tutoiement, DA v2 (chiffres en `font-mono`), gating réutilisé (pas réinventé), migration = fichier numéroté + `apply_migration` + regen `lib/types.ts`.

---

## 🧠 Connecteurs & sous-agents (cf `CLAUDE.md` §20)

| Quand | Sous-agent → connecteur | Pourquoi |
|---|---|---|
| WS-0 : référentiel & répartition réelle | **supabase-guard** → Supabase (RO) | `select unnest(species), count(*) from spots group by 1` (quelles espèces sont déjà portées par les 157 spots) ; vérifier `get_quality_cells`, `current_tier`. **Lecture seule.** |
| WS-B : signatures RPC avant de coder | **supabase-guard** → Supabase (RO) | `get_quality_cells` (044, par espèce), `get_spot_activity` (018), `nearby_spots` (039) — params + gating exacts. |
| Réglementation par espèce | **docs-researcher** → web/Légifrance (+ validation John) | Mailles/quotas/fenêtres **datés et sourcés**. Le différenciateur — zéro chiffre inventé. |
| QA fiche espèce (score, maillage, états) | **qa-chrome** → Claude in Chrome | Score décomposé, gating, liens, DA v2, JSON-LD. |
| Clôture | **`/verif-sprint`** | tests + build + types + lint + revue indépendante + anti-régression. |

---

## Objectif du sprint en une phrase

`/especes` passe de 6 à **~20 fiches profondes et sourcées**, chacune affichant un **score par espèce décomposé** (« le bar en ce moment sur tes côtes : X/10 »), ses **meilleurs spots** et **créneaux**, le tout **maillé** (espèce ↔ spots ↔ carte ↔ guides ↔ réglementation) — et le **bug des filtres carte** est corrigé au passage.

---

## Diagnostic (établi par lecture du code — point de départ)

1. **DEUX systèmes de contenu espèce** clés sur le même enum 6 espèces : fiches profondes (`EspeceContent`, `lib/especes/`) et contenu programmatique SEO (`SpeciesContent`, `lib/seo/content/`, ~pages `/peche/[...]`). Ajouter une espèce touche **les deux** (ou il faut ajuster la matrice programmatique pour ne pas générer de pages creuses).
2. **TROIS listes d'espèces divergent** : `SPECIES` (6, `lib/seo/programmatic.ts`), `catchSpeciesEnum` (6, `lib/catches/schema.ts`), `SPECIES_LABELS`/`SPECIES_HABITAT` (**12**, `lib/labels.ts` + `lib/conditions/species-habitat.ts`).
3. **🔴 BUG réel à corriger** : `MapFilters.tsx` affiche **12 espèces** (depuis `SPECIES_LABELS`), mais le parse SSR des filtres (`lib/spots/filter-url.server.ts` → `spotFiltersSchema` → `catchSpeciesEnum`, 6) **rejette silencieusement** les 6 additionnelles (vieille, mulet, sole, congre, maigre, chinchard). → elles sont filtrables **visuellement** mais **ne filtrent pas** la carte. La colonne `spots.species` est `text[]` libre (la DB, elle, accepte tout).
4. **Aucun score par espèce sur la fiche aujourd'hui** : `/especes/[slug]` n'affiche qu'un **compteur** `catches30d` + une sidebar « Spots à X » (`.contains('species',[dbKey])`, max 4, **non triée**). Pas de score, pas de créneaux, pas de solunar.
5. **L'outil du score par espèce existe** : `get_quality_cells(bbox, zoom, p_species, p_technique, p_days)` (migration 044) → score 0-100 **décomposé** (communauté k-anon K=3 + perso gaté Itinérant via `auth.uid()`). Wrapper TS : `fetchQualityCells()` (`lib/map/quality.ts`).
6. **⚠️ Le solunar est espèce-AGNOSTIQUE** : `computeWeeklyForecast` ne prend pas d'espèce. Donc « meilleurs créneaux pour le bar » = aujourd'hui les mêmes que pour n'importe quelle espèce. Pour un « par espèce » réel, biaiser par `content.saisons` (donnée déjà structurée : activité 1/2/3 par saison/façade) — sinon le « par espèce » sur les créneaux est cosmétique (à acter, D-B3).
7. **6 espèces déjà « prêtes »** (dans `SPECIES_LABELS` + `SPECIES_HABITAT` mais sans fiche) : vieille, mulet, sole, congre, maigre, chinchard → habitat déjà branché, priorité éditoriale.

---

## Décisions à trancher AVANT le code (⚠️ DEMANDER À JOHN)

- **D-B1 — Liste finale des ~20 espèces.** Reco (6 actuelles + 14) : **seiche, mulet, sole, calmar, congre, vieille, rouget, dorade grise, pageot, oblade, maigre, tacaud, chinchard, plie**. (Seiche/calmar = très fort SEO eging ; mulet/sole/congre/vieille/maigre/chinchard déjà dans le code.) À confirmer après la requête de répartition prod (WS-0).
- **D-B2 — Étendre `catchSpeciesEnum` (le carnet) ?** Sinon on ne peut pas **loguer** une seiche. Reco : **oui** (rétro-compatible : `catches.species` est `text`). Impacte onboarding/favoris (`favorite_species`).
- **D-B3 — Créneaux « par espèce ».** Biaiser le solunar par `content.saisons` (reco, donnée existante) **ou** afficher honnêtement « créneaux du spot » (génériques) ? Ne pas faire passer du générique pour du « par espèce ».
- **D-B4 — « Meilleurs spots pour l'espèce » : méthode + gating.** Réutiliser `nearby_spots`/`get_spot_activity` (existant, tri par distance/activité globale) **ou** nouvelle RPC `get_top_spots_for_species` (tri par qualité de l'espèce ; = migration). Gating : communauté + spots floutés **gratuit**, perso + coords précises **Itinérant** (réutiliser l'existant).

---

## Workstreams & dépendances

| WS | Bloc | Durée | Dépend de | Parallèle J1 |
|----|------|-------|-----------|--------------|
| **0** | Référentiel espèces unifié + fix bug filtres carte | 1-1,5 j | décisions | ✅ (en 1er, bloquant) |
| **A** | Éditorial : ~14 nouvelles fiches profondes (par lots) | 4-5 j | WS-0 (slugs) | ✅ après WS-0 |
| **B** | Score par espèce + meilleurs spots + créneaux sur la fiche | 2-3 j | WS-0, sprint 22 | ✅ après WS-0 |
| **C** | Maillage & SEO (liens, réglementation, JSON-LD) | 1,5 j | A (slugs), B (ItemList) | ❌ |
| **VERIF** | Revue finale indépendante | 0,5 j | tous | ❌ (dernier) |

---

## Bloc 0 — Référentiel espèces unifié + fix du bug filtres

Source de vérité unique des espèces, et correction du bug qui rend 6 espèces « fausses » sur la carte.

> **Connecteurs** : **supabase-guard** (RO) — `select unnest(species) sp, count(*) from spots group by sp order by 2 desc` (savoir quelles espèces les 157 spots portent déjà → priorité D-B1).

### Tâches
1. Étendre `SpeciesSlug` + `SPECIES` (`lib/seo/programmatic.ts`) aux espèces de D-B1 (avec `dbKey` snake_case, `label`, `latin`, `article`, `articleDe`, `Facade` mailles).
2. Modèle **référentiel unique** : enrichir `SPECIES` de flags `inCarnet` / `hasDeepSheet`, et **faire dériver** `SPECIES_LABELS`, `SPECIES_HABITAT`, les filtres carte et (si D-B2) `catchSpeciesEnum` de cette source — fini les 4 listes à maintenir à la main.
3. **Corriger le bug §Diagnostic.3** : `spotFiltersSchema.species` (`lib/spots/filters-schema.ts`) + `parseFiltersFromSearchParams` (`lib/spots/filter-url.server.ts`) valident contre le **référentiel large**, pas `catchSpeciesEnum`.
4. Si D-B2 = oui : étendre `catchSpeciesEnum` + onboarding favoris.

### Critères d'acceptation
- Sélectionner **« seiche »** (ou toute espèce additionnelle) sur `/carte` **filtre réellement** les spots (vérifié : URL → parse SSR → RPC). `grep` : plus aucune espèce affichée non validée.
- `tsc` vert avec `ESPECES_CONTENT: Record<SpeciesSlug, …>` complet (toutes les nouvelles clés ont un contenu — coordonné avec WS-A, sinon stub temporaire typé).
- Aucune RPC ne change de gating (passe anti-régression).

### Garde-fous
- ⚠️ Étendre `SPECIES` injecte l'espèce dans la **combinatoire programmatique** (sitemap) → coordonner avec WS-C pour ne pas générer de pages `/peche/...` creuses.
- Ne pas modifier les policies/gating des RPC.

---

## Bloc A — Éditorial : ~14 nouvelles fiches profondes

Le poste le plus lourd et le **différenciateur**. Par lots (ex. lot 1 = seiche/mulet/sole/calmar).

> **Connecteurs** : **docs-researcher** → réglementation **sourcée + datée** (Légifrance/FFPSA), validation finale par John. **supabase-guard** pour `SPECIES_HABITAT` (déjà présent pour les 6 « prêtes »).

### Tâches
1. Pour chaque espèce de D-B1 : créer `lib/especes/content/<slug>.ts` (`EspeceContent` complet) + l'enregistrer dans `lib/especes/content/index.ts`.
2. **Bloc `regulation`** par espèce : `minSizeCm` par façade (`null` honnête si pas de maille — ex. mulet/congre/chinchard), `source` (arrêté cité), `verifiedAt`, `marquage`, `items`. **Vérifié manuellement.**
3. `saisons` par façade (activité 1-3 + note), `techniques` (lien programmatique), `postes`, `faq` (≥3, alimente le JSON-LD `FAQPage`).

### Critères d'acceptation
- `/especes` liste ~20 fiches ; chaque nouvelle `/especes/<slug>` rend sans erreur, avec `regulation.source` + `verifiedAt` non vides et `faq` ≥ 3.
- Là où il n'y a pas de maille légale, la fiche **le dit** (« pas de taille minimale réglementaire ») — aucun chiffre inventé.
- JSON-LD `Article` + `BreadcrumbList` + `FAQPage` présents (parité avec les 6 existantes).

### Garde-fous
- ⚠️ Exactitude légale = bloquante. Une fiche sans réglementation vérifiée **n'est pas publiée** (pas de thin content façon Fishing Grid).
- Garder le standard de profondeur des 6 fiches (≈1000+ mots utiles).

---

## Bloc B — Score par espèce + meilleurs spots + créneaux sur la fiche

Le « instrument » qui rend la fiche vivante. Réutilise `get_quality_cells` + le composant perso du sprint 22.

> **Connecteurs** : **supabase-guard** (signatures `get_quality_cells`/`get_spot_activity`/`nearby_spots`) ; **qa-chrome** (états + gating).

### Tâches
1. **Score régional par espèce** : composant serveur qui appelle `get_quality_cells(bbox = home_department de l'user, p_species = dbKey)` et agrège les cellules en un score « X/10 » **décomposé** (communauté + perso). Anon/Discovery → composante communauté seule. Itinérant → + perso. Borne la bbox au département (perf — la fiche est ISR `revalidate=86400`).
2. **Meilleurs spots pour l'espèce** : selon D-B4 (réutiliser `nearby_spots`/`get_spot_activity` trié, ou nouvelle RPC `get_top_spots_for_species` = `supabase/migrations/0NN_*.sql` + `apply_migration` + regen types). Remplace la sidebar non triée.
3. **Meilleurs créneaux** : selon D-B3 (biais `content.saisons` ou générique honnête).
4. Réutiliser le **composant perso unifié du sprint 22** pour « tes tendances sur cette espèce ».

### Critères d'acceptation
- `/especes/<slug>` affiche un score chiffré (`font-mono`, `ScoreRing`/`TagData` de `components/ui-v2/`) **décomposé** (jamais opaque) ; anon voit la communauté seule ; Itinérant voit le perso ; sous-K → « pas encore assez de prises » (honnête, jamais inventé).
- « Meilleurs spots » triés par signal réel (plus la liste brute) ; gating coords (flouté gratuit / précis Itinérant) respecté.
- Les créneaux affichés ne **prétendent pas** être « par espèce » s'ils sont génériques (cohérent D-B3).

### Garde-fous
- ⚠️ Honnêteté 7.5 : pas de score perso fabriqué ; composante absente = omise.
- Perf : bbox bornée au département (pas « toutes côtes »). Réutiliser le gating existant, ne pas le réinventer.

---

## Bloc C — Maillage & SEO

Transformer chaque espèce en hub relié au reste du produit.

> **Connecteurs** : **qa-chrome** pour valider le JSON-LD (`ItemList`, `BreadcrumbList`), les liens internes (aucun lien mort) et le rendu du maillage ; **docs-researcher** pour les patterns Next 15 metadata/sitemap si besoin.

### Tâches
1. **Fiche spot → fiche espèce** : rendre les libellés d'espèces de `/spots/[slug]` **cliquables** vers `/especes/<slug>` (aujourd'hui en texte simple).
2. **Réglementation maillable** : badge maille (sur fiche spot / popup carte / carte de prise) → section réglementation de la fiche espèce.
3. **JSON-LD** : `ItemList` des « meilleurs spots » sur la fiche espèce ; bloc « autres espèces / à pêcher au même endroit » (maillage interne).
4. **Programmatique** : pour chaque nouvelle espèce, fournir le `SpeciesContent` (`lib/seo/content/`) **ou** ajuster `SPECIES_TECHNIQUES`/`speciesDepartments` pour ne pas générer de pages creuses. Vérifier le sitemap.
5. **Guides** : ajouter `species: "<Label exact>"` dans le frontmatter des guides concernés (le matching guide↔espèce se fait par **label**, pas slug).

### Critères d'acceptation
- Aucun lien mort ; chaque fiche espèce est reliée à ≥ spots + guides + réglementation ; chaque fiche spot pointe vers les fiches espèces.
- `app/sitemap.ts` contient les ~20 espèces ; **aucune** page `/peche/...` générée sans `SpeciesContent` (pas de thin content).

### Garde-fous
- ⚠️ Ne pas exploser le sitemap de pages programmatiques vides (décision espèce par espèce).
- Harmoniser le JSON-LD (cohérent avec le sprint 21 qui a déjà aligné `/guides`).

---

## Workstream VERIF (obligatoire, agent indépendant)

1. `/verif-sprint` : `pnpm test` + `typecheck` + `lint` + `build`, puis revue croisée du `git diff main...HEAD` contre les AC.
2. **Passe anti-régression** : gating des RPC inchangé (communauté gratuit / perso Itinérant), floutage GPS intact, perf fiche espèce (bbox bornée), DA v2 (chiffres mono, info pas portée par la seule couleur), cohérence des 3 ex-listes d'espèces (le bug filtres ne réapparaît pas).
3. Vérifier qu'aucune migration n'a été appliquée en prod par les agents (fichiers seulement).
4. Livrer `docs/sprint-23/RECAP.md` : fait / comment tester / reste manuel John.

---

## Reste manuel John (post-sprint)

1. Lancer la **requête de répartition espèces** en prod (avant D-B1) : `select unnest(species), count(*) from spots group by 1 order by 2 desc`.
2. **Valider la réglementation** de chaque nouvelle fiche (exactitude légale).
3. Si nouvelle RPC (D-B4) : appliquer la migration en prod + regen `lib/types.ts` + `get_advisors`.
4. Relire → merge `main` + déploiement. deploy-watch + qa-chrome (score espèce, gating, maillage).

---

## Décisions récapitulées
- **D-B1** liste finale ~20 · **D-B2** étendre le carnet (`catchSpeciesEnum`) · **D-B3** créneaux par espèce (saisons vs générique) · **D-B4** méthode « meilleurs spots » + gating.

*Brief produit le 2026-06-23 (mode ultracode/xhigh, suit `docs/BRIEF-TEMPLATE.md`). Cartographie source : exploration code espèces/SEO 2026-06-23.*
