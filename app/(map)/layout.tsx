import { Header } from '@/components/layout/Header'

// Layout fullscreen pour la carte interactive.
// Pas de footer — la map occupe tout l'écran disponible.
// Sur mobile (< md) : le Header marketing est masqué — MapShell injecte son propre header compact (56px).
// h-dvh (100dvh) gère la barre URL iOS qui s'auto-hide, contrairement à h-screen (100vh).
export default function MapLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      {/* ⟢ Sprint 64 / Bloc 1 — resource hints tuiles MapTiler. Le montage MapLibre est
          différé (useDeferredMount, sprint 36) : préchauffer DNS + TCP + TLS vers
          api.maptiler.com PENDANT ce délai fait apparaître les tuiles plus vite (le
          style JSON, les glyphs, les sprites ET chaque .pbf sont des fetch cross-origin).
          crossOrigin OBLIGATOIRE (tuiles en mode CORS) sinon la préconnexion n'est pas
          réutilisée et le hint est gaspillé. React 19 hoiste ces <link> dans le <head>
          et les dédoublonne. On ne met JAMAIS la clé ici, seulement l'origine. */}
      <link rel="preconnect" href="https://api.maptiler.com" crossOrigin="anonymous" />
      <link rel="dns-prefetch" href="https://api.maptiler.com" />
      <div className="flex flex-col h-dvh overflow-hidden">
        <div className="hidden md:block shrink-0">
          <Header />
        </div>
        <main id="main" className="flex-1 min-h-0">{children}</main>
      </div>
    </>
  )
}
