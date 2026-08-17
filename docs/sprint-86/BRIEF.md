# Sprint 86 — Brief d'exécution
## « Le dernier mètre » — une seule action pour loguer une prise sans compte

> Rédigé le **2026-08-17**, après le déploiement du sprint 85 (20:53, commit `1fb2163`).
> Contexte : **`docs/qa/QA-BROUILLON-ANONYME-2026-08-17.md`** (QA menée dans un Chrome réel sur
> la production, mesures relevées par script — c'est la source de ce sprint),
> `docs/sprint-85/RECAP.md`, `docs/sprint-85/ACTIVATION.md`.
> Décisions John : **le replay de session est écarté** (sprint 85 §0) · le SMTP Resend est
> branché · **le brouillon reste, c'est le BOUTON qui part** (cf §« La correction » ci-dessous).
>
> ⚠️ **Deux fenêtres de mesure ouvertes, toujours** : sprint 83 jusqu'au **07/09** (aucun titre,
> aucun maillage), sprint 84 depuis le 17/08 15:36 (le cache ISR est un invariant de sortie).

**Préalable avant de démarrer** : aucun. Ce sprint est 100 % applicatif, sans migration, sans
action dans un dashboard.

---

## 🚀 Ligne de lancement (à copier-coller par John)

> ultracode — effort xhigh. Exécute `docs/sprint-86/BRIEF.md`. Le Bloc 1 est le cœur du sprint,
> les Blocs 0 et 2 se lancent en parallèle. Lis d'abord « La correction à faire avant de coder » :
> elle décide de l'implémentation, et se tromper là casserait l'inscription différée des
> sprints 77-78. Termine par le workstream VERIF. Ne push pas.

---

## 🧠 Connecteurs & sous-agents (cf `CLAUDE.md` §20)

| Quand | Sous-agent → connecteur | Pourquoi |
|---|---|---|
| Avant de toucher `router.push` / la navigation | **docs-researcher** → Context7 | Next **15.5.18** : comportement de `router.push` depuis un handler de soumission, et ce qui survit à la navigation côté client. Pas de mémoire. |
| Bloc 0 | **supabase-guard** → Supabase (RO) | Rejouer en base le compte d'inscrits et les cohortes d'activation d'`ACTIVATION.md`, pour figer l'avant. Aucune écriture. |
| Bloc 1, QA finale | **qa-chrome** → Claude in Chrome + Playwright | Rejouer le parcours anonyme complet. ⚠️ **Chrome desktop sur Windows refuse de descendre sous ~500 px** : la QA du 17/08 s'est faite en 501 × 660, pas 390 × 844. Utiliser l'émulation d'appareil de Playwright pour obtenir un vrai 390. |
| Après déploiement | **deploy-watch** → Vercel + Sentry | Aucune régression runtime, et le cache du sprint 84 intact. |
| Clôture | **`/verif-sprint`** | Tests + build + lint + types + revue croisée + anti-régression. |

---

## Objectif du sprint en une phrase

Faire que loguer une prise sans compte demande **un seul clic** au lieu de deux, en supprimant le
bouton « Garder ma prise en brouillon » — et pas le brouillon, qui est le seul support capable de
transporter la saisie jusqu'à l'inscription.

---

## ★ La correction à faire AVANT de coder : il y a DEUX brouillons

John a écrit : « garder une prise en brouillon a du sens seulement si l'utilisateur a déjà un
compte. » **C'est l'inverse pour le mécanisme qui compte.** Il y en a deux, à ne jamais confondre :

| | Support | Rôle | Pour qui |
|---|---|---|---|
| 1 | `localStorage['carnet:draft-catch']`, TTL 30 min (`CatchForm.tsx:31-35`) | refait le formulaire si on revient | tout le monde, connecté ou pas |
| 2 | **cookie `pending-catch`** (`writePendingCatch`) | **seul support qui survit à la navigation vers `/auth/register`, et seul que `replayPendingDrafts()` sait rejouer** | **anonymes uniquement** |

