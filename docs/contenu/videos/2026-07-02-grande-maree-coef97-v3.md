# Vidéo — Grande marée coef 97 (15-17 juillet) — skill v3

- **Date** : 2026-07-02 · **Série** : « Où / quand pêcher » · **Durée** : 39,5 s · 1080×1920 30 fps
- **Fichier** : livré via Cowork (`grande-maree-coef97-v3.mp4` + `.caption.txt`)
- **VO** : réutilisation de la piste ElevenLabs de la v1 (découpée en 6 segments aux silences, 0 crédit consommé)
- **Statut vérif** : horaires/coef Brest 16/07 repris de la v1 (à re-vérifier SHOM avant publication) — sinon rien de réglementaire.

## Structure (config `v3run/grande-maree-v3/config.json` dans les outputs Cowork)

hook (COEF 97) → tide (Brest, BM 13:28 / PM 19:27) → **collage** (6 m de marnage : bar + maquereau traversent, chips chunky, stickers wave/pin/check) → sea calme (contraste coef 54) → **collage** (plan en 3 points) → cta.

## Verdict skill v3 (1er essai réel)

**Réglé vs v1** : la scène `collage` existe et fait le job (sprites naturalistes qui traversent avec bob/sway + ombre portée, chips chunky style CapCut, stickers, beats séquencés ~2 s) ; fond split clair = contraste feed ; plus de frame figée sur les 2/3 de la vidéo ; fonts de marque OK.

**Corrigé en QA stills (2 itérations)** : « → » absent du subset latin (tofu dans le kicker) → remplacé par « - » ; trajectoires sprites passant sous les chips (2 collisions) → repositionnés.

**Reste pour une v4 du skill** :
1. **Zoom lent global par scène (Ken Burns)** : LE truc que le benchmark a partout et nous nulle part.
2. `hook`/`tide`/`cards`/`cta` gèlent encore après leur animation d'entrée (~1,5 s) : ajouter boucles continues (badge qui bob, curseur qui pulse en continu, poissons silhouettes en fond).
3. Anti-collision : le renderer pourrait clamp/warn quand un sprite `dx` finit sous une chip (la QA stills ne montre que 2 instants par scène).
4. Musique : toujours aucun lit musical (le benchmark n'en a pas non plus, occasion de faire mieux) — piste : `compose_music` ElevenLabs ou banque libre, mixée à -19 dB.
5. Glyphes : documenter dans le skill « pas de → ↗ ① dans les textes » (subsets latin).

## Empreinte process
Sandbox Cowork : nohup tué en fin d'appel shell → utiliser le mode `--frames f0 f1` par tranches de ~550 frames puis `--assemble` (3 appels de ~20 s). Fonts de marque : `npm pack @fontsource/...` + fonttools woff2→ttf vers `assets/fonts/` répliqué à côté du renderer.
