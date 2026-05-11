import Link from "next/link";

function BrandMark({ size = 34 }: { size?: number }) {
  return (
    <span
      className="grid place-items-center text-white shrink-0"
      style={{
        width: size,
        height: size,
        background: "linear-gradient(135deg, var(--navy-900), var(--teal-500))",
        borderRadius: Math.round(size * 0.3),
      }}
    >
      <svg
        width={size * 0.59}
        height={size * 0.59}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7S2 12 2 12z" />
      </svg>
    </span>
  );
}

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-sand-50 flex flex-col">
      {/* Header minimal */}
      <header className="px-5 py-4 flex justify-center">
        <Link
          href="/"
          className="flex items-center gap-2.5 font-display font-bold text-[17px] text-navy-900 min-h-[44px]"
        >
          <BrandMark size={34} />
          <span>Carnet de Pêche</span>
        </Link>
      </header>

      {/* Contenu centré */}
      <main className="flex-1 flex items-center justify-center px-5 py-8">
        {children}
      </main>

      {/* Footer minimaliste */}
      <footer className="px-5 py-4 text-center text-[12px] text-ink-500">
        © 2026 Carnet de Pêche ·{" "}
        <Link href="#" className="hover:text-navy-900 transition-colors">
          CGU
        </Link>{" "}
        ·{" "}
        <Link href="#" className="hover:text-navy-900 transition-colors">
          Confidentialité
        </Link>
      </footer>
    </div>
  );
}
