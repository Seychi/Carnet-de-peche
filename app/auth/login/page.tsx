"use client";

import { useActionState, useEffect, useState } from "react";
import { useFormStatus } from "react-dom";
import Link from "next/link";
import { Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { sendMagicLink, type LoginState } from "./actions";

const loginInitialState: LoginState = {
  error: null,
  success: false,
  email: "",
  submittedAt: null,
};

function SubmitButton() {
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
          Envoi en cours…
        </>
      ) : (
        "M'envoyer le lien"
      )}
    </Button>
  );
}

export default function LoginPage() {
  const [state, formAction] = useActionState(sendMagicLink, loginInitialState);
  const [showSent, setShowSent] = useState(false);

  useEffect(() => {
    if (state.success && state.submittedAt) setShowSent(true);
  }, [state.submittedAt]);

  if (showSent) {
    return (
      <div className="w-full max-w-[420px] text-center">
        <div
          className="w-16 h-16 rounded-[20px] grid place-items-center mx-auto mb-5 text-3xl"
          style={{ background: "linear-gradient(135deg, rgba(20,184,166,.15), rgba(20,184,166,.05))" }}
        >
          📬
        </div>
        <h1 className="text-[26px] mb-2">Vérifie ton email</h1>
        <p className="text-ink-500 text-[15px] leading-relaxed mb-6">
          On vient d&apos;envoyer un lien de connexion à{" "}
          <strong className="text-ink-900">{state.email}</strong>.
          Clique dessus depuis ton téléphone ou ton ordi.
        </p>
        <p className="text-[13px] text-ink-500">
          Pas reçu ?{" "}
          <button
            onClick={() => setShowSent(false)}
            className="text-teal-600 font-medium hover:underline"
          >
            Renvoyer
          </button>
        </p>
      </div>
    );
  }

  return (
    <div className="w-full max-w-[420px]">
      <div className="text-center mb-8">
        <h1 className="text-[28px] mb-2">Connexion à ton carnet</h1>
        <p className="text-ink-500 text-[15px]">
          Entre ton email, on t&apos;envoie un lien magique.
        </p>
      </div>

      <div
        className="bg-white rounded-[22px] p-6 sm:p-8 border border-ink-100"
        style={{ boxShadow: "0 4px 24px rgba(10,47,61,.06)" }}
      >
        <form action={formAction} className="flex flex-col gap-5">
          <div className="flex flex-col gap-1.5">
            <Label
              htmlFor="email"
              className="text-[14px] font-semibold text-ink-900"
            >
              Ton email
            </Label>
            <Input
              key={state.email || "empty"}
              id="email"
              name="email"
              type="email"
              placeholder="toi@exemple.fr"
              autoComplete="email"
              defaultValue={state.email}
              className="min-h-[48px] rounded-[12px] border-ink-200 text-[15px] focus-visible:ring-teal-500"
              required
            />
            {state.error && (
              <p className="text-[13px] text-red-600" role="alert">
                {state.error}
              </p>
            )}
          </div>

          <SubmitButton />
        </form>

        <div className="flex items-center gap-3 my-5">
          <Separator className="flex-1" />
          <span className="text-[12px] text-ink-500 shrink-0">ou</span>
          <Separator className="flex-1" />
        </div>

        <div className="flex flex-col gap-3">
          <button
            disabled
            className="flex items-center justify-center gap-3 min-h-[48px] rounded-full border border-ink-200 text-[14px] font-medium text-ink-300 cursor-not-allowed bg-ink-100/50 relative"
          >
            <svg width="18" height="18" viewBox="0 0 24 24">
              <path fill="#9AA0A6" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#9AA0A6" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#9AA0A6" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="#9AA0A6" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            Continuer avec Google
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-semibold text-ink-400 bg-ink-100 rounded-full px-2 py-0.5">
              Bientôt
            </span>
          </button>

          <button
            disabled
            className="flex items-center justify-center gap-3 min-h-[48px] rounded-full border border-ink-200 text-[14px] font-medium text-ink-300 cursor-not-allowed bg-ink-100/50 relative"
          >
            <svg width="16" height="18" viewBox="0 0 814 1000" fill="#9AA0A6">
              <path d="M788.1 340.9c-5.8 4.5-108.2 62.2-108.2 190.5 0 148.4 130.3 200.9 134.2 202.2-.6 3.2-20.7 71.9-68.7 141.9-42.8 61.6-87.5 123.1-155.5 123.1s-85.5-39.5-164-39.5c-76 0-103.7 40.8-165.9 40.8s-105-57.8-155.5-127.4C46 790.7 0 663.8 0 541.8c0-207.8 134.4-317.7 266.5-317.7 93.4 0 171.4 62.5 231.4 62.5 56.9 0 144.2-66.1 249.8-66.1zm-239.5-167.9c28.2-34.2 50.2-81.8 50.2-129.2 0-6.7-.6-13.4-1.9-19.5-47.4 1.9-103.6 31.4-136.2 68.7-26.3 29.5-51.4 77.1-51.4 125.5 0 7.1 1.3 14.2 1.9 16.5 3.2.6 8.4 1.3 13.6 1.3 43 0 96.2-28.9 123.8-63.3z"/>
            </svg>
            Continuer avec Apple
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-semibold text-ink-400 bg-ink-100 rounded-full px-2 py-0.5">
              Bientôt
            </span>
          </button>
        </div>
      </div>

      <p className="text-center text-[14px] text-ink-500 mt-6">
        Pas encore de compte ?{" "}
        <Link href="/auth/register" className="text-teal-600 font-semibold hover:underline">
          Crée le tien
        </Link>
      </p>
    </div>
  );
}
