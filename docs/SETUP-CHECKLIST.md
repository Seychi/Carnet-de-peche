# ✅ Checklist setup — à faire de votre côté avant que Claude attaque le code

> Compte ~2-3 heures à deux pour tout boucler. Aucune compétence technique requise, juste des inscriptions et quelques décisions business.

---

## 🔴 CRITIQUE — sans ça, je ne peux rien commencer

### 1. Décision : nom de domaine
- [ ] Vérifier la disponibilité de `carnet-de-peche.fr` / `.com` / `.app` sur **OVH** ou **Gandi**.
- [ ] Réserver le ou les domaines retenus (~10-15 €/an chacun).
- [ ] Recommandation : prendre `.fr` (cible française) + `.com` (protection marque). Le `.app` est dispo si vous voulez un nom court pour l'app mobile.

### 2. GitHub — héberger le code
- [ ] Créer un compte GitHub si vous n'en avez pas (gratuit).
- [ ] Créer une **organisation** « carnet-de-peche » (ou tout autre nom). Gratuit aussi.
- [ ] Créer un **repo privé** vide nommé `carnet-de-peche` dans cette org.
- [ ] **M'inviter en collaborator** (ou pousser le code que je vous donne).

### 3. Supabase — la base de données + auth
- [ ] Aller sur <https://supabase.com>, créer un compte (gratuit).
- [ ] Cliquer "New Project". Région : **eu-west-3 (Paris)**. Plan : **Free** pour démarrer (largement suffisant).
- [ ] Donner un nom au projet, choisir un mot de passe de base (à garder en mot de passe manager, **vous ne le retaperez pas souvent**).
- [ ] Une fois créé, dans Settings > API, récupérer et me partager :
  - `URL` du projet
  - `anon public` key
  - `service_role` key (à **garder secrète**, ne jamais commit sur GitHub)
- [ ] Activer l'auth par email + Google OAuth + Apple OAuth (Auth > Providers).

### 4. Vercel — hébergement du site
- [ ] Aller sur <https://vercel.com>, créer un compte (gratuit). Se connecter avec GitHub directement.
- [ ] On ne déploiera pas tout de suite, mais le compte doit exister pour qu'on le connecte au repo plus tard.

---

## 🟡 UTILES dans les 2 premières semaines

### 5. MapTiler — fond de carte
- [ ] Compte gratuit sur <https://www.maptiler.com> (100k tile requests/mois gratuits, largement OK).
- [ ] Créer une **API key** et la noter.

### 6. Stripe — paiements
- [ ] Créer un compte sur <https://stripe.com>.
- [ ] Mode **Test** suffit pour démarrer (pas besoin de KYC tout de suite).
- [ ] On créera les produits/prix plus tard ensemble. Pour passer en prod, il faudra :
  - Un statut juridique (auto-entrepreneur, SASU, SAS... cf. plus bas)
  - Un RIB pro
  - Un KYC (carte d'identité)

### 7. Resend — emails transactionnels
- [ ] Compte gratuit sur <https://resend.com> (3 000 mails/mois gratuits).
- [ ] On configurera le DNS du domaine après réservation pour authentifier les envois.

---

## 🟢 PLUS TARD (sprint 3+, peuvent attendre)

- [ ] **Sentry** (<https://sentry.io>) — monitoring erreurs. Gratuit jusqu'à 5k events/mois.
- [ ] **Plausible** ou **PostHog** — analytics. Plausible ~9 €/mois, PostHog freemium.
- [ ] **Anthropic API** (<https://console.anthropic.com>) — pour la modération IA. Pas urgent puisqu'on lance sans modération.
- [ ] **Apple Developer Program** (99 $/an) — uniquement quand on attaque la phase mobile (sprint 13+).
- [ ] **Google Play Console** (25 $ une fois) — idem.

---

## 📋 Décisions business à prendre

### Structure juridique
- [ ] **Quel statut ?** Auto-entrepreneur (simple, plafonné à 77 700 € CA), SASU (1 personne, plus de souplesse), SAS (plusieurs associés — ton cas). Recommandation **SAS** si vous êtes deux associés.
- [ ] Capital social (1 € minimum, mais 1 000-5 000 € c'est plus crédible).
- [ ] Adresse du siège.
- [ ] Statuts à rédiger (Captain Contrat, Legalstart ~200 € ou notaire ~800 €).

### Marque
- [ ] **Dépôt INPI** de la marque « Carnet de Pêche » : classes 9 (logiciel), 41 (services en ligne / divertissement), 42 (SaaS, services tech). Coût : 190 € pour 3 classes. <https://www.inpi.fr>
- [ ] Optionnel : déposer aussi le logo dès qu'il existe.

### Compte bancaire
- [ ] Ouvrir un compte pro (Qonto, Shine, Revolut Business, ~10-20 €/mois) au nom de la société.
- [ ] Le rattacher à Stripe pour les virements.

### Choix éditoriaux
- [ ] **Département pilote** : Bretagne (cohérent avec les 10 spots seedés) ou autre ? Recommandation : commencer par 1-2 départements bretons (29, 56) pour la beta.
- [ ] **Rôle de ton associé** : tu me dis quel rôle pour qu'on l'intègre au BRIEF.
- [ ] **Logo** : je peux te générer un SVG simple en attendant qu'un designer fasse le vrai (gratuit, 30 min).

---

## 🎯 Quand est-ce que je peux commencer à coder ?

**Minimum vital pour démarrer** (étapes 🔴) :
- Domaine réservé
- Repo GitHub privé créé
- Projet Supabase créé + clés partagées
- Compte Vercel existe

Une fois ces 4 cases cochées, vous me donnez les clés et **j'attaque le sprint 1 immédiatement** :
1. Setup monorepo + Next.js de base
2. Connexion Supabase + auth (email + Google + Apple)
3. Application des 4 migrations SQL
4. Premier écran (accueil + login)

Estimation : repo cloneable et déployé sur Vercel à J+3.

**Les étapes 🟡 et 🟢 peuvent attendre** — on les enchaîne sprint par sprint sans bloquer.

---

## 📨 Format pour me partager les credentials

Quand vous m'envoyez vos clés, utilisez ce format (et **jamais en clair dans le chat public** — utilisez 1Password Send, ProtonMail, ou un fichier `.env` que vous me partagez via le repo dans `.env.example`) :

```bash
# .env.local (à ne JAMAIS commit)
NEXT_PUBLIC_SUPABASE_URL=https://xxxxxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGc...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGc...
NEXT_PUBLIC_MAPTILER_KEY=xxx
RESEND_API_KEY=re_xxx
STRIPE_SECRET_KEY=sk_test_xxx
STRIPE_WEBHOOK_SECRET=whsec_xxx
```

Le fichier `.env.example` (sans valeurs) sera commit, le `.env.local` reste local.

---

*Dès que tu as ces 4 cases 🔴 cochées, tu me reviens et on attaque.*
