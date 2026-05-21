"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import "@/lib/zod-config";
import { z } from "zod";
import { toast } from "sonner";
import { Loader2, Check, ChevronRight } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { saveOnboardingStep, checkUsernameAvailable, completeOnboarding } from "../actions";

/* ─── Constantes ─────────────────────────────────────────────────────────── */

const DEPARTMENTS = [
  { code: "06", label: "06 — Alpes-Maritimes" },
  { code: "11", label: "11 — Aude" },
  { code: "13", label: "13 — Bouches-du-Rhône" },
  { code: "14", label: "14 — Calvados" },
  { code: "17", label: "17 — Charente-Maritime" },
  { code: "22", label: "22 — Côtes-d'Armor" },
  { code: "29", label: "29 — Finistère" },
  { code: "30", label: "30 — Gard" },
  { code: "33", label: "33 — Gironde" },
  { code: "34", label: "34 — Hérault" },
  { code: "35", label: "35 — Ille-et-Vilaine" },
  { code: "40", label: "40 — Landes" },
  { code: "44", label: "44 — Loire-Atlantique" },
  { code: "50", label: "50 — Manche" },
  { code: "56", label: "56 — Morbihan" },
  { code: "59", label: "59 — Nord" },
  { code: "62", label: "62 — Pas-de-Calais" },
  { code: "64", label: "64 — Pyrénées-Atlantiques" },
  { code: "66", label: "66 — Pyrénées-Orientales" },
  { code: "76", label: "76 — Seine-Maritime" },
  { code: "83", label: "83 — Var" },
  { code: "85", label: "85 — Vendée" },
  { code: "2A", label: "2A — Corse-du-Sud" },
  { code: "2B", label: "2B — Haute-Corse" },
];

const TECHNIQUES = [
  { value: "leurres", label: "Leurres" },
  { value: "surfcasting", label: "Surfcasting" },
  { value: "flottante", label: "Flottante" },
  { value: "vif", label: "Vif" },
];

const SPECIES = [
  { value: "bar", label: "Bar" },
  { value: "dorade_royale", label: "Dorade royale" },
  { value: "lieu_jaune", label: "Lieu jaune" },
  { value: "maquereau", label: "Maquereau" },
  { value: "sar", label: "Sar" },
  { value: "orphie", label: "Orphie" },
];

const LEVELS = [
  { value: "debutant", label: "Débutant", desc: "Je découvre la pêche du bord" },
  { value: "intermediaire", label: "Intermédiaire", desc: "Je connais les bases, je progresse" },
  { value: "expert", label: "Expert", desc: "Je maîtrise plusieurs techniques" },
];

const FREQUENCIES = [
  { value: "rare", label: "Quelques fois par an", desc: "Rare" },
  { value: "seasonal", label: "Saisonnièrement", desc: "Saisonnier" },
  { value: "weekly", label: "Toutes les semaines", desc: "Hebdomadaire" },
  { value: "daily", label: "Plusieurs fois par semaine", desc: "Intensif" },
];

/* ─── Schemas Zod par étape ──────────────────────────────────────────────── */

