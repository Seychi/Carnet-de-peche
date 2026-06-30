'use client'

import { useActionState, useEffect, useRef } from 'react'
import { toast } from 'sonner'

// Résultat minimal commun aux server actions de modération. feed.ts et spots.ts
// renvoient des ActionResult structurellement compatibles (ok + error).
export type ModResult = { ok: true } | { ok: false; error: string }

// Form de modération qui SURFACE le résultat (sprint 52 WS-C). Avant, les wrappers
// 'use server' avalaient l'ActionResult : un échec (post déjà supprimé, session
// perdue, RLS) ne donnait AUCUN retour (« le bouton ne fait rien »). Ici
// useActionState récupère le résultat et on toast succès/erreur. Le geste reste un
// vrai submit de form vers une server action.
//
// Daltonisme : le retour passe par un toast TEXTE (sonner richColors ajoute la
// couleur en plus, jamais à la place du texte).
export function ModActionForm({
  action,
  hidden,
  successMessage,
  className,
  title,
  children,
}: {
  action: (prev: ModResult | null, formData: FormData) => Promise<ModResult>
  hidden: Record<string, string>
  successMessage: string
  className?: string
  title?: string
  children: React.ReactNode
}) {
  const [state, formAction, pending] = useActionState(action, null)
  const handled = useRef<ModResult | null>(null)

  useEffect(() => {
    if (!state || state === handled.current) return
    handled.current = state
    if (state.ok) toast.success(successMessage)
    else toast.error(state.error)
  }, [state, successMessage])

  return (
    <form action={formAction}>
      {Object.entries(hidden).map(([name, value]) => (
        <input key={name} type="hidden" name={name} value={value} />
      ))}
      <button type="submit" disabled={pending} title={title} className={className}>
        {children}
      </button>
    </form>
  )
}
