# 🎯 Sprint 51 — « Argent, confiance & sécurité »

> **Brief exécutable** (format Fable `ultracode` / effort `xhigh`). Source : `docs/ROADMAP-CORRECTIFS-2026-06-29-SPRINTS-51-58.md` §4 + audits 28/06 & 29/06.
> **Prod = HEAD `7c23f5c` (sprint-50).** Objectif : éteindre les 6 bugs P1 qui touchent à l'argent, la facturation, la sécurité des avis et l'honnêteté du push. Faible effort, fort enjeu.

---

## 🚀 Ligne de lancement (copier-coller)

```
ultracode effort xhigh — Exécute le Sprint 51 (docs/sprint-51/BRIEF.md). Découpe en workstreams parallèles (WS-A à WS-F indépendants), chacun avec son agent : Stripe paused, Stripe renouvellements, RLS outing_reviews, anti auto-confirm spot, push honnête, libellés/routage notifs. Migrations numérotées 091→093, regen lib/types.ts. Finis par WS-G (vérif : /verif-sprint + tests ciblés + revue anti-régression). Esprit critique : vérifie chaque hypothèse contre le vrai code, remets en cause le brief s'il se trompe. NE PUSH PAS sans validation.
```

**Prérequis** : dépôt local réparé (`del .git\index.lock` puis `git restore .` / `git read-tree HEAD`, `pnpm install && pnpm build` au vert). Index git actuellement corrompu.

---

## Posture (rappel §19 + invariants)

Effort max + critique. Le brief est un guide : si une ligne ne correspond pas au code réel, corrige et signale. Invariants tenus : **RLS d'abord**, migrations numérotées + **regen `lib/types.ts`**, zéro coordonnée exposée, scoring descriptif, **pas de tiret cadratin dans la copy visible**, **pas de push sans John**. Toute migration s'écrit d'abord en fichier `supabase/migrations/NNN_*.sql` puis s'applique. Pas de SQL destructif.

---

## WS-A — Stripe `paused` ne doit plus planter le webhook 🔴

**Problème** : `lib/stripe/events.ts:114` écrit `status: sub.status` brut puis upsert (`:131`). Le CHECK live `subscriptions_status_check` n'autorise PAS `paused` (vérifié) :
```
CHECK (status = ANY (ARRAY['active','trialing','past_due','canceled','incomplete','incomplete_expired','unpaid']))
```
Dès qu'un abonnement passe `paused` (pause_collection) → upsert lève → handler relève (`:133`) → route 500 (`app/api/stripe/webhook/route.ts:78`) → **Stripe retente l'event à l'infini** et le tier local reste figé/faux.

**Correctif** :
1. **Migration `091_subscriptions_status_paused.sql`** :
   ```sql
   alter table public.subscriptions drop constraint if exists subscriptions_status_check;
   alter table public.subscriptions add constraint subscriptions_status_check
     check (status = any (array[
       'active','trialing','past_due','canceled',
       'incomplete','incomplete_expired','unpaid','paused'
     ]));
   ```
2. **Vérifier `current_tier`** (RPC) : confirmer qu'un `status='paused'` **ne donne aucun droit** (doit retomber sur `discovery`, comme `past_due`/`canceled`). Si la fonction ne liste que `active`/`trialing` comme entitlement → déjà correct ; sinon ajuster (migration incluse).
3. (Optionnel, ceinture+bretelles) clamp défensif dans `handleSubscriptionUpsert` : statut inconnu → ne pas casser (log + mapper vers la valeur la plus proche).

**Critères d'acceptation** : un event `customer.subscription.updated` avec `status='paused'` renvoie **200** et met la ligne à jour ; un user `paused` est traité comme `discovery` par `current_tier`. Test unitaire ajouté (`paused` → upsert OK + tier non payant).

**Dépendances** : aucune. **Fichiers** : `supabase/migrations/091_*.sql`, `lib/stripe/events.ts`, (peut-être) la migration `current_tier`, `lib/types.ts` (regen).

---

## WS-B — Plus de double conversion/reçu à chaque renouvellement 🔴

