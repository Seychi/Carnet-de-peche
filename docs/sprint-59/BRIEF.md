# Sprint 59 — Brief d'exécution
## Vérité & polish (hygiène post-audit)

> Rédigé le 2026-06-30. Durée cible : **1 passe Fable** (effort `xhigh`), ~2-4 j selon dispo. Sprint court, majoritairement des petits fixes disjoints.
> Contexte : `docs/audits/AUDIT-2026-06-30-UX-DESIGN-GAMIFICATION.md` (§1.1, §1.2, §1.4, §1.5, §1.7, §3.4, §3.5) + `docs/ROADMAP-POST-AUDIT-2026-06-30.md` (Phase A).
> Décisions John 2026-06-30 : perf « ressentie » OK côté machine (on **ne** chasse **pas** un gros refactor perf ici, juste l'hydratation + triage) ; réservoir vide = **attendu** (pré-lancement) ; gamification = un autre chantier (Sprints 60+).

**Préalable avant de démarrer** (manuel John) : aucun merge bloquant. Un seul point **dashboard Vercel** (Bloc 5, couper la Toolbar en prod) que l'agent ne peut pas faire — il te le laissera en « Reste manuel ».

---

## 🚀 Ligne de lancement (à copier-coller par John)

> ultracode — effort xhigh. Exécute `docs/sprint-59/BRIEF.md`. Lance les workstreams
> A/B/C/D/E/F en parallèle dès maintenant (ils sont sur des fichiers disjoints, aucune
> dépendance jour 1), et termine par le workstream VERIF avant de me rendre la main.
> Ne push pas. Marque `⚠️ DEMANDER À JOHN` tout choix ouvert au lieu d'inventer.

---

## 🧠 Connecteurs & sous-agents (usage systématique — cf `CLAUDE.md` §20)

| Quand | Sous-agent → connecteur | Pourquoi |
|---|---|---|
| Fix hydratation (Next 15 / React 19, `suppressHydrationWarning`, formatage date) | **docs-researcher** → Context7 | Pattern version-correct, pas de code de mémoire. |
| Confirmer la source `parentNode` null + volume #418 sur vrais users | **deploy-watch** → Sentry | S'ancrer sur les vrais logs, pas des suppositions. |
| Vérifier la source de vérité « 26 espèces » avant de figer la copie | **supabase-guard** → Supabase (RO) / lecture `lib/seo/programmatic.ts` | Éviter de re-hardcoder un mauvais nombre. |
| QA des écrans touchés (console propre, aperçu partage, formulaire) | **qa-chrome** → Claude in Chrome | Captures + console + anti-régression. |
| Clôture | **`/verif-sprint`** | Tests + build + lint + types + revue indépendante + anti-régression. |

## Objectif du sprint en une phrase

Liquider les petits bugs / copy / a11y de l'audit **et** supprimer l'erreur d'hydratation React #418 sur `/home`, `/carnet`, `/carte`, sans toucher aux features ni au gating.

## Workstreams & dépendances

| WS | Bloc(s) | Durée | Dépend de | Parallélisable jour 1 |
|----|---------|-------|-----------|----------------------|
| A  | Bloc 0 — Écran « Nouvelle prise » | M | — | ✅ |
| B  | Bloc 1 — Copy & petits fixes | S | — | ✅ |
| C  | Bloc 2 — État vide « PRÈS DE TOI » | S | — | ✅ |
| D  | Bloc 3 — Partage desktop (aperçu) | S-M | — | ✅ |
| E  | Bloc 4 — Hydratation #418 (hors formulaire) | M | — | ✅ |
| F  | Bloc 5 — Triage perf & propreté | S | — | ✅ (Sentry + dashboard) |
| VERIF | revue finale | S | tous | ❌ (toujours en dernier) |

> ⚠️ **Anti-conflit** : **`CatchForm.tsx` appartient au Bloc 0 uniquement.** Aucun autre bloc n'écrit dans ce fichier (le fix hydratation du `datetime` du formulaire est inclus dans le Bloc 0, pas dans le Bloc 4). Idem, chaque bloc a ses fichiers propres — voir les chemins ci-dessous.

---

## Bloc 0 — Écran « Nouvelle prise » (tout `CatchForm.tsx` + l'en-tête de route)

Regroupe **tous** les correctifs de l'écran de log pour qu'un seul agent possède `components/catches/CatchForm.tsx` (évite les conflits). Ne pas changer la logique de conditions auto-captées, ni le géocodage, ni le gating.

> **Connecteurs** : **docs-researcher** (Context7) pour le pattern hydratation `datetime-local` (React 19) ; **qa-chrome** pour re-tester le formulaire (labels lus, contraste, défaut, focus) après coup.

### Tâches
1. **Défaut « Sort de l'eau »** (`CatchForm.tsx:247`, `lib/catches/schema.ts:83`, toggle `:830-833`) : **retirer la présélection « Conservé »**. Cible : **aucune option présélectionnée** ; si l'utilisateur ne touche pas le toggle, ne pas forcer `released=false` (laisser le défaut DB `released=true` s'appliquer). Ne pas casser l'auto-relâche si sous-taille (`:330-341`).
2. **a11y libellés** : ajouter un `aria-label`/`<label htmlFor>` explicite au **slider Taille**, au **`datetime-local`** et à l'**input photo** (aujourd'hui `hasLabel:false`).
3. **Hydratation du `datetime`** (`CatchForm.tsx:1122`) : la valeur par défaut vient de `new Date()` au render → mismatch serveur/client. Calculer la valeur **après montage** (état initial vide + `useEffect`) ou `suppressHydrationWarning` sur le champ. Objectif : **0 warning #418 attribuable au formulaire**.
4. **Cohérence taille** : aligner les bornes — l'input nombre monte à **200**, le slider à **120** (« 120 cm+ »). Choisir une borne commune (proposition : garder l'input jusqu'à 200 et libeller le slider « 120 cm+ » comme un plafond visuel non contraignant, OU aligner les deux à 200). ⚠️ voir garde-fous.
5. **Décalage de focus leurre/ville** : quand « Leurres » ouvre le sous-bloc « Leurre depuis ta boîte / saisis à la volée », la mise en page se décale et un focus destiné à « Ville » peut atterrir dans le champ leurre. Stabiliser (réserver la hauteur, ou ne pas voler le focus / ancrer le focus après reflow).
6. **Contraste titre « Nouvelle prise »** : le titre navy-900 sur fond navy-950 (~1,3:1) est illisible. Le titre est rendu par **l'en-tête de la route/modale** `/carnet/nouvelle` (pas dans `CatchForm.tsx` — chercher dans `app/(app)/carnet/nouvelle/*` ou le wrapper de modale). Passer le titre en teinte claire (sand/blanc) pour un contraste AA.

### Critères d'acceptation
- Ouvrir `/carnet/nouvelle` : **ni « Conservé » ni « Relâché » présélectionné** ; loguer sans toucher le toggle crée une prise `released=true` (vérifier en base via supabase-guard).
- Lecteur d'écran / DOM : le slider, le datetime et l'input photo ont un nom accessible (vérif `qa-chrome` : `getByLabel`/`aria-label` non vide).
- Console de `/carnet/nouvelle` : **0 erreur #418**.
- Titre « Nouvelle prise » lisible (contraste ≥ 4,5:1).
- Sélectionner « Leurres » puis cliquer « Ville » met bien le focus dans **Ville** (pas dans le champ leurre).
- **Régression interdite** : conditions auto-captées, géocodage ville, upload photo, gating — inchangés.

### Garde-fous
- ⚠️ **DEMANDER À JOHN AVANT** (mineur, il peut trancher vite) : défaut « Sort de l'eau » = **neutre (choix libre, pas de présélection)** — c'est la proposition. S'il préfère un **défaut « Relâché »** dur, l'appliquer à la place. Ne PAS laisser « Conservé » par défaut.
- ⚠️ Borne taille (200 vs 120) : si l'alignement touche la validation zod (`measured_length`/`taille`), **le signaler** plutôt que d'élargir une contrainte métier au hasard.
- Ne pas toucher : la logique de scoring, les conditions Open-Meteo, le géocodage.

---

## Bloc 1 — Copy & petits fixes (fichiers disjoints)

> **Connecteurs** : **supabase-guard** / lecture `lib/seo/programmatic.ts` pour **confirmer que la source de vérité est bien 26 espèces** avant de figer la copie.

### Tâches
1. **Badge Pokédex** (`lib/gamification/badges.ts:55`) : « Les **20** espèces du bord… » → « Les **26** espèces du bord… ». (Le **seuil SQL** `pokedex_complete >= 20` est corrigé au **Sprint 62**, pas ici — ne pas créer de migration ici.)
2. **Onboarding — validation fréquence** (§3.1, étape 6, `app/(app)/onboarding/6/*` ou composant équivalent) : « Créer mon carnet » ne doit pas être actif tant que la **fréquence** n'est pas choisie (aujourd'hui l'écran semble soumissible sans). Aligner sur le pattern des étapes 3/4/5 (bouton désactivé tant qu'aucun choix).

