# Comptes test multi-tiers

> But : avoir un compte par niveau d'abonnement (4 au total) pour tester chaque parcours utilisateur. Réutilisable pour QA manuelle, Claude in Chrome, démos.
>
> **Tant que Stripe n'est pas branché (sprint 9)**, on simule les abonnements en insérant des rows dans la table `subscriptions` via SQL. Quand Stripe sera là, on créera les comptes via le Checkout normal.

---

## Convention de nommage

On utilise **les alias `+`** sur ta boîte Gmail principale (`redkps4@gmail.com`). Tous les emails de confirmation arrivent dans la même inbox, et chaque alias est un email Supabase distinct.

| Tier | Email | Rôle de test |
|---|---|---|
| Anonyme | (pas de compte) | Incognito, parcours visiteur |
| Discovery | `redkps4+discovery@gmail.com` | Compte gratuit, onboardé, sans abonnement |
| Local | `redkps4+local@gmail.com` | Abonnement Local actif (4,90 €/mois) |
| Itinérant | `redkps4+itinerant@gmail.com` | Abonnement Itinérant actif (9,90 €/mois) |

**Password commun** pour tous les comptes test : `CarnetTest2026!`

> Si ton policy de password Supabase exige plus, monte à `CarnetTest2026!@Long` ou un truc équivalent. Note la valeur exacte ici si tu changes.

**Si tu préfères Outlook** : remplace `redkps4@gmail.com` par `john.s.campbell@outlook.com` partout dans ce doc. Le `+alias` marche aussi sur Outlook.

---

## Étape 1 — Créer les 3 comptes (signup classique)

Pour chacun des 3 emails (`+discovery`, `+local`, `+itinerant`) :

### A. Signup

1. Va sur `https://carnet-de-peche.vercel.app/auth/login` (ou `http://localhost:3000/auth/login` si tu testes en local)
2. Onglet **Inscription**
3. Email : `redkps4+discovery@gmail.com` (ou +local, +itinerant)
4. Password : `CarnetTest2026!`
5. Submit
6. Email de confirmation arrive dans `redkps4@gmail.com` → ouvre le mail → clique le lien
7. Tu es redirigé sur `/onboarding`

### B. Onboarding rapide

Remplis les 6 étapes en cohérence avec le rôle du compte :

| Champ | Valeur recommandée |
|---|---|
| Pseudo | `test-discovery` (ou `test-local`, `test-itinerant`) |
| Ville | `Brest` |
| Département principal | `29` (Finistère) |
| Techniques | `Leurres`, `Surfcasting` |
| Espèces favorites | `Bar`, `Lieu jaune` |
| Niveau | `Intermédiaire` |
| Fréquence | `Hebdomadaire` |
| Années de pratique | `5` |

> Pour le compte Itinérant, mets le département `83` (Var) pour pouvoir tester un dépt côté Méditerranée. Ou laisse `29`, ton choix.

### C. Note l'UUID de chaque compte

Une fois logué (n'importe quelle page de l'app), va dans **Supabase Studio → Table Editor → profiles** et copie l'`id` de chaque profile. Tu en auras besoin pour le SQL ci-dessous.

Pour t'aider :

```sql
-- À lancer dans Supabase SQL Editor
select id, username, department, onboarded
from public.profiles
where username in ('test-discovery', 'test-local', 'test-itinerant');
```

Garde le résultat sous la main.

---

## Étape 2 — Activer les abonnements (SQL)

Une fois les 3 comptes créés et onboardés, lance ce SQL dans **Supabase Studio → SQL Editor**. Remplace `'<UUID_LOCAL>'` et `'<UUID_ITINERANT>'` par les vrais UUIDs obtenus à l'étape 1C.

```sql
-- ─── Compte LOCAL ─────────────────────────────────────────────────────────────
insert into public.subscriptions (
  user_id,
  plan,
  status,
  current_period_start,
  current_period_end,
  cancel_at_period_end
)
values (
  '<UUID_LOCAL>'::uuid,
  'local',
  'active',
  now(),
  now() + interval '30 days',
  false
)
on conflict (user_id) do update set
  plan = excluded.plan,
  status = excluded.status,
  current_period_start = excluded.current_period_start,
  current_period_end = excluded.current_period_end,
  cancel_at_period_end = excluded.cancel_at_period_end;

-- ─── Compte ITINÉRANT ─────────────────────────────────────────────────────────
insert into public.subscriptions (
  user_id,
  plan,
  status,
  current_period_start,
  current_period_end,
  cancel_at_period_end
)
values (
  '<UUID_ITINERANT>'::uuid,
  'itinerant',
  'active',
  now(),
  now() + interval '30 days',
  false
)
on conflict (user_id) do update set
  plan = excluded.plan,
  status = excluded.status,
  current_period_start = excluded.current_period_start,
  current_period_end = excluded.current_period_end,
  cancel_at_period_end = excluded.cancel_at_period_end;

-- ─── Vérification ─────────────────────────────────────────────────────────────
select
  p.username,
  s.plan,
  s.status,
  s.current_period_end,
  public.has_active_subscription(p.id) as has_active
from public.profiles p
left join public.subscriptions s on s.user_id = p.id
where p.username in ('test-discovery', 'test-local', 'test-itinerant')
order by p.username;
```