Supprimer le n°2, c'est tuer l'inscription différée des sprints 77 et 78 : le visiteur remplit sa
prise, clique, arrive sur l'inscription **les mains vides**, et la phrase « Ta prise de bar à
Pointe du Grand Minou t'attend » — vérifiée en production le 17/08, rendue par
`app/auth/register/page.tsx:74` — disparaît avec.

**Ce qu'on supprime, c'est le BOUTON, pas le mécanisme.** Le brouillon devient silencieux : écrit
en continu, jamais demandé, jamais annoncé.

### Et le bug se corrige par construction

Le défaut n°0 de la QA (`draftState` ne relit jamais le cookie ; `readPendingCatch()`,
`lib/drafts/client.ts:82`, est du code mort) **n'a pas besoin d'un correctif**. En supprimant le
parcours en deux temps, l'état `'saved'` disparaît, donc il n'y a plus rien à réhydrater.

⚠️ **Ne pas coder les deux.** L'initialiseur `readPendingCatch()` proposé dans le rapport de QA
était le correctif de **repli**, valable seulement si on gardait les deux étapes. L'ajouter en
plus de ce sprint serait de la dette immédiate.

---

## Ce que la QA du 17/08 a mesuré (à ne pas re-débattre)

Sur la production, viewport 501 × 660, après avoir rempli espèce + taille et cliqué :

| | Bouton du footer | CTA du mur |
|---|---|---|
| Libellé | « Mettre à jour mon brouillon » | « Créer mon carnet » |
| Surface | **25 783 px²** | 18 861 px² |
| Fond | `rgb(20, 184, 166)` | `rgb(20, 184, 166)` — **identique** |
| Police | 16 px | 13,5 px |
| Comportement | **collant, toujours à l'écran** | défile, disparaît |

**Le bouton qui ne sert à rien est 1,37 fois plus grand que celui qui convertit, dans le même
teal, et c'est le seul des deux à rester à l'écran.** Le focus reste dessus après le clic
(`document.activeElement` = « BUTTON Mettre à jour mon brouillon »), et le bloc
`#catch-pending-wall` n'a **ni `role` ni `aria-live`**.

À l'inverse, deux choses sont bien faites et **ne doivent pas régresser** : le
`scrollIntoView` de `CatchForm.tsx:555` amène bien le mur dans le viewport sans qu'il passe sous
le footer, et la chaîne de rejeu (`auth/callback:31`, `auth/confirm:47`, `login/actions:359`)
crée bien la prise.

⚠️ **Une correction au rapport de QA lui-même, apportée par le RECAP du sprint 85 §3** : le
« 16 clics contre 7 » **ne peut pas** servir d'argument de copie. `SpotSignupCta`, la barre
collante mobile vue par ~100 % des visiteurs mobiles, émet
`signup_wall_clicked({surface:'spot_page'})` **sans être un mur**. Une part inconnue des 16 clics
vient d'elle. Ne plus citer ce chiffre comme un A/B.

---

## Workstreams & dépendances

| WS | Bloc(s) | Durée | Dépend de | Parallélisable jour 1 |
|----|---------|-------|-----------|----------------------|
| A | Bloc 0 — figer l'avant et écrire l'avertissement de mesure | 0,5 j | — | ✅ |
| B | Bloc 1 — ★ une seule action (le cœur) | 1,5 j | — | ✅ |
| C | Bloc 2 — replier Confidentialité pour un anonyme | 0,25 j | — | ✅ |
| VERIF | revue finale indépendante | 0,5 j | tous | ❌ (toujours en dernier) |

⚠️ Les Blocs 1 et 2 touchent le **même** fichier, `components/catches/CatchForm.tsx`
(1 827 lignes). Les confier au **même agent**, ou faire passer le Bloc 1 d'abord.

---

## Bloc 0 — Figer l'avant, et écrire l'avertissement de mesure

Sans ça, le sprint sera illisible — et pour une raison qui piège systématiquement : le
dénominateur va changer de définition.

> **Connecteurs** : **supabase-guard** → Supabase (RO).

### ⚠️ Le piège de mesure, à écrire noir sur blanc avant de livrer

