# Sprint 3.5 — Briefs pour Claude Code

> Deux blocs prêts à copier-coller dans Claude Code. Le chantier 1 est **déjà codé** (les fichiers sont modifiés dans le repo), il s'agit juste de vérifier + tester + commiter. Le chantier 3 (auth) est **à implémenter** intégralement.

---

## ▶ Chantier 1 — Bug form carnet + flèche retour mobile (à VÉRIFIER + COMMITER)

**Copie-colle ce bloc dans Claude Code :**

```
Contexte : sprint 3.5 du Carnet de Pêche. J'ai déjà des modifs dans le working tree pour fixer deux trucs remontés en test mobile. Ton boulot : relire les diffs, vérifier que c'est propre, lancer le dev server, tester manuellement, et commiter en conventional commits.

Fichiers modifiés / créés :

1. components/catches/CatchForm.tsx — modifié
   - Ajout d'un useEffect qui watch le champ "technique" et reset les champs conditionnels devenus non-pertinents :
     - Si technique passe à "leurres" : reset bait_type à undefined
     - Si technique passe à "surfcasting" / "flottante" / "vif" / undefined : reset lure_brand et lure_model à undefined
   - Utilise un useRef pour ignorer le premier rendu (sinon ça clear en mode édition au mount)
   - Pourquoi : sans ça, si l'user crée une prise au leurre avec lure_brand="Fiiish" puis l'édite en surfcasting, les inputs de leurre disparaissent visuellement mais la valeur "Fiiish" reste dans le state du form et est ressauvée en DB. Résultat : la fiche détail affichait "Leurre: Fiiish" même avec technique=surfcasting.

2. components/layout/BackButton.tsx — nouveau fichier
   - Composant client réutilisable, mobile-only (classe md:hidden)
   - Comportement : router.back() si window.history.length > 1, sinon push vers fallbackHref
   - Position : icône Lucide ArrowLeft, alignement top-left
   - Pas de label par défaut (icône seule), mais accepte une prop "label" optionnelle

3. app/(app)/carnet/page.tsx — modifié
   - Import de BackButton + ajout dans le JSX avant le H1 "Mon carnet"
   - fallbackHref="/home"

4. app/(app)/carnet/nouvelle/page.tsx — modifié
   - Idem, fallbackHref="/carnet"

5. app/(app)/carnet/[id]/modifier/page.tsx — modifié
   - Idem, fallbackHref={`/carnet/${id}`}

Étapes pour toi :

1. Lance `git status` et `git diff` pour voir les 5 fichiers touchés. Vérifie que les modifs collent à la description ci-dessus.

2. Lance `pnpm typecheck` (ou `pnpm tsc --noEmit`) pour confirmer qu'il n'y a pas d'erreur TypeScript.

3. Lance `pnpm dev` et teste à la main sur mobile (devtools en mode iPhone 14 par exemple) :
   - /carnet : la flèche retour doit apparaître en haut à gauche, cachée sur desktop
   - /carnet/nouvelle : pareil
   - Crée une prise au leurre, mets lure_brand="TestBrand", lure_model="TestModel"
   - Change la technique pour "surfcasting" — les inputs de leurre disparaissent
   - Remplis bait_type="vers de mer"
   - Sauvegarde, va sur la fiche détail : seul "Appât: vers de mer" doit s'afficher, PAS de ligne "Leurre"
   - Reviens en édition, repasse en "leurres" : bait_type doit être effacé, les inputs lure_brand/lure_model sont vides

4. Si tout marche, commit en deux commits séparés :
   - fix(carnet): reset lure_brand/lure_model/bait_type au changement de technique
   - feat(layout): ajoute BackButton mobile sur /carnet, /carnet/nouvelle et /carnet/[id]/modifier

5. NE PUSH PAS. Préviens-moi quand c'est commité local, je relirai puis on push ensemble.

Si quoi que ce soit cloche dans les diffs (typo, edge case manqué, comportement bizarre en test), corrige-le toi-même avant de commiter et explique-moi ce que tu as changé.
```

