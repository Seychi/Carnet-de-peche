# Sprint 85 — Brief d'exécution
## « Mesurer avant de convertir » — réparer l'instrumentation, puis le dernier mètre

> Rédigé le **2026-08-17**. Durée cible : **1 sprint** (WS A/B/C/D parallèles jour 1).
> Contexte : `docs/PLAN-TRAFIC-2026-08-17.md`, `docs/sprint-84/RECAP.md` (ISR à ne pas recasser),
> `docs/sprint-83/RECAP.md` (fenêtre de mesure jusqu'au **07/09**),
> `docs/CIBLES-MARKETING-2026-07-06.md` (le seuil des 3 prises où le moat s'active).
> Décisions John 2026-08-17 : Vercel Pro ✅ · Skew Protection ✅ · sprint 84 déployé à 15:36 ·
> `INVITE_ONLY` vérifié, **pas** en invite-only ✅ · **le comptage sans cookie est écarté**
> (décision juridique de John, cf Bloc 0) · **le lien magique est supprimé** (cf Bloc 5) ·
> **le sujet du sprint est la conversion en compte, pas le trafic**.

**Préalable avant de démarrer** (manuel John, ~10 minutes dans le dashboard Supabase, **bloquant
pour le Bloc 5**) :

1. **Brancher le SMTP Resend sur Supabase Auth.** C'est la cause racine du « mail dans les
   indésirables », et le mode opératoire exact est **déjà écrit dans le repo** :
   `supabase/email-templates/README.md` §2. Par défaut Supabase envoie depuis
   `noreply@mail.app.supabase.io` avec un quota documenté de **2 emails/heure** et une
   délivrabilité moyenne — alors que `bonjour@carnet-de-peche.com` est déjà vérifié SPF/DKIM
   dans Resend (`lib/email/send.ts:7`). Dashboard → Authentication → Emails → SMTP Settings,
   les six champs sont dans le README.
2. Pendant qu'on y est, vérifier **Authentication → URL Configuration** (Site URL et allowlist),
   le README signale que c'était déjà « la cause racine » d'un bug de reset en juin.

---

## 🚀 Ligne de lancement (à copier-coller par John)

> ultracode — effort xhigh. Exécute `docs/sprint-85/BRIEF.md`. Lance les workstreams A, B, C et
> D en parallèle dès maintenant, respecte les dépendances du tableau, et termine par le
> workstream VERIF avant de me rendre la main. Le Bloc 0 est bloquant pour la LECTURE du sprint,
> pas pour son exécution. Ne push pas.

---

## 🧠 Connecteurs & sous-agents (cf `CLAUDE.md` §20)

| Quand | Sous-agent → connecteur | Pourquoi |
|---|---|---|
| Bloc 0, avant toute ligne | **docs-researcher** → Context7 | `posthog-js` **installé** (1.393.0) : options exactes de `session_recording` (masquage des saisies, `maskAllInputs`, `maskTextSelector`), interaction avec `opt_out_capturing_by_default`, et si un réglage projet peut ou non outrepasser `disable_session_recording`. **Vérifier dans le SDK installé**, comme au sprint 81. |
| Blocs 0 et 4 | **supabase-guard** → Supabase (RO) | Ancrer les chiffres de vérité en lecture (`auth.users`, `profiles`, `catches`, `subscriptions`) et écrire les requêtes de réconciliation. Aucune écriture, aucune migration dans ce sprint. |
| Bloc 3 | **qa-chrome** → Claude in Chrome + Playwright | Parcourir le formulaire d'inscription en 390 px et desktop, anonyme, avec et sans brouillon en attente. Console + réseau. |
| Bloc 2 | **qa-chrome** | Ordre des blocs de la fiche spot après remaniement, 390 px, anonyme ET connecté. |
| Après déploiement | **deploy-watch** → Vercel + Sentry | Aucune régression runtime, et surtout **aucune perte du cache du sprint 84**. |
| Clôture | **`/verif-sprint`** | Tests + build + lint + types + revue indépendante + anti-régression. |

---

## Objectif du sprint en une phrase

Rendre le tunnel d'inscription **lisible** (l'écart mesuré entre la base et PostHog est de 40 %),
puis supprimer les trois frictions déjà identifiées — la page de connexion indexée, les trois
murs empilés, et le tunnel sans compte enterré — sans recasser l'ISR du sprint 84.

---

## ★ Le fait qui doit recadrer tout le sprint

**Ta prémisse est fausse, et c'est une bonne nouvelle.** Mesuré en base le 17/08 :

| Semaine | Inscrits |
|---|---|
| 18/05 → 27/07 (10 semaines) | 2, 1, 0, 2, 0, 2, 2, 3, 2, 1, 2 |
| **03/08** | **13** |
| **10/08** | **14** |
| 17/08 (partielle) | 3 |

**L'inscription est passée de ~2 par semaine à ~13-14 par semaine début août.** Les sprints 76
(la vraie page `/auth/register`), 77 (inscription différée) et 78 (la porte du tunnel) ont
fonctionné, d'un facteur **6**. Personne ne le sait parce que la mesure est cassée.

**47 comptes créés sur 90 jours d'après `auth.users`. PostHog en voit 28.** L'écart est de
**40 %**, et il va toujours dans le même sens : PostHog ne voit que les visiteurs qui ont cliqué
« Accepter ». Le sprint 81 avait déjà relevé 427 visiteurs PostHog contre ~1 495 clics Google.

**Conséquence directe sur ce sprint** : on ne démonte rien, on ne « refond » pas le tunnel. On
répare la mesure, on enlève trois frictions précises, et on garde ce qui vient de marcher.
Toute proposition de refonte du formulaire dans ce sprint est **hors périmètre** tant que le
Bloc 0 n'a pas donné une lecture fiable.

### Les autres chiffres de référence (mesurés, à ne pas re-débattre)

- `/auth/register` : **48 personnes → 7 comptes (14,6 %)**. `/auth/login` : **62 → 9 (14,5 %)`.
  (Ratios PostHog : numérateur et dénominateur sont tous deux des consentants, donc le **taux**
  est bien moins biaisé que les volumes.)
- **23 personnes entrent sur le site par `/auth/login`** — 4e page d'entrée du site. Et
  `app/sitemap.ts:28` la déclare à Google.
- Les trois murs de la fiche spot, en clics sur 90 j : `spot_page` **16**, `spot_tides` **7**,
  `spot_score` **1**. Celui qui explique ce qu'on obtient fait 16 fois le bouton nu.
- `pending_catch_started` : **4 en 90 jours**. Le tunnel sans compte est construit, atteignable
  depuis le sprint 78, et quasi jamais emprunté.
- Onboarding : **41 onboardés sur 47**. Ce n'est pas là que ça casse.
- Activation, à ancienneté comparable : **30 j et + → 36,8 %** ont logué une prise ;
  14-29 j → 50 % ; **moins de 14 j → 3,4 %** (29 personnes, 1 prise). C'est le mur suivant,
  **hors périmètre de ce sprint** (Bloc 4 le mesure seulement).
- 52 comptes, 4 sur un palier payant, **0 avec un `stripe_subscription_id`**. Aucun client
  payant à ce jour : les paliers viennent de codes. À savoir pour ne pas confondre « conversion
  en compte » (le sujet) et « conversion en abonné » (pas le sujet).

---

## Workstreams & dépendances

| WS | Bloc(s) | Durée | Dépend de | Parallélisable jour 1 |
|----|---------|-------|-----------|----------------------|
| A | Bloc 0 — réparer la mesure (replay + murs + réconciliation) | 1,5 j | — | ✅ |
| B | Bloc 1 — `/auth/login` sort de l'index | 0,5 j | — | ✅ |
| C | Bloc 2 — la fiche spot : un seul mur, tunnel sans compte remonté | 1,5 j | — | ✅ |
| D | Bloc 3 — instrumenter le formulaire (pas le refondre) | 1 j | — | ✅ |
| E | Bloc 4 — poser la mesure d'activation pour le sprint 86 | 0,5 j | A | ❌ |
| F | Bloc 5 — retirer le lien magique | 0,5 j | — | ✅ |
| VERIF | revue finale indépendante | 0,5 j | tous | ❌ (toujours en dernier) |

⚠️ Les blocs 3 et 5 touchent tous deux `app/auth/login/login-client.tsx`. **Le Bloc 5 passe en
premier** (il retire du code que le Bloc 3 n'aura donc pas à instrumenter), ou les deux sont
confiés au même agent. Ne pas les paralléliser sur le même fichier.

---

## Bloc 0 — ★ Réparer la mesure (rien d'autre n'est lisible sans ça)

Trois défauts distincts, tous prouvés. Ce bloc ne change **aucun** comportement produit visible,
sauf le bandeau de consentement (§ RGPD ci-dessous).

> **Connecteurs** : **docs-researcher** → Context7 sur `posthog-js` **installé** (options de
> `session_recording`, masquage). **supabase-guard** → Supabase (RO) pour la réconciliation.

### Défaut 1 — le replay est coupé DANS LE CODE

John a activé le replay dans les réglages du projet PostHog et n'obtient rien. La cause est
`components/analytics/PostHogProvider.tsx:59` :

```ts
disable_session_recording: true,
autocapture: false,          // ligne 60
```

**Un réglage côté projet ne peut pas outrepasser ce drapeau côté client** : le SDK ne démarre
jamais l'enregistreur. Vérifier ce point dans le SDK installé (docs-researcher) puis retirer la
ligne 59.

⚠️ **`autocapture: false` (ligne 60) : NE PAS toucher dans ce sprint.** L'activer changerait le
volume d'events et donc la comparabilité de toutes les fenêtres de mesure en cours (sprints 83
et 84). Le replay suffit pour voir le formulaire.

### Défaut 2 — RGPD : conditions non négociables du replay

Le replay filme des sessions, dont **le formulaire d'inscription et son champ mot de passe**.
Conditions à remplir dans le même bloc, sinon on ne l'active pas :

1. **Aucun enregistrement avant consentement.** L'architecture le donne déjà
   (`opt_out_capturing_by_default: true` + `lib/consent`), mais le **vérifier** : avec le
   consentement refusé, aucune requête d'enregistrement ne doit partir. À prouver en réseau
   (qa-chrome), pas par lecture.
2. **Masquage des saisies.** Configurer `session_recording` pour masquer toutes les saisies par
   défaut, et vérifier explicitement que **le champ mot de passe et le champ e-mail** de
   `app/auth/login/login-client.tsx` (lignes 520, 579, 633, 653, 708, 728) sont masqués dans un
   replay réel. **Critère binaire** : ouvrir un replay et ne pouvoir lire ni l'e-mail ni le mot
   de passe.
3. **Mettre à jour `app/(marketing)/legal/confidentialite/page.tsx`** : mentionner
   l'enregistrement de session, sa finalité, sa durée de conservation et le masquage. Et
   vérifier que le libellé du bandeau (`components/consent/CookieBanner.tsx`) couvre bien cet
   usage — « mesure d'audience » ne couvre pas l'enregistrement de session.

⚠️ **DEMANDER À JOHN AVANT** si le libellé du bandeau doit changer : c'est de la copy juridique,
l'agent ne l'invente pas.

### Défaut 3 — les murs ne déclarent pas leurs impressions

Mesuré sur 90 jours : `spot_tides` a **7 clics et 0 impression**, `spot_score` **1 clic et
0 impression**, `spot_catches` **ni l'un ni l'autre**. Le taux de clic par surface est donc
**incalculable** — et c'est exactement pourquoi John croit que personne ne clique.

`components/map/SignupBanner.tsx:118` émet bien `signupWallViewed` dans un effet, et la ligne 174
émet le clic. Trouver pourquoi les surfaces `spot_tides`, `spot_score` et `spot_catches`
n'atteignent pas ce chemin (composant différent ? coupure rendue par une autre voie ?
`components/spots/viewer/slots.tsx` ?) et corriger, **sans renommer aucune surface existante** :
`lib/gating/wall.ts:53` prévient qu'un renommage casse l'historique.

### Défaut 4 — le comptage sans cookie est écarté : la BASE devient la source de vérité

**Décision John du 17/08 : on ne compte pas sans cookie, ce n'est pas légal.**
`NEXT_PUBLIC_ANALYTICS_COOKIELESS` reste **éteint**, et le code du sprint 81 reste en place,
inerte, sans être retiré. **Ne pas l'allumer, ne pas le proposer à nouveau dans ce sprint.**

Conséquence à assumer, et c'est le vrai sujet de ce défaut : **PostHog ne sera jamais un
compteur fiable d'inscriptions** (écart mesuré de 40 % le 17/08). On change donc de doctrine
plutôt que d'outil :

- **Le volume d'inscriptions se lit dans `auth.users`, pas dans PostHog.** C'est exact, complet,
  et indépendant du consentement.
- **PostHog garde les TAUX et les comportements** (quel mur, quel champ, quel abandon) : sur un
  ratio, le biais de consentement s'applique au numérateur comme au dénominateur, donc il se
  compense en grande partie.
- `scripts/reconcile-signups.mjs` (tâche 4) n'est donc pas un diagnostic ponctuel mais **le
  garde-fou permanent** : il dit à chaque sprint de combien PostHog sous-compte, et empêche de
  conclure sur un volume PostHog.

À écrire dans `CLAUDE.md` : « le nombre d'inscrits se lit en base ; PostHog sert aux taux ».

### Tâches

1. Retirer `disable_session_recording: true` (ligne 59) et configurer le masquage.
2. Traiter les 3 conditions RGPD ci-dessus.
3. Réparer les impressions de murs manquantes.
4. Créer `scripts/reconcile-signups.mjs` (ou une requête documentée dans le RECAP) qui compare,
   sur une fenêtre donnée : `count(auth.users)` contre le nombre d'events `signup_completed`
   PostHog. **Écrire l'écart dans le RECAP.** C'est le chiffre qui dit combien vaut la donnée
   PostHog, et il doit être rejoué à chaque sprint de conversion.

### Critères d'acceptation

- Consentement accepté → **au moins un replay visible** dans PostHog après un parcours réel
  incluant `/auth/register`. Consentement refusé → **aucune requête d'enregistrement** en réseau.
- Dans un replay réel, e-mail et mot de passe **illisibles**.
- Après correctif, `signup_wall_viewed` est émis par **toutes** les surfaces qui émettent
  `signup_wall_clicked`. À prouver par une requête PostHog : aucune surface avec clics > 0 et
  impressions = 0.
- Aucune surface renommée (`lib/gating/wall.ts` : les identifiants existants sont intacts).
- `confidentialite` mise à jour ; l'écart base ↔ PostHog est chiffré dans le RECAP.
- `autocapture` **reste** à `false`.

---

## Bloc 1 — `/auth/login` sort de l'index

23 personnes sur 90 jours **entrent sur le site par la page de connexion**, qui est déclarée
au sitemap (`app/sitemap.ts:28`, priorité 0.5). Quelqu'un qui arrive de Google sur une page de
*connexion* n'a, par définition, pas de compte : on lui montre un formulaire qui suppose qu'il
en a un.

> **Connecteurs** : aucun. Bloc autonome.

### Tâches

1. Retirer l'entrée `/auth/login` de `app/sitemap.ts`. **Garder `/auth/register`** (priorité
   0.7, c'est la bonne porte).
2. Passer `/auth/login` en `noindex, follow` via `metadata.robots` dans
   `app/auth/login/page.tsx`. **Ne PAS la mettre en `disallow` dans `app/robots.ts`** : une page
   bloquée au crawl ne peut pas voir son `noindex`, elle resterait indexée. Le canonical de la
   ligne 11 reste inchangé.
3. Chercher les liens internes qui envoient un **anonyme** vers `/auth/login` au lieu de
   `/auth/register`. `lib/auth/redirect.ts` (`buildLoginRedirect`) est utilisé sur la fiche spot
   aux lignes 798, 1180, 1187, 1199 : pour un visiteur **sans compte**, la destination naturelle
   est l'inscription. Corriger là où la cible est un anonyme, **sans casser le
   `?redirect=` de retour** (invariant du sprint 70 Bloc C).
4. Ne pas toucher `/auth/login?tab=register` : des liens indexés en dépendent (commentaire de
   `app/auth/register/page.tsx`).

### Critères d'acceptation

- `curl` de `/auth/login` : l'en-tête/le `<meta name="robots">` porte `noindex`.
- `/auth/login` **absente** du sitemap, `/auth/register` toujours présente. Vérifier en
  comptant les URLs du sitemap avant/après : **exactement −1**.
- `/auth/login` répond toujours **200** et le formulaire de connexion fonctionne (un inscrit doit
  pouvoir se connecter — c'est une régression interdite).
- Un anonyme qui clique un CTA gaté d'une fiche spot arrive sur une page d'**inscription**, avec
  son `?redirect=` intact vers la fiche d'origine. À prouver par un test.

---

## Bloc 2 — La fiche spot : un seul mur, et le tunnel sans compte remonté

Trois murs empilés disent la même chose avec le même bouton vert. Et surtout : les murs sont aux
lignes **929** (`spot_score`), **963** (`spot_tides`) et **987** (`spot_page`), tandis que
`ctaHref` — le lien vers `/carnet/nouvelle`, **le seul chemin qui ne demande aucun compte** —
n'apparaît qu'aux lignes **1298** et **1347**. La page demande donc trois fois un compte avant
de proposer la chose qui n'en exige pas. `pending_catch_started` = **4 en 90 jours**.

> **Connecteurs** : **qa-chrome** pour l'ordre des blocs et le 390 px, anonyme et connecté.

### ⛔ Garde-fou n°1 : ne pas recasser le sprint 84

Ce bloc touche la page que le sprint 84 vient de rendre statique. **Toute lecture de cookie côté
serveur ré-introduite ici annule le sprint 84 en silence.** Les deux verrous existent déjà et
sont **des critères de sortie de ce bloc** :

```bash
pnpm test __tests__/spot-pages-are-static.test.ts __tests__/marketing-layout-is-static.test.ts
pnpm build && pnpm check:prerender
```

Tout nouvel état dépendant de l'utilisateur passe par les slots client existants
(`components/spots/viewer/slots.tsx`, `SpotViewerProvider`), jamais par un nouveau
`createClient()` serveur.

### ⛔ Garde-fou n°2 : la fenêtre de mesure du sprint 83

**Interdit de toucher** : le `<title>` et la meta description (cohortes A/B, verdict au 07/09),
`SpotUpLinks`, `NEARBY_MAX`, `NearbySpotsSection`, `app/sitemap.ts` pour les fiches spots. Le
maillage interne du sprint 83 est en cours de mesure.
Le contenu des blocs de conversion, lui, n'entre dans aucune de ces deux mesures : le CTR mesuré
en Search Console dépend du **snippet**, pas du corps de page.

### Tâches

1. **Un seul mur d'inscription sur la fiche.** Garder la copie qui gagne — celle de `spot_page`
   (titre « Suis {nom}, c'est gratuit », les trois bénéfices, la note « Sans carte bancaire, en
   30 secondes »), et la placer **à la coupure** où le désir naît, c'est-à-dire là où se trouve
   aujourd'hui `spot_tides` (les 7 prochains jours). Supprimer les deux blocs nus.
   - ⚠️ **Conserver les identifiants de surface** pour l'historique : le mur unique émet la
     surface de l'emplacement qu'il occupe, pas un nouveau nom.
   - ⚠️ Le second `spot_page` de la ligne **1281** (bas de page) : le garder, un mur en fin de
     lecture ne concurrence pas celui du milieu.
2. **Remonter le tunnel sans compte AU-DESSUS du mur.** Un bloc court, avant le mur unique :
   « Note ta prise ici — pas besoin de compte », vers `ctaHref`
   (`/carnet/nouvelle?spot_id=…`). C'est le geste qui donne avant de demander, et c'est
   exactement ce que les sprints 77 et 78 ont construit.
3. Vérifier que le lien vers `/carnet/nouvelle` est bien **dans le HTML servi** (leçon du
   sprint 78 : prouver le CHEMIN, pas la destination) — donc dans le rendu statique anonyme,
   pas seulement après hydratation.

### Critères d'acceptation

- `curl` brut d'une fiche spot (pas après hydratation) : **exactement un** mur d'inscription
  dans la moitié haute du document, **un lien cliquable** vers `/carnet/nouvelle?spot_id=`, et
  ce lien apparaît **avant** le mur dans l'ordre du document.
- Les deux verrous du sprint 84 passent (commandes ci-dessus), et `check:prerender` reste vert.
- Aucun `<title>`, aucune meta, aucun `SpotUpLinks`, aucun `NEARBY_MAX` modifié :
  `git diff` sur `lib/seo/spot-title.ts`, `components/spots/SpotUpLinks.tsx`,
  `components/spots/NearbySpotsSection.tsx` doit être **vide**.
- Aucune surface d'analytics renommée ni supprimée de `lib/gating/wall.ts`.
- QA **qa-chrome** 390 px, anonyme et connecté : pas de débordement, cibles ≥ 44 px, et le
  connecté ne voit **aucun** mur d'inscription.

---

## Bloc 3 — Instrumenter le formulaire, **pas** le refondre

`/auth/register` convertit à 14,6 % et `/auth/login` à 14,5 %. C'est le plus gros gisement du
site : ~110 personnes atteignent une page d'auth par trimestre ; passer de 15 % à 35 % ferait
38 comptes au lieu de 16 **sans un visiteur de plus**.

**Mais on ne refond pas un formulaire à l'aveugle.** Ce bloc pose la mesure et ne prend que les
gestes dont la donnée est déjà certaine. La refonte est le sujet du sprint 86, armé des replays
du Bloc 0.

> **Connecteurs** : **qa-chrome** pour parcourir le formulaire (390 px et desktop, avec et sans
> brouillon en attente).

### Tâches

1. Ajouter des events d'abandon **au niveau du champ**, sur le modèle de `lib/analytics.ts` (même
   style, mêmes conventions de nommage, aucune donnée personnelle dans les propriétés) :
   `signup_form_viewed`, `signup_field_focused` (avec le nom du champ), `signup_submit_attempted`,
   `signup_error_shown` (avec **le type** d'erreur, jamais la valeur saisie),
   `signup_oauth_clicked` (avec le fournisseur).
   ⚠️ **Aucune adresse e-mail, aucun mot de passe, aucun code** dans une propriété d'event.
2. **Retirer le champ « Code fondateur (optionnel) » de l'affichage par défaut** quand
   `inviteOnly` est faux (`login-client.tsx:747-756`). Un champ optionnel intitulé « code » sur
   un formulaire d'inscription gratuit suggère que l'accès est réservé — c'est exactement le
   contresens que le commentaire de la ligne 299 dit vouloir éviter. Le remplacer par un lien
   discret « J'ai un code fondateur » qui le déplie. **Le comportement serveur reste
   strictement inchangé** (`actions.ts:266-379`) : un code fourni est toujours consommé, le gate
   `INVITE_ONLY` est intact.
3. Vérifier que le rappel de brouillon (`draftSummary`, sprint 78 Bloc 1) s'affiche bien quand un
   brouillon existe : c'est le seul élément de réassurance contextuelle de la page, et le Bloc 2
   va commencer à en produire.
4. **Ne pas toucher** : la logique OAuth Google, `normalizeAuthContext`, le flux de
   réinitialisation de mot de passe, `actions.ts`.

### Critères d'acceptation

- Un parcours d'inscription réel émet la séquence complète des nouveaux events, et **aucun**
  ne contient d'e-mail, de mot de passe ni de code. À prouver en inspectant les propriétés d'un
  event réel dans PostHog.
- `inviteOnly = false` : le champ code **n'est pas visible** au chargement, et se déplie au clic
  sur le lien. `inviteOnly = true` : le champ est visible et **requis**, comme aujourd'hui. Les
  deux cas testés.
- Un code fondateur saisi via le champ déplié est **toujours consommé** (test existant conservé,
  aucune régression sur `app/auth/login/__tests__/actions.test.ts`).
- Le rappel de brouillon s'affiche quand les cookies `PENDING_CATCH` / `PENDING_FAVORITES`
  existent, et la page ne casse jamais si le brouillon est illisible (invariant écrit dans
  `register/page.tsx`).

---

## Bloc 4 — Poser la mesure d'activation (pour le sprint 86, pas pour celui-ci)

Le mur d'après est déjà visible et il ne faut pas le traiter maintenant, mais il faut pouvoir le
lire. À ancienneté comparable : **30 j et + → 36,8 %** des inscrits ont logué une prise ;
14-29 j → 50 % ; **moins de 14 j → 3,4 %** (29 personnes, 1 prise). Le seuil produit est
**3 prises** (là où le moat s'active, cf `CIBLES-MARKETING` §1).

> **Connecteurs** : **supabase-guard** → Supabase (RO).

### Tâches

1. Écrire dans `docs/sprint-85/ACTIVATION.md` les requêtes SQL de référence (cohorte par
   ancienneté × prises loguées × favoris), avec le relevé du 17/08 comme base gelée.
2. Créer l'insight PostHog correspondant côté produit : `signup_completed` → `catch_log_started`
   → 3e prise, en funnel, fenêtre 30 jours.
3. **Ne rien changer au produit dans ce bloc.** C'est de la mesure, pas une intervention.

### Critères d'acceptation

- `ACTIVATION.md` existe, porte les requêtes et les chiffres du 17/08, et distingue
  explicitement les trois cohortes d'ancienneté (l'agrégat brut de 12,8 % est **trompeur** :
  29 des 47 inscrits ont moins de 14 jours).
- L'insight PostHog existe et son URL est dans le RECAP.

---

## Bloc 5 — ★ Retirer le lien magique (il n'a jamais créé un seul compte)

Décision John : le lien magique part, parce que son email arrive dans les indésirables.
**La base confirme que ça ne coûte rien.** Répartition des 52 comptes par chemin réel
(`auth.identities` × présence d'un mot de passe), mesurée le 17/08 :

| Chemin | Comptes | Actifs 30 j | Dernier inscrit |
|---|---|---|---|
| email + mot de passe | **34** | 22 | 14/08 |
| Google seul | **16** | 13 | **17/08** |
| Google + email | 2 | 2 | 12/05 |
| **email SANS mot de passe (= lien magique seul)** | **0** | — | — |

**Zéro compte créé par lien magique depuis l'ouverture du site.** Le sprint 77 Bloc 10 l'avait
promu au rang des deux autres chemins (« trois chemins de rang égal », commentaire de
`login-client.tsx:462`) ; en trois mois il n'a rien produit. Le retirer supprime un choix sur
un formulaire qui en a déjà deux, et supprime un email qui n'arrive pas.

> **Connecteurs** : **qa-chrome** pour les deux onglets (connexion / inscription), 390 px et
> desktop. **supabase-guard** en lecture seule si un doute subsiste sur les chemins d'auth.

### ⚠️ Ce que le retrait ne règle PAS, et qui compte plus

**34 comptes ont un mot de passe.** Le jour où ils l'oublient, ils passent par
`resetPasswordForEmail` (`app/auth/login/actions.ts:434`) — c'est-à-dire **exactement le même
canal d'envoi cassé**. Le préalable SMTP de l'en-tête de ce brief n'est donc pas optionnel :
sans lui, on retire un email qui tombe en spam et on laisse en place celui qui verrouille les
comptes existants.

Deux signes que le canal est bien la cause : **9 comptes** ont été confirmés après un clic dans
un email, avec un délai moyen de **4 h 19** — un délai de ce genre, c'est un email trouvé tard,
donc trouvé ailleurs que dans la boîte de réception. Et le quota par défaut de Supabase est de
**2 emails/heure** : aux 13-14 inscrits par semaine actuels ce n'est pas encore bloquant, mais
ça le devient à la première pointe.

### Tâches

1. Retirer le chemin lien magique de l'interface : `MagicLinkButton`
   (`login-client.tsx:144`), son formulaire (lignes ~506-534), les états `magicErrors`,
   `magicState`, `magicAction` (lignes 310, 327, 358-360), et l'entrée `magic` de la table de
   copie (ligne 210).
2. Retirer la server action `sendMagicLink` (`app/auth/login/actions.ts:92-140`) **et son
   import** (ligne 39 du client). Retirer le type `SentReason` `"magic"` (ligne 105) en gardant
   `"signup"` et `"reset"`.
3. **Garder `supabase/email-templates/magic-link.html`** et sa section du README, avec une note
   datée : « chemin retiré de l'UI au sprint 85 (0 compte créé en 3 mois) ; template conservé,
   le type `email` du flux `token_hash` sert aussi la confirmation d'inscription ».
   ⚠️ **Ne PAS désactiver le magic link côté Supabase Dashboard** : la route
   `app/auth/confirm/route.ts` gère `type=email` pour la confirmation d'inscription ET le
   reset — casser ce flux casserait l'inscription elle-même.
4. Remettre la hiérarchie du formulaire sur **deux** chemins, dans l'ordre du coût : **Google
   (1 clic) au-dessus**, puis email + mot de passe. Google reste au-dessus sur les deux onglets
   (décision John du sprint 76, inchangée) — et la donnée la conforte : Google, c'est 18 comptes
   sur 52, et le dernier inscrit du site.
5. Mettre à jour les commentaires devenus faux : `login-client.tsx:462` (« trois chemins de rang
   égal ») et `792` (« Google et le lien magique sont remontés »).

### Critères d'acceptation

- Aucune occurrence de `sendMagicLink`, `magicState`, `MagicLinkButton` dans `app/` et
  `components/` : `grep -rn "sendMagicLink\|MagicLinkButton\|magicState" app components` renvoie
  **vide**.
- `pnpm typecheck` et `pnpm lint` verts (les états retirés ne laissent aucune variable orpheline).
- Les deux onglets rendent **exactement deux** chemins : Google, puis email + mot de passe.
- **Non-régressions obligatoires, chacune prouvée par un test ou un parcours réel** :
  - connexion par email + mot de passe : **fonctionne** ;
  - inscription par email + mot de passe : **fonctionne**, et le compte apparaît dans
    `auth.users` ;
  - « mot de passe oublié » : envoie toujours l'email et le lien atterrit bien sur
    `/auth/reset-password` (flux `token_hash` du README, **à ne pas toucher**) ;
  - Google OAuth : **fonctionne** sur les deux onglets ;
  - `app/auth/confirm/route.ts` : **intacte**, aucune ligne modifiée.
- Les tests existants de `app/auth/login/__tests__/actions.test.ts` sont adaptés (pas
  supprimés en bloc) : ce qui testait `sendMagicLink` disparaît, le reste est **inchangé**.

### Garde-fous

- ⚠️ **DEMANDER À JOHN AVANT** de toucher quoi que ce soit dans le Dashboard Supabase : le
  préalable SMTP est une action manuelle de John, l'agent ne la fait pas et ne la suppose pas
  faite. Si le SMTP n'est pas branché au moment du sprint, **le noter dans le RECAP** — le
  retrait du lien magique reste valide, mais le reset reste fragile.
- Ne pas toucher : `app/auth/confirm/route.ts`, `app/auth/callback/route.ts`,
  `normalizeAuthContext`, le flux de reset, la logique OAuth.

---

## Workstream VERIF (obligatoire, agent indépendant qui n'a pas écrit le code)

1. Lancer `/verif-sprint` : `pnpm test` (1 524 tests + les nouveaux), `pnpm build`,
   `pnpm typecheck`, `pnpm lint`.
   ⚠️ `__tests__/security-headers.test.ts` flake en timeout 5 s sous charge de suite complète —
   connu depuis le sprint 83, vert en isolation, **pas** une régression.
2. ★ **Passe de non-régression du sprint 84, la plus importante** :
   `pnpm check:prerender` vert, `prerender-manifest.routes` **au moins égal** au nombre du
   RECAP du sprint 84, les deux tests de staticité verts. Un sprint de conversion qui touche la
   fiche spot est **exactement** la façon dont le gain du sprint 84 se perd.
3. ★ **Passe RGPD** : consentement refusé ⇒ aucune requête d'enregistrement ; e-mail et mot de
   passe illisibles dans un replay réel ; `confidentialite` à jour ; aucun event ne porte de
   donnée personnelle.
4. Passe de non-régression du sprint 83 : `git diff` vide sur les titres, `SpotUpLinks`,
   `NearbySpotsSection`, et le sitemap des fiches spots.
5. Passe sécurité : `git diff -- supabase/migrations/` **vide**, RLS et grants inchangés, aucune
   coordonnée précise dans un HTML mis en cache (le test du sprint 84 doit rester vert).
6. ★ **Passe d'authentification** (la plus risquée du sprint après la RGPD) : les cinq
   non-régressions du Bloc 5 rejouées une par une — connexion mot de passe, inscription mot de
   passe, mot de passe oublié de bout en bout, Google OAuth sur les deux onglets,
   `app/auth/confirm/route.ts` intacte. **Un site où on ne peut plus se connecter est un échec
   total, quel que soit le gain de conversion.**
7. Passe copy : tutoiement, zod en français, pas de tiret cadratin en copy visible.
8. Livrer `docs/sprint-85/RECAP.md` : fait / comment tester / **l'écart base ↔ PostHog chiffré** /
   **si le SMTP Resend était branché ou non au moment du sprint** / reste manuel John.

---

## Reste manuel John (post-sprint)

1. **Brancher le SMTP Resend sur Supabase Auth** (préalable de l'en-tête,
   `supabase/email-templates/README.md` §2). C'est le seul geste du sprint que le code ne peut
   pas faire, et il conditionne le « mot de passe oublié » des 34 comptes qui ont un mot de
   passe.
2. Après branchement : **envoyer un vrai reset sur une adresse Gmail et une adresse Outlook**,
   et vérifier qu'il arrive en boîte de réception. C'est le seul test qui vaut.
3. Merger, déployer, **noter l'heure exacte** dans le RECAP.
4. **Regarder 10 replays** de gens qui atteignent `/auth/register` sans créer de compte. C'est
   la matière première du sprint 86, et rien ne la remplace.
5. À J+14 : rejouer la requête de réconciliation et la courbe hebdomadaire d'inscription. Le
   repère est **13-14 inscrits/semaine**, pas les 2/semaine d'avant août.
6. Le 24/08 : les relevés du sprint 84 (Statistiques d'exploration, Active CPU) restent dus.
7. Le 07/09 : verdict A/B du sprint 83. **Ne toucher aucun titre avant.**

---

## Hors périmètre, explicitement

- **Refondre le formulaire d'inscription** : sprint 86, armé des replays.
- **Rallumer le comptage sans cookie** : écarté par décision de John (Bloc 0). Ne pas le
  reproposer dans ce sprint.
- **Brander les templates d'email d'auth** (confirmation d'inscription encore sur
  `{{ .ConfirmationURL }}`, bug cross-device latent signalé par le README) : backlog, à traiter
  une fois le SMTP branché.
- **L'activation** (faire loguer la première prise) : sprint 86 ou 87, mesurée au Bloc 4.
- **La monétisation** : 0 abonné Stripe. Le problème n'est pas le paywall, c'est le volume en
  amont.
- `autocapture: true` : changerait le volume d'events pendant deux fenêtres de mesure ouvertes.
- `/spots/departement/[code]` (décision ouverte du sprint 84) et l'approche créateurs / réseaux
  sociaux : ni l'un ni l'autre n'est un sujet de conversion.
