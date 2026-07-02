# Sprint 26 — RECAP (Monétisation & rétention — Chantier F + G3)

> État : **CODE-COMPLET sur la branche `sprint-26`** (commit local, **NON pushé, NON déployé, AUCUNE migration appliquée en prod**).
> Vérif : `tsc --noEmit` clean · **494/494 tests Vitest verts** (48 fichiers) · `next build` EXIT 0 (lint bloquant + types) · revue adversariale indépendante = **GO** (0 finding 🔴/🟠).
> Décisions John : **D-F1** PostHog EU · **D-F2** notif **in-app seul** · **D-F3** remboursé **manuel + SLA documenté** · **D-F4** gamification **défis + lien RecFishing**, privé par défaut, zéro leaderboard.

---

## ⚠️ Corrections de cadrage (le brief était périmé — vérifié contre le vrai code 2026-06-24)

1. **Prochaine migration = 054+**, pas 050 (050-053 déjà sur disque : recfishing/outings/invite/cofishing, sprints 24-25 mergés depuis la rédaction du brief). → 054/055/056 créées.
2. **Crons sous `app/api/crons/` (pluriel)**, pas `app/api/cron/`. Modèle = `recfishing-reminders`.
3. **Templates email dans `emails/` (racine)**, pas `lib/email/`.
4. **Pattern CHECK type notif = migration 053** (10 types), pas 043.
5. **Aucune copy « push » user-facing à corriger** (le mot n'existe pas dans l'UI ; il vivait en CLAUDE.md §8 + maquettes). On a juste ajouté la ligne « alerte » côté Local sans réintroduire « push ».
6. **`createNotification` no-op si actorId absent/== userId** → la notif système `optimal_window` est insérée en **INSERT direct service_role** (modèle RecFishing), pas via `createNotification`.
7. **Aucune idempotence dunning** (event-driven Stripe) → relances cron = **marqueurs DB** (`subscriptions.trial_reminder_j1_at` / `post_trial_winback_at`).
8. **Aucun opt-out email** existant → créé (`profiles.marketing_email_optin` + `email_unsub_token` + route `/unsubscribe`).
9. **La politique de confidentialité NIAIT tout analytics** → amendée avant de brancher PostHog.

---

## WS-0 — Instrumentation PostHog EU (mesure du tunnel)

- **SDK** : `posthog-js ^1.393` + `posthog-node ^5.38` (versions confirmées via Context7). Mode **EU** (`eu.i.posthog.com`), `person_profiles:'identified_only'`, **opt-out par défaut** jusqu'au consentement.
- **Stub retiré** : `lib/analytics.ts` réécrit sur posthog-js (API existante conservée + `paywallViewed`/`upsellClicked`/`checkoutStarted`/`identify`/`reset`/`capturePageview`). `grep window.posthog` = **0** (AC). No-op SSR conservé, **zéro PII**.
- **Provider + consentement** : `components/analytics/PostHogProvider.tsx` (+ `PostHogPageView` sous Suspense, pageview manuel App Router), `components/consent/CookieBanner.tsx` (RGPD, daltonien-safe), `lib/consent.ts` (cookie 1ère partie `cdp-analytics-consent`). Montés dans `app/layout.tsx`.
- **Events client** : `paywall_viewed` + `upsell_clicked{surface}` sur les 5 composants d'upsell carte (7 surfaces), `checkout_started{plan,interval}` sur le submit Checkout de `pricing-cards.tsx`. **Gating inchangé** (purement additif).
- **Events serveur** (dans `lib/stripe/events.ts`, import dynamique `lib/analytics-server.ts`, try/catch non bloquant + flush, `distinctId=user_id`) : `trial_started`, `trial_converted` (facture > 0 € seulement), `payment_failed`, `subscription_churned`.
- **RGPD** : `legal/confidentialite` amendée (PostHog actif sous consentement, ligne sous-traitant UE, cookies `cdp-analytics-consent`/`ph_*`, base légale consentement).
- **Env** : `NEXT_PUBLIC_POSTHOG_KEY` (requis prod) + `NEXT_PUBLIC_POSTHOG_HOST` (default EU).

