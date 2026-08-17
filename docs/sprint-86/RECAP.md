# Sprint 86 — RECAP
## « Le dernier mètre » — une seule action pour loguer une prise sans compte

> Exécuté le **2026-08-17**. Branche `main`, **rien n'est poussé, rien n'est commité**.
> Brief : `docs/sprint-86/BRIEF.md`. Base gelée : `docs/sprint-86/BASELINE.md`.
> Source : `docs/qa/QA-BROUILLON-ANONYME-2026-08-17.md` (QA en production).
> ⚠️ Deux fenêtres ouvertes : sprint 83 jusqu'au **07/09**, cache ISR du sprint 84.

---

## 0. État en une ligne

Les trois blocs sont livrés. **Zéro migration.** **1 638 tests verts** (contre 1 606), build,
types et lint propres. `check:prerender` vert, les deux tests de staticité verts : le cache du
sprint 84 est intact.

Loguer une prise sans compte demande désormais **un seul clic**. Le bouton « Garder ma prise
en brouillon » a disparu ; **le brouillon, lui, est resté** et s'écrit en continu.

---

## 1. ★ Ce que le sprint a supprimé, et ce qu'il a gardé

Il y a **deux** brouillons, et les confondre aurait tué l'inscription différée des sprints
77-78 :

| | Support | Rôle | Sort |
|---|---|---|---|
| 1 | `localStorage['carnet:draft-catch']`, TTL 30 min | refait le formulaire si on revient | **conservé** |
| 2 | cookie `pending-catch` | seul support qui survit à la navigation vers `/auth/register`, seul que `replayPendingDrafts()` sait rejouer | **conservé, et renforcé** |

**On a supprimé le BOUTON, pas le mécanisme.** Le brouillon est devenu silencieux : écrit en
continu dans l'autosave déjà en place (debounce 800 ms), jamais demandé, jamais annoncé.

Bénéfice de bord non prévu au départ : **un visiteur qui part sans jamais cliquer garde sa
saisie**, et la phrase « Ta prise de bar à Pointe du Grand Minou t'attend » fonctionne aussi
pour lui.

Le défaut n°0 de la QA (`draftState` ne relit jamais le cookie) **s'est corrigé par
construction** : l'état `'saved'` n'existe plus, il n'y a plus rien à réhydrater.

---

## 2. Le parcours, avant et après

| | Avant | Après |
|---|---|---|
| Clics pour loguer sans compte | **2** | **1** |
| Bouton du footer | « Garder ma prise en brouillon », **25 783 px²**, collant | « Créer mon carnet et enregistrer », unique |
| CTA du mur | « Créer mon carnet », 18 861 px², défile et disparaît | **supprimé** |
| Bloc `#catch-pending-wall` | mur d'action apparaissant après le clic | **promesse permanente**, visible au chargement, sans bouton ni lien |
| Accessibilité du bloc | ni `role` ni `aria-live` | `role="status"` + `aria-live="polite"` |

Le bouton qui ne servait à rien était **1,37 fois plus grand** que celui qui convertissait,
dans le même teal, et c'était le seul des deux à rester à l'écran.

`SignupWall` n'est plus utilisé dans ce fichier, son import est retiré. Effet de bord
favorable : `components/map/SignupBanner` et ses dépendances sortent du bundle client de
`/carnet/nouvelle`.

---

## 3. ★★★ Trois défauts trouvés par la revue croisée indépendante, et corrigés

C'est la partie la plus importante de ce RECAP : le sprint aurait été livré avec sa garantie
principale vide.

### a) `written === true` ne prouvait rien, et le seul cas à protéger ne l'était pas

`writeCookie` (`lib/drafts/client.ts`) pose `document.cookie` puis renvoie `true` **sans
jamais relire**. Il ne renvoie `false` que si `document` est absent (impossible dans un
handler de clic) ou si la valeur dépasse 3 000 caractères, alors que la charge maximale
mesurée fait ~450. **Les deux portes étaient inatteignables.**

Scénario concret, celui-là même que le brief posait en critère d'acceptation : cookies
bloqués dans Chrome → `document.cookie` est un **no-op silencieux, sans exception** →
`written === true` → on navigue → `/auth/register` ne trouve rien, pas de phrase de rappel →
le visiteur s'inscrit, `replayPendingDrafts()` ne rejoue rien, **la prise est perdue en
silence**, et la saisie avec, puisqu'on a quitté la page.

Le message d'échec, le lien en nouvel onglet, l'annonce `aria-live` et le `scrollIntoView`
conditionnel étaient donc **tout du code mort**.

**Correctif** : `writePendingCatch(...) && readPendingCatch() !== null`. On relit ce que le
navigateur a réellement accepté. `lib/drafts/client.ts` n'est pas modifié (garde-fou du
brief), on ne fait qu'importer son helper. ⚠️ `readPendingCatch` sert ici de relecture de
**contrôle**, à ne pas confondre avec l'initialiseur d'état que le brief proscrit.

