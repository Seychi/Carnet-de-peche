# Sprint 65 — Brief d'exécution
## Mobile & copie honnête

> Rédigé le 2026-06-30. Durée cible : **1 passe Fable** (effort `xhigh`), M.
> Contexte : `docs/audits/AUDIT-2026-06-30-UX-DESIGN-GAMIFICATION.md` §1.7 (mobile + honnêteté) ; `docs/ROADMAP-POST-AUDIT-2026-06-30.md` Phase D. Trouvailles issues d'un audit **code + audits mobile existants** (la session live était bloquée en largeur desktop) → **valider chaque fix en viewport mobile réel** via Playwright.
> Décisions John 2026-06-30 : sprint de polish mobile + honnêteté de copie. **On ne construit pas** de nouvelle feature ici (ex. push notifications) : on **aligne la copie sur ce qui est réellement livré**.

**Préalable avant de démarrer** (manuel John) : aucun. **0 migration.**

> **🔀 Parallélisation** : tourne **en parallèle** des Sprints **59**, **60**, **64** (**0 migration** → aucune collision avec le 098 du 60). Points de contact légers (bandeau instruments, composants overlay carte) documentés en bas.

---

## 🚀 Ligne de lancement (à copier-coller par John)

> ultracode — effort xhigh. Exécute `docs/sprint-65/BRIEF.md`. Lance les Blocs 0, 1 et 2
> en parallèle dès maintenant (fichiers disjoints), et termine par le workstream VERIF.
> Valide chaque fix en **viewport mobile réel** (Playwright, 390 px et 360 px). Ne push pas.
> Marque `⚠️ DEMANDER À JOHN` toute promesse produit à trancher (copie tarifs).

---

## 🧠 Connecteurs & sous-agents (usage systématique — cf `CLAUDE.md` §20)

| Quand | Sous-agent → connecteur | Pourquoi |
|---|---|---|
| Vérifier le viewport mobile (≤390 px, ≤360 px), overflow, tailles de police | **qa-chrome** → Claude in Chrome + **Playwright (device emulation)** | La session live est bloquée en desktop ; Playwright émule un vrai téléphone. C'est **la** manière de prouver les fixes mobile. |
| Patterns CSS (scroll-cue/mask, fluid type, safe-area) + Tailwind v4 | **docs-researcher** → Context7 | Pattern version-correct. |
| Confirmer le **vrai** rayon de floutage GPS + ce que la notif « créneau » livre réellement | **supabase-guard** (RO) + lecture code (`lib/geo`, migration 028, notif « optimal window » sprint 26) | Ne pas écrire une copie qui ment dans l'autre sens. |
| Clôture | **`/verif-sprint`** | Tests + build + lint + types + revue indépendante. |

## Objectif du sprint en une phrase

Aucun débordement/police illisible sur petit écran (≤ 360-390 px), et **toute la copie « chiffrée » (floutage GPS, notifications) alignée sur ce qui est réellement livré**.

## Workstreams & dépendances

| WS | Bloc(s) | Durée | Dépend de | Parallélisable jour 1 |
|----|---------|-------|-----------|----------------------|
| A  | Bloc 0 — Débordements (bandeau, onglets Fil) | M | — | ✅ |
| B  | Bloc 1 — Lisibilité (fontes 9-10 px) | M | — | ✅ |
| C  | Bloc 2 — Honnêteté copie (GPS, notifs) | S-M | — | ✅ |
| VERIF | revue finale | S | tous | ❌ |

---

## Bloc 0 — Débordements sur petit écran

Deux débordements horizontaux sans repère de scroll : le **bandeau instruments** (clippé ≤ 390 px, dernier item « créneau » coupé) et les **onglets Fil** (3 labels ~453 px, débordent ≤ 360 px).

> **Connecteurs** : **docs-researcher** (Context7) pour le pattern « scroll horizontal + masque/dégradé de bord » ; **qa-chrome** (Playwright) à 390 px et 360 px.

