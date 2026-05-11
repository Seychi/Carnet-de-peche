# 🐟 Carnet de Pêche — Base de données Supabase

Schéma initial pour démarrer le projet sur une base **complètement vierge**.

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
