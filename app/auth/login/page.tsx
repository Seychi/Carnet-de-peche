"use client";

import {
  useActionState,
  useEffect,
  useState,
  type FormEvent,
  type FocusEvent,
  type Dispatch,
  type SetStateAction,
} from "react";
import { useFormStatus } from "react-dom";
import { Eye, EyeOff, Loader2, ChevronDown, ChevronUp } from "lucide-react";
import type { z } from "zod";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import {
  signinSchema,
  signupSchema,
  emailOnlySchema,
  zodToFieldErrors,
  type FieldErrors,
} from "@/lib/auth/schema";
import {
  sendMagicLink,
  signInWithPassword,
  signUpWithPassword,
  requestPasswordReset,
  signInWithGoogle,
  type LoginState,
} from "./actions";

// ─── Validation client ──────────────────────────────────────────────────────
// On garde les Server Actions (qui valident aussi côté serveur), mais on ajoute
// une validation client synchrone en français pour : (1) tuer les messages
// natifs HTML5 en anglais (via noValidate), (2) afficher une erreur sous chaque
// champ — au blur (live) et au submit (bloque l'envoi si invalide).

// Valide tout le formulaire au submit ; bloque l'envoi si un champ est invalide.
function gateSubmit(
  schema: z.ZodType,
  setErrors: (errors: FieldErrors) => void
) {
  return (e: FormEvent<HTMLFormElement>) => {
    const data = Object.fromEntries(new FormData(e.currentTarget).entries());
    const res = schema.safeParse(data);
    if (!res.success) {
      e.preventDefault();
      setErrors(zodToFieldErrors(res.error));
    } else {
      setErrors({});
    }
  };
}

// Valide le seul champ qui perd le focus (sans révéler les erreurs des autres).
function gateBlur(
  schema: z.ZodType,
  setErrors: Dispatch<SetStateAction<FieldErrors>>
) {
  return (e: FocusEvent<HTMLInputElement>) => {
    const form = e.currentTarget.form;
    const name = e.currentTarget.name;
    if (!form || !name) return;
    const data = Object.fromEntries(new FormData(form).entries());
    const res = schema.safeParse(data);
    const msg = res.success ? undefined : zodToFieldErrors(res.error)[name];
    setErrors((prev) => ({ ...prev, [name]: msg }));
  };
}

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return (
    <p className="text-[13px] text-red-600" role="alert">
      {message}
    </p>
  );
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const initialState: LoginState = {
  error: null,
  success: false,
  email: "",
  submittedAt: null,
};

type Tab = "signin" | "signup";
type SentReason = "magic" | "signup" | "reset";

function SubmitButton({
  label,
  pendingLabel,
}: {
  label: string;
  pendingLabel: string;
}) {
  const { pending } = useFormStatus();
  return (
    <Button
      type="submit"
      disabled={pending}
      aria-busy={pending}
      className="min-h-[52px] rounded-full text-[15px] font-semibold w-full"
      style={{
        background: "var(--navy-900)",
        color: "#fff",
        boxShadow: "0 6px 24px rgba(10,47,61,.14)",
      }}
    >
      {pending ? (
        <>
          <Loader2 size={16} className="animate-spin mr-2" />
          {pendingLabel}
        </>
      ) : (
        label
      )}
    </Button>
  );
}

function PasswordInput({
  id,
  name,
  autoComplete,
  onBlur,
  invalid,
}: {
  id?: string;
  name: string;
  autoComplete?: string;
  onBlur?: (e: FocusEvent<HTMLInputElement>) => void;
  invalid?: boolean;
}) {
  const [show, setShow] = useState(false);
  return (
    <div className="relative">
      <Input
        id={id}
        name={name}
        type={show ? "text" : "password"}
        placeholder="••••••••"
        autoComplete={autoComplete}
        onBlur={onBlur}
        aria-invalid={invalid || undefined}
        className="min-h-[48px] rounded-[12px] border-ink-200 text-[15px] focus-visible:ring-teal-500 pr-10"
        required
      />
      <button
        type="button"
        tabIndex={-1}
        onClick={() => setShow((s) => !s)}
        aria-label={show ? "Masquer le mot de passe" : "Afficher le mot de passe"}
        className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-500 hover:text-ink-700 transition-colors"
      >
        {show ? <EyeOff size={16} /> : <Eye size={16} />}
      </button>
    </div>
  );
}

