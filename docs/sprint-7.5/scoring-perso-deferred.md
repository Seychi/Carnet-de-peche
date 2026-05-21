# Scoring perso « vraie performance » — reporté (post-beta)

> Statut : **reporté**. Le scoring perso descriptif (`/profil`) reste en place ; seul le
> scoring de *performance* sur les fiches spots a été neutralisé (B1 sprint 7.5).

## Pourquoi reporté

Impossible de mesurer un vrai taux de réussite sans logger les **sorties bredouilles** :

- Le carnet ne logue que les **prises**, jamais les sorties sans résultat → pas de
  dénominateur, donc pas de taux de réussite réel.
- Le proxy utilisé (« taille > médiane ») mesure la **grosseur** d'une prise, pas le
  **succès** d'une sortie.
- Les échantillons sont trop petits sur les vraies prises actuelles (2-3 par bucket
  vent/marée/heure) → bruit statistique, pas pattern.
- En pratique, les conditions (vent, marée) sont rarement renseignées sur les prises
  réelles → multiplicateur ≈ 1.0 systématique → affichage inerte mais visible.

Conclusion : l'affirmation « tu pêches mieux dans ces conditions » n'était pas
démontrable. On l'a retirée pour ne rien afficher de trompeur (cf RECAP sprint 7).

## Ce qui a été neutralisé (B1 sprint 7.5)

- Badge « ⚡ Perso » + InsightChip sur les fenêtres solunar des fiches spots
- Application du `personalMultiplier` au scoring des fiches (forecast redevenu générique)
- `components/scoring/InsightChip.tsx` et `lib/scoring/insights-matcher.ts` → `@deprecated`
  (conservés pour réutilisation future)

## Ce qui reste en place (volontairement)

- `/profil` → `PersonalScoreSection` en **mode descriptif honnête** (« où et quand tombent
  tes prises ») via `lib/scoring/patterns.ts` — pas de jugement de performance.
- Markers carte génériques (`spot_scores`, cron quotidien) — indépendants du perso.

## Pré-requis pour le faire correctement

- Ajouter une table `sessions` (sorties de pêche, avec ou sans prise)
- Ou un champ `outing_session_id` sur `catches` + une UI « Je sors pêcher » qui logue une
  session même bredouille
- Recalculer le scoring sur la base prises / sessions = **vrai taux de réussite**

## Sprint cible

Post-beta (≈ T+3 mois après le lancement public), quand assez de signal aura été collecté.
