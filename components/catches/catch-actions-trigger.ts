// Classe du bouton « ⋯ » de la fiche prise, partagée entre le bouton
// placeholder (rendu avant le chargement du chunk lazy) et le vrai trigger
// Base UI dans CatchActionsDropdown — les deux doivent être identiques au
// pixel pour que le swap soit invisible (sprint 11 Bloc F).
export const catchActionsTriggerClass =
  'flex items-center justify-center w-9 h-9 rounded-full text-ink-500 hover:bg-slate-100 transition-colors'
