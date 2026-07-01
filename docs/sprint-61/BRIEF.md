# Sprint 61 — Brief d'exécution
## Records perso & célébrations (le crochet dopamine le moins cher)

> Rédigé le 2026-06-30. Durée cible : **1 passe Fable** (effort `xhigh`), M-L.
> Contexte : `docs/audits/AUDIT-2026-06-30-UX-DESIGN-GAMIFICATION.md` §2.2.4 + §3.5 ; `docs/ROADMAP-POST-AUDIT-2026-06-30.md` Phase B. Deuxième sprint dopamine.
> Décisions John 2026-06-30 : dopamine **solo d'abord**, **tasteful**. Ici on crée **le moment de fête** — c'est ce qui manque le plus (l'audit a constaté qu'obtenir « Première prise » en live était **totalement silencieux**).
> **Préalable** : le **Sprint 60 doit être mergé** (le trigger `award_xp` crédite déjà `personal_best` +30, `new_species` +50 à l'insert — cf commit `aa2177d`). **0 migration** ici.

> **🔀 Parallélisation** : peut tourner **en parallèle du Sprint 62** (61 = 0 migration, 62 = migration 099). Point de contact : la **primitive de célébration** (61 la crée) et les **badges** (62 la réutilise). Coordination en bas.

---

## 🚀 Ligne de lancement (à copier-coller par John)

> ultracode — effort xhigh. Exécute `docs/sprint-61/BRIEF.md`. Prérequis : Sprint 60 mergé.
> Lance le Bloc 0 (détection + primitive de célébration) d'abord, puis les Blocs 1 et 2 en
> parallèle, et termine par VERIF. Ancre le comportement de `award_xp`/`xp_events` via
> supabase-guard avant de coder la détection. Ne push pas.

---

## 🧠 Connecteurs & sous-agents

| Quand | Sous-agent → connecteur | Pourquoi |
|---|---|---|
| Comprendre ce que `award_xp`/le trigger renvoient et écrivent (kinds, `ref_id`) | **supabase-guard** → Supabase (RO) | Savoir comment détecter « un record vient de tomber » sans re-calculer à la main. |
| Anim/confetti (lib légère) + a11y (prefers-reduced-motion) | **docs-researcher** → Context7 | Pattern correct, respect de la sobriété DA + `prefers-reduced-motion`. |
| QA de la célébration + page records | **qa-chrome** → Claude in Chrome | Loguer une prise plus grosse → la fête part ; le 1er badge n'est plus muet. |
| Clôture | **`/verif-sprint`** | Tests + build + lint + types + revue indépendante. |

## Objectif du sprint en une phrase

Quand un **record perso** tombe (ou un badge se débloque) au log d'une prise, l'app le **célèbre visiblement** (modale/confetti + XP + partage), et la page « Tes records » montre la **progression vers le prochain palier**.

## Workstreams & dépendances

| WS | Bloc(s) | Durée | Dépend de | Parallélisable jour 1 |
|----|---------|-------|-----------|----------------------|
| A  | Bloc 0 — Détection + primitive de célébration | M | Sprint 60 mergé | ✅ |
| B  | Bloc 1 — Page « Tes records » enrichie | S-M | — | ✅ |
| C  | Bloc 2 — Célébration câblée (record + 1er badge) | S-M | Bloc 0 | ❌ |
| VERIF | revue finale | S | tous | ❌ |

---

## Bloc 0 — Détection « un record vient de tomber » + primitive de célébration

Le trigger du Sprint 60 écrit déjà une ligne `xp_events` `kind='personal_best'` (et `new_species`) pour la prise insérée. Il faut **remonter cette info au client** pour déclencher la fête, et créer une **primitive réutilisable**.

> **Connecteurs** : **supabase-guard** — lire comment le trigger nomme les `kind` et rattache `ref_id = catch_id` ; vérifier si `award_xp`/une RPC peut **renvoyer** les kinds octroyés pour ce catch (sinon, relire `xp_events` pour ce `ref_id` juste après l'insert).

### Tâches
1. **Détection** : dans l'action serveur de log de prise (`app/actions/catches*`), après l'insert, **lire les `xp_events` créés pour ce `catch_id`** (kinds : `personal_best`, `new_species`, `measured`…) et **renvoyer** au client un objet `{ newRecord?: {species, length, previousBest}, newSpecies?: boolean, xpGained: number, kinds: string[] }`. Ne pas recalculer le record côté client — se fier au ledger.
2. **Primitive de célébration** : `components/gamification/CelebrationOverlay.tsx` (réutilisable) — modale/confetti sobre, titre + sous-titre + montant XP + boutons « Partager » / « Continuer ». Respecte **`prefers-reduced-motion`** (pas de confetti si réduit). Réutilise les tokens DA v2 + le composant modale existant.

### Critères d'acceptation
- Loguer une prise plus grosse que ton meilleur de l'espèce → l'action renvoie `newRecord` avec la bonne taille + l'ancien record ; l'overlay s'affiche.
- La détection **ne se déclenche pas** si ce n'est pas un record (pas de faux positif).
- `CelebrationOverlay` respecte `prefers-reduced-motion` (vérif `qa-chrome`).

### Garde-fous
- Se fier au **ledger `xp_events`** (source de vérité du Sprint 60), pas à un recalcul client divergent.
- ⚠️ Ne pas modifier le trigger/`award_xp` du Sprint 60 (lecture seule ici).

---

## Bloc 1 — Page « Tes records » enrichie (`/carnet`)

La section « Tes records » existe déjà (sprint 45). L'enrichir avec la **progression**.

> **Connecteurs** : **qa-chrome** pour la QA visuelle.

### Tâches
1. Pour chaque espèce loguée : afficher le record actuel + une **barre/indication vers le prochain palier** de taille (ex. « Bar 55 cm → prochain jalon 60 cm »). Si des jalons de taille par espèce n'existent pas, en définir une petite table (`lib/gamification/size-milestones.ts`) sobre et honnête (pas de faux objectif).
2. Lien vers le partage « Mes records » (déjà existant).

### Critères d'acceptation
- La page montre, par espèce, le record + la progression vers le prochain jalon, sans chiffre inventé.

### Garde-fous
- Descriptif, pas de « tu vas battre » ; pas de comparaison inter-pêcheurs.

---

## Bloc 2 — Câbler la célébration (record + premier badge)

Utiliser la primitive du Bloc 0 pour **résoudre l'attribution silencieuse** (§3.5).

> **Connecteurs** : **supabase-guard** pour savoir quand `recompute_my_badges()` (sprint 56) marque un badge nouvellement obtenu ; **qa-chrome** pour la QA.

### Tâches
1. **Record** : au retour de l'action de log (Bloc 0), si `newRecord`/`newSpecies` → afficher `CelebrationOverlay`.
2. **Premier badge / nouveaux badges** : après le log, si `recompute_my_badges()` a débloqué un badge **non encore vu**, l'afficher via la même primitive (« 🏅 Badge débloqué : … »). Détecter le « nouvellement obtenu » (comparer aux badges connus avant le log, ou via `earned_at` récent). **Ne pas** re-fêter d'anciens badges.
3. Enchaînement propre si plusieurs événements tombent (record + badge) : les présenter en file, pas en superposition.

### Critères d'acceptation
- Loguer sa **première prise** déclenche la fête « Première prise » (fin du silence constaté en live).
- Un record + un badge le même log s'enchaînent proprement (pas de superposition cassée).
- Aucune re-célébration d'un badge déjà obtenu au log suivant.

### Garde-fous
- ⚠️ **COORDINATION Sprint 62** : 62 refond les badges (migration 099 + nouvelles familles). **Ici, la primitive et le câblage « record/1er badge » sont à 61 ; le câblage des nouvelles familles de badges est à 62** (qui réutilise `CelebrationOverlay`). Ne pas éditer les mêmes fichiers de définition de badges dans les deux sessions — 61 ne touche pas `lib/gamification/badges.ts` (c'est 62).

---

## Workstream VERIF (obligatoire, agent indépendant)

1. `/verif-sprint` (`pnpm test` + `pnpm build` + `pnpm typecheck` + `pnpm lint` + revue croisée + anti-régression). Puis **deploy-watch**.
2. Relire chaque critère (Blocs 0-2) avec preuve (`qa-chrome` : loguer un record → fête ; 1er badge → fête).
3. **Passe honnêteté** : record lu du ledger, aucun jalon inventé, aucune comparaison inter-pêcheurs.
4. **Passe a11y** : `prefers-reduced-motion` respecté ; overlay fermable clavier/Esc.
5. Livrer `docs/sprint-61/RECAP.md`.

## Reste manuel John (post-sprint)
- Relire → merge sur `main` (après ou avant 62 ; s'ils sont parallèles, merge un à la fois) → déploiement → QA (loguer un record → la fête part).