**Problème** : `handleInvoicePaymentSucceeded` (`lib/stripe/events.ts:327`) ne garde que sur `amount_paid > 0` (`:330`). Donc **chaque** `invoice.payment_succeeded` récurrent ré-émet `trackServer(..., 'trial_converted', …)` (`:337`) et **renvoie** `PaymentSuccessEmail` (`:346-350`). Un abonné 12 mois = 12 « conversions » + 12 emails.

**Correctif** : gater sur la première facture d'abonnement.
```ts
// après le garde amount_paid (events.ts:330), ajouter :
if (inv.billing_reason !== 'subscription_create') return
```
- `trial_converted` ne doit se déclencher **qu'à la 1re facture** (`subscription_create`). 
- L'email `PaymentSuccessEmail` : c'est un email « bienvenue payante / conversion », pas un reçu fiscal (Stripe envoie déjà ses reçus). → le gater aussi sur `subscription_create`. *(Décision John si tu veux un email à chaque renouvellement : alors garder l'email hors du garde et ne gater QUE l'analytics.)*

**Critères d'acceptation** : 2e `invoice.payment_succeeded` (`billing_reason='subscription_cycle'`) → **aucun** `trial_converted`, **aucun** email. 1re facture (`subscription_create`) → 1 conversion + 1 email. Test unitaire des deux cas.

**Dépendances** : aucune. **Fichiers** : `lib/stripe/events.ts`, tests.

---

## WS-C — RLS `outing_reviews` : on ne note QUE les membres de SA sortie 🔴

**Problème** : la policy INSERT `outing_reviews_insert_member` contient une **tautologie** (vérifiée live dans `pg_policies`) dans la branche « le noté est membre » :
```
... EXISTS (SELECT 1 FROM outing_participants op
            WHERE op.proposal_id = op.proposal_id   -- ← toujours vrai
              AND op.user_id = outing_reviews.reviewee_id AND op.status='accepted')
```
Le `op.proposal_id = op.proposal_id` dégrade le contrôle en « le noté est participant accepté de **n'importe quelle** sortie ». Comme les avis sont **publics et nominatifs**, ça ouvre un vecteur de harcèlement.

**Correctif** : **Migration `092_fix_outing_reviews_insert.sql`** — recréer la policy à l'identique en qualifiant le seul terme cassé (`op.proposal_id = outing_reviews.proposal_id`). Reproduire **exactement** la policy existante (les autres branches sont correctes), seule cette ligne change :
```sql
drop policy if exists outing_reviews_insert_member on public.outing_reviews;
create policy outing_reviews_insert_member on public.outing_reviews
  for insert to authenticated
  with check (
    reviewer_id = (select auth.uid())
    and reviewer_id <> reviewee_id
    and exists (
      select 1 from public.outing_proposals p
      where p.id = outing_reviews.proposal_id
        and p.planned_at < now()
        and (
          p.host_id = (select auth.uid())
          or exists (
            select 1 from public.outing_participants op
            where op.proposal_id = p.id and op.user_id = (select auth.uid()) and op.status = 'accepted'
          )
        )
    )
    and (
      exists (
        select 1 from public.outing_proposals p
        where p.id = outing_reviews.proposal_id and p.host_id = outing_reviews.reviewee_id
      )
      or exists (
        select 1 from public.outing_participants op
        where op.proposal_id = outing_reviews.proposal_id   -- ← le fix
          and op.user_id = outing_reviews.reviewee_id and op.status = 'accepted'
      )
    )
  );
```

**Critères d'acceptation** : impossible d'insérer un avis ciblant quelqu'un qui n'était pas membre (hôte/accepté) de **cette** sortie ; le cas légitime (noter un coéquipier de sa propre sortie passée) marche toujours. Test RLS (membre OK, non-membre rejeté 0 ligne).

**Dépendances** : aucune. **Fichiers** : `supabase/migrations/092_*.sql`, test RLS `lib/cofishing/__tests__` (ou e2e SQL).

---

## WS-D — Empêcher l'auto-confirmation de son propre spot 🟡→🔴(intégrité)

**Problème** : `confirmSpot` (`app/actions/spots.ts:228`) upsert `{spot_id, user_id}` (`:240`) sans exclure `created_by`. La policy `spot_confirmations_insert_own` ne teste que `user_id = auth.uid()` (vérifié). Un créateur peut gonfler « K pêcheurs confirment cette position » de +1 (lui-même).

