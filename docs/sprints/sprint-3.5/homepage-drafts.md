# Sprint 3.5 — Drafts copy homepage

> Trois sections à refondre + illustrations à muscler. Pour chaque section : 2-3 options. Coche celle qui te plaît (ou panache : "A pour le titre + C pour le body"). Je code dès que tu valides.

---

## Section 1 — Les 3 stats sous le CTA hero

**État actuel** (`app/(marketing)/page.tsx`, ligne 253-263) :

```
100% canne     |  Carnet               |  14j
Du bord,       |  Au cœur du produit   |  Essai gratuit
aucun compromis|                       |  garanti
```

Le problème : "Carnet" et "100% canne" ne sont pas des chiffres. La section essaye de faire une stat-row mais sonne creux.

### Option A — Format promesse concrète (recommandé)

```
3 taps          |  Auto             |  1 km
Pour loguer     |  Marée, vent,     |  Floutage GPS
ta prise        |  lune captés      |  systématique
```

→ Trois bénéfices tangibles. Chaque colonne renvoie à un pilier du produit (carnet → carte → communauté).

### Option B — Positionnement vs concurrence

```
Du bord         |  Atlantique +     |  Carnet
Uniquement,     |  Manche + Médit.  |  Gratuit
pas généraliste |  France métro.    |  Toujours
```

→ On affirme l'hyper-spécialisation. Direct, sans détour.

### Option C — Stats provisoires (en attendant les vrais chiffres)

```
6 espèces       |  3 techniques     |  14j
Bar, dorade,    |  Leurre, surf,    |  Essai gratuit
lieu jaune…     |  vif, flottante   |  sans CB
```

→ Plus factuel mais moins fort. À garder en réserve si tu veux du "concret quantifié".

---

## Section 2 — Headline du bloc carnet ("Strava pour pêcheurs")

**État actuel** (ligne 329) :

```
KICKER : Le carnet de pêche
H2    : Strava pour pêcheurs. Sans la toxicité.
BODY  : Chaque session devient un souvenir traçable. Tu vois ton année
        en un coup d'œil : ta plus belle prise, ton spot fétiche,
        tes meilleures conditions.
```

Le problème : Strava emprunte une identité. On veut la nôtre. + emploie un tiret cadratin (à virer).

### Option A — Identité produit propre (recommandé)

```
KICKER : Le carnet de pêche
H2    : Ton carnet papier, qui se remplit tout seul.
BODY  : Photo, espèce, taille : 3 taps. Marée, vent, lune, pression
        sont captés automatiquement. Au fil des sessions, tu vois
        apparaître les patterns que ton cerveau ne pouvait pas retenir.
```

→ Métaphore familière (carnet papier) + différenciation immédiate (se remplit tout seul). Concret.

### Option B — Tournée transformation utilisateur

```
KICKER : Le carnet de pêche
H2    : Chaque sortie devient une donnée. Chaque donnée, un avantage.
BODY  : Ta plus belle prise, ton spot fétiche, ton heure d'or. Capturés
        sans effort, analysés sans bullshit. Tu progresses en pêchant,
        pas en lisant des forums.
```

→ Plus ambitieux, plus "tu maîtrises". Risque : peut paraître prétentieux.

### Option C — Anti-corporate frontal

```
KICKER : Le carnet de pêche
H2    : Le carnet le plus simple à remplir que tu aies eu.
BODY  : Trois taps pour loguer ta prise. Les conditions sont captées
        automatiquement. À la fin de l'année, tu vois ce qu'un carnet
        papier ne t'aurait jamais montré : ton coefficient idéal,
        ton heure d'or, ton spot fétiche.
```

→ Promesse simple et directe. Très lisible. C'est presque l'option A reformulée.

---

## Section 3 — Le kicker "Trois piliers, zéro bullshit"

**État actuel** (ligne 278) : `Trois piliers, zéro bullshit`

### Option A (recommandé)

`Carnet, carte, communauté` — trois mots qui sont les trois piliers. Tautologique mais fort.

### Option B

`Trois piliers, un produit cohérent` — garde la structure rythmique, remplace l'argot par du concret.