### Critères d'acceptation
- La fiche `/home` (hub badges) et la définition du badge affichent « 26 » partout ; aucun « 20 » résiduel (grep `20 espèces` = 0 hit en copie).
- Onboarding étape 6 : bouton désactivé tant que la fréquence n'est pas sélectionnée.

### Garde-fous
- Ne pas toucher au seuil SQL (Sprint 62). Ne pas renuméroter les espèces.

---

## Bloc 2 — État vide « PRÈS DE TOI » (`/home`)

Corrige la contradiction : le bloc affiche « Pas encore de prise partagée… Sois le premier à loguer » **et** un post existant juste en dessous.

> **Connecteurs** : **qa-chrome** pour rejouer les deux états (0 activité vs ≥1).

### Tâches
1. Dans le composant « PRÈS DE TOI » de `/home` (chercher côté `components/home/*` / section cockpit) : n'afficher le message **« Sois le premier à loguer 🎣 »** **que si la liste d'activité est réellement vide**. Si ≥ 1 item, afficher un simple en-tête « Activité récente » (ou équivalent) **sans** le message « sois le premier ».

### Critères d'acceptation
- Département avec 0 activité → message « sois le premier » seul.
- Département avec ≥ 1 activité → liste sans le message contradictoire.

### Garde-fous
- Ne pas modifier la requête d'activité ni le floutage ; c'est purement de l'affichage conditionnel.

