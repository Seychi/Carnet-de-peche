# Sprint 85 — RECAP
## « Mesurer avant de convertir »

> Exécuté le **2026-08-17**. Branche `main`, **rien n'est poussé, rien n'est commité**.
> Brief : `docs/sprint-85/BRIEF.md`. Mesure d'activation : `docs/sprint-85/ACTIVATION.md`.
> ⚠️ Fenêtre de mesure du sprint 83 ouverte jusqu'au **07/09** et cache du sprint 84 déployé
> depuis 3 heures : les deux ont été traités comme des invariants de sortie.

---

## 0. État en une ligne

Cinq blocs livrés (0 réduit, 1, 2, 3, 4, 5). **Zéro migration.** **1 606 tests verts**
(contre 1 524), build vert, types et lint propres.

★ **Le cache du sprint 84 n'est pas seulement préservé, il progresse** : **75 routes
pré-rendues** contre 73, 73 fichiers HTML contre 71, `check:prerender` vert. C'était le
risque principal du sprint, un sprint de conversion qui touche la fiche spot étant
exactement la façon dont ce gain se perd.

### Deux décisions de John prises pendant l'exécution

1. **Le replay de session est ÉCARTÉ.** `disable_session_recording: true` reste en place,
   le bandeau de consentement et la page confidentialité ne bougent pas. Les défauts 1 et 2
   du Bloc 0 sont annulés, et avec eux toute la surface juridique nouvelle.
   ⚠️ **Conséquence à assumer** : le brief prévoyait que le sprint 86 refonde le formulaire
   « armé des replays du Bloc 0 ». **Cette matière première n'existera pas.** Le sprint 86
   devra s'appuyer sur les events d'abandon au niveau du champ posés au Bloc 3, qui disent
   *où* ça casse mais pas *pourquoi*.
2. **Le SMTP Resend est branché** sur Supabase Auth. Le canal d'envoi n'est plus cassé, ce
   qui rend le retrait du lien magique sans effet de bord sur le « mot de passe oublié » des
   34 comptes qui ont un mot de passe.

---

## 1. Bloc 0 réduit — la doctrine de mesure

**47 comptes créés sur 90 jours dans `auth.users`** (recompté en base, pas recopié du brief).
**PostHog en voit 28.** Écart : **40,4 %**, toujours dans le même sens, PostHog ne voyant que
les visiteurs qui ont cliqué « Accepter ».

⚠️ **Honnêteté sur ce chiffre** : le 47 a été rejoué en base pendant le sprint, le 28 vient du
relevé du 17/08 et **n'a pas pu être revérifié** (connecteur PostHog non connecté dans la
session). L'écart repose donc sur une moitié vérifiée en direct et une moitié reprise.

**Nouvelle doctrine, écrite dans `CLAUDE.md`** : le nombre d'inscrits se lit dans
`auth.users` ; **PostHog sert aux taux et aux comportements**, jamais aux volumes. Sur un
ratio, le biais de consentement s'applique au numérateur comme au dénominateur et se compense
en grande partie.

`scripts/reconcile-signups.mjs` + `pnpm reconcile:signups` : garde-fou permanent, à rejouer à
chaque sprint de conversion. Le projet n'ayant **aucune clé PostHog en lecture** (vérifié dans
`lib/env.ts` et `.env.example`), le script prend le nombre PostHog en argument
(`--posthog <n> --days <n>`) plutôt que d'inventer une intégration.

---

## 2. Bloc 1 — `/auth/login` sort de l'index

23 personnes sur 90 jours entraient sur le site par la page de **connexion**, 4e page
d'entrée, déclarée au sitemap. Quelqu'un qui arrive de Google sur une page de connexion n'a,
par définition, pas de compte.

- Sitemap : **499 → 498 URLs, exactement −1**. `/auth/register` (priorité 0.7) est conservée.
  Le diff sur `app/sitemap.ts` est d'une ligne : la fenêtre de mesure du sprint 83 est intacte.
- `noindex, follow` **vérifié sur le HTML réellement servi**, pas sur le code :
  `<meta name="robots" content="noindex, follow">`. Le test a été prouvé mordant en
  commentant la ligne (échec), puis restauré.
- `app/robots.ts` **non touché** : une page bloquée au crawl ne peut pas voir son `noindex`,
  elle resterait indexée.

### ★ Le brief se trompait de fichier, et le suivre aurait cassé la connexion