**Correctif (2 couches)** :
1. **Garde serveur** dans `confirmSpot` : avant l'upsert, lire `spots.created_by` du spot ; si `=== user.id` → `return fail('Tu ne peux pas confirmer ton propre spot.')`.
2. **Migration `093_spot_confirmations_no_self.sql`** (backstop RLS) :
   ```sql
   drop policy if exists spot_confirmations_insert_own on public.spot_confirmations;
   create policy spot_confirmations_insert_own on public.spot_confirmations
     for insert to authenticated
     with check (
       user_id = (select auth.uid())
       and not exists (
         select 1 from public.spots s
         where s.id = spot_id and s.created_by = (select auth.uid())
       )
     );
   ```

**Critères d'acceptation** : le créateur d'un spot communautaire ne peut pas le confirmer (erreur claire côté UI + rejet RLS) ; un autre user le peut. Test action + test RLS.

**Dépendances** : aucune. **Fichiers** : `app/actions/spots.ts`, `supabase/migrations/093_*.sql`, tests. **Note** : ce fix débloque la décision « câbler les niveaux `communaute`/`ambassadeur` » du Sprint 53 (compteur non gameable).

---

## WS-E — Push honnête : ne plus afficher « Activé » à qui ne reçoit rien 🟡

**Problème** :
- **A1** : `NotificationTypeToggles.tsx:96` rend les 6 toggles à tous, sans test de tier. Or `optimal_window` est **payant** (cron gate `current_tier ∈ {local,itinerant}`). Un gratuit voit « Fenêtre optimale : Activé » et ne reçoit rien.
- **A4** : `PushSettingsToggle.tsx:24-31` (« Alertes « fenêtre optimale » … Réservé aux abonnés Local et Itinérant ») est désormais l'**interrupteur maître** des 6 types (dont 3 gratuits) → un gratuit lit « réservé aux abonnés » et n'active pas le push, perdant les notifs gratuites.

**Correctif** :
1. Passer le **tier courant** (`current_tier`) au composant des toggles. Pour `optimal_window` chez un non-abonné : soit masquer le toggle, soit l'afficher **désactivé** avec un libellé « Réservé aux abonnés » + lien `/tarifs`. Les 5 autres types restent actifs pour tous.
2. Reformuler `PushSettingsToggle` en **interrupteur global** honnête : « Notifications push — interrupteur principal. S'il est éteint, aucune alerte n'arrive. » Retirer la mention « réservé aux abonnés » du maître (elle migre sur le seul `optimal_window`).

**Critères d'acceptation** : un compte **gratuit** ne voit jamais « fenêtre optimale : Activé » comme reçu effectif ; il comprend que le push global lui apporte bien les alertes gratuites (grande marée, prise d'un suivi, fermeture, digest, sortie proche). Vérif live desktop avec un compte non-abonné (ou mock du tier).

**Dépendances** : lit `current_tier` (déjà dispo). **Fichiers** : `components/notifications/NotificationTypeToggles.tsx`, `components/notifications/PushSettingsToggle.tsx`, `app/(app)/notifications/page.tsx` (passe le tier), `app/(app)/carnet/page.tsx` + `home` si le résumé « Alertes activées » y est rendu.

---

## WS-F — Libellés & routage des notifs système 🟡

**Problème** : `describe()` (`app/(app)/notifications/page.tsx:21-57`) n'a pas de `case` pour les 5 types ajoutés au sprint 49/50 → tous tombent sur `default` = « **Un pêcheur a interagi avec toi** » (faux pour les notifs système sans acteur ; **confirmé live** sur un `weekly_digest`). Et `hrefFor()` (`:103-127`) route ces types vers `/fil` au lieu de leur vraie page.