### Tâches
1. **Bandeau instruments** (`components/layout/AppInstruments.tsx` / `instruments-bar.tsx`) : le rendre **scrollable horizontalement** avec un **repère visuel** (dégradé/mask-image sur le bord droit) pour indiquer qu'il continue, OU condenser à ≤ 390 px. **Ne pas** changer les données affichées (elles viennent de `format.ts`, possédé par le Sprint 59 — voir coordination).
2. **Onglets Fil** (`components/feed/*` — « Ton département / Tes follows / Toute la côte ») : éviter le débordement ≤ 360 px (scroll horizontal avec cue, ou labels condensés, ou tabs qui wrap proprement).

### Critères d'acceptation
- À **390 px** et **360 px** (Playwright) : le bandeau instruments n'est plus coupé net sans indice ; on voit qu'il scrolle (dégradé/mask) ou tout tient.
- À **360 px** : les 3 onglets Fil sont tous atteignables sans débordement cassé.
- Aucune régression desktop (le bandeau/les onglets rendent comme avant ≥ 960 px).

### Garde-fous
- ⚠️ **COORDINATION Sprint 59** : `lib/conditions/format.ts` (données du bandeau) est touché par le Sprint 59 (hydratation). **Ici on ne touche que le layout/CSS du bandeau**, pas `format.ts`. Zéro conflit si on respecte ça.
- Ne pas retirer d'info du bandeau (dépt, vent, houle, créneau restent).

---

## Bloc 1 — Lisibilité (fontes 9-10 px)

`text-[9px]/[10px]` + `text-ink-300` = 71 occurrences sur 37 fichiers, concentrées sur les overlays data (`SpotPopup` ×8, `MapLayerSelector` ×6, `MapLegend` ×4, `BadgesGrid`/`TideStrengthBand` ×4, `CatchCard`/`CatchFiltersBar`/`MapFilters` ×3). Illisible sur mobile.

> **Connecteurs** : **docs-researcher** (Context7) pour un pattern de type fluide (clamp) cohérent Tailwind v4 ; **qa-chrome** (Playwright) pour vérifier la lisibilité mobile.

### Tâches
1. Passe ciblée sur les **surfaces data denses les plus visibles d'abord** : `SpotPopup.tsx`, `MapLayerSelector.tsx`, `MapLegend.tsx`, puis `BadgesGrid`, `TideStrengthBand`, `CatchCard`, `CatchFiltersBar`. Remonter les `9-10 px` à **≥ 12 px** (idéalement via un token/utilitaire réutilisé, pas du one-off), et revoir `text-ink-300` là où le contraste est trop faible.
2. Ne pas tout remonter aveuglément : garder la hiérarchie (les labels secondaires peuvent rester plus petits que les valeurs, mais ≥ 12 px).

### Critères d'acceptation
- Sur les surfaces ciblées, **aucune police < 12 px** en donnée mobile (grep `text-\[(9|10|11)px\]` = 0 sur les fichiers traités ; vérif visuelle Playwright).
- Contraste des labels data ≥ AA sur fond mobile.
- Desktop inchangé visuellement (ou légèrement plus lisible, jamais cassé).

### Garde-fous
- ⚠️ **COORDINATION Sprint 64** : le Sprint 64 possède `MapView.tsx` / `MapFilters.tsx` / `MapShell.tsx`. **Ici on touche `SpotPopup.tsx`, `MapLayerSelector.tsx`, `MapLegend.tsx`** (overlays), pas ceux du 64. Si un fichier est ambigu (`MapFilters.tsx` a 3 occurrences de petite police ET est touché par le 64 pour le filtre fantôme), **laisser les fontes de `MapFilters.tsx` au 64** ou coordonner — ne pas éditer `MapFilters.tsx` dans les deux sessions.
- Ne pas changer la logique des composants, juste la typo/contraste.

---

## Bloc 2 — Honnêteté de copie (floutage GPS + notifications)

