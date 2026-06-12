# 🎬 Le pire moment pour pêcher en été — série « Erreurs du bord »
> **Statut** : PRÊT À TOURNER
> **Durée cible** : 35 s · **Plateformes** : TikTok / Reels / Shorts (9:16)

## 1. Script

- **Hook (< 2 s)** : « En été, le pire moment pour pêcher, c'est quand il fait le plus beau. »
- **Voix-off (95 mots)** : Plein soleil, 14 h, mer d'huile : zéro touche. Normal. L'eau de surface chauffe, la lumière écrase tout, le poisson décroche ou descend. Le bar, lui, mange quand la lumière bascule : la première heure après le lever du soleil, la dernière avant le coucher. Ajoute une marée qui bouge pile à ce moment-là, et tu tiens une vraie fenêtre. Donc cet été, inverse ta journée : plage l'après-midi, canne à l'aube ou au crépuscule. Tu pêches moitié moins longtemps, et tu prends plus.
- **Texte à l'écran** (5 incrustations, chiffres en mono) :
  1. `14h` + plein soleil = 0 touche
  2. la lumière écrase tout
  3. aube + crépuscule = les vraies fenêtres
  4. lumière qui bascule + marée qui bouge
  5. pêche moins longtemps, prends plus
- **CTA (un seul)** : « Tes meilleures fenêtres, spot par spot : carnet-de-peche.com »

## 2. B-roll IA — prompts Veo 3.1 / Kling 3.0

> Deux ambiances lumineuses VOLONTAIREMENT opposées : plans 1 (midi cru) vs plans 2-4 (golden hour) — c'est le contraste qui raconte l'histoire.

| # | Durée | Prompt (anglais, prêt à coller) | Rôle dans la vidéo |
|---|---|---|---|
| 1 | 6 s | `Vertical 9:16 static wide shot, flat calm sea under harsh midday summer sun, French Atlantic coast, glassy water surface, heat haze on the horizon, hard overhead light, washed-out colors, photorealistic, no people, no boats, no text` | Le « mauvais moment » : mer morte, lumière écrasante |
| 2 | 8 s | `Vertical 9:16 slow forward drone push at low altitude, rocky granite headland on the Brittany coast, France, gentle swell wrapping around dark rocks, golden hour warm low light, long shadows, photorealistic, no people, no boats, no text` | Bascule vers le « bon moment » |
| 3 | 6 s | `Vertical 9:16 static close-up shot, calm sea surface at dusk with small baitfish ripples and dimples, warm orange light reflecting on the water, Brittany France, only water moving, photorealistic, no people, no fish visible above water, no text` | L'activité qui démarre au crépuscule |
| 4 | 6 s | `Vertical 9:16 gentle handheld pan left, empty sandy beach at sunrise, soft morning haze, French Atlantic coast, wet sand reflecting pale warm light, small waves, photorealistic, no people, no text` | L'aube, l'autre fenêtre |

Générer 2 variantes des plans 1 et 2 (hook + bascule = les plans critiques).

## 3. Plans réels obligatoires (non générables)

- [ ] **Silhouette lancer au crépuscule** (smartphone, 10-15 s) : toi en contre-jour sur une digue ou plage publique, 2-3 lancers. Cadrage vertical, soleil bas dans le dos du sujet, pas de spot identifiable.
- [ ] **Écran app — fiche spot, section « Meilleurs moments »** (enregistrement d'écran réel, 10 s) : le calendrier des créneaux avec les badges de qualité — c'est la preuve produit du CTA.

## 4. Voix-off ElevenLabs

> Ton : complice, un peu taquin sur le hook, posé ensuite. Voix de chaîne habituelle. Stability ~50 %, similarity ~75 %.

```
En été, le pire moment pour pêcher... c'est quand il fait le plus beau. <break time="0.6s" />
Plein soleil, quatorze heures, mer d'huile : zéro touche. <break time="0.4s" /> Normal.
<break time="0.4s" /> L'eau de surface chauffe. La lumière écrase tout. Le poisson décroche, ou descend.
<break time="0.6s" /> Le bar, lui, mange quand la lumière bascule. <break time="0.3s" /> La première heure après le lever du soleil. <break time="0.3s" /> La dernière avant le coucher.
<break time="0.4s" /> Ajoute une marée qui bouge pile à ce moment-là... et tu tiens une vraie fenêtre.
<break time="0.6s" /> Donc cet été, inverse ta journée. Plage l'après-midi. Canne à l'aube, ou au crépuscule.
<break time="0.4s" /> Tu pêches moitié moins longtemps. Et tu prends plus.
<break time="0.6s" /> Tes meilleures fenêtres, spot par spot : carnet de pêche point com.
```

## 5. Montage CapCut — timeline

| Temps | Plan | Texte écran | Audio |
|---|---|---|---|
| 0-2 s | B-roll 1 (midi cru) | HOOK en gros, centre | VO hook |
| 2-8 s | B-roll 1 suite | `14h` + plein soleil = 0 touche | VO « Plein soleil… décroche ou descend » |
| 8-10 s | B-roll 1 → fondu vers B-roll 2 | la lumière écrase tout | VO (fin du constat) |
| 10-17 s | B-roll 2 (golden hour) | aube + crépuscule = les vraies fenêtres | VO « Le bar, lui, mange… » |
| 17-22 s | B-roll 3 (surface au crépuscule) | lumière qui bascule + marée qui bouge | VO « Ajoute une marée… » |
| 22-27 s | PLAN RÉEL silhouette lancer | — (laisser respirer) | VO « Donc cet été, inverse ta journée… » |
| 27-31 s | B-roll 4 (aube) | pêche moins longtemps, prends plus | VO « Tu pêches moitié moins… » |
| 31-35 s | PLAN RÉEL écran app « Meilleurs moments » | CTA carnet-de-peche.com | VO CTA |

Réglages : sous-titres auto FR (vérifier « coef », « PM/BM » si présents), texte hors zone basse (UI TikTok), chiffres en police mono, musique discrète -20 dB sans drop, export 1080×1920 — version sans watermark pour Reels/Shorts.

## 6. Garde-fous ✅

- [x] Réglementation/chiffres : aucun chiffre réglementaire ; affirmations comportementales générales (activité aube/crépuscule, eau de surface qui chauffe) = savoir pêcheur standard, pas de [VÉRIFIER] nécessaire
- [x] Aucun spot précis non public montré ou nommé (consigne explicite sur le plan réel)
- [x] Aucune feature absente de la prod promise — le CTA s'appuie sur « Meilleurs moments » (en prod depuis le sprint 6)
- [x] Aucun concurrent nommé ou dénigré
- [x] Gestes techniques → plans réels uniquement (lancer = silhouette smartphone ; prompts B-roll en `no people`)
- [x] Angle « horaires de marée faux » non utilisé
- [x] Pas de duplication des scripts #1-#10 de `VIDEOS-COURTES.md` (l'angle créneau horaire d'été n'y figure pas)
