-- Répartition détaillée des prises par espèce, technique, et mois (12 derniers mois)
-- Utilisée par le composant CatchStatsDetailed dans /carnet

create or replace function public.get_my_catches_breakdown(uid uuid default auth.uid())
returns jsonb
language sql
stable
security invoker
as $$
  select jsonb_build_object(
    'bySpecies', (
      select jsonb_agg(jsonb_build_object('species', species, 'count', cnt, 'avgSize', avg_size))
      from (
        select species, count(*) as cnt, round(avg(size_cm)::numeric, 1) as avg_size
        from catches where user_id = uid
        group by species
        order by cnt desc
      ) s
    ),
    'byTechnique', (
      select jsonb_agg(jsonb_build_object('technique', technique, 'count', cnt))
      from (
        select technique, count(*) as cnt
        from catches where user_id = uid
        group by technique
        order by cnt desc
      ) t
    ),
    'byMonth', (
      select jsonb_agg(jsonb_build_object('month', month, 'count', cnt) order by month)
      from (
        select to_char(date_trunc('month', caught_at), 'YYYY-MM') as month, count(*) as cnt
        from catches where user_id = uid
        and caught_at >= (now() - interval '12 months')
        group by 1
      ) m
    )
  );
$$;

revoke all on function public.get_my_catches_breakdown from public;
grant execute on function public.get_my_catches_breakdown to authenticated;
