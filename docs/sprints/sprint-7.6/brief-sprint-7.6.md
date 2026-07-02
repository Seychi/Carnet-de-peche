# 🔧 Brief Sprint 7.6 — Correctifs post-audit Claude in Chrome

> **Durée** : ½ à 1 jour ouvré (~2-3h Claude Code + 30 min validation John)
> **Type** : sprint de polish, **pas de nouvelle feature**
> **Objectif** : corriger les 6 régressions visibles découvertes par Claude in Chrome après le sprint 7.5, pour pouvoir démarrer le sprint 8 (fil communautaire) sur un site qui ne se contredit pas.
> **Référence audit** : `docs/audits/AUDIT-2026-05-21-post-sprint-7.5.md` + `docs/audits/ux-discovery/2026-05-21-claude-chrome-post-sprint-7.5.md`

---

## Comment lire ce brief

7 tâches indépendantes ordonnées par criticité. Chaque tâche est autonome avec fichier, ligne(s) si possible, critère d'acceptation testable, coût estimé.

**Mode d'opération** : commits Conventional Commits, branche `main` directement OK (cf CLAUDE.md §13).

**Convention commit** : `fix(7.6): description courte` ou `fix(scope): description courte` à ta convenance.

**Ordre conseillé** : 1 → 2 → 3 → 4 → 5 → 6 → 7. Mais tu peux paralléliser si ça t'arrange.

---

# Tâche 1 — 🚨 Bug "4000% relâchées" sur /home (10 min)

## Symptôme

Sur `/home` (post-login), la stat "Espèce favorite : Bar" affiche en sous-ligne **"4000% relâchées"** alors que sur le carnet test de Seychi le taux réel est 40 % (2/5 prises relâchées).

## Cause probable

Double multiplication par 100. Quelqu'un a fait :
```ts
const releasedRate = (released / total) * 100
// puis affiché dans le JSX
{releasedRate * 100}% relâchées  // ❌
```
au lieu de :
```ts
{releasedRate}% relâchées        // ✓
```

