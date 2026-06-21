import type { MetadataRoute } from 'next'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: ['/', '/carte', '/spots', '/tarifs', '/guides', '/auth/login', '/auth/register'],
        disallow: ['/api/', '/dev/', '/auth/callback', '/onboarding/', '/home', '/profil', '/carnet'],
      },
    ],
    sitemap: 'https://www.carnet-de-peche.com/sitemap.xml',
  }
}
