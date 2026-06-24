# Sprint 27 — Brief d'exécution
## IA & Navigation — relier ce qui existe (prérequis du mobile)

> Rédigé le 2026-06-24. Durée cible : ~1 semaine.
> Contexte : audit `docs/audits/AUDIT-UX-2026-06-24.md` + roadmap `docs/ROADMAP-2026-H2-SUITE.md`. Fait suite au sprint 26 (RECAP `docs/sprint-26/RECAP.md`).
> Décisions John 2026-06-24 : on règle l'**atteignabilité** AVANT le mobile ; quick-wins approuvés ; format markdown dans le repo.
> Périmètre : **navigation / UI uniquement**. **Aucune migration, aucune RLS, aucun changement de schéma.** Si un agent pense devoir toucher la base, il s'égare → s'arrêter et le signaler.

**Préalable avant de démarrer** (Bloc 0, à faire en premier) : une branche `sprint-27-quickwins-nav` existe déjà avec 4 correctifs **non committés et non vérifiés** (la session d'audit n'a pas pu lancer lint/build — synchro de chemins du bac à sable). Bloc 0 reprend, vérifie et committe cette base.

---

## 🚀 Ligne de lancement (à copier-coller par John)

> ultracode — effort xhigh. Exécute `docs/sprint-27/BRIEF.md`. Commence par le Bloc 0 (reprise + vérif de la branche `sprint-27-quickwins-nav`), puis lance les workstreams A/B/C en parallèle en respectant le tableau de dépendances, et termine par le workstream VERIF avant de me rendre la main. Sois critique : vérifie chaque hypothèse contre le vrai code, remets en cause le brief s'il se trompe, et fais une passe anti-régression (gating de tier, floutage GPS, perf bundle, SEO). Ne push pas.

---

## 🧠 Connecteurs & sous-agents (usage systématique — cf `CLAUDE.md` §20)

| Quand | Sous-agent → connecteur | Pourquoi |
|---|---|---|
| Avant tout pattern Next 15 (App Router, route groups, client/server, `createBrowserClient`) ou Tailwind v4 | **docs-researcher** → Context7 | Pattern version-correct (pas de code de mémoire) — surtout pour le CTA auth-aware sans casser le cache statique (Bloc 3). |
| QA des écrans (preview + **device mobile réel**) | **qa-chrome** → Claude in Chrome + Playwright | Captures desktop + mobile, console, anti-régression nav. |
| Après déploiement | **deploy-watch** → Vercel + Sentry | Zéro régression runtime sur les layouts modifiés. |
| Clôture | **`/verif-sprint`** | Tests + build + typecheck + lint + revue indépendante + anti-régression. |

> **supabase-guard : non requis ce sprint** (aucun changement DB). Si un agent l'invoque pour écrire, c'est un signal qu'il sort du périmètre.

---

## Objectif du sprint en une phrase

**Zéro page orpheline et une nav cohérente desktop/mobile** : toute page finie est atteignable en ≤ 2 taps depuis le shell courant, sur les deux gabarits — pour poser une IA propre avant le port mobile.

---

## Workstreams & dépendances

| WS | Bloc(s) | Durée | Dépend de | Parallélisable jour 1 |
|----|---------|-------|-----------|----------------------|
| 0  | Bloc 0 (reprise branche) | 0,5 j | — | ✅ (à faire en premier) |
| A  | Bloc 1 (atteignabilité) | 1-1,5 j | Bloc 0 | ✅ après Bloc 0 |
| B  | Bloc 2 (tab bar + « Plus ») | 1,5-2 j | — (composant) ; cale la liste finale sur Bloc 1 | ✅ |
| C  | Bloc 3 (ponts inter-shells) | 1 j | — | ✅ |
| D  | Bloc 4 (tests nav + a11y) | 0,5 j | A, B, C | ❌ |
| VERIF | revue finale | 0,5 j | tous | ❌ (toujours en dernier) |

---

## Bloc 0 — Reprise & vérification de la branche quick-wins

