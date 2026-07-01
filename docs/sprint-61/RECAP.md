# Sprint 61 — RECAP
## Records perso & célébrations (le crochet dopamine le moins cher)

> Exécuté le 2026-07-01 (effort xhigh). **0 migration.** Prérequis Sprint 60 mergé : OK (HEAD `aa2177d`).
> **CODE-COMPLET, NON poussé** (John relit → merge → déploie).

---

## Ce qui a été livré

### Bloc 0 — Détection « un record vient de tomber » + primitive de célébration

- **Détection depuis le ledger (source de vérité Sprint 60)** — `lib/gamification/celebration.ts` (NOUVEAU).
  `buildCatchCelebration(supabase, {...})` est appelée par `createCatch` **après** l'insert :
  elle **relit** les `xp_events` écrits par le trigger 098 pour ce `ref_id = catch.id`
  (`kinds` : `catch`/`new_species`/`personal_best`/`measured`/`released`), **sans jamais**
  recalculer le record côté client. Elle renvoie
  `{ species, kinds, xpGained, xpByKind, newSpecies, newRecord, newBadges }` ou `null`
  (rien à fêter → navigation directe habituelle).
  - `newRecord` (espèce, longueur, ancien record) **uniquement si le ledger a écrit un
    `personal_best`**. L'ancien record est retrouvé par la même requête que le trigger
    (max `measured_length_cm` des AUTRES prises **photo-vérifiées** de l'espèce).
  - **Badges** : on appelle explicitement `recompute_my_badges()` (le trigger XP ne
    recalcule PAS les badges) et on ne remonte QUE les badges dont
    `earned_at >= created_at` de la prise (même horloge Postgres → zéro dérive). Sans
    `created_at` (cas dégradé), **aucun** badge fêté (jamais de re-fête d'un ancien).
  - **Best-effort STRICT** : chaque lecture a son `try/catch`, la fonction ne throw jamais.
    Un échec (recompute, lecture ledger…) n'empêche jamais le log de réussir.
- **Primitive réutilisable** — `components/gamification/CelebrationOverlay.tsx` (NOUVEAU).
  Modale sobre bâtie sur la **Dialog Base UI** (focus trap, Esc, restauration du focus,
  backdrop gratuits) présentant une **file de « moments »** génériques un par un (jamais
  en superposition). Burst GSAP discret (16 fines particules, tokens `gold/teal/coral`)
  **strictement gaté par `prefers-reduced-motion`** (aucune particule rendue si réduit) —
  via `useMediaQuery('(prefers-reduced-motion: reduce)')`, **pas** le hook motion
  marketing (piège `RESPECT_REDUCED_MOTION=false` qui ignore la préférence sur la home).
  API découplée du domaine → **le Sprint 62 la réutilise** pour les nouvelles familles de
  badges (il passe ses propres `CelebrationMoment[]`).

### Bloc 1 — Page « Tes records » enrichie (`/carnet`)

- `components/catches/RecordsBySpecies.tsx` : chaque record affiche désormais une **barre
  de progression descriptive vers le prochain jalon rond** (« Prochain jalon 60 cm »).
- `lib/gamification/size-milestones.ts` (NOUVEAU) : `nextSizeMilestone` / `milestoneProgress`.
  **Honnête par construction** : le jalon = le prochain **multiple rond** au-dessus du
  record (arithmétique, pas un objectif fabriqué ni une taille max « officielle »
  affirmée). Le PAS s'adapte à l'échelle (5 cm petites espèces, 20 cm très grosses, 10 cm
  par défaut ≥ 50 cm) — un choix de granularité d'AFFICHAGE, pas une promesse. Descriptif,
  privé, **zéro comparaison inter-pêcheurs**. Le lien « Partager mes records » (existant)
  est conservé.

### Bloc 2 — Câbler la célébration (record + premier badge)

- `components/catches/CatchForm.tsx` : au retour d'un `createCatch`, si `result.celebration`
  existe → on ouvre `CelebrationOverlay` (au lieu du toast + navigation directe), puis on
  **navigue vers `/carnet/{id}` à la fermeture** de l'overlay (dernier « Continuer », Esc,
  ou backdrop), une seule fois. `buildCatchMoments` construit la file : **record d'abord,
  puis nouvelle espèce, puis badges** (chaque moment = icône + titre + sous-titre + XP ;
  le moment record porte un bouton « Partager mes records » geom-free).
- **Fin du silence constaté en live** : la **première prise** d'un nouveau pêcheur déclenche
  la fête (`new_species` + badge `Première prise` via `recompute_my_badges`), même sans
  photo.

---

## Décisions & points à connaître (⚠️ pour John)

1. **★ Le record se fête pour une prise MESURÉE (photo-vérifiée), pas pour n'importe quelle
   prise plus grosse.** C'est voulu : le trigger Sprint 60 n'écrit `personal_best` que pour
   une prise `photo_verified_at` (toggle « Prise mesurée » + longueur + objet de référence)
   qui bat le meilleur mesuré antérieur — c'est l'invariant **anti-farm** (une longueur
   auto-déclarée croissante ne peut pas farmer +30). Le brief l'impose explicitement
   (« se fier au ledger, pas à un recalcul client divergent » ; « ne pas modifier le trigger »).
   **Conséquence** : tant que les pêcheurs n'utilisent pas « Prise mesurée », la fête
   « record » sera rare (la fête « nouvelle espèce » et les badges, eux, tombent sans photo).
   → **Si tu veux fêter TOUT record de taille (même non mesuré)**, c'est un **changement
   produit** qui touche l'invariant anti-farm : à trancher (option A : garder l'alignement
   ledger, actuel ; option B : célébrer une taille max descriptive côté carnet en plus,
   sans octroyer d'XP). J'ai gardé l'option A (alignée Sprint 60). **DEMANDER À JOHN si B.**
2. **Coordination Sprint 62 (clone partagé — IMPORTANT).** `lib/gamification/badges.ts`
   n'a **PAS** été touché par le Sprint 61 (import seulement). MAIS le Sprint 62 tourne en
   parallèle **sur le même clone** et a, en cours de session, **réécrit `badges.ts`** (modèle
   de badges à paliers, migration 099) : il **supprime `BADGE_BY_SLUG`** (API Sprint 60) et
   expose `badgeTierLabel(slug)`. Pour ne dépendre d'aucune des deux versions et **survivre à
   n'importe quel ordre de merge 61/62**, `celebration.ts` résout le libellé d'un badge via un
   **résolveur résilient** (`resolveBadgeLabel`) qui sonde `BADGE_BY_SLUG` **puis**
   `badgeTierLabel`, avec repli sur le slug. Résultat : Sprint 61 **compile et passe ses tests
   sur `main` (=Sprint 60, `BADGE_BY_SLUG`) ET sur l'arbre partagé actuel (Sprint 62,
   `badgeTierLabel`)**. La primitive `CelebrationOverlay` + le câblage record/1er badge sont à
   61 ; le câblage des **nouvelles familles** de badges reste à 62 (il réutilise
   `CelebrationOverlay` avec ses propres moments). À l'intégration finale des deux, on pourra
   simplifier `resolveBadgeLabel` vers l'API retenue.
