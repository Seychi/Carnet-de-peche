-- 104b_invite_codes_hardening.sql — Sprint 68, fixes de la revue croisée.
--
-- 1) consume_invite_code (chemin LEGACY : INVITE_ONLY=true + confirmation email
--    active, cf app/auth/login/actions.ts) ne vérifiait pas disabled_at (ajouté
--    en 104) : un code désactivé par un modérateur passait encore le gate
--    d'inscription beta. Chemin dormant (flag OFF, autoconfirm ON) mais fermé.
-- 2) create_invite_codes : borne p_label en SQL (80 caractères, défense en
--    profondeur ; l'action TS le cape déjà).

create or replace function public.consume_invite_code(p_code text)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  ok boolean;
begin
  if p_code is null or length(trim(p_code)) = 0 then
    return false;
  end if;
  update public.invite_codes
    set uses = uses + 1
    where code = trim(p_code)
      and uses < max_uses
      and (expires_at is null or expires_at > now())
      and disabled_at is null
    returning true into ok;
  return coalesce(ok, false);
end;
$$;

comment on function public.consume_invite_code(text) is
  'Valide + consomme un code d''invitation de façon atomique (gate legacy INVITE_ONLY). Réservé au service_role. Depuis 104b : refuse aussi les codes désactivés (disabled_at).';

create or replace function public.create_invite_codes(
  p_count        int  default 1,
  p_label        text default null,
  p_max_uses     int  default 1,
  p_grants_tier  text default 'local',
  p_grant_months int  default 6
)
returns setof text
language plpgsql
security definer
set search_path = public
as $$
declare
  -- 23 lettres (sans I, L, O) + 8 chiffres (sans 0, 1) = 31 caractères.
  v_alphabet constant text := 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
  v_uid   uuid := auth.uid();
  v_label text := nullif(left(trim(coalesce(p_label, '')), 80), '');
  v_code  text;
  i int;
  j int;
begin
  if not public.is_moderator(v_uid) then
    raise exception 'moderator_only';
  end if;
  if p_count is null or p_count < 1 or p_count > 200 then
    raise exception 'invalid_count';
  end if;
  if p_max_uses is null or p_max_uses < 1 or p_max_uses > 10000 then
    raise exception 'invalid_max_uses';
  end if;
  if p_grants_tier is null or p_grants_tier not in ('local', 'itinerant') then
    raise exception 'invalid_tier';
  end if;
  if p_grant_months is not null and (p_grant_months < 1 or p_grant_months > 120) then
    raise exception 'invalid_months';
  end if;

  for i in 1..p_count loop
    loop
      v_code := 'FDR-';
      for j in 1..8 loop
        -- gen_random_bytes (pgcrypto, schéma extensions — qualifié car
        -- search_path est cloué à public) : le léger biais modulo (256 % 31)
        -- est sans enjeu pour un code d'invitation (~39 bits d'entropie).
        v_code := v_code
          || substr(v_alphabet, 1 + (get_byte(extensions.gen_random_bytes(1), 0) % 31), 1);
        if j = 4 then
          v_code := v_code || '-';
        end if;
      end loop;
      begin
        insert into public.invite_codes
          (code, label, max_uses, grants_tier, grant_months, created_by)
        values
          (v_code, v_label, p_max_uses, p_grants_tier, p_grant_months, v_uid);
        exit;
      exception when unique_violation then
        -- Collision (improbable, 31^8) : regénère.
      end;
    end loop;
    return next v_code;
  end loop;
end;
$$;
