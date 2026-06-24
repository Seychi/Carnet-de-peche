# Sprint 26 — Brief d'exécution
## Monétisation & rétention — le scoring perso comme argument de conversion + gamification anti-comparaison (Chantier F + G3)

> Rédigé le 2026-06-23. Durée cible : ~6-7 jours. Phase **P5 — Monétisation & rétention** (dernière phase web avant le mobile).
> Contexte : `docs/audits/AUDIT-2026-06-23.md` + `docs/ROADMAP-2026-H2.md` (Chantier F + G3). On a maintenant un moat réel (P2), conforme (P3) et amorcé (P4) : il est temps de **convertir** et de **retenir** — sans trahir le positionnement « carnet = gratuit » ni la culture anti-comparaison.
> Décisions John 2026-06-23 : roadmap P5 validée. **Quatre décisions à trancher (cf §Décisions) avant le code.**

**Préalable avant de démarrer (manuel John)** : sprints 22-25 mergés (scoring perso, prises vérifiées G1, outings G2/bredouille). Trancher D-F1→D-F4.

> ⚠️ **Corrections de cadrage (vérifiées code + prod) — à lire en premier.**
> 1. **Le scoring perso descriptif est GRATUIT** (décision D-A1, sprint 22). On **ne peut PAS** « vendre tes tendances ». L'argument de conversion F = **la notification perso proactive (Local+)** + les **couches carte premium** (score 0-100, filtres, « Ton score », fond marin) — **jamais** la donnée perso elle-même. Re-gater le perso = trahir le sprint 22 + §8 CLAUDE.md.
> 2. **Le dunning existe déjà** (6 emails Stripe via `lib/stripe/events.ts`, sprint 11). Ce qui manque = **la mesure du tunnel** (aucun analytics : `lib/analytics.ts` est un stub, PostHog jamais chargé), les **relances multi-touch**, le **win-back**, et le **push annuel**.
> 3. **Pas de vrai push** (in-app Realtime uniquement ; pas de web push ni Expo). La copy `/tarifs` promet « push » **à tort** → la notif proactive v1 = in-app (+ email optionnel), et **corriger la copy**.
> 4. **Gamification = terrain vierge** (`profiles.badges[]` jamais peuplé, 0 leaderboard). Données prêtes : Pokédex via `get_my_catches_breakdown` (008, 20 espèces), streaks via `caught_at` (+ `outings` du sprint 25). **Aucun classement public à créer.**
> 5. **Prochaine migration = 050** (disque à 049). Réconcilier l'historique (025/026/027/044) avant tout `db push`.

---

## 🚀 Ligne de lancement (à copier-coller par John)

> **ultracode — effort xhigh.** Exécute `docs/sprint-26/BRIEF.md`. **Ne démarre pas** tant que D-F1→D-F4 ne sont pas tranchées. Lance **WS-0 (instrumentation) en TOUT PREMIER** (prérequis : on n'optimise pas un tunnel qu'on ne mesure pas) ; ensuite **WS-A (tunnel/relances), WS-B (notif perso payante) et WS-C (gamification) en parallèle**. Termine **obligatoirement** par le **workstream VERIF**. **Ne push pas, ne déploie pas, n'applique aucune migration en prod.** Invariants : **ne JAMAIS gater le carnet/le perso descriptif (gratuit)**, **descriptif jamais prédictif** (7.5), **aucun leaderboard public** (anti-comparaison), **pas de dark pattern** (annulation 1 clic préservée), relances **RGPD** (consentement + opt-out), social 100 % gratuit (022), migration = fichier 050+ + regen `lib/types.ts`.

---

## 🧠 Connecteurs & sous-agents (cf `CLAUDE.md` §20)

