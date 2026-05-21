# 🔧 Brief Sprint 7.5 — Hygiène produit + dette technique

> **Durée** : 4-6 jours ouvrés (étendu suite à l'audit Claude in Chrome du 21 mai)
> **Type** : sprint de nettoyage, **pas de nouvelle feature**
> **Objectif** : repasser le site live à la réalité produit, corriger la dette critique du sprint 7, mettre en place CI + discipline migrations — pour engager le sprint 8 (fil communautaire) sur du propre.
> **Références audit** :
> - `docs/AUDIT-2026-05.md` (Claude Cowork — 2026-05-20, audit fondateur)
> - `docs/audits/ux-discovery/2026-05-21-claude-chrome.md` (Claude in Chrome — 2026-05-21, audit UX terrain) 🆕
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

> **Mise à jour 21 mai** : l'audit Claude in Chrome a confirmé que `/contact` aussi est en 404 (le footer pointe vers `mailto:` mais l'URL `/contact` est attendue par certains visiteurs / liens externes). Inclure une 4ème stub ou laisser le mailto: seul. Recommandation : ajouter `/contact` aux stubs avec un mini formulaire mailto.

**Fichiers concernés** :
- `components/layout/Footer.tsx:31-35` (les 3 liens cassés) + entrée `mailto:contact@carnet-de-peche.com` à compléter
- À créer si Option A : `app/(marketing)/fil/page.tsx`, `app/(marketing)/especes/page.tsx`, `app/(marketing)/techniques/page.tsx`, `app/(marketing)/contact/page.tsx`

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

# Bloc E — Découvertes audit Claude in Chrome (4-6h) 🆕

> Ce bloc consolide les trouvailles de `docs/audits/ux-discovery/2026-05-21-claude-chrome.md` non encore couvertes par les blocs A-D.

## E1 — 🚨 P0 RGPD : compléter les pages légales (1-2h)

**Criticité maximale** : `/legal/confidentialite` et `/legal/mentions-legales` contiennent `[À COMPLÉTER PAR JOHN]` en clair sur la prod. **Non-conformité RGPD + L121 Code Conso**. À traiter en TOUT PREMIER, avant même les corrections SEO du Bloc A.

> **🆕 21 mai** : John a fourni son extrait INPI. **Contenu prêt à intégrer dans 3 fichiers, sans placeholder** :
> - `docs/sprint-7.5/legal-content/mentions-legales.md`
> - `docs/sprint-7.5/legal-content/confidentialite.md`
> - `docs/sprint-7.5/legal-content/cgu.md`
>
> **Décision adresse (21 mai)** : John a choisi de publier son adresse perso (627 Chemin des Impiniers, 06220 Vallauris) pour débloquer le sprint 7.5. Une domiciliation commerciale (SeDomicilier / Kandbaz ~15 €/mois) sera setup dans 2-4 semaines (post-sprint 8) et les 3 pages seront mises à jour à ce moment-là.
>
> Procédure recommandée pour Claude Code :
> 1. Lire les 3 fichiers MD (contenu prêt, adresse déjà intégrée)
> 2. Intégrer le contenu dans les pages `.tsx` correspondantes en respectant le design system (composant `LegalLayout` qui existe déjà dans `components/layout/LegalLayout.tsx`)
> 3. Auditer avant push : `grep -r "À COMPLÉTER" app/` doit retourner 0 résultat.
> 4. **TODO post-sprint 8** : créer un issue/reminder "Remplacer adresse perso par domiciliation commerciale" dans `docs/ROADMAP.md` backlog technique.

**Fichiers cibles** :
- `app/(marketing)/legal/confidentialite/page.tsx`
- `app/(marketing)/legal/mentions-legales/page.tsx`
- `app/(marketing)/legal/cgu/page.tsx`

**Sources de contenu** (à copier-adapter, contenu déjà rédigé conforme RGPD + LCEN) :
- `docs/sprint-7.5/legal-content/mentions-legales.md`
- `docs/sprint-7.5/legal-content/confidentialite.md`
- `docs/sprint-7.5/legal-content/cgu.md`

**Infos INPI consolidées** (déjà intégrées dans les contenus MD) :
- Dénomination : John Sebastien CAMPBELL (Entrepreneur Individuel)
- SIREN : 977 995 174
- SIRET : 977 995 174 00025
- Code APE : 6201Z Programmation informatique
- Date immatriculation RNE : 24/04/2024
- TVA : franchise en base (non applicable, article 293 B CGI)
- Directeur de publication : John Sebastien Campbell

