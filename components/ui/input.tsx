import * as React from "react"

import { cn } from "@/lib/utils"

// Input HTML natif (et non @base-ui/react/input) : Base UI ne propage pas de
// façon fiable une valeur posée par programme (autofill navigateur,
// gestionnaire de mots de passe, Playwright .fill) vers le onChange standard
// — sur un champ contrôlé react-hook-form, l'état RHF restait vide et la
// valeur ne « tenait » pas. Un input natif déclenche onChange normalement.
// Mêmes classes/props → rendu identique.
function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        "h-8 w-full min-w-0 rounded-lg border border-input bg-transparent px-2.5 py-1 text-base transition-colors outline-none file:inline-flex file:h-6 file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:cursor-not-allowed disabled:bg-input/50 disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 md:text-sm dark:bg-input/30 dark:disabled:bg-input/80 dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40",
        className
      )}
      {...props}
    />
  )
}

export { Input }
