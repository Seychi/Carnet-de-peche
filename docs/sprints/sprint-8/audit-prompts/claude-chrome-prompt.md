# 🔍 Prompt audit Claude in Chrome — Sprint 8 (Fil communautaire)

> **À donner verbatim à une session Claude in Chrome.**
> Remplir les `{{PLACEHOLDERS}}` avant de coller (URL preview, mots de passe des comptes seed, username John).
> Auditeur cible : Claude Sonnet via extension Claude in Chrome, navigateur frais (incognito recommandé pour le rouge/bleu cross-onglets).
> Référence de format : `docs/audits/ux-discovery/2026-05-21-claude-chrome.md` (sprint 7.5).

---

## ✂️ Prompt à coller dans Claude in Chrome

```
Tu es l'auditeur UX/produit/sécurité de Carnet de Pêche. Tu utilises Claude in Chrome (navigation + screenshots + JS + lecture page). Mission : auditer ce qui a été livré au sprint 8 (fil communautaire), sur le ton honnête d'un beta-testeur exigeant qui veut le produit réussir. Ne flatte pas, ne minore pas — mais pas non plus de drama gratuit.

## Contexte produit (lis avant)

- Produit : Carnet de Pêche, le carnet numérique + réseau social des pêcheurs à la canne du bord en France.
- Voix : tutoiement, FR, vocabulaire pêcheur.
- Pricing : 3 tiers — Découverte (gratuit, lecture limitée), Local (4,90 €/mois, écriture sur son département), Itinérant (9,90 €/mois, écriture sur tous départements côtiers FR). Stripe arrive sprint 9, donc le gating tier est codé mais le paiement n'est PAS testable.
- Périmètre v1 : pêche canne du bord, mer, France métropolitaine. Pas eau douce, pas bateau, pas pêche à pied.
- Sprint 8 (fil communautaire) vient d'être livré. Avant : tables feed_* dormantes. Maintenant : fil par département, posts texte libre OU partagés depuis le carnet, likes, commentaires, follows, profil public /u/[username], signal social sur les fiches spots ("X pêcheurs ont logué Y prises ici les 7 derniers jours").

## URL à auditer

{{URL_AUDIT}}  (= preview Vercel du branch sprint-8 si pas encore mergé, ou prod si déjà mergé)

## Comptes test (créés via seed dev — abonnements posés en base, pas via Stripe)

| Compte | Email | Mot de passe | Tier | home_department |
|---|---|---|---|---|
| Anon | (pas de login) | — | anonymous | — |
| Discovery 29 | test_disco_29@carnet.test | {{PWD_DISCO_29}} | discovery | 29 (Finistère) |
| Local 29 | test_local_29@carnet.test | {{PWD_LOCAL_29}} | local | 29 (Finistère) |
| Local 56 | test_local_56@carnet.test | {{PWD_LOCAL_56}} | local | 56 (Morbihan) |
| Itinérant | test_itin@carnet.test | {{PWD_ITIN}} | itinerant | 29 (Finistère) |
| Seychi (John) | redkps4@gmail.com | {{PWD_SEYCHI}} | discovery | (à vérifier) |

Username publics correspondants à utiliser pour `/u/[username]` : seychi, test_disco_29, test_local_29, test_local_56, test_itin (à confirmer en page profil).

## Périmètre exact à auditer (sprint 8 uniquement)

Routes nouvelles :
- `/fil` (défaut → redirige vers fil du home_department)
- `/fil/[department]` (29, 56, 22, 13… 24 dépts côtiers)
- `/u/[username]` (profil public)
- `/follows` (gestion follows)

Composants nouveaux :
- `PostCard`, `PostComposer`, `CommentThread`, `FeedTabs`, `ReportDialog`, `EmptyFeed`
- Encart "Activité récente" sur `/spots/[slug]`

Fonctions clés à éprouver :
- Tier gating (qui peut écrire où)
- Realtime (post / like / comment apparait dans une autre fenêtre en < 3s)
- Partage d'une catch depuis le carnet (avec respect du floutage GPS)
- Bouton Signaler (crée une ligne dans reports)
- Follow / unfollow
- Signal social local sur fiche spot

## Mission

Auditer sous 5 angles, dans cet ordre :

### Angle 1 — Parcours par tier (le cœur)

Pour CHAQUE tier (anon → discovery → local 29 → local 56 → itinerant), faire le parcours :

1. Login (ou pas pour anon)
2. Aller sur `/fil`
3. Observer : redirection, tabs visibles, composer actif ou désactivé, copy du bandeau "passe en Local" si gaté
4. Tenter d'écrire un post → noter la friction (toast, modal, redirect, blocage silencieux ?)
5. Tenter de like un post existant
6. Tenter de commenter
7. Naviguer vers `/fil/56` (Morbihan) → noter l'expérience cross-département (lecture vs écriture)
8. Ouvrir le profil d'un autre user via clic sur son avatar dans un post
9. Cliquer "Suivre" → noter le comportement
10. Aller sur `/follows` → noter l'état (suggestions, follows, followers)

Critère : pour chaque tier, est-ce que le copy explique CLAIREMENT pourquoi telle action est bloquée et comment la débloquer ? Un user discovery qui clique like doit comprendre en 1 seconde "ah, il faut passer en Local". Pas de message obscur, pas de blocage silencieux.

### Angle 2 — Realtime (test cross-onglets)

1. Ouvrir 2 fenêtres : fenêtre A logguée en `test_local_29`, fenêtre B logguée en `test_itin` (incognito + normal, ou 2 profils Chrome).
2. Les deux sur `/fil/29`.
3. Dans A : poster "Test realtime [timestamp]". Mesurer en secondes le temps d'apparition côté B.
4. Dans B : liker ce post. Vérifier le compteur côté A en live.
5. Dans B : commenter. Vérifier le compteur live + le commentaire visible si A déplie le thread.
6. Dans A : supprimer le post. Vérifier que le post disparaît bien côté B (ou affiche "supprimé").

Critère : < 3s pour chaque apparition. Si > 5s : major. Si pas de live du tout : critical.

### Angle 3 — Partage d'une catch + respect privacy GPS

1. Avec `test_local_29` : aller sur `/carnet/nouvelle`, loguer une catch sur "pointe-du-raz" avec privacy = `public` et `reveal_precise_to_public = false` (défaut).
2. Aller sur `/fil/29`, ouvrir le composer mode "Partager une prise", sélectionner cette catch, poster.
3. Avec `test_local_56` (non-ami) : ouvrir `/fil/29`, trouver ce post.
4. Inspecter la card catch : la position affichée doit être floutée (rayon 1 km).
5. **Critique** : ouvrir DevTools → View Page Source → chercher la lat/long du spot. **Aucune coord précise ne doit apparaître dans le DOM** ni dans une réponse réseau côté `test_local_56`.
6. Maintenant : `test_local_29` ↔ `test_itin` follow mutuel. `test_itin` voit-il les coords précises ? Selon `precise_for_friends=true` (défaut), oui. À vérifier.
7. Encart "Activité récente" sur `/spots/pointe-du-raz` : view-source → mêmes vérifs, pas de GPS précis.

Critère : aucune fuite GPS. Si fuite : **CRITICAL P0 IMMÉDIAT**.

### Angle 4 — Signal social local sur fiche spot

1. `/spots/pointe-du-raz` (ou un autre spot avec catches publiques 7j).
2. L'encart "Activité récente" doit afficher : "X pêcheurs ont logué Y prises ici les 7 derniers jours" + 3 dernières catches (avatar/username/espèce/date sans GPS précis).
3. CTA "Logue ta prise" doit emmener sur `/carnet/nouvelle?spot_id=...`.
4. Aller sur un spot SANS catch publique récente (à identifier — un spot peu fréquenté du Morbihan ou de PACA) : l'encart doit être ABSENT (pas un placeholder vide qui ressemble à une feature cassée).
5. Tester si on est anonyme : l'encart s'affiche ? Idéalement oui (SEO + preuve sociale), mais sans bouton "Logue" actif.

Critère : encart visible si pertinent, absent si pas, jamais en mode "fake placeholder".

### Angle 5 — Mobile + accessibilité + edge cases

1. Resize à 375px de large (iPhone SE) sur `/fil/29` :
   - Composer utilisable au pouce ?
   - PostCard lisible sans scroll horizontal ?
   - Tap targets ≥ 44 px (likes, comments, menus) ?
2. Tab navigation clavier sur `/fil` :
   - Focus visible ?
   - Ordre logique ?
   - Composer accessible au clavier ?
3. Ouvrir le ReportDialog avec Enter, naviguer les radios avec flèches.
4. Empty states à tester :
   - `test_disco_29` sur un dépt sans posts (ex `/fil/2A`)
   - `test_disco_29` sur l'onglet "Tes follows" alors qu'il ne suit personne
   - Un user qui suit qqun mais que cette personne n'a rien posté
5. Long posts (2000 chars) : line-clamp + bouton "Voir plus" fonctionnel ?
6. Posts avec URLs : sont-elles cliquables (linkify) ? Cible `_blank` + `rel="noopener noreferrer"` ?

### Bonus — Red team rapide (15 min)

1. Avec `test_disco_29` ouvert DevTools Network, tenter via la console JS :
   ```js
   await fetch('/api/...feed_posts', { method: 'POST', body: JSON.stringify({ region: '29', text: 'bypass' }) })
   ```
   ou tenter de poster directement via le Supabase REST. Attendu : 401/403. Si 200 + post créé : **CRITICAL P0**.
2. Avec `test_local_56`, tenter de poster sur `/fil/29` en modifiant le payload réseau. Attendu : 403.
3. Tenter d'accéder à `/u/test_anon` (utilisateur fantôme) → 404 attendu, pas une page vide.
4. Tenter de signaler un post avec une raison invalide via DevTools → validation server-side attendue.

## Livrable attendu

Un seul document en markdown, structure identique à `docs/audits/ux-discovery/2026-05-21-claude-chrome.md` :

1. **Header** : date, auditeur, comptes utilisés, URL périmètre.
2. **Interim findings** (résumé en tête, 1-2 lignes par item) :
   - 🚨 Critical (P0) — fuites GPS, RLS contournable, redirection cassée, données fictives publiques
   - ⚠️ Major (P1) — UX cassée, copy incohérente, realtime > 5s, accessibilité ≥ 1 fail
   - ⚠️ Bugs (P2) — cosmétique, edge cases, copy mineure
   - ✅ Good — ce qui marche vraiment bien
3. **Note globale /10** subjective + verdict en 2 phrases ("très propre sur 80 % du parcours, mais X et Y cassent la confiance").
4. **Top 15-25 opportunités d'amélioration** sous forme de tableau (Page/Flow · Problème · Recommandation · Effort S/M/L · Impact S/M/L).
5. **Friction par parcours** : sections "Discovery", "Local 29", "Local 56", "Itinérant", "Anonymous", "Cross-device", "Realtime" — 1 paragraphe par section décrivant l'expérience vécue.
6. **Tableau récap par tier** : 5 colonnes × N lignes (action attendue / observée / pass-fail).
7. **Red team findings** : ce qui a été tenté, ce qui a tenu, ce qui a cédé.
8. **Sources visuelles** : pour chaque finding majeur, lien vers screenshot mémorisé (sauvegarde tes screens dans la conversation via l'outil screenshot Claude in Chrome — tu y feras référence ensuite).

Fichier final à proposer à John : `docs/audits/ux-discovery/2026-05-XX-claude-chrome-sprint-8.md` (remplace XX par la date du jour). John le sauvera lui-même via les outils Cowork — toi tu peux juste produire le markdown complet dans la conversation.

## Règles de l'auditeur

- **Honnête** : si une feature marche bien, dis-le ; si elle est cassée, dis-le sans drama.
- **Précis** : URL exacte, étapes pour reproduire, fichier source si tu le devines, message d'erreur copié-collé.
- **Priorité claire** : un P0 RGPD/sécurité tape avant un P2 cosmétique, et l'ordre du tableau le reflète.
- **Pas de spéculation infra** : ne devine pas l'archi technique au-delà de ce que tu observes en DOM/Network.
- **Compte le temps** : timer la pose d'un post realtime, le premier paint /carte, le temps avant que /fil affiche les 20 premiers posts. Donne des secondes, pas du flou.
- **Tutoyer dans tes recommandations** (cohérent avec la voix produit).

Tu peux commencer. Commence par l'angle 1 (parcours par tier) puisque c'est le cœur. Note tes findings au fur et à mesure, et synthétise à la fin.
```

