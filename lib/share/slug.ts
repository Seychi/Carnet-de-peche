import { randomBytes } from 'node:crypto'

// Alphabet base62 (0-9 a-z A-Z) — URL-safe, sans caractère ambigu de ponctuation.
const BASE62 = '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ'

/**
 * Slug aléatoire NON ÉNUMÉRABLE pour les cartes de partage (/c/[slug]).
 * 12 caractères base62 ≈ 62^12 ≈ 3,2 × 10^21 combinaisons → impossible à deviner /
 * scanner. Généré via crypto.randomBytes (runtime server, PAS edge). On tire chaque
 * caractère par rejection sampling pour éviter le biais modulo (256 % 62 ≠ 0).
 */
export function generateShareSlug(length = 12): string {
  let out = ''
  while (out.length < length) {
    for (const byte of randomBytes(length)) {
      if (byte < 248) {
        // 248 = 62 * 4 : on rejette les 8 valeurs hautes pour rester non biaisé.
        out += BASE62[byte % 62]
        if (out.length === length) break
      }
    }
  }
  return out
}
