import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { compileMDX } from 'next-mdx-remote/rsc'
import remarkGfm from 'remark-gfm'
import { getAllGuides, getGuideBySlug, type Guide } from '@/lib/guides/loader'
import { GuideLayout } from '@/components/layout/GuideLayout'
import {
  SpotCard,
  TechniqueBadge,
  TideExplainer,
  RegulationBox,
} from '@/components/guides/mdx-components'

// ISR quotidien (brief sprint 10 Bloc 1) — les guides changent rarement.
export const revalidate = 86400
export const dynamicParams = true

const BASE_URL = 'https://www.carnet-de-peche.com'

export async function generateStaticParams() {
  const guides = await getAllGuides()
  return guides.map((g) => ({ slug: g.slug }))
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>
}): Promise<Metadata> {
  const { slug } = await params
  const guide = await getGuideBySlug(slug)
  if (!guide) return { title: 'Guide introuvable — Carnet de Pêche' }

  const canonicalUrl = `${BASE_URL}/guides/${guide.slug}`
  return {
    title: `${guide.title} · Carnet de Pêche`,
    description: guide.excerpt,
    alternates: { canonical: canonicalUrl },
    openGraph: {
      title: guide.title,
      description: guide.excerpt,
      url: canonicalUrl,
      type: 'article',
      locale: 'fr_FR',
      publishedTime: guide.published_at.toISOString(),
      modifiedTime: (guide.updated_at ?? guide.published_at).toISOString(),
      ...(guide.cover_image ? { images: [{ url: guide.cover_image, width: 1200, height: 630 }] } : {}),
    },
    twitter: {
      card: 'summary_large_image',
      title: guide.title,
      description: guide.excerpt,
    },
  }
}

function fmtMonthYear(d: Date): string {
  const s = new Intl.DateTimeFormat('fr-FR', {
    month: 'long',
    year: 'numeric',
    timeZone: 'Europe/Paris',
  }).format(d)
  return s.charAt(0).toUpperCase() + s.slice(1)
}

function buildJsonLd(guide: Guide): object[] {
  const article = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: guide.title,
    description: guide.excerpt,
    author: { '@type': 'Organization', name: guide.author },
    publisher: { '@type': 'Organization', name: 'Carnet de Pêche', url: BASE_URL },
    mainEntityOfPage: `${BASE_URL}/guides/${guide.slug}`,
    datePublished: guide.published_at.toISOString().slice(0, 10),
    dateModified: (guide.updated_at ?? guide.published_at).toISOString().slice(0, 10),
    inLanguage: 'fr',
    ...(guide.cover_image ? { image: guide.cover_image } : {}),
  }
  const breadcrumb = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Accueil', item: BASE_URL },
      { '@type': 'ListItem', position: 2, name: 'Guides', item: `${BASE_URL}/guides` },
      { '@type': 'ListItem', position: 3, name: guide.title, item: `${BASE_URL}/guides/${guide.slug}` },
    ],
  }
  if (!guide.howto) return [article, breadcrumb]
  // Guides « comment faire » : HowTo en plus (étapes = les h2 du contenu).
  const steps = [...guide.content.matchAll(/^##\s+(.+)$/gm)]
    .map((m) => m[1].trim())
    .filter((t) => t.length > 0)
    .map((name) => ({ '@type': 'HowToStep', name }))
  const howto = {
    '@context': 'https://schema.org',
    '@type': 'HowTo',
    name: guide.title,
    description: guide.excerpt,
    inLanguage: 'fr',
    ...(steps.length > 0 ? { step: steps } : {}),
  }
  return [article, howto, breadcrumb]
}

export default async function GuidePage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const guide = await getGuideBySlug(slug)
  if (!guide) notFound()

  const { content } = await compileMDX({
    source: guide.content,
    components: { SpotCard, TechniqueBadge, TideExplainer, RegulationBox },
    options: { mdxOptions: { remarkPlugins: [remarkGfm] } },
  })

  // Guides liés : ceux du frontmatter, sinon les 2 plus récents autres.
  const all = await getAllGuides()
  const related = (
    guide.related.length > 0
      ? guide.related
          .map((s) => all.find((g) => g.slug === s))
          .filter((g): g is Guide => Boolean(g))
      : all.filter((g) => g.slug !== guide.slug).slice(0, 2)
  ).map((g) => ({ slug: g.slug, title: g.title }))

  return (
    <>
      {buildJsonLd(guide).map((jsonLd, i) => (
        <script
          key={i}
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      ))}
      <GuideLayout
        title={guide.title}
        excerpt={guide.excerpt}
        readTime={guide.readTime}
        publishedAt={fmtMonthYear(guide.published_at)}
        category={guide.category}
        species={guide.species}
        heroImage={guide.cover_image}
        heroImageAlt={guide.cover_image_alt}
        verifiedAt={guide.verified_at}
        relatedGuides={related}
      >
        {content}
      </GuideLayout>
    </>
  )
}
