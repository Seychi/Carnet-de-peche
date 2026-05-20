# Brief test E2E pour Claude in Chrome

> Copie-colle tout le bloc entre les triples backticks ci-dessous dans Claude in Chrome. Il enchaînera les tests tout seul et te fera un rapport à la fin.
>
> **Avant de coller** : remplace `[URL_DE_BASE]` (ligne "URL de base") par l'URL où tu veux tester (`http://localhost:3000` si tu fais `pnpm dev`, ou l'URL Vercel preview / prod). Et remplace `[EMAIL_TEST]` + `[PASSWORD_TEST]` par les credentials d'un compte test que tu auras créé en amont via magic link (le plus simple : crée-le toi à la main avant le test, ou créer un compte via magic link et noter l'email).

```
Tu vas tester le site Carnet de Pêche end-to-end après le sprint 3.5. Trois lots de changements ont été livrés :
1. Refonte de l'auth (ajout password + Google OAuth + reset password, magic link conservé en option)
2. Fix d'un bug du formulaire carnet (les champs marque de leurre / appât persistaient au changement de technique)
3. Ajout d'une flèche retour mobile sur les pages /carnet*

Setup :
- URL de base : [URL_DE_BASE]
- Compte test pré-existant : email = [EMAIL_TEST], password = [PASSWORD_TEST]
- Ouvre une fenêtre en mode incognito pour partir d'un état clean
- Garde l'onglet console (F12) et l'onglet Network ouverts en continu pour capturer warnings/errors
- Pour les tests mobile, utilise le device emulator de Chrome DevTools en mode "iPhone 14 Pro Max" ou équivalent

Process : pour chaque étape, exécute, prends un screenshot quand pertinent, note les erreurs console / network, et qualifie le résultat (PASS / FAIL / WARNING).

═══════════════════════════════════════════════════════════════════
PHASE 1 — Tests sans auth (incognito, déconnecté)
═══════════════════════════════════════════════════════════════════

1. Homepage
   - Aller sur /
   - Vérifier : hero visible, CTAs cliquables, scroll fluide, header + footer présents
   - Erreurs console acceptables : warnings React. Inacceptables : errors rouges, 404, 500
   - PASS si tout OK

2. Page /auth/login — état initial
   - Aller sur /auth/login
   - Vérifier la présence et l'état attendus :
     * Tabs "Connexion" et "Inscription" en haut
     * Tab "Connexion" actif par défaut
     * Inputs Email + Mot de passe (avec icône œil pour show/hide)
     * Lien "Mot de passe oublié ?" sous le champ password
     * Bouton primaire "Se connecter" (ou équivalent)
     * Séparateur "ou"
     * Bouton "Continuer avec Google" — actif (pas grisé)
     * Bouton "Continuer avec Apple" — grisé avec badge "Bientôt"
     * Section "Reçois un lien magique" — collapsible, fermée par défaut

3. Tab Inscription
   - Cliquer le tab "Inscription"
   - Vérifier que les champs / le bouton CTA changent (signup vs signin)
   - L'URL devrait inclure quelque chose comme ?tab=register
   - Repasser sur tab Connexion → URL et UI reviennent

4. Redirection /auth/register
   - Aller directement sur /auth/register
   - Doit rediriger vers /auth/login?tab=register avec tab Inscription actif

5. Erreur login password
   - Tab Connexion, email = test-nope@example.com, password = wrong-pass-123
   - Cliquer "Se connecter"
   - Attendu : message d'erreur clair en rouge (genre "Email ou mot de passe incorrect")
   - Pas de crash, pas de redirect

6. Validation form vide
   - Tab Connexion, ne rien remplir, cliquer "Se connecter"
   - Attendu : validation HTML5 ou message d'erreur, pas de submit

7. Mot de passe oublié — UI
   - Cliquer "Mot de passe oublié ?"
   - Attendu : un formulaire avec input email apparaît (modal ou inline)
   - Ne PAS soumettre (on ne peut pas vérifier les emails)

8. Magic link — UI collapsible
   - Cliquer "Reçois un lien magique" pour dérouler
   - Attendu : formulaire email + bouton "M'envoyer le lien"
   - Ne PAS soumettre

9. Google OAuth — début seulement
   - Cliquer "Continuer avec Google"
   - Attendu : redirection vers accounts.google.com
   - STOP ICI, ne va pas plus loin (Google détecte les bots et bloque, ça pollue les tests)
   - Reviens sur /auth/login

10. Pages publiques
    - Visite /tarifs, /guides, /spots, /carte
    - Vérifier : se chargent sans 500, layouts pas cassés, pas d'erreur console majeure
    - Cliquer 2-3 liens au hasard dans header + footer pour confirmer qu'ils ne 404 pas

11. Redirections protégées
    - Sans être loggé, tente d'accéder à /carnet, /carnet/nouvelle, /profil, /home, /onboarding
    - Attendu : chacune redirige vers /auth/login

═══════════════════════════════════════════════════════════════════
PHASE 2 — Tests authentifiés (passe à l'étape suivante seulement si tu as les credentials)
═══════════════════════════════════════════════════════════════════

Connecte-toi avec [EMAIL_TEST] / [PASSWORD_TEST] sur /auth/login.

12. Connexion réussie
    - Saisis les credentials, submit
    - Attendu : redirect vers /home (ou /onboarding si le compte n'est pas onboardé — dans ce cas, indique-le mais ne complète pas l'onboarding)
    - Vérifier que tu es bien loggé (présence d'un menu user / avatar)

13. Navigation /carnet — flèche retour mobile
    - Bascule en mode mobile (iPhone 14 Pro Max) dans DevTools
    - Va sur /carnet
    - Attendu : flèche retour en haut à gauche (icône ArrowLeft), AVANT le titre "Mon carnet"
    - Cliquer dessus → revient à la page précédente
    - Bascule en desktop (largeur > 768px) → la flèche doit être MASQUÉE
    - Note : même test sur /carnet/nouvelle et /carnet/[id]/modifier

14. CRÉATION DE PRISE — TEST CRITIQUE DU BUG FIX
    - Sur /carnet/nouvelle (mode mobile préféré pour valider la UX)
    - Remplir progressivement, étape par étape :
      a. Espèce : sélectionne "Bar"
      b. Taille : 45 cm (slider ou input)
      c. Technique : sélectionne "Leurres"
      d. → Vérifie que les inputs "Marque du leurre" et "Modèle / coloris" apparaissent
      e. Tape "BlackMinnow" dans Marque, "Black 120" dans Modèle
      f. Change la technique pour "Surfcasting"
      g. → Vérifie que les inputs Marque/Modèle DISPARAISSENT
      h. → Vérifie qu'un input "Appât" apparaît
      i. Tape "vers de mer" dans Appât
      j. Change la technique pour "Leurres" à NOUVEAU
      k. → CRUCIAL : Les inputs Marque/Modèle réapparaissent et doivent être VIDES (pas remplis avec "BlackMinnow" / "Black 120" récupérés du précédent passage)
      l. Change la technique pour "Vif"
      m. → CRUCIAL : Input Appât réapparaît et doit être VIDE (pas avec "vers de mer")
    - Si une des assertions k ou m échoue, le bug fix est cassé. SCREENSHOT EXACT + FAIL critique.

15. Finir la création + vérification fiche détail
    - Reprendre le form, mettre technique "Surfcasting", appât "test e2e"
    - Position : utiliser GPS si possible, sinon saisir manuellement lat=48.04 lng=-4.73
    - Date/heure : laisser maintenant
    - Confidentialité : "Privée"
    - Soumettre "Loguer la prise"
    - Attendu : redirect vers /carnet/{id}
    - Sur la fiche détail :
      * Section "Comment" : ligne "Technique : Surfcasting" + ligne "Appât : test e2e"
      * AUCUNE ligne "Leurre" ne doit apparaître (preuve que le bug est fixé)

16. Edition d'une prise
    - Cliquer "Modifier" sur la fiche
    - Flèche retour visible (mode mobile)
    - Change la technique pour "Leurres", saisis Marque "TestBrand"
    - Sauvegarde
    - Sur la fiche détail à nouveau : ligne "Leurre : TestBrand" présente, ligne "Appât" PLUS présente

17. Liste /carnet
    - Aller sur /carnet
    - La prise créée doit apparaître dans la grille
    - Stats en haut incluent cette prise
    - Cliquer une carte → ouvre la fiche détail

18. Suppression de la prise test
    - Sur la fiche détail, ouvrir le menu actions (3 points)
    - Supprimer la prise
    - Confirmer
    - Attendu : retour sur /carnet, la prise n'y est plus

19. Profil
    - /profil — vérifier que les infos perso s'affichent
    - Pas d'erreur console

20. Déconnexion
    - Trouver le bouton "Se déconnecter" (probablement dans le menu utilisateur)
    - Vérifier qu'après déconnexion on est redirigé sur /
    - Tenter d'aller sur /carnet → doit rediriger vers /auth/login (la session est bien tuée)

═══════════════════════════════════════════════════════════════════
RAPPORT FINAL
═══════════════════════════════════════════════════════════════════

Récapitule sous forme structurée :

✅ PASS — liste des étapes qui ont marché (numéros)
❌ FAIL — pour chaque échec :
   - Numéro de l'étape
   - Ce qui a planté concrètement
   - URL au moment du problème
   - Screenshot
   - Erreurs console / network pertinentes
⚠️ WARN — choses bizarres mais pas bloquantes :
   - Layout cassé sur certains breakpoints
   - Lenteurs, flashs de contenu non stylé (FOUC)
   - Textes mal contrastés ou tronqués
   - Warnings console répétés
🚫 SKIP — étapes que tu n'as pas pu tester (et pourquoi) :
   - Email verification : non testable sans accès Gmail
   - Google OAuth complet : bloqué par anti-bot

Ressenti UX mobile (3 phrases max).
Ressenti UX desktop (3 phrases max).

Termine par : si tu devais classer la PR comme "ready to push" / "à corriger d'abord", quel verdict ?
```

