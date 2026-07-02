# Lot d'assets — Illustrations par espèce (cadrage, à valider/planifier par John)

> Sprint 28, Bloc 4 tâche 1. **Décision John 2026-06-24** : on veut des **illustrations détaillées distinctes par espèce** (pas des silhouettes line-art maison). C'est un **vrai lot d'assets** → cadré ici, **pas produit ce sprint** (on n'improvise pas 20 illustrations sans direction artistique validée). En intérim, l'icône générique `<Fish>` reste en place.

## Le besoin

Aujourd'hui chaque carte de `/especes` (et les fiches) affiche le **même** pictogramme `<Fish>` générique (`app/(marketing)/especes/page.tsx:87`). On veut un **visuel distinct par espèce** pour la reconnaissance + la crédibilité éditoriale (on se compare à des concurrents avec 266 fiches illustrées).

## Périmètre : 20 espèces (catalogue actuel)

`bar`, `dorade-royale`, `lieu-jaune`, `maquereau`, `sar`, `orphie`, `seiche`, `mulet`, `sole`, `calmar`, `congre`, `vieille`, `rouget`, `dorade-grise`, `pageot`, `oblade`, `maigre`, `tacaud`, `chinchard`, `plie` (source unique : `SPECIES` dans `lib/seo/programmatic.ts`). Prévoir l'extensibilité (le catalogue peut grandir).

## Où ça se branche (3 emplacements)

1. **Cartes `/especes`** — `app/(marketing)/especes/page.tsx:87` : remplacer `<Fish>` par le visuel de l'espèce.
2. **Hero de la fiche** — `app/(marketing)/especes/[slug]/page.tsx` : visuel en grand.
3. **Sélecteur d'espèces du CatchForm** (optionnel) — `components/catches/CatchForm.tsx` : vignette devant le label (6 espèces loggables aujourd'hui).

Implémentation cible : un composant `components/especes/SpeciesArt.tsx` mappant `slug → asset`, avec **fallback `<Fish>`** pour tout slug non encore illustré (déploiement progressif sans page cassée).

## Contraintes techniques (non négociables)

- **CLS nul** : dimensions fixes (width/height ou aspect-ratio réservé). Pas d'image distante non dimensionnée.
- **Poids** : viser < 15-25 Ko/visuel servi. SVG inline si vectoriel ; sinon WebP/AVIF optimisé via `next/image` avec `sizes` correct.
- **Pas de régression perf** : `/especes` (cartes) ne doit pas exploser le First Load JS ni le LCP. Si raster, lazy-load hors viewport.
- **a11y** : `alt` descriptif par espèce (« Illustration d'un bar » …), pas juste décoratif sur la fiche.

## Garde-fou DROITS (critique)

- **Originaux uniquement.** Ne copier AUCUN visuel d'artiste/marque/banque non libre. Risque juridique réel.
- Si IA-générées : vérifier les CGU du générateur (cession des droits commerciaux) + cohérence de style entre les 20.
- Si commande à un illustrateur : contrat de cession explicite.

## Décisions qu'il reste à trancher (John)

1. **Style** : illustration réaliste détaillée ? semi-réaliste « planche naturaliste » ? flat/vectoriel riche ? (impacte format + budget + cohérence des 20).
2. **Production** : illustrateur freelance (commande) vs génération IA validée vs banque libre. → budget + délai.
3. **Format** : vectoriel (SVG, idéal perf/scaling) si le style s'y prête, sinon raster optimisé.
4. **Lot complet (20) d'un coup** ou **vague prioritaire** (les 6 du cœur produit d'abord : bar, dorade royale, lieu jaune, maquereau, sar, orphie) puis le reste.

## Intérim (ce sprint)

`<Fish>` générique conservé. Le composant `SpeciesArt` avec fallback peut être posé dès que le **style** est tranché (1 décision suffit pour démarrer). **Aucune ligne de code visuelle produite ce sprint** (respect du garde-fou « ne pas improviser sans OK »).
