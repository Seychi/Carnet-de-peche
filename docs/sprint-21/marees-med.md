# 🌊 Audit précision marées — Méditerranée / Corse (Sprint 21, Bloc D)

> Produit le 2026-06-23. Déclencheur : sur un spot corse, la décomposition du score affiche **« Marée 0/35 »** (audit transverse `docs/audits/AUDIT-2026-06-23.md` §5, risque de confiance #2). La marée pèse **35 %** du score solunar : si elle tombe à 0 à tort sur toute la façade Med, le score y est biaisé.
>
> **Méthode** : lecture du code de scoring (vérifiée contre le vrai code, pas le brief) + appel live de l'API Open-Meteo Marine exacte sur un panel Med/Corse + 1 contrôle Atlantique.

---

## TL;DR — le verdict en 3 points

1. **La donnée de marée Med EST présente et correcte.** Open-Meteo Marine renvoie bien `sea_level_height_msl` sur 24 h pour Marseille, Ajaccio, etc. **Ce n'est PAS un trou de données.**
2. **Le « 0/35 » est un FAUX NÉGATIF STRUCTUREL**, pas une marée nulle. Il vient d'un **seuil d'étale codé en dur (`0.1 m`)** dans `scoreTide`, calibré pour les façades à fort marnage (Atlantique, 3-5 m) et jamais pensé pour la Méditerranée (marnage ~0,15 m). En Med, toutes les fenêtres tombent sous ce seuil → `SLACK_SCORE = 0.0`.
3. **Décision marées : NO-GO SHOM/WorldTides.** La source actuelle suffit ; le problème est **sémantique** (le scoring traduit « marnage physiquement faible » en « 0 brutal » au lieu de « peu discriminante »). → Correctif = **repondération + garde-fou d'affichage** (ticket Chantier C ci-dessous), **pas** un changement de fournisseur.

---

## 1. Reproduction (donnée live, 2026-06-23)

Appel de l'API exacte du code (`https://marine-api.open-meteo.com/v1/marine?...&hourly=sea_level_height_msl`) :

| Port | Coordonnées | Points horaires valides | Marnage / jour |
|---|---|---|---|
| Marseille (Med) | 43.29, 5.37 | 24 (pleins, non null) | **0,15 m** |
| Ajaccio (Corse) | 41.92, 8.74 | 24 (pleins, non null) | **0,16 m** |
| Brest (Atlantique, contrôle) | 48.39, -4.49 | 24 | **3,19 m** |

→ La Med est **couverte** : `sea_level_height_msl` n'est pas null, `tidePoints` contient 24 points. Le marnage mesuré (~0,15 m) correspond à la réalité physique de la Méditerranée (mer quasi sans marée).

---

## 2. Mécanisme exact du 0/35 (vérifié dans le code)

- **Calcul** : `lib/solunar/scoring.ts:27-64` (`scoreTide`). La composante marée vaut 0-1, puis ×0.35.
- La branche « pas de données » (`tidePoints.length === 0 → NO_DATA_SCORE = 0.35`, `scoring.ts:35`) **n'est PAS atteinte** en Med (24 points présents).
- Le 0 vient de la **branche étale** `lib/solunar/scoring.ts:51-52` :
  ```ts
  const delta = last - first              // variation de hauteur sur la fenêtre de 2 h
  if (Math.abs(delta) < 0.1) {            // ← seuil d'étale CODÉ EN DUR, pensé Atlantique
    tideScore = SOLUNAR_CONFIG.TIDE.SLACK_SCORE   // = 0.0 (config.ts:45)
  }
  ```
  En Med, le swing max sur 2 h dans la journée est ≈ 0,05-0,07 m, **toujours < 0,1 m** → **toutes** les fenêtres → `SLACK_SCORE = 0.0` → `factors.tide = 0` → `round(0 × 0.35 × 100) = 0/35`.
- Un unique extremum (BM/PM) dans la journée donnerait `EXTREMUM_BONUS = +0.2` (`scoring.ts:60-61`) → ~7/35 sur la fenêtre concernée, mais la base SLACK = 0 fait que le « meilleur créneau » affiché tombe quasi toujours sur 0/35.
- Pour comparaison Atlantique : le même Δ sur 2 h vaut facilement > 0,3 m → `RISING/FALLING` (0,6-0,8) → 21-28/35.

- **Affichage** : `components/scoring/ScoreBreakdown.tsx:41-59` rend fidèlement `contrib = round(v01 × 0.35 × 100)` → littéralement « 0/35 » quand `v01 = 0`. Le rendu est correct ; **c'est le calcul amont qui produit le 0**.
- **Incohérence interne** : `components/conditions/TideStrengthBand.tsx` affiche par ailleurs le marnage réel (0,15 m) comme « marée faible » **légitime** — donc l'app *sait* que la donnée existe, mais le scoring la convertit en 0 brutal.

---

## 3. Décision & recommandations

### 3.1 Source de marées : NO-GO SHOM/WorldTides (pour CE bug)
La donnée Med est présente et physiquement correcte. Un fournisseur « plus précis » (SHOM/WorldTides) ne changerait **rien** au 0/35 — le marnage resterait ~0,15 m. ⚠️ *Garde-fou brief respecté : ce bloc ne bascule pas de fournisseur.* SHOM resterait pertinent **uniquement** pour la précision horaire des PM/BM Atlantique (hors sujet ici), à arbitrer séparément (budget, cf roadmap §6 / Chantier C).

### 3.2 Correctif retenu : repondération + affichage (TICKET Chantier C)
**Pas de correctif trivial honnête en 1 ligne** : masquer « 0/35 » sans toucher au calcul cacherait une info, et le 0 vient du calcul. La vraie correction est dans le scoring et **change le comportement** → elle sort du périmètre « hygiène » du sprint 21 et doit être validée par John. Ticket :

> **[Chantier C] Marée non discriminante en faible marnage (Med/Corse)**
> 1. **Repondération conditionnelle** (`lib/solunar/scoring.ts` + `config.ts`) : sous un seuil de marnage journalier (ex. `dailyMarnage < ~0.3 m` — helper de marnage dispo dans `lib/conditions/tide.ts`), traiter la marée comme **« non discriminante »** et **redistribuer son poids (0.35)** sur solunar/vent (renormaliser 0.40/0.25 → ~0.62/0.38) au lieu d'imposer `factors.tide = 0`. Supprime le faux 0/35 sur toute la façade Med/Corse (9 dépts : 06, 11, 13, 30, 34, 66, 83, 2A, 2B) sans rien inventer.
> 2. **Garde-fou d'affichage** (`components/scoring/ScoreBreakdown.tsx`) : quand le marnage est faible, libeller la marée **« plate (marnage 0,15 m) · peu déterminante »** plutôt que « 0/35 » — aligné avec `TideStrengthBand`. ⚠️ Nécessite de **propager le marnage** jusqu'à `ScoreBreakdown` (qui ne reçoit aujourd'hui que `window.factors`, pas les `tidePoints`) — c'est le point délicat : le composant lit les poids en dur via `SOLUNAR_CONFIG.WEIGHTS`, donc une repondération par fenêtre n'est pas reflétée tant qu'on ne passe pas les **poids effectifs** dans `factors`.
> 3. **Note rigueur** : le seuil `SLACK = 0.1 m` (`scoring.ts:51`) n'a jamais été pensé pour la Med — à traiter dans le même correctif (le rendre relatif au marnage de la façade).
> 4. **Passe anti-régression obligatoire** : vérifier que la décomposition affichée reste cohérente (somme du score inchangée) et que l'Atlantique (fort marnage) n'est pas impacté.

**Estimation** : ~0,5-1 j (scoring + propagation marnage au composant + tests). À cadrer dans le Chantier C (« Conformité & Confiance », P3) ou en correctif scoring rapide si John préfère le sortir plus tôt.

---

## 4. Critère d'acceptation (Bloc D) — état

- ✅ Verdict écrit avec preuves (payloads live + mécanisme code).
- ✅ Reco go/no-go SHOM **claire : NO-GO** (donnée présente).
- ✅ Correctif trivial **non retenu** (aucun n'est honnête en 1 ligne) → **ticket clair pour le Chantier C** (ci-dessus). Aucun changement de comportement de scoring appliqué dans ce sprint d'hygiène.

---

*Bloc D du sprint 21. Source de vérité scoring : `lib/solunar/scoring.ts` + `lib/solunar/config.ts`. Suite : ticket repondération dans le Chantier C (`docs/ROADMAP-2026-H2.md`).*
