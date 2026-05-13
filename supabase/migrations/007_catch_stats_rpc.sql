create or replace function public.get_my_catch_stats(uid uuid default auth.uid())
returns jsonb
language sql
stable
security invoker
set search_path = public
as $$
  select jsonb_build_object(
    'totalCount', count(*),
    'thisMonthCount', count(*) filter (where caught_at >= date_trunc('month', now())),
    'biggestCatch', (
      select jsonb_build_object('species', species, 'size_cm', size_cm)
      from catches
      where user_id = uid and size_cm is not null
      order by size_cm desc nulls last
      limit 1
    ),
    'favoriteSpecies', (
      select species
      from catches
      where user_id = uid
      group by species
      order by count(*) desc
      limit 1
    ),
    'releasedRate', (
      case when count(*) = 0 then 0
           else round(count(*) filter (where released = true)::numeric * 100 / count(*), 1)
      end
    )
  )
  from catches
  where user_id = uid;
$$;

revoke all on function public.get_my_catch_stats from public;
grant execute on function public.get_my_catch_stats to authenticated;