> **Note sur le schéma de `subscriptions`** : adapte les noms de colonnes si ton schéma diffère (CLAUDE.md mentionne `subscriptions` mais pas la liste exacte des colonnes). Si Claude Code/Supabase râle au insert, lance d'abord `\d public.subscriptions` pour voir les colonnes exactes et adapte.

Résultat attendu de la query de vérification :

| username | plan | status | current_period_end | has_active |
|---|---|---|---|---|
| test-discovery | (null) | (null) | (null) | false |
| test-local | local | active | (dans 30 jours) | true |
| test-itinerant | itinerant | active | (dans 30 jours) | true |

---

## Étape 3 — Vérifier que chaque tier voit la bonne carte

Pour chaque compte, va sur `/carte` après login et vérifie :

| Compte | Comportement attendu |
|---|---|
| Incognito (anonyme) | Carte avec ~3 spots/département floutés + CTA register |
| test-discovery | Idem anonyme + bandeau upsell "Passe Local" |
| test-local | Tous les spots du Finistère (29) avec coords précises + filtres actifs + pas de bandeau |
| test-itinerant | Tous les spots de tous les départements côtiers + dropdown département + pas de bandeau |

Si un compte ne se comporte pas comme attendu :
- Le tier est mal calculé : check la query `has_active_subscription` dans Supabase
- Le tier est correct mais la carte affiche mal : régression du sprint 4 → ouvrir issue / fix

---

## Étape 4 — (Optionnel) Compte avec catches loguées

Pour tester :
- Stats du carnet enrichies
- Section "Prises récentes" sur les fiches spots
- Futur scoring personnalisé (sprint 7) qui aura besoin d'historique

→ Logue 5-10 prises sur le compte `test-local` (depuis `/carnet/nouvelle`), variées : différentes espèces, techniques, dates étalées sur les 30 derniers jours, certaines publiques (privacy=public).

---

## Étape 5 — Cleanup avant prod

Avant de lancer en beta publique (sprint 11) :

1. **Soit tu gardes les comptes test** comme comptes "fonctionnaires" non visibles dans le fil régional (filtrer sur usernames `test-*`)
2. **Soit tu les supprimes** :
   ```sql
   -- DANGEREUX : supprime les comptes test ET leurs catches/posts/etc.
   delete from auth.users
   where email in (
     'redkps4+discovery@gmail.com',
     'redkps4+local@gmail.com',
     'redkps4+itinerant@gmail.com'
   );
   ```
   Le ON DELETE CASCADE devrait nettoyer profiles, subscriptions, catches, etc.

---

## Prompt Claude in Chrome mis à jour

Voilà le bloc à coller dans Claude in Chrome pour tester les 4 tiers en un seul run. Remplace `[URL_DE_BASE]` (localhost:3000 ou Vercel) avant de coller.