---

## 📋 Checklist John avant de coller

- [ ] Remplir `{{URL_AUDIT}}` (prod si sprint-8 mergé, sinon URL preview Vercel — visible dans la PR ou en lançant `vercel inspect`)
- [ ] Remplir les 5 `{{PWD_*}}` (les comptes seed sont créés par `supabase/seed_test_accounts.sql` — récupérer les mots de passe ou les reset via Supabase Studio → Authentication)
- [ ] Vérifier que les 5 comptes ont leur abonnement bien posé en base (`select user_id, plan, status from subscriptions where user_id in (...)`)
- [ ] Vérifier qu'il y a déjà au moins 8 posts seed dans le fil du 29 sinon l'audit aura peu de matière (lancer `/dev/seed-feed` en preview/dev)
- [ ] Au moins 1 catch publique sur "pointe-du-raz" datée < 7j pour que le widget "Activité récente" soit testable
- [ ] Démarrer une session Claude in Chrome en navigateur frais (incognito ou nouveau profil Chrome) pour éviter les sessions résiduelles

---

## 📤 Après l'audit

1. Claude in Chrome produit le markdown final dans la conversation.
2. John copie-colle dans `docs/audits/ux-discovery/2026-05-XX-claude-chrome-sprint-8.md`.
3. Pour mon audit (Cowork) en complément : je lirai le code (RLS, server actions, vue `feed_posts_for_viewer`, hooks Realtime), je croiserai avec les findings Claude in Chrome, et je te livrerai un audit code/architecture/sécurité au format `docs/audits/AUDIT-2026-05-XX-post-sprint-8.md`.
4. Avec les 2 audits, on fait la liste des P0/P1 à corriger avant sprint 9 (idéalement = sprint 8.5 court 2-3 jours, ou intégré au démarrage sprint 9).

---

*Prompt généré le 2026-05-21. Format reproductible pour les futurs sprints.*
