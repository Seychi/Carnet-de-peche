import Link from 'next/link'

export default function NotFound() {
  return (
    <div className="min-h-screen bg-sand-50 flex flex-col items-center justify-center px-6 text-center">
      <div className="text-7xl mb-6" aria-hidden="true">🎣</div>
      <h1 className="font-display text-navy-900 text-4xl mb-3">
        Cette page a glissé du hameçon
      </h1>
      <p className="text-ink-500 max-w-sm text-lg mb-8">
        La page que tu cherches n'existe pas ou a été déplacée. Pas de panique, les poissons sont encore là.
      </p>
      <div className="flex flex-col sm:flex-row gap-3">
        <Link
          href="/"
          className="px-8 py-3.5 bg-navy-900 hover:bg-navy-800 text-white font-semibold rounded-[12px] transition-colors duration-200"
        >
          Retour à l'accueil
        </Link>
        <Link
          href="/spots"
          className="px-8 py-3.5 border border-ink-200 hover:bg-ink-100 text-navy-900 font-semibold rounded-[12px] transition-colors duration-200"
        >
          Voir les spots
        </Link>
      </div>
    </div>
  )
}