---

## Notes pour John

- **Si tu n'as pas encore de compte test** : crée-en un AVANT de lancer Claude in Chrome. Le plus simple = aller sur /auth/login en mode déconnecté, onglet Inscription, créer avec un email perso secondaire + password fort, confirmer l'email, t'auto-onboarder. Puis tu donnes ces credentials au prompt.
- **Si tu testes sur Vercel preview** : assure-toi que la preview est bien la branche qui contient les 2 commits chantier 1 + les commits chantier 3 (auth). Sinon Claude in Chrome testera l'ancienne version.
- **Si tu testes en localhost** : lance `pnpm dev` AVANT, attends que le serveur soit prêt, puis donne à Claude in Chrome l'URL `http://localhost:3000`. ATTENTION : Claude in Chrome tourne dans ton browser, donc il a accès à localhost — c'est OK.
- **Google OAuth en mode Testing** : si tu n'as pas mis l'email de Claude in Chrome dans les test users, l'OAuth Google va refuser. Comme on lui dit de s'arrêter au redirect Google, c'est pas grave — il vérifie juste que le bouton fait bien partir le flow.
- **Le test 14 est LE plus important** — c'est la régression que tu as repérée en testant. Si Claude in Chrome dit qu'il passe, on est tranquille sur le fix.
