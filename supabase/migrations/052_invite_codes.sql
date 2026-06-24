-- 052_invite_codes.sql — Sprint 25, WS-A (beta fondateurs : codes d'invitation).
-- Gate d'inscription OPTIONNEL pour la beta fondateurs. Le hard-gate est piloté
-- côté app par l'env INVITE_ONLY (défaut OFF → inscription ouverte, comportement
-- inchangé). Cette migration ne fait QUE poser l'infra.
--
-- Invariants : RLS fail-closed (aucune policy → ni anon ni authenticated ne lisent
-- /écrivent la table) ; validation+consommation UNIQUEMENT via RPC SECURITY DEFINER
-- réservée au service_role (appelée par la Server Action d'inscription).

CREATE TABLE public.invite_codes (
  code        text        PRIMARY KEY,
  label       text,
  max_uses    int         NOT NULL DEFAULT 1 CHECK (max_uses >= 1),
  uses        int         NOT NULL DEFAULT 0 CHECK (uses >= 0),
  expires_at  timestamptz,
  created_by  uuid        REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at  timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.invite_codes IS
  'Codes d''invitation beta fondateurs (sprint 25). RLS fail-closed : accès uniquement via consume_invite_code (service_role) ou SQL admin. John mint des codes par INSERT service-role.';

-- RLS activée SANS aucune policy → fail-closed total (anon/authenticated bloqués).
ALTER TABLE public.invite_codes ENABLE ROW LEVEL SECURITY;

-- ─── Consommation atomique (service_role only) ────────────────────────────────
-- Incrémente uses si le code existe, n'est pas épuisé et n'est pas expiré.
-- Retourne true si consommé, false sinon. Atomique (UPDATE … RETURNING).
CREATE OR REPLACE FUNCTION public.consume_invite_code(p_code text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  ok boolean;
BEGIN
  IF p_code IS NULL OR length(trim(p_code)) = 0 THEN
    RETURN false;
  END IF;
  UPDATE public.invite_codes
    SET uses = uses + 1
    WHERE code = trim(p_code)
      AND uses < max_uses
      AND (expires_at IS NULL OR expires_at > now())
    RETURNING true INTO ok;
  RETURN coalesce(ok, false);
END;
$$;

COMMENT ON FUNCTION public.consume_invite_code(text) IS
  'Valide + consomme un code d''invitation de façon atomique. Réservé au service_role (appelé par la Server Action d''inscription quand INVITE_ONLY=true).';

REVOKE ALL ON FUNCTION public.consume_invite_code(text) FROM public, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.consume_invite_code(text) TO service_role;
