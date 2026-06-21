# QA manuelle — BUG-03 suppression de compte (RGPD)

> WS-B, sprint 11.6. Suppression via le RPC `delete_my_account` (SECURITY DEFINER,
> owner postgres ; migration 033) + nettoyage Storage = effets de bord destructifs.
> **À jouer uniquement sur des comptes jetables**, jamais sur un compte réel.

## Pré-requis
- Migration **030** appliquée (FK `moderated_by`/`resolved_by` en `ON DELETE SET NULL`).
- `SUPABASE_SERVICE_ROLE_KEY` présente dans l'environnement testé (prod ou preview).
- Migration **033** appliquée (RPC `delete_my_account` owner postgres) + code `app/(app)/profil/actions.ts` déployé (appelle `supabase.rpc('delete_my_account')`).

## Scénario 1 — compte standard
1. Créer un compte jetable, compléter l'onboarding.
2. Loguer **1 prise avec photo** → vérifier en base un objet sous `catches/<uid>/`
   (`select name from storage.objects where bucket_id='catches' and name like '<uid>/%'`).
3. Créer **1 post**, **1 like**, **1 follow**, **1 subscription** (discovery).
4. `/profil` → « Supprimer mon compte » → « Supprimer définitivement ».
   - **Attendu** : redirection vers `/`, pas de toast d'erreur.
5. Vérifs base (= **0** pour ce `uid`) :
   ```sql
   select count(*) from auth.users          where id = '<uid>';            -- 0
   select count(*) from public.profiles     where id = '<uid>';            -- 0
   select count(*) from public.catches      where user_id = '<uid>';       -- 0
   select count(*) from public.feed_posts   where author_id = '<uid>';     -- 0
   select count(*) from public.feed_comments where author_id = '<uid>';    -- 0
   select count(*) from public.feed_likes   where user_id = '<uid>';       -- 0
   select count(*) from public.follows      where follower_id = '<uid>' or following_id = '<uid>'; -- 0
   select count(*) from public.subscriptions where user_id = '<uid>';      -- 0
   select count(*) from storage.objects where bucket_id='catches' and name like '<uid>/%'; -- 0
   ```

## Scénario 2 — compte modérateur (BUG-13)
1. Sur un compte jetable, `update profiles set is_moderator=true where id='<uid>'`.
2. Lui faire **modérer un post** (renseigne `feed_posts.moderated_by = <uid>`) et
   **résoudre un signalement** (`reports.resolved_by = <uid>`).
3. Supprimer le compte via `/profil`.
   - **Attendu** : succès. Le post et le report **subsistent**, avec
     `moderated_by = NULL` / `resolved_by = NULL` :
   ```sql
   select moderated_by from public.feed_posts where id = '<post_id>';  -- null
   select resolved_by  from public.reports    where id = '<report_id>'; -- null
   ```

## Scénario 3 — échec réel remonté (plus de message muet)
1. En **preview**, retirer temporairement `SUPABASE_SERVICE_ROLE_KEY`.
2. Tenter une suppression.
   - **Attendu** : message FR exploitable (pas le générique « Contacte le support »),
     + un event **Sentry** avec `tags.action = deleteAccount`.

## Vérif FK (post-migration 030)
```sql
select conname, confdeltype
from pg_constraint
where conname in ('feed_posts_moderated_by_fkey','reports_resolved_by_fkey');
-- confdeltype attendu = 'n' (SET NULL) pour les deux
```