OU le calcul lit déjà une valeur en % (genre `released_rate` venant d'une RPC qui renvoie déjà du 0-100) et on remultiplie par 100 par habitude.

## Action

1. Lire `app/(app)/home/page.tsx` (refonte commit `447d5cb`) et identifier le composant qui rend "Espèce favorite"
2. Trouver le calcul du taux de relâche
3. Vérifier le contrat de la fonction utilisée (probablement `get_my_catch_stats` RPC, migration 007) — retourne-t-elle le ratio (0-1) ou le pourcentage (0-100) ?
4. Corriger la formule

## Test rapide

Compter à la main : sur les 5 prises de Seychi (Maquereau 54cm, Orphie 28cm, Bar 71cm + 2 autres), combien sont marquées `released=true` dans la DB ? Le pourcentage affiché doit matcher.

## Critère d'acceptation

- `/home` affiche un pourcentage entre 0 et 100 (jamais > 100)
- Le pourcentage correspond au calcul manuel : `(catches.filter(c => c.released).length / catches.length) * 100`
- Test snapshot ou unit test sur la fonction de stats si elle existe en isolé

## Fichiers probables

- `app/(app)/home/page.tsx`
- Éventuellement `lib/catches/queries.ts` ou `lib/catches/actions.ts` si la stat passe par là
- Migration `007_catch_stats_rpc.sql` pour vérifier le contrat retour de `get_my_catch_stats`

---

# Tâche 2 — 🚨 /contact 404 (30 min)

## Symptôme

Le footer affiche un lien "Contact" qui est un `<a href="mailto:contact@carnet-de-peche.com">` — ce qui fonctionne pour qui clique. **Mais** si un visiteur tape directement `/contact` dans la barre d'URL (ou suit un lien externe), il atterrit sur la page 404. Détecté à la fois par l'audit fondateur (21 mai) et le rapport Claude in Chrome post-7.5.

## Cause

Au sprint 7.5 Bloc A2, on a créé les stubs `/fil`, `/especes`, `/techniques` mais oublié `/contact`.

## Action

Créer `app/(marketing)/contact/page.tsx` sur le même modèle que les autres stubs.

**Spécifs proposées** :
- Page propre, pas un stub "bientôt" (parce que le contact existe vraiment, lui)
- Encadré mis en avant avec l'email **contact@carnet-de-peche.com** + bouton "Ouvrir mon client mail" (`mailto:`)
- Texte court : "Une question, un signalement, une demande RGPD ? Écris-nous, on répond sous 24h."
- 3 sections optionnelles (Card avec emoji + titre + 1 ligne) :
  - 💬 "Question produit" → `mailto:contact@carnet-de-peche.com?subject=Question%20produit`
  - 🔒 "Demande RGPD" → `mailto:contact@carnet-de-peche.com?subject=Demande%20RGPD`
  - 🐛 "Bug ou suggestion" → `mailto:contact@carnet-de-peche.com?subject=Bug%2Fsuggestion`
- Lien retour discret en bas vers `/`
- Métadonnées SEO : title "Contact — Carnet de Pêche", description "Une question sur l'app, ton compte, ou tes données ? Écris-nous à contact@carnet-de-peche.com, réponse sous 24h."

## Bonus

Mettre à jour le footer (`components/layout/Footer.tsx`) :
- Garder le lien `href="mailto:contact@carnet-de-peche.com"` ou
- Le changer pour `href="/contact"` (qui affichera la nouvelle page puis offrira le mailto)
- Recommandation : **passer en `href="/contact"`** pour avoir une page indexable SEO + un fallback pour les browsers/utilisateurs sans client mail configuré

## Critère d'acceptation

- `curl https://www.carnet-de-peche.com/contact` retourne 200 OK (après redeploy)
- La page contient au moins une mention `contact@carnet-de-peche.com`
- La page est dans `sitemap.xml` (vérifier que `app/sitemap.ts` la prend en compte automatiquement ou l'ajouter)
- Le footer pointe vers `/contact` (ou conserve `mailto:` selon ton choix)

---

# Tâche 3 — 🚨 "Carte interactive · Sprint 5" fuite dev (10 min)

## Symptôme

Sur la fiche prise `/carnet/[id]`, un texte **"Carte interactive · Sprint 5"** est visible en bas de page. C'est un label dev qui n'aurait pas dû fuiter en prod.

## Cause

Probablement un commentaire de section ou un placeholder de feature ajouté pendant le sprint 5 et jamais retiré.

## Action

```bash
cd /sessions/*/mnt/Carnet-de-peche

# Trouver toutes les occurrences "Sprint X" dans les sources TSX
grep -rn "Sprint [0-9]" --include="*.tsx" --include="*.ts" \
  --exclude-dir=node_modules --exclude-dir=.next . | grep -v "test\|Test\|README\|brief"

# Retirer les mentions visibles utilisateur (pas les commentaires)
```

Particulièrement chercher dans :
- `app/(app)/carnet/[id]/page.tsx`
- `components/catches/*`
- Composants qui ont une `<h2>`, `<h3>`, `<section>` ou label visible

## Bonus anti-régression (5 min de plus)

Ajouter un test snapshot Vitest qui échoue si certains mots interdits apparaissent dans le markup rendu de pages clés. Exemple `lib/__tests__/no-dev-leaks.test.ts` :

```ts
import { describe, it, expect } from 'vitest'
import { readFileSync, readdirSync } from 'fs'
import { join } from 'path'

const FORBIDDEN_TERMS = ['Sprint ', 'TODO', 'FIXME', 'XXX:', 'À COMPLÉTER', 'lorem ipsum']
const PATHS_TO_CHECK = [
  'app/(marketing)/page.tsx',
  'app/(marketing)/tarifs/page.tsx',
  'app/(marketing)/legal/mentions-legales/page.tsx',
  'app/(app)/home/page.tsx',
  // ajouter les fichiers de composants critiques rendus dans ces pages
]

describe('no dev leaks in public-facing pages', () => {
  for (const path of PATHS_TO_CHECK) {
    it(`${path} contains no dev jargon`, () => {
      const content = readFileSync(join(process.cwd(), path), 'utf-8')
      for (const term of FORBIDDEN_TERMS) {
        // n'échoue que pour le texte affiché (entre > et <), pas les comments
        const visibleTextMatches = content.match(/>[^<]*</g) || []
        for (const match of visibleTextMatches) {
          expect(match.toLowerCase()).not.toContain(term.toLowerCase())
        }
      }
    })
  }
})
```

(Heuristique imparfaite mais attrape les cas les plus évidents. À raffiner si besoin.)

## Critère d'acceptation

- `grep -rn "Sprint [0-9]" --include="*.tsx" app/` (en excluant tests/docs) ne révèle plus de mention visible utilisateur
- Sur la fiche prise live, plus de "Carte interactive · Sprint 5"
- Bonus : le test snapshot anti-leak passe

---

# Tâche 4 — 🟡 Label "COMMENT" → "MÉTHODE" (5 min)

## Symptôme

Sur la fiche prise `/carnet/[id]`, la section qui contient la technique de pêche a pour header **"COMMENT"** (anglicisme bizarre, "Comment" = "How" en anglais, mais en français ça paraît une question tronquée).

## Action

```bash
grep -rn '"COMMENT"\|>COMMENT<\|comment.*toUpperCase\|"comment"' \
  --include="*.tsx" app/ components/
```

Identifier le composant qui rend la section, renommer le label en **"MÉTHODE"** (ou "TECHNIQUE" si tu préfères — `MÉTHODE` est plus large et accommode mieux les futurs sous-champs comme appât, leurre, marque).

## Bonus

Si la section affiche "Méthode : Surfcasting" + plus bas "Appât : ver de mer" (ou équivalent leurre/marque), envisager une mise en page card unique :

```
MÉTHODE
─────────
Surfcasting
Appât : ver de mer
```

Plus lisible qu'un header séparé.

## Critère d'acceptation

- Plus aucune occurrence visible utilisateur de "COMMENT" comme header de section
- Le composant utilise "MÉTHODE" (ou "TECHNIQUE")
- (Optionnel) sous-titres appât/leurre groupés visuellement

---

# Tâche 5 — 🟡 Validation `/auth/register` en français (30 min)

## Symptôme

Sur `/auth/register`, saisir un email invalide ("foo") fait apparaître le message browser natif **"Please include an '@' in the email address. 'foo' is missing an '@'."** (anglais). Saisir un password trop court (3 chars) ne déclenche pas de message FR custom au-dessus du browser default.

## Cause

Le form utilise probablement la validation HTML5 native (`required`, `type="email"`, `minLength`) qui s'exprime dans la langue du browser de l'utilisateur. Pas de validation client custom en français.

## Action

Cohérent avec ce qui a été fait au sprint 7.5 (commit `1b13bcf` "messages de validation zod en français") sur `/carnet/nouvelle`. On applique la même méthode à `/auth/register` et `/auth/login`.

1. Lire `app/auth/register/page.tsx` et `app/auth/login/page.tsx`
2. Identifier le `<form>` et les `<input>` de validation
3. Ajouter `noValidate` au form (désactive la validation HTML5 native)
4. Créer un schéma zod pour les inputs :

```ts
import { z } from 'zod'

const registerSchema = z.object({
  email: z
    .string({ errorMap: () => ({ message: "Ton email est requis pour créer ton compte" }) })
    .email({ message: "Cet email n'a pas l'air valide — vérifie le format (ex: pecheur@example.com)" }),
  password: z
    .string({ errorMap: () => ({ message: "Choisis un mot de passe pour protéger ton compte" }) })
    .min(8, { message: "Au moins 8 caractères, c'est plus sûr" })
    .regex(/\d/, { message: "Inclus au moins un chiffre pour renforcer le mot de passe" }),
})

type RegisterInput = z.infer<typeof registerSchema>
```

5. Utiliser `react-hook-form` avec `@hookform/resolvers/zod` (déjà dans package.json) :

```tsx
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'

const {
  register,
  handleSubmit,
  formState: { errors },
} = useForm<RegisterInput>({
  resolver: zodResolver(registerSchema),
  mode: 'onBlur',  // ou 'onChange' selon préférence UX
})
```

6. Afficher les erreurs sous chaque champ :

```tsx
<label htmlFor="email">Email</label>
<input id="email" type="email" {...register('email')} />
{errors.email && <p className="text-red-600 text-sm mt-1">{errors.email.message}</p>}
```

## Cas /auth/login

Idem mais plus simple : zod schema `{ email, password }`, message générique "Ton email ou mot de passe est incorrect" en cas d'erreur server-side (ne pas révéler si c'est l'email ou le password qui est faux, pour des raisons de sécurité).

## Critère d'acceptation

- `/auth/register` avec email "foo" → message rouge en français spécifique sous le champ
- `/auth/register` avec password "abc" → message rouge en français spécifique sous le champ
- `/auth/register` sans rien remplir + click submit → 2 messages français (pas le browser native)
- `/auth/login` : même qualité de messages en cas d'identifiants incorrects
- Aucune apparition du message anglais "Please include an '@'..."

## Fichiers probables

- `app/auth/register/page.tsx`
- `app/auth/login/page.tsx`
- `app/auth/login/actions.ts` (pour le message server-side)
- Possible nouveau fichier `lib/auth/schema.ts` pour centraliser les schemas zod

---

# Tâche 6 — 🟡 `rel="noopener noreferrer"` sur attributions carte (10 min)

## Symptôme

Les 2 liens d'attribution en bas de la carte MapLibre ont `target="_blank"` sans `rel="noopener noreferrer"`. Vulnérabilité tabnabbing mineure (le site cible peut accéder à `window.opener` et tenter de rediriger la page d'origine).

URLs concernées :
- `https://www.maptiler.com/copyright/`
- `https://www.openstreetmap.org/copyright`

## Action

```bash
# Localiser
grep -rn 'target="_blank"' --include="*.tsx" --include="*.ts" \
  --exclude-dir=node_modules --exclude-dir=.next . | grep -v "noopener"
```

Pour chaque résultat, ajouter `rel="noopener noreferrer"`.

Probablement dans `components/map/MapView.tsx` ou un composant `MapAttribution`. Si l'attribution est gérée par MapLibre nativement (config style.json), il faut peut-être surcharger via un custom control.

## Bonus

Si tu veux faire systématique pour tout le repo : créer un composant `<ExternalLink>` qui force toujours `target="_blank" rel="noopener noreferrer"` :

```tsx
// components/ui/external-link.tsx
import Link from 'next/link'
import type { ComponentProps } from 'react'

export function ExternalLink({ href, children, ...rest }: ComponentProps<'a'>) {
  return (
    <a href={href} target="_blank" rel="noopener noreferrer" {...rest}>
      {children}
    </a>
  )
}
```

Et remplacer les `<a target="_blank">` du repo par `<ExternalLink>` au fur et à mesure. Pas urgent, à faire au passage quand tu touches à ces composants.

## Critère d'acceptation

- `grep -rE 'target=("|\")_blank' --include="*.tsx" . | grep -v "noopener"` retourne 0 résultat (en excluant node_modules/.next)
- Les attributions carte ont bien `rel="noopener noreferrer"` (vérifier inspecteur DOM live)

---

# Tâche 7 — 🟢 Bonus : marquer "(bientôt)" sur "Mode hors ligne" tarifs (5 min)

## Symptôme

Sur `/tarifs`, card Local, le bullet **"Mode hors ligne (carte + marées 7 jours)"** est présenté comme dispo immédiatement. Or le mode hors ligne n'arrive qu'au sprint 16 (mobile).

## Action

Modifier `app/(marketing)/tarifs/pricing-cards.tsx:36` :

**Avant** :
```ts
{ text: 'Mode hors ligne (carte + marées 7 jours)' },
```

**Après** :
```ts
{ text: 'Mode hors ligne (carte + marées 7 jours)', soon: true },
```

Et adapter le rendu pour afficher un badge "(bientôt)" discret à côté :

```tsx
<li key={f.text} ...>
  <Check size={16} ... />
  <span className={f.strong ? '...' : ''}>
    {f.text}
    {f.soon && <span className="ml-2 text-[10px] text-teal-600 font-normal">(bientôt)</span>}
  </span>
</li>
```

Idem pour "Notifications push créneaux optimaux" (sprint 17), "Stats inter-départements" et "Bathymétrie SHOM premium" (Itinérant) si tu veux être complètement honnête.

## Critère d'acceptation

- Sur `/tarifs`, les features non livrées portent un marqueur "(bientôt)" visible
- L'utilisateur qui souscrit ne peut pas se sentir floué

---

# Pré-requis sprint 8 (à faire en parallèle si possible)

## Audit RLS systématique avant tables `feed_*`

**Pourquoi** : le sprint 8 va créer les tables `feed_posts`, `feed_comments`, `feed_likes`, `follows`. Ces tables sont sociales = haute surface de fuite données si RLS mal configurée. À faire AVANT d'écrire la migration.

**Méthode rapide (1-2h)** :

1. Créer manuellement 2 comptes Supabase de test (`alice@test.com`, `bob@test.com`)
2. Créer 3 catches sur Alice : 1 privée, 1 amis, 1 publique
3. Créer 3 spots sur Alice : 1 public, 1 subscriber, 1 private
4. En tant que **Bob** (non-ami), tenter via SQL :
   - `select * from catches where user_id = '<alice_uuid>'` → ne doit retourner que la publique
   - `select * from catches_for_viewer where user_id = '<alice_uuid>'` → idem
   - `select * from spots where created_by = '<alice_uuid>'` → ne doit retourner que la publique
   - `select * from spots_for_viewer where created_by = '<alice_uuid>'` → idem avec geom adapté
5. Documenter le résultat dans `docs/sprint-8/rls-audit-baseline.md`

**Si quelque chose fuit** : c'est P0 critique avant de commencer sprint 8. Fixer les policies RLS d'abord.

**Si tout est étanche** : documenter le baseline, et utiliser les mêmes tests pour valider les RLS des nouvelles tables `feed_*` au sprint 8.

---

# Checklist finale de sortie sprint 7.6

Tous les items à cocher avant de passer au sprint 8 :

**Régressions critiques** :
- [ ] `/home` affiche un pourcentage relâché entre 0 et 100 (jamais > 100)
- [ ] `/contact` retourne 200 et affiche une vraie page
- [ ] Plus aucune mention "Sprint [0-9]" visible utilisateur (grep clean)
- [ ] Label "COMMENT" → "MÉTHODE" sur fiche prise
- [ ] Validation `/auth/register` et `/auth/login` en français
- [ ] `grep -rE 'target=("|\")_blank' . | grep -v noopener` = 0 résultat
- [ ] (Optionnel tâche 7) `(bientôt)` sur features non livrées de `/tarifs`

**Qualité code** :
- [ ] `pnpm typecheck` = 0 erreur
- [ ] `pnpm test` = 116/116 vert (ou + si tu ajoutes le test anti-leak)
- [ ] `pnpm build` passe
- [ ] CI GitHub Actions vert sur `main`

**Vérification live (après deploy Vercel)** :
- [ ] Hard-refresh (Ctrl+Shift+R) de `/`, `/home` (loggé), `/contact`, `/carnet/[id]` — chaque page montre la nouvelle version
- [ ] Si certaines routes statiques cachent encore l'ancienne : trigger un revalidate manuel via dashboard Vercel ou attendre l'expiration ISR

**Pré-sprint 8 (à valider même si ces tâches sont en parallèle)** :
- [ ] Audit RLS baseline documenté dans `docs/sprint-8/rls-audit-baseline.md`
- [ ] Aucune fuite données entre comptes test

**Méta** :
- [ ] CLAUDE.md §2 mis à jour : sprint 7.6 ✅ + sprint 8 démarre

---

# Estimation totale

| Tâche | Effort |
|---|---|
| 1. Bug 4000% | 10 min |
| 2. /contact | 30 min |
| 3. Sprint 5 leak | 10 min (+ 15 min bonus test) |
| 4. COMMENT → MÉTHODE | 5 min |
| 5. Validation FR auth | 30 min |
| 6. rel noopener | 10 min |
| 7. (bientôt) tarifs | 5 min |
| **Sous-total fixes** | **~1h30** |
| Pré-requis RLS audit (parallèle) | 1-2h |
| Validation John | 30 min |
| **Total réaliste** | **3-4h** |

Tient largement dans 1 jour ouvré, idéalement en demi-journée si la session Claude Code est fluide.

---

# Pour ne plus jamais avoir besoin d'un sprint 7.6

Suggestions process pour les sprints suivants :

1. **Avant tout merge prod** : Claude in Chrome tourne sur la version preview Vercel (`carnet-de-peche-git-{branch}.vercel.app`) plutôt que sur prod
2. **Pre-commit hook** ou step CI qui grep "Sprint [0-9]", "TODO:", "FIXME", "À COMPLÉTER" dans `**/*.tsx` rendus
3. **Test snapshot** anti-leak (cf tâche 3 bonus) intégré au CI
4. **Tests RLS** automatisés en CI avec 2 JWT distincts (à mettre en place sprint 11 polish)

---

*Brief rédigé le 2026-05-21. Quand sprint 7.6 fini, déclencher l'audit Claude in Chrome variante "audit éclair" (15 min, juste la checklist) pour confirmer que les 6 régressions sont closed.*
