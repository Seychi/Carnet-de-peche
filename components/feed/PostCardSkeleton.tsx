// Skeleton d'une carte de post (sprint 13 Bloc E) — affiché au chargement
// initial du fil et entre les pages de l'infinite scroll. Pas d'animation
// coûteuse : un simple pulse Tailwind.
export function PostCardSkeleton() {
  return (
    <div className="flex flex-col gap-3 rounded-[14px] border border-sand-200 bg-white p-4">
      <div className="flex items-center gap-2.5">
        <div className="size-9 shrink-0 animate-pulse rounded-full bg-sand-200" />
        <div className="flex flex-col gap-1.5">
          <div className="h-3 w-28 animate-pulse rounded bg-sand-200" />
          <div className="h-2.5 w-20 animate-pulse rounded bg-sand-100" />
        </div>
      </div>
      <div className="flex flex-col gap-2">
        <div className="h-3 w-full animate-pulse rounded bg-sand-200" />
        <div className="h-3 w-4/5 animate-pulse rounded bg-sand-200" />
      </div>
      <div className="h-40 w-full animate-pulse rounded-[12px] bg-sand-100" />
    </div>
  )
}
