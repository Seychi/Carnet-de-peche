# Templates email Supabase Auth (sprint 11 Bloc C)

Les emails d'auth (reset password, confirmation d'inscription, magic link)
sont envoyés par **Supabase Auth**, pas par notre code — donc pas par Resend
ni par les templates React de `emails/`. Pour les brander, deux actions
**manuelles dans le dashboard Supabase** (projet `glgciwwnpmgifyhbvxsw`) :

## ⚠️ Flux de reset (corrigé 2026-06-25) — NE PAS revenir en arrière

Le lien de reset utilise le flux **`token_hash` + `verifyOtp`** via la route
serveur [`app/auth/confirm/route.ts`](../../app/auth/confirm/route.ts), PAS
l'ancien flux `{{ .ConfirmationURL }}` → `/auth/callback`.

Pourquoi : l'ancien flux produisait soit un fragment `#access_token=…`
(flux implicite, illisible côté serveur), soit un `?code=` PKCE dont le
« code verifier » vit dans le navigateur DEMANDEUR — donc cassé dès que
l'utilisateur ouvre l'email sur un autre appareil (desktop → mobile) ou dans
la webview d'un client mail. Symptôme observé : atterrissage sur la home (avec
`#access_token` dans l'URL) ou sur `/auth/login`, sans pouvoir changer le mot
de passe. `verifyOtp({ token_hash })` est auto-suffisant → robuste cross-device.

## 1. Coller le template reset password (2 min)

Dashboard → **Authentication → Emails → Templates → Reset Password** :

- Subject : `Réinitialise ton mot de passe — Carnet de Pêche`
- Body : coller le contenu de [`reset-password.html`](./reset-password.html)

Le lien y est : `{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=recovery&next=/auth/reset-password`.
Les variables `{{ .SiteURL }}` / `{{ .TokenHash }}` / `{{ .Email }}` sont
remplacées par Supabase à l'envoi — ne pas y toucher.

## 1bis. Vérifier la config URL (OBLIGATOIRE — c'était la cause racine)

Dashboard → **Authentication → URL Configuration** :

- **Site URL** = `https://carnet-de-peche.com` (sans `www`). C'est ce que
  `{{ .SiteURL }}` injecte dans le lien — s'il est faux, le lien est mort.
- **Redirect URLs** (allowlist) : ajouter, si absents —
  `https://carnet-de-peche.com/auth/confirm`,
  `https://carnet-de-peche.com/auth/reset-password`,
  `https://carnet-de-peche.com/auth/callback` (OAuth Google),
  ainsi que les previews Vercel via wildcard `https://*.vercel.app/auth/**` si besoin.
  Une URL `redirectTo` absente de l'allowlist est ignorée → Supabase retombe
  sur le Site URL (= ce qui cassait le reset).

⚠️ Le template affirme « le lien est valable 1 heure » : vérifier que
**Authentication → Sessions → Email OTP Expiration** est bien à `3600` s
(le défaut). Si la valeur diffère, adapter la phrase dans le HTML.

## 2. Coller le template magic link

Dashboard → **Authentication → Emails → Templates → Magic Link** :

- Subject : `Ton lien de connexion — Carnet de Pêche`
- Body : coller le contenu de [`magic-link.html`](./magic-link.html).

Le lien y est : `{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=email&next=/home`.

⚠️ **`type=email`, PAS `type=magiclink`.** La doc Supabase courante unifie les
liens token_hash construits manuellement sur `type=email` pour le sign-in ET le
sign-up (`magiclink`/`signup` sont l'ancienne convention). La valeur `recovery`
reste réservée au reset password.

## Périmètre restant

La **confirmation d'inscription** (template « Confirm signup ») utilise encore
l'ancien `{{ .ConfirmationURL }}` → même bug latent cross-device. Pour la durcir,
même patron : `{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=email&next=/onboarding/1`
(`type=email`, comme le magic link). La route `/auth/confirm` gère déjà tous les
types — il ne reste qu'à éditer ce template dans le Dashboard.

## 2. (Recommandé) SMTP custom via Resend — même domaine d'envoi partout

Par défaut, Supabase envoie depuis `noreply@mail.app.supabase.io` (quota
**2 emails/h** — limite documentée, modifiable sans préavis par Supabase —
et délivrabilité moyenne). Une fois le domaine `carnet-de-peche.com` vérifié
dans Resend, brancher Supabase dessus :

Dashboard → **Authentication → Emails → SMTP Settings** :

| Champ | Valeur |
|---|---|
| Host | `smtp.resend.com` |
| Port | `465` |
| Username | `resend` |
| Password | la clé API Resend (`re_…`, la même que `RESEND_API_KEY`) |
| Sender email | `bonjour@carnet-de-peche.com` |
| Sender name | `Carnet de Pêche` |

→ tous les emails d'auth partent alors du même expéditeur que les
transactionnels, avec le SPF/DKIM du domaine. À faire APRÈS la vérif DNS
Resend, sinon les emails d'auth tomberont en spam (voire ne partiront pas).

## Périmètre

Seul le **reset password** est brandé au sprint 11 (critère du brief Bloc C).
Confirmation d'inscription et magic link gardent le template Supabase par
défaut — à brander plus tard sur le même modèle si besoin (backlog).
