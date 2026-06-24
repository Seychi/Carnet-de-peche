# Sprint 28 — RECAP (Polish & fluidité « feel natif » v2)

> Statut : **code-complet sur branche `sprint-28-polish-perf`, NON poussé** (3 commits sur `main`/`60bc888`).
> Périmètre tenu : **perf / UI / design only** — 0 migration, 0 RLS, 0 logique métier, **0 fichier `lib/` data / `supabase/` / `app/actions/`**.
> Verif : `pnpm build` vert (66/66) · **511/511 tests** · typecheck 0 · lint 0 · revue indépendante = **GO** (0 bloquant).
> Reframe respecté : **on n'a PAS refait la liste S16** (flash scroll, skeleton carte, 7 bugs de finition restent ceux du S16).

## Commits (branche `sprint-28-polish-perf`)

| Commit | Bloc | Contenu |
|---|---|---|
| `a843d02` | 1 | Fil → `/fil/[dept]` direct depuis le shell app (fin du flash footer). |
| `b38b3b1` | 3 | Tap targets ≥ 44 px + focus rings teal + `tabular-nums` (polish a11y surfaces S17-26). |
| `e40b280` | 4 | Retrait du bouton « Me déconnecter » doublon du dashboard `/home` + note de cadrage illustrations espèces. |

## Tableau perf carte (baseline — le cœur du « mesurer avant »)

| Métrique `/carte` (mobile, prod, médiane 3 runs Lighthouse) | Baseline mesurée S28 | Cible brief | Après S28 |
|---|---|---|---|
| Performance | **35** | ≥ 70 | 35 *(inchangé — voir décision)* |
| TBT | **3920 ms** | < 600 ms | 3920 ms |
| LCP | 6068 ms | — | — |
| CLS | ~0 | — | ~0 |
| 1ʳᵉ tuile carte | **~2,0 s** | < 2,5 s | ✅ (déjà OK, S16) |
| Canvas noir au mount | non (MapSkeleton) | non | ✅ |

## Fait, par bloc

### Bloc 1 — Fil : fin du flash footer ✅
Les liens « Fil » du shell app pointaient vers `/fil` (page du groupe `(marketing)`, Header+**Footer**) qui ne redirige qu'**ensuite** le connecté vers `/fil/[dept]` → footer marketing visible ~0,5 s. **Fix** : `home_department` lu dans `app/(app)/layout.tsx` (à côté de `is_moderator`) → filé `AppShell → AppSidebar / TabBar` ; le lien Fil devient `/fil/[home_department]` (route du **shell app**, zéro footer) si département connu, sinon `/fil` (chooser). Stub `/fil` conservé pour anonymes/SEO. État actif (`startsWith('/fil')`) intact.
> ⚠️ **Note** : ce fix avait été *évoqué* par la revue du sprint 27 mais n'était PAS une tâche du brief S27 ; il est correctement réalisé ici (Bloc 1). La route `/fil/[department]` se garde elle-même (`isCoastalDepartment` → 404, redirect login si déconnecté) → la nav ne contourne aucun gating.

### Bloc 2 — Perf JS carte : MESURÉ, décision « sprint dédié » ⏸️
**On a mesuré avant de toucher** (consigne). Verdict : **cible NON atteinte** (35 / 3920 ms vs ≥70 / <600 ms).
- Le **lazy-load MapLibre du S16 fonctionne** (confirmé code + réseau réel) : maplibre (406 Ko) **hors du bundle initial** (176 Ko critique), chargé à ~1,4 s post-hydratation, 1ʳᵉ tuile ~2 s, pas de canvas noir, CLS ~0.
- **MAIS le lazy-load déplace le coût, il ne le supprime pas** : dès que le chunk maplibre arrive, son `init()` s'exécute (useEffect mount) → **une long task de ~1537 ms** (+ 4 autres tâches de 365-660 ms, toutes attribuées au chunk maplibre) = **100 % du TBT**. C'est le coût de parse/compile/exec de MapLibre lui-même sur CPU mobile throttlé 4×.
- **Atteindre ≥70 / <600 ms exige une refonte « carte interactive différée »** (placeholder/statique d'abord, montage interactif à l'interaction/idle) pour sortir la long task de la fenêtre TBT — **hors périmètre polish**, avec tradeoff UX (carte interactive plus tard) + revérification gating tier/floutage GPS sur le chemin de mount.
- **Décision John (2026-06-24)** : **sprint perf carte dédié.** On accepte l'état *perçu* (skeleton + 1ʳᵉ tuile ~2 s) pour ce sprint ; aucun code carte modifié (zéro risque introduit). Plan de la refonte à cadrer.
- ⚠️ **Caveat baseline** : la « baseline S16 = 46/1240 ms » du brief n'est probablement pas comparable 1:1 (conditions de mesure différentes ; aujourd'hui maplibre-gl `^5.24`, PostHog, plus de JS app). Ce qui compte = l'**absolu vs cible** (35/3920 vs ≥70/<600).