**Correctif** :
1. **Vérifier d'abord** que `AppNotification['type']` (type TS, `app/actions/notifications.ts` / `lib/types.ts`) inclut bien : `big_tide`, `species_closure`, `weekly_digest`, `followed_catch`, `nearby_outing` (migration 085 les a créés en base). Sinon, étendre le type.
2. Ajouter les `case` dans `describe()` (icônes Lucide ; importer `Waves`) :
   ```ts
   case 'big_tide':       return { icon: Waves,        label: 'Grande marée à venir près de chez toi' }
   case 'species_closure':return { icon: Fish,         label: 'Rappel réglementation : période de fermeture' }
   case 'weekly_digest':  return { icon: Sparkles,     label: 'Ta semaine de pêche' }
   case 'followed_catch': return { icon: Fish,         label: `${who} a publié une prise` }
   case 'nearby_outing':  return { icon: Users,        label: 'Nouvelle sortie près de chez toi' }
   ```
3. Ajouter le routage dans `hrefFor()` (avant le `return '/fil'` final) :
   ```ts
   if (n.type === 'big_tide') return '/carte'
   if (n.type === 'weekly_digest') return '/home'
   if (n.type === 'nearby_outing') return '/sorties'
   if (n.type === 'followed_catch') return n.actor_username ? `/u/${n.actor_username}` : '/fil'
   if (n.type === 'species_closure') return '/especes'  // ou /especes/<slug> si le slug est porté par la notif (vérifier le payload du cron species-closure)
   ```
   → **vérifier** le payload réel inséré par `lib/notifications/species-closure.ts` (slug d'espèce dans `target_id` ?) pour router vers la fiche si possible.

**Critères d'acceptation** : aucune notif ne dit plus « Un pêcheur a interagi avec toi » à tort ; chaque type a une icône cohérente et un clic in-app qui mène à la même destination que l'URL du push. Vérif live sur la page `/notifications`.

**Dépendances** : aucune (complète A1/A4 de WS-E mais indépendant). **Fichiers** : `app/(app)/notifications/page.tsx`, éventuellement `app/actions/notifications.ts` / `lib/types.ts`.

---

## WS-G — Vérification (obligatoire, en dernier) ✅

1. **Migrations** appliquées (091, 092, 093) + **regen `lib/types.ts`** (`pnpm dlx supabase gen types …`).
2. **Tests ciblés ajoutés et verts** : Stripe (`paused` upsert OK ; renouvellement = pas de double conversion/email) ; RLS reviews (membre/non-membre) ; anti auto-confirm (créateur rejeté) ; smoke describe()/hrefFor() pour les 5 nouveaux types.
3. **`/verif-sprint`** : suite Vitest complète verte, `pnpm build` OK, lint + types OK.
4. **Passe anti-régression** (agent indépendant) : aucune fuite GPS introduite, gating de tier intact, RLS des autres tables inchangée, webhook Stripe toujours signé/idempotent, copy sans tiret cadratin.
5. **QA live ciblée** (desktop) : `/notifications` (libellés + réglages honnêtes), et si possible un event Stripe `paused` en mode test → 200.
6. **NE PAS PUSH** : laisser à John (commits prêts, résumé « fait / à tester / migrations à appliquer en prod »).

---

## Récap migrations & décisions

| Migration | Objet |
|---|---|
| `091_subscriptions_status_paused.sql` | + `paused` au CHECK statut (WS-A) |
| `092_fix_outing_reviews_insert.sql` | corrige la tautologie RLS (WS-C) |
| `093_spot_confirmations_no_self.sql` | interdit l'auto-confirmation (WS-D) |

**Décisions ouvertes (mineures)** :
1. **WS-B** : email `PaymentSuccessEmail` à chaque renouvellement (reçu) ou seulement à la 1re facture (conversion) ? *Reco : 1re facture seulement* (Stripe envoie déjà les reçus).
2. **WS-E** : pour `optimal_window` chez un gratuit → **masquer** le toggle ou l'afficher **désactivé + upsell** ? *Reco : désactivé + lien `/tarifs`* (pédagogique).
3. **WS-F** : router `species_closure` vers `/especes/<slug>` (si le slug est porté) ou `/especes` ? *Reco : la fiche si dispo.*

**Parallélisme** : WS-A, B, C, D, E, F sont **tous indépendants** (objets/fichiers disjoints) → 6 agents en parallèle, puis WS-G en barrière finale. Effort total ~2-3 j.

---

*Brief Sprint 51 rédigé le 2026-06-29. Vérifié contre HEAD `7c23f5c` et la base live (CHECK statut, policies RLS, code events/notifs/spots). Prochain : Sprint 52 sur demande.*
