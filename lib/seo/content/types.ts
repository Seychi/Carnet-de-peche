import type { Facade, TechniqueSlug } from '@/lib/seo/programmatic'

/**
 * Contenu éditorial des pages programmatiques (sprint 10 Bloc 2).
 * Rédigé une fois par espèce, assemblé par le template selon la combinaison
 * espèce × technique × département. Voix pêcheur, tutoiement.
 */
export type SpeciesContent = {
  /** Présentation de l'espèce du bord (2-3 paragraphes, ~150 mots). */
  intro: string[]
  /** Conseils spécifiques espèce × technique (~250 mots + liste matos/gestes). */
  techniques: Partial<
    Record<
      TechniqueSlug,
      {
        paragraphs: string[]
        bullets: string[]
        /** Quand pratiquer cette technique sur cette espèce (1-2 phrases). */
        seasonNote: string
      }
    >
  >
  /** Spécificités par façade (~80 mots chacune) — injectées sur les pages départementales. */
  facades: Record<Facade, string>
  /** Marées et conditions favorables pour l'espèce (~100 mots). */
  conditions: string
}