// ─── Écran "email envoyé" ──────────────────────────────────────────────────────

const SENT_CONTENT = {
  magic: {
    icon: "📬",
    title: "Vérifie ton email",
    body: "On vient d'envoyer un lien de connexion à",
    sub: "Clique dessus depuis ton téléphone ou ton ordi.",
  },
  signup: {
    icon: "📧",
    title: "Confirme ton adresse",
    body: "On vient d'envoyer un lien de confirmation à",
    sub: "Clique dessus pour activer ton compte et accéder à ton carnet.",
  },
  reset: {
    icon: "🔑",
    title: "Lien envoyé",
    body: "On a envoyé un lien de réinitialisation à",
    sub: "Clique dessus et choisis un nouveau mot de passe.",
  },
};

function SentScreen({
  reason,
  email,
  onResend,
}: {
  reason: SentReason;
  email: string;
  onResend: () => void;
}) {
  const { icon, title, body, sub } = SENT_CONTENT[reason];
  return (
    <div className="w-full max-w-[420px] text-center">
      <div
        className="w-16 h-16 rounded-[20px] grid place-items-center mx-auto mb-5 text-3xl"
        style={{
          background:
            "linear-gradient(135deg, rgba(20,184,166,.15), rgba(20,184,166,.05))",
        }}
      >
        {icon}
      </div>
      <h1 className="text-[26px] mb-2">{title}</h1>
      <p className="text-ink-500 text-[15px] leading-relaxed mb-6">
        {body} <strong className="text-ink-900">{email}</strong>. {sub}
      </p>
      <p className="text-[13px] text-ink-500">
        Pas reçu ?{" "}
        <button
          onClick={onResend}
          className="text-teal-600 font-medium hover:underline"
        >
          Renvoyer
        </button>
      </p>
    </div>
  );
}

// ─── Page principale ───────────────────────────────────────────────────────────

