// Resize fiable de la carte au montage (BUG-06). MapLibre fige la taille du canvas
// au `new Map()` ; si le conteneur flex mesure 0 px à cet instant (init async,
// layout pas encore résolu) -> canvas noir tant qu'on n'a pas resizé sur la VRAIE
// taille. On déclenche donc le resize quand le conteneur a une taille > 0, et on
// retente sur deux frames pour couvrir le paint flex tardif.

type Resizable = { resize: () => void }
type Sized = { clientWidth: number; clientHeight: number }

/** true si l'élément a une boîte non nulle (taille flex résolue). */
export function hasNonZeroSize(el: Sized | null | undefined): boolean {
  return !!el && el.clientWidth > 0 && el.clientHeight > 0
}

/** Resize seulement si carte présente ET conteneur dimensionné. Renvoie true si resize effectué. */
export function resizeIfSized(
  map: Resizable | null | undefined,
  container: Sized | null | undefined,
): boolean {
  if (!map || !hasNonZeroSize(container)) return false
  map.resize()
  return true
}

/**
 * Resize fiable post-mount : tentative immédiate + 2 requestAnimationFrame
 * successifs (laisse le navigateur peindre la taille flex finale). Renvoie une
 * fonction d'annulation pour le cleanup d'effet. raf/cancel injectables (tests).
 */
export function scheduleReliableResize(
  map: Resizable | null | undefined,
  getContainer: () => Sized | null | undefined,
  raf: (cb: () => void) => number = requestAnimationFrame,
  cancel: (id: number) => void = cancelAnimationFrame,
): () => void {
  const ids: number[] = []
  resizeIfSized(map, getContainer())
  ids.push(
    raf(() => {
      resizeIfSized(map, getContainer())
      ids.push(raf(() => resizeIfSized(map, getContainer())))
    }),
  )
  return () => {
    for (const id of ids) cancel(id)
  }
}