**Critère d'acceptation**
- `grep -r "À COMPLÉTER" app/` retourne 0 résultat
- `grep -r "{{ADRESSE_DOMICILIATION}}" app/` retourne 0 résultat (avant push prod)
- SIRET réel présent dans `/legal/mentions-legales`
- Hébergeur Vercel déclaré
- Politique confidentialité contient les 10 sections du fichier MD
- CGU contient les 16 articles du fichier MD
- Date de dernière mise à jour visible en pied de chaque page

---

## E2 — 🚨 P0 Refonte `/home` post-login (1h)

**Problème** : la page `/home` affiche actuellement "Le carnet, la carte et la communauté arrivent bientôt" alors que toutes ces features fonctionnent. Un utilisateur loggé après onboarding voit un message de waitlist, ce qui est totalement incohérent et casse la confiance.

**Fichier** : `app/(app)/home/page.tsx`

**Avant** (probable) : page statique avec un message générique

**Après** : mini-dashboard avec :
```tsx
// Pseudo-code
- Salutation : "Salut {profile.username}"
- 3 stats clés : total prises, plus belle prise (espèce + taille), spot fétiche
- "Prochaine session optimale" : prochain créneau exceptionnel via getNextBestWindow (du sprint 6)
- 2 CTA principaux :
  - "Logger une prise" → /carnet/nouvelle
  - "Voir la carte" → /carte
- Section "Tes 3 dernières prises" avec lien "Voir tout le carnet"
```

**Récupérer les données** : RPC `get_my_catch_stats` (migration 007) qui existe déjà.

