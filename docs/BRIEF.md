# 📒 Carnet de Pêche — Brief projet

> À coller en début de chaque nouvelle conversation avec Claude pour recharger le contexte en 30 secondes.

---

## 1. Identité

- **Nom** : Carnet de Pêche
- **Tagline** : « Logue. Partage. Progresse. »
- **Pitch en une phrase** : Le réseau social et le carnet de pêche numérique des pêcheurs à la canne du bord en France. Une carte intelligente qui apprend des prises réelles loguées par la communauté.
- **Concurrent direct #1** : [spot-de-peche.com](https://spot-de-peche.com/) — WordPress, pas de carnet, pas de social, pas d'app mobile, 5 formules confuses. Faible.
- **Concurrent direct #2 (PLUS SÉRIEUX)** : [FishFriender](https://www.fishfriender.com/) — lancé 2016, 4,7/5 sur 3 200 avis, iOS+Android+Web, 12 langues, abonnement SCALE (6 paliers 4,99 € → 59,99 €). Force : boîte de pêche numérique scannable (130k produits) + 10 ans de communauté. Faiblesses : généraliste toutes pêches, pas localisé FR, carte 100% paywall (plaintes utilisateurs récurrentes), pas de fil régional. Notre angle d'attaque : hyper-spécialisation canne du bord en mer FR + carte basique gratuite + fil régional par département.

## 2. Équipe

- **John** (founder) — pêcheur passionné, vision produit, direction.
- **Associé de John** (co-founder) — à compléter (rôle).
- **Claude** (executor) — code, contenu, design, recherche, debug. Pas de mémoire entre sessions : il faut lui re-donner ce brief à chaque conversation.

## 3. Périmètre v1 (verrouillé)

**IN**
- Pêche à la **canne du bord uniquement** (leurres, surfcasting, flottante, vif).
- Espèces : bar, dorade royale, lieu jaune, maquereau, sar, orphie.
- Web + app iOS + app Android dès la v1.
- France métropolitaine (Atlantique, Manche, Méditerranée).

**OUT (pour plus tard)**
- Pêche à pied, pêche en bateau, eau douce, plongée, épaves.

## 4. Stratégie produit

3 piliers de la home page :
1. **Le carnet** — log des prises, conditions auto-loggées, stats annuelles, privé par défaut.
2. **La carte qui apprend** — score 0-100 par spot, calibré sur les prises de la communauté (effet réseau infranchissable).
3. **La communauté** — fil régional, profils, badges, floutage GPS systématique (anti spot-burning), modération IA Claude.

3 formules tarifaires claires (vs. 5 confuses du concurrent SDP, vs. 6 paliers de FishFriender) :

**Découverte (gratuit, illimité)**
- Carnet de pêche illimité (clé : ça nourrit notre data)
- Carte basique : 3 spots populaires/département, coords floutées 1 km, pas de score, pas de filtre
- Marées + météo (1 ville)
- Guides éditoriaux (SEO)
- Fil régional lecture seule
- 1 département uniquement

**Local — 4,90 €/mois ou 49 €/an (-17 %)**
- Carte complète du département : tous les spots, coordonnées GPS précises, score d'activité 0-100, filtres espèces/techniques
- Mode hors ligne (carte + marées 7 jours)
- Notifications push (créneaux optimaux, grandes marées)
- Couches avancées (bathymétrie, vent, courants)
- Fil régional en écriture + interactions sociales
- Stats avancées du carnet
- Carnet photos HD illimité

**Itinérant — 9,90 €/mois ou 99 €/an (-17 %)**
- Tous les départements côtiers FR
- Bathymétrie SHOM premium
- Itinéraires GPS multi-spots
- Accès anticipé aux nouvelles fonctionnalités
- Support prioritaire

Essai 14 jours sans CB · garantie satisfait ou remboursé.

**Règle d'or freemium** : tout ce qui se touche / se voit / se géolocalise précisément → payant. Tout ce qui est éducatif / social / produit par l'utilisateur → gratuit.

**Revenus secondaires (à partir de 5 000 abonnés payants)** :
- Affiliation matériel (Decathlon, Pacific Pêche, marques de leurres) : 10-15 % commission
- Marketplace guides locaux (sorties initiation 1:1) : 15 % commission
- B2B fédérations départementales : licences 500-2 000 €/an
- Sponsoring marques sur le fil régional (jamais agressif, toujours utile)