## WS-A — Tunnel : relances + win-back + opt-out RGPD + SLA remboursé

- **Migration 054** : `profiles.marketing_email_optin` (bool, défaut true = soft opt-in) + `email_unsub_token` ; `subscriptions.trial_reminder_j1_at` + `post_trial_winback_at` (anti-double-envoi). Additive, non destructive.
- **Relances** (cron `app/api/crons/dunning-relances`, **09:00**) : **J-1 transactionnel** (`emails/trial-ending-j1.tsx`, pas d'opt-out) + **J+2 win-back marketing** (`emails/post-trial-winback.tsx`, respecte l'opt-out + lien `/unsubscribe?token=`). Idempotent via marqueurs.
- **Opt-out RGPD** : `lib/email/recipient.ts` → `getEmailRecipient(userId, {marketing?})` (renvoie `null` si marketing && opt-out). Route publique `/unsubscribe` (désinscription 1 clic par token, sans login) + toggle préférences sur `/compte/abonnement`.
- **Win-back & annuel** (`/compte/abonnement`) : écran « Voilà ce que tu rates » + CTA re-checkout pour `canceled` ; bandeau « passe à l'annuel −17 % » pour mensuels actifs. **Annulation 1 clic via Portal préservée** (pas de friction).
- **Satisfait-ou-remboursé** : incohérence levée (marketing disait 7 j, CGU 30 j) → **aligné sur 30 j** (CGU art. 5.4, la protection la plus forte). SLA process documenté : `docs/sprint-26/REMBOURSEMENT-SLA.md`. ⚠️ **à confirmer par John** (cf ci-dessous).

## WS-B — Notification perso proactive (le hook payant Local+)

- **Migration 055** : `ALTER notifications_type_check` (repart des 10 types de 053 + `optimal_window`, aucun type perdu). `target_type='spot'` déjà autorisé.
- **Cron `app/api/crons/personal-window` (07:00)** : pour chaque user **Local/Itinérant** avec assez de prises → croise ses **tendances perso** (`computePersonalTendencies`) × le **créneau du jour de son département** (`getDeptNextWindow`) ; si match (bucket horaire + score ≥ 60) → **INSERT notif `optimal_window`** (service_role direct). Idempotent (1 notif/jour max). Copy **descriptive** (« tes prises tombent souvent le matin… créneau favorable vers 7h-9h »), jamais prédictive.
- **Soft-upsell** : `components/scoring/PersonalTendenciesUpsell.tsx` rendu APRÈS la liste, **seulement si non-abonné** — vend l'**alerte**, jamais la tendance (qui **reste gratuite**). Tier passé depuis profil/carnet.
- **Copy** : `pricing-cards.tsx` Local → « Alerte quand tes conditions favorites reviennent » (pas de « push »). Page `/notifications` gère le type `optimal_window`.

## WS-C — Gamification anti-comparaison (G3)

