import type { Facade, SpeciesSlug, TechniqueSlug } from '@/lib/seo/programmatic'

/**
 * Contenu des fiches espèces /especes/[slug] (sprint 10 Bloc 3 — riposte
 * directe Fishing Grid). Chaque fiche doit battre l'équivalent FG :
 * réglementation SOURCÉE et DATÉE par façade, saisons par façade,
 * techniques par saison, postes selon conditions. Cf checklist du brief.
 */
export type EspeceContent = {
  slug: SpeciesSlug
  /** Accroche + portrait de l'espèce vue du bord (2-3 §, ~200 mots). */
  intro: string[]
  identity: {
    famille: string
    /** « 30-50 cm du bord, 70 cm+ pour les beaux sujets » */
    tailleCourante: string
    tailleMax: string
    habitat: string
    regime: string
  }
  /** Réglementation VÉRIFIÉE — les chiffres sont injectés, ne jamais inventer. */
  regulation: {
    verifiedAt: string
    source: string
    /**
     * Maille (taille minimale de capture) en cm, par façade — DONNÉE structurée,
     * réutilisable (badge, carte, filtre, score). null = espèce non listée /
     * non réglementée sur cette façade.
     */
    minSizeCm: Record<Facade, number | null>
    /**
     * Marquage obligatoire (ablation de la partie inférieure de la nageoire
     * caudale, arrêté du 17 mai 2011 — liste limitative d'espèces).
     */
    marquage: boolean
    items: string[]
  }
  /** 4 saisons par façade : activité 1 (faible) → 3 (forte) + note concrète. */
  saisons: Record<Facade, { saison: string; activite: 1 | 2 | 3; note: string }[]>
  /** Techniques du bord, de la plus pertinente à l'occasionnelle. */
  techniques: { slug: TechniqueSlug; why: string }[]
  /** Postes et conditions : vent, houle, moment de marée (2-3 §). */
  postes: string[]
  /** Questions fréquentes (SEO People Also Ask). */
  faq: { q: string; a: string }[]
  /**
   * <title> écrit à la main, prioritaire sur la formule générique de `buildSpeciesTitle`
   * (sprint 77, Bloc 9). Réservé aux fiches où les requêtes GSC réelles sont dominées par
   * l'intention d'IDENTIFICATION (« congre poisson », « bluefish », « mulet poisson ») : la
   * formule « maille + saisons/spots » n'y capte pas le clic, il faut nommer explicitement
   * l'intention pêche (et, quand elle existe, l'appellation qui fait chercher la fiche).
   * Reste sous `TITLE_MAX_LENGTH` (vérifié par les tests, pas seulement écrit à la main).
   */
  seoTitle?: string
}
