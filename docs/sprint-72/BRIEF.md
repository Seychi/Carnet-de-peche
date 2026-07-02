# Sprint 72 — Brief d'exécution
## « Alertes par port » : on te prévient quand TES conditions arrivent sur TON spot

> Rédigé le 2026-07-02. Durée cible : 1-2 sessions Fable. Prérequis : S69 + S70 mergés sur `main`.
> Contexte : `docs/roadmaps/ROADMAP-POST-AUDIT-2026-07-02.md` Phase D · audit §6.B · veille : Spot de Pêche fait des alertes grande marée **génériques** (coef > seuil) ; nous on déclenche sur les patterns PERSO du carnet — inimitable sans nos données. C'est l'argument de conversion n°1 du tier Local, et le futur argument du push natif (mobile M9).
>
> **Décisions verrouillées (roadmap 02/07)** :
> - **Gating** : favoris = tous tiers (c'est du carnet) ; **alertes = Local/Itinérant** (aligné CLAUDE.md §8 : « notifications push (créneaux optimaux, grandes marées) » = Local). Découverte voit un teaser honnête, jamais de fausse alerte.
> - **Opt-in explicite** : alertes désactivées par défaut, activation par l'utilisateur (RGPD, anti-spam).
> - **Cadence** : calcul quotidien ~17h Europe/Paris pour les fenêtres du LENDEMAIN (le pêcheur planifie la veille). Max **1 push + 1 email / utilisateur / jour**, dédup par (user, spot, date de fenêtre). Pas d'envoi nocturne.
> - **Cold start honnête** : sans historique suffisant, alerte « grande marée » générique **explicitement labellisée générique** — jamais un « 86 % » inventé.
> - **Canaux v1** : in-app (`notifications`) + push web (`push_subscriptions`) + email (Resend). Le push natif arrive en M9 (mobile) sur la même mécanique.

**Préalable avant de démarrer (manuel John)** : rien de bloquant. (Si le S70 n'est pas encore mergé, exécuter quand même : fichiers disjoints, mais l'event PostHog `signup_completed` du S70 est utile pour mesurer l'effet vitrine.)

---

## 🚀 Ligne de lancement (à copier-coller par John)

> ultracode — effort xhigh. Exécute `docs/sprint-72/BRIEF.md`. Lance les workstreams A/C en parallèle dès maintenant, puis B → D/E selon le tableau, et termine par le workstream VERIF avant de me rendre la main. Ne push pas.

---

## 🧠 Connecteurs & sous-agents (cf `CLAUDE.md` §20)

| Quand | Sous-agent → connecteur | Pourquoi |
|---|---|---|
| Bloc 0 | **supabase-guard** → Supabase | Schéma live + définition du cron `personal-window` AVANT d'écrire : on ÉTEND l'existant, on ne duplique pas. |
| Avant le moteur | **docs-researcher** → Context7 | Vercel cron / web-push / React Email versions courantes. |
| QA réglages + teaser | **qa-chrome** | Parcours opt-in réel, 2 comptes (Découverte / Itinérant). |
| Clôture | **`/verif-sprint`** puis **deploy-watch** | Standard. |

## Objectif du sprint en une phrase

Un abonné Local avec de l'historique reçoit, la veille au soir, une alerte justifiée (« demain 06:10 à [spot], coef 92 descendante : tes conditions à 86 % ») sur les canaux qu'il a choisis, jamais en double, et la feature est visible sur /tarifs.

## Workstreams & dépendances

| WS | Bloc | Durée | Dépend de | Parallélisable jour 1 |
|----|------|-------|-----------|----------------------|
| A | Bloc 0 — Ancrage lecture | 0,25 j | — | ✅ |
| B | Bloc 1 — Migration 106 (favoris + réglages + dédup) | 0,5 j | A | ❌ (A est court) |
| C | Bloc 2 — Moteur d'alerte | 1 j | A (B pour brancher) | ✅ (logique testable à blanc) |
| D | Bloc 3 — UX (favoris, réglages, /home, /tarifs) | 0,5 j | B | ❌ |
| E | Bloc 4 — Email Resend | 0,25 j | C | ❌ |
| VERIF | revue finale | 0,5 j | tous | ❌ (toujours en dernier) |

---

## Bloc 0 — Ancrage (lecture seule, livrable `docs/sprint-72/research/anchor.md`)

Faits déjà vérifiés le 02/07 (SQL live) : **aucune table de favoris n'existe** ; `push_subscriptions` existe (endpoint/p256dh/auth/ua) ; `notifications` existe ; `tide_calibration` existe ; `weather_cache` existe. À compléter :

### Tâches
1. Dumper la définition LIVE du cron `/api/crons/personal-window` (route + éventuelle fonction SQL) : que fait exactement la notif « optimal window » S26 ? Cadence, source de score, canaux actuels. **Règle : le S72 ÉTEND ce moteur (spot favori + canaux + email + dédup), il n'en crée pas un deuxième** — sauf si l'existant est incompatible (le documenter et trancher dans `anchor.md`).
2. Localiser la source des **tendances perso** (S22 « le carnet qui parle ») : lib + format (coef/phase de marée/moment/vent + taux + confiance). C'est l'ingrédient du message.
3. Localiser les préférences de notification existantes (emails dunning/win-back opt-out S26 — où vivent les flags ? `profiles` ? table dédiée ?) pour brancher les réglages au même endroit.
4. Vérifier l'infra push web : qui écrit dans `push_subscriptions`, quel helper d'envoi (`lib/push/send.ts` repéré), VAPID en place.
5. Baseline advisors.

### Critères d'acceptation
- `anchor.md` : définitions collées, décision « étendre vs créer » argumentée, mapping des préférences existantes.

---

## Bloc 1 — Migration **106** : `favorite_spots` + réglages + journal de dédup

> **Connecteurs** : supabase-guard avant/après ; regen `lib/types.ts` ; réserver `106b` aux fixes de revue.

### Tâches
1. **`favorite_spots`** : `user_id` (FK auth.users cascade), `spot_id` (FK spots cascade), `created_at` ; `unique(user_id, spot_id)` ; **cap raisonnable en SQL** (trigger : max 10 favoris/user, anti-abus). RLS : CRUD **own-only**. Index sur `spot_id` (requêtes du moteur).
2. **Réglages d'alerte** (selon Bloc 0 : colonne(s) sur la table de prefs existante OU table `alert_settings` own-only) : `alerts_enabled boolean default false`, `channel_push boolean default true`, `channel_email boolean default true`, `threshold smallint default 70` (score de fenêtre minimal).
3. **`alerts_sent`** (journal de dédup) : `user_id`, `spot_id`, `window_date date`, `score`, `kind` (`perso`/`generique`), `sent_at` ; `unique(user_id, spot_id, window_date)`. RLS : select own ; **aucune policy d'écriture** (le moteur écrit en service-role/SECURITY DEFINER, pattern maison).
4. Suppression de compte : vérifier que la cascade RGPD couvre les 3 objets (FK cascade = OK, le prouver dans la matrice VERIF).

### Critères d'acceptation
- Matrice SQL rollback : 11e favori refusé ; un user ne lit/écrit que ses lignes ; insert direct dans `alerts_sent` par `authenticated` → 42501 ; `delete_my_account` purge tout.
- Advisors : aucun nouvel ERROR.

---

## Bloc 2 — Le moteur

> **Connecteurs** : docs-researcher (web-push, Vercel cron limits plan Hobby — leçon S7.5 : cron quotidien).

### Tâches
1. Étendre le cron (cf Bloc 0) : pour chaque utilisateur **Local/Itinérant** (`current_tier`) avec `alerts_enabled` et ≥ 1 favori : prévisions du LENDEMAIN par spot favori (marée/coef via la chaîne existante + `tide_calibration`, météo/vent via `weather_cache`), croiser avec les tendances perso → **score de fenêtre 0-100** (réutiliser la décomposition existante astro/marée/vent + overlay perso, PAS un nouveau scoring).
2. Déclenchement : score ≥ `threshold` ET pas de ligne `alerts_sent` (user, spot, date) → notification in-app + push (si canal actif et subscription valide) + email (si canal actif). Message avec **justification** (« coef 92 descendante + vent NO 12 nœuds : conditions où tu as réussi 6 fois sur 7 ») + lien fiche spot. Écrire `alerts_sent` DANS LA MÊME transaction logique (pas d'alerte fantôme si l'envoi échoue : écrire après le 1er canal réussi).
3. **Cold start** : historique insuffisant (seuil de confiance des tendances) → n'alerter QUE sur grande marée (coef ≥ 90) avec label explicite « alerte générique : logue tes prises pour la personnaliser ».
4. Robustesse : timezone **Europe/Paris** partout (leçon heures de soleil) ; fail-soft par utilisateur (une erreur n'arrête pas le batch) ; logs opérationnels sobres ; budget < 60 s (leçon cron `compute-spot-scores` — batcher par utilisateur, pas de N+1 `current_tier` : 1 appel/user max).
5. PostHog : événements `alert_sent` (kind, canal) et `alert_clicked` (UTM sur les liens) — la boucle de conversion se mesure.

### Critères d'acceptation (tests Vitest + simulation)
- Même user, même spot, même fenêtre, 2 runs → 1 seule alerte (dédup).
- Compte riche → alerte perso justifiée ; compte pauvre → générique labellisée ; compte Découverte → RIEN (même opté-in).
- Opt-out canal respecté ; subscription push morte → email passe quand même ; aucune alerte entre 21h et 7h Europe/Paris.

---

## Bloc 3 — UX : favoris, réglages, vitrine

### Tâches
1. **Étoile « favori »** sur la fiche spot + le popup carte (tous tiers). État visible, toast doux, liste des favoris dans `/profil` ou `/compte`.
2. **Réglages d'alertes** (page notifications existante ou `/compte`) : master switch, canaux, seuil (curseur 50-90), liste des favoris surveillés. Copy claire : Local/Itinérant only, tutoiement.
3. **/home** : carte « Ta prochaine fenêtre à [spot favori] » quand une alerte est en attente/récente (réutiliser le pattern créneau du jour).
4. **/tarifs + upsell** : bloc vitrine dans la colonne Local (« Alerté la veille quand TES conditions arrivent ») ; pour Découverte, teaser honnête sur la fiche spot (étoile visible, au clic : « Les alertes personnalisées sont dans Local — essai 7 j »). **Interdit** : montrer une fausse alerte ou un faux score.

### Critères d'acceptation
- QA 2 comptes : Itinérant active tout en < 1 min depuis une fiche spot ; Découverte peut mettre en favori mais voit l'upsell propre au moment d'activer les alertes.
- Tap targets ≥ 44 px, aria-labels, zéro tiret cadratin en copy.

---

## Bloc 4 — Email (Resend + React Email)

### Tâches
1. Template FR aligné DA (objet : « Demain 06:10 à [spot] : tes conditions », corps = justification + CTA fiche spot + lien réglages/désabonnement en un clic).
2. Respecter l'opt-out global email existant (S26) EN PLUS du canal alerte.

### Critères d'acceptation
- Email de test rendu propre (Gmail + client sombre), lien désabonnement fonctionnel, aucun envoi si canal email off.

---

## Workstream VERIF (obligatoire, agent indépendant)

1. `/verif-sprint` (tests ≥ existants + nouveaux, build, typecheck, lint, lint copy-dashes). **deploy-watch** après déploiement (durée du cron < 60 s, 0 erreur).
2. Relire chaque critère, ✅/❌ avec preuve (matrice SQL rollback collée, captures QA, événement PostHog visible).
3. Passe adversariale : spammer les favoris (cap 10), toggler opt-in/out en boucle, fuseau (utilisateur à Nouméa ?), compte supprimé pendant le batch, spot supprimé/dépublié avec favoris orphelins.
4. Anti-régression : notif « optimal window » S26 toujours fonctionnelle (si étendue : comportement legacy conservé), floutage GPS (l'alerte d'un spot flouté ne révèle PAS de coordonnée précise à un Découverte — l'alerte est Local+, mais vérifier le contenu du mail/push), RGPD.
5. Livrer `docs/sprint-72/RECAP.md` : fait / comment tester / reste manuel John.

## Reste manuel John (post-sprint)

- Merge → main, déploiement, vérifier le cron en prod (logs Vercel J+1).
- Activer les alertes sur TON compte + 2-3 fondateurs → première vague réelle.
- (Stretch roadmap) GO/NO-GO étude courants SHOM si le sprint a respiré (`docs/sprint-72/courants-shom.md`).