const step1Schema = z.object({
  username: z
    .string()
    .min(3, "Minimum 3 caractères.")
    .max(30, "Maximum 30 caractères.")
    .regex(/^[a-zA-Z0-9_-]+$/, "Lettres, chiffres, - et _ uniquement."),
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
      <p className="text-[12px] text-teal-600 font-medium mt-1">
        ✓ Pseudo disponible
      </p>
    );
  if (status === "taken")
    return (
      <p className="text-[12px] text-destructive font-medium mt-1">
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
  const [loading, setLoading] = useState(false);

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
    setLoading(true);
    const result = await saveOnboardingStep(1, { username: values.username });
    setLoading(false);
    if (result.error) {
      toast.error("Oups, une erreur. Réessaie ?");
      return;
    }
    router.push("/onboarding/2");
  }

  async function handleStep2(values: { city: string; home_department: string }) {
    setLoading(true);
    const result = await saveOnboardingStep(2, {
      city: values.city,
      home_department: values.home_department,
    });
    setLoading(false);
    if (result.error) { toast.error("Oups, une erreur. Réessaie ?"); return; }
    router.push("/onboarding/3");
  }

  async function handleStep3() {
    if (techniques.length === 0) {
      toast.error("Choisis au moins une technique.");
      return;
    }
    setLoading(true);
    const result = await saveOnboardingStep(3, { techniques });
    setLoading(false);
    if (result.error) { toast.error("Oups, une erreur. Réessaie ?"); return; }
    router.push("/onboarding/4");
  }

  async function handleStep4() {
    if (species.length === 0) {
      toast.error("Choisis au moins une espèce.");
      return;
    }
    setLoading(true);
    const result = await saveOnboardingStep(4, { favorite_species: species });
    setLoading(false);
    if (result.error) { toast.error("Oups, une erreur. Réessaie ?"); return; }
    router.push("/onboarding/5");
  }

  async function handleStep5() {
    if (!level) {
      toast.error("Indique ton niveau.");
      return;
    }
    setLoading(true);
    const result = await saveOnboardingStep(5, { level });
    setLoading(false);
    if (result.error) { toast.error("Oups, une erreur. Réessaie ?"); return; }
    router.push("/onboarding/6");
  }

  async function handleStep6(values: { fishing_frequency: string; years_practicing: number }) {
    setLoading(true);
    const result = await completeOnboarding({
      fishing_frequency: values.fishing_frequency,
      years_practicing: values.years_practicing,
    });
    setLoading(false);
    if (result.error) { toast.error("Oups, une erreur. Réessaie ?"); return; }
    toast.success("Ton carnet est prêt. Bonne pêche. 🎣");
    router.push("/home");
  }

  /* ── Rendu ────────────────────────────────────────────────────────────── */

  return (
    <div className="min-h-screen bg-sand-50 flex flex-col">
      {/* Header progress */}
      <header className="px-5 pt-6 pb-4 max-w-[520px] mx-auto w-full">
        <div className="flex items-center justify-between mb-3">
          <span className="text-[13px] font-semibold text-ink-500">
            {step}/{totalSteps}
          </span>
          <span className="text-[13px] text-ink-500">
            {Math.round((step / totalSteps) * 100)}%
          </span>
        </div>
        <Progress
          value={(step / totalSteps) * 100}
          className="h-2 rounded-full bg-ink-100"
        />
      </header>

      {/* Contenu */}
      <main className="flex-1 px-5 py-6 max-w-[520px] mx-auto w-full">
        {step === 1 && (
          <StepWrapper
            title="Choisis ton pseudo"
            subtitle="C'est le nom que la communauté verra. Tu peux le changer plus tard."
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
            title="D'où tu pêches ?"
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
                          {DEPARTMENTS.map((d) => (
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
            subtitle="Comment tu pêches le plus souvent ? Tu peux en choisir plusieurs."
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
            subtitle="Quelles espèces est-ce que tu chasses en priorité ?"
          >
            <div className="flex flex-col gap-6">
              <ChipSelect
                options={SPECIES}
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
            subtitle="Honnêtement — pour calibrer tes suggestions de spots et de techniques."
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
                    À quelle fréquence tu pêches ?
                  </p>
                  <div className="flex flex-col gap-3">
                    {FREQUENCIES.map((f) => {
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
                    <p className="text-[12px] text-destructive mt-1">
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
                        Depuis combien d&apos;années tu pêches ?
                      </FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min={0}
                          max={70}
                          placeholder="ex. 5"
                          className="min-h-[52px] rounded-[12px] text-[16px] w-28"
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
                    boxShadow: "0 6px 24px rgba(10,47,61,.18)",
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
        boxShadow: disabled ? "none" : "0 6px 24px rgba(10,47,61,.14)",
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