3. **Nested dialog** : le bouton « Partager mes records » de l'overlay est le `ShareButton`
   existant (ses propres dialogs Base UI). Comme ils sont rendus **dans** la `DialogContent`
   de la célébration (descendants React → Base UI les traite en dialogs imbriqués), le clic
   n'y dismisse pas la modale parente. À **confirmer en QA live** (je ne peux pas QA la prod).

---

## Fichiers

**Nouveaux** : `lib/gamification/celebration.ts`, `lib/gamification/size-milestones.ts`,
`components/gamification/CelebrationOverlay.tsx`,
`lib/gamification/__tests__/celebration.test.ts`,
`lib/gamification/__tests__/size-milestones.test.ts`.

**Modifiés** : `lib/catches/actions.ts` (createCatch → `celebration` optionnel ;
`select('id, created_at')`), `components/catches/RecordsBySpecies.tsx`,
`components/catches/CatchForm.tsx`.

**0 migration.** `lib/gamification/badges.ts` **inchangé** (garde-fou Sprint 62).

---

> ⚠️ **Le clone est partagé avec le Sprint 62 (session parallèle) qui écrit en même temps.**
> Un `tsc`/`build` sur l'arbre COMPLET échoue à cause des fichiers WIP du Sprint 62 (au fil de
> la session : `lib/gamification/queries.ts` — type `Streak` changé dans `streaks.ts` ;
> `badges.test.ts`, `ManageShareCards.tsx`, `ShareOptInDialog.tsx`). **Aucun de ces fichiers
> n'est du Sprint 61.** La vérification ci-dessous porte sur le Sprint 61 **isolé** (sur
> `main` = Sprint 60, sa cible de merge réelle).

