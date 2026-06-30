"use client";

import { useState, useEffect, useCallback, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import "@/lib/zod-config";
import { z } from "zod";
import { toast } from "sonner";
import { Loader2, Check, ChevronRight } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { saveOnboardingStep, checkUsernameAvailable, completeOnboarding } from "../actions";
import { DEPARTMENT_OPTIONS } from "@/lib/geo/departments";
import { FREQUENCY_LABELS, USERNAME_REGEX } from "@/lib/labels";
import { SPECIES } from "@/lib/seo/programmatic";

/* ─── Constantes ─────────────────────────────────────────────────────────── */

const TECHNIQUES = [
  { value: "leurres", label: "Leurres" },
  { value: "surfcasting", label: "Surfcasting" },
  { value: "flottante", label: "Flottante" },
  { value: "vif", label: "Vif" },
];

// Espèces favorites (D-B2 sprint 23) — DÉRIVÉ du référentiel unique `SPECIES` :
// toutes les espèces loguables au carnet (cœur d'abord). Fini la liste codée en dur.
const SPECIES_OPTIONS = Object.values(SPECIES)
  .filter((s) => s.inCarnet)
  .map((s) => ({ value: s.dbKey, label: s.label }));

const LEVELS = [
  { value: "debutant", label: "Débutant", desc: "Je découvre la pêche du bord" },
  { value: "intermediaire", label: "Intermédiaire", desc: "Je connais les bases, je progresse" },
  { value: "expert", label: "Expert", desc: "Je maîtrise plusieurs techniques" },
];

// FREQUENCY_LABELS importé depuis @/lib/labels — source unique partagée avec profil/actions.

/* ─── Schemas Zod par étape ──────────────────────────────────────────────── */

const step1Schema = z.object({
  username: z
    .string()
    .min(3, "Minimum 3 caractères.")
    .max(30, "Maximum 30 caractères.")
    .regex(USERNAME_REGEX, "Lettres, chiffres, -, _ et . uniquement."),
});

const step2Schema = z.object({
  city: z.string().min(1, "Indique ta ville."),
  home_department: z.string().min(1, "Choisis ton département."),
});

const step6Schema = z.object({
  fishing_frequency: z.string().min(1, "Choisis ta fréquence."),
  years_practicing: z
    .number()
    .int()
    .min(0, "0 minimum.")
    .max(70, "70 maximum."),
});

/* ─── Composant chips multi-select ──────────────────────────────────────── */

function ChipSelect({
  options,
  selected,
  onChange,
  label,
}: {
  options: { value: string; label: string }[];
  selected: string[];
  onChange: (v: string[]) => void;
  label: string;
}) {
  function toggle(value: string) {
    if (selected.includes(value)) {
      onChange(selected.filter((v) => v !== value));
    } else {
      onChange([...selected, value]);
    }
  }

  return (
    <div>
      <p className="text-[14px] font-semibold text-ink-900 mb-3">{label}</p>
      <div className="flex flex-wrap gap-2">
        {options.map((opt) => {
          const active = selected.includes(opt.value);
          return (
            <button
              key={opt.value}
              type="button"
              onClick={() => toggle(opt.value)}
              className="flex items-center gap-1.5 px-4 py-2.5 rounded-full text-[14px] font-medium transition-all min-h-[44px] border"
              style={
                active
                  ? {
                      background: "var(--navy-900)",
                      color: "#fff",
                      borderColor: "var(--navy-900)",
                    }
                  : {
                      background: "#fff",
                      color: "var(--ink-700)",
                      borderColor: "var(--ink-200)",
                    }
              }
            >
              {active && <Check size={13} />}
              {opt.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

/* ─── Indicateur de statut username ─────────────────────────────────────── */

function UsernameStatus({
  status,
}: {
  status: "idle" | "checking" | "available" | "taken" | "invalid";
}) {
  if (status === "idle") return null;
  if (status === "checking")
    return <p className="text-[12px] text-ink-500 mt-1">Vérification…</p>;
  if (status === "available")
    return (
      <p className="inline-flex items-center gap-1 text-[12px] text-teal-600 font-medium mt-1">
        <Check size={13} aria-hidden />
        Pseudo disponible
      </p>
    );
  if (status === "taken")
    return (
      <p className="text-[12px] text-coral-500 font-medium mt-1">
        Ce pseudo est déjà pris.
      </p>
    );
  return null;
}

/* ─── Props ──────────────────────────────────────────────────────────────── */

type ProfileSnapshot = {
  username?: string | null;
  city?: string | null;
  home_department?: string | null;
  techniques?: string[] | null;
  favorite_species?: string[] | null;
  level?: string | null;
  fishing_frequency?: string | null;
  years_practicing?: number | null;
};

/* ─── Composant principal ────────────────────────────────────────────────── */

export function OnboardingStep({
  step,
  totalSteps,
  profile,
}: {
  step: number;
  totalSteps: number;
  profile: ProfileSnapshot;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [saving, setSaving] = useState(false);
  // Le bouton reste occupé pendant l'écriture serveur ET pendant la nav RSC.
  const loading = saving || isPending;

  // Étape 1 — username
  const [usernameStatus, setUsernameStatus] = useState<
    "idle" | "checking" | "available" | "taken" | "invalid"
  >("idle");
  const form1 = useForm({ resolver: zodResolver(step1Schema), defaultValues: { username: profile.username ?? "" } });
  const watchedUsername = form1.watch("username");

  const verifyUsername = useCallback(
    async (value: string) => {
      if (!step1Schema.shape.username.safeParse(value).success) {
        setUsernameStatus("invalid");
        return;
      }
      setUsernameStatus("checking");
      const result = await checkUsernameAvailable(value);
      setUsernameStatus(result.available ? "available" : "taken");
    },
    []
  );

  useEffect(() => {
    if (!watchedUsername || step !== 1) return;
    const timer = setTimeout(() => verifyUsername(watchedUsername), 500);
    return () => clearTimeout(timer);
  }, [watchedUsername, step, verifyUsername]);

  // Précharge le payload RSC de l'étape suivante pour réduire la latence du push.
  useEffect(() => {
    if (step < totalSteps) router.prefetch(`/onboarding/${step + 1}`);
    else router.prefetch("/onboarding/fini");
  }, [step, totalSteps, router]);

  // Étape 2 — ville + département
  const form2 = useForm({
    resolver: zodResolver(step2Schema),
    defaultValues: {
      city: profile.city ?? "",
      home_department: profile.home_department ?? "",
    },
  });

  // Étape 3 — techniques
  const [techniques, setTechniques] = useState<string[]>(profile.techniques ?? []);

  // Étape 4 — espèces
  const [species, setSpecies] = useState<string[]>(profile.favorite_species ?? []);

  // Étape 5 — niveau
  const [level, setLevel] = useState<string>(profile.level ?? "");

  // Étape 6 — fréquence + années
  const form6 = useForm({
    resolver: zodResolver(step6Schema),
    defaultValues: {
      fishing_frequency: profile.fishing_frequency ?? "",
      years_practicing: profile.years_practicing ?? 0,
    },
  });

  /* ── Soumission par étape ─────────────────────────────────────────────── */

  async function handleStep1(values: { username: string }) {
    if (usernameStatus === "taken") {
      form1.setError("username", { message: "Ce pseudo est déjà pris." });
      return;
    }
    setSaving(true);
    const result = await saveOnboardingStep(1, { username: values.username });
    setSaving(false);
    if (result.error) {
      toast.error("Oups, une erreur. Réessaie ?");
      return;
    }
    startTransition(() => router.push("/onboarding/2"));
  }

  async function handleStep2(values: { city: string; home_department: string }) {
    setSaving(true);
    const result = await saveOnboardingStep(2, {
      city: values.city,
      home_department: values.home_department,
    });
    setSaving(false);
    if (result.error) { toast.error("Oups, une erreur. Réessaie ?"); return; }
    startTransition(() => router.push("/onboarding/3"));
  }

  async function handleStep3() {
    if (techniques.length === 0) {
      toast.error("Choisis au moins une technique.");
      return;
    }
    setSaving(true);
    const result = await saveOnboardingStep(3, { techniques });
    setSaving(false);
    if (result.error) { toast.error("Oups, une erreur. Réessaie ?"); return; }
    startTransition(() => router.push("/onboarding/4"));
  }

  async function handleStep4() {
    if (species.length === 0) {
      toast.error("Choisis au moins une espèce.");
      return;
    }
    setSaving(true);
    const result = await saveOnboardingStep(4, { favorite_species: species });
    setSaving(false);
    if (result.error) { toast.error("Oups, une erreur. Réessaie ?"); return; }
    startTransition(() => router.push("/onboarding/5"));
  }

  async function handleStep5() {
    if (!level) {
      toast.error("Indique ton niveau.");
      return;
    }
    setSaving(true);
    const result = await saveOnboardingStep(5, { level });
    setSaving(false);
    if (result.error) { toast.error("Oups, une erreur. Réessaie ?"); return; }
    startTransition(() => router.push("/onboarding/6"));
  }

  async function handleStep6(values: { fishing_frequency: string; years_practicing: number }) {
    setSaving(true);
    const result = await completeOnboarding({
      fishing_frequency: values.fishing_frequency,
      years_practicing: values.years_practicing,
    });
    setSaving(false);
    if (result.error) { toast.error("Oups, une erreur. Réessaie ?"); return; }
    // Écran final « Ton carnet est prêt » (DA v2, frame 07) — remplace le toast.
    startTransition(() => router.push("/onboarding/fini"));
  }

  /* ── Rendu ────────────────────────────────────────────────────────────── */

  return (
    <div className="min-h-screen bg-sand-50 flex flex-col">
      {/* Header progress — segments DA v2 + label mono (réf onboarding.html) */}
      <header className="px-5 pt-6 pb-4 max-w-[520px] mx-auto w-full">
        <div className="mb-3 flex items-center justify-between">
          <span className="font-mono text-[11.5px] font-medium uppercase tracking-[0.08em] text-ink-400">
            ÉTAPE {String(step).padStart(2, "0")}/{String(totalSteps).padStart(2, "0")}
          </span>
          <span className="font-mono text-[11.5px] font-medium tracking-[0.08em] text-teal-600">
            {Math.round((step / totalSteps) * 100)}%
          </span>
        </div>
        <div
          className="flex gap-1.5"
          role="progressbar"
          aria-valuemin={1}
          aria-valuemax={totalSteps}
          aria-valuenow={step}
          aria-label={`Étape ${step} sur ${totalSteps}`}
        >
          {Array.from({ length: totalSteps }, (_, i) => (
            <div
              key={i}
              className={`h-1.5 flex-1 rounded-full ${i < step ? "bg-teal-500" : "bg-sand-200"}`}
            />
          ))}
        </div>
      </header>

      {/* Contenu */}
      <main className="flex-1 px-5 py-6 max-w-[520px] mx-auto w-full">
        {step === 1 && (
          <StepWrapper
            title="Choisis ton pseudo"
            subtitle="C’est le nom que la communauté verra. Tu peux le changer plus tard."
          >
            <Form {...form1}>
              <form onSubmit={form1.handleSubmit(handleStep1)} className="flex flex-col gap-5">
                <FormField
                  control={form1.control}
                  name="username"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-[14px] font-semibold">Ton pseudo</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="ex. barpecheur29"
                          autoComplete="username"
                          autoFocus
                          className="min-h-[52px] rounded-[12px] text-[16px]"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                      <UsernameStatus status={usernameStatus} />
                      <p className="text-[12px] text-ink-500">
                        3-30 caractères, lettres, chiffres, - et _.
                      </p>
                    </FormItem>
                  )}
                />
                <SubmitButton loading={loading} />
              </form>
            </Form>
          </StepWrapper>
        )}

        {step === 2 && (
          <StepWrapper
            title="D’où tu pêches ?"
            subtitle="Ton département principal pour personnaliser les spots et les conditions."
          >
            <Form {...form2}>
              <form onSubmit={form2.handleSubmit(handleStep2)} className="flex flex-col gap-5">
                <FormField
                  control={form2.control}
                  name="city"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-[14px] font-semibold">Ta ville</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="ex. Brest"
                          autoFocus
                          className="min-h-[52px] rounded-[12px] text-[16px]"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form2.control}
                  name="home_department"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-[14px] font-semibold">Département principal</FormLabel>
                      <FormControl>
                        <select
                          className="w-full min-h-[52px] rounded-[12px] border border-input bg-white px-3 text-[15px] text-ink-900 focus:outline-none focus:ring-2 focus:ring-teal-500"
                          {...field}
                        >
                          <option value="">Sélectionne ton département</option>
                          {DEPARTMENT_OPTIONS.map((d) => (
                            <option key={d.code} value={d.code}>{d.label}</option>
                          ))}
                        </select>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <SubmitButton loading={loading} />
              </form>
            </Form>
          </StepWrapper>
        )}

        {step === 3 && (
          <StepWrapper
            title="Tes techniques"
            subtitle="Comment tu pêches le plus souvent ? Tu peux en choisir plusieurs."
          >
            <div className="flex flex-col gap-6">
              <ChipSelect
                options={TECHNIQUES}
                selected={techniques}
                onChange={setTechniques}
                label="Tes techniques principales"
              />
              <SubmitButton
                loading={loading}
                onClick={handleStep3}
                disabled={techniques.length === 0}
              />
            </div>
          </StepWrapper>
        )}

        {step === 4 && (
          <StepWrapper
            title="Tes espèces favorites"
            subtitle="Quelles espèces est-ce que tu chasses en priorité ?"
          >
            <div className="flex flex-col gap-6">
              <ChipSelect
                options={SPECIES_OPTIONS}
                selected={species}
                onChange={setSpecies}
                label="Tes espèces cibles"
              />
              <SubmitButton
                loading={loading}
                onClick={handleStep4}
                disabled={species.length === 0}
              />
            </div>
          </StepWrapper>
        )}

        {step === 5 && (
          <StepWrapper
            title="Ton niveau"
            subtitle="Honnêtement, pour calibrer tes suggestions de spots et de techniques."
          >
            <div className="flex flex-col gap-5">
              <div className="flex flex-col gap-3">
                {LEVELS.map((l) => (
                  <button
                    key={l.value}
                    type="button"
                    onClick={() => setLevel(l.value)}
                    className="flex items-center gap-4 p-4 rounded-[14px] border text-left transition-all min-h-[64px]"
                    style={
                      level === l.value
                        ? {
                            background: "rgba(10,47,61,.04)",
                            borderColor: "var(--navy-900)",
                          }
                        : {
                            background: "#fff",
                            borderColor: "var(--ink-200)",
                          }
                    }
                  >
                    <div
                      className="w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0"
                      style={{
                        borderColor: level === l.value ? "var(--navy-900)" : "var(--ink-300)",
                        background: level === l.value ? "var(--navy-900)" : "transparent",
                      }}
                    >
                      {level === l.value && (
                        <div className="w-2 h-2 rounded-full bg-white" />
                      )}
                    </div>
                    <div>
                      <div className="font-semibold text-[15px] text-ink-900">{l.label}</div>
                      <div className="text-[13px] text-ink-500 mt-0.5">{l.desc}</div>
                    </div>
                  </button>
                ))}
              </div>
              <SubmitButton
                loading={loading}
                onClick={handleStep5}
                disabled={!level}
              />
            </div>
          </StepWrapper>
        )}

        {step === 6 && (
          <StepWrapper
            title="Ta fréquence de pêche"
            subtitle="Dernière question, promis !"
          >
            <Form {...form6}>
              <form onSubmit={form6.handleSubmit(handleStep6)} className="flex flex-col gap-6">
                <div>
                  <p className="text-[14px] font-semibold text-ink-900 mb-3">
                    À quelle fréquence tu pêches ?
                  </p>
                  <div className="flex flex-col gap-3">
                    {FREQUENCY_LABELS.map((f) => {
                      const current = form6.watch("fishing_frequency");
                      return (
                        <button
                          key={f.value}
                          type="button"
                          onClick={() => form6.setValue("fishing_frequency", f.value)}
                          className="flex items-center gap-4 p-4 rounded-[14px] border text-left transition-all min-h-[56px]"
                          style={
                            current === f.value
                              ? { background: "rgba(10,47,61,.04)", borderColor: "var(--navy-900)" }
                              : { background: "#fff", borderColor: "var(--ink-200)" }
                          }
                        >
                          <div
                            className="w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0"
                            style={{
                              borderColor: current === f.value ? "var(--navy-900)" : "var(--ink-300)",
                              background: current === f.value ? "var(--navy-900)" : "transparent",
                            }}
                          >
                            {current === f.value && <div className="w-2 h-2 rounded-full bg-white" />}
                          </div>
                          <span className="font-medium text-[14px] text-ink-900">{f.label}</span>
                        </button>
                      );
                    })}
                  </div>
                  {form6.formState.errors.fishing_frequency && (
                    <p className="text-[12px] text-coral-500 mt-1">
                      {form6.formState.errors.fishing_frequency.message}
                    </p>
                  )}
                </div>

                <FormField
                  control={form6.control}
                  name="years_practicing"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-[14px] font-semibold">
                        Depuis combien d&apos;années tu pêches ?
                      </FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min={0}
                          max={70}
                          placeholder="ex. 5"
                          className="min-h-[52px] rounded-[12px] text-[16px] w-28 font-mono"
                          value={field.value as number}
                          onChange={(e) =>
                            field.onChange(parseInt(e.target.value, 10) || 0)
                          }
                          onBlur={field.onBlur}
                          name={field.name}
                          ref={field.ref}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <Button
                  type="submit"
                  disabled={loading}
                  className="min-h-[56px] rounded-full text-[16px] font-semibold w-full"
                  style={{
                    background: "linear-gradient(135deg, var(--navy-900), var(--teal-600))",
                    color: "#fff",
                    boxShadow: "var(--shadow-lg)",
                  }}
                >
                  {loading ? (
                    <><Loader2 size={16} className="animate-spin mr-2" />Création…</>
                  ) : (
                    <>Créer mon carnet <ChevronRight size={16} className="ml-1" /></>
                  )}
                </Button>
              </form>
            </Form>
          </StepWrapper>
        )}
      </main>
    </div>
  );
}

/* ─── Helpers UI ─────────────────────────────────────────────────────────── */

function StepWrapper({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-[26px] sm:text-[30px] mb-2">{title}</h1>
        <p className="text-ink-500 text-[15px] leading-relaxed">{subtitle}</p>
      </div>
      {children}
    </div>
  );
}

function SubmitButton({
  loading = false,
  onClick,
  disabled = false,
}: {
  loading?: boolean;
  onClick?: () => void;
  disabled?: boolean;
}) {
  return (
    <Button
      type={onClick ? "button" : "submit"}
      onClick={onClick}
      disabled={loading || disabled}
      className="min-h-[52px] rounded-full text-[15px] font-semibold w-full"
      style={{
        background: disabled ? "var(--ink-200)" : "var(--navy-900)",
        color: disabled ? "var(--ink-500)" : "#fff",
        boxShadow: disabled ? "none" : "var(--shadow-sm)",
      }}
    >
      {loading ? (
        <><Loader2 size={16} className="animate-spin mr-2" />Enregistrement…</>
      ) : (
        <>Continuer <ChevronRight size={16} className="ml-1" /></>
      )}
    </Button>
  );
}