## 5. Stack technique

| Couche | Choix |
|---|---|
| Web | Next.js 15 (App Router) + TypeScript + Tailwind + shadcn/ui |
| Mobile | React Native + Expo SDK 51 + Expo Router |
| Backend / DB / Auth | Supabase (Postgres + PostGIS + RLS + Auth + Storage + Edge Functions + Realtime) |
| Carte | MapLibre GL JS (web) + Native (mobile) + tuiles MapTiler |
| **Marées + météo + vent + houle** | **Open-Meteo Marine** (gratuit, sans clé, sans convention) |
| Bathymétrie | GEBCO + SHOM Geoservices (open data) |
| Paiements | Stripe Subscriptions (web) + Apple IAP (iOS) |
| Push | Expo Notifications |
| Email | Resend + React Email |
| Modération | Claude API (Haiku + Vision) |
| Analytics | Plausible + PostHog |
| Monorepo | Turborepo + pnpm |
| CI/CD | GitHub Actions + Vercel + EAS Build |

## 6. Modèle de données clé (Supabase / Postgres)

Tables principales : `profiles`, `spots` (geom PostGIS), `catches` (le carnet — cœur produit, avec geom_public flouté à 2 km), `feed_posts`, `follows`, `tides_cache`, `subscriptions`.

Le **score d'activité** d'un spot est calibré en boucle fermée sur les prises loguées (pondérations ajustées par régression logistique mensuelle) — c'est la barrière concurrentielle principale.

## 7. Décisions prises

- ✅ Nom : Carnet de Pêche (déposer à l'INPI classes 9, 41, 42).
- ✅ Tagline : « Logue. Partage. Progresse. »
- ✅ Stack Next.js + Supabase + Expo (RN).
- ✅ Open-Meteo Marine pour les marées (pas de convention SHOM en v1).
- ✅ 3 formules tarifaires uniquement.
- ✅ Périmètre canne du bord seulement (pas de pêche à pied).
- ✅ Carnet de pêche au cœur du produit (pas une feature secondaire).

## 8. Statut & roadmap

- **Phase 0 (semaine 0-2)** : domaine, marques, comptes (Vercel/Supabase/Stripe/etc.), test Open-Meteo sur 5 spots cibles, design system Figma.
- **Phase 1 — MVP web + carnet (semaines 3-14)** : 12 sprints jusqu'à beta privée.
- **Phase 2 — Mobile iOS/Android (semaines 15-26)** : Expo + IAP + stores.
- **Lancement public** : S+24.

Estimation infra : 22 €/mois au lancement → 200 €/mois à 10k MAU → 800 €/mois à 50k MAU.

## 9. Prochain sprint (sprint 1-2 « Foundations »)

1. Initialiser le monorepo Turborepo.
2. Créer le projet Supabase, écrire les migrations SQL (`profiles`, `spots`, `catches`, `feed_posts`, RLS policies).
3. Auth Supabase (email + OAuth Google + Apple).
4. Page accueil Next.js basée sur la maquette HTML livrée.
5. Header / footer / design system de base.

## 10. Comment travailler avec Claude

- **Re-donner ce brief** au début de chaque session.
- **Tâches concrètes plutôt que vagues** : « Écris la migration SQL pour la table catches » > « Aide-moi avec la DB ».
- **Coller le contenu existant** quand pertinent (code, fichiers, prompts).
- **Itérer rapidement** : Claude est rapide, on peut tester 3 versions avant de figer.
- **Claude n'a pas de mémoire entre sessions** : tout doit être dans le repo ou dans le brief.

## 11. Liens utiles (à compléter au fur et à mesure)

- Repo GitHub : *(à créer)*
- Figma : *(à créer)*
- Linear / Notion : *(à créer)*
- Domaine : *(à réserver)*
- Open-Meteo Marine API : <https://open-meteo.com/en/docs/marine-weather-api>
- Supabase docs : <https://supabase.com/docs>
- Expo docs : <https://docs.expo.dev/>

---

*Dernière mise à jour : mai 2026. Préparé par Claude pour John et son associé.*
