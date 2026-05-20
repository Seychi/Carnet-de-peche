# 🔧 Brief Sprint 7.5 — Hygiène produit + dette technique

> **Durée** : 3-5 jours ouvrés
> **Type** : sprint de nettoyage, **pas de nouvelle feature**
> **Objectif** : repasser le site live à la réalité produit, corriger la dette critique du sprint 7, mettre en place CI + discipline migrations — pour engager le sprint 8 (fil communautaire) sur du propre.
> **Référence audit** : `docs/AUDIT-2026-05.md` (Claude — 2026-05-20)
> **Référence roadmap** : `docs/ROADMAP.md` section "Sprint 7.5"

---

## Comment lire ce brief

Chaque tâche est numérotée et **autonome** : tu peux les piquer dans n'importe quel ordre à l'intérieur d'un bloc, mais respecte l'ordre des blocs (A → B → C → D). Chaque tâche a :
- Le(s) fichier(s) cible(s) avec lignes précises quand possible
- Un critère d'acceptation testable
- Un coût estimé

**Mode d'opération** : commits Conventional Commits, branche `sprint-7.5` ou commits directs `main` (selon ce que John préfère — par défaut directs main vu CLAUDE.md §13). Tutoiement, FR pour la copy.

---

# Bloc A — Corrections marketing & SEO (4-5h)

## A1 — Corriger `metadataBase` (5 min) 🚨 P0 critique

**Fichier** : `app/layout.tsx:19`

**Avant**
```ts
metadataBase: new URL('https://carnet-de-peche.vercel.app'),
```

**Après**
```ts
metadataBase: new URL('https://www.carnet-de-peche.com'),
```

**Critère d'acceptation**
- Sur le site live (après redeploy), `/spots` retourne `<link rel="canonical" href="https://www.carnet-de-peche.com/spots">`
- OG image URL = `https://www.carnet-de-peche.com/og/spots`
- Vérifiable via `curl -I` ou inspecteur réseau

**Bonus** : soumettre le sitemap à Google Search Console après le fix (`https://www.carnet-de-peche.com/sitemap.xml`).

---

## A2 — Footer : créer stubs ou retirer liens cassés (1h)

**Fichiers concernés** :
- `components/layout/Footer.tsx:31-35` (les 3 liens cassés)
- À créer si Option A : `app/(marketing)/fil/page.tsx`, `app/(marketing)/especes/page.tsx`, `app/(marketing)/techniques/page.tsx`

**Option recommandée : A — créer 3 stubs "Bientôt disponible"**

Modèle de page (à dupliquer pour les 3) :
```tsx
// app/(marketing)/fil/page.tsx
import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'Fil régional — Bientôt disponible · Carnet de Pêche',
  description: 'Le fil régional des pêcheurs à la canne du bord en France arrive bientôt. Inscris-toi pour être notifié au lancement.',
}

export default function FilPage() {
  return (
    <main className="bg-sand-50 min-h-screen py-20">
      <div className="max-w-[680px] mx-auto px-6 text-center">
        <span className="inline-flex items-center gap-2 text-[13px] font-semibold tracking-[.08em] uppercase text-teal-600 rounded-full px-3.5 py-1.5 border border-teal-500/25 bg-teal-500/10 mb-6">
          Bientôt disponible
        </span>
        <h1 className="font-display text-4xl text-navy-900 mb-4">Fil régional</h1>
        <p className="text-lg text-ink-700 leading-relaxed mb-8">
          Bientôt : un fil par département pour échanger entre pêcheurs locaux —
          prises récentes, conditions du jour, alertes spots. Tu pourras lire
          gratuitement dès le lancement.
        </p>
        <Link
          href="/auth/register"
          className="inline-flex items-center gap-2 px-7 py-3.5 rounded-full font-semibold text-[15px] text-white bg-navy-900 min-h-[48px]"
        >
          Crée ton carnet — sois prévenu
        </Link>
      </div>
    </main>
  )
}
```

Adapter le titre et la description pour `/especes` ("Toutes les espèces — bar, dorade royale, lieu jaune…") et `/techniques` ("Toutes les techniques — leurres, surfcasting, flottante, vif").

**Critère d'acceptation**
- `curl https://www.carnet-de-peche.com/fil` retourne un body non vide avec h1 et CTA register
- `curl https://www.carnet-de-peche.com/especes` idem
- `curl https://www.carnet-de-peche.com/techniques` idem
- Les 3 pages apparaissent dans `sitemap.xml`

