import 'server-only'
import { promises as fs } from 'node:fs'
import path from 'node:path'
import matter from 'gray-matter'
import '@/lib/zod-config'
import { z } from 'zod'

// ─── Frontmatter (cf docs/sprint-10/BRIEF.md Bloc 1 + docs/guides/COMMENT-ECRIRE.md) ──

const frontmatterSchema = z.object({
  title: z.string().min(10),
  slug: z.string().regex(/^[a-z0-9-]+$/, 'slug en kebab-case'),
  excerpt: z.string().min(40).max(300),
  category: z.string().default('Technique'),
  /** Libellé espèce affiché (« Bar », « Multi-espèces »…). */
  species: z.string().default('Multi-espèces'),
  technique: z.string().optional(),
  department: z.string().optional(),
  cover_image: z.string().optional(),
  cover_image_alt: z.string().optional(),
  author: z.string().default('Carnet de Pêche'),
  published_at: z.coerce.date(),
  updated_at: z.coerce.date().optional(),
  /** Date de vérification des infos réglementaires (mailles, quotas). */
  verified_at: z.coerce.date().optional(),
  /** true → JSON-LD HowTo en plus de Article (guides « comment faire »). */
  howto: z.boolean().default(false),
  /** Slugs des guides liés (sidebar « Lire aussi »). */
  related: z.array(z.string()).default([]),
  draft: z.boolean().default(false),
})

export type GuideFrontmatter = z.infer<typeof frontmatterSchema>

export type Guide = GuideFrontmatter & {
  content: string
  readTime: number
}

const GUIDES_DIR = path.join(process.cwd(), 'content', 'guides')

// ~200 mots/min, arrondi supérieur, plancher 3 min.
function computeReadTime(content: string): number {
  const words = content.split(/\s+/).filter(Boolean).length
  return Math.max(3, Math.ceil(words / 200))
}

async function parseGuideFile(filename: string): Promise<Guide> {
  const raw = await fs.readFile(path.join(GUIDES_DIR, filename), 'utf-8')
  const { data, content } = matter(raw)
  const fm = frontmatterSchema.parse(data)
  const expectedSlug = filename.replace(/\.mdx$/, '')
  if (fm.slug !== expectedSlug) {
    throw new Error(
      `Guide ${filename} : le slug du frontmatter (« ${fm.slug} ») doit être identique au nom du fichier (« ${expectedSlug} »).`,
    )
  }
  return { ...fm, content, readTime: computeReadTime(content) }
}

/** Tous les guides publiés (hors _TEMPLATE et drafts), du plus récent au plus ancien. */
export async function getAllGuides(): Promise<Guide[]> {
  let files: string[]
  try {
    files = await fs.readdir(GUIDES_DIR)
  } catch {
    return []
  }
  const guides = await Promise.all(
    files
      .filter((f) => f.endsWith('.mdx') && !f.startsWith('_'))
      .map(parseGuideFile),
  )
  return guides
    .filter((g) => !g.draft)
    .sort((a, b) => b.published_at.getTime() - a.published_at.getTime())
}

/** Un guide par slug — null si introuvable ou draft. */
export async function getGuideBySlug(slug: string): Promise<Guide | null> {
  // Le slug vient de l'URL : on refuse tout ce qui pourrait sortir du dossier.
  if (!/^[a-z0-9-]+$/.test(slug)) return null
  try {
    const guide = await parseGuideFile(`${slug}.mdx`)
    return guide.draft ? null : guide
  } catch {
    return null
  }
}
