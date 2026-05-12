import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Bug pre-existant eslint-config-next v16 + @eslint/eslintrc v3 (circular JSON)
  // À corriger quand eslint-config-next sera stable avec flat config
  eslint: { ignoreDuringBuilds: true },
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
};

export default nextConfig;