- **Tests** : `vitest run` → **630 passés / 630** (avant que le WIP Sprint 62 ne casse
  `badges.test.ts`). Les tests **du Sprint 61** (9 `size-milestones` + 5 `celebration`) + les
  23 `createCatch`/actions passent sur l'arbre **actuel** (Sprint 62) ET isolé (Sprint 60) →
  **37/37**. La détection ne consomme la file de mocks qu'APRÈS l'insert → FIFO intacte.
- **Typecheck** : `tsc --noEmit` → **0 erreur dans les 8 fichiers du Sprint 61** (les seules
  erreurs de l'arbre sont dans des fichiers WIP du Sprint 62, listés ci-dessus).
- **Lint** : `eslint` sur tous les fichiers changés → 0 warning / 0 erreur.
  (Les diagnostics IDE « aria-value* invalide » / « inline styles » sont des faux positifs :
  les mêmes patterns sont déjà livrés — `role="progressbar"` dans `XpBar.tsx`,
  `style={{width}}` dans `XpBar`/`ScoreBreakdown` — et passent le lint projet.)
- **Build (isolé)** : worktree détaché sur `aa2177d` (Sprint 60) + les 6 fichiers Sprint 61
  copiés → `pnpm build` → **✓ Compiled successfully, BUILD_EXIT:0** (routes générées). C'est
  exactement l'état que John obtiendra en mergeant Sprint 61 sur `main`.
- **Revue croisée indépendante** : agent adversarial (GPS / gating / RLS / anti-farm /
  honnêteté / a11y / frontière client-serveur / navigation). **Verdict : tous les invariants
  Sprint 61 TIENNENT.** Le seul BLOCKER relevé était le couplage `celebration.ts` →
  `BADGE_BY_SLUG` (que le Sprint 62 venait de supprimer sur le clone partagé) → **corrigé**
  par le résolveur résilient (cf décision 2). Findings mineurs **corrigés** aussi : **M2**
  (parité de l'« ancien record » avec le trigger : ajout du filtre `measured_length_cm IS NOT
  NULL`), **M3** (repli navigation directe si la célébration ne produit aucun moment
  affichable — jamais bloqué sur le formulaire). NIT N1/N2 laissés (cosmétiques, invariant
  a11y déjà tenu : la modale est focus-trap + `DialogTitle` toujours présent).

### Passe honnêteté
- Record lu du **ledger** (`personal_best`), jamais recalculé/inventé côté client.
- Jalons de taille = **multiples ronds** (aucune taille max fabriquée), descriptifs,
  aucune comparaison inter-pêcheurs.

### Passe a11y
- Overlay = Dialog Base UI → **focus trap + Esc + restauration du focus** ; `DialogTitle`
  toujours présent. Burst **gaté `prefers-reduced-motion`**. John daltonien : le sens passe
  par l'**icône + le texte** (le titre « Nouveau record », « Nouvelle espèce », « Badge
  débloqué »), la couleur n'est qu'un accompagnement.

---

## Reste manuel John (post-sprint)
- Relire → merge sur `main` (avant ou après 62 ; si parallèles, un à la fois) → déploiement.
- **QA live** : loguer une **prise mesurée** plus grosse que ton meilleur mesuré de l'espèce
  → la fête « record » part ; loguer une **première prise** → fête « nouvelle espèce » +
  badge « Première prise » (fin du silence). Vérifier `prefers-reduced-motion` (pas de
  confetti) et la fermeture clavier (Esc).
- Trancher la **décision 1** (record mesuré vs tout record de taille).
