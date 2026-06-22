# Bloc E + F — Cohérence onboarding↔profil & Tarifs vs réalité
> Recherche pré-implémentation — sprint 17 · 2026-06-22
> READ-ONLY — aucune modification de code ici.

---

## Bloc E — Modèle social décidé = ABONNÉS (unidirectionnel public, façon Insta)

### E.1 — Incohérence centrale : "Amis" vs "Abonnés"

La décision John est **abonnés** (unidirectionnel). Or le mot **"Amis"** traîne dans 6 endroits du code :

| Fichier | Ligne | Texte à corriger |
|---|---|---|
| `app/(app)/carnet/[id]/page.tsx` | 36 | `label: 'Amis'` dans `PRIVACY_CONFIG.friends` |
| `app/(app)/carnet/[id]/page.tsx` | 234 | `label="Coords précises pour mes amis"` |
| `components/catches/CatchForm.tsx` | 847 | `{ val: 'friends', label: 'Amis' }` |
| `components/catches/CatchForm.tsx` | 871 | `'Visible par tes amis avec coords précises (si activé).'` |
| `components/catches/CatchForm.tsx` | 883 | `label="Coords précises pour mes amis"` |
| `components/catches/CatchRowItem.tsx` | 10 | `friends: 'AMIS'` |
| `app/(marketing)/legal/confidentialite/page.tsx` | 87 | `prises (privée / amis / publique)` |
| `app/(marketing)/legal/confidentialite/page.tsx` | 151 | `prises (privée / amis / publique), géolocalisation` |

**Remplacement à faire partout :** "Amis" → "Abonnés", "mes amis" → "mes abonnés", "tes amis" → "tes abonnés".

**⚠️ Invariant de gating à ne pas toucher :** La colonne `privacy = 'friends'` en base de données et la logique RLS `catches_select_friends` (qui filtre sur la table `follows`) restent inchangées — c'est uniquement du **copy/label**. Le comportement fonctionnel (les abonnés unilatéraux voient les prises `friends`) est déjà aligné sur le modèle Insta. Pas de migration nécessaire.

### E.2 — Username : regex divergente entre onboarding et profil

| Fichier | Ligne | Regex |
|---|---|---|
| `app/(app)/onboarding/[step]/onboarding-step.tsx` | 56 | `/^[a-zA-Z0-9_-]+$/` — autorise `_` et `-` UNIQUEMENT |
| `app/(app)/profil/actions.ts` | 16 | `/^[a-zA-Z0-9_.-]+$/` — autorise `_`, `.` ET `-` |

**Problème :** un utilisateur qui a choisi `jean.pecheur` via le profil ne pourrait pas re-passer l'onboarding avec ce pseudo. Inversement, l'onboarding accepte `jean-pecheur` mais la fiche profil aussi. La divergence est côté **validation serveur onboarding** (action `saveOnboardingStep` — pas de zod côté serveur, update brut sur la DB). La validation frontend du step1 n'est qu'indicative — aucun zod serveur ne la confirme.

**À corriger :**
- Décider d'une regex canonique (suggestion : `/^[a-zA-Z0-9_.-]+$/` — la plus permissive, celle du profil) et l'appliquer partout.
- Ajouter un `z.parse` côté serveur dans `saveOnboardingStep` pour le step 1 (actuellement `update` brut sans validation).
- `lib/labels.ts` existe déjà pour SPECIES et TECHNIQUES — c'est le bon endroit pour exporter aussi `FREQUENCIES`, `LEVELS` et `USERNAME_REGEX` afin que onboarding et profil pointent vers la même source.

### E.3 — Libellés fréquence : divergence onboarding vs profil

| Valeur DB | Onboarding (`onboarding-step.tsx`) | Profil (`profile-form.tsx`) |
|---|---|---|
| `rare` | "Quelques fois par an" | "Occasionnellement" |
| `weekly` | "Toutes les semaines" | "Chaque semaine" |
| `daily` | "Plusieurs fois par semaine" | "Presque tous les jours" |
| `seasonal` | "Saisonnièrement" | "Saisonnièrement" ✓ |

3 libellés sur 4 divergent. Le pêcheur voit un texte différent à l'inscription et quand il édite son profil.

**Fix :** Centraliser dans `lib/labels.ts` un objet `FREQUENCY_LABELS` (4 entrées `value → label`) — même libellé partout.

### E.4 — `years_practicing` : non éditable au profil

L'onboarding collecte `years_practicing` (step 6, `form6`). Le formulaire `/profil` (`profile-form.tsx`) n'a **aucun champ** pour l'éditer. Il est envoyé dans `updateProfile` via `profileSchema`, mais `years_practicing` n'est pas dans le schema — donc il est silencieusement ignoré.

