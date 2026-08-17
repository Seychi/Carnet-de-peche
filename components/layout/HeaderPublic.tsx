import Link from 'next/link'
import { Logo } from '@/components/ui-v2/Logo'
import { HeaderShell } from './HeaderShell'
import { HeaderNavLinks } from './HeaderNavLinks'
import { HeaderAuthSlot } from './HeaderAuthSlot'

/**
 * Header du shell public (groupe `(marketing)` + page 404).
 *
 * Server Component PUR : il ne lit ni cookie, ni session, ni en-tête de requête.
 * C'est la condition pour que les routes du groupe restent pré-rendues (ISR) :
 * en App Router, un seul accès à `cookies()` dans l'arbre serveur rend TOUTE la
 * route dynamique et neutralise `revalidate` / `generateStaticParams`.
 * Ne jamais y réintroduire `@/lib/supabase/server` ni `next/headers` : le test
 * `__tests__/marketing-layout-is-static.test.ts` échoue si ça arrive.
 *
 * L'état connecté est porté par `<HeaderAuthSlot>` (client), qui lit la session
 * après hydratation. `components/layout/Header.tsx` (version serveur) reste en
 * place pour le groupe `(map)`, dont la page est de toute façon `force-dynamic`.
 */
export function HeaderPublic() {
  return (
    <HeaderShell>
      <div className="mx-auto max-w-[1280px] px-6 flex items-center justify-between gap-4 h-[68px]">
        {/* Logo */}
        <Link
          href="/"
          className="flex items-center gap-2.5 font-display font-bold text-[17px] text-navy-900 shrink-0 min-h-[44px]"
        >
          <Logo size={34} variant="light" className="shrink-0" />
          <span className="hidden sm:inline">Carnet de Pêche</span>
        </Link>

        {/* Nav desktop (client : aria-current sur la route active) */}
        <HeaderNavLinks />

        {/* Actions (client : anonyme au rendu serveur, bascule après hydratation) */}
        <div className="flex items-center gap-2 shrink-0">
          <HeaderAuthSlot />
        </div>
      </div>
    </HeaderShell>
  )
}