La branche `sprint-27-quickwins-nav` contient déjà 4 correctifs sûrs **relus mais non vérifiés par lint/build** : `components/layout/AppSidebar.tsx` (ajout Co-pêchage + groupe « Découvrir » Espèces/Guides), `components/layout/UserMenu.tsx` (ajout Accueil + Co-pêchage + Espèces + Guides), `components/mobile-nav.tsx` (ajout Co-pêchage), `app/(marketing)/page.tsx` (stat « 6 » → « 20 »). Ne PAS refaire ces edits — les vérifier et committer.

> **Connecteurs** : aucun (local). Juste lint/build/typecheck.

### Tâches
1. `git checkout sprint-27-quickwins-nav` ; `git status` (attendu : 4 fichiers modifiés non committés, + 2 docs untracked `docs/audits/AUDIT-UX-2026-06-24.md` et `docs/ROADMAP-2026-H2-SUITE.md`).
2. Lancer `pnpm lint && pnpm typecheck && pnpm build` sur ces 4 fichiers. Corriger uniquement si erreur réelle (les icônes `Handshake`, `Fish`, `BookOpen`, `Home` existent dans `lucide-react` ^1.14 — vérifié).
3. Committer : `git commit -m "fix(nav/sprint-27): atteignabilité — Co-pêchage + éditorial dans le shell app, stat home 6→20"`. **Ne pas push.**

### Critères d'acceptation
- `pnpm build` vert, `pnpm lint` 0 erreur sur les 4 fichiers.
- Depuis `/home` connecté en desktop : la sidebar montre Co-pêchage + un groupe « Découvrir » (Espèces, Guides) ; le menu avatar montre Accueil, Co-pêchage, Espèces, Guides.
- Home : la stat affiche « 20 espèces de chez nous ».