export default function LoginPage() {
  const [tab, setTab] = useState<Tab>("signin");
  const [showReset, setShowReset] = useState(false);
  const [showMagicLink, setShowMagicLink] = useState(false);

  // Erreurs de validation client, par formulaire.
  const [signinErrors, setSigninErrors] = useState<FieldErrors>({});
  const [signupErrors, setSignupErrors] = useState<FieldErrors>({});
  const [resetErrors, setResetErrors] = useState<FieldErrors>({});
  const [magicErrors, setMagicErrors] = useState<FieldErrors>({});
  const [sent, setSent] = useState<{ reason: SentReason; email: string } | null>(
    null
  );

  const [signinState, signinAction] = useActionState(
    signInWithPassword,
    initialState
  );
  const [signupState, signupAction] = useActionState(
    signUpWithPassword,
    initialState
  );
  const [resetState, resetAction] = useActionState(
    requestPasswordReset,
    initialState
  );
  const [magicState, magicAction] = useActionState(sendMagicLink, initialState);

  // Initialise le tab depuis ?tab=register
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("tab") === "register") setTab("signup");
    // Affiche l'erreur OAuth si renvoyé depuis le callback
    // (pas de state à afficher ici, juste un indicateur visuel géré plus bas)
  }, []);

  // Détecte les succès qui ouvrent l'écran "email envoyé"
  useEffect(() => {
    if (signupState.success && signupState.submittedAt)
      setSent({ reason: "signup", email: signupState.email });
  }, [signupState.submittedAt]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (resetState.success && resetState.submittedAt)
      setSent({ reason: "reset", email: resetState.email });
  }, [resetState.submittedAt]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (magicState.success && magicState.submittedAt)
      setSent({ reason: "magic", email: magicState.email });
  }, [magicState.submittedAt]); // eslint-disable-line react-hooks/exhaustive-deps

  // Erreur OAuth renvoyée dans l'URL
  const [oauthError, setOauthError] = useState(false);
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("error") === "oauth") setOauthError(true);
  }, []);

  // Sélectionne un tab ET garde l'URL en phase (sans recharger la page) : on évite
  // que /auth/login?tab=register reste affiché alors que le tab "Connexion" est actif.
  function selectTab(t: Tab) {
    setTab(t);
    setShowReset(false);
    const url = t === "signup" ? "/auth/login?tab=register" : "/auth/login";
    window.history.replaceState(null, "", url);
  }

  if (sent) {
    return (
      <SentScreen
        reason={sent.reason}
        email={sent.email}
        onResend={() => setSent(null)}
      />
    );
  }

  return (
    <div className="w-full max-w-[420px]">
      <div className="text-center mb-8">
        <h1 className="text-[28px] mb-2">
          {tab === "signin" ? "Connexion à ton carnet" : "Crée ton carnet"}
        </h1>
        <p className="text-ink-500 text-[15px]">
          {tab === "signin"
            ? "Content de te revoir."
            : "Logue ta première prise en 2 minutes."}
        </p>
      </div>

      <div
        className="bg-white rounded-[22px] p-6 sm:p-8 border border-ink-100"
        style={{ boxShadow: "0 4px 24px rgba(10,47,61,.06)" }}
      >
        {/* ── Tabs ── */}
        <div className="flex gap-1 bg-ink-100/60 rounded-[12px] p-1 mb-6">
          {(["signin", "signup"] as const).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => selectTab(t)}
              className={`flex-1 py-2 rounded-[9px] text-[14px] font-semibold transition-colors ${
                tab === t
                  ? "bg-white text-navy-900 shadow-sm"
                  : "text-ink-500 hover:text-ink-700"
              }`}
            >
              {t === "signin" ? "Connexion" : "Inscription"}
            </button>
          ))}
        </div>

        {/* ── Mode reset ── */}
        {showReset ? (
          <form
            action={resetAction}
            noValidate
            onSubmit={gateSubmit(emailOnlySchema, setResetErrors)}
            className="flex flex-col gap-5"
          >
            <button
              type="button"
              onClick={() => setShowReset(false)}
              className="flex items-center gap-1.5 text-[13px] text-ink-500 hover:text-ink-700 -mt-1 mb-1 transition-colors self-start"
            >
              ← Retour à la connexion
            </button>
            <p className="text-[14px] text-ink-700">
              Saisis ton email, on t&apos;envoie un lien pour réinitialiser ton
              mot de passe.
            </p>
            <div className="flex flex-col gap-1.5">
              <Label
                htmlFor="reset-email"
                className="text-[14px] font-semibold text-ink-900"
              >
                Ton email
              </Label>
              <Input
                key={resetState.submittedAt ?? "reset-email-initial"}
                id="reset-email"
                name="email"
                type="email"
                placeholder="toi@exemple.fr"
                autoComplete="email"
                defaultValue={resetState.email}
                onBlur={gateBlur(emailOnlySchema, setResetErrors)}
                aria-invalid={resetErrors.email ? true : undefined}
                className="min-h-[48px] rounded-[12px] border-ink-200 text-[15px] focus-visible:ring-teal-500"
                required
              />
              <FieldError message={resetErrors.email} />
              {resetState.error && (
                <p className="text-[13px] text-red-600" role="alert">
                  {resetState.error}
                </p>
              )}
            </div>
            <SubmitButton
              label="Envoyer le lien"
              pendingLabel="Envoi en cours…"
            />
          </form>
        ) : tab === "signin" ? (
          /* ── Formulaire connexion ── */
          <form
            action={signinAction}
            noValidate
            onSubmit={gateSubmit(signinSchema, setSigninErrors)}
            className="flex flex-col gap-5"
          >
            <div className="flex flex-col gap-1.5">
              <Label
                htmlFor="signin-email"
                className="text-[14px] font-semibold text-ink-900"
              >
                Ton email
              </Label>
              <Input
                key={signinState.submittedAt ?? "signin-email-initial"}
                id="signin-email"
                name="email"
                type="email"
                placeholder="toi@exemple.fr"
                autoComplete="email"
                defaultValue={signinState.email}
                onBlur={gateBlur(signinSchema, setSigninErrors)}
                aria-invalid={signinErrors.email ? true : undefined}
                className="min-h-[48px] rounded-[12px] border-ink-200 text-[15px] focus-visible:ring-teal-500"
                required
              />
              <FieldError message={signinErrors.email} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label
                htmlFor="signin-password"
                className="text-[14px] font-semibold text-ink-900"
              >
                Mot de passe
              </Label>
              <PasswordInput
                id="signin-password"
                name="password"
                autoComplete="current-password"
                onBlur={gateBlur(signinSchema, setSigninErrors)}
                invalid={!!signinErrors.password}
              />
              <FieldError message={signinErrors.password} />
              <button
                type="button"
                onClick={() => setShowReset(true)}
                className="text-[13px] text-teal-600 font-medium hover:underline self-start transition-colors"
              >
                Mot de passe oublié ?
              </button>
            </div>
            {signinState.error && (
              <p className="text-[13px] text-red-600 -mt-2" role="alert">
                {signinState.error}
              </p>
            )}
            <SubmitButton label="Se connecter" pendingLabel="Connexion…" />
          </form>
        ) : (
          /* ── Formulaire inscription ── */
          <form
            action={signupAction}
            noValidate
            onSubmit={gateSubmit(signupSchema, setSignupErrors)}
            className="flex flex-col gap-5"
          >
            <div className="flex flex-col gap-1.5">
              <Label
                htmlFor="signup-email"
                className="text-[14px] font-semibold text-ink-900"
              >
                Ton email
              </Label>
              <Input
                key={signupState.submittedAt ?? "signup-email-initial"}
                id="signup-email"
                name="email"
                type="email"
                placeholder="toi@exemple.fr"
                autoComplete="email"
                defaultValue={signupState.email}
                onBlur={gateBlur(signupSchema, setSignupErrors)}
                aria-invalid={signupErrors.email ? true : undefined}
                className="min-h-[48px] rounded-[12px] border-ink-200 text-[15px] focus-visible:ring-teal-500"
                required
              />
              <FieldError message={signupErrors.email} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label
                htmlFor="signup-password"
                className="text-[14px] font-semibold text-ink-900"
              >
                Mot de passe
              </Label>
              <PasswordInput
                id="signup-password"
                name="password"
                autoComplete="new-password"
                onBlur={gateBlur(signupSchema, setSignupErrors)}
                invalid={!!signupErrors.password}
              />
              {signupErrors.password ? (
                <FieldError message={signupErrors.password} />
              ) : (
                <p className="text-[12px] text-ink-500">
                  Minimum 8 caractères dont 1 chiffre.
                </p>
              )}
            </div>
            <div className="flex flex-col gap-1.5">
              <Label
                htmlFor="signup-confirm"
                className="text-[14px] font-semibold text-ink-900"
              >
                Confirme le mot de passe
              </Label>
              <PasswordInput
                id="signup-confirm"
                name="password_confirm"
                autoComplete="new-password"
                onBlur={gateBlur(signupSchema, setSignupErrors)}
                invalid={!!signupErrors.password_confirm}
              />
              <FieldError message={signupErrors.password_confirm} />
            </div>
            {signupState.error && (
              <p className="text-[13px] text-red-600 -mt-2" role="alert">
                {signupState.error}
              </p>
            )}
            <SubmitButton
              label="Créer mon carnet"
              pendingLabel="Création du compte…"
            />
          </form>
        )}

        {/* ── Séparateur ── */}
        <div className="flex items-center gap-3 my-5">
          <Separator className="flex-1" />
          <span className="text-[12px] text-ink-500 shrink-0">ou</span>
          <Separator className="flex-1" />
        </div>

        {/* ── Options sociales ── */}
        <div className="flex flex-col gap-3">
          {/* Erreur OAuth */}
          {oauthError && (
            <p className="text-[13px] text-red-600 text-center" role="alert">
              La connexion Google a échoué. Réessaie.
            </p>
          )}

          {/* Google */}
          <form action={signInWithGoogle}>
            <button
              type="submit"
              className="flex items-center justify-center gap-3 min-h-[48px] rounded-full border border-ink-200 text-[14px] font-medium text-ink-700 hover:bg-ink-50 transition-colors w-full cursor-pointer"
            >
              <svg width="18" height="18" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                />
              </svg>
              Continuer avec Google
            </button>
          </form>

          {/* Lien magique (collapsible) */}
          <div>
            <button
              type="button"
              onClick={() => setShowMagicLink((v) => !v)}
              className="flex items-center justify-center gap-2 min-h-[48px] rounded-full border border-ink-200 text-[14px] font-medium text-ink-700 hover:bg-ink-50 transition-colors w-full"
            >
              ✉️ Reçois un lien magique
              {showMagicLink ? (
                <ChevronUp size={14} />
              ) : (
                <ChevronDown size={14} />
              )}
            </button>

            {showMagicLink && (
              <form
                action={magicAction}
                noValidate
                onSubmit={gateSubmit(emailOnlySchema, setMagicErrors)}
                className="flex flex-col gap-3 mt-3 pt-3 border-t border-ink-100"
              >
                <Input
                  name="email"
                  type="email"
                  placeholder="toi@exemple.fr"
                  autoComplete="email"
                  onBlur={gateBlur(emailOnlySchema, setMagicErrors)}
                  aria-invalid={magicErrors.email ? true : undefined}
                  className="min-h-[48px] rounded-[12px] border-ink-200 text-[15px] focus-visible:ring-teal-500"
                  required
                />
                <FieldError message={magicErrors.email} />
                {magicState.error && (
                  <p className="text-[13px] text-red-600" role="alert">
                    {magicState.error}
                  </p>
                )}
                <SubmitButton
                  label="M'envoyer le lien"
                  pendingLabel="Envoi en cours…"
                />
              </form>
            )}
          </div>

          {/* Apple (désactivé) */}
          <button
            disabled
            className="flex items-center justify-center gap-3 min-h-[48px] rounded-full border border-ink-200 text-[14px] font-medium text-ink-300 cursor-not-allowed bg-ink-100/50 relative"
          >
            <svg width="16" height="18" viewBox="0 0 814 1000" fill="#9AA0A6">
              <path d="M788.1 340.9c-5.8 4.5-108.2 62.2-108.2 190.5 0 148.4 130.3 200.9 134.2 202.2-.6 3.2-20.7 71.9-68.7 141.9-42.8 61.6-87.5 123.1-155.5 123.1s-85.5-39.5-164-39.5c-76 0-103.7 40.8-165.9 40.8s-105-57.8-155.5-127.4C46 790.7 0 663.8 0 541.8c0-207.8 134.4-317.7 266.5-317.7 93.4 0 171.4 62.5 231.4 62.5 56.9 0 144.2-66.1 249.8-66.1zm-239.5-167.9c28.2-34.2 50.2-81.8 50.2-129.2 0-6.7-.6-13.4-1.9-19.5-47.4 1.9-103.6 31.4-136.2 68.7-26.3 29.5-51.4 77.1-51.4 125.5 0 7.1 1.3 14.2 1.9 16.5 3.2.6 8.4 1.3 13.6 1.3 43 0 96.2-28.9 123.8-63.3z" />
            </svg>
            Continuer avec Apple
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-semibold text-ink-400 bg-ink-100 rounded-full px-2 py-0.5">
              Bientôt
            </span>
          </button>
        </div>
      </div>

      <p className="text-center text-[14px] text-ink-500 mt-6">
        {tab === "signin" ? (
          <>
            Pas encore de compte ?{" "}
            <button
              onClick={() => selectTab("signup")}
              className="text-teal-600 font-semibold hover:underline"
            >
              Crée le tien
            </button>
          </>
        ) : (
          <>
            Déjà un compte ?{" "}
            <button
              onClick={() => selectTab("signin")}
              className="text-teal-600 font-semibold hover:underline"
            >
              Connecte-toi
            </button>
          </>
        )}
      </p>
    </div>
  );
}
