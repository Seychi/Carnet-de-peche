# 🎬 Workflow de production vidéo — Claude + Chrome (rodé le 2026-06-12)

> Première exécution : pack `2026-06-12-golden-hour-ete.md`. Ce doc décrit le workflow reproductible pour produire une vidéo courte de A à Z avec Claude (Cowork + extension Chrome), et ce qui reste à la main de John.

## Vue d'ensemble

```
Pack .md (skill video-courte-peche)
   → B-roll : Kling (kling.ai, compte John connecté dans Chrome)
   → VO : ElevenLabs (elevenlabs.io, compte John, voix FRANCK)
   → John : 2 plans réels + montage CapCut + publication
```

## 1. B-roll — Kling AI

- **URL** : kling.ai/app/video/new — John doit être connecté dans Chrome.
- **Réglages validés** : modèle **VIDEO 2.5 Turbo**, **720p**, **5 s**, **9:16**, 1 sortie, **Multi-Shot OFF**, **Sound Effects OFF** (la VO vient d'ElevenLabs).
- **Coûts (constatés)** : 2.5 Turbo 720p 5 s = **15 crédits** · VIDEO 3.0 1080p = 40 (3 essais 1080p offerts) · 720p 3.0 = 30. Compte gratuit = **66 crédits/jour** → **4 clips/jour max**.
- **Contraintes compte gratuit** : **1 génération à la fois** (file 5-15 min/clip malgré l'estimation « 1 minute »). Workflow : lancer un clip → préparer le prompt suivant dans le composer → attendre la fin → relancer.
- **Piège UI** : ne PAS mettre de guillemets dans les prompts (le modèle les lit comme du dialogue parlé). Les prompts du pack n'en contiennent pas.
- **Qualité** : très bon sur l'eau/roches/lumière. Générer les variantes des plans critiques un autre jour (crédits).

## 2. Voix-off — ElevenLabs

- **URL** : elevenlabs.io/app/speech-synthesis/text-to-speech — compte John (workspace ElevenCreative, ~10 000 crédits).
- **Voix de la chaîne (décision John 2026-06-12)** : **Franck – Premium French Narrator** (calme, grave). Toujours cette voix.
- **Modèle** : Eleven Multilingual v2 (supporte les `<break time="0.Xs" />` du pack). Réglages par défaut OK ; si la voix « chante » : stability ~50 %, similarity ~75 %.
- **Constaté** : Franck lit posé → ~95 mots + breaks = **52 s** (cible pack 35 s). Pour viser plus court : couper le texte, pas accélérer.
- Téléchargement : bouton ⬇ à côté de « Regenerate speech ».

## 3. Ce qui reste TOUJOURS à John (non délégable)

1. **Plans réels** (gestes, poissons, écrans app) — captation smartphone selon le pack.
2. **Écoute/validation** de la VO et des clips (Claude ne voit que des frames, n'entend rien).
3. **Téléchargements** (clips Kling ⬇ + VO MP3) → ranger dans un dossier local par vidéo.
4. **Montage CapCut** (timeline du pack), **export** (1080×1920, sans watermark TikTok pour Reels/Shorts) et **publication**.
5. **Connexions/comptes** (logins, abonnements éventuels).

## 4. Workflow récurrent proposé (cadence 3-4/sem)

- **J-1 (Claude, autonome)** : produire le pack du jour (skill `video-courte-peche`), vérifier les garde-fous, commit dans `docs/contenu/videos/`.
- **Jour J matin (Claude + Chrome, ~45 min réelles dont 90 % d'attente Kling)** : générer les 4 B-roll (budget crédits du jour) + la VO Franck. Les variantes du hook = budget du lendemain.
- **Jour J (John, ~30 min)** : valider, télécharger, tourner les plans réels, monter, publier.
- Pour automatiser le déclenchement : tâche planifiée Cowork (« chaque lundi/mercredi/vendredi matin, produis le pack et lance la session B-roll »).

## 5. Améliorations possibles

- **MCP ElevenLabs** (ajouté par John le 2026-06-12) : apparaîtra dans les prochaines sessions → VO sans navigateur, plus fiable.
- **Si budget** : Kling abonnement (multi-tâches + 1080p) ou Google AI Pro (Veo 3.1 via Flow — compte John déjà créé, 0 crédit actuellement). À considérer quand la chaîne décolle.
- **Sous-titres** : CapCut auto FR, vérifier « coef », « PM/BM », « leurre souple ».