Il proposait de corriger `lib/auth/redirect.ts` (`buildLoginRedirect`). **Il ne fallait
surtout pas y toucher** : ce helper sert aussi les gardes des routes `(app)`, où la cible
n'est pas quelqu'un sans compte mais souvent **un inscrit dont la session a expiré**. Le
rediriger vers l'inscription aurait divergé de `middleware.ts`, qui construit son
`/auth/login?redirect=` en dur pour les `APP_ROUTES` (invariant du sprint 70 Bloc C).

Le correctif est **par site d'appel**, avec le helper qui existait déjà, `buildSignupHref` :

| Fichier | Avant | Après |
|---|---|---|
| `tarifs/page.tsx` (CTA « Créer mon carnet gratuit ») | `/auth/login` | `/auth/register` |
| `tarifs/pricing-cards.tsx` (carte Découverte) | `/auth/login` | `/auth/register` |
| `components/map/SpotPopup.tsx` (favori anonyme) | `buildLoginRedirect` | `buildSignupHref` |
| `spots/[slug]/page.tsx:558` (`loginHref`) | `buildLoginRedirect` | `buildSignupHref` |

Le dernier était le plus visible : un visiteur sans compte qui cliquait « Signaler »
atterrissait sur un formulaire de **connexion**. Le `?redirect=` de retour est identique,
prouvé par un test qui exécute la vraie page serveur `/auth/register` et vérifie
`initialCtx.redirect`.

⚠️ **Effet volontaire** : `/auth/login?tab=register` hérite du `noindex` (même route). La
route répond toujours 200 et ouvre l'onglet inscription, mais les liens historiques indexés
vers cette URL se désindexeront au profit de `/auth/register`. Cohérent avec le canonical du
sprint 79. **Si tu veux garder ces URL indexées, il faut un 301 vers `/auth/register`** :
décision produit, pas technique.

---

## 3. Bloc 2 + Défaut 3 — la fiche spot

### ★ La cause des impressions manquantes n'était pas où le brief la cherchait

Le brief soupçonnait l'émetteur (`SignupBanner.tsx`). **Il est correct.** La coupure est
**au site d'appel** : `SignupWall` gardait son effet d'impression derrière `if (!track)
return`, **mais le `onClick` du CTA était inconditionnel**. Une instance en `track={false}`
pouvait donc cliquer sans jamais déclarer d'impression. La prop était posée à la main sur
4 murs, tous dans la fiche spot. D'où `spot_tides` 7 clics / 0 impression, `spot_score`
1 / 0, `spot_catches` 0 / 0.

La prop existait pour une vraie raison (un mur monté mais masqué en CSS gonflerait le
dénominateur) mais elle demandait à l'auteur de **deviner** à quel viewport son instance
s'affiche. Elle est **supprimée** et remplacée par une mesure : `useSignupWallImpression`
n'émet que si `el.getClientRects().length > 0`. `offsetParent` aurait été faux, il vaut
`null` pour tout `position: fixed`, donc pour le CTA collant.

Effet de bord voulu : pour un connecté, la CSS de pré-peinture du sprint 84 donne zéro
rectangle, donc **aucune impression**. Le `useLayoutEffect` du sprint 84 est intact et
désormais doublé d'un verrou physique.

### ★ Le Bloc 2 appliqué à la lettre recréait le Défaut 3

Supprimer le mur `lg:hidden` tout en gardant la barre collante mobile laissait `spot_page`
avec des clics mobiles et **zéro impression mobile**. La barre a donc été appariée à la même
surface : mobile → la barre porte le dénominateur, desktop → le mur de l'`aside`.

### L'ordre du document obtenu (rendu serveur anonyme)

| Repère | Offset |
|---|---|
| `<h1>` | 3 774 |
| **`<a href="/carnet/nouvelle?spot_id=…">`** | **9 372** |
| **mur unique (`spot_tides`)** | **11 583** |
| `<aside>` | 13 984 |
| mur de fin de lecture (`spot_page`) | 19 332 |

Le lien sans compte précède le mur de 2 211 octets et il est **dans le HTML servi**, pas
après hydratation (leçon du sprint 78 : prouver le CHEMIN, pas la destination).

Trois murs nus supprimés, la copie qui gagne conservée, **aucune surface renommée** :
le mur unique occupe l'emplacement `spot_tides` et émet `spot_tides`, avec la copie de
`spot_page` via une prop. Le mur est volontairement **hors du `{conditions && …}`** : sinon
une fiche dont Open-Meteo n'a pas répondu perdrait son seul mur.

### ★ Le « 16 clics contre 7 » est confondu

