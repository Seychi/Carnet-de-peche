"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import { Eye, EyeOff, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { updatePassword, type PasswordUpdateState } from "./actions";

const initialState: PasswordUpdateState = { error: null, success: false };

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
          Mise à jour…
        </>
      ) : (
        "Enregistrer le nouveau mot de passe"
      )}
    </Button>
  );
}

function PasswordInput({
  id,
  name,
  autoComplete,
}: {
  id: string;
  name: string;
  autoComplete?: string;
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
        className="min-h-[48px] rounded-[12px] border-ink-200 text-[15px] focus-visible:ring-teal-500 pr-10"
        required
      />
      <button
        type="button"
        tabIndex={-1}
        onClick={() => setShow((s) => !s)}
        aria-label={show ? "Masquer" : "Afficher"}
        className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-500 hover:text-ink-700 transition-colors"
      >
        {show ? <EyeOff size={16} /> : <Eye size={16} />}
      </button>
    </div>
  );
}

export default function ResetPasswordPage() {
  const [state, action] = useActionState(updatePassword, initialState);

  return (
    <div className="w-full max-w-[420px]">
      <div className="text-center mb-8">
        <h1 className="text-[28px] mb-2">Nouveau mot de passe</h1>
        <p className="text-ink-500 text-[15px]">
          Choisis un mot de passe solide pour sécuriser ton carnet.
        </p>
      </div>

      <div
        className="bg-white rounded-[22px] p-6 sm:p-8 border border-ink-100"
        style={{ boxShadow: "0 4px 24px rgba(10,47,61,.06)" }}
      >
        <form action={action} className="flex flex-col gap-5">
          <div className="flex flex-col gap-1.5">
            <Label
              htmlFor="new-password"
              className="text-[14px] font-semibold text-ink-900"
            >
              Nouveau mot de passe
            </Label>
            <PasswordInput
              id="new-password"
              name="password"
              autoComplete="new-password"
            />
            <p className="text-[12px] text-ink-500">
              Minimum 8 caractères dont 1 chiffre.
            </p>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label
              htmlFor="confirm-password"
              className="text-[14px] font-semibold text-ink-900"
            >
              Confirme le mot de passe
            </Label>
            <PasswordInput
              id="confirm-password"
              name="password_confirm"
              autoComplete="new-password"
            />
          </div>

          {state.error && (
            <p className="text-[13px] text-red-600 -mt-2" role="alert">
              {state.error}
            </p>
          )}

          <SubmitButton />
        </form>
      </div>
    </div>
  );
}
