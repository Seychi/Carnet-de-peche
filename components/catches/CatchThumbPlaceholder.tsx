import Image from 'next/image'
import { Fish } from 'lucide-react'
import { speciesCoverForDbKey } from '@/lib/especes/cover-lookup'

/**
 * Vignette d'une prise SANS photo : la planche de l'espèce plutôt qu'une icône.
 *
 * Une prise sans photo reste la majorité du carnet (on logue au bord, on
 * photographie rarement). Ces vignettes portaient toutes la même icône `Fish`,
 * donc une liste de prises était une colonne de losanges identiques : aucune
 * information, et rien qui distingue un maquereau d'une orphie au coup d'œil.
 * La planche de l'espèce donne la silhouette et la couleur, gratuitement — les
 * fichiers sont déjà servis pour /especes.
 *
 * Le repli sur l'icône reste nécessaire : `catches.species` est du texte libre
 * (import, valeurs anciennes), et toutes les espèces n'ont pas de planche.
 *
 * Fond navy identique dans les deux gabarits (ligne et carte) : les planches sont
 * détourées avec des ventres argentés qui disparaissent sur fond clair.
 */
export function CatchThumbPlaceholder({
  species,
  sizes,
  iconSize = 20,
}: {
  /** `catches.species` — clé DB en snake_case, ou n'importe quel texte. */
  species: string | null | undefined
  /** Largeur rendue de la vignette, pour le srcset (ex. « 56px »). */
  sizes: string
  iconSize?: number
}) {
  const src = speciesCoverForDbKey(species)
  return (
    <div className="absolute inset-0 bg-gradient-to-br from-navy-800 to-navy-950">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_30%,rgba(94,234,212,.25),transparent_60%)]" />
      {src ? (
        // alt="" : le nom de l'espèce est écrit juste à côté dans les deux
        // gabarits. Et une planche n'affirme pas l'espèce de CETTE prise — c'est
        // une illustration de référence, pas la photo du poisson pêché.
        <Image src={src} alt="" fill sizes={sizes} className="object-contain" />
      ) : (
        <Fish
          size={iconSize}
          className="absolute inset-0 m-auto text-teal-300/70"
          strokeWidth={1.7}
          aria-hidden="true"
        />
      )}
    </div>
  )
}
