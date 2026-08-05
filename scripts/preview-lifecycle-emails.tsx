/**
 * Génère les previews HTML des emails de cycle de vie (sprint 74) dans
 * docs/sprint-74/research/. À relancer après toute retouche de copy pour que les
 * previews versionnées restent le reflet exact des templates.
 *
 *   pnpm dlx tsx scripts/preview-lifecycle-emails.tsx
 *
 * Imports RELATIFS volontaires (pas d'alias @/) : le script tourne hors du
 * résolveur Next, et les 4 templates ne dépendent que de ./components.
 */
// React explicite : hors du résolveur Next, tsx compile le JSX en
// React.createElement (runtime « classic »), donc le symbole doit être en portée.
import * as React from 'react'
import { render } from '@react-email/components'
import { mkdirSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

import WelcomeEmail from '../emails/welcome'
import FirstWindowEmail from '../emails/first-window'
import ImportNudgeEmail from '../emails/import-nudge'
import WeeklyWindowEmail from '../emails/weekly-window'

const OUT_DIR = join(dirname(fileURLToPath(import.meta.url)), '..', 'docs', 'sprint-74', 'research')

// Fabriques (et non éléments) : un tableau d'éléments JSX déclencherait la règle
// react/jsx-key, hors sujet ici puisque rien n'est monté dans un arbre React.
const TEMPLATES = [
  ['welcome', () => <WelcomeEmail {...WelcomeEmail.PreviewProps} />],
  ['j1-window', () => <FirstWindowEmail {...FirstWindowEmail.PreviewProps} />],
  ['j3-import', () => <ImportNudgeEmail {...ImportNudgeEmail.PreviewProps} />],
  ['weekly-window', () => <WeeklyWindowEmail {...WeeklyWindowEmail.PreviewProps} />],
] as const

async function main() {
  mkdirSync(OUT_DIR, { recursive: true })
  for (const [name, element] of TEMPLATES) {
    const html = await render(element())
    const file = join(OUT_DIR, `email-preview-${name}.html`)
    writeFileSync(file, html, 'utf8')

    // Garde-fous de copy, vérifiés à la génération (les mêmes que les tests) :
    // un « — » ou un lien sans UTM ne doit jamais atterrir dans une preview.
    const problems: string[] = []
    if (html.includes('—')) problems.push('tiret cadratin')
    if (!html.includes('utm_source=lifecycle')) problems.push('UTM manquant')
    console.log(
      `${problems.length === 0 ? 'ok  ' : 'WARN'} ${file}${
        problems.length > 0 ? ` (${problems.join(', ')})` : ''
      }`,
    )
  }
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
