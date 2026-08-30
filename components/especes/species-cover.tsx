import Image from 'next/image'
import { Fish } from 'lucide-react'
import type { ReactNode } from 'react'
import { Bathy } from '@/components/ui-v2/bathy'
import { speciesCover } from '@/lib/especes/covers'
import { speciesCoverAlt } from '@/lib/especes/cover-lookup'
import { SPECIES, type SpeciesSlug } from '@/lib/seo/programmatic'
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
 * Les planches portent un `alt` DESCRIPTIF (cf `speciesCoverAlt`). Elles avaient
 * d'abord `alt=""` — correct pour un lecteur d'écran, le nom étant déjà en texte
 * juste à côté — mais c'était renoncer au premier signal de la recherche
 * d'images. Arbitrage assumé le 27/08 : une petite redondance à l'oral contre la
 * seule chance qu'a Google de savoir ce que montre le fichier.
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
          alt={speciesCoverAlt(slug)}
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
 * Planche de l'espèce sur sa fiche, avec sa légende.
 *
 * Elle a d'abord été posée en FILIGRANE hors flux, masqué sous 1280 px, pour ne
 * pas repousser la réponse (maille, statut du jour) que le sprint 75 Bloc 2 fait
 * remonter en tête. Le filigrane tenait cette contrainte mais était invisible
 * pour Google : l'indexation est mobile-first, et sous `lg` l'élément était en
 * `display:none`. La page qui vise réellement « lieu jaune » ou « congre »
 * n'avait donc AUCUNE image indexable.
 *
 * D'où cette figure : visible à toutes les tailles, mais placée APRÈS la carte
 * d'identité. La réponse ne bouge pas d'un pixel, et l'image gagne un contexte
 * textuel — la légende, que Google utilise explicitement pour comprendre le sujet
 * d'une image.
 */
export function SpeciesPlate({ slug }: { slug: SpeciesSlug }) {
  const src = speciesCover(slug)
  if (!src) return null
  const meta = SPECIES[slug]
  return (
    <figure className="mt-8 max-w-md">
      <div className="relative aspect-[16/9] overflow-hidden rounded-[14px] border border-white/10 bg-navy-900/50">
        <Image
          src={src}
          alt={speciesCoverAlt(slug)}
          fill
          sizes="(max-width: 640px) 100vw, 448px"
          className="object-contain"
        />
      </div>
      <figcaption className="mt-2.5 text-[12.5px] leading-relaxed text-white/45">
        {meta.article}
        {meta.labelLower} (<span className="italic">{meta.latin}</span>) — illustration de
        référence, pas une photo de prise.
      </figcaption>
    </figure>
  )
}
