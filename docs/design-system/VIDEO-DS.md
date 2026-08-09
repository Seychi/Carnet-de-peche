# VIDEO-DS — Design system vidéo Carnet de Pêche

> **À quoi sert ce fichier.** C'est la source de vérité du langage visuel des vidéos courtes (TikTok / Reels / Shorts). Il est écrit pour être importé dans **Claude Design** (import du repo GitHub) : chaque asset y est spécifié assez précisément pour être généré, vérifié et décliné sans dérive. Les SVG validés reviennent dans `docs/design-system/assets-video/svg/`, puis sont convertis en sprites PNG pour le renderer du skill `video-courte-peche`.
>
> **Barre de qualité.** Niveau visé : studio motion design, pas UGC amateur. Un asset est accepté seulement s'il passe la checklist §9. En cas de doute entre « joli » et « cohérent », choisis cohérent : 40 vidéos qui se ressemblent battent 40 vidéos jolies mais dépareillées.

---

## 1. La marque en 3 phrases (contexte pour toute génération)

Carnet de Pêche est le carnet numérique + réseau social des pêcheurs à la canne du bord en France (bar, dorade, lieu jaune, maquereau, sar, orphie). La DA s'appelle **« instrument de précision marine »** : la précision d'un instrument de navigation (chiffres en monospace, courbes de marée, panneaux techniques) mariée à une chaleur naturaliste (espèces dessinées avec respect, mer vivante). Ni cartoon enfantin, ni austérité corporate : **un bel instrument qu'on a plaisir à consulter**.

Ton éditorial : tutoiement, voix de pêcheur qui partage, données réelles. Interdits de copy : tiret cadratin « — » dans tout texte affiché, glyphes hors alphabet latin étendu (pas de → ↗ ① : les fonts embarquées ne les couvrent pas), spots précis nommés, chiffres réglementaires non sourcés.

---

## 2. Tokens

### 2.1 Couleurs cœur (héritées de l'app, `app/globals.css`)

| Token | Hex | Usage vidéo |
|---|---|---|
| `navy-950` | `#04141C` | fond sombre, contours de stickers (JAMAIS de noir pur `#000`) |
| `navy-900` | `#0A2F3D` | fond sombre secondaire, corps de flotteur |
| `panel` | `#0B2530` | panneaux instrument (courbe de marée, cartes) |
| `gold-500` | `#D9A53C` | LE chiffre métier, badges data, accents précieux |
| `coral-500` | `#E5604F` | négatif, alerte, interdit, « cross » |
| `teal-300` | `#5EEAD4` | positif, data, courbes, « check » |
| `sand-50` | `#FBF8F2` | texte principal sur fond sombre, écume |
| `muted` | `#7FA3B0` | texte secondaire, grilles, éléments discrets |

### 2.2 Palette vidéo étendue (nouvelle, spécifique aux scènes claires)

Le feed TikTok favorise les images lumineuses. Les scènes « collage » utilisent des fonds CLAIRS restant dans la famille marine :

