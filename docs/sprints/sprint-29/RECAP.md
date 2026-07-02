# Sprint 29 — RECAP (Pôle Espèces v2 : +6 espèces du bord)

> Statut : **code-complet sur branche `sprint-29-especes-v2`** ; mergé `main` + déployé (cf bas de page).
> Périmètre tenu : **éditorial + référentiel + SEO**. **0 migration** (espèces = texte libre, confirmé supabase-guard), 0 RLS, **0 illustration** (lot reporté). Exactitude réglementaire **sourcée + datée**, aucune maille inventée.
> Verif : `pnpm build` vert (72/72, **26 fiches** SSG) · **517/517 tests** (dont cohérence réglementation 58/58) · typecheck 0 · lint 0 · revue indépendante **GO** (0 bloquant, 0 à-corriger).

## Le catalogue passe de 20 → **26 espèces**

barracuda · tassergal · liche · marbré · lieu noir · merlan (validées par John au lancement ; `inCarnet=true`).

## Réglementation vérifiée (Bloc 0 — l'input bloquant)

Recherche web sourcée + datée le **24/06/2026** (6 agents, 1/espèce, Légifrance + DIRM + FFPSA), consignée dans **`docs/sprint-29/regulation-research.md`**. Re-vérifiée par la passe VERIF (marbré 20 cm et lieu-noir 35 cm + marquage re-confirmés sur le web).

| Espèce | Maille Manche-Atl | Maille Méditerranée | Marquage | Note |
|---|---|---|---|---|
| barracuda | — (null) | — (null) | non | **pas de maille nationale** (PNM Golfe du Lion 65 cm = local) |
| tassergal | — (null) | — (null) | non | **pas de maille nationale** ; piège « quota du bar » évité |
| liche | — (null) | — (null) | non | **pas de maille nationale** (PNM ~50 cm = local) |
| marbré | — (null) | **20 cm** | non | 20 cm Med (annexe Méditerranée) ; « 23 cm » écarté |
| lieu noir | **35 cm** | — (null) | **oui** | ≠ lieu jaune (PAS de quota/fermeture) ; absent Med |
| merlan | **27 cm** | — (null) | non | absent Med (eau froide) |

`null` = espèce **non listée** dans l'annexe = pas de maille (réponse honnête) → les fiches l'écrivent EXPLICITEMENT (« pas de taille minimale réglementaire en France ») + reco no-kill/maturité. **Zéro chiffre inventé.**

## Commits (branche `sprint-29-especes-v2`, sur `main`/`f9cf23e`)

| Commit | Bloc | Contenu |
|---|---|---|
| `6b5b53f` | 0+1 | recherche réglementaire sourcée + 6 slugs dans `SPECIES`/`SPECIES_REGULATION` (valeurs exactes, `null` honnête) |
| `838a8ce` | 2 | 6 fiches profondes sourcées (standard sprint 23) + `index.ts` |
| `2cd9637` | 3+4 | chinchard dédup (sévereau/saurel/gascon) + seed tagging **non appliqué** |
| `4cf9d6e` | VERIF-fix | `SPECIES_HABITAT` + compteurs tests pour le catalogue à 26 |

## Fait, par bloc

- **Bloc 1 — référentiel** : 6 slugs ajoutés à `SpeciesSlug` + `SPECIES` (label, dbKey snake_case, latin, **accords de genre corrects** : la liche=f, les 5 autres=m) + `SPECIES_REGULATION` (valeurs exactes Bloc 0). TypeScript force la complétude des 3 `Record<SpeciesSlug,…>`. Home : **« 26 espèces de chez nous »** (compteur dynamique S27, automatique).
- **Bloc 2 — 6 fiches profondes** : chacune au standard `bar.ts` (intro, identity, regulation datée, saisons **par façade**, techniques, postes, FAQ), voix pêcheur, **angles distincts** (barracuda=digues éclairées, tassergal=banc/dents acier, liche=popper/delta du Rhône, marbré=dentelle surfcasting, lieu-noir=banc pleine eau ≠ lieu jaune, merlan=surfcasting d'hiver). Façades absentes traitées **honnêtement** (eau trop froide/chaude, activité 1). `regulation.minSizeCm`/`marquage` == `SPECIES_REGULATION` (**test de cohérence 58/58**). Relues une par une (exactitude + ton).
- **Bloc 3 — dédup chinchard** : intro + FAQ enrichies des noms **sévereau / saurel / gascon** (Trachurus trachurus). **Aucun** nouveau slug.
- **Bloc 4 — maillage/SEO** : tout est **générique par `SPECIES`** → 26 cartes `/especes`, 26 pages `/especes/[slug]` (SSG), 26 og:image, 26 entrées sitemap, **automatiquement**. `hasProgrammatic:false` pour les 6 → **0 page `/peche/…` creuse** (anti thin content vérifié au build). Composants `species-*` génériques par slug (confirmé, pas de hardcode). **Top spots = état vide honnête** tant que pas de tagging.
- **VERIF** : a révélé 2 trous d'auto-dérivation (corrigés) — `SPECIES_HABITAT` (hand-maintained, lib/conditions) manquait les 6 → ajoutées (habitat indicatif d'après les fiches) ; compteurs tests référentiel/pokédex `20→SPECIES_SLUGS.length` (croissance légitime, `buildPokedex` déjà générique).

## Anti-régression ✅
Diff = éditorial + référentiel + data réglementaire + 1 seed SQL + docs. **Aucune migration**, aucun fichier `supabase/migrations/`, aucune RLS, aucun `app/actions/`. Le seed SQL n'est **pas appliqué**. Les 20 espèces existantes intactes (seul chinchard enrichi).

## Reste manuel John (post-sprint)
1. **Relire les 6 fiches** (exactitude halieutique + ton) — la réglementation est sourcée/datée, mais ton œil de pêcheur sur les saisons/techniques est précieux. ⚠️ Quelques points factuels signalés par les agents (non bloquants) : noms de spots cités dans lieu-noir (Étretat/Fécamp) ; `tailleMax` = sujets de pleine mer (cadré dans le texte) ; quotas **locaux** PNM (barracuda/liche) à confirmer sur le mémento du Parc si l'app cible un jour cette zone.
2. **Arbitrer le tagging de spots** : `supabase/seed-species-tagging-sprint29.sql` est prêt (idempotent, conservateur, par façade × structure, `source='curated'`) mais **non appliqué** → top-spots des 6 fiches vides jusque-là (volontaire, honnête). À relire/appliquer si tu veux peupler.
3. **Badge `pokedex_complete`** (gamification, DB migration 056) : fixé à **≥ 20 espèces distinctes** — désormais < catalogue (26). C'est une RPC DB (hors périmètre no-migration de ce sprint) ; à revisiter si tu veux que « Pokédex complet » suive le catalogue.
4. **Ajouter les 6 au lot illustrations** (`docs/sprint-28/species-illustrations-lot.md`) quand il sera lancé (catalogue → 26). Intérim : `<Fish>` générique.
5. Optionnelles backlog : raie bouclée (riche en régl.), turbot, petite roussette, flet, pagre, girelle.

## Comment tester
- `pnpm test` → 517/517. `pnpm build` → vert, `/especes/[slug]` = 26 chemins, `/peche/[...]` inchangé (15, espèces cœur uniquement).
- `/especes` → 26 cartes. `/especes/barracuda` (et les 5 autres) → fiche complète, réglementation datée, « pas de maille » explicite pour les espèces sans maille.
