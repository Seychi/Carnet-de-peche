# Sprint 10 — RECAP : Guides + SEO programmatique + riposte Fishing Grid

> Exécuté les 2026-06-11/12. Bloc 0 + Bloc 4 livrés le 11/06 (mergés sur `main`, déployés).
> Blocs 1-2-3-5 livrés le 12/06 sur la branche **`sprint-10-seo`** (5 commits, pas pushée).
> Brief : `docs/sprint-10/BRIEF.md`.

## Fait — par bloc

| Bloc | Contenu | Où |
|---|---|---|
| 0 — Social 100% gratuit | Migration 022 (RLS + triggers rate-limit 10 posts/50 comm. par 24h), actions/front/copy alignés. **En prod.** | `main` (61ed368) |
| 4 — Vérif marées SHOM | **NO-GO copy** (médiane 31-93 min) MAIS biais constant par port (résidu 2-9 min) → option calibration gratuite au sprint 11. | `main` (2163355) + `docs/sprint-10/tides-accuracy.md` |
| 1 — Moteur MDX + guides | Loader zod + 4 composants (SpotCard, TechniqueBadge, TideExplainer, RegulationBox) + routes ISR + JSON-LD Article/HowTo + sitemap dynamique + `_TEMPLATE.mdx` + `COMMENT-ECRIRE.md` (César). **5 guides en ligne** : 3 migrés à URLs identiques + « courbe de marée » (#5) + « coefficients bar » (#7). | `sprint-10-seo` (0a6fc1b, 2269cad) |
| 2 — Pages programmatiques | **350 pages** `/peche/<espèce>/<technique>[/<dépt>]` : combinatoire whitelist (zéro combo absurde — lieu jaune hors Méditerranée, matrice technique×espèce), ~600 mots/page assemblés depuis 6 modules éditoriaux, données live (spots + prises 30j), maillage dense, generateStaticParams paresseux (15 au build). | `sprint-10-seo` (2e0e9f9) |
| 3 — Fiches espèces | **6 fiches profondes** `/especes/[slug]` : réglementation sourcée/datée par façade, saisons par façade (tableaux activité), techniques → pages programmatiques, postes selon conditions, FAQ (FAQPage JSON-LD), live data. Le stub devient le vrai index. | `sprint-10-seo` (b56f605) |
| 5 — SEO global | Sitemap ≈ 380 URLs (guides + 350 programmatiques + 6 espèces + spots), encart « Guides liés » sur fiches spots, BreadcrumbList partout, canonical par page. | `sprint-10-seo` (2e0e9f9, b56f605) |

## Réglementation : vérifiée aux sources, pas de mémoire

Tous les chiffres publiés ont été vérifiés le 11-12/06/2026 (Légifrance, DIRM, FFESSM) et **3 erreurs des anciens contenus ont été corrigées** :
- Bar : 42 cm (l'ancien guide disait 36) · 3/j nord du 48e, 2/j sud (arrêté 01/04/2026) · no-kill fév-mars (Atl/Manche) · marquage
- Lieu jaune : **42 cm (l'ancien disait 30 !)** · 2/j · fermé 01/01→30/04 (arrêté 24/12/2024)
- Dorade royale : 23 cm (l'ancien disait 25) · Maquereau 20 cm · Sar 25 cm · Orphie 30 cm (arrêté 26/10/2012 modifié 06/01/2026)

C'est LE différenciateur vs le tuto bar de Fishing Grid (réglementation non sourcée, non datée chez eux).

## Critères de sortie du brief

- ✅ Bloc 0 en prod, suite verte, tarifs/home alignés
- ✅ 5 guides MDX (metadata + OG + JSON-LD) — cible « ≥ 5 »
- ✅ 6 fiches espèces, checklist comparative complète
- ✅ 350 pages programmatiques (critère ≥ 200, cible ~500 : la matrice honnête en donne 350 — gonfler à 500 aurait créé des combos absurdes)
- ✅ Rapport marées + décision WorldTides actée (option calibration recommandée)
- ✅ Lighthouse SEO **100** sur guide + page programmatique + fiche espèce (critère ≥ 95)
- ✅ Build 48 s (< 4 min) · typecheck 0 · 217 tests verts
- ⚠️ Lint : dette pré-existante Bloc C sprint 7.5 inchangée (fichiers du sprint propres)
- ✅ **Sitemap soumis à Search Console le 12/06/2026** (382 URLs publiées) — l'indexation Google est lancée

## Restes (production continue, pas bloquants)

- 15 guides restants de la liste des 20 (rythme : 5/sprint, César + workflows)
- Stub `/techniques` encore en « bientôt » (non prévu au brief — candidat sprint 11)
- Cover images des guides/fiches (placeholders navy + isobathes en attendant — DA-compliant)
- Curation spots : chantier parallèle John (`docs/sprint-10/spots-curation.md`) — chaque lot inséré enrichit automatiquement pages programmatiques et fiches espèces (données live)

## Comment valider

1. `pnpm build && pnpm start` → http://localhost:3000
2. `/guides` (5 guides) · `/guides/les-meilleurs-coefficients-pour-pecher-le-bar` · `/peche/bar/leurres/finistere` · `/especes/bar` · `/especes`
3. Relire en priorité les **encarts réglementaires** (c'est légal + crédibilité) et les 2 nouveaux guides marées.
4. Si OK : merge `sprint-10-seo` → `main` + push → soumettre le sitemap à Search Console.