**Option fallback B (si A trop long)** : commenter les 3 entrées dans `Footer.tsx:32-34` (`communityLinks`). Coût 1 min. Mais perd l'opportunité SEO + email capture.

---

## A3 — Décision pricing 7 jours vs 14 jours (45 min)

**Décision à prendre AVANT de coder** : on garde 7 jours avec CB (cohérent live actuel) ou 14 jours sans CB (cohérent CLAUDE.md §8) ?

**Recommandation Claude** : **7 jours avec CB** (cohérent avec ce qui sera implémenté avec Stripe au sprint 9, signal d'intention plus fort, friction CB acceptable si bouton "Annuler en 1 clic" tient sa promesse).

**Une fois décidé, propager partout** :

Si 7 jours retenus :
- `app/(marketing)/page.tsx:257` : "14j Essai gratuit garanti" → "7j Essai garanti"
- `CLAUDE.md` §8 : ligne "Essai 14 jours sans CB sur Local/Itinérant" → "Essai 7 jours avec CB"
- Pas de changement sur `app/(marketing)/tarifs/*` ni `pricing-cards.tsx` (déjà 7j)

Si 14 jours retenus (non recommandé) :
- `pricing-cards.tsx:176, 221` : "Essayer 7 jours" → "Essayer 14 jours"
- `pricing-cards.tsx:178-179, 223-224` : "CB requise · annulation 1 clic" → "Sans CB · annulation 1 clic"
- `app/(marketing)/tarifs/page.tsx` FAQ : reformuler "Comment fonctionne l'essai…"
- `app/(marketing)/page.tsx:479, 483` : "Essai 7 jours" → "Essai 14 jours"

**Critère d'acceptation**
- `grep -ri "7 jours" --include="*.tsx" app/` et `grep -ri "14 jours" --include="*.tsx" app/` retournent une cohérence (1 seul des deux côté UI)
- CLAUDE.md aligné avec le live
- Footer du record CTA toujours cohérent

---

## A4 — Corriger les CTAs `href="#"` + virer le toast "sprint 4" (30 min)

**Fichier** : `app/(marketing)/page.tsx`

4 boutons pointent vers `#` :
- L249 : "Voir la carte démo" → `href="/carte"`
- L342 : "Voir un carnet exemple" → `href="/auth/register"` (ou créer une vraie page démo plus tard)
- L384 : "Tester la carte" → `href="/carte"`
- L494/498 : "Voir la carte" (CTA bottom) → `href="/carte"`

**Fichier** : `app/(marketing)/tarifs/pricing-cards.tsx:67-71`

**Avant**
```ts
function handleTrialClick() {
  toast.info("Disponible bientôt — rejoins la liste d'attente !", {
    description: 'Les paiements Stripe arrivent lors du sprint 4.',
  })
}
```

**Après (option simple)** : remplacer le bouton par un Link vers `/auth/register?plan=local` (ou `?plan=itinerant`). À la fin du flow inscription, on capture l'intention dans `profiles.intended_plan` (à ajouter en migration 017 ou simplement en localStorage côté client).

**Après (option ultra-simple)** : retirer le toast et juste rediriger vers `/auth/register` sans capture.

**Critère d'acceptation**
- Aucun `href="#"` ne subsiste sur `app/(marketing)/page.tsx`
- Aucun usage de `toast.info` qui mentionne "sprint" dans le code
- Cliquer sur "Essayer 7 jours" amène sur `/auth/register` (avec ou sans query param)

---

## A5 — Aligner copy home avec la réalité produit (1-1.5h)

**Fichier** : `app/(marketing)/page.tsx`

**Modifications à faire** :

| Ligne | Avant | Après |
|---|---|---|
| 257 (si décision A3 = 7j) | "14j Essai gratuit garanti" | "7j Essai garanti" |
| 291 (card Carnet) | "...Stats annuelles, exports, historique infini..." | retirer "exports" : "...Stats annuelles, historique infini..." |
| 338 (CheckItem Import/export) | `title: "Import / export", desc: "GPX, JSON, Fishbrain, FishFriender. Tes données sont à toi."` | À retirer entièrement de la liste OU remplacer par : `title: "Tes données t'appartiennent", desc: "Export GPX/JSON prévu cette année. Pas d'enfermement."` |
| 374 (stat carte) | "Spots actifs aujourd'hui · 217 · Score > 80/100 dans ton département" | "Plus de 100 spots ciblés au lancement · Couverture France entière" |
| 408 (CheckItem Floutage GPS) | `desc: "Toute prise publique est positionnée dans un rayon de 2 km. Anti spot-burning."` | `desc: "Toute prise publique est positionnée dans un rayon de 1 km. Anti spot-burning."` |
| 409 (CheckItem Modération) | `title: "Modération humaine", desc: "Pêcheurs ambassadeurs régionaux + IA pour signaler les abus."` | `title: "Modération communautaire", desc: "Signalement à 1 clic. Charte stricte. Modération IA prévue post-beta."` |

**Critère d'acceptation**
- Plus aucune affirmation mensongère sur la home
- Floutage GPS = 1 km partout (home + tarifs si mentionné + CLAUDE.md cohérent)
- Lecture honnête : un beta-testeur qui découvre le produit ne se sent pas trompé

---

## A6 — Témoignages fictifs : retirer ou marquer (1h)

**Fichier** : `app/(marketing)/page.tsx:420-465` (section Témoignages)

**Option recommandée — retirer toute la section**, remplacer par un bloc "Pourquoi maintenant" ou un bloc statistiques marché :

Suggestion de remplacement (au même endroit) :
```tsx
{/* ── POURQUOI MAINTENANT ─────────────────────────────────── */}
<section className="py-16 lg:py-24 bg-sand-100">
  <div className="mx-auto max-w-[1200px] px-5">
    <div className="text-center max-w-[680px] mx-auto mb-10 lg:mb-12">
      <Kicker>Le bon moment</Kicker>
      <h2 className="mt-3">Pourquoi un carnet de pêche en 2026 ?</h2>
    </div>
    <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
      {/* 3 cards : 1,5M pêcheurs en mer FR / Hausse pratique post-COVID / Apps US pas adaptées au littoral FR */}
    </div>
  </div>
</section>
```

**À remettre une fois la beta privée tournée (sprint 11)** avec 3 vrais témoignages de beta-testeurs réels (consentement écrit).

**Critère d'acceptation**
- Aucun témoignage fictif sur le site live
- Section remplacée ou simplement supprimée (page reste cohérente)

---

# Bloc B — Dette technique sprint 7 (2h)

## B1 — Neutraliser le scoring perso inerte sur fiches spots (1h)

**Contexte** (cf RECAP sprint 7 § "À faire (suivi)") : le badge `⚡ Perso` sur les fenêtres solunar des fiches spots repose sur `personalMultiplier` qui était calculé à partir des conditions des catches. Or les conditions ne sont quasi jamais renseignées sur les vraies prises (champ optionnel) → multiplicateur ≈ 1.0 systématiquement → InsightChip inerte mais visible.

**Action** : retirer l'affichage tant que la logique n'est pas remplacée par le futur scoring "vraie performance" (sortie loguées vs catches).

**Fichiers à modifier** :
- `components/spots/SpotBestMomentsSection.tsx` : retirer le passage du badge `⚡ Perso`
- `components/solunar/BestMomentCard.tsx` : retirer le rendu de `InsightChip`
- `components/solunar/DayBestMoments.tsx` : idem
- `app/actions/solunar.ts` : retirer le passage `userId` au calcul (ou le garder mais ne pas l'utiliser pour multiplier)
- `lib/solunar/scoring.ts` + `lib/solunar/next-window.ts` : garder le paramètre `personalMultiplier` optionnel (signature stable), mais documenter qu'il est ignoré pour l'instant
- `components/scoring/InsightChip.tsx` : marquer comme deprecated dans le commentaire de tête ou déplacer dans `_deprecated/`

**Ne PAS toucher** :
- `app/(app)/profil/page.tsx` + `components/scoring/PersonalScoreSection.tsx` → mode descriptif honnête, à garder ✅
- `lib/scoring/catch-analysis.ts` + `patterns.ts` → utile pour PersonalScoreSection ✅
- `app/api/crons/compute-spot-scores/route.ts` + `lib/scoring/spot-scores-job.ts` → markers carte génériques, à garder ✅

**Critère d'acceptation**
- Fiche spot live : plus aucun badge "⚡ Perso" ou InsightChip visible
- Page `/profil` : `PersonalScoreSection` toujours fonctionnel avec mode descriptif
- Tests passent toujours (les tests d'`insights.test.ts` peuvent rester, ils valident des helpers internes)

---

## B2 — Documenter la dette scoring perso (10 min)

Créer `docs/sprint-7.5/scoring-perso-deferred.md` ou ajouter dans `docs/ROADMAP.md` backlog technique :

```markdown
## Scoring perso "vraie performance" (post-beta)

**Pourquoi reporté** : impossible de mesurer un vrai taux de réussite sans logger les sorties bredouilles. Le proxy "taille > médiane" mesure la grosseur, pas le succès. Échantillons trop petits sur les vraies prises actuelles.

**Pré-requis** :
- Ajouter une table `sessions` (table de sorties pêche, avec ou sans prise)
- Ou ajouter un champ `outing_session_id` sur catches + une UI "Je sors pêcher" qui logue une session même bredouille
- Recalculer le scoring perso sur la base catches/sessions = taux de réussite

**Sprint cible** : post-beta (T+3 mois après lancement public), quand assez de signal collecté
```

---

# Bloc C — Dette lint 365 erreurs (1-2h)

## C1 — Fix automatique des `react/no-unescaped-entities` (1h)

**Contexte** (cf RECAP sprint 7 partie 5A) : 365 erreurs ESLint pré-existantes, toutes du type apostrophes françaises non échappées dans JSX (`d'eau`, `c'est`, `aujourd'hui`, etc.). Le build les ignore via `eslint: { ignoreDuringBuilds: true }` dans `next.config.ts`.

**Approche recommandée** : script Node ou commande sed pour transformer en `&apos;` ciblé dans les fichiers .tsx (uniquement dans le JSX text, PAS dans les strings TypeScript).

**Méthode 1 — Plus sûre, fichier par fichier avec MultiEdit** :
1. Lancer `pnpm lint 2>&1 | grep "react/no-unescaped-entities" | cut -d: -f1 | sort -u` → liste des fichiers
2. Pour chaque fichier, identifier les apostrophes dans le JSX text (entre `>` et `<`, hors attributs et strings TS)
3. Remplacer `'` par `&apos;` dans ces zones uniquement

**Méthode 2 — Régex globale (plus rapide mais à valider)** :
- Cibler uniquement les lignes JSX text : `(>[^<>{}]*?)'([^<>{}]*?<)` → `$1&apos;$2`
- Lancer en dry-run, vérifier diff, commit si OK

**Critère d'acceptation**
- `pnpm lint` retourne 0 erreur
- `pnpm test` toujours vert
- `pnpm build` toujours vert
- Diff git ne touche QUE des `.tsx` et QUE des apostrophes en JSX text

---

## C2 — Retirer `eslint: { ignoreDuringBuilds: true }` (5 min)

**Fichier** : `next.config.ts:5`

**Avant**
```ts
const nextConfig: NextConfig = {
  // Bug pre-existant eslint-config-next v16 + @eslint/eslintrc v3 (circular JSON)
  // À corriger quand eslint-config-next sera stable avec flat config
  eslint: { ignoreDuringBuilds: true },
  ...
}
```

**Après**
```ts
const nextConfig: NextConfig = {
  // ESLint actif en build. Si une régression apparaît, fixer le code,
  // pas désactiver le lint.
  ...
}
```

**Critère d'acceptation**
- `pnpm build` passe sans `ignoreDuringBuilds`
- Si build échoue : revert et investiguer (probablement nouvelle erreur introduite ailleurs)

---

# Bloc D — Infra & discipline (4h)

## D1 — Compléter `lib/env.ts` (30 min)

**Fichier** : `lib/env.ts`

**Après**
```ts
import { z } from "zod";

const isProd = process.env.VERCEL_ENV === "production";

const envSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1),
  SUPABASE_PROJECT_REF: z.string().min(1).optional(),
  // Serveur uniquement — required en prod, optionnels en dev/preview
  SUPABASE_SERVICE_ROLE_KEY: isProd ? z.string().min(1) : z.string().min(1).optional(),
  CRON_SECRET: isProd ? z.string().min(8) : z.string().optional(),
});

const _env = envSchema.safeParse({
  NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
  NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  SUPABASE_PROJECT_REF: process.env.SUPABASE_PROJECT_REF,
  SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
  CRON_SECRET: process.env.CRON_SECRET,
});

if (!_env.success) {
  console.error("❌ Variables d'environnement invalides :", _env.error.format());
  throw new Error("Variables d'environnement manquantes ou invalides. Vérifie ton .env.local.");
}

export const env = _env.data;
```

**Critère d'acceptation**
- En dev : `pnpm dev` démarre même sans `CRON_SECRET` / `SERVICE_ROLE_KEY`
- En CI / preview : idem
- En prod (Vercel) : si une des deux vars manque, le build échoue (mieux qu'un silent fail runtime)

---

## D2 — Réconciliation migrations + procédure (1h)

1. Lancer `npx supabase db diff --linked` (ou via Studio direct) pour voir s'il reste un drift après la migration 015
2. Si drift restant : créer migration 017 qui le résorbe
3. Ajouter à `supabase/README.md` un encadré :

```markdown
## ⚠️ Discipline migrations — règle d'or

**Toute modification du schéma DB DOIT passer par un fichier de migration committé.**

Procédure obligatoire :
1. Créer `supabase/migrations/0XX_description.sql` (numéro suivant disponible)
2. Tester en dev local : `supabase db reset` ou `supabase db push`
3. Commit + push
4. Appliquer en remote via Supabase Studio SQL Editor (copier-coller) OU `supabase db push`
5. Régénérer les types : `pnpm dlx supabase gen types typescript --project-id glgciwwnpmgifyhbvxsw > lib/types.ts`
6. Commit `lib/types.ts`

**Jamais** :
- ❌ Modifier une migration déjà appliquée (créer une migration corrective à la place)
- ❌ Éditer le schéma directement dans Supabase Studio sans créer la migration locale (cf drift 015)
- ❌ Push de code qui dépend d'une colonne ou RPC non encore en remote

Avant chaque sprint, lancer `supabase db diff --linked` pour vérifier l'absence de drift.
```

**Critère d'acceptation**
- `supabase db diff --linked` retourne "no schema difference"
- Procédure documentée dans `supabase/README.md`

---

## D3 — Régénérer `lib/types.ts` (5 min)

```bash
pnpm dlx supabase gen types typescript --project-id glgciwwnpmgifyhbvxsw > lib/types.ts
```

**Critère d'acceptation**
- `lib/types.ts` contient les tables/RPC ajoutées en migrations 013-016 (`spot_scores`, `get_spots_for_scoring`, colonnes scoring sur `catches`)
- `pnpm typecheck` = 0 erreur

---

## D4 — Setup CI GitHub Actions minimal (1h)

Créer `.github/workflows/check.yml` :

```yaml
name: Check

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  check:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v3
        with:
          version: 9
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: pnpm
      - run: pnpm install --frozen-lockfile
      - run: pnpm lint
      - run: pnpm typecheck
      - run: pnpm test
```

**Critère d'acceptation**
- Workflow vert sur `main` après push
- Toute PR future déclenche les 3 checks
- Lien CI badge visible dans README (optionnel)

**Note** : tests E2E Playwright + Lighthouse CI restent prévus sprint 11.

---

## D5 — Cleanup routes dev/test (30 min)

**Fichiers à auditer** :
- `app/test/page.tsx`
- `app/dev/scoring-preview/page.tsx`
- `app/dev/test-photo/page.tsx`
- `app/api/dev-test/route.ts`

Pour chacun, vérifier qu'il y a un guard du type :
```ts
import { notFound } from 'next/navigation'

export const dynamic = 'force-dynamic'

export default function DevPage() {
  if (process.env.NODE_ENV !== 'development') {
    notFound()
  }
  // ...
}
```

`/dev/solunar-preview` le fait déjà bien (sprint 6 RECAP). À copier pour les autres.

**Alternative** : supprimer ces pages si plus utilisées (ex: `app/test/page.tsx` semble être un leftover).

**Critère d'acceptation**
- En prod, `curl https://www.carnet-de-peche.com/test` → 404
- En prod, `curl https://www.carnet-de-peche.com/dev/scoring-preview` → 404
- En prod, `curl -X GET https://www.carnet-de-peche.com/api/dev-test` → 404 ou 405
- En dev (`NODE_ENV=development`) : ces pages fonctionnent normalement

---

## D6 — Cleanup `dev-server.log` + `.gitignore` (2 min)

**Action** :
```bash
echo "dev-server.log" >> .gitignore
git rm --cached dev-server.log
```

**Critère d'acceptation**
- `dev-server.log` n'est plus tracké par git
- `pnpm dev` génère bien le log mais il est ignoré

---

## D7 — Vérifier Vercel env vars en prod (5 min)

**Vérifier dans Vercel Dashboard → Project Settings → Environment Variables** que les vars suivantes sont définies pour `Production` :

- `NEXT_PUBLIC_SUPABASE_URL` ✓
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` ✓
- `SUPABASE_PROJECT_REF` ✓
- **`SUPABASE_SERVICE_ROLE_KEY`** ← à vérifier
- **`CRON_SECRET`** ← à vérifier (doit matcher ce que Vercel Cron utilise)

**Critère d'acceptation**
- Les 5 vars listées présentes en Production
- Un redeploy a été déclenché après l'ajout éventuel (sinon les nouvelles vars ne sont pas chargées par les fonctions serveur)

---

## D8 — Déclencher le cron 1× manuellement + smoke test (10 min)

**Action** : peupler `spot_scores` pour que les markers carte cessent d'être gris (cf RECAP sprint 7 "Avant / pendant le déploiement").

**Méthode 1** : déclenchement Vercel via dashboard Cron Jobs → "Run now"

**Méthode 2** : appel HTTP direct (depuis localhost ou Postman) :
```bash
curl -X GET \
  -H "Authorization: Bearer $CRON_SECRET_PROD" \
  https://www.carnet-de-peche.com/api/crons/compute-spot-scores
```

**Smoke test post-cron** :
- `/carte` en prod : les markers ont des couleurs (pas tous gris)
- SQL Supabase : `select count(*) from spot_scores` retourne ≥ 10 lignes
- SQL Supabase : `select * from spot_scores order by computed_at desc limit 3` montre des scores 0-100

**Critère d'acceptation**
- Au moins 10 lignes dans `spot_scores`
- Markers carte colorisés visibles sur `/carte`

---

# Reporté à plus tard (post sprint 7.5)

| Item | Sprint cible | Pourquoi pas maintenant |
|---|---|---|
| Intégration WorldTides API (~3$/mois) | Sprint 9 ou 11 | Décision pricing à valider, table cache déjà prête (migration 006) |
| Audit RLS systématique automatisé | Sprint 8 (avant tables `feed_*`) | Précaution avant pivot social |
| Tests E2E Playwright | Sprint 11 (polish + beta) | Pas critique avant beta |
| Lighthouse CI | Sprint 11 | Idem |
| Setup Sentry | Sprint 11 | Idem |
| Setup Plausible / PostHog | Sprint 11 | Idem |
| Migration `char(3)` → `varchar` department | Backlog | Cosmétique, évite les `.trim()` |
| Retirer `shadcn` deps → devDep | Backlog | Cosmétique |
| Retirer Unsplash de `next.config.ts` images | Backlog | Cosmétique |

---

# Checklist finale de sortie (à valider par John)

Avant de marquer le sprint 7.5 comme terminé et de passer au sprint 8 :

- [ ] `pnpm lint` = 0 erreur
- [ ] `pnpm typecheck` = 0 erreur
- [ ] `pnpm test` = 116/116 vert
- [ ] `pnpm build` passe sans `ignoreDuringBuilds`
- [ ] CI GitHub Actions vert sur `main`
- [ ] Site live `/spots/pointe-du-raz` retourne `canonical = .com/spots/pointe-du-raz`
- [ ] Footer : 3 liens `/fil`, `/especes`, `/techniques` → soit pages stubs OK, soit liens retirés
- [ ] Pricing live cohérent (7j ou 14j partout, jamais les deux dans la même session de scroll)
- [ ] Page `/tarifs` : bouton "Essayer X jours" redirige vers `/auth/register` (plus de toast "sprint 4")
- [ ] Home : aucun `href="#"`, aucune mention "import/export", "ambassadeurs", "217 spots actifs", "2 km"
- [ ] Témoignages fictifs retirés ou clairement marqués
- [ ] Fiches spots : plus de badge "⚡ Perso" inerte
- [ ] `/profil` : `PersonalScoreSection` fonctionne (mode descriptif)
- [ ] Vercel : `CRON_SECRET` + `SUPABASE_SERVICE_ROLE_KEY` configurés en prod
- [ ] Cron a tourné au moins 1× : `spot_scores` contient ≥ 10 lignes
- [ ] Carte live : markers colorisés (pas tous gris)
- [ ] `supabase db diff --linked` = "no schema difference"
- [ ] CLAUDE.md §2 mis à jour : sprint 7 ✅ + sprint 7.5 ✅

Une fois tous ces points cochés → on attaque sprint 8 (fil communautaire).

---

*Brief généré par Claude le 2026-05-20. Voir aussi `docs/AUDIT-2026-05.md` pour le contexte complet et `docs/ROADMAP.md` pour la suite.*
