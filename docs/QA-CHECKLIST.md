# 🔍 QA Checklist — Validation Sprint

> Script à donner à Claude in Chrome en fin de chaque sprint pour valider que le travail est OK avant le push. Mets-le dans `docs/QA-CHECKLIST.md` du repo.

---

## Mode d'emploi (pour John)

À chaque fin de sprint, avant de push sur main :

1. Lance `pnpm dev` dans VS Code
2. Ouvre Claude in Chrome
3. Colle le **prompt complet** de la section "Prompt copy-paste" plus bas
4. Claude in Chrome fait l'audit et te rend un rapport
5. Tu donnes ce rapport à Claude Code pour corrections finales
6. Tu re-fais passer Claude in Chrome → quand le rapport est tout vert, **tu push**

---

## Prompt copy-paste pour Claude in Chrome

```
Tu es mon QA Engineer pour le projet Carnet de Pêche.
Mon dev local est sur http://localhost:3000.

Fais un audit complet en 3 phases.

═══════════════════════════════════════════════════════
PHASE 1 — RÉGRESSION sur les bugs précédemment identifiés
═══════════════════════════════════════════════════════

Pour chaque bug ci-dessous, vérifie qu'il est RÉSOLU. Marque
✅ ou ❌ et explique en 1 phrase ce que tu vois.

1. ❑ Reset CSS hors @layer : ouvre les DevTools, inspecte un
   élément avec une classe px-*, vérifie que le padding calculé
   est > 0. (Si > 0 → résolu)

2. ❑ Menu hamburger mobile : passe en viewport 375px, cherche
   un bouton "menu" ou icône burger visible. Click dessus,
   vérifie qu'un panneau de navigation apparaît avec
   Carte/Spots/Guides/Tarifs.

3. ❑ Contraste CTA "Créer mon carnet" : récupère le ratio
   text-color vs background-color. Doit être ≥ 4.5:1 (WCAG AA).

4. ❑ Contraste CTA "Démarrer gratuitement" : idem, ≥ 4.5:1.

5. ❑ Logo header ≥ 44×44 px : mesure la bounding box du wrapper
   <a> du logo, doit être au minimum 44 px sur les deux dimensions.

6. ❑ Étoiles ★★★★★ des témoignages : aucune étoile tronquée
   ou débordant de sa carte parente.

7. ❑ Mini-map hero ne touche plus le bord droit : vérifier
   margin-right ou padding-right > 0 sur viewport mobile.

8. ❑ Sections séparées : vérifier que py-* est appliqué (padding
   vertical > 0) entre chaque section principale.

═══════════════════════════════════════════════════════
PHASE 2 — AUDIT VISUEL FRESH sur 4 viewports
═══════════════════════════════════════════════════════

Pour chaque viewport, prends 2-3 screenshots et liste tout
nouveau problème non listé en Phase 1.

- iPhone SE (375×667)
- iPhone Pro Max (430×932)
- iPad portrait (768×1024)
- Desktop (1280×800)

Points à scruter par viewport :
- Débordements horizontaux (scroll horizontal interdit)
- Textes coupés ou illisibles
- Boutons / liens sous 44×44 px tap target
- Images / icônes mal centrées
- Espacements incohérents entre éléments similaires
- Z-index / superpositions louches
- Animations / hover effects cassés
- Fonts non chargées (texte avec fallback serif moche)

═══════════════════════════════════════════════════════
PHASE 3 — ACCESSIBILITÉ DE BASE
═══════════════════════════════════════════════════════

Vérifie ces 5 points minimum :

1. Tab order : enchaîne les Tab sur la page, l'ordre du focus
   doit suivre l'ordre visuel logique.

2. Focus visible : chaque élément focusé doit avoir un outline
   ou un ring clairement visible.

3. Alt sur les images significatives (pas les décoratives).

4. Heading hierarchy : un seul <h1> par page, pas de saut de
   <h2> à <h4> sans <h3> entre les deux.

5. Aria-labels sur les boutons icon-only (notamment le menu
   hamburger, les boutons sociaux, etc.).

═══════════════════════════════════════════════════════
RAPPORT FINAL
═══════════════════════════════════════════════════════

Rends-moi UN rapport markdown structuré comme ça :

# QA Report — Sprint X · [date]

## Phase 1 — Régression (8 bugs)
- Bug 1 ✅ Résolu : [description]
- Bug 2 ❌ Toujours présent : [description + screenshot]
- ...

## Phase 2 — Nouveaux problèmes
### Mobile 375px
- ...
### Mobile 430px
- ...

## Phase 3 — Accessibilité
- ...

## Verdict
[ ] PRÊT À PUSH (tous les ✅)
[ ] À CORRIGER AVANT PUSH (≥ 1 ❌)

## Top 3 priorités à corriger
1. ...
2. ...
3. ...
```

---

## Évolution de la checklist

Cette checklist va grandir au fil des sprints. Voici comment l'enrichir :

**À chaque nouveau sprint** :
- Si tu identifies un nouveau type de bug récurrent, ajoute-le en Phase 1
- Si tu lances une nouvelle fonctionnalité (ex : carte interactive sprint 5), ajoute une Phase 4 spécifique
- Ne supprime jamais une vérification existante — c'est ta base anti-régression

**Suggestions de Phases à ajouter plus tard** :
- **Phase 4** — Auth flows (login, register, password reset)
- **Phase 5** — Onboarding 6 étapes (chaque étape doit valider correctement)
- **Phase 6** — Carte MapLibre (markers, popups, filtres, performance)
- **Phase 7** — Carnet de pêche (CRUD prises, upload photo, conditions auto)
- **Phase 8** — Paiements Stripe (essai 14j, upgrade, cancel)
- **Phase 9** — Mobile native (à partir du sprint 13)
- **Phase 10** — Performance (Lighthouse scores ≥ 90 sur tous les axes)

---

## Définition du "PRÊT À PUSH"

Une page est **prête à push en prod** si :

- ✅ Tous les bugs des sprints précédents sont toujours résolus (zéro régression)
- ✅ Aucun nouveau bug bloquant identifié
- ✅ Tous les viewports cibles sont visuellement corrects
- ✅ Aucun problème d'accessibilité majeur
- ✅ Aucune erreur console rouge en local
- ✅ Le build de production passe (`pnpm build` sans erreur)
- ✅ Les types TypeScript sont à jour (`pnpm typecheck` propre)

Si un seul de ces critères n'est pas rempli, **on ne push pas en main**. On crée une branche `fix/xxx`, on corrige, on re-valide.

---

## Commande complète recommandée (workflow type)

```bash
# 1. Dev local
pnpm dev
# → Test visuel manuel rapide sur Chrome

# 2. Audit Claude in Chrome (Phase 1-2-3 ci-dessus)
# → Si verdict PAS PRÊT, on corrige et on reboucle

# 3. Build validation
pnpm build
# → Doit passer sans erreur

# 4. Type check
pnpm typecheck   # ou pnpm tsc --noEmit

# 5. Lint
pnpm lint

# 6. Si tout est vert :
git add .
git commit -m "feat: sprint X — [résumé]"
git push origin main

# 7. Vercel auto-deploy → check le site en prod sur ton vrai téléphone
```

---

*Document à mettre à jour à chaque sprint. Ta meilleure assurance contre les régressions est cette checklist qui grandit avec le projet.*