**À corriger :**
- Ajouter `years_practicing: z.number().int().min(0).max(70).optional().nullable()` au `profileSchema` dans `profil/actions.ts`.
- Ajouter un champ `<input type="number">` dans `profile-form.tsx` à côté de la fréquence.

### E.5 — Validation minimum onboarding non répercutée au profil

L'onboarding exige ≥1 technique (step 3) et ≥1 espèce (step 4) avant de continuer. Le `profileSchema` dans `profil/actions.ts` accepte des tableaux vides via `z.array(z.string()).optional()`. Un utilisateur peut donc vider ses techniques/espèces via le profil.

**Décision à trancher** : soit on exige ≥1 au profil aussi (cohérence produit), soit c'est volontaire (l'utilisateur peut tout virer s'il change de pratique). **Recommandation : exiger ≥1 technique**, car c'est utilisé pour le scoring et les filtres fil. Espèces = facultatif après l'onboarding.

### E.6 — Copy profil public `/u/[username]` : compteurs bien alignés

La page utilise déjà `'Abonnés'` / `'Abonnements'` dans `ProfileFollowStats.tsx` (ligne 83). Le bouton `FollowButton` dit probablement "Suivre"/"Suivi" — à vérifier, mais c'est cohérent avec le modèle Insta. **Pas d'incohérence détectée côté profil public.**

### E.7 — La RLS `catches_select_friends` : comportement correct, pas de migration

La vue `catches_for_viewer` filtre les prises `friends` via la table `follows` (unidirectionnelle). Un abonné de l'auteur voit ses prises `friends`. Ce comportement est déjà celui des "abonnés Insta". **Aucune migration nécessaire** pour le modèle abonnés.

---

## Bloc F — Tarifs vs réalité

### F.1 — Mode hors ligne : promis, pas livré (3 emplacements)

**Réalité :** Le SW (`public/sw.js`) fait un cache network-first des pages HTML visitées + app shell. Il ne précharge pas proactivement la carte vectorielle ni les marées 7 jours. La FAQ de `/tarifs` dit explicitement : "Tu télécharges ton département : carte vectorielle, marées 7 jours" — c'est **faux** aujourd'hui.

| Fichier | Ligne | Promesse à retirer/requalifier |
|---|---|---|
| `app/(marketing)/tarifs/pricing-cards.tsx` | 44 | `'Mode hors ligne (carte + marées 7 jours)'` |
| `app/(marketing)/page.tsx` | 522 | `"score et le hors-ligne : à partir de 4,90 €/mois."` |
| `app/(marketing)/page.tsx` | 537 | `"coords précises, score 0-100, filtres, hors-ligne."` |
| `app/(marketing)/tarifs/page.tsx` | 90-91 | FAQ entière "L'app fonctionne-t-elle hors ligne ?" avec réponse affirmative |
| `app/(marketing)/tarifs/page.tsx` | 124 | `"la carte complète, le score, le hors-ligne."` |

**Action :** Retirer "hors-ligne" / "Mode hors ligne" partout. Remplacer la FAQ par "En cours de développement — l'app se souvient des pages récemment visitées." ou supprimer la Q&A.

⚠️ **Pas de gating de tier à toucher** — c'est une feature inexistante, pas un problème de paywall.

### F.2 — Bathymétrie "SHOM premium" : faux

**Réalité :** La fiche spot (`app/(marketing)/spots/[slug]/page.tsx:552`) affiche déjà "Profondeur (bathymétrie réelle EMODnet)". La source est **EMODnet**, pas SHOM. Le plan Itinérant promet "Bathymétrie SHOM premium" — c'est doublement faux (ni SHOM, ni gatée derrière Itinérant aujourd'hui).

| Fichier | Ligne | Promesse à corriger |
|---|---|---|
| `app/(marketing)/tarifs/pricing-cards.tsx` | 58 | `'Bathymétrie SHOM premium'` |
| `app/(marketing)/page.tsx` | 543 | `"bathymétrie premium"` |

**Action :** Remplacer par `'Bathymétrie détaillée (EMODnet)'` — ou retirer si la bathy n'est pas réellement gatée derrière Itinérant. ⚠️ **Si la bathy n'est pas gatée**, ne pas la laisser comme argument de vente payant — sinon c'est une promesse trompeuse.

### F.3 — Itinéraires GPS multi-spots : faux

**Réalité :** Les fiches spots ont un bouton "Itinéraire GPS" (`spots/[slug]/page.tsx:411`) qui ouvre Google Maps/Plans/Waze vers **un seul spot** (mono-destination). Les "itinéraires multi-spots" n'existent pas.

| Fichier | Ligne | Promesse à retirer |
|---|---|---|
| `app/(marketing)/tarifs/pricing-cards.tsx` | 59 | `'Itinéraires GPS multi-spots'` |
| `app/(marketing)/page.tsx` | 543 | `"itinéraires GPS multi-spots"` |

