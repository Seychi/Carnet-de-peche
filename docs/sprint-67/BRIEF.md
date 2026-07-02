# Sprint 67 — Brief d'exécution
## Saisons & rangs vivants

> Rédigé le 2026-06-30. Durée cible : **1 passe Fable** (effort `xhigh`), M-L.
> Contexte : `docs/audits/AUDIT-2026-06-30-UX-DESIGN-GAMIFICATION.md` §2.2.6, §2.2.7 ; `docs/ROADMAP-POST-AUDIT-2026-06-30.md` Phase E. Rend les classements **récurrents et vivants** (resets de saison + notifs de rang) et ajoute la **rareté des badges**.
> Décisions John : **tasteful** ; anti spot-burning **maintenu**. **Préalable : Sprint 66 mergé** + réservoir suffisant. **Migration : 0-1** (selon implémentation des saisons).

> **🔀 Parallélisation :** dépend du Sprint 66 → **non parallélisable** avec lui. Peut suivre directement.

---

## 🚀 Ligne de lancement (à copier-coller par John)

> ultracode — effort xhigh. Exécute `docs/sprint-67/BRIEF.md`. Prérequis : Sprint 66 mergé.
> Ancre le mécanisme de saison + les types de notif via supabase-guard. Lance les blocs en
> parallèle quand possible, termine par VERIF (dont passe anti-fuite héritée du 66). Ne push pas.

---

## 🧠 Connecteurs & sous-agents

| Quand | Sous-agent → connecteur | Pourquoi |
|---|---|---|
| Saisons + rangs (schéma, cron) | **supabase-guard** → Supabase (RO) | Lire `get_leaderboard`/matview du 66, `notifications` (types du 63), le cron `spot_scores`. |
| Détection « X t'a dépassé » sans spam | **docs-researcher** → Context7 | Pattern diff de rang + throttling. |
| QA notifs de rang + resets | **qa-chrome** | Déclencher un changement de rang, vérifier la notif. |
| Clôture | **`/verif-sprint`** | Complet. |

## Objectif du sprint en une phrase

Des **saisons** qui remettent les classements à zéro à intervalle régulier (dopamine récurrente, barrière basse pour les nouveaux), des **notifs de changement de rang** tasteful, et la **rareté des badges** en %.

## Workstreams & dépendances

| WS | Bloc(s) | Durée | Dépend de | Parallélisable jour 1 |
|----|---------|-------|-----------|----------------------|
| A  | Bloc 0 — Saisons (reset ladder) | M | Sprint 66 | ✅ |
| B  | Bloc 1 — Notifs de rang | M | Bloc 0 | ❌ |
| C  | Bloc 2 — Rareté des badges | S-M | — | ✅ |
| VERIF | revue + anti-fuite | S | tous | ❌ |

---

## Bloc 0 — Saisons (reset du ladder)

> **Connecteurs** : **supabase-guard** — définir la notion de saison (trimestre ? période nommée ?) et comment le classement « saison » du 66 la lit.

### Tâches
1. Définir la **saison** (proposition : trimestrielle, ou saison de pêche nommée). Le classement `period='season'` du Sprint 66 se base dessus. Prévoir l'**archivage** du classement de fin de saison (podium figé) pour l'historique/les badges de saison.
2. Reset : à la bascule de saison, le classement `season` repart de zéro ; l'all-time reste. Cron ou calcul à la volée par borne de date.
3. **⚠️ pas d'invention** : si l'archivage nécessite une petite table `season_results`, l'ajouter proprement (migration, RLS).

### Critères d'acceptation
- Le classement `season` correspond bien à la saison en cours ; à la bascule, il repart de zéro et l'ancien podium est archivé/consultable.

### Garde-fous
- Anti spot-burning maintenu (rien de nouveau ne doit exposer un lieu). Migration = nouveau fichier si besoin.

---

## Bloc 1 — Notifs de changement de rang

> **Connecteurs** : **supabase-guard** (types notif du Sprint 63) ; **qa-chrome**.

### Tâches
1. Détecter un **changement de rang** significatif dans un classement où l'utilisateur est opt-in (« Tu es repassé n°3 du 29 au bar 🎣 », « X t'a dépassé »). Réutiliser `notifications` + prefs (opt-out par type, sprint 49/86).
2. **Throttling tasteful** : pas de notif à chaque micro-mouvement ; agréger (ex. un résumé, ou seulement les passages de seuil / dépassements par un follow).

### Critères d'acceptation
- Un dépassement par un follow (opt-in des deux) génère une notif ; pas de spam sur micro-changements ; opt-out respecté.

### Garde-fous
- Uniquement pour les comptes **opt-in** classement ; jamais de lieu. Ne pas notifier de manière anxiogène.

---

## Bloc 2 — Rareté des badges

> **Connecteurs** : **supabase-guard** (compter les détenteurs) ; **qa-chrome**.

### Tâches
1. Calculer et afficher la **rareté** d'un badge (« 12 % des pêcheurs l'ont ») — agrégat sur les détenteurs, sans exposer qui. Rafraîchi périodiquement (cron ou calcul caché).

### Critères d'acceptation
- Chaque badge montre un % de rareté cohérent, sans révéler l'identité des détenteurs.

### Garde-fous
- Agrégat only ; pas de fuite de qui détient quoi au-delà du public déjà affiché.

---

## Workstream VERIF (obligatoire, agent indépendant)

1. `/verif-sprint` + **deploy-watch**.
2. **Passe anti-fuite héritée du 66** : rien de nouveau n'expose un lieu ; opt-in respecté.
3. Chaque critère (Blocs 0-2) avec preuve.
4. **Passe honnêteté** : rareté = vrai agrégat ; saisons sans chiffre inventé ; notifs non anxiogènes.
5. `docs/sprint-67/RECAP.md`.

## Reste manuel John (post-sprint)
- **Trancher** la cadence de saison (trimestre vs saison de pêche nommée).
- Confirmer migration (si créée) + regen types. Merge → déploiement.
