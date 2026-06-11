import Link from 'next/link'

const InstagramIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <rect width="20" height="20" x="2" y="2" rx="5" ry="5"/>
    <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/>
    <line x1="17.5" x2="17.51" y1="6.5" y2="6.5"/>
  </svg>
)

const TikTokIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
    <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-2.88 2.5 2.89 2.89 0 0 1-2.89-2.89 2.89 2.89 0 0 1 2.89-2.89c.28 0 .54.04.79.1V9.01a6.33 6.33 0 0 0-.79-.05 6.34 6.34 0 0 0-6.34 6.34 6.34 6.34 0 0 0 6.34 6.34 6.34 6.34 0 0 0 6.33-6.34V8.69a8.18 8.18 0 0 0 4.78 1.52V6.76a4.85 4.85 0 0 1-1.01-.07z" />
  </svg>
)

const YoutubeIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M2.5 17a24.12 24.12 0 0 1 0-10 2 2 0 0 1 1.4-1.4 49.56 49.56 0 0 1 16.2 0A2 2 0 0 1 21.5 7a24.12 24.12 0 0 1 0 10 2 2 0 0 1-1.4 1.4 49.55 49.55 0 0 1-16.2 0A2 2 0 0 1 2.5 17"/>
    <path d="m10 15 5-3-5-3z"/>
  </svg>
)

const productLinks = [
  { label: 'Carte', href: '/carte' },
  { label: 'Spots populaires', href: '/spots' },
  { label: 'Guides', href: '/guides' },
  { label: 'Tarifs', href: '/tarifs' },
]

const communityLinks = [
  { label: 'Fil régional', href: '/fil' },
  { label: 'Espèces', href: '/especes' },
  { label: 'Techniques', href: '/techniques' },
]

const legalLinks = [
  { label: 'Mentions légales', href: '/legal/mentions-legales' },
  { label: 'Confidentialité', href: '/legal/confidentialite' },
  { label: 'CGU', href: '/legal/cgu' },
  { label: 'Contact', href: '/contact' },
]

export function Footer() {
  return (
    <footer className="bg-ink-900 text-white/75">
      <div className="max-w-[1280px] mx-auto px-6 py-16">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-10 lg:gap-8">

          {/* Colonne 1 — Logo + tagline */}
          <div className="flex flex-col gap-4">
            <Link href="/" className="flex items-center gap-2.5 group">
              <svg width="28" height="28" viewBox="0 0 30 30" aria-hidden="true">
                <rect width="30" height="30" rx="8" fill="var(--teal-500)" />
                <path
                  d="M5 19 C9 12, 12 12, 15 16 S 21 21, 25 13"
                  stroke="var(--navy-950)"
                  strokeWidth="2.2"
                  fill="none"
                  strokeLinecap="round"
                />
              </svg>
              <span className="font-display font-700 text-white text-lg leading-tight">
                Carnet de Pêche
              </span>
            </Link>
            <p className="text-sm leading-relaxed text-white/60">
              Logue. Partage. Progresse.
            </p>
            <p className="text-sm leading-relaxed text-white/50 mt-2">
              Le réseau social des pêcheurs à la canne du bord en France.
            </p>
          </div>

          {/* Colonne 2 — Produit */}
          <div className="flex flex-col gap-4">
            <h3 className="text-white font-semibold text-sm uppercase tracking-wider">
              Produit
            </h3>
            <ul className="flex flex-col gap-3">
              {productLinks.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="inline-flex items-center min-h-[44px] text-sm transition-colors duration-150 hover:text-white"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Colonne 3 — Communauté */}
          <div className="flex flex-col gap-4">
            <h3 className="text-white font-semibold text-sm uppercase tracking-wider">
              Communauté
            </h3>
            <ul className="flex flex-col gap-3">
              {communityLinks.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="inline-flex items-center min-h-[44px] text-sm transition-colors duration-150 hover:text-white"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Colonne 4 — Légal */}
          <div className="flex flex-col gap-4">
            <h3 className="text-white font-semibold text-sm uppercase tracking-wider">
              Légal
            </h3>
            <ul className="flex flex-col gap-3">
              {legalLinks.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="inline-flex items-center min-h-[44px] text-sm transition-colors duration-150 hover:text-white"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Bandeau bas */}
        <div className="mt-12 pt-8 border-t border-white/10 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-sm text-white/50">
            © 2026 Carnet de Pêche · Tous droits réservés
          </p>
          <div className="flex items-center gap-5">
            <a
              href="https://instagram.com/carnetdepeche"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Carnet de Pêche sur Instagram"
              className="inline-flex items-center justify-center min-h-[44px] min-w-[44px] text-white/50 transition-colors duration-150 hover:text-white"
            >
              <InstagramIcon />
            </a>
            <a
              href="https://tiktok.com/@carnetdepeche"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Carnet de Pêche sur TikTok"
              className="inline-flex items-center justify-center min-h-[44px] min-w-[44px] text-white/50 transition-colors duration-150 hover:text-white"
            >
              <TikTokIcon />
            </a>
            <a
              href="https://youtube.com/@carnetdepeche"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Carnet de Pêche sur YouTube"
              className="inline-flex items-center justify-center min-h-[44px] min-w-[44px] text-white/50 transition-colors duration-150 hover:text-white"
            >
              <YoutubeIcon />
            </a>
          </div>
        </div>
      </div>
    </footer>
  )
}