**Action :** Remplacer par `'Itinéraire GPS vers chaque spot'` (ce qui est réel) ou retirer la ligne du plan Itinérant.

### F.4 — Stats avancées : disponibles pour TOUS (non gatées)

**Réalité :** `CatchStatsDetailed` est importé et rendu dans `app/(app)/carnet/page.tsx:116` **sans vérification de tier**. C'est disponible pour tous les utilisateurs connectés, y compris Découverte.

| Fichier | Ligne | Promesse à corriger |
|---|---|---|
| `app/(marketing)/tarifs/pricing-cards.tsx` | 46 | `'Stats avancées + photos HD illimitées'` |

**Deux options :**
- **Option A (recommandée — ne pas casser le gratuit)** : Retirer "Stats avancées" de la liste Local. Garder "Photos HD illimitées" seul (ou retirer aussi si toutes les photos sont HD pour tous).
- **Option B** : Gater réellement `CatchStatsDetailed` derrière `tier !== 'discovery'` dans `carnet/page.tsx` — mais ça dégrade l'expérience Discovery.

⚠️ **Invariant gating :** Si on gate, passer par `getUserTier()` côté serveur dans `carnet/page.tsx` et wrapper le composant. Ne pas laisser le composant se charger côté client avec un gating client-only.

### F.5 — Notifications push : pas de push, seulement in-app (Bloc B)

**Réalité actuelle :** Aucune notification n'existe (table `notifications` absente en prod au 2026-06-22 selon le brief). Le SW ne gère pas le Push API. Le Bloc B du sprint 17 crée des **notifs in-app** uniquement.

| Fichier | Ligne | Promesse à requalifier |
|---|---|---|
| `app/(marketing)/tarifs/pricing-cards.tsx` | 45 | `'Notifications push créneaux optimaux'` |

**Action :** Remplacer par `'Notifications créneaux optimaux'` (sans "push") une fois le Bloc B livré, ou retirer la ligne jusqu'à ce que les notifs existent.

### F.6 — "Apps iOS / Android en préparation" : mention honnête, à garder

La carte Découverte mentionne `'Apps iOS / Android en préparation'` — c'est une promesse future clairement libellée, pas une promesse active. À conserver.

---

## Synthèse — Plan d'action file:line

### Bloc E (modèle social + cohérence)

1. **"Amis" → "Abonnés"** (copy uniquement, pas de migration) :
   - `app/(app)/carnet/[id]/page.tsx` lignes 36, 234
   - `components/catches/CatchForm.tsx` lignes 847, 871, 883
   - `components/catches/CatchRowItem.tsx` ligne 10
   - `app/(marketing)/legal/confidentialite/page.tsx` lignes 87, 151

2. **Regex username** : aligner onboarding sur la regex du profil (`/^[a-zA-Z0-9_.-]+$/`) + ajouter validation zod serveur dans `saveOnboardingStep` pour step 1 (`app/(app)/onboarding/actions.ts`).

3. **Libellés fréquence** : centraliser dans `lib/labels.ts` (`FREQUENCY_LABELS`) — pointer depuis `onboarding-step.tsx` ET `profile-form.tsx`.

4. **`years_practicing` éditable** : ajouter dans `profileSchema` (`profil/actions.ts:23`) + champ dans `profile-form.tsx` (section "Ta pratique").

5. **Validation ≥1 technique** au profil : ajouter `z.array(z.string()).min(1, 'Choisis au moins une technique.')` dans `profileSchema` pour `techniques` — arbitrer avec John.

### Bloc F (tarifs)

1. **Hors-ligne** : retirer de `pricing-cards.tsx:44`, `page.tsx:522`, `page.tsx:537`, `tarifs/page.tsx:124`, et remplacer la FAQ `tarifs/page.tsx:90-91`.
2. **Bathy SHOM** → `'Bathymétrie détaillée (EMODnet)'` dans `pricing-cards.tsx:58` + `page.tsx:543`.
3. **Multi-spots** → `'Itinéraire GPS vers chaque spot'` dans `pricing-cards.tsx:59` + `page.tsx:543`.
4. **Stats avancées** : retirer de `pricing-cards.tsx:46` (feature gratuite, non gatée) — garder "Photos HD illimitées" si différenciée.
5. **Notifs push** : retirer "push" dans `pricing-cards.tsx:45` → `'Notifications créneaux optimaux'` une fois Bloc B livré.

---

## Invariants respectés

- Aucune migration proposée pour E (le modèle abonnés est fonctionnellement en place via `follows` unidirectionnel + RLS `catches_select_friends`).
- Le gating tier existant (coords précises, score, filtres espèces) n'est pas touché.
- Le social gratuit (fil, likes, commentaires, follows) n'est pas touché.
- Floutage GPS (`geom_public`, `catches_for_viewer`) non touché.
- Toute modification de `pricing-cards.tsx` est purement de la copy — pas de logique de gating.
