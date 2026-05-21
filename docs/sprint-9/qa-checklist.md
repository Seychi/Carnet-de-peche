# QA checklist — sprint 9 (paiements Stripe)

Référence : brief sprint 9, bloc I2. À cocher en **mode test** Stripe (cf
[stripe-cli-playbook.md](./stripe-cli-playbook.md)). `[x]` = vérifié.

## Checkout flow
- [ ] Discovery FR → `/tarifs` → « Essayer Local mensuel » → Checkout FR + 4,90 € + bandeau essai 7 jours
- [ ] Carte `4242 4242 4242 4242` → success → retour `/compte/abonnement/success` → tier devient `local` < 5s
- [ ] Carte decline `4000 0000 0000 9995` → reste sur Checkout avec message d'erreur
- [ ] Discovery DOM-TOM (974) → `/tarifs` → encart « Outre-mer pas encore couvert », CTAs désactivés
- [ ] Anonymous → `/tarifs` → « Essayer 7 jours » redirige vers `/auth/register?next=/tarifs&plan=…`

## Customer Portal
- [ ] Local en trial → `/compte/abonnement` → « Gérer mon abonnement » → Customer Portal FR
- [ ] Changer mensuel → annuel via portal → webhook → DB `plan`/`price_id` updated < 5s
- [ ] Annuler via portal → `cancel_at_period_end=true` → statut « Annulation programmée » visible

## Webhook idempotency
- [ ] Stripe CLI rejoue 2× `customer.subscription.created` → 1 seule ligne en DB
- [ ] Signature invalide → 400 + log warning
- [ ] Event non géré (`charge.failed`) → 200 + log « ignoré », pas de crash

## Trial expiry
- [ ] Trial forcé expiré en SQL → webhook `subscription.updated` (passé `active`) → tier reste `local` → 4,90 € prélevé (test)
- [ ] Bandeau « essai bientôt fini » visible à J-2 (dismissible 24h)

## RLS sécurité
- [ ] User A `SELECT` direct `subscriptions` d'un user B via REST → 0 row
- [ ] User A `UPDATE subscriptions set plan='itinerant' where user_id=auth.uid()` → 0 row (pas de policy WRITE authenticated)

## DOM-TOM blocage
- [ ] User `home_department='974'` → POST direct `/api/stripe/checkout` → 403

## Captures écran (critère E2)
- [ ] `docs/sprint-9/screenshots/abonnement-states.png` : trial / active / cancel_scheduled / canceled / past_due

---

## Tests automatisés (I1) — état au 2026-05-21
- [x] `pnpm test` ≥ 203 vert → **215/215**
- [x] `pnpm typecheck` = 0 erreur
- [x] `pnpm build` OK (clés test réelles)
- [ ] `pnpm lint` = 0 erreur → **dette préexistante** (~360 `react/no-unescaped-entities`,
      reportée bloc C sprint 7.5, `eslint.ignoreDuringBuilds` actif). Aucune régression
      introduite par le sprint 9.
