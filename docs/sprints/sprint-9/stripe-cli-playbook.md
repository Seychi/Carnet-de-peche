# Playbook Stripe CLI — test des paiements en local (sprint 9)

Référence : brief sprint 9, bloc G2. À dérouler par John en mode **test**.

> Pré-requis : `.env.local` rempli avec les clés/price_ids TEST (cf
> [stripe-environments.md](./stripe-environments.md)), Stripe CLI installée
> (`stripe --version`), `stripe login` fait.

## 0. Deux terminaux

Tu auras besoin de **deux terminaux ouverts en parallèle** :
- Terminal A : l'app Next (`pnpm dev`)
- Terminal B : l'écoute webhook (`stripe listen`)

## 1. Lancer l'écoute webhook (terminal B)

```powershell
stripe listen --forward-to localhost:3000/api/stripe/webhook
```

→ copie le `whsec_…` affiché dans `.env.local` (`STRIPE_TEST_WEBHOOK_SECRET`),
puis **redémarre `pnpm dev`** pour qu'il prenne la nouvelle valeur.
Laisse ce terminal **ouvert** : il transfère les events Stripe vers ton localhost.

## 2. Lancer l'app (terminal A)

```powershell
pnpm dev
```

## 3. Rejouer les events principaux (terminal B, à côté de `stripe listen`)

Ouvre un **3e terminal** (ou mets `stripe listen` en fond) :

```powershell
stripe trigger customer.subscription.created
stripe trigger customer.subscription.updated
stripe trigger customer.subscription.deleted
stripe trigger invoice.payment_failed
```

Chaque trigger doit :
- apparaître dans le terminal `stripe listen` (event reçu, réponse `200`)
- logger `[webhook] evt_… <type>` côté `pnpm dev`

> ⚠️ Les `stripe trigger` créent des objets **fictifs** sans `metadata.user_id`.
> Le handler `handleSubscriptionUpsert` loguera donc « subscription sans
> metadata.user_id » et n'écrira pas en DB — c'est **normal**. La vraie écriture
> en DB se vérifie au flow Checkout complet (étape 4), qui pose bien le `user_id`.

## 4. Flow Checkout complet (le vrai test bout-en-bout)

1. Connecte-toi avec un compte test FR métropole (ex. `test-discovery@…`).
2. Va sur `/tarifs` → clique **« Essayer 7 jours »** sur Local mensuel.
3. Tu atterris sur **Stripe Checkout** (en FR, 4,90 €, bandeau essai 7 jours).
4. Carte de test : `4242 4242 4242 4242`, date future, CVC quelconque.
5. Retour sur `/compte/abonnement/success`.
6. **Vérifie en DB** (Supabase) :
   ```sql
   select plan, status, trial_end, stripe_subscription_id
   from subscriptions
   where user_id = '<id du compte test>';
   -- attendu : plan=local, status=trialing, trial_end ≈ +7j, stripe_subscription_id non null
   ```
7. Vérifie `current_tier` :
   ```sql
   select current_tier('<id du compte test>'); -- attendu : local
   ```

### Carte qui échoue
- `4000 0000 0000 9995` → décline → tu restes sur Checkout avec message d'erreur.

## 5. Bandeau "essai bientôt fini" (E5)

Force l'échéance proche en DB puis recharge une page de l'app :
```sql
update subscriptions set trial_end = now() + interval '2 days'
where user_id = '<id du compte test>';
```
→ bandeau teal visible en haut. Clic sur ×  → disparaît (revient après 24h).

## 6. Customer Portal + annulation

1. `/compte/abonnement` → **« Gérer mon abonnement »** → Customer Portal Stripe (FR).
2. Annule l'abonnement.
3. Vérifie en DB : `cancel_at_period_end = true` (accès maintenu jusqu'à fin de période).

## 7. Expiration d'essai (simulation)

```sql
update subscriptions set trial_end = now() - interval '1 hour'
where user_id = '<id du compte test>';
```
Puis `stripe trigger customer.subscription.updated` (ou attends le passage réel en
`active` par Stripe) → `current_tier` doit rester `local`, prélèvement 4,90 € (test mode).

---

**Checklist de sortie** (à reporter dans `docs/sprint-9/qa-checklist.md`) : voir bloc I2 du brief.
