import { dirname } from 'path'
import { fileURLToPath } from 'url'
import { FlatCompat } from '@eslint/eslintrc'

// Config ESLint 9 (flat) pour eslint-config-next 15. Les presets `next/*` de la
// ligne 15 sont au format legacy eslintrc (`{ extends: [...] }`), pas des flat
// configs : on les charge via FlatCompat (forme canonique generee par
// create-next-app sur Next 15). Le couplage majeur eslint-config-next <-> next
// doit rester aligne (15 <-> 15), sinon la resolution des sous-chemins casse
// (c'etait le "bug flat-config" : v16 exportait les sous-chemins sans .js).
const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
const compat = new FlatCompat({ baseDirectory: __dirname })

const eslintConfig = [
  ...compat.extends('next/core-web-vitals', 'next/typescript'),
  {
    rules: {
      // Variables/args prefixes par `_` = throwaways volontaires (rest spreads,
      // destructuration partielle pour exclure un champ) : convention standard
      // signalee par l'auteur, on ne les remonte pas.
      '@typescript-eslint/no-unused-vars': [
        'warn',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
          caughtErrorsIgnorePattern: '^_',
          destructuredArrayIgnorePattern: '^_',
        },
      ],
    },
  },
]

export default eslintConfig
