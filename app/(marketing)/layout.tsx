import { Header } from '@/components/layout/Header'
import { Footer } from '@/components/layout/Footer'

export default function MarketingLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Header />
      {/* Landmark principal unique (a11y) : les pages du groupe ne doivent
          plus rendre leur propre <main> — un seul main par page. */}
      <main>{children}</main>
      <Footer />
    </>
  )
}