### Option C

`Trois piliers` — minimaliste, laisse le H2 porter le message.

---

## Section 4 — Faux témoignages (suppression)

**État actuel** (lignes 420-465) : 3 témoignages avec noms inventés (Yann L., Julien R., François B.) + photos avatars + étoiles.

**Action** : suppression complète de la section.

### Quoi mettre à la place ?

- **Option A (recommandé)** : Rien. On laisse le flow `Feature Communauté → CTA Banner`. Plus court, plus sincère.
- **Option B** : Une section "Pourquoi maintenant" (le market gap : FishFriender généraliste, Spot de Pêche vieillot, pas d'offre canne-du-bord-FR). Sert d'argument vs. de témoignage.
- **Option C** : Une section "Rejoins la première vague" — formulaire d'inscription beta avec compteur (`X pêcheurs déjà inscrits`).

Si tu veux remplacer (B ou C), je te propose la copy dans un second round.

---

## Section 5 — Illustration plus détaillée

**État actuel** : 4 illustrations SVG abstraites + un AppMock stylisé.

User feedback : "rendant plus détaillé et en raccord avec ce qu'on propose".

### Option A — Densifier les SVG existants (rapide)

- AppMock : ajouter une vraie courbe de marée mini, un badge "Marée +88", un mini-graph d'activité spot
- VisualCarnet : ajouter une photo de poisson en placeholder (silhouette de bar) + tags techniques
- VisualCarte : ajouter le contour précis de la Bretagne, des isobathes
- VisualCommunaute : ajouter des photos placeholder dans les cards

→ ~2-3h de travail. Garde l'esthétique. Plus dense visuellement.

### Option B — Vraies captures d'écran du produit (impact max)

- On screenshote les vraies pages `/carnet`, `/carnet/[id]`, future `/carte`
- On les insère dans des "frames" mobile dans la page
- Plus crédible, montre le vrai produit

→ Plus long (~ 1 journée). Plus convaincant à la conversion. Risque : si le produit évolue, screenshots à refaire.

### Option C — Hybride (recommandé)

- **Hero** : on garde l'AppMock SVG mais on le densifie (option A) ET on ajoute en dessous un sous-titre "Aperçu du carnet"
- **Sections feature** : on remplace les 3 VisualX abstraits par des screenshots du produit en mode "lazy crop" (montre le bout d'une vraie carte, le bout d'une vraie fiche de prise)
- **Communauté** : reste SVG (pas de vrai contenu pour l'instant)

→ Combo "joli" + "crédible". 3-4h de travail.

---

## Section 6 — Tirets cadratin (`—`)

À purger sur cette page (homepage) — j'en ai compté 4 occurrences :

| Ligne | Contexte | Proposition |
|---|---|---|
| 230 | "… échange avec les pêcheurs de ton coin **—** sans donner tes spots." | "… échange avec les pêcheurs de ton coin, **sans** donner tes spots." |
| 296 | "couches météo, marées **—** et un score 0-100 par spot." | "couches météo, marées, **et** un score 0-100 par spot." |
| 369 | "vent, structures et **— c'est ce qui change tout —** les prises réelles loguées par les membres." | "vent, structures, **et surtout** les prises réelles loguées par les membres." |
| 402 | "Anti-fishbrain : les prises se partagent (avec floutage GPS), les techniques s'échangent, mais les coins secrets restent secrets." | Pas de tiret ici, OK |

Plus deux dans `Strava pour pêcheurs` (section 2 si tu choisis l'option A).

Sur les pages guides : je passerai derrière une fois ces drafts validés.

---

## Résumé : ce que tu dois cocher

1. **Stats sous hero** : A / B / C
2. **Bloc carnet (titre+body)** : A / B / C (ou panaché)
3. **Kicker "3 piliers"** : A / B / C
4. **Faux témoignages** : A (suppression) / B (pourquoi maintenant) / C (rejoins la beta)
5. **Illustrations** : A (densifier SVG) / B (vrais screenshots) / C (hybride)

Dès que tu réponds, j'applique sur le code et je te ping pour relecture sur Vercel preview.
