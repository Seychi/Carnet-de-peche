import Link from 'next/link'

export interface TocItem {
  id: string
  label: string
}

interface LegalLayoutProps {
  title: string
  lastUpdated: string
  toc: TocItem[]
  children: React.ReactNode
}

export function LegalLayout({ title, lastUpdated, toc, children }: LegalLayoutProps) {
  return (
    <div className="min-h-screen bg-sand-50">
      {/* En-tête de page */}
      <div className="bg-navy-900 text-white py-14">
        <div className="max-w-[1280px] mx-auto px-6">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-sm text-white/60 hover:text-white transition-colors mb-6"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="m15 18-6-6 6-6"/></svg>
            Retour à l&rsquo;accueil
          </Link>
          <h1 className="text-white font-display">{title}</h1>
          <p className="mt-3 text-sm text-white/50">
            Dernière mise à jour : {lastUpdated}
          </p>
        </div>
      </div>

      {/* Corps : table des matières + contenu */}
      <div className="max-w-[1280px] mx-auto px-6 py-16">
        <div className="lg:grid lg:grid-cols-[240px_1fr] lg:gap-16 xl:gap-20">

          {/* Table des matières — sticky sur desktop */}
          <aside className="hidden lg:block">
            <div className="sticky top-8">
              <p className="text-xs font-semibold uppercase tracking-wider text-ink-500 mb-4">
                Sommaire
              </p>
              <nav>
                <ul className="flex flex-col gap-1">
                  {toc.map((item) => (
                    <li key={item.id}>
                      <a
                        href={`#${item.id}`}
                        className="block text-sm text-ink-500 hover:text-navy-900 py-1 transition-colors duration-150 border-l-2 border-transparent hover:border-teal-500 pl-3"
                      >
                        {item.label}
                      </a>
                    </li>
                  ))}
                </ul>
              </nav>
            </div>
          </aside>

          {/* Contenu prose */}
          <div className="prose prose-slate max-w-3xl mx-auto lg:mx-0
            prose-headings:font-display prose-headings:text-navy-900
            prose-h2:text-2xl prose-h2:mt-12 prose-h2:mb-4 prose-h2:scroll-mt-8
            prose-h3:text-lg prose-h3:mt-6 prose-h3:mb-2
            prose-p:text-ink-700 prose-p:leading-relaxed
            prose-a:text-teal-600 prose-a:no-underline hover:prose-a:underline
            prose-strong:text-navy-900
            prose-li:text-ink-700
            prose-ul:my-4
          ">
            {children}
          </div>
        </div>
      </div>
    </div>
  )
}