---

## ▶ Chantier 3 — Auth email/password + Google OAuth (à IMPLÉMENTER)

**Copie-colle ce bloc dans Claude Code :**

```
Contexte : sprint 3.5 du Carnet de Pêche. Actuellement l'auth est en magic link UNIQUEMENT (cf app/auth/login/page.tsx et app/auth/login/actions.ts). Les boutons "Continuer avec Google" et "Continuer avec Apple" existent en UI mais sont disabled avec un badge "Bientôt".

Objectif : ajouter deux méthodes d'auth supplémentaires :
1. Email + mot de passe (signup + signin + reset password)
2. Google OAuth

Apple OAuth reste désactivé (on l'ajoutera quand on lancera sur iOS, pour l'instant pas la peine).

Le magic link doit RESTER fonctionnel — on ne le retire pas, il devient juste une option parmi les autres.

────────────────────────────────────────────────────────────────────────
PHASE 1 — Côté Supabase (côté John, sans toi)
────────────────────────────────────────────────────────────────────────

Avant de coder, dis-moi de faire ces étapes côté Supabase Dashboard / Google Cloud, et attends que je confirme avant de continuer :

1. Supabase Dashboard → Authentication → Providers :
   - Email : déjà activé. Vérifier que "Confirm email" est ON et que "Secure email change" est ON.
   - Google : à activer. Demande à John de :
     a) Aller sur https://console.cloud.google.com → créer un projet "Carnet de Pêche"
     b) APIs & Services → Credentials → Create OAuth 2.0 Client ID
        - Application type : Web application
        - Authorized JavaScript origins : http://localhost:3000, https://carnet-de-peche.vercel.app, et le domaine prod final
        - Authorized redirect URIs : https://glgciwwnpmgifyhbvxsw.supabase.co/auth/v1/callback
     c) Récupérer Client ID + Client Secret
     d) Les coller dans Supabase Dashboard → Authentication → Providers → Google

2. Supabase Dashboard → Authentication → URL Configuration :
   - Site URL : https://carnet-de-peche.vercel.app (ou domaine prod)
   - Redirect URLs (whitelist) : ajouter http://localhost:3000/auth/callback, https://carnet-de-peche.vercel.app/auth/callback, et le futur domaine prod

Quand John confirme que c'est fait, passe à la phase 2.

────────────────────────────────────────────────────────────────────────
PHASE 2 — Côté code (toi)
────────────────────────────────────────────────────────────────────────

A. Refonte de app/auth/login/page.tsx

Structure cible (ordre dans la card) :
1. Tabs/toggle "Connexion" vs "Inscription" en haut (état local, contrôle ce qu'on affiche)
2. Champ email
3. Champ mot de passe (avec toggle show/hide via Eye icon Lucide)
4. Lien "Mot de passe oublié ?" sous le champ password (uniquement en mode Connexion)
5. Bouton primaire : "Se connecter" ou "Créer mon carnet" selon le tab actif
6. Séparateur "ou"
7. Bouton "Continuer avec Google" — fonctionnel
8. Bouton "Reçois un lien magique" (collapse/expand, ouvre le formulaire email-only existant) — fait du magic link l'option tertiaire
9. Bouton "Continuer avec Apple" — toujours disabled avec badge "Bientôt", garde tel quel

Garde la charte existante (rounded-full, min-h-[48px], colors navy/teal).

B. Server Actions à créer dans app/auth/login/actions.ts

Ajoute (en gardant sendMagicLink existant) :

- signInWithPassword(formData) : valide email+password avec zod, appelle supabase.auth.signInWithPassword, gère les erreurs (Invalid login credentials → "Email ou mot de passe incorrect", Email not confirmed → "Confirme ton email avant de te connecter, lien renvoyé")
- signUpWithPassword(formData) : valide email+password+passwordConfirm avec zod (password min 8 caractères, au moins 1 chiffre), appelle supabase.auth.signUp avec emailRedirectTo, gère "User already registered" → "Un compte existe déjà avec cet email. Connecte-toi."
- requestPasswordReset(formData) : valide email, appelle supabase.auth.resetPasswordForEmail avec redirectTo=/auth/reset-password

Toutes les actions retournent une LoginState compatible useActionState (success/error/email/submittedAt).

C. Google OAuth — Server Action

Crée signInWithGoogle dans le même fichier :
- "use server"
- Crée le supabase client
- supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: `${origin}/auth/callback?next=/home` } })
- Retourne l'URL via redirect() de next/navigation

Branche le bouton "Continuer avec Google" sur cette action via <form action={signInWithGoogle}>.

D. Page reset password

Nouveau fichier app/auth/reset-password/page.tsx :
- Form avec input "Nouveau mot de passe" + "Confirme"
- Server action updatePassword qui appelle supabase.auth.updateUser({ password: newPassword })
- Redirect /home après succès
- Le user arrive ici via le lien email envoyé par requestPasswordReset (Supabase gère ça)

E. /auth/register existant

Actuellement c'est juste un redirect vers /auth/login. Modifie pour rediriger vers /auth/login?tab=register, et fais en sorte que le tab par défaut soit "Inscription" si ce param est présent.

F. /auth/callback existant

Devrait déjà marcher avec OAuth (exchangeCodeForSession gère le code OAuth comme le magic link). Vérifie en test, ajuste si nécessaire.

G. Mise à jour du middleware si nécessaire

Si tu trouves des soucis avec la session OAuth qui ne persiste pas, regarde lib/supabase/middleware.ts.

────────────────────────────────────────────────────────────────────────
PHASE 3 — Tests
────────────────────────────────────────────────────────────────────────

Lance `pnpm dev` et teste à la main :

1. Magic link existant : doit toujours marcher (régression check)
2. Signup avec password : crée toi@test.fr avec password "test1234". Email de confirmation arrive. Clique sur le lien, redirect vers /onboarding.
3. Signin avec password : déconnecte, reviens sur /auth/login, connecte-toi avec password
4. Mauvais password : message d'erreur clair
5. Mot de passe oublié : envoie le mail, clique le lien, change le password, log avec le nouveau
6. Google OAuth : clique sur "Continuer avec Google", la popup Google s'ouvre, sélectionne un compte, redirect vers /onboarding ou /home selon onboarded=true/false
7. Test mobile : tout doit rester utilisable, les boutons font au moins 48px de haut

────────────────────────────────────────────────────────────────────────
PHASE 4 — Commits
────────────────────────────────────────────────────────────────────────

Commits séparés en conventional commits :
- feat(auth): ajoute connexion par email/mot de passe
- feat(auth): ajoute inscription par email/mot de passe + reset
- feat(auth): branche Google OAuth
- refactor(auth): nouvelle UI login/register avec tabs

NE PUSH PAS. Préviens-moi quand tout est commité local, je relirai puis on push ensemble.

Si tu rencontres un blocage (config Supabase manquante, redirect URL non whitelistée, erreur OAuth), ARRÊTE-TOI et explique-moi ce que je dois corriger dans le dashboard Supabase ou Google Cloud avant que tu reprennes.
```

---

## Notes pour John

- **Chantier 1** : tu peux le passer à Claude Code tout de suite, c'est rapide (vérif + 2 commits).
- **Chantier 3** : la phase 1 (Supabase Dashboard + Google Cloud) est à TOI. Compte 30 min pour mettre tout en place. Une fois fait, Claude Code peut attaquer la phase 2.
- Si Claude Code te dit "redirect URI mismatch" en testant le bouton Google, c'est que la liste blanche d'URLs n'est pas à jour dans Supabase ou Google Cloud — c'est la cause la plus fréquente.
- Pour le mot de passe Supabase : le minimum côté Supabase est 6 caractères par défaut. Tu peux monter à 8+ dans Dashboard → Authentication → Settings → Password Strength.
