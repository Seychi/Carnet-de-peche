import type { QualityLevel } from '@/lib/solunar/types'

// Style des niveaux de qualité solunar — SOURCE UNIQUE (badges + texte).
// Couleurs CIVIDIS alignées sur les markers carte (`QUALITY_MARKER_COLORS` de
// lib/map/utils) : colorblind-safe, l'info passe par la luminosité (pas la teinte).
// Toujours accompagnées d'un libellé et/ou d'un chiffre → la couleur ne porte
// jamais l'info seule.

export const QUALITY_LABELS: Record<QualityLevel, string> = {
  faible: 'Faible',
  moyenne: 'Moyenne',
  bonne: 'Bonne',
  tres_bonne: 'Très Bonne',
  exceptionnelle: 'Exceptionnelle',
}

// Badge PLEIN (pastille score, pill libellé) : fond cividis + texte contrasté
// (clair sur fonds foncés faible/moyenne/bonne, foncé sur clairs olive/jaune).
export const QUALITY_BADGE_CLS: Record<QualityLevel, string> = {
  faible:         'bg-[#00224E] text-white',
  moyenne:        'bg-[#414D6B] text-white',
  bonne:          'bg-[#7D7C78] text-white',
  tres_bonne:     'bg-[#BCAF6F] text-[#00224E]',
  exceptionnelle: 'bg-[#FEE838] text-[#00224E]',
}

// Couleur de TEXTE sur fond clair : même famille cividis (navy → bleu-gris →
// gris → olive → or), assombrie pour rester lisible (contraste AA) sur les
// niveaux clairs.
export const QUALITY_TEXT_CLS: Record<QualityLevel, string> = {
  faible:         'text-[#00224E]',
  moyenne:        'text-[#414D6B]',
  bonne:          'text-[#5C5B58]',
  tres_bonne:     'text-[#6E6428]',
  exceptionnelle: 'text-[#7A6500]',
}
