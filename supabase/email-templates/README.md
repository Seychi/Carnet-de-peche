# Templates email Supabase Auth (sprint 11 Bloc C)

Les emails d'auth (reset password, confirmation d'inscription, magic link)
sont envoyés par **Supabase Auth**, pas par notre code — donc pas par Resend
ni par les templates React de `emails/`. Pour les brander, deux actions
**manuelles dans le dashboard Supabase** (projet `glgciwwnpmgifyhbvxsw`) :

## 1. Coller le template reset password (2 min)

Dashboard → **Authentication → Emails → Templates → Reset Password** :

- Subject : `Réinitialise ton mot de passe — Carnet de Pêche`
- Body : coller le contenu de [`reset-password.html`](./reset-password.html)

Les variables `{{ .ConfirmationURL }}` / `{{ .Email }}` sont remplacées par
Supabase à l'envoi — ne pas y toucher. Le lien renvoie vers
`/auth/callback` (déjà configuré côté app, flow de reset du sprint 3.5).

⚠️ Le template affirme « le lien est valable 1 heure » : vérifier que
**Authentication → Sessions → Email OTP Expiration** est bien à `3600` s
(le défaut). Si la valeur diffère, adapter la phrase dans le HTML.

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