`SpotSignupCta`, la barre collante mobile vue par ~100 % des visiteurs mobiles (82 % du
trafic), émet `signup_wall_clicked({surface:'spot_page'})` **sans être un mur**. Une part
inconnue des 16 clics vient de cette barre, pas de la copie. La décision reste bonne (les
murs supprimés étaient nus, sans bénéfices ni rassurance), mais **ce chiffre ne doit plus
être cité comme un A/B de copie**.

### ⚠️ Discontinuité de mesure, à ne pas lire comme un effet

**Ne pas comparer les impressions `spot_page` de part et d'autre du déploiement.** Avant :
1 par vue de page, émise par le mur `lg:hidden` **quel que soit le viewport**, et
potentiellement pour des connectés. Après : barre collante sur mobile, mur de l'`aside` sur
desktop, et **jamais pour un connecté**. Les autres surfaces sont inchangées.

---

## 4. Blocs 5 et 3 — l'authentification

### Le lien magique est retiré

Répartition des 52 comptes par chemin réel : email + mot de passe **34** · Google seul **16**
· Google + email **2** · **lien magique seul : 0**. Zéro compte créé en trois mois, alors que
le sprint 77 l'avait promu au rang des deux autres chemins.

Retirés : `MagicLinkButton`, son formulaire, les états `magicErrors` / `magicState` /
`magicAction`, l'entrée `magic` de la table de copie, la Server Action `sendMagicLink` et son
`signInWithOtp`. `SentReason` ne garde que `signup` et `reset`. Hiérarchie remise sur **deux
chemins** : Google au-dessus, puis email + mot de passe, sur les deux onglets.

⚠️ **Conservé volontairement** : `supabase/email-templates/magic-link.html` et sa section du
README, avec une note datée. **Le magic link n'est PAS désactivé côté Supabase** :
`app/auth/confirm/route.ts` gère `type=email` pour la confirmation d'inscription ET le reset.
Le couper casserait l'inscription elle-même.

### Les cinq non-régressions, chacune prouvée

| Contrôle | Preuve |
|---|---|
| Connexion email + mot de passe | test : `signInWithPassword` appelée, `REDIRECT:/home`, `?redirect=` interne respecté, identifiants faux → message sans redirection |
| Inscription email + mot de passe | test : `signUp` appelée, `REDIRECT:/onboarding/1`, + les 14 tests d'`actions.test.ts` **inchangés** |
| Mot de passe oublié | test : `resetPasswordForEmail` avec `redirectTo` vers `/auth/reset-password`, succès et échec doux |
| Google OAuth sur les deux onglets | test de rendu : « Continuer avec Google » présent et **avant** le champ mot de passe sur les deux onglets |
| `app/auth/confirm/route.ts` intacte | `git diff --stat` **vide** sur `confirm`, `callback` et `reset-password` |

`grep -rn "sendMagicLink\|MagicLinkButton\|magicState" app components` → **vide**.

### L'instrumentation du formulaire

