import type { Metadata } from 'next'
import Link from 'next/link'
import { Fish } from 'lucide-react'
import { HeaderPublic } from '@/components/layout/HeaderPublic'
import { Footer } from '@/components/layout/Footer'

export const metadata: Metadata = {
  title: 'Page introuvable · Carnet de Pêche',
}

export default function NotFound() {
  return (
    <>
      <HeaderPublic />
      <main className="bg-sand-50 flex flex-col items-center justify-center px-6 py-24 text-center min-h-[60vh]">
        <Fish size={64} className="mb-6 text-teal-500" strokeWidth={1.7} aria-hidden="true" />
        <h1 className="font-display text-navy-900 text-4xl mb-3">
          Cette page a glissé du hameçon
        </h1>
        <p className="text-ink-500 max-w-sm text-lg mb-8">
          La page que tu cherches n&apos;existe pas ou a été déplacée. Pas de panique, les poissons sont encore là.
        </p>
        <div className="flex flex-col sm:flex-row gap-3">
          <Link
            href="/"
            className="px-8 py-3.5 bg-navy-900 hover:bg-navy-800 text-white font-semibold rounded-[12px] transition-colors duration-200"
          >
            Retour à l&apos;accueil
          </Link>
          <Link
            href="/spots"
            className="px-8 py-3.5 border border-ink-200 hover:bg-ink-100 text-navy-900 font-semibold rounded-[12px] transition-colors duration-200"
          >
            Voir les spots
          </Link>
        </div>
      </main>
      <Footer />
    </>
  )
}
