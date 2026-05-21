# Audits quotidiens — Carnet de Pêche

Ce dossier contient les audits 360° automatiques générés chaque soir à 20h par une tâche planifiée. Tu les retrouves ici, classés par date, à lire le lendemain matin pour piloter ta journée.

## Format

Chaque fichier suit le pattern `AUDIT-YYYY-MM-DD.md` et s'appuie sur la grille fixée par `docs/AUDIT-2026-05.md` (audit fondateur du 20 mai 2026, baseline de référence).

## Sections systématiques

0. Synthèse exécutive (verdict + alertes P0)
1. Delta depuis le dernier audit (git, site live, statut P0/P1)
2. État du site live (snapshot des pages crawlées)
3. SEO & performance technique
4. Sécurité (headers, endpoints, secrets)
5. Qualité code & dépendances
6. DB Supabase & contenu
7. Accessibilité & UX
8. Veille concurrence (hebdo, le lundi)
9. Risques détectés
10. Top 5 actions recommandées
11. Bilan vs roadmap

## Convention

- Le baseline du premier audit (2026-05-21) est `docs/AUDIT-2026-05.md`.
- À partir du deuxième, chaque audit compare avec celui de la veille.
- Les alertes 🚨 sont des P0 nouveaux (incidents critiques). Les ⚠️ sont des P1/P2 persistants.
- Les ✅ et ❌ marquent les checks de conformité unitaires.

## Lecture rapide

Si tu n'as que 2 minutes le matin : lis les sections 0, 1 et 10 du dernier audit. Le reste est de la documentation pour ton archive.

## Garde-fous

L'audit ne pousse jamais de code. Il lit, vérifie, et rapporte. Toute action correctrice reste manuelle de ton côté (ou via une session dédiée).