5 events : `signup_form_viewed`, `signup_field_focused`, `signup_submit_attempted`,
`signup_error_shown`, `signup_oauth_clicked`. **Aucune donnée personnelle**, garanti à trois
niveaux : typage fermé (aucune propriété n'accepte `string`), entonnoir runtime
(`classifyAuthError()` ne peut renvoyer qu'une des 13 constantes, testé avec des messages
hostiles contenant une adresse, un mot de passe et un code), et un test qui **lit les 8 sites
d'appel dans la source** et refuse toute clé hors de la liste blanche.

★ **La tâche 2 du Bloc 3 était déjà faite depuis le sprint 76** : le champ code fondateur est
déjà replié derrière « J'ai un code fondateur ». Le brief citait comme contresens un
commentaire qui décrivait **le correctif déjà en place**. Rien n'a donc été refondu ; les deux
cas ont été **prouvés** par un rendu réel (`inviteOnly=false` → champ absent du DOM ;
`inviteOnly=true` → présent et `required`).

⚠️ **Caveat de nommage** : les events s'appellent `signup_*` mais instrumentent **les deux
onglets**, sinon `/auth/login` (14,5 %, la moitié du gisement) resterait aveugle. La propriété
`tab` distingue : `signup_form_viewed` avec `tab: 'signin'` = une vue de la page de connexion.

---

## 5. Bloc 4 — la mesure d'activation (pour le sprint 86)

`docs/sprint-85/ACTIVATION.md`, requêtes rejouées en base, **rien changé au produit**.

| Cohorte d'ancienneté | Inscrits | ≥ 1 prise | ≥ 3 prises (le seuil du moat) |
|---|---|---|---|
| 30 j et + | 19 | **36,8 %** | 15,8 % |
| 14-29 j | 4 | **50 %** | 25 % |
| moins de 14 j | 29 | **3,4 %** | **0 %** |

★ **L'agrégat brut de 12,8 % est trompeur** et le fichier le dit : 29 des 47 inscrits ont
moins de 14 jours, donc n'ont pas eu le temps de sortir pêcher. Lire les cohortes, jamais
l'agrégat.

Correction au brief : le seuil des 3 prises est en **§3 « Cibles secondaires »** de
`CIBLES-MARKETING`, pas en §1.

L'insight PostHog est décrit mais **non créé** (connecteur non connecté) : reste manuel John.

---

## 6. Passe de vérification

| Contrôle | Résultat |
|---|---|
| `pnpm test` | **1 606 / 1 606**, 127 fichiers |
| `pnpm build` | vert |
| `pnpm check:prerender` | ✅ 4/4 témoins |
| Routes pré-rendues (sprint 84 = 73) | **75** |
| Fichiers HTML (sprint 84 = 71) | **73** |
| `pnpm typecheck` / `pnpm lint` | 0 erreur, 0 warning |
| `git diff -- supabase/migrations/` | **vide** |
| Sprint 83 : titres, `SpotUpLinks`, `NearbySpotsSection` | `git diff` **vide** |
| `lint-copy-dashes` | 16, inchangé |
| HTML mis en cache : `avatar_url`, « Mon carnet », pseudos réels | **0** |

### ★ Trouvaille : le compteur de routes pré-rendues est BRUYANT, ne pas le lire au chiffre près

Deux builds consécutifs **sans aucun changement pertinent entre les deux** ont donné **75 puis
74** routes. La cause a été isolée : **1 seule fiche spot sur les 10** déclarées par
`generateStaticParams` se pré-rend réellement.

Les 10 slugs existent tous en base, `approved` et `public` (vérifié). Ce qui échoue, ce sont
les appels externes par fiche au moment du build (marée, météo, bathymétrie) : c'est
exactement le risque que le sprint 84 avait anticipé pour justifier de **ne pas** pré-générer
les 607 fiches, et il se manifeste déjà sur 10.

**Ce n'est pas cassé** : `dynamicParams = true`, donc ces fiches se génèrent à la première
visite puis restent en cache ISR. C'est le préchauffage au build qui n'a pas lieu, pas le
cache. **Mais le nombre de routes ne doit plus servir de métrique avant/après au chiffre
près** : il faut le lire comme « 2 avant le sprint 84, ~74 depuis », et se fier à
`check:prerender` (binaire) plutôt qu'au compteur.

À traiter hors sprint : soit envelopper les appels externes de la fiche dans un
`unstable_cache` (déjà au backlog du sprint 84), soit assumer la liste courte et la réduire
aux fiches qui passent.

⚠️ **Deux faux positifs écartés**, à connaître pour ne pas les re-signaler :
- un `grep -i` de « mon carnet » remonte **70 fichiers** : ce sont les « **Créer** mon
  carnet », la copie du CTA anonyme, qui doit s'y trouver. Le contrôle doit être **sensible à
  la casse**, et il donne alors 0.
- un fichier contient `href="/home"` : c'est `/offline.html`, la page de repli PWA.

---

## 7. Reste manuel John

1. **Envoyer un vrai reset sur une adresse Gmail et une Outlook** et vérifier qu'il arrive en
   boîte de réception. Le SMTP est branché, c'est le seul test qui le prouve.
2. Merger, déployer, **noter l'heure exacte** ici.

   > Poussé sur `main` le **17/08/2026 à 20:53** (commit `1fb2163`). Vercel déploie
   > automatiquement depuis `main`. **J+14 = 31/08/2026** pour la réconciliation.

3. **Créer l'insight PostHog d'activation** (funnel `signup_completed` → `catch_log_started`
   → 3e prise, fenêtre 30 j) et coller son URL ici. Le mode opératoire est dans `ACTIVATION.md`.
4. À J+14 : rejouer `pnpm reconcile:signups` et la courbe hebdomadaire. **Le repère est
   13-14 inscrits par semaine**, pas les 2 par semaine d'avant août.
5. **Trancher `/auth/login?tab=register`** : laisser se désindexer, ou poser un 301 vers
   `/auth/register` (cf §2).
6. **Le 24/08** : les relevés du sprint 84 restent dus (Statistiques d'exploration, Active CPU).
7. **Le 07/09** : verdict A/B du sprint 83. **Ne toucher aucun titre avant.**
8. Le sprint 86 devra se passer des replays (cf §0) : les events du Bloc 3 disent **où** ça
   casse, pas **pourquoi**. À arbitrer avant de le cadrer.
