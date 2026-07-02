# Politique de confidentialité — contenu à intégrer dans `app/(marketing)/legal/confidentialite/page.tsx`

> **Statut** : prêt à intégrer tel quel. Adresse perso utilisée temporairement — à remplacer par une domiciliation commerciale dans les 2-4 semaines (post-sprint 8).
>
> **Référence légale** : Règlement (UE) 2016/679 (RGPD), loi 78-17 du 6 janvier 1978 modifiée (Informatique et Libertés).
>
> **Dernière mise à jour du contenu** : 21 mai 2026.
>
> **À auditer par un juriste** avant lancement public (sprint 21). Ce premier jet couvre l'essentiel mais n'a pas valeur d'avis juridique.

---

## 1. Préambule

La présente politique décrit comment **Carnet de Pêche** (édité par John Sebastien CAMPBELL, Entrepreneur Individuel, SIREN 977 995 174) collecte, utilise et protège tes données personnelles dans le cadre de l'utilisation du site **www.carnet-de-peche.com**.

Nous attachons une importance particulière à la protection de la vie privée et à la sécurité des données. Cette politique est conforme au **Règlement (UE) 2016/679 (RGPD)** et à la **loi Informatique et Libertés du 6 janvier 1978 modifiée**.

---

## 2. Responsable du traitement

Le responsable du traitement est :

**John Sebastien CAMPBELL** (Entrepreneur Individuel)
- SIREN : 977 995 174
- Adresse : 627 Chemin des Impiniers, 06220 Vallauris, France
- Email : **contact@carnet-de-peche.com**

Carnet de Pêche n'a pas désigné de Délégué à la Protection des Données (DPO) car le traitement de données ne le rend pas obligatoire (article 37 RGPD). Pour toute question relative à tes données, contacte directement le responsable du traitement à l'adresse ci-dessus.

---

## 3. Données collectées

Nous collectons les catégories de données suivantes :

### 3.1 Données d'inscription et de profil

- Email
- Mot de passe (stocké sous forme de hash cryptographique, jamais en clair)
- Pseudo (username)
- Bio (texte libre, optionnel, max 280 caractères)
- Ville
- Département principal
- Niveau de pêche (débutant / intermédiaire / expert)
- Techniques pratiquées
- Espèces favorites
- Fréquence de pêche
- Années de pratique
- Avatar (photo de profil, optionnel)

### 3.2 Données de connexion via fournisseurs tiers

Si tu te connectes via **Google OAuth** ou **Apple Sign-In** (à venir) : nom, prénom, email, photo de profil — uniquement les informations strictement nécessaires à la création de ton compte.

### 3.3 Données de pêche (le carnet)

À chaque prise loguée, nous collectons les données que tu fournis :
- Espèce, taille, poids
- Technique utilisée, leurre / appât
- Photo (optionnelle)
- Date et heure
- Position GPS de la prise
- Conditions environnementales captées automatiquement au moment de la prise (météo, vent, vagues, marée, lune) via l'API **Open-Meteo**
- Niveau de confidentialité que tu choisis (privée / amis / publique)
- Notes libres

### 3.4 Données techniques

À chaque visite, nous collectons automatiquement :
- Adresse IP (conservée 13 mois max)
- Type de navigateur, système d'exploitation, langue
- Pages visitées et timestamps
- Identifiants de session (cookies strictement nécessaires)

Aucun outil d'analytique tiers (Google Analytics, Plausible, PostHog) n'est actuellement actif. Si nous en ajoutons à l'avenir, cette politique sera mise à jour et ton consentement préalable sera demandé pour les outils non-essentiels.

### 3.5 Données de paiement (à venir)

Lorsque tu souscris à un abonnement Local ou Itinérant (paiements activés au sprint 9 — non disponibles actuellement) :
- Email de facturation
- Informations relatives à la souscription (plan, dates, statut)
- Les données de carte bancaire **ne transitent JAMAIS** par nos serveurs : elles sont collectées et traitées exclusivement par **Stripe**, prestataire conforme PCI-DSS Niveau 1.

---

## 4. Finalités et bases légales

| Finalité | Données utilisées | Base légale |
|---|---|---|
| Création et gestion du compte | Inscription, profil | Exécution du contrat (CGU) |
| Affichage du carnet personnel | Prises, photos, conditions | Exécution du contrat |
| Calcul du scoring personnalisé | Prises, historique | Intérêt légitime + exécution du contrat |
| Affichage des prises publiques sur le fil régional | Prises avec privacy=public, géolocalisation floutée à 1 km | Consentement (tu choisis quoi publier) |
| Communication par email (confirmation, reset password, notifications) | Email | Exécution du contrat |
| Facturation et gestion de l'abonnement | Données paiement (via Stripe) | Exécution du contrat |
| Modération et signalement | Tous types de contenus | Intérêt légitime (protection de la communauté) |
| Sécurité, prévention de la fraude | Adresse IP, logs | Intérêt légitime |
| Respect des obligations légales (conservation comptable, fiscale) | Données de facturation | Obligation légale |

---

## 5. Destinataires des données

### 5.1 Sous-traitants techniques (responsables de la sécurité de tes données)

| Sous-traitant | Rôle | Localisation des serveurs | Accord de conformité |
|---|---|---|---|
| **Supabase Inc.** | Base de données, authentification, stockage des photos | eu-west-3 (Paris, France) | Conforme RGPD, DPA disponible |
| **Vercel Inc.** | Hébergement du site et exécution du code | USA (Region "iad1" ou équivalent) | Conforme RGPD via Standard Contractual Clauses (SCC), DPA disponible |
| **Open-Meteo** | Fourniture des conditions météo, marines, solunaires | Allemagne (UE) | Conforme RGPD, données anonymes |
| **Stripe Inc.** (à venir sprint 9) | Traitement des paiements | USA + UE | Conforme RGPD via SCC, DPA disponible, PCI-DSS Niveau 1 |
| **Resend Inc.** (à venir sprint 11) | Envoi des emails transactionnels | USA | Conforme RGPD via SCC, DPA disponible |