---

## Bloc 3 — Partage desktop : aperçu au lieu d'un toast

Sur desktop, « Mon année de pêche » / « Mes records » ne montrent **rien de visible** (Web Share fichiers indisponible → fallback = copie lien + download + toast fugace). Ajouter un **aperçu**.

> **Connecteurs** : **docs-researcher** (Context7) si besoin sur `navigator.canShare`/`share` ; **qa-chrome** pour vérifier le rendu desktop.

### Tâches
1. Dans `components/share/use-share-card.ts` (`fallbackShare` ~`:138-168`) et le composant `ShareButton` : quand Web Share fichiers **n'est pas** dispo (desktop), au lieu du seul toast, **ouvrir une modale de succès** avec **la miniature de la carte générée** + bouton **« Copier le lien »** (`/c/{slug}`) + **« Télécharger l'image »**.
2. Réutiliser le composant modale existant du design system (ne pas réinventer).

### Critères d'acceptation
- Sur Chrome desktop, cliquer « Mon année de pêche » ouvre une **modale avec l'aperçu** de la carte + copier-lien + télécharger.
- Sur mobile avec Web Share dispo : comportement inchangé (feuille de partage native).

### Garde-fous
- Ne pas changer la génération de l'image OG (`/og/card/*`) ni le contenu de la carte.

---

## Bloc 4 — Hydratation #418 (hors formulaire)

Cause : dates « naïves » rendues identiques serveur (UTC) et client (local) → texte divergent. Le `datetime` du formulaire est traité au **Bloc 0** ; ce bloc couvre le reste.

> **Connecteurs** : **docs-researcher** (Context7) pour le pattern date/timezone SSR + `suppressHydrationWarning` ; **qa-chrome** pour confirmer console propre.