| Quand | Sous-agent → connecteur | Pourquoi |
|---|---|---|
| Avant analytics / Stripe SDK / emails | **docs-researcher** → Context7 | PostHog (ou Plausible) + Stripe API + React Email version-correctes. Pas de code de mémoire. |
| Avant migration (notif type, gamification) | **supabase-guard** → Supabase (RO) | Confirmer n° (050), pattern `ALTER notifications_type_check` (déjà fait en 043), RLS, `outings` (sprint 25), breakdown 008. |
| QA tunnel + upsell + gamification | **qa-chrome** → Claude in Chrome | Parcours essai→payant, surfaces d'upsell, Pokédex/streaks/badges, absence de leaderboard. |
| Après déploiement (John) | **deploy-watch** → Vercel + Sentry | Webhooks Stripe + cron notif sans erreur. |
| Clôture | **`/verif-sprint`** | tests + build + types + lint + revue indépendante + anti-régression. |

---

## Objectif du sprint en une phrase

Le tunnel essai→payant est **mesuré et optimisé** (relances, win-back, push annuel), la **notification perso proactive (Local+)** devient le vrai hook payant — sans gater la donnée perso gratuite — et le pêcheur a une **gamification de rétention non-comparative** (streaks, Pokédex perso, défis conservation, **zéro classement public**).

---

## Diagnostic (établi par lecture code + prod — point de départ)