Aujourd'hui `signup_wall_viewed({surface:'pending_catch'})` est émis **après** le clic. Demain le
bloc de promesse est visible dès le chargement, donc l'impression partira **à chaque ouverture du
formulaire par un anonyme**.

**Les impressions vont monter d'un ordre de grandeur et le taux de clic de `pending_catch` va
mécaniquement s'effondrer. Ce n'est PAS une régression.** C'est exactement le même piège que la
discontinuité `spot_page` du sprint 85 §3.

- **Le repère de succès est le volume absolu de `pending_catch_started`**, pas un taux.
- Il vaut **4 sur les 90 jours précédant le 17/08**, dont **1 émis par la QA elle-même** → la
  base honnête est **3**.
- Toute valeur durablement au-dessus de ~1 par semaine est un gain.

### Tâches

1. Créer `docs/sprint-86/BASELINE.md` : le volume de `pending_catch_started` et de
   `pending_replayed` sur 90 j (4 et 1 au 17/08), le compte d'inscrits rejoué en base, les trois
   cohortes d'activation d'`ACTIVATION.md` rejouées, et **l'avertissement ci-dessus recopié tel
   quel**.
2. Rejouer `pnpm reconcile:signups` et coller la sortie : le sprint 85 a laissé l'écart
   base ↔ PostHog à **40,4 %**, dont une moitié non revérifiée.

### Critères d'acceptation

- `BASELINE.md` existe, porte les chiffres rejoués **en base** (pas recopiés) et l'avertissement.
- Aucun fichier de `app/`, `components/` ou `lib/` modifié par ce bloc.

---

## Bloc 1 — ★ Une seule action sur `/carnet/nouvelle` en mode anonyme

Le cœur du sprint. `components/catches/CatchForm.tsx`, mode `anonymousDraft` **uniquement**.

> **Connecteurs** : **docs-researcher** → Context7 (Next 15.5.18, `router.push` depuis un
> handler de soumission). **qa-chrome** en fin de bloc, en 390 px émulé.

### Conception retenue (pré-arbitrée, ne pas re-débattre)

**Une seule action primaire, dans le footer collant.** Elle valide, écrit le cookie, et emmène
créer le carnet. Aucun deuxième bouton, nulle part.

1. **Libellé unique.** `SUBMIT_LABELS_DRAFT` (`:78`) passe de « Garder ma prise en brouillon » à
   **« Créer mon carnet et enregistrer »**. Le ternaire du footer (`:1553-1560`) perd sa branche
   `draftState === 'idle'` et son « Mettre à jour mon brouillon ».
2. **Le cookie s'écrit en continu**, plus au clic. Greffer l'écriture dans l'effet d'autosave
   déjà en place (`:431-443`, `watch` + debounce 800 ms), sous condition
   `anonymousDraft && spotContext && values.species` — en dessous il n'y a rien à rejouer
   (`species` est requis par `pendingCatchSchema`, `lib/drafts/schema.ts:78-94`).
   Bénéfice de bord : un visiteur qui part **sans cliquer** garde sa saisie, et la phrase de
   rappel de `/auth/register` fonctionne aussi pour lui.
3. **Dans `onSubmit`** (branche `anonymousDraft`, `:538-561`) : écrire le cookie, puis
   `router.push('/auth/register?redirect=' + encodeURIComponent('/spots/' + spotContext.slug))`.
   Poser `setSubmitPhase('saving')` **avant** la navigation pour que le bouton se désactive et
   affiche son `Loader2` — sinon rien ne bouge pendant le chargement et le visiteur reclique.
4. **Le bloc `#catch-pending-wall` cesse d'être une action** : il devient une **promesse
   permanente**, visible dès le chargement, **sans aucun bouton ni lien** dans le cas nominal.
   Reprendre la substance des trois bénéfices actuels (« ta saisie est reportée telle quelle »,
   « ton carnet garde tes prises et apprend de tes sorties », « gratuit, sans carte bancaire, en
   30 secondes »).
   `SignupWall` n'est alors plus utilisé dans ce fichier (seule occurrence : `:1518`) →
   **retirer aussi son import `:25`**, sinon le lint casse.