```
Tu vas tester le site Carnet de Pêche end-to-end sur les 4 tiers d'utilisateur. Tu rapportes à la fin un récap PASS/FAIL/WARN/SKIP structuré.

Setup :
- URL de base : [URL_DE_BASE]
- Comptes test (tous avec password CarnetTest2026!) :
  * Anonyme : pas de login
  * Discovery : redkps4+discovery@gmail.com
  * Local : redkps4+local@gmail.com
  * Itinérant : redkps4+itinerant@gmail.com
- Ouvre une fenêtre incognito + 3 fenêtres normales (1 par compte connecté), OU fais les scénarios séquentiellement en te déconnectant entre chaque
- Garde console DevTools et Network ouverts

═══════════════════════════════════════════════════════════════════
SCÉNARIO A — Anonyme (incognito, sans login)
═══════════════════════════════════════════════════════════════════

1. / : homepage charge, CTAs visibles, pas d'erreur console
2. /auth/login : tabs Connexion/Inscription visibles, Google OAuth actif, Apple grisé
3. /carte : carte MapLibre se charge, ~3 spots/dépt en cercles floutés, CTA register visible
4. Click un marker : popup s'ouvre, message "Coords précises réservées..." visible, CTA register
5. /spots index : liste groupée par dépt, badges espèces
6. /spots/{slug} (n'importe quel slug) : fiche complète, conditions du jour visibles, section Meilleurs moments visible (si sprint 6 deployed), CTA "Logger une prise" → /auth/login
7. Tentative /carnet sans login : redirect /auth/login

═══════════════════════════════════════════════════════════════════
SCÉNARIO B — Discovery (login redkps4+discovery@gmail.com)
═══════════════════════════════════════════════════════════════════

8. /auth/login + login password → redirect /home (ou /carnet)
9. /carte : ~3 spots/dépt floutés + bandeau upsell "Passe Local" visible en bas
10. Filtres MapFilters : visibles mais grisés (opacity 50%), tap = no-op, tooltip upsell
11. Click "Spots autour de moi" : max 5 résultats + bandeau upsell en bas de liste
12. Click marker : popup affiche infos limitées + CTA upsell
13. /carnet : page carnet accessible, vide ou avec qq prises
14. /carnet/nouvelle : form complet fonctionnel (test rapide création prise sans submit)

═══════════════════════════════════════════════════════════════════
SCÉNARIO C — Local (login redkps4+local@gmail.com)
═══════════════════════════════════════════════════════════════════

15. /carte : tous les spots du Finistère (29), coords précises (markers nets), filtres actifs
16. Sélectionne filter "bar" → URL update, count update, markers filtrés
17. Refresh : filtres persistent (URL + localStorage)
18. "Spots autour de moi" : jusqu'à 20 résultats
19. /spots/{slug d'un spot du 29} : carte mini avec marker précis, conditions du jour, calendrier 7j (si sprint 6 deployed), prises récentes
20. Click "Logger une prise ici" → /carnet/nouvelle?spot_id=xxx, form prérempli avec bandeau spot

═══════════════════════════════════════════════════════════════════
SCÉNARIO D — Itinérant (login redkps4+itinerant@gmail.com)
═══════════════════════════════════════════════════════════════════

21. /carte : spots de tous les départements côtiers, dropdown département actif
22. Change dépt vers 83 (Var) : carte recentrée, spots Var visibles
23. "Spots autour de moi" : jusqu'à 50 résultats
24. /spots/{slug Var} : carte mini précise, conditions cohérentes

═══════════════════════════════════════════════════════════════════
SCÉNARIO E — Régressions sprint 4 et antérieures
═══════════════════════════════════════════════════════════════════

25. /tarifs : tarifs cohérents avec CLAUDE.md (4,90 €/9,90 €)
26. /guides : liste des guides
27. /guides/{un guide} : MDX render OK
28. /profil (loggé en local) : infos affichées
29. /carnet/nouvelle : crée une prise réelle au surfcasting + appât "vers de mer" → submit → fiche détail affiche "Appât : vers de mer" + AUCUNE ligne "Leurre" (bug fix sprint 3.5)
30. Édite la prise, change technique pour "Leurres", marque "TestBrand" → save → AUCUNE ligne "Appât" sur la fiche détail (bug fix sprint 3.5)
31. Supprime la prise test

═══════════════════════════════════════════════════════════════════
MOBILE (DevTools iPhone 14 Pro Max)
═══════════════════════════════════════════════════════════════════

32. Refais scénarios B, C en mode mobile
33. Carte fullscreen, FAB stack en bas, sheets glissent fluide
34. Drag handle sur sheets responsive
35. Flèche retour visible sur /carnet, /carnet/nouvelle

═══════════════════════════════════════════════════════════════════
RAPPORT FINAL
═══════════════════════════════════════════════════════════════════

Structure ton rapport :

✅ PASS — étapes qui passent (numéros uniquement, ex: "1, 2, 3, 5-10")
❌ FAIL — pour chaque échec :
   - Numéro
   - Ce qui a planté concrètement
   - URL au moment
   - Screenshot
   - Erreurs console / network pertinentes
⚠️ WARN — choses bizarres mais pas bloquantes :
   - Layout cassé breakpoint X
   - FOUC, animations cassées, contraste
   - Warnings console répétés
🚫 SKIP — étapes non testables (et pourquoi) :
   - Email verification (pas accès Gmail)
   - Stripe (pas branché)
   - OAuth Google complet (anti-bot)

Ressenti UX mobile (3 phrases max).
Ressenti UX desktop (3 phrases max).
Verdict global : "ready to push" / "à corriger d'abord" / "go fix critical X then push".
```

---

## Sécurité / hygiène

- Le password `CarnetTest2026!` est OK pour les comptes test sur un repo privé. Si tu rends le repo public un jour, change-le ET ce doc.
- Les UUIDs des comptes test ne sont pas sensibles en soi, mais ne les partage pas dans un canal public.
- Si tu remarques qu'un compte test apparaît dans le fil régional / les classements en beta publique, filtre les usernames `test-*` côté requêtes ou supprime les comptes avant lancement.
- Pour soft-tester avec un humain réel non technique : créer un 5ème compte `redkps4+beta-user@gmail.com` sans connaissance interne, lui faire faire un parcours libre. Très utile sprint 11 (beta privée).