**Empty state** (user qui n'a aucune prise) : "Bienvenue {username}. Pour démarrer, logue ta première prise ou explore la carte." + 2 CTA.

**Critère d'acceptation**
- `/home` connecté n'affiche plus aucun mot "bientôt" ou "waitlist"
- Stats personnelles affichées (au moins username + nb prises)
- 2 CTA visibles sans scroll

---

## E3 — P0 Date inputs en français (30 min)

**Problème** : les `<input type="datetime-local">` s'affichent en format US (MM/DD/YYYY) au lieu de DD/MM/YYYY.

**Cause probable** : pas de `lang="fr-FR"` ou `lang="fr"` sur le `<html>` ou attribut absent du `<input>`. Le format datetime-local est régi par la locale du navigateur, mais Next.js avec un `<html lang="fr">` devrait suffire.

**Fichiers à vérifier** :
- `app/layout.tsx` : confirmer `<html lang="fr">` (devrait déjà être là)
- Tous les `<input type="datetime-local">` et `<input type="date">` dans :
  - `components/catches/CatchForm.tsx`
  - `app/(app)/profil/profile-form.tsx`

**Si `lang="fr"` est déjà là** : le bug peut venir du navigateur de John en mode US. Mais l'audit Claude in Chrome l'a vu en `fr-FR`, donc c'est probablement Next.js qui ne propage pas la locale au natif des inputs.

**Fix** : ajouter explicitement `lang="fr-FR"` sur les inputs OU passer à un date picker custom (react-day-picker, déjà dispo via shadcn).

**Critère d'acceptation**
- Form `/carnet/nouvelle` : le placeholder vide affiche `JJ/MM/AAAA` ou équivalent
- Une date saisie s'affiche en format français

---

## E4 — P0 Messages de validation en français (30 min)

**Problème** : sur `/carnet/nouvelle`, soumission avec champ Espèce vide → erreur affichée "Invalid input" (en anglais).

**Cause** : zod messages par défaut en anglais, pas localisés.

**Fix** : utiliser les message custom de zod en français dans `lib/catches/schema.ts` :

```ts
// Avant
export const catchSpeciesEnum = z.enum([...])

// Après
export const catchSpeciesEnum = z.enum([...], {
  errorMap: () => ({ message: 'Choisis une espèce pour continuer' }),
})
```

**Et pour tous les autres champs critiques** : species, technique, location_method, latitude, longitude, size_cm, etc.

**Alternative globale** (recommandée) : configurer un errorMap global zod en français dans `lib/zod-config.ts` qui couvre tous les codes d'erreur standard ("Required", "Invalid input", "Number must be greater than", etc.).

**Critère d'acceptation**
- Aucun message d'erreur en anglais visible sur `/carnet/nouvelle`, `/profil`, `/auth/*`
- Messages spécifiques par champ (pas un générique "Invalid input")

---

## E5 — P0 Lat/long picker "Saisir manuellement" (30 min)

**Problème** : sur `/carnet/nouvelle` quand l'utilisateur choisit "Saisir manuellement" pour la localisation, les inputs lat/long affichent des valeurs en placeholder (ex: `48.0382`) mais ne sont PAS pré-remplies. L'utilisateur croit que les champs sont remplis, submit, et la validation échoue avec un message rouge sous le bloc — confus.

**Fichiers** :
- `components/catches/CatchForm.tsx` (cherchez la section lieu manuel)

**Deux options de fix** :

**Option A — Pré-remplir vraiment** : si la dernière prise du user avait des coordonnées, pré-remplir avec celles-là. Sinon, géoloc browser (si autorisée) puis pré-remplir. Sinon, laisser vides avec placeholder neutre "ex : 48.0382".

**Option B — Placeholder neutre uniquement** : changer le placeholder en quelque chose qui ne ressemble pas à une valeur (ex: "Latitude (ex : 48.0382)"). Plus simple, moins risqué.

**Recommandation** : Option B pour le sprint 7.5, Option A en sprint 8+ si retours utilisateurs.

**Critère d'acceptation**
- Le placeholder ne ressemble plus à une valeur réelle pré-remplie
- L'utilisateur comprend qu'il doit saisir une valeur
- La validation rouge à la submission ne surprend plus

---

## E6 — P1 Mots de copy à corriger (30 min)

Corrections rapides, toutes < 5 min chacune :

| Fichier | Avant | Après |
|---|---|---|
| `components/catches/CatchCard.tsx` ou détail fiche prise | Label section `COMMENT` (= "How" en anglais) | `MÉTHODE` ou `TECHNIQUE` |
| `components/map/NearbyPanel.tsx` (drawer title) | "Spots autour de toi" | "Spots autour de moi" (cohérent avec le bouton qui le déclenche) |
| `app/(marketing)/tarifs/pricing-cards.tsx:21` | "App iOS / Android (sprint 13+)" | "App iOS / Android — bientôt" |

**Critère d'acceptation**
- `grep -ri "sprint " app/(marketing)/` ne retourne aucun match (vocabulaire interne hors UI publique)
- `grep -ri "autour de toi" app/` retourne 0 match
- `grep -ri "comment" components/catches/` ne révèle pas de label visible utilisateur (le mot reste OK en code/commentaires)

---

## E7 — P1 Cleanup seed carnet (15 min)

**Problème** : le compte test "Seychi" a 3 prises identiques "Bar · Leurres · 52cm · 1.80kg" + des spots non-côtiers (Grazac, Vallauris) alors que le produit est positionné "à la canne du bord en mer".

**Cause** : seed data ou test data laissée traîner.

**Fix** : nettoyer manuellement via SQL :
```sql
-- À adapter selon le user_id de Seychi
delete from public.catches
where user_id = '<UUID Seychi>'
  and (
    location_label in ('Grazac', 'Vallauris')
    or id in (
      -- garder seulement la première des 3 doublons, supprimer les 2 autres
      select id from (
        select id, row_number() over (partition by species, technique, size_cm, weight_kg order by created_at) as rn
        from public.catches
        where user_id = '<UUID Seychi>'
      ) sub where rn > 1
    )
  );
```

**Bonus** : ajouter une contrainte UI dans `/carnet/nouvelle` pour limiter le picker spot/location aux départements côtiers (déjà filtré pour les spots officiels, mais en saisie manuelle ou label libre, on peut taper "Grazac"). Acceptable de laisser ouvert v1.

**Critère d'acceptation**
- Compte Seychi a un carnet sans doublon évident et sans spots intérieurs
- (Optionnel) le picker location dans `/carnet/nouvelle` warning si la lat/long n'est pas dans un département côtier

---

## E8 — P2 Quick wins UX (1-1.5h)

Items moins critiques mais à grouper :

**E8.1 — Tap targets header & footer**
- Nav header = 39px de haut, footer = 17px — sous le seuil 44px (W3C/Apple)
- Fichiers : `components/layout/Header.tsx`, `components/layout/Footer.tsx`
- Fix : padding vertical `py-3` au lieu de `py-2` sur les `<li>` du footer, +6px sur les liens du header
- Critère : tous les tap targets cliquables ≥ 44×44 px

**E8.2 — Skeleton sur la carte au premier paint**
- Actuellement, la zone carte reste blanche ~3s pendant que MapLibre charge le bundle + les tiles
- Fichier : `components/map/MapView.tsx` (init useEffect)
- Fix : afficher un skeleton (couleur bleu marine / océan) en `position: absolute inset-0` qui disparaît quand `map.on('load')` se déclenche
- Critère : plus de zone blanche, transition propre

**E8.3 — Picker itinéraire multi-app**
- Actuellement seul Google Maps est proposé
- Fichier : `components/spots/SpotDetailsActions.tsx` ou équivalent (bouton "Itinéraire GPS")
- Fix : un menu dropdown avec 3 options : Google Maps, Apple Plans (`maps://?daddr=lat,lng`), Waze (`https://waze.com/ul?ll=lat,lng&navigate=yes`)
- Critère : 3 options visibles, chacune fonctionnelle sur la plateforme cible

**E8.4 — Hero images sur 2 guides manquants**
- Liste `/guides` : 2 cards sur 3 sans hero image (placeholder teal vide)
- Fichiers : guides MDX correspondants dans `app/(marketing)/guides/*/page.tsx`
- Fix : ajouter une image (Unsplash gratuite, libre de droits, ou photo perso de John) en frontmatter `cover_image`
- Critère : les 3 guides ont une hero image visible en card et en haut de page

---

## E9 — P2 Sécurité externe (10 min)

**Problème** : les liens d'attribution MapTiler / OSM ont `target="_blank"` sans `rel="noopener noreferrer"` (vulnérabilité tabnabbing mineure).

**Fix** : Grep `target="_blank"` dans le repo, ajouter `rel="noopener noreferrer"` partout.

**Critère** : `grep -rE 'target=("|\\")_blank' --include="*.tsx" . | grep -v "noopener"` retourne 0 résultat.

---



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

**Bloc A — Marketing & SEO**
- [ ] Site live `/spots/pointe-du-raz` retourne `canonical = .com/spots/pointe-du-raz`
- [ ] Footer : 4 liens (`/fil`, `/especes`, `/techniques`, `/contact`) → soit pages stubs OK, soit liens retirés
- [ ] Pricing live cohérent (7j ou 14j partout, jamais les deux dans la même session de scroll)
- [ ] Page `/tarifs` : bouton "Essayer X jours" redirige vers `/auth/register` (plus de toast "sprint 4")
- [ ] Home : aucun `href="#"`, aucune mention "import/export", "ambassadeurs", "217 spots actifs", "2 km"
- [ ] Témoignages fictifs retirés ou clairement marqués

**Bloc B — Dette sprint 7**
- [ ] Fiches spots : plus de badge "⚡ Perso" inerte
- [ ] `/profil` : `PersonalScoreSection` fonctionne (mode descriptif)

**Bloc C — Lint**
- [ ] `pnpm lint` = 0 erreur
- [ ] `pnpm build` passe sans `ignoreDuringBuilds`

**Bloc D — Infra**
- [ ] `pnpm typecheck` = 0 erreur
- [ ] `pnpm test` = 116/116 vert
- [ ] CI GitHub Actions vert sur `main`
- [ ] Vercel : `CRON_SECRET` + `SUPABASE_SERVICE_ROLE_KEY` configurés en prod
- [ ] Cron a tourné au moins 1× : `spot_scores` contient ≥ 10 lignes
- [ ] Carte live : markers colorisés (pas tous gris)
- [ ] `supabase db diff --linked` = "no schema difference"

**Bloc E — Discovery UX (Claude in Chrome 21 mai)** 🆕
- [ ] 🚨 `grep -r "À COMPLÉTER" app/` retourne 0 résultat (RGPD)
- [ ] `/legal/mentions-legales` contient SIRET + hébergeur réels
- [ ] `/legal/confidentialite` couvre toutes les sections RGPD
- [ ] `/home` post-login affiche un dashboard, plus de message "arrivent bientôt"
- [ ] Date inputs en format FR (DD/MM/YYYY) sur `/carnet/nouvelle` et `/profil`
- [ ] Plus aucun message d'erreur en anglais ("Invalid input") sur les forms
- [ ] Lat/long picker manuel : placeholder neutre ou valeur réellement pré-remplie
- [ ] Label "COMMENT" → "MÉTHODE" sur fiche prise
- [ ] Drawer carte titré "Spots autour de moi" (cohérent avec le bouton)
- [ ] Card Découverte sans mention "sprint 13+"
- [ ] Durée guide `peche-au-bar-au-leurre` synchronisée entre liste et page
- [ ] Compte test Seychi : carnet nettoyé (pas de doublons, pas de Grazac/Vallauris)

**Bloc E2 — Quick wins (optionnel mais recommandé)**
- [ ] Tap targets header/footer ≥ 44px
- [ ] Skeleton sur la carte au premier paint
- [ ] Picker itinéraire avec Google Maps + Apple Plans + Waze
- [ ] 3 guides ont une hero image
- [ ] `grep -rE 'target=("|\\")_blank' . | grep -v noopener` = 0 résultat

**Méta**
- [ ] CLAUDE.md §2 mis à jour : sprint 7 ✅ + sprint 7.5 ✅

Une fois tous ces points cochés → on attaque sprint 8 (fil communautaire).

---

*Brief généré par Claude le 2026-05-20. Voir aussi `docs/AUDIT-2026-05.md` pour le contexte complet et `docs/ROADMAP.md` pour la suite.*
