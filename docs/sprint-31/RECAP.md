# Sprint 31 — RECAP (Phase 0 « Socle avant la refonte »)

> Exécuté le 2026-06-25 sur la branche **`sprint-31`** (créée depuis `main` = `0bbda4b`,
> **propre du sprint-32 SpeciesArt** — les deux sont indépendants et se mergeront
> séparément). **Non poussé** (à la demande de John).
> Remédie aux audits `docs/audits/AUDIT-2026-06-25-fonctionnel-seo.md` et `-profond.md`.

## État des gates (VERIF)

| Gate | Résultat |
|---|---|
| `pnpm test` (vitest) | ✅ **537 tests verts** (51 fichiers ; +21 nouveaux Bloc B/C) |
| `tsc --noEmit` | ✅ 0 erreur |
| `next build` | ✅ OK (toutes routes ; `/techniques` 4,72 kB) |
| `next lint` (projet entier) | ✅ « No ESLint warnings or errors » |
| Advisors Supabase (sécurité) | ✅ **71 — identique à la baseline** (3 ERROR assumés / 67 WARN / 1 INFO). La nouvelle table n'ajoute **aucun** advisor. |
| Revue croisée indépendante (agent) | ✅ **GO** (2 mineurs corrigés ci-dessous) |
| Anti-régression GPS / tier / RLS | ✅ **Aucun** fichier touché ne concerne le floutage, les vues `*_for_viewer`, le gating de tier ou une RPC sensible. |

---

## Ce qui a été fait, par bloc

### Bloc B — Article de département centralisé (F4) ✅
- Nouvelle fonction **pure et testée** `departmentArticle(code, prep)` + table `DEPARTMENT_GRAMMAR` dans `lib/geo/departments.ts`. `prep ∈ {'de','dans'}` → « du Finistère / des Landes / de l'Hérault / de la Corse-du-Sud » et « dans le / dans les / dans l' / dans la ». Fallback prudent (code inconnu → code brut, jamais `undefined`).
- Appliquée à **tous** les sites grep'és : `app/(app)/fil/[department]/page.tsx` (titre + sous-titre), `app/(app)/sorties/page.tsx` (×2), **+ surfaces SEO publiques** `app/(marketing)/spots/page.tsx` (H1 + description ×4) et `app/(marketing)/spots/[slug]/page.tsx` (description), `components/feed/EmptyFeed.tsx`.
- **Non touché** : `deptPreposition`/`programmaticTitle` (pages `/peche/…`) — système idiomatique « en Vendée » **déjà correct** (garde-fou « ne pas casser les libellés corrects »).
- **Tests** : 11 cas dont un **snapshot exhaustif des 24 départements** (verrouille chaque genre/élision).
- **Vérif** : `/fil/06` → « Fil **des** Alpes-Maritimes (06) » ; `/fil/2A` → « … **de la** Corse-du-Sud » ; `/fil/34` → « … **de l'**Hérault ».

### Bloc A — Honnêteté du « perso » (F2) ✅
- Marqueur **« Exemple »** sur la carte hero perso (`app/(marketing)/page.tsx`) et sur `HomeVisualCarnet` (`components/marketing/home-visuals.tsx` : « Ton année / RECORD PERSO / Ton plus beau bar »). Le tableau différenciateur passe de « Aperçu » à **« Exemple »**.
- Scope : **uniquement les surfaces perso** (le moat non livré). Map (compte de spots réel) et Feed (communauté) laissés tels quels.
- `TodayPersonalOverlay` confirmé **non utilisé hors app** (uniquement `/home` connecté) → rien à marquer côté marketing.

### Bloc C — Carnet 6 → 26 espèces (F3) ✅ — **AUCUNE migration**
- **Finding clé** : `catches.species` = **text libre** (zéro enum, zéro CHECK) → migration inutile (confirmé supabase-guard). Et `catchSpeciesEnum` dérivait **déjà** des 26 `inCarnet`. Seule la **liste codée en dur à 6** dans `CatchForm` posait problème.
- Nouveaux exports SOURCE UNIQUE dans `lib/seo/programmatic.ts` : `CARNET_SPECIES_OPTIONS` (26), `CORE_SPECIES_SLUGS` / `CORE_SPECIES_DB_KEYS` (les 6 cœur).
- `CatchForm` : nouveau `SpeciesPicker` = **6 quick-picks cœur + « Autre espèce »** déroulant une recherche (insensible aux accents) sur les 20 restantes. Mode édition : une espèce hors cœur (ex. seiche) s'affiche surlignée. Maille façade-aware **null-safe** pour les espèces sans maille.
- **Décision John (UX)** : « 6 rapides + recherche » (retenue). **Onboarding** : John a dit « aligner sur 26 » — **déjà fait depuis le sprint 23** (`onboarding-step.tsx` dérive du référentiel `inCarnet`), donc 0 changement nécessaire.
- **Tests** : verrou « 26 options = `CARNET_SPECIES_DB_KEYS` », « seiche/mulet/congre loguables », split quick(6)/autre(20).