| Token | Hex | Usage |
|---|---|---|
| `sky-day-top` | `#2E6D8C` | haut du ciel jour |
| `sky-day-bot` | `#8FBFD4` | bas du ciel jour (au-dessus de la ligne d'eau) |
| `sky-dawn-top` / `bot` | `#0B2036` / `#C77E4A` | aube |
| `sky-dusk-top` / `bot` | `#12283B` / `#D9825C` | crépuscule |
| `sky-night-top` / `bot` | `#030B12` / `#0A2233` | nuit |
| `water-1` | `#0F4C5C` | eau, bande la plus claire (sous la surface) |
| `water-2` | `#0B3A4A` | eau intermédiaire |
| `water-3` | `#082C3A` | eau profonde |
| `foam` | `#DFF3F2` | écume, ligne de flottaison, bulles |

Règle : un fond de scène = 2 à 4 de ces tons en aplats ou dégradé simple vertical. Jamais de dégradés multicolores, jamais de textures photographiques.

### 2.3 Typographie

| Rôle | Font | Usage | Tailles de référence (1080×1920) |
|---|---|---|---|
| `display` | **Space Grotesk Bold** | titres, texte de chips | chip 54-88 px, titre hook 92 px |
| `data` | **JetBrains Mono ExtraBold** | TOUT chiffre métier : coef, horaires PM/BM, tailles, dates | badge 72-96 px, kicker 40-42 px |
| `body` | **Inter** | texte courant, mentions légales | 40-46 px |

**Règle d'or de la marque : un chiffre métier passe TOUJOURS en JetBrains Mono.** « COEF 97 », « PM 19:27 », « 42 CM » : mono gold. Jamais un coefficient en Space Grotesk.

### 2.4 Formes et effets

- **Radius** : pills (chips) = hauteur/2 ; panneaux = 34 px ; cartes = 30 px.
- **Contour sticker** : `navy-950`, épaisseur 8-9 % de la taille de l'asset (style chunky lisible).
- **Ombre portée** (posée par le renderer, ne PAS la dessiner dans les SVG) : décalage 10/16 px, flou 9, noir 35 %.
- **Rotation d'accroche** : chips et stickers posés avec une rotation de -3° à +3° (jamais parfaitement droits, jamais plus inclinés).
- Pas d'effets raster dans les assets : pas de glow, pas de flou, pas de grain. Les effets vivent dans le renderer.

---

## 3. Format et grille 9:16

- **Canvas** : 1080×1920, 30 fps. Conçois à cette taille, pas de scaling mental.
- **Zones safe TikTok** : rien d'important dans les **200 px du haut** (barre de recherche), les **420 px du bas** (légende + boutons), les **140 px du bord droit** (icônes like/commentaire). Un asset peut déborder dans ces zones, un TEXTE jamais.
- **Ligne de flottaison** : élément de composition signature. Les scènes collage sont coupées par une ligne d'eau horizontale entre 28 % et 45 % de la hauteur : ciel clair au-dessus, eau en-dessous. Les infos « conditions » vivent en haut, les poissons et l'action en bas.
- **Lisibilité mobile** : tout texte doit rester lisible sur un écran de 6 pouces à bout de bras, soit ≥ 44 px après intégration. Une chip = une idée, 2 lignes max.

---

## 4. Inventaire des assets à créer (la liste de courses Claude Design)

### 4.1 Les poissons (priorité 1, le cœur du système)

**Style commun (l'ADN, à verrouiller sur l'étalon avant de décliner)** : vue de profil strict orienté vers la GAUCHE, flat vector semi-naturaliste. 3 à 4 tons par poisson + 1 ton de linework intérieur (`navy-950` à 60 % d'opacité) pour branchies, écailles suggérées (jamais dessinées une à une), rayons de nageoires. Lumière venant du HAUT (dos plus sombre, ventre plus clair, un seul rehaut `sand-50` le long du dos). Œil : disque `navy-950` + point de lumière `sand-50` (vivant, pas cartoon : PAS de gros œil rond blanc). Silhouette exacte de l'espèce : un pêcheur doit identifier l'espèce à la silhouette seule en 0,3 s. Fond transparent.

Chaque espèce, ses marqueurs d'identification NON négociables :

| Fichier | Espèce | Marqueurs obligatoires |
|---|---|---|
| `fish/bar.svg` | Bar (Dicentrarchus labrax) | corps fuselé argenté, dos gris-vert ; **2 nageoires dorsales séparées, la 1re épineuse** ; grande bouche ; opercule anguleux ; queue légèrement fourchue |
| `fish/dorade-royale.svg` | Dorade royale (Sparus aurata) | corps ovale haut et comprimé ; front bombé avec **bande dorée entre les yeux** (token `gold-500`) ; tache sombre à l'opercule ; dorsale unique |
| `fish/lieu-jaune.svg` | Lieu jaune (Pollachius pollachius) | **3 dorsales**, 2 anales ; **mâchoire inférieure proéminente** ; **ligne latérale sombre incurvée** au-dessus des pectorales ; flancs cuivrés-jaunâtres |
| `fish/maquereau.svg` | Maquereau (Scomber scombrus) | torpille effilée ; dos **bleu-vert métallique zébré de rayures sombres ondulées** ; ventre nacré ; **pinnules** entre dorsale/queue ; caudale très fourchue |
| `fish/sar.svg` | Sar commun (Diplodus sargus) | corps ovale comprimé argenté ; **8-9 fines bandes verticales sombres** ; **tache noire sur le pédoncule caudal** ; lèvres épaisses |
| `fish/orphie.svg` | Orphie (Belone belone) | corps TRÈS allongé ; **long bec fin** ; dorsale et anale reculées près de la queue ; dos bleu-vert, flancs argent |

**Structure SVG exigée (pour l'animation)** : groupes nommés `body`, `tail` (pédoncule + caudale, pivot posé à la jonction corps/queue), `fins` (nageoires paires), `eye`. Le renderer anime la queue en rotation sinusoïdale : sans groupe `tail` séparé, l'asset est refusé.

Déclinaisons par poisson : `*-silhouette.svg` (aplat `navy-950` uni, pour arrière-plans et ombres chinoises).

### 4.2 Stickers (priorité 2, la ponctuation visuelle)

Style commun : pictos chunky, contour `navy-950` (8-9 %), remplissages EXCLUSIVEMENT dans la palette §2 (le check est `teal-300`, PAS vert pomme ; la croix est `coral-500`, PAS rouge pompier). Géométrie simple lisible à 120 px. Fond transparent, viewBox carré.

| Fichier | Contenu |
|---|---|
| `sticker/check.svg` | coche dans un disque teal |
| `sticker/cross.svg` | croix dans un disque coral |
| `sticker/pin-spot.svg` | épingle de carte, tête `coral-500`, à la pointe un petit rond `foam` |
| `sticker/vagues.svg` | 3 lignes d'onde `water-1`, épaisseur sticker |
| `sticker/thermometre.svg` | thermomètre, tube `foam`, mercure `coral-500` |
| `sticker/soleil.svg` | disque `gold-500` + 8 rayons trapèze |
| `sticker/lune.svg` | croissant `sand-50` sur disque `navy-900` |
| `sticker/coef.svg` | cadran demi-cercle gradué avec aiguille (l'instrument signature en mini) |
| `sticker/flotteur.svg` | LE flotteur marque : corps `navy-900`, cerclage + centre `gold-500` (repris du logo app) |
| `sticker/hamecon.svg` | hameçon fin `muted`, reflet `sand-50` |
| `sticker/horloge-etale.svg` | cadran avec secteur ±2h surligné `teal-300` |
| `sticker/courant.svg` | 3 chevrons directionnels `gold-500` |
| `sticker/jumelles.svg` | jumelles `navy-900`, verres `teal-300` (repérage) |
| `sticker/oxygene.svg` | 3 bulles `foam` de tailles croissantes |
| `sticker/trophee.svg` | coupe `gold-500` (records, défis) |
| `sticker/ecaille-regle.svg` | poisson stylisé sur règle graduée mono (maille/taille légale) |

### 4.3 Fonds de scène (priorité 3)

4 fonds complets 1080×1920, chacun en version jour / aube / crépuscule / nuit quand pertinent :

1. `bg/collage-split.svg` : ciel dégradé + ligne de flottaison `foam` ondulée + eau en 2 aplats. C'est le fond de la scène reine.
2. `bg/colonne-eau.svg` : plein cadre sous-marin, 3 bandes `water-1→3`, rayons de lumière diagonaux discrets (opacité ≤ 8 %), fond sableux suggéré.
3. `bg/panneau-instrument.svg` : `navy-950` + grille de points teal 3 % + panneau `panel` central (l'écrin de la courbe de marée).
4. `bg/cta.svg` : `navy-950`, houle `water-2/3` en bas, espace central dégagé pour le wordmark.

### 4.4 Décor (priorité 3)

`decor/algue-{1,2,3}.svg` (laminaire, fucus, zostère : 3 silhouettes `water-1` à 70 %, groupes nommés par brin pour l'ondulation), `decor/rocher-{1,2}.svg` (masses `navy-900` arrondies, liseré `muted` 20 %), `decor/nuage-{1,2}.svg` (doodle une ligne `foam`), `decor/oiseau.svg` (goéland 2 traits), `decor/ecume-ligne.svg` (bande de crête réutilisable).

### 4.5 Composants texte et data (priorité 2)

À générer comme composants HTML/CSS dans Claude Design (ils seront reproduits par le renderer, la référence visuelle fait foi) :

- `comp/chip-titre` : pill `navy-950` 92 %, texte Space Grotesk Bold `sand-50`, padding 40/22, rotation ±2°.
- `comp/chip-data` : idem mais contour `gold-500` 3 px, texte mono `gold-500` (les chiffres).
- `comp/chip-positif` / `chip-negatif` : liseré `teal-300` / `coral-500` + picto check/cross intégré à gauche.
- `comp/badge-coef` : le badge coefficient : mono XXL, disque-cadran en fond.
- `comp/kicker` : surtitre mono `gold-500` 40 px, lettres espacées +8 %.
- `comp/courbe-maree` : panneau `panel`, sinusoïde `teal-300` 8 px, points PM/BM `gold-500` étiquetés mono, grille horaire `muted` 15 %, curseur « maintenant » gold pulsant. C'est LE composant signature : soigné comme un cadran de montre.
- `comp/watermark` : `@carnetdepeche` mono `muted` 60 %, coin bas-gauche au-dessus de la zone safe.
- `comp/endcard-cta` : wordmark CARNET DE PÊCHE + soulignement gold + url en chip + tagline « Logue. Partage. Progresse. »

### 4.6 Personnage (optionnel, v2)

Un seul personnage autorisé : silhouette de pêcheur du bord (canne, posture 3/4 dos) en aplat `navy-950`, SANS visage détaillé. Interdiction du cartoon full-body style corporate. À ne faire qu'après validation des lots 1-3.

---

## 5. Motion (les assets sont conçus pour bouger)

Le renderer anime ; les assets doivent le permettre. Règles héritées du benchmark (Fishing Grid) et durcies :

- **Un événement visuel toutes les 2-3 s** : apparition de chip, entrée de poisson, sticker qui pop, changement de fond.
- **Rien n'est jamais figé** : zoom lent continu par plan (1,00 → 1,05), poissons en traversée avec bob sinusoïdal + ondulation de queue, bulles montantes, ligne d'eau ondulante, badge data qui respire.
- **Entrées** : chips = pop overshoot 0,45 s ; poissons = glissée depuis le bord (jamais de pop sur un poisson) ; stickers = pop + rotation d'arrivée.
- **Le décor raconte le script** : l'eau se réchauffe → l'eau vire au chaud ; coef qui monte → houle qui grossit.
- Conséquences pour les SVG : groupes nommés et pivots posés (§4.1), pas d'ombres ni d'effets cuits dans l'asset, chaque élément animable séparément.

---

## 6. Audio (le design system s'entend aussi)

- **Voix off** : voix française à créer via ElevenLabs voice design et à VERROUILLER comme voix de marque. Brief : homme 35-45 ans, timbre chaleureux légèrement iodé, débit posé (~150 mots/min), énergie de connivence (« je te montre un truc »), jamais démonstratif type pub radio. Une fois choisie : `voice_id` noté ici et utilisé partout.
- **Lit musical** : nappe discrète -19 dB sous la voix, textures organiques (guitare claire, percussions boisées, pads marins), jamais d'EDM. Le concurrent n'a AUCUNE musique : c'est un différenciateur gratuit.
- **SFX** : bibliothèque courte : splash discret (entrée poisson), tick d'instrument (apparition data), woosh doux (transition). Maximum 1 SFX par beat, mixés -24 dB.
- **Ressac** : bruit de mer synthétique existant du renderer, -33 dB, continu.

---

## 7. Workflow Claude Design (mode d'emploi du test)

1. **Importer le repo GitHub** `Seychi/Carnet-de-peche` dans Claude Design : il extraira ce fichier + `app/globals.css` (tokens app) + `docs/maquette-v2/DA.md`. Vérifier dans son panneau design system que navy/gold/teal et les 3 fonts sont bien détectés.
2. **Créer lot par lot, dans l'ordre** : Lot 1 = l'étalon (le bar). Itérer dessus jusqu'à validation TOTALE (c'est lui qui fixe l'ADN). Lot 2 = les 5 autres poissons déclinés de l'étalon. Lot 3 = stickers. Lot 4 = fonds + décor. Lot 5 = composants texte/data.
3. **Itérer avec les outils Claude Design** : commentaires inline (« la caudale est trop cartoon, réfère-toi à la silhouette réelle »), sliders pour les épaisseurs, demander des variantes A/B avant de choisir.
4. **Exporter** : SVG (ou HTML pour les composants §4.5), nommage EXACT de l'inventaire §4, viewBox au ratio de l'asset, fond transparent.
5. **Retour repo** : déposer dans `docs/design-system/assets-video/svg/`. La conversion sprites (SVG → PNG 2000 px de large, via `rsvg-convert` ou Inkscape) et la copie vers le skill sont scriptées ensuite.

### Briefs prêts à coller (démarre chaque lot avec ça)

**Lot 1, l'étalon :**
> Dessine un bar (Dicentrarchus labrax) en flat vector semi-naturaliste, vue de profil strict orienté vers la gauche, pour le design system vidéo décrit dans docs/design-system/VIDEO-DS.md du repo. Respecte les marqueurs d'identification du §4.1 (2 dorsales séparées dont la 1re épineuse, grande bouche, opercule anguleux), la palette §2 (dos gris-vert froid, flancs argent chaud sand, linework navy-950 à 60 %), lumière du haut, œil navy avec point de lumière. 3-4 tons + linework, aucun dégradé, aucun effet. Groupes SVG nommés body/tail/fins/eye avec pivot de queue à la jonction du pédoncule. Il doit être identifiable par un pêcheur en 0,3 seconde et rester lisible à 200 px de large sur fond clair (#8FBFD4) comme sombre (#04141C). Propose 3 variantes de niveau de détail (minimal / médian / riche).

**Lot 3, exemple sticker :**
> Décline le set de stickers du §4.2 de docs/design-system/VIDEO-DS.md : pictos chunky, contour #04141C à 8-9 % de la taille, remplissages STRICTEMENT dans les tokens du §2, géométrie lisible à 120 px, viewBox carré, fond transparent. Commence par check, cross, pin-spot, flotteur (reprends le flotteur du logo app : corps navy-900, cerclage et centre gold-500). Même famille visuelle que l'étalon bar validé.

---

## 8. Anti-patterns (ce qui a déjà échoué, ne pas refaire)

1. **Planches naturalistes hétéroclites** (gravures domaine public détourées) : styles et couleurs incohérents, artefacts de détourage. C'est ce que ce DS remplace.
2. **Chips noir pur style CapCut** : hors DA. Le chunky, oui ; le noir #000 générique, non.
3. **Mélanger 4 styles dans un plan** (emoji + icône flat + gravure + photo) : c'est le défaut n°1 du concurrent, notre cohérence est l'avantage.
4. **Glyphes hors latin** (→, ①, emoji dans le texte rendu) : tofu garanti.
5. **Texte hors zones safe** ou < 44 px : illisible dans le feed.
6. **Assets « posés » sans être animables** (un seul path soudé) : refusés, cf §4.1.

---

## 9. Checklist d'acceptation (par asset, avant d'entrer au repo)

- [ ] Espèce/objet identifiable instantanément (test : montrer 0,5 s à quelqu'un qui pêche)
- [ ] Uniquement des couleurs des tokens §2 (tolérance : nuances de ces tons pour les volumes)
- [ ] Lisible à sa taille d'usage sur `#8FBFD4` ET sur `#04141C`
- [ ] Même épaisseur relative de trait, même lumière (haut), même niveau de détail que l'étalon
- [ ] SVG propre : groupes nommés, pas d'effets raster, pas de fonts vectorisées inutiles, viewBox exact
- [ ] Nommage conforme à l'inventaire §4
- [ ] Ombre NON incluse (le renderer la pose)

---

*Version 1.0, 2026-07-02. Ce fichier est la référence : toute évolution du langage visuel vidéo se fait ICI d'abord, puis dans les assets. Voir aussi : `docs/maquette-v2/DA.md` (DA app), `docs/concurrents/fishing-grid-videos.md` (benchmark et grammaire d'animation), skill `video-courte-peche` (production).*