### 5.2 Pas de revente, pas de publicité

Nous ne vendons, ne louons et ne partageons jamais tes données avec des tiers à des fins de prospection commerciale. Aucune publicité tierce n'est diffusée sur le site.

### 5.3 Visibilité par les autres utilisateurs

Selon les paramètres de confidentialité que tu choisis :
- **Données toujours publiques** : pseudo, avatar, bio, ville/département (sur ton profil public)
- **Données dépendantes de tes choix** : prises (privée / amis / publique), géolocalisation (précise / floutée 1 km)

---

## 6. Transferts hors Union Européenne

Certains de nos sous-traitants sont basés hors UE (Vercel, Stripe à venir). Ces transferts sont encadrés par les **Clauses Contractuelles Types (SCC)** de la Commission européenne, conformément à l'article 46 du RGPD.

Tu peux demander une copie des garanties applicables en contactant **contact@carnet-de-peche.com**.

---

## 7. Durée de conservation

| Type de donnée | Durée de conservation |
|---|---|
| Compte actif (toutes données) | Tant que ton compte existe |
| Compte supprimé (toutes données) | Effacement immédiat des données identifiantes ; conservation de logs anonymisés 13 mois max |
| Données de facturation | 10 ans à compter de la clôture de l'exercice comptable (obligation fiscale, article L102 B du Livre des procédures fiscales) |
| Données de connexion (IP, logs) | 13 mois (article L34-1 du CPCE) |
| Cookies de session | Durée de la session (effacés à la déconnexion) |

Tu peux supprimer ton compte à tout moment depuis **/profil** (bouton "Supprimer mon compte"). La suppression est irréversible et effective immédiatement.

---

## 8. Tes droits

Conformément aux articles 15 à 22 du RGPD, tu disposes des droits suivants :

| Droit | Comment l'exercer |
|---|---|
| **Accès** : connaître les données te concernant | Demande à contact@carnet-de-peche.com |
| **Rectification** : corriger des données inexactes | Modifie directement depuis /profil ou demande par email |
| **Effacement** ("droit à l'oubli") | Bouton "Supprimer mon compte" sur /profil — immédiat et irréversible |
| **Limitation du traitement** | Demande à contact@carnet-de-peche.com |
| **Portabilité** : recevoir tes données dans un format structuré (JSON) | Demande à contact@carnet-de-peche.com (réponse sous 30 jours) |
| **Opposition** | Demande à contact@carnet-de-peche.com |
| **Retrait du consentement** : à tout moment pour les traitements basés sur le consentement | Modifie tes paramètres de confidentialité ou demande par email |
| **Réclamation auprès de la CNIL** | [www.cnil.fr](https://www.cnil.fr) — Commission Nationale de l'Informatique et des Libertés, 3 Place de Fontenoy, TSA 80715, 75334 PARIS CEDEX 07 |

Tu disposes également du **droit de définir des directives** relatives à la conservation, à l'effacement et à la communication de tes données après ton décès (article 85 de la loi du 6 janvier 1978).

---

## 9. Sécurité

Nous mettons en œuvre des mesures techniques et organisationnelles pour protéger tes données :
- Chiffrement TLS/HTTPS de toutes les communications
- Mots de passe hashés (bcrypt) et jamais stockés en clair
- Politiques d'accès strictes (Row Level Security Supabase) : un utilisateur ne peut accéder qu'à ses propres données + les contenus publics autorisés
- Sauvegardes automatiques quotidiennes de la base de données (rétention 7 jours)
- Accès au panneau d'administration limité au responsable du traitement

En cas de violation de données affectant tes données personnelles, nous nous engageons à notifier la CNIL dans les 72 heures et à t'informer directement si la violation est susceptible d'engendrer un risque élevé pour tes droits et libertés (article 33-34 RGPD).

---

## 10. Cookies

Le site utilise uniquement les cookies suivants :

| Cookie | Type | Finalité | Durée |
|---|---|---|---|
| `sb-*` (Supabase Auth) | Strictement nécessaire | Maintenir ta session connectée | 7 jours |
| Préférences (filtres carte, etc.) | Strictement nécessaire | Mémoriser tes choix d'interface | Durée de la session |

Ces cookies sont **strictement nécessaires** au fonctionnement du site (article 82 de la loi Informatique et Libertés, dispense de consentement préalable). Aucun cookie publicitaire ni de mesure d'audience tierce n'est déposé sans consentement.

Tu peux les supprimer à tout moment via les paramètres de ton navigateur, mais la connexion à ton compte sera alors interrompue.

---

## 11. Modification de la politique

Cette politique peut évoluer en fonction des changements légaux, techniques ou fonctionnels du service. Toute modification substantielle sera notifiée par email aux utilisateurs inscrits **au moins 30 jours avant** son entrée en vigueur.

La version applicable est toujours celle datée en bas de page.

---

## 12. Contact

Pour toute question relative à la présente politique ou à tes données personnelles :

**Email** : contact@carnet-de-peche.com

Nous nous engageons à répondre dans un délai maximum de **30 jours** à compter de la réception de ta demande, conformément à l'article 12 du RGPD.

---

*Dernière mise à jour : 21 mai 2026.*
