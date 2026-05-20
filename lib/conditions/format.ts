/** Convertit des degrés en direction cardinale (16 points). */
export function degreesToCompass(deg: number): string {
  const dirs = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE', 'S', 'SSO', 'SO', 'OSO', 'O', 'ONO', 'NO', 'NNO']
  return dirs[Math.round(deg / 22.5) % 16]
}

/** Label qualitatif Beaufort à partir de km/h. */
export function beaufortLabel(kmh: number): string {
  if (kmh < 2)  return 'Calme'
  if (kmh < 12) return 'Légère brise'
  if (kmh < 20) return 'Petite brise'
  if (kmh < 29) return 'Jolie brise'
  if (kmh < 39) return 'Brise modérée'
  if (kmh < 50) return 'Bonne brise'
  if (kmh < 62) return 'Vent frais'
  if (kmh < 75) return 'Grand frais'
  return 'Coup de vent'
}

/** Label qualitatif pour la hauteur de vagues. */
export function waveLabel(m: number): string {
  if (m < 0.1)  return 'Plate'
  if (m < 0.5)  return 'Ridée'
  if (m < 1.25) return 'Belle'
  if (m < 2.5)  return 'Peu agitée'
  if (m < 4)    return 'Agitée'
  return 'Forte mer'
}
