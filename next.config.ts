import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Bug pre-existant eslint-config-next v16 + @eslint/eslintrc v3 (circular JSON)
  // À corriger quand eslint-config-next sera stable avec flat config
  eslint: { ignoreDuringBuilds: true },
  // Les guides MDX sont lus du filesystem au runtime (ISR) : il faut les
  // embarquer dans le bundle serverless Vercel (le tracing statique ne voit
  // pas les fs.readdir dynamiques).
  outputFileTracingIncludes: {
    "/guides/[slug]": ["./content/guides/**"],
    "/guides": ["./content/guides/**"],
    "/sitemap.xml": ["./content/guides/**"],
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "glgciwwnpmgifyhbvxsw.supabase.co",
        pathname: "/storage/v1/object/public/**",
      },
      {
        protocol: "https",
        hostname: "images.unsplash.com",
      },
    ],
  },
  // Fix Windows : pnpm résout les symlinks avec deux casings différents
  // (Carnet-de-peche vs carnet-de-peche), ce qui fait charger certains
  // modules Next.js en double et casse GlobalLayoutRouterContext.
  webpack: (config) => {
    config.resolve.symlinks = false;
    return config;
  },
};

export default nextConfig;
