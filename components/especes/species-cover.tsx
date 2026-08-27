import Image from 'next/image'
import { Fish } from 'lucide-react'
import type { ReactNode } from 'react'
import { Bathy } from '@/components/ui-v2/bathy'
import { speciesCover } from '@/lib/especes/covers'
import type { SpeciesSlug } from '@/lib/seo/programmatic'
import { cn } from '@/lib/utils'

/**
 * Couverture d'une fiche espèce : la planche si elle existe, l'ancien motif
 * (isobathes + icône) sinon.
 *
 * Le fallback n'est PAS temporaire. Les planches arrivent par lots au fil des
 * générations et le référentiel SPECIES continuera de bouger : une espèce sans
 * visuel doit rester une carte normale, jamais un trou. `speciesCover` retourne
 * null, on retombe sur le rendu d'avant.
 *
 * Ratio figé en CSS (`aspect-[16/9]`) et image en `fill` : la boîte est réservée
 * avant le premier octet d'image, donc le CLS reste nul — c'était la propriété
 * que la page /especes tenait en n'ayant aucune image, on la garde en en ayant.
 *
 * `alt=""` volontaire : le nom de l'espèce est déjà rendu en texte juste à côté
 * (titre de carte, H1 de fiche). Une alternative qui le répéterait ferait dire
 * deux fois la même chose à un lecteur d'écran. Les planches sont ici de la
 * DÉCORATION, pas des documents d'identification — plusieurs sont d'ailleurs
 * approximatives (cf QA du 27/08) : leur faire porter une affirmation
 * « ceci est un X » dans le texte alternatif serait faux.
 */
export function SpeciesCover({
  slug,
  sizes,
  priority = false,
  className,
  imageClassName,
  children,
}: {
  slug: SpeciesSlug
  /** Obligatoire dès qu'on est en `fill` : sans lui Next sert du 100vw à tout le monde. */
  sizes: string
  /** À réserver aux couvertures réellement au-dessus de la ligne de flottaison. */
  priority?: boolean
  className?: string
  imageClassName?: string
  /** Surcouches de la carte (badge latin…), rendues au-dessus de la planche. */
  children?: ReactNode
}) {
  const src = speciesCover(slug)
  return (
    <div
      className={cn(
        'relative aspect-[16/9] overflow-hidden bg-gradient-to-br from-navy-800 to-navy-950',
        className,
      )}
    >
      <Bathy density={3} opacity={0.4} />
      {src ? (
        <Image
          src={src}
          alt=""
          fill
          sizes={sizes}
          priority={priority}
          // Les marges du cadrage sont cuites dans le canevas 1200×675 par
          // scripts/build-species-images.mjs : pas de padding ici, sinon elles
          // se cumulent et la planche rétrécit.
          className={cn('object-contain', imageClassName)}
        />
      ) : (
        <Fish
          size={32}
          strokeWidth={1.7}
          className="absolute inset-0 m-auto text-teal-300/60"
          aria-hidden="true"
        />
      )}
      {/* Voile bas : sans lui, la nageoire anale d'un sar ou les tentacules d'une
          seiche passent derrière l'étiquette latine et la rendent illisible
          (constaté au rendu, 27/08). Uniquement quand il y a une planche ET une
          surcouche — le motif de repli est centré, il ne touche jamais le bas. */}
      {src && children ? (
        <div
          aria-hidden="true"
          className="absolute inset-x-0 bottom-0 h-14 bg-gradient-to-t from-navy-950/85 to-transparent"
        />
      ) : null}
      {children}
    </div>
  )
}

/**
 * Filigrane de la planche dans le hero d'une fiche espèce.
 *
 * Contrainte non négociable (sprint 75 Bloc 2) : le hero fait remonter la maille
 * et le statut du jour AU-DESSUS de l'intro parce qu'en 390 px — 82 % du trafic —
 * tout ce qui passe après est hors écran. Une illustration insérée dans le flux
 * repousserait cette réponse vers le bas et annulerait le gain.
 *
 * D'où ce parti : hors flux (`absolute`), masqué sous `lg`, opacité basse et
 * fondu vers la gauche. Sur mobile il ne se passe donc RIEN, et sur grand écran
 * la planche habille la marge droite sans disputer la lecture.
 */
export function SpeciesHeroArt({ slug }: { slug: SpeciesSlug }) {
  const src = speciesCover(slug)
  if (!src) return null
  return (
    <div
      aria-hidden="true"
      // Seuil à xl (1280 px) et pas lg : le contenu du hero fait 980 px de large,
      // il ne reste donc AUCUNE marge libre avant 1280 px. Testé à 1024 px — le
      // poisson passait sous l'intro. Largeur 520 + décalage -60 + fondu sur les
      // 55 % gauche : la partie visible commence au bord de la colonne de texte.
      className="pointer-events-none absolute -right-[60px] top-1/2 hidden h-[300px] w-[520px] -translate-y-1/2 xl:block"
      style={{
        maskImage: 'linear-gradient(to right, transparent, black 55%)',
        WebkitMaskImage: 'linear-gradient(to right, transparent, black 55%)',
      }}
    >
      <Image src={src} alt="" fill sizes="520px" className="object-contain opacity-25" />
    </div>
  )
}
