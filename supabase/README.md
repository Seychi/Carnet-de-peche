# 🐟 Carnet de Pêche — Base de données Supabase

Schéma initial pour démarrer le projet sur une base **complètement vierge**.

## ⚠️ Discipline migrations — règle d'or

**Toute modification du schéma DB DOIT passer par un fichier de migration committé.**

Procédure obligatoire :
1. Créer `supabase/migrations/0XX_description.sql` (numéro suivant disponible)
2. Tester en dev local : `supabase db reset` ou `supabase db push`
3. Commit + push
4. Appliquer en remote via Supabase Studio SQL Editor (copier-coller) OU `supabase db push`
5. Régénérer les types : `pnpm dlx supabase gen types typescript --project-id glgciwwnpmgifyhbvxsw > lib/types.ts`
6. Commit `lib/types.ts`

**Jamais** :
- ❌ Modifier une migration déjà appliquée (créer une migration corrective à la place)
- ❌ Éditer le schéma directement dans Supabase Studio sans créer la migration locale (cf drift ci-dessous)
- ❌ Push de code qui dépend d'une colonne ou RPC non encore en remote

Avant chaque sprint, lancer `supabase db diff --linked` pour vérifier l'absence de drift.

### État du tracking au 2026-05-21 (sprint 7.5 / D2)

Le **schéma remote est complet et correct** : tous les objets des migrations `001`→`016`
existent (colonnes scoring sur `catches`, table `spot_scores`, RPC `get_spots_for_scoring`,
`get_spot_by_slug`, `get_spot_by_id`, `get_spots_for_map`, `nearby_spots`…). Vérifié objet
par objet via MCP → **pas de drift de schéma, aucune migration corrective nécessaire**.

En revanche l'**historique tracké** (`supabase_migrations`) diverge des fichiers locaux :
`001`-`005` et `013` ne sont pas enregistrés comme migrations appliquées (objets créés très
tôt ou via Studio), et quelques entrées remote portent des noms libres
(`catches_location_label`, `catches_for_viewer_add_conditions_privacy`, `catch_extended_stats`).
C'est sans incidence fonctionnelle, mais ça illustre exactement pourquoi la règle d'or
ci-dessus existe. **Ne pas re-jouer 001-005/013 en remote** (les objets existent déjà).

## ⚠️ Seed test accounts — JAMAIS en prod (sprint 9)

Le fichier `supabase/seed_test_accounts.sql` (sprint 8) crée des comptes test avec des
subscriptions UPDATE-ées vers `local`/`itinerant` **SANS passer par Stripe**. C'est
exclusivement pour tester le tier gating en dev/preview.

**Depuis le sprint 9, la SEULE façon d'obtenir un tier payant en prod = passer par Stripe**
Checkout → webhook → upsert subscription (cf `app/api/stripe/webhook/route.ts`). Aucune
écriture dans `subscriptions` hors du webhook (sauf ce seed dev/preview).

**Jamais en prod** :
- Ne pas inclure `seed_test_accounts.sql` dans un `supabase db push` automatique.
- Le fichier a un garde-fou en tête (refus si des profils réels existent) + une assertion
  `current_tier` en fin.

### Purge des comptes test résiduels en prod

Requête anti-traîne (à lancer avant tout merge/déploiement de paiements) — identifie les
subscriptions en tier payant **sans lien Stripe** (= test ayant fui en prod) :

```sql
select u.email, s.user_id, s.plan, s.status, s.updated_at
from public.subscriptions s
join auth.users u on u.id = s.user_id
where s.plan in ('local','itinerant')
  and (s.stripe_customer_id is null or s.stripe_subscription_id is null);
```

Si non vide : ce sont des comptes test. Pour les **remettre en discovery** (sans supprimer
le compte/carnet) :

```sql
update public.subscriptions
set plan = 'discovery', status = 'active',
    stripe_subscription_id = null, stripe_price_id = null,
    trial_end = null, cancel_at_period_end = false, updated_at = now()
where plan in ('local','itinerant')
  and stripe_customer_id is null and stripe_subscription_id is null;
```

> État au 2026-05-21 : 2 comptes concernés (`redkps4+local`, `redkps4+itinerant`) — comptes
> de QA de John, à arbitrer avant la mise en prod réelle des paiements.

## Ordre d'exécution

```bash
# Local dev (Supabase CLI)
supabase db reset            # repart de zéro et joue toutes les migrations
supabase db seed             # injecte les données de test (10 spots Bretagne)

# Manuel (production / staging)
psql $DATABASE_URL -f migrations/001_init.sql
psql $DATABASE_URL -f migrations/002_rls.sql
psql $DATABASE_URL -f migrations/003_indexes_views.sql
psql $DATABASE_URL -f migrations/004_functions_triggers.sql
psql $DATABASE_URL -f seed.sql              # optionnel
```

## Contenu

| Fichier | Rôle |
|---|---|
| `001_init.sql` | Tables principales : profiles, spots, catches, feed_*, follows, subscriptions, conditions_cache, reports |
| `002_rls.sql` | Row Level Security : qui voit/écrit quoi |
| `003_indexes_views.sql` | Index PostGIS + B-tree, vues `public_catches` et `profile_stats` |
| `004_functions_triggers.sql` | Auto-création profil, floutage GPS, updated_at, RPC `nearby_spots` |
| `seed.sql` | 10 spots Bretagne pour dev |

## Tables clés

**profiles** — étend auth.users. Auto-créé via trigger à l'inscription.

**spots** — spots de pêche à la canne du bord (v1). `geom` = précis, `geom_public` = zone floutée 2 km. Visibilité `public` / `subscriber` / `private`.

**catches** — **le carnet** (cœur du produit). Chaque prise loguée. `conditions` jsonb contient le snapshot Open-Meteo. Privacy `private` / `friends` / `public`. Le trigger `blur_catch_geom` génère automatiquement `geom_public` à 2 km près.

**feed_posts** — mur communautaire modéré (Claude API → status approved/flagged/rejected).

**subscriptions** — source de vérité = Stripe webhook. Plans `discovery` / `local` / `itinerant`.

**conditions_cache** — cache horaire des données Open-Meteo + score d'activité par spot, régénéré par Edge Function cron.

## Principes de sécurité

- **RLS activé partout.** Aucune table n'est accessible sans policy explicite.
- **Floutage GPS systématique** sur catches publiques et spots (helper trigger).
- **Subscriptions verrouillé** : pas d'écriture utilisateur, uniquement webhook Stripe en service role.
- **Profils auto-créés** via trigger sur auth.users (security definer).

## RPC utiles côté frontend

```ts
// Spots proches (50 km par défaut)
const { data } = await supabase.rpc('nearby_spots', {
  lat: 48.04,
  lng: -4.73,
  radius_km: 50,
  species_filter: ['bar', 'lieu_jaune'],
  technique_filter: ['leurres']
});

// Vérifier abonnement actif
const { data } = await supabase.rpc('has_active_subscription', {
  uid: user.id
});
```

## TODO avant production

- [ ] Migrer les `check (... in (...))` vers de vrais `CREATE TYPE` enums quand les valeurs sont stables.
- [ ] Ajouter un job de cron pour expirer le cache `conditions_cache` à 24h.
- [ ] Politique de rétention RGPD : suppression auto des comptes inactifs > 3 ans.
- [ ] Index composites supplémentaires une fois les patterns de requête mesurés en prod.
- [ ] Audit log via `pgaudit` ou table maison `audit_events`.