### b) `onSubmit` ne validait pas sa charge, et il existe un spot en prod qui casse

L'autosave passait par `pendingCatchSchema.safeParse` avant d'écrire ; `onSubmit` appelait
`writePendingCatch` **directement**, et `serializePendingCatch` ne fait qu'un
`JSON.stringify`. Une charge invalide produisait donc un cookie que `parsePendingCatch`
refuse ensuite, en silence.

Ce n'est pas théorique. Relevé en base sur les 4 605 spots :

```
plages-des-terrasses-du-soleil-poste-de-secours-n--osm1723971383
source=imported · moderation_status=approved · visibility=public
```

Le double tiret `n--osm` viole la regex de slug de `lib/drafts/schema.ts`. Ce spot est
**approuvé et public**, donc `/carnet/nouvelle?spot_id=<ce slug>` est atteignable par un
anonyme : l'autosave n'écrivait jamais, `onSubmit` écrivait un cookie illisible, et on
naviguait quand même. La relecture du point (a) ferme aussi ce cas.

### c) La promesse mentait sur deux réglages, à l'écran en même temps qu'eux

La puce disait « Ta saisie est reportée telle quelle ». Or le cookie ne porte **pas**
`precise_for_friends` ni `reveal_precise_to_public` (invariant RGPD, correct), et
`replayPendingDrafts` les force en dur à `true` / `false`. Un visiteur qui ouvrait les
réglages fins et activait « Coords précises publiques » voyait son choix **silencieusement
écrasé** à l'inscription, pendant que la promesse permanente lui affirmait le contraire.

**Correctif** : la puce nomme ce qui voyage réellement, « Ton espèce, ta taille, ta date et ta
visibilité sont reportées, tu ne retapes rien ».

---

## 4. Deux erreurs du brief, trouvées à l'implémentation

### ★ Le Bloc 2 lu au pied de la lettre régressait le sprint 77 Bloc 8

Le brief disait « replier la carte Confidentialité ». Appliqué tel quel, cela enterrait aussi
le sélecteur **« Qui voit cette prise »**, dont la valeur par défaut est **publique** — ce que
le sprint 77 Bloc 8 interdit explicitement (« jamais un menu à ouvrir, jamais un réglage
enterré »).

Seuls **les deux interrupteurs de coordonnées précises** ont été repliés, c'est-à-dire le
défaut n°5 réel de la QA. Le sélecteur de visibilité et l'encart « Ton coin reste ton coin »
restent visibles sans clic. Vérifié à la ligne par la revue croisée.

### ★ La condition d'écriture continue proposée était insuffisante

Le brief proposait la condition `anonymousDraft && spotContext && values.species`. Mais
`watch()` livre les valeurs **brutes**, pas la sortie de zod : `released` vaut `undefined`
tant qu'on n'y touche pas (le sprint 59 a retiré la présélection), alors que
`pendingCatchSchema` exige un `z.boolean()`.

Avec la seule condition du brief, le cookie aurait été écrit **invalide** et
`parsePendingCatch` aurait renvoyé `null` **en silence** sur `/auth/register` : la phrase que
ce sprint existe pour protéger aurait disparu. Correctif : mêmes replis que `onSubmit`
(`?? true`, `?? 'public'`) et `safeParse` avant écriture. La revue croisée a rejoué la chaîne
complète et confirmé le piège dans les deux sens, puis balayé tous les autres champs : aucun
n'est dans le même cas.

---

## 5. ⚠️ L'avertissement de mesure, à lire avant de juger le sprint

Recopié de `BASELINE.md`, et c'est la partie qui piège systématiquement.

Aujourd'hui `signup_wall_viewed({surface:'pending_catch'})` est émis **après** le clic.
Demain le bloc de promesse est visible dès le chargement, donc l'impression partira **à chaque
ouverture du formulaire par un anonyme**.

**Les impressions vont monter d'un ordre de grandeur et le taux de clic de `pending_catch` va
mécaniquement s'effondrer. Ce n'est PAS une régression.** Même piège que la discontinuité
`spot_page` du sprint 85 §3.

- **Le repère de succès est le VOLUME ABSOLU de `pending_catch_started`, jamais un taux.**
- Il vaut **4 sur les 90 jours précédant le 17/08, dont 1 émis par la QA elle-même : la base
  honnête est 3.**
- Toute valeur durablement au-dessus de ~1 par semaine est un gain.

**Deuxième discontinuité, non prévue par le brief** : `signup_form_viewed{has_draft:true}` va
monter aussi, puisqu'un brouillon existe désormais sans le moindre clic. Le découpage
`has_draft` posé au sprint 85 n'est **pas comparable** de part et d'autre du déploiement. Et
`signup_wall_clicked{pending_catch}` passe de « inexistant » à « émis par le footer ».

---

## 6. Passe de vérification