Deux promesses à réaligner sur la réalité (item d'honnêteté, touche le moat + le paywall).

> **Connecteurs** : **supabase-guard** (RO) + lecture `lib/geo`/migration 028 pour le **vrai** rayon de floutage ; lecture du système de notif (« optimal window », sprint 26) pour savoir ce qui est **réellement** envoyé.

### Tâches
1. **Floutage GPS** : la copie dit par endroits « **1 km** » alors que le flou réel est **~500-900 m** (jitter recentré, migration 028) — et un audit a même mesuré moins. **Vérifier d'abord le vrai rayon** (code + éventuellement mesure), puis **aligner toute la copie** (`/tarifs`, home, marketing) sur la réalité — formulation honnête type « **coordonnées floutées de plusieurs centaines de mètres** » plutôt qu'un chiffre exact contestable. Ne pas sur-promettre (« précis ») ni sous-promettre.
2. **Notifications `/tarifs`** : le plan Local vend « **Notifications push (créneaux optimaux, grandes marées)** ». Le **push** (mobile) n'existe pas encore. **Vérifier ce qui est réellement livré** (la notif « optimal window » du sprint 26 est-elle in-app ? email ?). Puis **ajuster la copie** pour ne promettre que ce qui existe (ex. « alertes créneaux optimaux » in-app/email), **sans construire** de système de push ici.

### Critères d'acceptation
- Grep de la copie : plus aucune mention « 1 km » de floutage qui contredit le réel ; formulation alignée et cohérente partout.
- `/tarifs` ne promet plus de « push » si le push n'est pas livré ; la promesse notif correspond à ce qui part réellement (vérifié).
- Aucune promesse produit mensongère restante sur ces deux points.

### Garde-fous
- ⚠️ **DEMANDER À JOHN AVANT** : la reformulation exacte de la promesse notifications (retirer « push » vs livrer plus tard) — c'est une décision produit/marketing. Proposer une formulation, il tranche.
- Respecter la règle copie `CLAUDE.md` §6 : **pas de tiret cadratin** dans la copie visible ; tutoiement ; pas d'affirmation invérifiable.

---

## Workstream VERIF (obligatoire, agent indépendant)

1. Lance **`/verif-sprint`** (`pnpm test` + `pnpm build` + `pnpm typecheck` + `pnpm lint` + revue croisée + anti-régression). Puis **deploy-watch** (Vercel + Sentry).
2. Relire chaque critère (Blocs 0-2) et cocher ✅/❌ **avec preuve** : **captures Playwright à 390 px ET 360 px**, grep des fontes, grep de la copie floutage/notifs.
3. **Passe anti-régression** : desktop (≥ 960 px) inchangé ; carte/fil fonctionnels ; gating/floutage intacts.
4. **Passe copy (centrale ici)** : tutoiement, pas de tiret cadratin ajouté, zod FR, **zéro promesse mensongère** (floutage + notifs alignés au réel).
5. Livrer **`docs/sprint-65/RECAP.md`** : fait / comment tester (viewports) / décisions copie prises / reste manuel John.

## Reste manuel John (post-sprint)

- **Trancher** la formulation « notifications » de `/tarifs` (⚠️ Bloc 2) : retirer « push » ou l'assumer comme à venir.
- Relire → merge sur `main` → déploiement → QA rapide sur ton téléphone (les fixes ont été validés en émulation, un coup d'œil device réel est un plus).

---

## 🔀 Notes de coordination (multi-sessions)

- **`lib/conditions/format.ts`** : touché par le **Sprint 59** (hydratation). Ici on ne touche **que le layout/CSS** du bandeau instruments, jamais `format.ts`.
- **Composants carte** : le **Sprint 64** possède `MapView/MapFilters/MapShell`. Ici on touche les **overlays** (`SpotPopup`, `MapLayerSelector`, `MapLegend`). Si `MapFilters.tsx` doit voir ses petites polices remontées, **laisser ça au 64** (il possède le fichier) plutôt que d'éditer des deux côtés.
- **0 migration** → aucune collision avec le 098 du Sprint 60. Une branche `sprint-65` dédiée, merge quand prêt.
