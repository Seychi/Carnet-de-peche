# Sprint 68 — RECAP
## Codes « fondateurs » = abonnement offert (comp), sans bloquer personne

> Exécuté le 2026-07-02 (Fable, ultracode xhigh). Brief : `docs/sprint-68/BRIEF.md`.
> **Migrations : 104 (`104_comp_grants.sql`) + 104b (`104b_invite_codes_hardening.sql`, fixes revue) — APPLIQUÉES ET VÉRIFIÉES EN PROD.**
> `INVITE_ONLY` reste **OFF**. Aucune fausse ligne Stripe. **Décision John 2026-07-02 : durée par défaut d'un comp = 6 mois** (paramétrable au mint, vide = sans expiration).

---

## Ce qui est livré

### Bloc 0 — DB (migration 104, appliquée prod)

- **`comp_grants`** : l'entitlement offert. `user_id` (FK auth.users cascade), `tier` (check local/itinerant), `source_code` (FK invite_codes, SET NULL), `granted_at`, `expires_at` (null = sans expiration), `revoked_at`, `revoked_by`. `unique(user_id, source_code)` = idempotence. RLS : select **own** + select **modérateur**, **zéro policy d'écriture** (tout passe par les RPC definer).
- **`invite_codes` étendue** : `grants_tier` (défaut local), `grant_months` (null = sans expiration), `disabled_at`. Nouvelle policy select modérateur (liste + copie dans l'admin). Table vide en prod au moment de la migration : aucun legacy.
- **`redeem_comp_code(p_code)`** : SECURITY DEFINER, **authenticated only** (REVOKE anon/public). Lock `FOR UPDATE` sur le code (concurrence sérialisée), lookup insensible à la casse (`upper(trim())`, codes générés en majuscules), erreurs jsonb : `invalid` / `expired` / `already_redeemed` / `exhausted` / `auth_required`. Crée le grant + incrémente `uses` atomiquement.
- **`create_invite_codes(count, label, max_uses, tier, months=6)`** : gate `is_moderator` en SQL. Codes lisibles `FDR-XXXX-XXXX` (alphabet sans 0/O/1/l/I, pgcrypto `extensions.gen_random_bytes`).
- **`revoke_comp_grant(id)`** / **`disable_invite_code(code)`** : gate `is_moderator`, idempotents.
- **`current_tier(uid)` v2 = max(tier Stripe, tier comp actif)** : la logique Stripe de la 021 est reprise **verbatim** (vérifiée live par `pg_get_functiondef` avant modif) ; on n'ajoute que la branche comp (`revoked_at is null and (expires_at is null or expires_at > now())`) et le max par ranking anonymous(0) < discovery(1) < local(2) < itinerant(3). **Un comp ne downgrade jamais un abonné payant.** `lib/auth/tier.ts` inchangé (aucun code TS de gating touché).
- `lib/types.ts` régénéré (+63 lignes, purement additif).

**Preuve : matrice SQL 30/30 PASS en prod** (transaction `begin…rollback`, prod intacte) : Stripe seul / comp seul / les deux (max) / 2 comps (max) / expiré → downgrade / révoqué → downgrade / re-revoke idempotent / already_redeemed / exhausted / expired / désactivé / casse mixte / `expires_at ≈ +6 mois` / mint modérateur (format regex OK) / non-modérateur bloqué (`moderator_only`) / insert & update directs bloqués (42501 + RLS 0 ligne) / anon EXECUTE refusé (42501) / invite_codes invisibles au non-modérateur / comp_grants own-only.

**Advisors** : delta vs baseline = +4 WARN `authenticated_security_definer_function_executable` (les 4 nouvelles RPC, pattern assumé du projet, 44→48). Aucun nouvel ERROR. L'INFO `rls_enabled_no_policy` vise `season_results` (verrou voulu S67).

### Bloc 1 — UX d'échange

- **Signup** (`app/auth/login/actions.ts`) : le champ code est lu **systématiquement** et **optionnel** (avant : ignoré si `INVITE_ONLY` off). Après un signUp réussi **avec session** : `redeem_comp_code` appelé **en tant que nouvel utilisateur** (le client serveur porte la session posée par signUp), **avant** le `redirect` (qui throw). Fail-open total : code invalide → l'inscription réussit, redirect `/onboarding/1?comp=invalid` (message doux). Succès → `?comp=granted`. Gate historique `INVITE_ONLY=true` **intact** (exiger code non vide + consommation service_role si pas de session).
- **Onboarding** (`app/(app)/onboarding/[step]/page.tsx`) : bannière `role=status` selon `?comp=` (« 🎉 Abonnement Local offert, activé ! » / « code non reconnu, réessaie depuis Mon abonnement »). `OnboardingStep` non touché.
- **Champ signup** (`login-client.tsx`) : « Code fondateur (optionnel) », placeholder `FDR-XXXX-XXXX`, aide « Il active l'abonnement Local offert sur ton compte. »
- **Compte** (`/compte/abonnement`) : nouvelle section « Code fondateur ». Grant actif → carte « Abonnement Local/Itinérant offert · actif (jusqu'au …| sans date de fin) ». Sinon → formulaire d'échange (`redeem-code-form.tsx`) : au succès, **CelebrationOverlay** (S61) puis `router.refresh()` à la fermeture (pas de `revalidatePath` dans l'action, sinon le form serait démonté avant l'overlay). Erreurs en français doux (`REDEEM_ERRORS`).

### Bloc 2 — Admin `/moderation`, onglet « Invitations »

- **Mint** : formulaire (nombre défaut 10, usages/code défaut 1, tier défaut Local, durée défaut 6 mois, vide = sans expiration, étiquette interne) → RPC `create_invite_codes` → codes affichés en clair avec **Copier** unitaire + **Tout copier**.
- **Liste des codes** : statut TEXTUEL (Actif / Épuisé / Expiré / Désactivé), `uses/max_uses`, tier + durée, étiquette, date, bouton **Désactiver** (ModActionForm + toast).
- **Liste des accès offerts** : @pseudo, statut, tier + expiration, code source, date, bouton **Révoquer** (le compte redescend à son tier Stripe réel au prochain `current_tier`).
- Gate : page `is_moderator` (existant) + check TS dans les actions + **re-check `is_moderator` en SQL dans chaque RPC** (défense en profondeur).
- ⚠️ Piège évité : `p_grant_months: undefined` déclencherait le DEFAULT SQL (6 mois) ; « durée vide » passe donc `null` explicitement (cast documenté dans `app/actions/invites.ts`, testé).

### Bloc 3 — Preuves & vérification

- **Cycle complet prouvé en SQL prod (rollback)** : mint → redeem → `current_tier=local` → révoque → downgrade `discovery` ; + tous les cas limites (plein, expiré, déjà utilisé, désactivé, inconnu).
- **Tests Vitest : 695 verts (68 fichiers)** dont **25 nouveaux** : `app/actions/__tests__/invites.test.ts` (13 : gates, params RPC, months null), `app/(app)/compte/abonnement/__tests__/actions.test.ts` (5 : mapping erreurs, RPC), `app/auth/login/__tests__/actions.test.ts` (7 : **premiers tests du signup** — sans code, code valide → `?comp=granted&tier=…`, code invalide → inscription réussie quand même, pas de session → pas de RPC, gate INVITE_ONLY intact, email invalide).
- `tsc --noEmit` propre, build OK, lint OK, lint copy : aucun « — » ajouté en prose visible.
- QA visuelle live (captures) : **à faire par John post-déploiement** (le code n'est pas poussé ; `next dev` local reste cassé par la route opengraph-image S55, gotcha connu).

### VERIF — revue croisée indépendante (3 lentilles) : 3× GO

Trois relecteurs indépendants (sécurité gating / correctness Next 15-React 19 / anti-régression + a11y-daltonisme). **Tous les findings actionnables ont été fixés dans le sprint** :

- 🟠 **MEDIUM (trouvé par les 3)** : la requête `comp_grants` de `/compte/abonnement` s'appuyait sur RLS sans `.eq('user_id')` ; or la policy **modérateur** élargit le SELECT → John (modérateur) aurait vu le grant d'un fondateur affiché comme le sien. **Fixé** (filtre explicite + commentaire).
- 🟡 Bannière onboarding « Local » en dur alors qu'un code peut octroyer Itinérant → **fixé** (le tier réel transite par `?comp=granted&tier=…`, validé côté page).
- 🟡 Label « (optionnel) » inconditionnel → **fixé** (suit `inviteOnly`).
- 🟡 Tap targets 32px sur Copier/Désactiver/Révoquer (convention ≥44px, S7.5/28) → **fixés** (44px).
- 🟡 Input d'échange sans label visible (standard S56) → **fixé** (« Ton code »).
- 🟡 `consume_invite_code` (chemin legacy INVITE_ONLY, dormant) ignorait `disabled_at` → **fixé en 104b** (+ borne SQL 80 car sur `p_label`). Smoke 3/3 en prod (rollback).

**Résiduels assumés (documentés, pas de fix)** :
- Le gate INVITE_ONLY reste fail-open post-signup (pré-existant S54, réserve « atomicité invite Voie 2 » connue, flag OFF).
- INVITE_ONLY=true + confirmation email active : le code serait consommé sans créer de grant (sous-octroi jamais sur-octroi ; doublement dormant, autoconfirm ON).
- Un grant Local actif masque le formulaire d'échange → pas d'upgrade Itinérant par code sans révoquer d'abord (cas marginal, contournable dans l'admin).
- Pas de rate-limit applicatif sur `redeem_comp_code` : espace `31^8 ≈ 8,5×10¹¹`, brute-force impraticable.

---

## 📗 RUNBOOK — opérer les codes fondateurs

### Minter une vague
1. `/moderation?tab=invites` (compte modérateur).
2. « Générer une vague de codes » : nombre (ex. 30), usages/code = 1 (1 code = 1 pêcheur ; un code multi-usages = pour un groupe/partenaire), tier Local, durée 6 mois (vide = sans expiration), étiquette ex. « vague-fondateurs-2026-07 ».
3. Copier les codes (« Tout copier ») **immédiatement** et les coller dans le doc de distribution. Ils restent visibles dans la liste.

### Distribuer
- 1 code par personne (DM César, mail, print). Le destinataire l'échange **à l'inscription** (champ « Code fondateur (optionnel) ») ou **dans son compte** (`/compte/abonnement` → « Code fondateur »). Instantané, sans carte.

### Suivre l'usage
- `/moderation?tab=invites` : chaque code affiche `uses/max_uses` ; la section « Accès offerts » liste qui a échangé quoi et jusqu'à quand.
- SQL (option) : `select count(*) from comp_grants where revoked_at is null and (expires_at is null or expires_at > now());`

### Révoquer / désactiver
- **Désactiver un code** (plus échangeable, grants déjà émis intacts) : bouton « Désactiver » sur le code.
- **Révoquer un accès** (le compte redescend à son tier Stripe/discovery immédiatement) : bouton « Révoquer » sur la ligne de l'accès.

### Clôturer la beta
- Comps à 6 mois : laisser expirer (downgrade automatique, prouvé T12).
- Comps sans expiration : révoquer en masse en SQL service-role :
  `update comp_grants set revoked_at = now() where revoked_at is null and expires_at is null;`
  (ou un par un dans l'admin). Prévenir les fondateurs avant (email win-back existant → offre de conversion).

---

## 📣 Plan d'amorçage proposé (décision John, zéro donnée inventée)

1. **Vague 1 « noyau »** (~10-15 codes, 6 mois, étiquette `vague-noyau`) : pêcheurs que John/César connaissent personnellement. Objectif : premières prises publiques réelles + retours produit.
2. **Vague 2 « communauté »** (~30-50 codes, 6 mois) : distribution via les canaux César (groupes locaux, réseaux) une fois la vague 1 active.
3. Mesurer entre les vagues (PostHog + `/moderation`) : codes échangés, prises loguées par les fondateurs, posts fil. Le but est le réservoir (fil, heatmap, classements Phase E), pas le volume de codes.
4. Un code multi-usages (ex. `max_uses=20`) seulement pour un partenaire identifié (club, asso), étiqueté à son nom.

---

## Reste manuel John (post-sprint)

1. **Relire + merger + pousser** (auto-deploy Vercel). La migration 104 est déjà en prod : l'ordre est sain (DB d'abord, code ensuite), rien à appliquer.
2. **QA live** (5 min) : générer 1 code test dans `/moderation?tab=invites` → l'échanger sur un compte test dans `/compte/abonnement` → vérifier la célébration + « Local offert, actif » + carte complète du département → révoquer depuis l'admin → vérifier le retour Découverte.
3. **Générer la vague fondateurs** réelle et la distribuer (cf plan ci-dessus, quantité/durée à trancher).
4. (Option) Nettoyer les codes de test après QA (« Désactiver »).

## Décisions prises pendant le sprint

- **FK `source_code` → invite_codes(code) ON DELETE SET NULL** (au-delà du brief) : un code supprimé ne casse pas l'historique des grants.
- **Codes insensibles à la casse à la saisie** (`upper(trim())`) : sans risque, la table était vide, et les codes générés sont en majuscules.
- **`disable_invite_code`** ajouté (le brief disait « éventuellement ») : nécessaire au runbook de clôture.
- **Pas de `revalidatePath` dans `redeemFounderCode`** : la célébration doit s'afficher avant le re-render serveur (refresh à la fermeture de l'overlay).