1. **Stripe mature** : Local 4,90/49, Itinérant 9,90/99, essai 7 j avec CB (`checkout.ts` `trial_period_days:7` + `payment_method_collection:'always'` + Tax FR + coupon `BETA2026`), toggle annuel −17 % (`pricing-cards.tsx`), `subscriptions` (021, RLS SELECT-own, write = webhook service_role), RPC `current_tier`. Dunning : 6 emails (welcome-trial, trial-day-5 J-3, payment-success/failed, subscription-canceled). **Manque** : relance J-1/post-essai, win-back, push annuel pour mensuels, satisfait-ou-remboursé réel (= promesse manuelle aujourd'hui).
2. **Zéro analytics** : `lib/analytics.ts` = stub (`window.posthog` jamais injecté), pas de PostHog/Plausible dans `package.json`. **Impossible de mesurer essai→payant/churn/MRR.** → WS-0 bloquant.
3. **Gating** = RPC `SECURITY DEFINER` + `getUserTier` (`lib/auth/tier.ts`), pattern 403 (`/api/seabed`). Upsells existants : `components/map/{UpsellBanner,MapFilters,ScorePanel,MapLayerSelector,NearbyPanel}.tsx`. **Gratuit** : carnet, social, guides, fiches espèces, **tendances perso descriptives** (D-A1). **Payant** : score 0-100, filtres, coords précises, « Ton score » carte (Local+), fond marin (Itinérant).
4. **Notifs** : table `notifications` (037), `createNotification` (service_role, INSERT client = `WITH CHECK(false)`), Realtime, CHECK `type` **déjà étendu en 043** (pattern à réutiliser). **Pas de push** → in-app uniquement.
5. **Gamification greenfield** : `profiles.badges[] default '{}'` jamais peuplé ; aucun badge/streak/Pokédex/défi ; **aucun leaderboard** (seul `049_top_spots_for_species` classe des spots, pas des users). Pokédex faisable via `get_my_catches_breakdown` (008, `bySpecies`), 20 espèces `inCarnet` (`lib/seo/programmatic.ts`). Streaks via `caught_at` (+ `outings` sprint 25 pour le « % sorties fructueuses » honnête). Profil public `/u/[username]` montre count + tailles vignettes mais **pas de ranking** — à ne pas transformer en classement.
6. **RGPD** : les 6 emails actuels sont **transactionnels** (légitimes). Les relances win-back/post-churn = **marketing** → base légale + opt-out requis ; `lib/email/recipient.ts` ne gère aucun consentement.

---

## Décisions à trancher AVANT le code (⚠️ DEMANDER À JOHN)

- **D-F1 — Outil d'analytics.** PostHog (funnel produit riche) **vs** Plausible (privacy-first, FR) + events serveur. *Reco : PostHog si on veut le funnel détaillé, en mode EU/anonymisé ; sinon Plausible + events serveur depuis le webhook Stripe.* RGPD : bannière consentement si cookies.
- **D-F2 — Canal de la notif perso proactive.** v1 **in-app** seul, ou **+ email** (Resend prêt), ou construire **web push** ? *Reco : in-app + email opt-in en v1, web push plus tard. Et corriger la copy `/tarifs` qui promet « push ».*
- **D-F3 — Satisfait-ou-remboursé.** Garder **manuel** (documenter un SLA clair) ou semi-automatiser ? *Reco : manuel + SLA documenté ; ne pas promettre plus que tenable (leçon 7.5).*
- **D-F4 — Gamification (G3).** Périmètre des défis conservation (partenariat asso ? lien RecFishing du sprint 24 ?) ; badges « prise vérifiée » dépendent de G1 (sprint 24) ; streaks « % bredouille » dépendent des `outings` (sprint 25) → **confirmer le mode dégradé** (`caught_at`/espèces seuls) si ces briques glissent ; streaks/Pokédex **privés par défaut** (partage public opt-in) — OK ?

---

## Workstreams & dépendances

| WS | Bloc | Durée | Dépend de | Parallèle J1 |
|----|------|-------|-----------|--------------|
| **0** | Instrumentation du tunnel (analytics + events) | 1 j | D-F1 | ✅ (en 1er, prérequis) |
| **A** | Tunnel : relances + win-back + push annuel + remboursé | 1,5-2 j | WS-0 (mesure) | ✅ après WS-0 |
| **B** | Notif perso proactive (le hook payant Local+) | 2 j | D-F2 | ✅ |
| **C** | Gamification anti-comparaison (G3) | 2-2,5 j | D-F4 (+ sprints 24/25) | ✅ |
| **VERIF** | Revue finale indépendante | 0,5 j | tous | ❌ (dernier) |

---

## Bloc 0 — Instrumentation du tunnel (prérequis F)

On ne peut pas optimiser ce qu'on ne mesure pas. À faire en premier.

> **Connecteurs** : **docs-researcher** (SDK analytics, mode EU/anonymisé) ; **supabase-guard** si table d'events.

### Tâches
1. Installer l'outil (D-F1), **remplacer le stub `lib/analytics.ts`**. Bannière consentement si cookies (RGPD).
2. **Events serveur** (fiables, depuis `lib/stripe/events.ts`) : `trial_started`, `trial_converted` (invoice payée > 0), `subscription_churned`, `payment_failed`. **Events client** : `paywall_viewed{surface}`, `upsell_clicked{surface}`, `checkout_started`.
3. Brancher `upsell_clicked` sur tous les composants d'upsell existants (§Diagnostic.3).

### Critères d'acceptation
- Un parcours test signup→checkout→paiement (mode test) produit les 4 events serveur **ordonnés** + les events client. `grep "window.posthog" lib/analytics.ts` = 0 (stub retiré).
- Aucune donnée perso/PII envoyée sans base légale ; consentement respecté.

### Garde-fous
- ⚠️ RGPD : anonymisation/consentement. Pas de PII dans les events.

---

## Bloc A — Tunnel : relances + win-back + push annuel + remboursé

Enrichir le tunnel existant (ne pas refaire le dunning, il existe).

> **Connecteurs** : **docs-researcher** (Stripe events, React Email) ; **supabase-guard** (flag préférence email).

### Tâches
1. **Relances multi-touch** (cron + events) : ajouter J-1 d'essai et **post-essai J+2 « ton essai a expiré, reviens »** (le webhook natif ne couvre que J-3). Idempotence (pas d'envoi double).
2. **Win-back** : écran sur `/compte/abonnement` pour `status=canceled` (« voilà ce que tu rates » + re-checkout) ; **bandeau annuel −17 %** pour les mensuels actifs.
3. **Préférences email + opt-out** (RGPD) : flag `profiles.email_optin`/table préférences + lien de désinscription dans les emails marketing (win-back). Les transactionnels restent.
4. **Satisfait-ou-remboursé** (D-F3) : manuel + SLA documenté, ou semi-auto. Aligner la copy `/tarifs`.

