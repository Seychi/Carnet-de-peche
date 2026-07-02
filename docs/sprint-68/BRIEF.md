# Sprint 68 — Brief d'exécution
## Codes « fondateurs » = abonnement offert (comp), sans bloquer personne

> Rédigé le 2026-06-30. Durée cible : **1 grosse passe Fable** (effort `xhigh`), L.
> Contexte : `docs/audits/AUDIT-2026-06-30-UX-DESIGN-GAMIFICATION.md` §1.2 ; `docs/ROADMAP-POST-AUDIT-2026-06-30.md` Phase F. Objectif : **amorcer le réservoir** en offrant l'abonnement aux fondateurs, **sans jamais bloquer une inscription**.
> **Décisions John 2026-06-30 (verrouillées pour ce sprint) :**
> - **PAS de gate à l'inscription** — `INVITE_ONLY` reste **OFF**. N'importe qui peut s'inscrire normalement.
> - Un code « fondateur » **offre l'abonnement gratuitement** (comp), pas un accès.
> - **Tier offert = `local`** (carte complète de leur département).
> - Mécanisme : **codes à échanger** (comp), **sans carte ni Checkout**, **instantané**, **révocable**, mintés depuis `/moderation`.
> **Préalable : Phase B mergée.** **Migration : 1** (numéro = prochain libre, **confirmer via supabase-guard `list_migrations`** au démarrage — probablement ≈ 102).

> **État réel vérifié le 2026-06-30 :** `current_tier(uid)` (`lib/auth/tier.ts` → RPC SQL, migration 021) est la **seule source du tier**, alimentée par le webhook Stripe. Il existe déjà `invite_codes` + `consume_invite_code` + un **champ code à l'inscription** (`login-client.tsx`) et une logique de gate `INVITE_ONLY` dans `app/auth/login/actions.ts` — **on ne s'en sert PAS comme gate** ; on **repurpose le système de code** pour offrir le tier. **⚠️ Modifier `current_tier` est sensible (c'est la RPC de gating) → VERIF sécurité renforcée.**

---

## 🚀 Ligne de lancement (à copier-coller par John)

> ultracode — effort xhigh. Exécute `docs/sprint-68/BRIEF.md`. Prérequis : Phase B mergée.
> Ancre `current_tier` (migration 021), `invite_codes`/`consume_invite_code` (052) et le flux
> signup via supabase-guard AVANT de coder. Bloc 0 (DB + tier) d'abord (c'est le socle),
> puis 1/2/3. Le VERIF fait une **passe sécurité dédiée sur le gating** (aucun sur-octroi de
> tier, downgrade correct à l'expiration/révocation). Ne push pas. `INVITE_ONLY` **reste off**.

---

## 🧠 Connecteurs & sous-agents

| Quand | Sous-agent → connecteur | Pourquoi |
|---|---|---|
| Avant de toucher `current_tier` | **supabase-guard** → Supabase (RO) | Lire `current_tier` (021), `subscriptions`, `invite_codes` (052/`consume_invite_code`), le ranking de tiers ; `list_migrations` (numéro libre). **Ne jamais deviner cette RPC.** |
| Modif RPC / RLS / SECURITY DEFINER | **docs-researcher** → Context7 (Postgres) | Pattern correct pour un `current_tier` = max(Stripe, comp). |
| Flux signup + redeem (RSC/actions) | lecture `app/auth/login/actions.ts`, `login-client.tsx`, page compte | Ne pas casser le signup ouvert ni la connexion. |
| Admin modérateur | lecture `/moderation` (sprint 17, `is_moderator`) | Réutiliser le pattern d'accès. |
| QA end-to-end (redeem, downgrade) | **qa-chrome** + **deploy-watch** | Vérifier octroi, expiration, révocation, gating réel. |
| Clôture | **`/verif-sprint`** | Complet + passe sécurité gating. |

## Objectif du sprint en une phrase

Un **code fondateur** que n'importe qui peut échanger (à l'inscription **ou** dans son compte) pour obtenir **Local gratuitement**, instantanément, sans carte, **révocable et expirable**, minté depuis l'admin modérateur — **sans jamais bloquer une inscription**.

## Workstreams & dépendances

| WS | Bloc(s) | Durée | Dépend de | Parallélisable jour 1 |
|----|---------|-------|-----------|----------------------|
| A  | Bloc 0 — DB : comp_grants + `current_tier` + redeem RPC | L | — | ✅ |
| B  | Bloc 1 — UX d'échange (signup optionnel + compte) | M | Bloc 0 | ❌ |
| C  | Bloc 2 — Admin mint + révocation (/moderation) | M | Bloc 0 | ❌ |
| D  | Bloc 3 — Test end-to-end + amorçage + runbook | S-M | Blocs 0-2 | ❌ |
| VERIF | passe sécurité gating + revue | M | tous | ❌ |

