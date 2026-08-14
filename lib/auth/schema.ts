// Schémas de validation des formulaires d'authentification.
// Utilisés côté client (page.tsx) pour la validation live + au submit,
// en miroir de la validation serveur dans app/auth/login/actions.ts.
import '@/lib/zod-config'
import { z } from 'zod'

// ── Champs réutilisables ─────────────────────────────────────────────────────

const emailField = z
  .string()
  .trim()
  .min(1, "Ton email est requis pour continuer")
  .pipe(
    z.email(
      "Cet email n'a pas l'air valide — vérifie le format (ex : pecheur@exemple.fr)"
    )
  )

// Mot de passe à la création de compte : exigences complètes.
const newPasswordField = z
  .string()
  .min(1, "Choisis un mot de passe pour protéger ton compte")
  .min(8, "Au moins 8 caractères, c'est plus sûr")
  .regex(/\d/, "Inclus au moins un chiffre pour renforcer le mot de passe")

// ── Schémas par formulaire ───────────────────────────────────────────────────

export const signinSchema = z.object({
  email: emailField,
  password: z.string().min(1, "Saisis ton mot de passe"),
})

// Sprint 76, Bloc 3 : le champ « Confirme le mot de passe » a été retiré du
// formulaire (4 champs → 2). `PasswordInput` porte déjà un bouton d'affichage,
// c'est le standard et ça retire une friction sur le seul écran qui convertit.
// ⚠️ Le schéma DOIT suivre : `gateSubmit` valide `Object.fromEntries(FormData)`
// et un champ requis absent du DOM bloquerait tous les envois côté client.
export const signupSchema = z.object({
  email: emailField,
  password: newPasswordField,
})

export const emailOnlySchema = z.object({
  email: emailField,
})

export type FieldErrors = Record<string, string | undefined>

// Transforme un ZodError en map { champ → premier message }.
export function zodToFieldErrors(error: z.ZodError): FieldErrors {
  const out: FieldErrors = {}
  for (const issue of error.issues) {
    const key = String(issue.path[0] ?? '')
    if (key && !out[key]) out[key] = issue.message
  }
  return out
}