### Bloc D — Petits fixes (F5, F7, F8)
- **F7 (feedback submit)** ✅ : `onInvalid` dans `CatchForm` → **scroll vers la 1re section fautive** (Espèce → Technique → Lieu, ids `catch-section-*`) + **toast** explicite. Fini le clic « dans le vide ».
- **F5 (a11y DialogTitle)** ✅ **déjà conforme — 0 code** : audit du code → **toutes** les modales ont déjà un nom accessible (`AlertDialogTitle`, `DialogTitle`, `SheetTitle`, ou `aria-label`). Le warning « DialogContent requires a DialogTitle » de l'audit **n'est pas reproductible** sur `main` : la lib est **Base UI** (`@base-ui/react`), pas Radix ; aucun `@radix-ui` installé ; la chaîne du warning n'existe pas dans Base UI. → à reconfirmer en live via qa-chrome (cf reste).
- **F8 (capture email /techniques)** ✅ — **décision John : ajouter une vraie capture** :
  - Migration **`057_guide_waitlist.sql`** (table `guide_waitlist` : email citext + source + created_at, `UNIQUE(email,source)`). **RLS INSERT-only** (anon + authenticated), **aucune policy SELECT** (impossible d'énumérer les emails), `WITH CHECK` = email plausible (longueur + regex) → bloque aussi l'advisor « RLS Policy Always True ». **Appliquée + vérifiée en prod.**
  - Action `app/actions/waitlist.ts` (`joinGuideWaitlist`) : zod email FR, `upsert ignoreDuplicates` (idempotent, pas de fuite « déjà inscrit »), **`source` figé serveur**, pas de `.select()`.
  - Composant `components/marketing/TechniquesWaitlist.tsx` + intégration `/techniques`. Meta « inscris-toi pour être notifié » désormais **VRAIE**.
  - ⚠️ **`robots: { index:false }` CONSERVÉ** (décision technique) : la page reste mince → indexer un « coming soon » nuit au SEO. L'option présentée disait « sort du noindex » ; je recommande d'**attendre du contenu** avant d'indexer. **À trancher par John** (retirer `robots` si tu veux l'indexer malgré tout).

### Bloc E — INP du composer (F6) ✅
- `components/feed/PostComposer.tsx` : la `<textarea>` passe **NON contrôlée** (`ref` + flag `hasText` basculé seulement au passage vide↔non-vide) → **zéro re-render de PostComposer par frappe**. L'optimistic update (publication/suppression) et le vidage post-envoi sont **préservés** (valeur lue au `ref` au submit).
- **Note honnête** : le diagnostic d'audit (re-render de la liste à la frappe) était **déjà** mitigé sur `main` (PostCard `memo`, état composer colocalisé, picker démonté quand fermé). Le 460 ms était probablement **gonflé par l'overlay de mesure** (l'audit l'admet). Le refactor durcit l'architecture mais **l'INP réel doit être re-mesuré live** (cf reste).

### Corrections post-revue indépendante (2 mineurs)
1. `SpeciesPicker` : fallback `selectedLabel ?? value` si une espèce **legacy hors-référentiel** est éditée (jamais d'étiquette vide).
2. Test `departmentArticle` : ajout du **snapshot exhaustif des 24 départements** (le test générique seul aurait laissé passer un mauvais genre).

---

## Comment tester (rapide)
- `pnpm test` → 537 verts. `pnpm build` → OK.
- `/fil/06`, `/fil/2A`, `/fil/34` : vérifier le `<title>` (des / de la / de l').
- `/carnet/nouvelle` : 6 quick-picks + « Autre espèce » → chercher « seiche », loguer, voir au carnet, supprimer.
- `/carnet/nouvelle` vide → « Loguer la prise » : scroll vers Espèce + toast.
- `/techniques` : formulaire email → succès « C'est noté ! ».
- Home déconnectée : badges « Exemple » sur la carte perso + le récap carnet.

## Reste manuel (John)
1. **Bloc F (QA gratuit)** — **préalable : me connecter un compte Découverte sans essai**. Plan prêt : `docs/sprint-31/qa-gratuit.md` (gating 3 spots/dépt, floutage, paywall, CTA tarifs « Démarrer l'essai 7 j »).
2. **qa-chrome** des écrans live (preview après merge) : confirmer **0 warning a11y** sur `/fil` (F5) + **mesurer l'INP** du composer hors overlay (F6) + captures desktop/mobile des badges « Exemple » (F2).
3. **Trancher** : `/techniques` indexable ou non (j'ai gardé `noindex`).
4. Relire → merge `sprint-31` → `main` → déploiement → QA finale.
5. (Hygiène, non bloquant) `supabase migration repair` de la dérive ancienne (001-005/008/013) + régulariser l'entrée 057 si besoin.