| Contrôle | Résultat |
|---|---|
| `pnpm test` | **1 638 / 1 638**, 129 fichiers |
| `pnpm build` · `pnpm typecheck` · `pnpm lint` | verts, 0 erreur, 0 warning |
| `pnpm check:prerender` (binaire, invariant sprint 84) | ✅ 4/4 |
| Tests de staticité | 12/12 |
| `git diff -- supabase/migrations/` | **vide** |
| `git diff` sur `lib/drafts/*`, `app/auth/*`, `app/sitemap.ts` | **vide** |
| Sprint 83 : titres, `SpotUpLinks`, `NearbySpotsSection` | **vide** |
| `grep "Garder ma prise\|Mettre à jour mon brouillon" app components` | vide hors assertions de test |
| `lint-copy-dashes` | 16, repère inchangé |
| Surfaces d'analytics renommées | **aucune** |

### ★ Le connecté n'a rien vu changer, prouvé et pas supposé

C'était le risque principal : un seul fichier de 1 827 lignes sert les deux modes. La revue
croisée a cartographié les 17 occurrences de `anonymousDraft` et relu chaque hunk. Les seules
constructions non gardées sont inoffensives : `useSignupWallImpression` (no-op prouvé, le bloc
n'est pas monté pour un inscrit), `preciseSettingsOpen` (jamais lu hors mode anonyme), et
`draftSpotId`/`draftSpotSlug` (`undefined` en dur, l'autosave sort avant toute écriture). La
carte Confidentialité rend **exactement le même HTML** pour un inscrit.

### Invariant RGPD du cookie

Jeu de clés **réellement écrit**, relevé par sérialisation et non par déclaration :
`caught_at, privacy, released, size_cm, species, spot_id, spot_slug` (+ `technique`,
`weight_kg`). **Aucune coordonnée, aucune photo, aucune note.** `git diff -- lib/drafts/schema.ts`
vide.

### Zéro écriture réseau vers Supabase pendant la saisie anonyme

Remonté depuis le code : la branche anonyme ne contient ni `createCatch`, ni
`uploadCatchPhoto`, ni client Supabase, ni `fetch`. Le seul trafic sortant est PostHog.

---

## 7. Reste, et pièges pour la prochaine passe

**Dette laissée volontairement** :
- Le cookie n'est **jamais supprimé**. Si la saisie redevient invalide (espèce désélectionnée,
  poids sous le minimum), le cookie précédent survit tel quel. Portée faible, à traiter si le
  volume monte.
- `lib/gating/wall.ts` : l'entrée `pending_catch` de `SPOT_CUT_COPY` n'a plus de consommateur
  depuis que `<SignupWall surface="pending_catch">` a disparu. Fichier hors périmètre, la
  copie est morte mais inerte.

**Pièges de vérification, à ne pas transformer en faux positifs** :
- `grep SignupWall` **ne peut pas** être vide : `useSignupWallImpression` contient la
  sous-chaîne. Viser `<SignupWall` et la ligne d'import.
- `lib/catches/schema.ts` contient encore « Garder ma prise en brouillon » dans un commentaire
  **daté** de généalogie : volontaire.
- Le compteur de routes pré-rendues est **bruyant** (75 puis 74 sur deux builds sans
  changement) : se fier à `check:prerender`, qui est binaire.
- `__tests__/security-headers.test.ts` flake en timeout 5 s sous charge, vert en isolation.

---

## 8. Reste manuel John

1. Merger, déployer, **noter l'heure exacte**.

   > Poussé sur `main` le **18/08/2026 à 00:17** (commit `7b56d0c`). Vercel déploie
   > automatiquement depuis `main`. **J+14 = 01/09/2026** pour le volume de
   > `pending_catch_started`.

2. **deploy-watch** juste après : aucune nouvelle issue Sentry, cache du sprint 84 intact.
3. ★ **Rejouer le parcours sur un vrai téléphone, en 390 px réel.** La QA du 17/08 n'a pu
   descendre qu'à **501 px** : Chrome desktop sous Windows refuse d'aller plus bas.
4. **Tester le cas « cookies bloqués »** : c'est le correctif le plus important du sprint et
   celui qui n'a jamais pu être exercé en conditions réelles. Bloquer les cookies du site dans
   Chrome, remplir, cliquer : on ne doit **pas** naviguer, le message d'échec doit s'afficher,
   et le lien s'ouvrir dans un nouvel onglet.
5. À J+14 : le volume de `pending_catch_started`. **Repère : 3 sur les 90 jours précédents.**
   Ne pas lire le taux (cf §5).
6. Les restes du sprint 85, inchangés : l'insight PostHog d'activation à créer, le reset à
   tester sur Gmail et Outlook, et les relevés du sprint 84 du 24/08.
7. `_to_delete/` traîne en non suivi (deux fichiers de verrou git vides) : à supprimer ou à
   ignorer, mais pas à commiter.
