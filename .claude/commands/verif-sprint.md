---
description: Passe de vérification de fin de sprint (CLAUDE.md §19) — tests, build, lint, types, revue croisée indépendante, passe anti-régression. Aucun « code-complet » sans ça.
---

Exécute la passe de vérification obligatoire avant de déclarer un sprint/bloc « code-complet ». Ne saute
aucune étape ; si une étape échoue, arrête-toi et rapporte (pas de « code-complet » optimiste).

1. **Suite verte & build** — lance dans cet ordre et rapporte chaque résultat :
   - `pnpm test` (Vitest)
   - `pnpm typecheck` (tsc --noEmit)
   - `pnpm lint` (bloquant depuis le sprint 11.5)
   - `pnpm build` (Next, doit passer en Node 24)

2. **Revue croisée INDÉPENDANTE** — lance un sous-agent `general-purpose` (contexte neuf) avec pour
   mission de relire le diff de la branche courante (`git diff main...HEAD`) CONTRE les critères
   d'acceptation du brief de sprint (`docs/sprint-*/BRIEF.md`). Il doit confirmer chaque critère ou
   pointer ce qui manque. Il ne doit PAS te faire confiance — c'est le but.

3. **Passe adversariale anti-régression** (les classiques qui nous ont déjà mordus) :
   - **Floutage GPS** : aucune fuite de `geom` précis pour `anon` / tier gratuit.
   - **Gating de tier** : payant verrouillé, fil social 100% gratuit.
   - **RLS** : activé partout, policies cohérentes, vues `*_for_viewer` correctes.
   - **Perf** : pas de régression évidente (initplan RLS, index FK, carte qui resize).
   - **SEO** : titres, canonical, JSON-LD, noindex là où il faut.
   - **Migrations** : fichiers numérotés, appliquées en prod AVANT promotion du code, `lib/types.ts` régénéré.

4. **(Optionnel) QA réelle** — si le bloc touche l'UI, lance le sous-agent `qa-chrome` sur la preview.

5. **Verdict** — un **GO / NO-GO** clair, avec preuves (sorties de commandes, rapport de revue). Liste ce
   qui reste avant merge. Rappelle que le push reste manuel (feu vert de John, §13).