5. **L'impression passe par le hook du sprint 85.** Ne PAS écrire un `useEffect` maison :
   utiliser **`useSignupWallImpression(ref, 'pending_catch')`**
   (`lib/hooks/useSignupWallImpression.ts:45`), qui n'émet que si
   `el.getClientRects().length > 0`. C'est la règle unifiée posée au sprint 85 — un bloc masqué
   ne doit pas gonfler le dénominateur.
   Et émettre `analytics.signupWallClicked({ surface: 'pending_catch' })` au clic du footer.
   ⚠️ **Ne renommer aucune surface** (`lib/gating/wall.ts:53` : un renommage casse l'historique).
6. **Garder la branche `'failed'`.** Si `writePendingCatch` renvoie `false` (cookie refusé,
   navigateur restrictif, valeur trop grosse — cf `writeCookie` dans `lib/drafts/client.ts`),
   **ne PAS naviguer** : quitter la page effacerait la saisie. C'est le **seul** cas où le
   parcours en deux temps protégeait mieux. Afficher sur place le message d'échec et proposer
   l'inscription **dans un nouvel onglet** (`target="_blank"` + `rel="noopener noreferrer"`).
   `draftState` se réduit donc à `'idle' | 'failed'`.
7. **Accessibilité** (défauts 2 et 3 de la QA) : `role="status"` + `aria-live="polite"` sur le
   bloc. Comme il est désormais permanent, il n'annonce rien au chargement (comportement normal
   d'une région live) et annonce le basculement en `'failed'` — le seul changement d'état qui
   reste. Le problème de focus disparaît de lui-même : il n'y a plus de second bouton.
8. **Le `scrollIntoView` ne sert plus que pour `'failed'`.** Dans le cas nominal on navigue, donc
   il n'y a rien à faire défiler. Ne pas le supprimer, le conditionner.

### Critères d'acceptation

- Parcours anonyme complet en **un seul clic** : `/carnet/nouvelle?spot_id=<slug>` → espèce +
  taille → clic → on est sur `/auth/register`, et la page affiche « Ta prise de … t'attend ».
- `grep -rn "Garder ma prise\|Mettre à jour mon brouillon" app components` renvoie **vide**.
- Le bloc de promesse est visible **au chargement**, avant toute saisie, et ne contient **aucun**
  lien ni bouton dans le cas nominal.
- **Le bug du rechargement n'existe plus** : remplir, cliquer, revenir sur le formulaire →
  l'action est toujours « Créer mon carnet et enregistrer », il n'y a **aucun état perdu à
  retrouver**.
- Cookie refusé (simulable en bloquant les cookies du site dans Chrome) : **on ne navigue pas**,
  le message d'échec s'affiche, le lien s'ouvre dans un nouvel onglet.
- **Zéro écriture réseau vers Supabase** pendant toute la saisie anonyme.
- L'invariant RGPD du cookie est intact : `git diff -- lib/drafts/schema.ts` **vide**, aucune
  coordonnée, aucune photo, aucune note dans le cookie.
- Impressions : après correctif, **aucune surface n'a des clics > 0 et des impressions = 0**
  (le contrôle posé au sprint 85 reste vert).
- **Mettre à jour `e2e/09-brouillon-anonyme.spec.ts`** (livré avec la QA, non commité à ce jour) :
  - la partie A (non-régressions) reste, adaptée à l'action unique ;
  - le test `défaut 0` devient une **non-régression** → retirer son `test.fail()` ;
  - les tests `défaut 1`, `1bis`, `2`, `3` décrivent la cible de l'**ancienne** conception (footer
    qui devient un lien, focus déplacé dans le mur) → **les réécrire** pour l'action unique et
    retirer les `test.fail()` devenus faux ;
  - le test `défaut 5` correspond au Bloc 2 ci-dessous.
- `pnpm typecheck`, `pnpm lint`, `pnpm test`, `pnpm build` verts.