### Tâches
1. `components/marketing/home-v3/Hero.tsx:310` et `HomeSections.tsx:108` : `toLocaleTimeString('fr-FR', {timeZone:'Europe/Paris'})` sur page ISR → rendre le texte **stable** (calculer côté serveur avec zone fixe **et** garantir le même rendu client, ou déférer au montage / `suppressHydrationWarning` sur le nœud feuille).
2. `lib/conditions/format.ts:33-39` : `new Date(isoNaïf)` parse en zone runtime → **lire `HH:MM`/date directement depuis la string naïve** (comme `formatWeatherTime` le fait déjà). C'est ce qui alimente le bandeau instruments (présent sur toutes les pages app).
3. Vérifier qu'aucun autre nœud « live » (bandeau instruments, « il y a X j », heures solunaires) ne relit une date via `new Date(naïf)` sans garde.

### Critères d'acceptation
- Console de `/home`, `/carnet`, `/carte` (chargées à froid) : **0 erreur React #418** (vérif `qa-chrome` : `read_console_messages` filtré `418|hydrat`).
- Les heures affichées (créneau, marées, soleil) restent correctes.

### Garde-fous
- Ne pas « corriger » en changeant les valeurs affichées ; le but est la **stabilité serveur/client**, pas de nouveaux calculs.

---

## Bloc 5 — Triage perf & propreté (pas de gros refactor)

Sprint hygiène : on **documente** et on nettoie le trivial ; les vrais fixes perf carte/INP sont au **Sprint 64**.

> **Connecteurs** : **deploy-watch** → **Sentry** pour la source `parentNode` + volume #418.

### Tâches
1. **Sentry** : confirmer la stack de `TypeError: Cannot read properties of null (reading 'parentNode')` (frame au-dessus = MapLibre `MapView.tsx` ~`:585-625` ? SVG lucide ?) et **noter le verdict dans le RECAP** (le fix éventuel ira au Sprint 64). Relever aussi le **volume #418** avant/après le Bloc 4 (preuve que c'est résolu).
2. **INP** : consigner dans le RECAP les deux mesures du moniteur Vercel (393 ms bouton onboarding, 2 285 ms input au log) → **entrée pour le Sprint 64** (rendre le handler submit/géocodage non bloquant). Pas de fix ici.
3. **Vercel Toolbar en prod** : ce n'est pas du code (`@vercel/toolbar` absent du repo) → c'est le réglage **projet Vercel → Toolbar → off en production**. **⚠️ DEMANDER À JOHN** (voir « Reste manuel »).

### Critères d'acceptation
- `RECAP.md` contient : la stack `parentNode` (source identifiée), le delta de volume #418 (avant/après), et les 2 INP notés pour le Sprint 64.

### Garde-fous
- ⚠️ **DEMANDER À JOHN AVANT** : couper la Toolbar Vercel en prod (réglage dashboard, c'est lui qui le fait).
- Ne rien refactorer côté carte/MapLibre ici.

---

## Workstream VERIF (obligatoire, agent indépendant)

1. Lance **`/verif-sprint`** (`pnpm test` + `pnpm build` + `pnpm typecheck` + `pnpm lint` + revue croisée indépendante + passe anti-régression). Puis **deploy-watch** (Vercel + Sentry) après déploiement.
2. Relire **chaque critère d'acceptation** des Blocs 0-5 et cocher ✅/❌ **avec preuve** (URL, requête SQL, capture console via `qa-chrome`).
3. **Passe sécurité** : ce sprint ne crée **aucune** table/migration (le seul changement DB éventuel serait une erreur → refuser). Aucune écriture ne contourne `*_for_viewer`. Aucun secret commité.
4. **Passe anti-régression ciblée** : gating carte/tiers intact, floutage GPS intact, géocodage ville OK, upload photo OK, onboarding complet OK.
5. **Passe copy** : tutoiement partout, zod en français, « 26 » et non « 20 », pas de tiret cadratin dans la copie visible ajoutée (cf `CLAUDE.md` §6).
6. Livrer **`docs/sprint-59/RECAP.md`** : fait / comment tester / reste manuel John (dont la Toolbar Vercel + le triage `parentNode`/INP transmis au Sprint 64).

## Reste manuel John (post-sprint)

- **Trancher** (mineur) : défaut « Sort de l'eau » = neutre (proposé) vs « Relâché » (Bloc 0).
- **Vercel dashboard** : Project → Toolbar → **off en production** (Bloc 5).
- Relire → merge sur `main` → déploiement → QA rapide des écrans touchés.
- Noter que `parentNode` (source) et les INP (393/2 285 ms) sont **transmis au Sprint 64** (carte), pas corrigés ici.
