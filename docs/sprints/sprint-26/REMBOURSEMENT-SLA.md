# SLA Remboursement — « Satisfait ou remboursé » (D-F3)

> Sprint 26, WS-A. Process MANUEL de traitement des demandes de remboursement.
> Référence interne + engagement de délai. Aligné sur la CGU (article 5.4).

## 1. La promesse (ce qu'on affiche)

- **Garantie satisfait ou remboursé, 30 jours.** Un nouvel abonné Local ou
  Itinérant peut demander le remboursement **intégral de son premier paiement**
  dans les **30 jours** suivant la date de facturation.
- Source contractuelle : **CGU art. 5.4** (« Garantie satisfait ou remboursé »).
  C'est le **texte qui fait foi** — toute la copie marketing s'aligne dessus.
- Demande par email à **contact@carnet-de-peche.com**.

### Ne pas confondre (incohérence levée ce sprint)

| Mécanisme | Durée | Nature |
|---|---|---|
| **Essai** (Local / Itinérant) | **7 jours** avec CB | Avant tout prélèvement |
| **Garantie satisfait ou remboursé** | **30 jours** après facturation | Remboursement du 1er paiement |

Avant ce sprint, le marketing écrivait « 7 jours satisfait ou remboursé », ce qui
mélangeait l'essai (7 j) et la garantie (30 j). Corrigé : la copie dit désormais
« Essai 7 jours » pour l'essai et « Satisfait ou remboursé (sous 30 jours) » pour
la garantie. La CGU (30 j) n'a pas été modifiée — on ne réduit jamais une
protection consommateur.

## 2. Le process (interne, manuel)

1. **Réception** — la demande arrive sur contact@carnet-de-peche.com.
2. **Qui traite** — John (Product/Tech). Pas d'automatisation : volume faible au
   lancement, traitement à la main assumé.
3. **Vérifications** (rapides, non bloquantes pour le client de bonne foi) :
   - Demande dans la **fenêtre de 30 jours** depuis la **première facture** payée
     (pas la date d'inscription, pas la date d'essai).
   - Il s'agit bien du **premier paiement** (la garantie couvre la première
     facture, pas les renouvellements suivants).
   - Pas d'**abus manifeste** : ré-abonnements répétés uniquement pour récupérer
     le remboursement à chaque cycle, fraude avérée. En cas de doute, on échange
     d'abord par email avant de refuser.
4. **Exécution** — remboursement via le **Stripe Dashboard** :
   `Payments → la transaction → Refund` (remboursement intégral du 1er paiement).
   Puis, si l'abonnement est encore actif, l'annuler (ou laisser le client le
   faire en 1 clic depuis le Customer Portal).
5. **Réponse au client** — email de confirmation : remboursement effectué, délai
   d'apparition sur le relevé (5-10 j ouvrés selon la banque, côté Stripe).

## 3. Le SLA (délai cible)

- **Accusé de réception** : sous **48 h ouvrées** (cohérent avec l'art. 14 CGU
  « Règlement des litiges »).
- **Traitement du remboursement** : sous **5 jours ouvrés** à compter de la
  réception de la demande.
- Le crédit effectif sur le compte du client dépend ensuite de Stripe + sa banque
  (hors de notre contrôle).

## 4. Garde-fous (cohérence avec la copie publique)

- On **ne promet PAS** « sans aucune question » dans la copie marketing : on doit
  pouvoir échanger en cas d'abus manifeste (leçon sprint 7.5 — ne pas
  sur-promettre). La CGU reste la référence contractuelle.
- **Pas de friction d'annulation** : l'annulation reste à **1 clic** via le
  Customer Portal Stripe (`/api/stripe/portal`). Le remboursement est un geste
  commercial en plus, pas un substitut à l'annulation libre.
- **RGPD / emails** : ce process est indépendant des emails de relance. Un client
  désinscrit du marketing garde évidemment droit à la garantie.

## 5. À garder à jour

- Si le volume augmente, envisager un mini-formulaire dédié + un statut de
  demande, plutôt que l'email seul.
- Toute évolution de la fenêtre (30 j) doit être répercutée **ensemble** dans :
  CGU art. 5.4/5.6, `tarifs/page.tsx`, `pricing-cards.tsx` et la home, sous peine
  de réintroduire l'incohérence corrigée ce sprint.