### Garde-fous

- **Ne pas toucher** : `lib/drafts/schema.ts`, `lib/drafts/replay.ts`, `lib/drafts/client.ts`,
  `app/auth/confirm/route.ts`, `app/auth/callback/route.ts`, `app/auth/login/actions.ts`. Le
  contrat du cookie et la chaîne de rejeu fonctionnent, la QA l'a vérifié en production.
- **Ne pas supprimer le brouillon `localStorage`** (mécanisme n°1) : c'est lui qui refait le
  formulaire, et il sert aussi aux connectés.
- **Ne pas ajouter** l'initialiseur `readPendingCatch()` du rapport de QA (cf ci-dessus).
- ★ **Le mode connecté est hors périmètre.** C'est le même fichier de 1 827 lignes pour les deux
  modes. Aucun de ces changements ne doit modifier ce que voit un inscrit qui logue une prise —
  photo, mesure, célébration, notes, confidentialité, célébration de record. À prouver, pas à
  supposer.

---

## Bloc 2 — Replier la carte Confidentialité pour un anonyme

Défaut n°5 de la QA. Le formulaire fait **3,3 écrans** (2 150 px pour un viewport de 660), et un
visiteur sans compte y trouve deux interrupteurs — « Coords précises pour mes abonnés » et
« Coords précises publiques » — qui lui demandent un arbitrage sur une audience **qu'il n'a pas
encore**.

> **Connecteurs** : **qa-chrome** pour vérifier que le contenu reste atteignable.

### Tâches

1. En mode `anonymousDraft`, replier par défaut la carte Confidentialité (`:1391` et suivantes),
   avec un `<details>` ou un bouton dépliant. **Le contenu reste atteignable** : on ne cache pas
   une information de confidentialité, on la met au repos.
2. **Ne PAS changer les valeurs par défaut** : `precise_for_friends: true`,
   `reveal_precise_to_public: false` (`:313-314`) sont déjà les bonnes.
3. Garder visible, hors du repli, l'encart « **Ton coin reste ton coin** » : c'est de la
   réassurance, pas un réglage — et c'est précisément ce qui rassure un pêcheur qui hésite à
   déclarer un spot.

### Critères d'acceptation

- Anonyme : les deux interrupteurs ne sont pas dans le viewport au chargement de la section, et se
  déplient au clic. L'encart « Ton coin reste ton coin » **reste visible**.
- Connecté : la section est **inchangée**, dépliée comme aujourd'hui.
- Les valeurs envoyées au cookie sont identiques avant/après (test).

---

## Workstream VERIF (obligatoire, agent indépendant qui n'a pas écrit le code)

1. `/verif-sprint` : `pnpm test` (1 606 tests + les nouveaux), `pnpm build`, `pnpm typecheck`,
   `pnpm lint`.
   ⚠️ `__tests__/security-headers.test.ts` flake en timeout 5 s sous charge de suite complète —
   connu depuis le sprint 83, vert en isolation, **pas** une régression.
2. ★ **Passe « le connecté n'a rien vu changer »** : rejouer un log complet en connecté (photo,
   mesure, célébration, notes, confidentialité) et confirmer qu'aucun libellé, aucune validation,
   aucun comportement n'a bougé. C'est le risque principal du sprint : un seul fichier pour deux
   modes.
3. ★ **Passe de non-régression du sprint 84** : `pnpm check:prerender` **vert**, et les deux tests
   de staticité verts.
   ⚠️ **Ne PAS lire le compteur de routes pré-rendues au chiffre près** : le RECAP du sprint 85 §6
   a mesuré 75 puis 74 sur deux builds consécutifs sans changement pertinent, parce qu'une seule
   fiche spot sur les 10 déclarées se pré-rend réellement (les appels marée/météo/bathymétrie
   échouent au build). Se fier à `check:prerender`, qui est binaire.
4. Passe de non-régression du sprint 83 : `git diff` **vide** sur les titres, `SpotUpLinks`,
   `NearbySpotsSection` et le sitemap des fiches spots. Fenêtre ouverte jusqu'au 07/09.
