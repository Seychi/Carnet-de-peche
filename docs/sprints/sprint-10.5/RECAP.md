# Sprint 10.5 — RECAP : refonte UI « Instrument de précision marine » (DA v2)

> Exécuté le 2026-06-11 sur la branche `sprint-10.5-ui` (16 commits, **pas pushée** — validation John requise).
> Brief : `docs/sprint-10.5/BRIEF.md` · DA : `docs/maquette-v2/DA.md` · Captures : `docs/sprint-10.5/captures/`.

## Fait — par phase

| Phase | Contenu | Commits |
|---|---|---|
| 1 — Fondations | Tokens DA v2 dans `@theme` (navy-950 `#04141C`, gold, coral, teal-300, sémantique score), JetBrains Mono via `next/font` → `font-mono`, ombres 2 niveaux, bordures sand-200. Bonus : `ink-400`/`ink-600` n'existaient pas — toutes les classes `text-ink-400/600` du site étaient muettes, elles rendent désormais le gris voulu | `245bb17` |
| 2 — Composants signature | `components/ui-v2/` : TagData, ScoreRing, TideSparkline, InstrumentsBar, Bathy, Chip. Button variante `accent`, Card variante `live`. Emojis-icônes → Lucide. Vitrine `/dev/ui-v2` | `63f9401` |
| 3 — App shell | Les routes `(app)` n'avaient **aucune nav** : construit TabBar mobile + FAB central → `/carnet/nouvelle`, sidebar desktop ≥ 960px, header allégé, **bandeau instruments branché** (PM/BM, sens marée, vent, houle, créneau solunar du dépt — fetchs existants, cache 1h, 0 nouvelle API). Bottom sheet : le Sheet maison suffisait, **vaul non installé** (0 dépendance ajoutée) | `0d0542e` |
| 4 — Écrans app | Carnet `f7ec55a` · Carte `1be5f1c` · Fiche spot `6733a3c` · Fil `58a4a81` · Loguer `6eca6bb` · Profil `5ca6580` · Onboarding + **écran final `/onboarding/fini`** `a2bc68c` | 7 commits |
| 5 — Marketing | Home (hero instrument + sections numérotées) `054b4a2` · Tarifs (Local featured navy) `bdbbd29` · OG images ×3 + footer `fe219a9` · résidus emojis `6137028` | 4 commits |
| 6 — Vérif finale | Ce document + MAJ CLAUDE.md/ROADMAP | — |

## Vérifications (critères du brief)

- **Tests** : 217/217 verts à chaque commit. **Typecheck** : 0 erreur. **Build** : OK, compile en ~23 s (< 4 min) — ⚠️ ne jamais builder pendant que `next dev` tourne (`.next` partagé → faux « PageNotFoundError »).
- **Lint** : 0 erreur sur tous les fichiers touchés par le sprint. La dette pré-existante (~360 `react/no-unescaped-entities`, Bloc C sprint 7.5 reporté) est inchangée.
- **Lighthouse** (build prod local, mobile) :

| Page | SEO | Best Practices | Accessibilité |
|---|---|---|---|
| `/` | **100** | 100 | 91 |
| `/tarifs` | **100** | 100 | 92 |
| `/spots/cap-sizun` | **100** | 100 | 81* |

\* mode snapshot : l'event `load` ne se déclenche pas sur les pages à carte (requête tuiles MapTiler ouverte) — comportement pré-existant, pas une régression du sprint. `/carte` : même limitation.
- **Responsive** : passes 360 / 390 / 1280 px sur home, tarifs, carnet, fil, spot, loguer, profil, onboarding/fini — pas de scroll horizontal, tap targets ≥ 44 px.
- **Critères de sortie** : plus un emoji-icône (les emojis de *copy* type toasts restent, c'est la voix) ; chiffres métier en mono partout où ils passent (carnet, carte, spot, fil, instruments, tarifs, OG).

## Vérification en conditions réelles

Compte de test jetable créé en prod (`test_uiv2_sprint105@carnet.test`, 3 prises seed) pour valider le shell connecté, le fil (post créé puis supprimé), le carnet et l'écran onboarding/fini avec de vraies données. **Supprimé de prod en fin de sprint** (cascade vérifiée : 0 profile, 0 catch, 0 post restants).

## Écarts assumés vs maquettes (cf QUESTIONS.md)

1. **Q1 — Tab bar sur `/carte`** : non ajoutée (layout `(map)` fullscreen, conflits bottom sheets). L'onglet Carte de la tab bar y mène. À trancher au prochain re-skin carte.
2. **Q2 — Coefficient de marée** : pas de donnée (Open-Meteo ne l'expose pas). La place est prévue dans `InstrumentsBar` (`coef?: number`), s'affichera dès que la donnée existera (dérivation amplitude ou WorldTides, cf rapport marées sprint 10).
3. **Q3 — Double anneau score fiche spot** : scoring spot neutralisé au sprint 7.5 (non démontrable) — pas de chiffre réaffiché. `<ScoreRing>` est prêt pour le scoring « vraie performance ».
4. **Chiffre dans les pastilles carte** : `get_spots_for_map` n'expose pas le score (1 ligne SQL + regen types → sprint 11).
5. **Posts « alerte » à liseré coral (fil)** : pas de type de post en DB — à brancher quand le champ existera.
6. **Étoiles de difficulté `★`** : conservées (glyphe typographique, pas un emoji ; cohérent partout).

## Points d'attention pour ta relecture

- **Copy home « 100+ spots curés au lancement »** : vient de ta maquette validée, mais la prod compte 5 spots aujourd'hui. « Au lancement » est prospectif (Gate 2 exige 100 spots) — à confirmer que tu l'assumes (l'esprit sprint 7.5 était de bannir les chiffres non tenus).
- **`/onboarding/fini`** : seule addition de flow du sprint (autorisée par le brief). A nécessité une exception d'une ligne dans `middleware.ts` (les onboardés peuvent y accéder). `completeOnboarding` inchangée.
- Le header marketing (`Header.tsx`) n'a pas été re-skinné (partagé par toutes les pages marketing, la v1 reste correcte sur fond sand) — candidat à un polish ultérieur si tu veux la nav maquette (underline teal sur l'item actif).

## Restes (hors périmètre sprint, à reporter)

- Lighthouse Perf (le brief ne l'exigeait que « sans régression » — non mesurable proprement en local avec les pages carte ; à mesurer post-déploiement Vercel).
- Guides / fiches espèces / pages programmatiques : naîtront directement en DA v2 au sprint 10 (Blocs 1-3-5 restants).
- `WeeklyCalendar` + `BestMomentCard` (solunar sprint 6) : héritent des tokens mais pas de passe dédiée — re-skin opportuniste au sprint 11.

## Comment valider

1. `pnpm build && pnpm start` → http://localhost:3000
2. Mobile 390 px : `/` → inscription/login → `/carnet` (tab bar + FAB + instruments) → `/fil/29` → `/carnet/nouvelle` → `/profil` → `/tarifs`.
3. Compare avec `docs/maquette-v2/*.html` et les captures avant/après de `docs/sprint-10.5/captures/`.
4. Si OK : merge `sprint-10.5-ui` → `main` + push (auto-deploy Vercel).
