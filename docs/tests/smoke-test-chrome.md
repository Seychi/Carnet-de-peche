# Smoke test Sprint 7 — script pour Claude pour Chrome

> **Usage** : copie-colle tout le bloc « PROMPT » ci-dessous dans l'extension **Claude
> pour Chrome**, après avoir lancé le serveur de dev (`pnpm dev`) et t'être connecté
> avec ton compte. Claude va naviguer dans l'app et te rendre un rapport PASS / FAIL / N/A
> par scénario.

## Pré-requis avant de lancer

1. **Serveur lancé** : `pnpm dev` → l'app répond sur `http://localhost:3000`.
2. **Connecté** : tu es loggé avec ton compte (le pseudo s'affiche en haut à droite).
3. **Markers carte (scénario F)** : ils restent **gris** tant que le cron
   `compute-spot-scores` n'a pas peuplé la table `spot_scores`. Pour les colorer en local,
   déclenche-le une fois (hors navigateur) :
   ```bash
   curl -H "Authorization: Bearer $CRON_SECRET" http://localhost:3000/api/crons/compute-spot-scores
   ```
   (remplace `$CRON_SECRET` par la valeur de ton `.env.local`). Si tu ne le fais pas,
   le scénario F est attendu « tous gris » — c'est OK, pas un échec.
4. **Seuils du sprint** (à garder en tête pour juger les résultats) :
   - Insights perso : à partir de **3 prises**
   - Jauges multiplicateurs + badge « ⚡ Perso » : à partir de **5 prises**

---

## PROMPT (à copier dans Claude pour Chrome)

```
Tu es un testeur QA. Tu vas vérifier le Sprint 7 (« scoring personnalisé ») de l'app
Carnet de Pêche sur http://localhost:3000. Je suis déjà connecté.

Règles :
- Navigue toi-même vers les URLs indiquées.
- Pour chaque scénario, conclus par : PASS / FAIL / N/A + une phrase d'explication.
- Si un élément attendu manque, prends une capture et décris ce que tu vois à la place.
- Ne modifie rien sauf quand un scénario te demande explicitement de logger une prise.
- À la fin, donne un tableau récapitulatif PASS/FAIL/N/A de tous les scénarios.

──────────────────────────────────────────────────────────
ÉTAPE 0 — Contexte
──────────────────────────────────────────────────────────
- Va sur /carnet et compte combien de prises sont loguées sur ce compte. Note ce nombre
  N, il conditionne les attentes ci-dessous.
- Lis le pseudo affiché en haut à droite et confirme qu'on est bien connecté.

──────────────────────────────────────────────────────────
SCÉNARIO A/B/C — Profil (/profil)
──────────────────────────────────────────────────────────
Va sur /profil. Cherche la section « Ton profil de pêcheur ».
Juge selon N (le nombre de prises compté à l'étape 0) :

- Si N < 3 : tu dois voir un EMPTY STATE « Pas encore assez de données » avec un texte
  « Logue X prise(s) de plus » et un bouton « Logger une prise ». Aucune jauge, aucun
  insight. Vérifie que le bouton « Logger une prise » mène bien à /carnet/nouvelle.

- Si 3 <= N < 5 : la section affiche « Basé sur N prises loguées » et AU MOINS un insight
  (carte avec une icône + un libellé type « Au printemps », « Le matin »…). Il NE doit
  PAS y avoir de jauges « Tes multiplicateurs » (normal, seuil = 5 prises).

- Si N >= 5 : en plus des insights, tu dois voir le bloc « Tes multiplicateurs » avec
  3 jauges (Vent, Marée, Horaires). Vérifie :
    * aucune jauge n'est exactement à 1.0× (sinon ce n'est pas personnalisé)
    * au moins 2 insights affichés
    * les insights positifs apparaissent avant les négatifs
    * chaque insight porte une mention de confiance / un nombre de sessions

──────────────────────────────────────────────────────────
SCÉNARIO D/E — Fiche spot (/spots)
──────────────────────────────────────────────────────────
Va sur /spots, ouvre la première fiche spot de la liste (note son URL /spots/<slug>).
Trouve la section « Meilleurs moments » (calendrier de fenêtres de pêche).

- Si N >= 5 : certaines fenêtres doivent porter un badge « ⚡ Perso » et un InsightChip
  (petite ligne avec icône + « X% de tes prises »). Survole (ou clique) un InsightChip et
  vérifie qu'un détail s'affiche.

- Si N < 5 : il ne doit y avoir AUCUN badge « Perso » ni InsightChip. La section doit
  ressembler au comportement standard (régression sprint 6 OK).

──────────────────────────────────────────────────────────
SCÉNARIO F — Carte (/carte)
──────────────────────────────────────────────────────────
Va sur /carte.
- La carte se charge sans erreur, des markers de spots sont visibles.
- En desktop, une LÉGENDE de couleurs est visible (en bas à gauche).
- Si le cron a été déclenché : au moins quelques markers ont des couleurs différentes.
  Sinon : markers gris, c'est attendu (note N/A pour la colorisation).
- Aucun crash, aucune zone blanche à la place de la carte.

──────────────────────────────────────────────────────────
SCÉNARIO G — Log d'une prise → mise à jour du profil
──────────────────────────────────────────────────────────
(Ce scénario MODIFIE des données — fais-le seulement si je te le confirme.)
- Va sur /carnet/nouvelle et logue une nouvelle prise (remplis les champs requis,
  choisis un spot et une espèce, valide).
- Retourne sur /profil et vérifie que « Basé sur N prises » a bien augmenté de 1
  immédiatement (le cache se rafraîchit au log). Si N atteint 3, les insights doivent
  apparaître ; si N atteint 5, les jauges doivent apparaître.

──────────────────────────────────────────────────────────
SCÉNARIO H — Régressions sprint 6 + déconnecté
──────────────────────────────────────────────────────────
- Toujours connecté, sur une fiche /spots/<slug> : la courbe de marée (TideChart) et le
  calendrier hebdo (WeeklyCalendar) s'affichent normalement.
- Déconnecte-toi (menu en haut à droite → Déconnexion).
- Reviens sur la même fiche /spots/<slug> en anonyme : aucun badge « Perso », aucun
  InsightChip, mais la fiche (marées, météo, meilleurs moments génériques) reste
  fonctionnelle.
- Va sur /carte en anonyme : la carte fonctionne (markers éventuellement gris/colorés
  selon le cron), pas de crash.
- Reconnecte-toi à la fin pour me laisser dans l'état initial.

──────────────────────────────────────────────────────────
RAPPORT FINAL
──────────────────────────────────────────────────────────
Donne un tableau : Scénario | Résultat (PASS/FAIL/N/A) | Note.
Liste séparément tout bug visuel ou erreur console rencontré.
```

---

## Notes pour John

- Le script s'adapte au nombre de prises sur ton compte (`N`). Avec **3 prises**, attends-toi
  à PASS sur A/B/C (variante insights sans jauges) et N/A sur D (badge Perso, qui demande 5
  prises). Pour valider D pleinement, monte à **5 prises** d'abord.
- Les empty states stricts (0 et 2 prises, scénarios A et B du brief) demandent des comptes
  dédiés `test-zero` / `test-few`. Si tu veux les tester proprement, crée ces comptes ou
  demande-moi un seed SQL ciblé.
- Claude pour Chrome ne peut pas déclencher le cron lui-même (appel authentifié) : c'est
  l'étape `curl` du pré-requis 3, à faire toi-même.
