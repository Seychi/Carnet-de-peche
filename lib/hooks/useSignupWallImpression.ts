'use client'

import { useEffect, type RefObject } from 'react'
import { analytics } from '@/lib/analytics'
import type { SignupWallSurface } from '@/lib/gating/wall'

/**
 * Déclare UNE impression de mur d'inscription (`signup_wall_viewed`), et
 * seulement si le mur est **réellement rendu** pour ce visiteur, à ce viewport.
 *
 * ★ SPRINT 85, Bloc 0 (Défaut 3) — pourquoi ce hook existe.
 *
 * Mesuré sur 90 jours au 17/08 : `spot_tides` = 7 clics / **0 impression**,
 * `spot_score` = 1 clic / **0 impression**. Un taux de clic par surface était donc
 * littéralement incalculable, et l'absence de dénominateur se lisait comme
 * « personne ne clique ».
 *
 * La cause n'était pas dans l'émetteur : `SignupWall` émettait bien son événement
 * dans un effet, et son clic était émis inconditionnellement. C'était la prop
 * `track={false}`, posée à la main sur ces surfaces, qui coupait l'impression
 * **sans couper le clic**. Elle existait pour une raison réelle (un mur monté mais
 * masqué en CSS, `hidden lg:block` / `lg:hidden`, n'est vu par personne et
 * gonflerait le dénominateur), mais elle demandait à l'auteur de deviner, pour
 * chaque instance, à quel viewport son mur est affiché. Elle s'est trompée.
 *
 * On remplace donc le réglage manuel par une **mesure** : au montage, un élément
 * masqué par `display:none` (donc `hidden lg:block` sur mobile, `lg:hidden` sur
 * desktop, ou un bloc `[data-anon-only]` masqué avant peinture pour un connecté)
 * n'a **aucun rectangle de rendu**. `getClientRects().length === 0` est le test
 * exact, et il couvre les ancêtres masqués aussi bien que l'élément lui-même.
 * `offsetParent` ne conviendrait PAS : il vaut `null` pour tout élément en
 * `position: fixed`, y compris parfaitement visible (le CTA collant mobile).
 *
 * Sémantique conservée volontairement : une impression = « le mur était affiché
 * dans la page de ce visiteur », pas « il est passé dans le viewport ». C'est ce
 * que comptaient déjà toutes les surfaces qui, elles, fonctionnaient : les séries
 * historiques restent comparables, seules les surfaces à zéro se remettent à
 * compter.
 *
 * ⚠️ Invariant à ne plus jamais casser : **toute surface qui peut émettre un clic
 * doit émettre une impression par le même chemin**. Une surface avec des clics et
 * zéro impression n'est pas une surface qui convertit mal, c'est une surface qu'on
 * ne sait pas lire.
 */
export function useSignupWallImpression(
  ref: RefObject<HTMLElement | null>,
  surface: SignupWallSurface,
): void {
  useEffect(() => {
    const el = ref.current
    // Rien à mesurer : rendu serveur, ou élément jamais monté.
    if (!el) return
    // Masqué (display:none sur l'élément ou sur un de ses ancêtres) : personne ne
    // l'a vu, on ne le compte pas. Voir le bandeau ci-dessus pour le pourquoi.
    if (el.getClientRects().length === 0) return
    analytics.signupWallViewed({ surface })
  }, [ref, surface])
}
