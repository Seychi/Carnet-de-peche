import { HeaderPublic } from '@/components/layout/HeaderPublic'
import { Footer } from '@/components/layout/Footer'

/**
 * Shell public. Aucun composant de cet arbre serveur ne doit lire les cookies
 * (`@/lib/supabase/server`, `next/headers`) : ce layout est monté sur les 1 088
 * pages SEO du site et le moindre accès requête les rendrait toutes dynamiques,
 * ce qui neutraliserait `revalidate` et `generateStaticParams` partout.
 * Verrou automatique : `__tests__/marketing-layout-is-static.test.ts`.
 */
export default function MarketingLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <HeaderPublic />
      {/* Landmark principal unique (a11y) : les pages du groupe ne doivent
          plus rendre leur propre <main> — un seul main par page. */}
      <main id="main">{children}</main>
      <Footer />
    </>
  )
}