### Critères d'acceptation
- Un compte test dont l'essai expire sans CB valide reçoit l'email post-essai (une seule fois) ; `trial_converted`/`churned` trackés (WS-0).
- Un `canceled` voit le win-back ; un mensuel actif voit l'offre annuelle ; **annulation reste 1 clic** (Portal) — pas de friction ajoutée.
- Tout email marketing a un lien de désinscription fonctionnel.

### Garde-fous
- ⚠️ **Pas de dark pattern** : win-back = incitation, jamais friction d'annulation. Ne pas survendre le remboursé.
- ⚠️ RGPD : relance marketing = consentement/opt-out ; transactionnel = inchangé.

---

## Bloc B — Notif perso proactive (le vrai hook payant, Local+)

Vendre la **proactivité**, pas la donnée perso (qui reste gratuite).

> **Connecteurs** : **supabase-guard** (pattern `ALTER notifications_type_check` de 043, cron existant `compute-spot-scores`) ; **docs-researcher** si email/web push.

### Tâches
1. Migration `050` : `ALTER` du CHECK `notifications.type` (+`optimal_window`) — réutiliser le pattern 043. `target_type` accepte déjà `spot`.
2. **Cron Vercel** (nouveau, calqué sur `compute-spot-scores`) : croise les meilleurs créneaux du jour (`spot_scores`/solunar) × les **tendances perso** (`lib/scoring/personal/`, sprint 22, segmentable) × les spots/dépt du user → insère une notif via `createNotification` (service_role). **Filtré `current_tier IN ('local','itinerant')`**.
3. **Soft-upsell** dans `components/scoring/PersonalTendencies.tsx` (état plein, gratuit) : « reçois une alerte quand TES conditions reviennent → Local » (vend la notif, pas la tendance).
4. Canal selon **D-F2** (in-app + email opt-in v1). **Corriger la copy `/tarifs`** (« push » → « alertes »).

### Critères d'acceptation
- Un compte **Local** avec assez de prises reçoit une notif `optimal_window` quand ses conditions favorites reviennent ; un **discovery** n'en reçoit jamais mais voit le CTA upsell.
- Copy 100 % descriptive : `grep -niE "tu prendras|pêches mieux|prédit" ` = 0 sur la notif.
- La donnée perso descriptive **reste accessible gratuitement** (le gate ne porte que sur la notif proactive).

### Garde-fous
- ⚠️ **Ne pas gater le perso gratuit.** Le gate = la notif/proactivité uniquement.
- ⚠️ Ne pas survendre « push » tant que le web push n'existe pas (in-app/email).
- Honnêteté 7.5 : descriptif, jamais prédictif.

---

## Bloc C — Gamification anti-comparaison (G3)

Rétention par la collection et la régularité personnelles — **jamais** par la comparaison.

> **Connecteurs** : **supabase-guard** (breakdown 008, `outings` sprint 25, RLS) ; **qa-chrome** (absence de leaderboard).

### Tâches
1. **Pokédex perso d'espèces** : composant collection 20 espèces (capturées vs grisées) depuis `get_my_catches_breakdown` (008). Privé par défaut, partage public **opt-in**.
2. **Streaks / régularité** : streak sur `caught_at` (jours/semaines actives) ; si `outings` (sprint 25) présent, ajouter « % de sorties fructueuses » (honnête, grâce au dénominateur bredouille).
3. **Défis conservation / science citoyenne + badges** (D-F4) : table `challenges` + `user_challenge_progress` (RLS fail-closed) **ou** peupler `profiles.badges[]`. Défis **non-compétitifs** (« relâche 5 bars sous-taille », « logue 3 espèces différentes », lien RecFishing du sprint 24). Badges « prise vérifiée » si G1 (sprint 24) dispo, sinon dégradé.
4. Afficher streaks/Pokédex/badges sur le profil **sans aucun classement inter-utilisateurs**.