- **Migration 056** : `user_badges` (RLS fail-closed, SELECT own, **aucune écriture client**) + RPC `recompute_my_badges()` (SECURITY DEFINER, idempotent, 6 badges SQL-dérivables) + `get_my_streak()`.
- **Pokédex** (`lib/gamification/pokedex.ts`) : 20 espèces capturées/grisées, **pur TS** (aucune table), daltonien-safe (luminosité + icône ✓/— + texte).
- **Streaks** : jours/semaines actives depuis `caught_at` (+ « % sorties fructueuses » via `get_my_outing_stats` quand dispo, état vide honnête).
- **Défis conservation** (non-compétitifs, via `lib/regulation`) : relâche des sous-tailles (`checkSize`), respect des fermetures (`isClosedSeason`), **déclaration RecFishing** (`isDeclarable` + lien — jamais à la place du pêcheur). Aucun verdict si façade inconnue.
- **Badges** : mode dégradé honnête (« sur la base de ce que tu déclares — pas de vérification automatique » car **G1 n'existe pas**).
- **Placement** : `<GamificationHub>` monté **uniquement dans `(app)/carnet`** (privé, gratuit). Profil public `u/[username]` **intouché** → zéro leaderboard.

---

## Comment tester

1. **Analytics** : sans `NEXT_PUBLIC_POSTHOG_KEY` → no-op total (aucun bandeau, aucune erreur). Avec la clé → bannière au 1er chargement ; « Accepter » = `$pageview` à chaque navigation + events sur `/carte` (paywall/upsell) et `/tarifs` (checkout). Parcours Stripe test signup→paiement → 4 events serveur ordonnés sur le même `distinctId`.
2. **Dunning** : `GET /api/crons/dunning-relances` avec header `Authorization: Bearer $CRON_SECRET`. Templates : `pnpm tsx scripts/send-test-email.ts trial-ending-j1 <email>` / `post-trial-winback <email>`. Désinscription : ouvrir le lien `/unsubscribe?token=...` du mail marketing.
3. **Notif perso** : `GET /api/crons/personal-window` (Bearer) sur un compte **Local** ayant ≥3 prises matinales + créneau du jour favorable → `{notified:1}` + notif « Créneau favorable » dans la cloche. 2e appel le même jour → `{notified:0}`. Un compte discovery → jamais notifié, mais voit le CTA upsell.
4. **Gamification** : `/carnet` connecté → Pokédex X/20, régularité, badges, 3 défis conservation. Compte sans prise → 0/20 + CTA.

---

## Reste manuel (John) — AVANT merge/déploiement

1. **Décision SLA remboursé** ⚠️ : on a aligné le marketing sur **30 jours** (CGU art. 5.4). Confirme que tu veux tenir 30 j (sinon on aligne CGU + marketing sur 7 j — mais réduire une garantie contractuelle existante est plus risqué). Process : `docs/sprint-26/REMBOURSEMENT-SLA.md`.
2. **Décision opt-in email** : `marketing_email_optin` défaut **true** (soft opt-in / intérêt légitime + désinscription facile). Si tu veux un opt-in strict (défaut false), dis-le → on inverse.
3. **Appliquer les migrations 054 → 055 → 056** en prod (dans l'ordre), puis :
   - `migration repair` (dérive d'historique connue : 025/026/027/044 + maintenant 054-056).
   - **Régénérer `lib/types.ts`** (`supabase gen types`) — mes ajouts manuels se réconcilieront.
   - `get_advisors` (vérifier RLS/security sur `user_badges`).
4. **Vars Vercel** : créer le projet PostHog (région EU) + poser `NEXT_PUBLIC_POSTHOG_KEY` (+ `NEXT_PUBLIC_POSTHOG_HOST` si ≠ défaut) en **Production + Preview + Development**. ⚠️ Sans la clé, le **build prod échoue** (var requise en prod par design) — pose-la avant de déployer, ou rends-la optionnelle.
5. **Crons Vercel** : 4 crons désormais dans `vercel.json` (05:00 scores, 07:00 personal-window, 09:00 dunning, 17:00 recfishing). Plan Hobby = 1 run/jour/cron — OK.
6. **Smart retries** dunning : vérifier la config dans le dashboard Stripe (non versionnée).
7. **Doc** : corriger CLAUDE.md §2 (migrations → 056 après ce sprint) et §8 (« Notifications push » → « alertes »).
8. Relire → merge `sprint-26` → `main` → déploiement → **deploy-watch** (webhooks Stripe + 2 nouveaux crons) + **qa-chrome** (tunnel/upsell, notif, gamification, 0 leaderboard, bannière consentement).

---

*Sprint produit en mode ultracode/xhigh (scout 5 zones → impl R1 parallèle WS-0/A/C + R2 WS-B → verif). 4 décisions tranchées, 4 corrections de cadrage. ~60 fichiers, 3 migrations (non appliquées), 494 tests verts. Clôt la P5 ; ensuite → Mobile (Expo, sprint 27+).*
