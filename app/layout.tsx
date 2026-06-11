import type { Metadata } from "next";
import { Inter, JetBrains_Mono, Space_Grotesk } from "next/font/google";
import { Toaster } from "@/components/ui/sonner";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-space-grotesk",
  display: "swap",
});

// DA v2 : la signature « instrument » — tout chiffre métier passe en mono.
const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-jetbrains-mono",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL('https://www.carnet-de-peche.com'),
  title: "Carnet de Pêche — Le réseau des pêcheurs à la canne du bord",
  description:
    "Le carnet de pêche numérique et le réseau communautaire des pêcheurs à la canne du bord. Logue tes prises, suis les conditions, retrouve les bons spots — entre passionnés.",
  openGraph: {
    title: "Carnet de Pêche",
    description:
      "Logue. Partage. Progresse. Le réseau social des pêcheurs à la canne du bord en France.",
    type: "website",
    locale: "fr_FR",
    siteName: "Carnet de Pêche",
  },
  twitter: {
    card: "summary_large_image",
    title: "Carnet de Pêche",
    description: "Le carnet de pêche numérique des pêcheurs à la canne du bord.",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="fr"
      className={`${inter.variable} ${spaceGrotesk.variable} ${jetbrainsMono.variable}`}
      suppressHydrationWarning
    >
      <body suppressHydrationWarning>
        {children}
        <Toaster position="top-center" richColors />
      </body>
    </html>
  );
}