### Bloc 3 — Polish a11y des surfaces post-S16 ✅
Défauts **réels** corrigés (audit mobile/a11y ; John daltonien → focus = **ring visible**, pas qu'une couleur) :
- **ProposalCard** : boutons Accepter/Refuser `px-2.5 py-1` → `min-h-11 px-3.5 py-1.5` ; liens Retirer/Se retirer/Annuler (texte nu) → `inline-flex min-h-11`.
- **OutingComposer** : `focus:ring-2 focus:ring-teal-500/40` sur inputs/select/textarea ; boutons Publier/Annuler `min-h-11`.
- **BulkCatchImport** : focus ring teal sur tous les champs ; bouton supprimer `h-9 w-9` (36 px) → `h-11 w-11` (44 px).
- **ScoreRing** (`ui-v2`) : chiffre en `tabular-nums` (corrige l'alignement sur species-score + NextWindowInsight d'un coup).
- **CatchStatsDetailed** : chevron `motion-reduce:transition-none`.
> Surfaces **déjà conformes** (RAS, non touchées, pas de polish inventé) : gamification (PokedexGrid/StreakCard/BadgesGrid/ConservationChallenges — déjà `font-mono`+`tabular-nums`, distinctions forme+texte daltonien-safe, statiques), réglementation (CatchRegulationSection/SpotRegulationCard/RecfishingNotice), `sorties/page.tsx`. ScrollReveal/AnimatedCounter : **pas** sur des listes longues → aucun risque de cascade ; `prefers-reduced-motion` déjà respecté partout.

### Bloc 4 — détails design ✅ / ⏸️
1. **Visuels espèces (tâche 1) ⏸️ DÉFÉRÉ** : décision John = **illustrations détaillées = lot d'assets à cadrer** (pas des silhouettes maison improvisées). `<Fish>` générique conservé en intérim. Cadrage : `docs/sprint-28/species-illustrations-lot.md` (20 slugs, 3 points d'intégration, contraintes perf/CLS/droits, décisions style/production à trancher).
2. **Bouton déconnexion `/home` (tâche 2) ✅** : `<SignOutButton>` proéminent du dashboard retiré (doublon avec l'avatar) → remplacé par « Voir mon carnet » → `/carnet` (`min-h-11`). `sign-out-button.tsx` supprimé (orphelin). Déconnexion toujours via l'avatar (UserMenu).

## VERIF (workflow build/test/review indépendant)
- `pnpm build` : exit 0, 66/66 pages. **`/carte` reste `ƒ Dynamic`** (force-dynamic), **`/especes/[slug]` reste SSG**, pas d'explosion de chunk, aucun warning nouveau.
- **511/511 tests**, typecheck 0, lint 0.
- Revue indépendante : **GO**, 0 bloquant, 0 à-corriger. Diff = perf/UI/design + docs uniquement ; **aucun** `supabase/` / `app/actions/` / logique `lib/`. La lecture `home_department` (layout) = simple SELECT RLS-safe scopé user, ne touche ni gating ni floutage GPS. 2 NITs cosmétiques non bloquants (clé React `t.href` vs `t.match` dans TabBar ; commentaire obsolète mentionnant `SignOutButton` dans `app/actions/auth.ts` — hors périmètre).

## Anti-régression ✅
`git diff --stat 60bc888..HEAD` = nav/UI + a11y + docs. **Aucun** fichier de données/sécurité touché → floutage GPS / gating de tier / RLS **intacts**. `/carte` non modifié (force-dynamic conservé). SEO `/especes` `/` inchangé.

## Comment tester
- `pnpm test` → 511/511. `pnpm build` → vert.
- Connecté avec département : cliquer « Fil » (sidebar desktop OU tab bar mobile) → on arrive direct sur `/fil/[dept]`, **plus de flash de footer**.
- `/sorties`, fiche espèce, carnet (BulkCatchImport) : contrôles ≥ 44 px, focus ring teal visible au clavier.
- `/home` : plus de bouton « Me déconnecter » ; « Voir mon carnet » à la place ; déconnexion via l'avatar.

## Reste manuel John (post-sprint)
1. **Ressenti sur ton téléphone** (mesure souveraine) : scroll des écrans neufs, transition Fil (plus de footer), carte.
2. **Planifier le sprint perf carte dédié** (refonte carte interactive différée — le vrai levier TBT ; cf Bloc 2). Décider si la baseline S16 est re-mesurée pour comparaison propre.
3. **Trancher la direction artistique** des illustrations espèces (cf `species-illustrations-lot.md`) pour débloquer le lot.
4. Relire la branche → merge `sprint-28-polish-perf` → `main` → déploiement → re-Lighthouse en prod.
5. Trivial hors-scope : `favicon.ico` 404 (présent sur toutes les pages).
