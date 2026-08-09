# Fishing Grid — analyse de leur pipeline vidéo TikTok (2026-07-02)

> Analyse forensique de 3 vidéos uniques (@fishinggrid) : « poissons de Bretagne » (69s), « pêcher par fortes chaleurs » (38s), « débuter à la pêche au flotteur » (28s). Métadonnées ré-encodées par TikTok (576×1024, Lavf), donc identification par analyse visuelle frame par frame + forensique audio.

## 1. Leur recette (identifiée avec haute confiance)

**Format éditorial.** Vidéo éducative verticale de 30 à 70s : hook question (« Tu veux savoir comment… ? ») → 3-5 conseils illustrés → CTA « notre app gratuite, lien en bio » avec screen-record de leur page Google Play (badges Play/App Store + « 4,6★ 10k+ »). Une info par plan, un plan toutes les 2-3s.

**Voix off = ElevenLabs** (confirmé John ; corroboré par la forensique : silences numériques parfaits entre phrases, zéro respiration, pacing uniforme 0,4-0,7s). Pas de musique de fond, pas de SFX (vérifié au spectrogramme sur la vidéo 38s).

**Script = LLM** (ChatGPT ou équivalent) : structure ultra-répétitive (« Le X est un poisson courant sur les côtes bretonnes. Il fréquente… »), zéro anecdote perso, et un lapsus de registre tu→vous en plein script (« Elle se pratique facilement en famille… vous pourrez attraper des sars »). Personne ne relit sérieusement.

**Assets visuels = collage de banques, quasi pas d'IA générative image :**
- Icônes flat à contour noir épais : style Flaticon/Freepik (panneaux, thermomètre, profondeur, pin de carte, flèches).
- Emojis natifs + stickers CapCut (trophée, chrono, check vert, croix rouge, cercle rouge « dessiné main »).
- Illustrations naturalistes d'espèces (bar, sar, dorade, orphie, lieu) : cohérentes avec les assets espèces de leur app (réemploi probable) ou pack stock.
- Scènes 2D flat (pêcheur en zodiac, bateau coulé, décor algues/rochers) : illustrations stock animées par simple déplacement de calques. Le pêcheur en bateau est le seul asset possiblement généré par IA.
- Footage réel : drone côtes/plages + sous-marin (épave, bancs de lançons, maquereaux) : banques gratuites type Pexels/Pixabay ou rushes GoPro perso.
- 1 vrai graphique scientifique (température/oxygène dissous) : capture d'image existante.

**Montage = éditeur type CapCut** : textes « pill » colorés avec police arrondie à contour (presets CapCut), composition récurrente « ligne de flottaison » (bloc couleur en haut = surface, scène sous-marine en bas).

## 1bis. Leur grammaire d'animation (décomposée image par image, rafales 6 fps)

C'est le mouvement permanent qui rend leurs vidéos « vivantes ». Rien n'est jamais statique, mais chaque mouvement est élémentaire :

1. **Zoom lent continu (Ken Burns) sur chaque plan** : la scène entière grossit doucement du début à la fin du plan.
2. **Sprites qui glissent** : chaque poisson traverse l'écran en translation linéaire, à sa propre vitesse et direction (pas d'articulation : sprites rigides, léger bob vertical au mieux).
3. **Bulles qui montent** en boucle + petites particules autour de l'appât (points qui apparaissent = attraction).
4. **Stickers animés** (le vrai « juice ») : soleil doodle avec rayons qui s'étirent/rétractent + rotation, thermomètre qui pulse, cercle rouge « dessiné main » en write-on progressif (il se trace en ~0,6s), check/croix qui pop. Ce sont des stickers animés CapCut / icônes animées type Lottie-Flaticon, pas du motion design manuel.
5. **Textes pill en pop-in** : fade + scale rapide (~3 frames), parfois rebond.
6. **Tween de couleur du fond** : l'eau passe de teal à brun-chaud pendant la voix « l'eau chauffe » : le décor raconte le script.
7. **Ligne de flottaison ondulante** (ripple léger) + ligne/flotteur avec pseudo-physique simple (bob, coulée).

Chaque effet = 2-10 lignes de code dans un pipeline rendu par code (sine bob, translate + easing, particles, stroke-dashoffset pour le write-on, lerp de couleur). En CapCut manuel = stickers animés de la bibliothèque + 2 keyframes par élément.

**En clair : coût marginal quasi nul, ~1-2h par vidéo, aucune compétence motion design.** C'est un pipeline script LLM → ElevenLabs → collage CapCut d'assets gratuits. Leur force est la cadence et la constance, pas la qualité.

## 2. Leurs faiblesses exploitables

1. Pas de musique ni SFX : rétention laissée sur la table.
2. DA incohérente : 4 styles d'illustration différents dans un même plan (icône Flaticon + emoji + illustration naturaliste + flat pastel).
3. Zéro donnée réelle : conseils génériques (« pêche à l'aube ») jamais appuyés par des chiffres, marées, coefficients.
4. Zéro preuve produit : l'app n'apparaît qu'en capture de store à la fin, jamais en usage.
5. Scripts sans voix propre ni personnalité (LLM brut, lapsus tu/vous).

## 3. Reproduire en mieux pour Carnet de Pêche

Le skill `video-courte-peche` (Cowork) couvre déjà tout leur pipeline : idées + script (hook/VO/texte écran/CTA), animation 2D **rendue par code dans la DA v2** (navy/gold, JetBrains Mono pour les chiffres), VO ElevenLabs, montage/mix auto → mp4 1080×1920 + légende + hashtags. Différences à jouer :

- **Cohérence DA** : un seul langage visuel (instrument de précision marine) vs leur patchwork. Reconnaissance de marque immédiate au scroll.
- **La data comme spectacle** : courbes de marée animées, coefficients, fenêtres d'activité chiffrées, score 0-100. C'est notre moat produit ET un différenciateur visuel qu'ils ne peuvent pas copier sans notre produit.
- **Audio complet** : VO ElevenLabs (voix FR chaleureuse, tags de respiration/émotion) + lit musical -18 dB + SFX discrets (splash, tick). Eux : voix nue.
- **Scripts relus** : tutoiement constant (règle projet), une vraie voix de pêcheur, pas de LLM brut.
- **Preuve produit in-video** : screen-record réel de l'app (carte, carnet, score) au moment du CTA, pas juste une capture de store.
- **CTA** : « lien en bio » → carnet-de-peche.com (+ codes fondateurs S68 comme hook exclusif : « 20 places »).

**Stack recommandée (rien à acheter de plus)** : Claude pour scripts/idées → ElevenLabs (déjà branché) → animations rendues par code via le skill + packs Flaticon/Freepik en appoint + footage Pexels/Pixabay → assemblage ffmpeg auto. CapCut seulement si retouche manuelle ponctuelle.

**Pour battre leur animation (le code permet ce que CapCut ne fait pas)** : queue des poissons articulée (rotation sinusoïdale d'un segment), parallaxe 3 couches (décor lointain/moyen/proche à vitesses différentes), rayons de lumière descendants, easings spring au lieu de linéaire, pops synchronisés sur la voix off et les SFX, courbe de marée qui se trace en write-on (notre signature data). Reprendre aussi leurs 2 meilleures idées : zoom lent permanent sur chaque plan + le décor qui réagit au script (tween de couleur).

**Cadence cible** : 3-4 vidéos/semaine (le skill rend le coût marginal ~0), thèmes : espèces (26 fiches = 26 vidéos), techniques, marées/coefficients, réglementation (tailles légales = format viral naturel), météo/saison.
