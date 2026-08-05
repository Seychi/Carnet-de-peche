# Matrice de preuve — migration 108 (sprint 74)

> Exécutée **LIVE en prod** le 2026-08-05 via le connecteur Supabase (`execute_sql`), chaque test dans une transaction `begin; … rollback;` avec des utilisateurs éphémères `@test.invalid`.
> Résultat : **11 / 11**. Zéro résidu vérifié après coup.

Objets de la migration : table `public.lifecycle_emails` + colonne `profiles.weekly_window_optin`.

---

## Résultats

| # | Test | Attendu | Obtenu | ✅ |
|---|---|---|---|---|
| 1 | RLS activée sur `lifecycle_emails` | `true` | `true` | ✅ |
| 2 | Nombre de policies | `1` | `1` | ✅ |
| 3 | La seule policy est un SELECT own | `lifecycle_emails_select_own/r` | idem | ✅ |
| 4 | Contrainte `lifecycle_emails_kind_check` présente | présente | présente | ✅ |
| 5 | Défaut de `profiles.weekly_window_optin` | `false` | `false` | ✅ |
| 6 | Profils existants avec l'opt-in actif | `0` | `0` | ✅ |
| 7 | SELECT own en rôle `authenticated` (2 lignes en base, 1 à lui) | `1` | `1` | ✅ |
| 8 | SELECT cross-user en rôle `authenticated` | `0` | `0` | ✅ |
| 9 | INSERT en rôle `authenticated` | erreur `42501` | `42501 new row violates row-level security policy` | ✅ |
| 10 | Doublon `(user_id, kind, sent_key)` | erreur `23505` | `23505 duplicate key value violates unique constraint "lifecycle_emails_pkey"` | ✅ |
| 11 | Cascade RGPD : `delete from auth.users` purge le journal | `2 → 0` | `0` | ✅ |

Deux contrôles supplémentaires sur les `CHECK` :

| # | Test | Obtenu | ✅ |
|---|---|---|---|
| 12 | `kind = 'spam_promo'` refusé | `23514 violates check constraint "lifecycle_emails_kind_check"` | ✅ |
| 13 | `sent_key = 'semaine-32'` refusé (format ISO exigé) | `23514 violates check constraint "lifecycle_emails_sent_key_check"` | ✅ |

---

## SQL des tests clés

### Écriture bloquée pour `authenticated` (test 9)

```sql
begin;
  set local role authenticated;
  set local request.jwt.claims = '{"sub":"d0000000-0000-0000-0000-000000000108","role":"authenticated"}';
  insert into public.lifecycle_emails (user_id, kind, sent_key)
  values ('d0000000-0000-0000-0000-000000000108','welcome','once');
rollback;
-- ERROR 42501: new row violates row-level security policy for table "lifecycle_emails"
```

C'est l'invariant central : **seul le cron, en service-role, écrit le journal**. Un utilisateur ne peut pas se fabriquer une ligne pour se soustraire à un email, ni en supprimer une pour se le refaire envoyer.

### Isolation en lecture (tests 7 et 8)

```sql
begin;
  -- 2 lignes en base : une pour ...108, une pour ...109 (écrites en service-role)
  set local role authenticated;
  set local request.jwt.claims = '{"sub":"d0000000-0000-0000-0000-000000000108","role":"authenticated"}';
  select count(*) from public.lifecycle_emails;                                        -- 1
  select count(*) from public.lifecycle_emails where user_id = '...109';               -- 0
rollback;
```

### Cascade RGPD (test 11)

```sql
begin;
  insert into auth.users (...) values ('d0000000-...-108', ...);
  insert into public.lifecycle_emails (user_id, kind, sent_key) values
    ('d0000000-...-108','welcome','once'),
    ('d0000000-...-108','weekly_window','2026-W32');
  delete from auth.users where id = 'd0000000-...-108';
  select count(*) from public.lifecycle_emails where user_id = 'd0000000-...-108';     -- 0
rollback;
```

`delete_my_account` (migration 033) fait uniquement `delete from auth.users where id = auth.uid()` et ne liste aucune table : elle s'appuie à 100 % sur les cascades FK. **Aucune modification de la fonction n'est requise** pour que `lifecycle_emails` soit purgée. La colonne `weekly_window_optin` part avec la ligne `profiles`, elle-même en cascade sur `auth.users` (migration 001).

### Absence de résidu (contrôle final, hors transaction)

```sql
select (select count(*) from public.lifecycle_emails)                                   as journal,        -- 0
       (select count(*) from auth.users where email like '%@test.invalid')              as users_test,     -- 0
       (select count(*) from profiles where weekly_window_optin)                        as optin_actifs,   -- 0
       (select count(*) from information_schema.columns
          where table_name='profiles' and column_name='weekly_window_optin')            as colonne;        -- 1
```

---

## Advisors

| | Avant 108 | Après 108 |
|---|---|---|
| ERROR | 3 | **3** |
| INFO | 1 | 1 |
| WARN | 97 | 97 |
| **Total** | 101 | **101** |

**Aucun nouvel ERROR**, et aucun lint ne mentionne `lifecycle_emails` ni `weekly_window_optin`. Les 3 ERROR sont la baseline assumée du projet (2 vues `security_definer` + `spatial_ref_sys` PostGIS).

La 108 n'ajoute aucune fonction `SECURITY DEFINER`, donc elle n'ajoute pas non plus de WARN de la classe `*_security_definer_function_executable`.

---

## Types TypeScript

`lib/types.ts` régénéré depuis le schéma live : **+24 lignes, 0 suppression**, correspondant exactement à la table `lifecycle_emails` et aux 3 occurrences de `weekly_window_optin` (Row / Insert / Update de `profiles`).
