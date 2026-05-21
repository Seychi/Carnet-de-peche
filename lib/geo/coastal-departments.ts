// Départements côtiers de France métropolitaine (v1).
// Sert de whitelist pour le fil régional : on ne poste/lit que sur un de ces depts.
// DOM exclus en v1 (Stripe Tax + couverture données) — laissés commentés.
export const COASTAL_DEPARTMENTS = [
  '06', '13', '14', '17', '22', '29', '30', '33', '34', '35', '40', '44', '50',
  '56', '59', '62', '64', '66', '76', '80', '83', '85', '2A', '2B',
  // '971', '972', '973', '974', '976',
] as const

export type CoastalDepartment = (typeof COASTAL_DEPARTMENTS)[number]

export function isCoastalDepartment(dept: string): dept is CoastalDepartment {
  return (COASTAL_DEPARTMENTS as readonly string[]).includes(dept)
}