5. Passe sécurité : `git diff -- supabase/migrations/` **vide**, RLS et grants inchangés, aucune
   coordonnée précise dans un HTML mis en cache.
   ⚠️ **Faux positifs connus, ne pas les re-signaler** (sprint 85 §6) : un `grep -i` de « mon
   carnet » remonte ~70 fichiers, ce sont les « **Créer** mon carnet » — le contrôle doit être
   **sensible à la casse** ; et `href="/home"` dans `/offline.html` est la page de repli PWA.
6. Passe copy : tutoiement, zod en français, pas de nouveau tiret cadratin en copy visible
   (`node scripts/lint-copy-dashes.mjs`, repère : 16 warnings préexistants).
7. Livrer `docs/sprint-86/RECAP.md` : fait / comment tester / **l'avertissement sur la
   non-comparabilité du taux de `pending_catch` recopié** / reste manuel John.

---

## Reste manuel John (post-sprint)

1. Merger, déployer, **noter l'heure exacte** dans le RECAP.
2. **deploy-watch** juste après : aucune nouvelle issue Sentry, et le cache du sprint 84 intact.
3. **Rejouer soi-même le parcours sur un vrai téléphone**, en 390 px réel : la QA du 17/08 n'a pu
   descendre qu'à 501 px (limite de Chrome desktop sous Windows).
4. À J+14 : le volume de `pending_catch_started`. **Repère : 3 sur les 90 jours précédents.**
   Ne pas lire le taux (cf Bloc 0).
5. Les restes du sprint 85 qui n'ont pas bougé : l'insight PostHog d'activation à créer, le reset
   à tester sur Gmail et Outlook, la décision `/auth/login?tab=register` (301 ou désindexation),
   et les relevés du sprint 84 du 24/08.

---

## Hors périmètre, avec la condition de déclenchement

- ★ **La récompense invisible** (défaut n°4 de la QA). Après inscription,
  `returnPathForSlug` (`lib/drafts/schema.ts:175`) renvoie **toujours** `/spots/<slug>` : le
  nouveau pêcheur atterrit sur la fiche du spot et **ne voit jamais sa prise**. `ReplayResult`
  porte déjà `catchCreated`.
  **Pourquoi pas maintenant** : `/carnet/<id>` est une route app, donc le middleware renverrait le
  non-onboardé sur `/onboarding/1` — il verrait sa prise une demi-seconde avant d'être éjecté. La
  bonne sortie est probablement de faire atterrir la fin d'onboarding sur la prise créée
  (`app/(app)/onboarding/fini/page.tsx:162` a déjà ce motif de destination contextuelle), ce qui
  touche l'onboarding, l'auth et le rejeu — trois zones sensibles, juste après deux sprints qui
  ont touché l'auth.
  **Et surtout** : `pending_catch_started` vaut 3 sur 90 jours, donc ce défaut concerne
  aujourd'hui ~0 personne par semaine. **Déclencheur : quand `pending_catch_started` dépasse
  ~10 par semaine.** Le corriger avant, c'est optimiser un tuyau vide.
- **La refonte du formulaire d'inscription** (14,6 % sur `/auth/register`, 14,5 % sur
  `/auth/login`). Le replay étant écarté, la seule matière est les 5 events d'abandon posés au
  sprint 85 — **déployés à 20:53 aujourd'hui, donc zéro donnée**. **Déclencheur : au moins
  2 semaines d'events**, soit après le 31/08.
- **`unstable_cache` sur les appels marée / météo / bathymétrie de la fiche spot.** Baisse le CPU
  Vercel et le TTFB. ⚠️ Ne pas le vendre comme le correctif du pré-rendu au build : 10 spots =
  10 coordonnées différentes, il n'y a rien à dédupliquer entre eux. Le pré-rendu au build se
  règle séparément, en réduisant la liste de `generateStaticParams` aux fiches qui passent.
- Le reste du backlog inchangé : géocodage inverse BAN, `/spots/departement/[code]`, les 7 espèces
  à maille de façade unique, `llms.txt`.