### Critères d'acceptation
- Un user voit X/20 espèces (Pokédex) + son streak + ses badges, **en privé par défaut** ; un user sans prise voit 0/20 + CTA loguer.
- **Aucun classement public de tailles/counts** (grep + revue qa-chrome) ; le profil public n'expose pas de ranking.
- RLS testée : un user ne lit pas la progression de défis d'un autre.

### Garde-fous
- ⚠️ **Anti-comparaison** : pas de leaderboard, pas de « plus grosse prise » public, pas de top pêcheurs. Streaks/Pokédex privés par défaut.
- ⚠️ Mode dégradé si sprints 24/25 pas prêts (streaks sur `caught_at`/espèces seuls ; badges sans « vérifié »).
- Honnêteté : un streak « prises » se casse sur un trou ; ne pas masquer la réalité.

---

## Workstream VERIF (obligatoire, agent indépendant)

1. `/verif-sprint` : `pnpm test` + `typecheck` + `lint` + `build`, puis revue croisée du `git diff main...HEAD` contre les AC.
2. **Passe anti-régression** : (a) **carnet/perso descriptif restent GRATUITS** (le gate ne porte que sur notif/couches premium) ; (b) **aucun leaderboard public** ni ranking ; (c) **copy non-prédictive** (notif/gamification) ; (d) **pas de dark pattern** (annulation 1 clic) ; (e) **RGPD** (relances marketing = opt-out, consentement analytics) ; (f) floutage GPS + RLS intacts ; (g) social 100 % gratuit (022) ; (h) aucune feature gratuite (carnet/social/guides) basculée payante.
3. Vérifier qu'aucune migration n'a été appliquée en prod par les agents.
4. Livrer `docs/sprint-26/RECAP.md` : fait / comment tester / reste manuel John.

---

## Reste manuel John (post-sprint)

1. Créer le projet analytics (D-F1) + vars Vercel. Appliquer la migration 050 (notif type + gamification) en prod + regen `lib/types.ts` + `get_advisors`. Configurer le nouveau cron Vercel.
2. Vérifier les **smart retries** dunning dans le dashboard Stripe (config non versionnée).
3. Relire → merge `main` + déploiement. deploy-watch (webhooks + cron) + qa-chrome (tunnel, upsell notif, gamification, 0 leaderboard).
4. (Doc) Corriger CLAUDE.md §2 (migrations → 050 après ce sprint) et la copy `/tarifs` (« push » → « alertes »).

---

## Décisions récapitulées
- **D-F1** outil analytics (PostHog vs Plausible+events) · **D-F2** canal notif proactive (in-app/email/web push) + fix copy « push » · **D-F3** satisfait-ou-remboursé (manuel + SLA vs semi-auto) · **D-F4** gamification (défis conservation, mode dégradé si 24/25 pas prêts, privé par défaut).

## Garde-fous roadmap (rappel, `docs/ROADMAP-2026-H2.md` §5)
- ❌ Pas de **marketplace** comme pilier (affiliation discrète max). ❌ Pas de **leaderboard public**. ❌ Ne pas **sur-promettre le scoring** (« révèle », pas « prédit »). ❌ Ne pas gater ce qui est **gratuit** (carnet, social, guides, tendances perso).

*Brief produit le 2026-06-23 (mode ultracode/xhigh, suit `docs/BRIEF-TEMPLATE.md`). Cartographie source : exploration code monétisation/gamification 2026-06-23. Clôt la P5 ; ensuite → Mobile (Expo, sprint 27+).*