---

## Bloc 0 — Socle : entitlement comp + `current_tier` = max(Stripe, comp)

Le cœur. On **n'invente pas de fausse ligne Stripe** (anti-traîne, cf `supabase/README.md`) ; on ajoute un **entitlement propre** que `current_tier` prend en compte.

> **Connecteurs** : **supabase-guard** — lire `current_tier` en entier + le ranking des tiers avant de le modifier ; confirmer où `consume_invite_code` incrémente `uses`.

### Tâches
1. **Table `comp_grants`** : `id`, `user_id uuid references auth.users(id) on delete cascade`, `tier text not null` (`'local'` par défaut), `source_code text`, `granted_at timestamptz default now()`, `expires_at timestamptz` (null = pas d'expiration / durée de la beta), `revoked_at timestamptz`. Index sur `user_id`. RLS : **lecture own-only** ; **aucune** écriture client directe (tout passe par les RPC ci-dessous).
2. **Étendre `invite_codes`** (ou table `comp_codes` si plus propre — trancher via supabase-guard) : ajouter `grants_tier text not null default 'local'`, `grant_months int` (null = sans expiration). Le code devient un **code comp**, plus un gate.
3. **RPC `redeem_comp_code(p_code text)` `SECURITY DEFINER SET search_path=public`** : pour le **caller authentifié** — valide le code (existe, `uses < max_uses`, non expiré), crée **un** `comp_grant` (idempotent : un même user ne peut pas ré-échanger le même code → `unique(user_id, source_code)`), calcule `expires_at` depuis `grant_months`, incrémente `uses`. Renvoie `{ok, tier, expires_at}` ou une erreur claire (déjà utilisé / invalide / expiré / plein).
4. **Modifier `current_tier(uid)`** : renvoyer le **plus haut** entre (a) le tier Stripe actuel (logique existante inchangée) et (b) le tier d'un `comp_grant` **actif** (`revoked_at is null and (expires_at is null or expires_at > now())`). Ranking : `anonymous < discovery < local < itinerant`. **Ne jamais** renvoyer moins que le Stripe réel (un abonné payant Itinérant garde Itinérant même avec un comp `local`). Regen `lib/types.ts`.

### Critères d'acceptation
- Un compte **sans Stripe** qui échange un code `local` → `current_tier` renvoie **`local`** (vérif SQL + live).
- Un compte **abonné Itinérant** qui échange un `local` → reste **`itinerant`** (max, jamais de downgrade).
- `comp_grant` **expiré** ou **révoqué** → `current_tier` **redescend** correctement (downgrade propre).
- **Sécurité** : impossible de se comp soi-même sans code valide (aucune écriture client directe sur `comp_grants`) ; `redeem_comp_code` idempotent ; RPC `SECURITY DEFINER SET search_path=public` ; `get_advisors` propre.

### Garde-fous
- 🔒 `current_tier` est la **RPC de gating** — toute modif est **sensible**. Tests SQL exhaustifs (Stripe seul / comp seul / les deux / expiré / révoqué). Ne jamais rendre le gating **plus permissif que prévu**.
- Pas de fausse ligne dans `subscriptions` (anti-traîne). Migration = nouveau fichier, RLS avant policies.
- ⚠️ **DEMANDER À JOHN AVANT** : durée par défaut d'un comp (sans expiration « durée de la beta » vs ex. 12 mois) — proposition : **sans expiration**, révocable à la main à la fin de la beta.

---

## Bloc 1 — UX d'échange (inscription optionnelle + compte)

Le code doit pouvoir s'échanger **à l'inscription** (champ déjà présent, mais **optionnel** puisqu'on ne gate pas) **et** dans le **compte** (pour les utilisateurs déjà inscrits).

> **Connecteurs** : lecture `app/auth/login/actions.ts` + `login-client.tsx` ; **qa-chrome**.

### Tâches
1. **Signup** (`actions.ts`) : accepter le champ code en **optionnel** (indépendamment de `INVITE_ONLY`, qui reste off) ; **après un signup réussi**, si un code est fourni, appeler `redeem_comp_code` (comp le nouveau compte). Un code invalide n'empêche **pas** l'inscription (message doux « code non reconnu, tu peux réessayer dans ton compte »). Renommer le libellé du champ → « Code fondateur (optionnel) ».
2. **Compte / réglages** : un champ « **Échanger un code fondateur** » + l'affichage de l'entitlement actif (« Local offert, actif » + expiration éventuelle).
3. Retour clair sur succès (« 🎉 Abonnement Local offert, activé ! ») réutilisant si possible `CelebrationOverlay` (Sprint 61).

### Critères d'acceptation
- S'inscrire **sans** code → OK (aucun blocage). S'inscrire **avec** un code valide → compte créé **et** Local activé.
- Un utilisateur existant peut échanger un code depuis son compte et voir Local s'activer.
- Le compte affiche l'entitlement actif + expiration.

### Garde-fous
- **Ne jamais bloquer** une inscription à cause d'un code (il est optionnel).
- Message d'erreur code doux, non bloquant.

---

## Bloc 2 — Admin : générer & révoquer des codes (/moderation)

> **Connecteurs** : lecture `/moderation` (`is_moderator`) ; **supabase-guard** (RLS).

### Tâches
1. **RPC `create_invite_code(...)` `SECURITY DEFINER`, gatée `is_moderator`** : génère N codes lisibles (évite 0/O, 1/l/I), `label`, `max_uses`, `grants_tier` (défaut `local`), `grant_months`. Renvoie les codes.
2. **Onglet « Invitations » dans `/moderation`** (gaté modérateur) : formulaire de génération + **liste des codes** (usage `uses/max_uses`, tier offert, expiration) + bouton **copier**.
3. **Révocation** : pouvoir **révoquer un `comp_grant`** (met `revoked_at`) depuis l'admin (retire l'accès offert), + éventuellement désactiver un code.

### Critères d'acceptation
- Un **modérateur** génère N codes et les voit avec leur usage ; un **non-modérateur** ne peut pas (RLS/gate).
- Révoquer un grant retire l'accès (le compte redescend au tier Stripe/discovery au prochain `current_tier`).

### Garde-fous
- ⚠️ Création/révocation **modérateur-only**. Migration = nouveau fichier si RPC ajoutée.

---

## Bloc 3 — Test end-to-end, amorçage & runbook

> **Connecteurs** : **qa-chrome** + **deploy-watch**.

### Tâches
1. **Test end-to-end** : générer un code (Bloc 2) → l'échanger à l'inscription et dans le compte → vérifier `current_tier=local`, l'accès carte complète du département, puis **révoquer** → vérifier le downgrade. Cas limites : code plein (`uses=max_uses`), expiré, déjà utilisé par ce compte.
2. **Amorçage** *(⚠️ décision John — zéro donnée inventée)* : générer la **vague fondateurs** (quantité + durée), la distribuer ; le but est de remplir le réservoir (fil, heatmap, futurs classements Phase E). Documenter le plan.
3. **Runbook** (dans le RECAP) : comment minter une vague, comment révoquer, comment suivre l'usage, comment clôturer la beta (révoquer en masse ou laisser expirer).

### Critères d'acceptation
- Le cycle complet (mint → redeem → accès Local → révoque → downgrade) est prouvé (captures + SQL).
- Runbook écrit ; plan d'amorçage documenté.

### Garde-fous
- **Zéro donnée inventée** ; pas de faux comptes/prises.

---

## Workstream VERIF (obligatoire, agent indépendant) — passe sécurité gating

1. `/verif-sprint` + **deploy-watch**.
2. **PASSE SÉCURITÉ GATING (bloquante)** : matrice de `current_tier` — Stripe seul / comp seul / les deux (max) / comp expiré / comp révoqué → **jamais plus permissif que prévu**, **jamais de downgrade** d'un abonné payant. Impossible d'écrire `comp_grants` sans passer par `redeem_comp_code`/admin. `redeem_comp_code` idempotent. `get_advisors` propre.
3. **Passe anti-régression** : signup ouvert **inchangé** (aucun blocage) ; gating carte/floutage/score intacts ; Stripe/webhook intacts.
4. Chaque critère (Blocs 0-3) coché avec preuve.
5. `docs/sprint-68/RECAP.md` : fait / **runbook** / plan d'amorçage / reste John.

## Reste manuel John (post-sprint)
- **Valider** la durée par défaut d'un comp (sans expiration vs N mois) — ⚠️ Bloc 0.
- **Générer** la vague fondateurs quand prêt (admin `/moderation`) et la distribuer.
- Merge → déploiement → QA (échanger un code → Local activé).

---

## Note — ce qu'on NE fait PAS (pour être clair)
- On **n'active pas** `INVITE_ONLY` (pas de blocage d'inscription).
- On **ne crée pas** de fausse ligne Stripe (le comp est un entitlement propre, `current_tier` = max).
- L'ancien gate `INVITE_ONLY` reste dans le code (off) — inoffensif ; on peut le retirer plus tard si tu veux, hors périmètre ici.
