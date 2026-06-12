# Template de brief de sprint — mode Fable (ultracode + xhigh + workflows)

> Tout nouveau brief de sprint suit ce template (décision John 2026-06-11, cf `CLAUDE.md` §19).
> Objectif : qu'un brief soit directement exécutable par Fable en orchestration multi-agents, sans aller-retour.

---

## Pourquoi ce format

Fable en mode `ultracode` + effort `xhigh` découpe le travail en **workstreams parallèles** confiés à des agents. Un bon brief pour ce mode :

1. **Rend chaque bloc autonome** : un agent doit pouvoir exécuter un bloc avec uniquement le texte du bloc + les chemins de fichiers cités. Pas de contexte implicite « cf. discussion d'hier ».
2. **Explicite les dépendances** : tout ce qui n'a pas de dépendance se lance jour 1 en parallèle. Le séquentiel est l'exception, pas la règle.
3. **Donne des critères d'acceptation vérifiables par un agent** : « le 11e post en 24h renvoie une erreur propre » ✅ — « le fil est agréable » ❌.
4. **Pré-arbitre les décisions** : chaque choix ouvert est soit tranché dans le brief, soit marqué `⚠️ DEMANDER À JOHN AVANT` (l'agent s'arrête là, il n'invente pas).
5. **Termine par un workstream de vérification dédié** : un agent indépendant qui n'a pas écrit le code relit les critères, lance tests + build, et fait une passe de revue (sécurité RLS, régressions gating, copy FR).

---

## Structure du brief

```markdown
# Sprint N — Brief d'exécution
## <Titre court>

> Rédigé le YYYY-MM-DD. Durée : X semaines (cible début → fin).
> Contexte : <liens vers docs/concurrents/, audits, RECAP précédent>.
> Décisions John YYYY-MM-DD : <décisions verrouillées pour ce sprint>.

**Préalable avant de démarrer** (manuel John) : <merges, vars d'env, QA bloquantes>.

---

## 🚀 Ligne de lancement (à copier-coller par John)

> ultracode — effort xhigh. Exécute `docs/sprint-N/BRIEF.md`. Lance les workstreams
> A/B/C en parallèle dès maintenant, respecte les dépendances du tableau, et termine
> par le workstream VERIF avant de me rendre la main. Ne push pas.

---

## Objectif du sprint en une phrase

<une phrase, mesurable.>

## Workstreams & dépendances

| WS | Bloc(s) | Durée | Dépend de | Parallélisable jour 1 |
|----|---------|-------|-----------|----------------------|
| A  | Bloc 0  | 1-2 j | merge X   | ✅ |
| B  | Bloc 4  | 0,5 j | —         | ✅ |
| C  | Bloc 1  | 2-3 j | —         | ✅ |
| D  | Blocs 2-3 | 4 j | C (composants) | ❌ |
| VERIF | revue finale | 0,5 j | tous | ❌ (toujours en dernier) |

## Bloc X — <nom>

<2-3 phrases de contexte : pourquoi, et ce qu'il ne faut PAS toucher.>

### Tâches
1. <tâche avec chemins de fichiers exacts (`app/actions/feed.ts`, `supabase/migrations/0NN_*.sql`)>
2. <…>

### Critères d'acceptation
- <comportement observable + comment le vérifier (commande, URL, requête SQL)>
- <régressions interdites, explicites : « gating carte intact »>

### Garde-fous
- ⚠️ DEMANDER À JOHN AVANT : <décision ouverte éventuelle>
- Ne pas toucher : <fichiers/policies hors périmètre>

## Workstream VERIF (obligatoire, agent indépendant)

1. `pnpm test` (suite complète verte) + `pnpm build` (OK).
2. Relire chaque critère d'acceptation du brief et cocher ✅/❌ avec preuve.
3. Passe sécurité : nouvelles tables → RLS d'abord ; aucune écriture qui contourne `*_for_viewer` ; pas de secret commité.
4. Passe copy : tutoiement partout, zod en français, pas de promesse produit mensongère.
5. Livrer `docs/sprint-N/RECAP.md` : fait / comment tester / reste manuel John.

## Reste manuel John (post-sprint)

- <QA manuelle, merge → main, déploiement, vars LIVE…>
```

---

## Checklist avant de publier un brief

- [ ] Ligne de lancement présente (avec `ultracode` + `xhigh`) — les mots-clés agissent par message, ils doivent être dans le prompt de John.
- [ ] Chaque bloc est autonome (chemins de fichiers, pas de contexte implicite).
- [ ] Le tableau workstreams maximise le parallèle jour 1.
- [ ] Chaque critère d'acceptation est vérifiable par un agent (commande / URL / requête).
- [ ] Toute décision ouverte est tranchée ou marquée `⚠️ DEMANDER À JOHN AVANT`.
- [ ] Workstream VERIF présent et en dernier.
- [ ] Rappels invariants : pas de push sans validation, RLS jamais désactivé, migrations = nouveaux fichiers, régénérer `lib/types.ts` après migration.