### Garde-fous
- Ne pas toucher la tab bar dans ce bloc (c'est le Bloc 2).

---

## Bloc 1 — Atteignabilité complète (finir la reliure)

Compléter le Bloc 0 pour qu'**aucune** ligne 🔴/❌ ne subsiste dans la matrice §2.2 de l'audit. Cible : un membre atteint Accueil, Mes pêcheurs, Co-pêchage, Espèces, Guides, Notifications depuis le shell app, desktop ET mobile.

> **Connecteurs** : **docs-researcher** (Context7) si doute sur un pattern `Link`/route group Next 15. Pas de DB.

### Tâches
1. **Notifications libellées** : ajouter une entrée « Notifications » (`/notifications`) dans `UserMenu` (avatar) — aujourd'hui accessible seulement via l'icône cloche. Garder la cloche.
2. **Stat home dynamique** (mieux que le « 20 » en dur du Bloc 0) : dériver le compte d'espèces d'une **liste légère de slugs** (ne PAS importer `lib/especes/content/index.ts` qui tire les ~20 fiches dans le bundle — vérifier s'il existe un export léger type `SPECIES_SLUGS` dans `lib/seo/programmatic`, sinon créer une constante `ESPECES_COUNT` légère et la sourcer). Fichier : `app/(marketing)/page.tsx`.
3. **Cohérence des libellés actifs** : vérifier `aria-current`/état actif sur les nouvelles entrées (`/sorties`, `/especes`, `/guides`) dans `AppSidebar` (déjà géré par `pathname.startsWith` — confirmer que `/especes/bar` allume bien « Espèces »).
4. **`/spots/mes-propositions`** : ajouter un lien « Mes propositions » depuis `/spots/proposer` (`app/(app)/spots/proposer/page.tsx`) s'il n'existe pas, pour sortir cette page de l'oubli.

### Critères d'acceptation
- La matrice §2.2 de l'audit, rejouée, ne contient plus aucune ligne 🔴 ni ❌ (vérifiable page par page).
- `/notifications` atteignable via une entrée **libellée** (pas seulement l'icône).
- Modifier le catalogue espèces (ajouter/retirer un slug) fait bouger la stat home **sans édition manuelle du chiffre**.
- Aucune fiche éditoriale (especes/guides) n'est importée dans le bundle du shell app (vérifier via `pnpm build` : pas d'explosion de taille des chunks `(app)`).

### Garde-fous
- ⚠️ Ne pas dégrader le SEO : `/especes`, `/guides` restent `index`/canonical inchangés.

---

## Bloc 2 — Tab bar mobile cohérente + onglet « Plus »

La tab bar mobile (`components/layout/TabBar.tsx`) ne mène pas partout : Accueil, Mes pêcheurs, Co-pêchage, Espèces, Guides, Notifications sont inatteignables au pouce. On ajoute un **onglet « Plus »** (overflow) — pattern natif standard, et indispensable au futur port Expo.

> **Connecteurs** : **docs-researcher** (Context7) pour le pattern bottom-sheet/menu accessible (focus trap, `Esc`, `aria`) en React 19/Next 15. **qa-chrome** pour valider au pouce.

### Tâches
1. **Recomposer la tab bar** (recommandation à confirmer — cf garde-fou) : **Carnet · Carte · [FAB +] · Fil · Plus**. *Profil* sort de la tab bar (déjà accessible via l'avatar du header) et rejoint « Plus ».
2. **Créer `components/layout/MoreMenu.tsx`** : feuille/sheet ouverte par l'onglet « Plus », listant — Accueil, Profil, Mes pêcheurs, Co-pêchage, Notifications, — séparateur « Découvrir » — Espèces, Guides, Techniques, — séparateur — Mon abonnement, (Modération si `is_moderator`), Déconnexion. Cibles ≥ 44 px, `aria-current`, fermeture au tap extérieur + `Esc` + `prefers-reduced-motion` respecté.
3. Marquer l'onglet « Plus » actif quand la route courante appartient à l'overflow.
4. Vérifier le `pb` du `<main>` dans `AppShell` (padding bas = hauteur tab bar + safe-area) reste correct si la hauteur change.

### Critères d'acceptation
- Sur 390 px, depuis n'importe quelle page app : Accueil, Mes pêcheurs, Co-pêchage, Espèces, Guides, Notifications sont atteignables en ≤ 2 taps (tab « Plus » → item).
- L'onglet « Plus » est en état actif quand on est sur une page de l'overflow.
- Le FAB « + » (loguer) reste central, surélevé, inchangé fonctionnellement.
- Aucune régression de safe-area (rien de masqué en bas sur iPhone à encoche — vérifié qa-chrome).

### Garde-fous
- ⚠️ DEMANDER À JOHN AVANT de figer la composition : recommandation = `Carnet · Carte · + · Fil · Plus` (Profil → header + Plus). Si John préfère garder Profil en tab (et mettre autre chose dans « Plus »), appliquer son choix. **Ne pas shipper la nouvelle tab bar sans son OK.**
- Ne pas casser l'app shell « bare » (`/onboarding`, `/carnet/nouvelle` restent plein écran, cf `AppShell.BARE_PREFIXES`).

---

## Bloc 3 — Ponts inter-shells (réduire les ruptures)

3 shells disjoints (marketing / app / carte). Quand on est connecté, on doit pouvoir rebondir entre eux sans cul-de-sac.

> **Connecteurs** : **docs-researcher** (Context7) — pattern **CTA auth-aware sans casser le cache statique** de la home (`revalidate=3600`). Cible : un petit Client Component qui lit la session via `createBrowserClient` (`@supabase/ssr`) et choisit le lien, sans rendre la page dynamique.

### Tâches
1. **CTA home conditionnel** : extraire le CTA primaire du hero en Client Component `components/marketing/HeroPrimaryCta.tsx` qui, si session présente, affiche **« Aller à mon carnet » → `/home`**, sinon **« Créer mon carnet — gratuit » → `/auth/register`** (copy actuelle). Brancher dans `app/(marketing)/page.tsx` (CTA `:146`). **La page reste statique** (le composant hydrate côté client).
2. **Retour à l'app depuis le header marketing connecté** : dans `components/layout/Header.tsx` (qui fetch déjà `user`), ajouter, quand `user`, un lien discret **« Mon carnet » → `/home`** à gauche de l'avatar (desktop) + dans `components/mobile-nav.tsx` (déjà OK : section connectée présente — vérifier que « Mon carnet » y est en tête).
3. **Étude (NE PAS exécuter)** : noter dans `docs/sprint-27/notes-unification-shells.md` le coût/bénéfice d'unifier les 3 shells (un seul système de nav adaptatif) vs garder 3 shells avec ponts. Décision reportée — juste cadrer pour un sprint ultérieur.

### Critères d'acceptation
- Connecté, revenir sur `/` : le CTA primaire est « Aller à mon carnet » (→ `/home`), plus aucune invitation à se réinscrire. Déconnecté : CTA inchangé.
- `pnpm build` : `/` reste **statique** (pas de bascule en `ƒ`/dynamic dans la sortie build).
- Connecté sur `/especes` ou `/carte` (shell marketing/map), un lien « Mon carnet » ramène à `/home`.

### Garde-fous
- Ne pas régresser le cache de la home (perf SEO). Vérifier le rapport de build avant/après.
- Pas de fetch serveur supplémentaire sur la home (le check session est client-only).

---

## Bloc 4 — Tests nav + accessibilité

> **Connecteurs** : **qa-chrome** (desktop + device mobile réel).

### Tâches
1. **Test de présence des liens** (`*.test.ts(x)`, Vitest + Testing Library) : rendu de `AppSidebar`, `UserMenu`, `MoreMenu`, `TabBar` → assert que chaque destination cible (`/home`, `/carnet`, `/carte`, `/fil`, `/follows`, `/sorties`, `/especes`, `/guides`, `/notifications`, `/profil`, `/compte/abonnement`) est présente dans au moins une surface de nav du shell.
2. **a11y** : `aria-current` correct, focus visible, navigation clavier dans `MoreMenu` (Tab/Esc), cibles ≥ 44 px.
3. **qa-chrome** : captures desktop (1280) + mobile (390) de la sidebar, de la tab bar et du « Plus » ouvert ; vérifier au pouce.

### Critères d'acceptation
- Un test échoue si une page cible n'est plus reliée à aucune surface de nav (= filet anti-régression permanent pour les sprints futurs).
- `MoreMenu` entièrement navigable au clavier, fermable à `Esc`.

---

## Workstream VERIF (obligatoire, agent indépendant)

1. Lancer **`/verif-sprint`** : `pnpm test` + `pnpm build` + `pnpm typecheck` + `pnpm lint` + revue croisée indépendante + passe anti-régression. Puis **deploy-watch** (Vercel + Sentry) après déploiement.
2. Relire chaque critère d'acceptation des Blocs 0→4 et cocher ✅/❌ **avec preuve** (commande / URL / capture).
3. **Passe anti-régression ciblée** (ce sprint touche la nav → risques indirects) :
   - **Floutage GPS / gating de tier / RLS : INTACTS** — aucun fichier `lib/`/`supabase/` data ne doit avoir changé ; `git diff --stat` ne montre QUE des fichiers de nav/UI + tests.
   - **Perf** : la home `/` reste statique ; pas de fiche éditoriale importée dans le bundle `(app)` ; pas de régression de taille de chunk notable.
   - **SEO** : `/especes`, `/guides`, `/` — canonical/JSON-LD/robots inchangés.
4. **Passe copy** : tutoiement partout, libellés FR cohérents (« Co-pêchage », « Découvrir »), aucune promesse mensongère.
5. Livrer `docs/sprint-27/RECAP.md` : fait / comment tester / reste manuel John.

---

## Reste manuel John (post-sprint)

- Trancher la composition finale de la tab bar (Bloc 2, garde-fou).
- Relire la branche → merge `sprint-27-quickwins-nav` (renommée si besoin) → `main` → déploiement Vercel.
- Vérifier en navigation privée (mobile réel) que tout est atteignable et que la barre Vercel a disparu (cf audit).
- Décider plus tard, sur la note `notes-unification-shells.md`, si on planifie l'unification des shells.

---

## Rappels invariants (cf `CLAUDE.md`)

- Pas de push sans validation de John. RLS jamais désactivé. Migrations = nouveaux fichiers (aucune ce sprint). Régénérer `lib/types.ts` après migration (aucune ce sprint).
- Sprint **UI/nav only** : si un agent ouvre une migration ou touche `app/actions/*`/`lib/*` data, il sort du périmètre → s'arrêter et signaler.
