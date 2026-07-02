# Métriques paiements à câbler (sprint 9 → instrumentation sprint 11)

Référence : brief sprint 9, bloc I3. Plausible + PostHog sont setup au **sprint 11** ;
ce doc liste les events à instrumenter à ce moment-là. Rien n'est envoyé en sprint 9.

| Event | Props | Où le déclencher |
|---|---|---|
| `pricing_page_viewed` | `tier`, `eligible` | page `/tarifs` (server → client beacon) |
| `checkout_started` | `plan`, `interval` | submit du form `/api/stripe/checkout` |
| `checkout_completed` | `plan`, `interval`, `trial` | webhook `checkout.session.completed` |
| `checkout_abandoned` | `plan`, `interval` | `customer.subscription.canceled` < 1h après création |
| `subscription_canceled` | `plan`, `days_since_creation`, `in_trial` | `customer.subscription.deleted` |
| `subscription_payment_failed` | `plan` | `invoice.payment_failed` |
| `customer_portal_opened` | — | route `/api/stripe/portal` |
| `trial_will_end_email_dispatched` | `plan` | quand Resend câblé (sprint 11) |

## Notes d'implémentation (sprint 11)

- Les events côté **webhook** sont fiables (server-to-server) → préférer PostHog server-side
  capture dans `lib/stripe/events.ts` plutôt qu'un tracking navigateur.
- `checkout_started` côté navigateur peut être perdu (form POST = navigation) → doubler avec
  un event server au moment de la création de session si besoin de précision.
- KPI clés à suivre : taux de conversion `pricing_page_viewed → checkout_completed`,
  taux de conversion trial → payé (J+8), taux d'annulation en essai.
