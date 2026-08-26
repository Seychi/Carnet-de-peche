# Sprint 90 — Brief d'exécution
## « L'app qu'on a déjà » — l'installation sur iPhone, le push qui arrive, et le carnet qui marche sans réseau

> Rédigé le 2026-08-26. Durée : ~1,5 semaine.
> Contexte : `docs/roadmaps/ROADMAP-MOBILE-2026-07-02.md` (phase native — gate NON franchi), `docs/sprint-88/BRIEF.md` et `docs/sprint-89/BRIEF.md` (discipline « lire avant d'écrire »), `components/pwa/PwaProvider.tsx` (PWA sprint 11, correctifs S88), `components/push/use-push-subscription.ts` (Web Push S39).
>
> **Décisions John 2026-08-26 (verrouillées)** :
> 1. **On ne démarre PAS la phase native.** M1 (monorepo Turborepo) est reporté. Le gate de la roadmap mobile n'est pas franchi (diagnostic 05/08 : 9 inscrits en 60 j, 2/20 codes fondateurs, 0 revenu après J+1) et sortir deux apps natives dans un fil désert, face à Fishing Grid déjà natif ET gratuit, se paie en avis 1★ pour deux fronts à maintenir.
> 2. **On finit la PWA à la place.** Coût : 0 €, aucun compte développeur, aucune review, aucun monorepo. Le code de la file offline (Bloc 3) part tel quel dans `packages/shared` le jour de M1 — rien n'est jeté.
> 3. **Le DUNS est lancé en parallèle** (lane admin §2 de la roadmap mobile). C'est gratuit, ça prend 2 à 4 semaines (jusqu'à 30 j côté Google), c'est le chemin critique calendaire des comptes org. Hors périmètre de ce sprint, mais l'horloge tourne.

**Préalable avant de démarrer** (manuel John) :

- `main` à jour et déployé (dernier connu : `e8a1787`).
- `NEXT_PUBLIC_VAPID_PUBLIC_KEY` confirmée présente en prod — sans elle `usePushSubscription` rend `'unavailable'` et le Bloc 2 n'est pas testable.
- Un iPhone **et** un Android physiques disponibles pour la QA. Les Blocs 1 et 3 ne sont **pas** vérifiables en émulateur : « Ajouter à l'écran d'accueil » et le vrai mode avion sont des gestes physiques.

---

## 🚀 Ligne de lancement (à copier-coller par John)

> ultracode — effort xhigh. Exécute `docs/sprint-90/BRIEF.md`. Lance les workstreams
> A/B/D en parallèle dès maintenant, respecte les dépendances du tableau, et termine
> par le workstream VERIF avant de me rendre la main. Le Bloc 3 touche à l'XP et à
> l'anti-triche : ancre le schéma via supabase-guard AVANT de coder, et n'ouvre
> jamais `105_xp_integrity.sql`. Ne push pas.

---

## 🧠 Connecteurs & sous-agents (usage systématique — cf `CLAUDE.md` §20)

| Quand | Sous-agent → connecteur | Pourquoi |
|---|---|---|
| Avant toute API navigateur récente (IndexedDB, `navigator.storage.persist()`, Web Push, `display-mode`) et avant d'ajouter `idb` | **docs-researcher** → Context7 + MDN | Le support WebKit bouge ; ne rien coder de mémoire, surtout sur iOS. |
| Bloc 0 (baseline) et Bloc 3 (migration 114) | **supabase-guard** → Supabase (RO) | Lire le schéma live de `catches` et de `push_subs` AVANT. Vérifier que `114` est bien libre côté base (113 est le dernier sur disque, vérifié le 26/08). Migration = **nouveau fichier numéroté**, jamais un fichier existant modifié. Regen `lib/types.ts`. `get_advisors` après application. |
| Bloc 0 (part iOS, sessions standalone, funnel) | **PostHog** | La baseline est chiffrée, pas estimée. |
| QA des Blocs 1, 2, 4 | **qa-chrome** → Claude in Chrome + Playwright | Captures, console, non-régression Android. ⚠️ Ne remplace PAS la QA sur appareil réel (cf Préalable). |
| Après déploiement | **deploy-watch** → Vercel + Sentry | Le SW et l'IndexedDB sont des sources classiques d'erreurs runtime silencieuses. |
| Clôture | **`/verif-sprint`** | Tests + build + typecheck + lint + revue croisée indépendante. |

---

## Objectif du sprint en une phrase

Qu'un pêcheur sur iPhone puisse **installer** Carnet de Pêche, **recevoir** ses alertes de marée, et **loguer une prise complète, photo comprise, sans une barre de réseau** — sans qu'on ait ouvert un seul compte développeur.

## Ce que ce sprint ne fait PAS

- Pas de monorepo, pas d'Expo, pas de React Native, pas de compte store.
- **Pas de Background Sync.** WebKit ne l'a jamais implémenté (ni Background Sync, ni Periodic Background Sync, ni Background Fetch). Écrire un handler `sync` dans le SW ne servirait que sur Android et créerait deux chemins de code divergents pour la même fonctionnalité. Le rejeu est en **premier plan**, point.
- **On ne touche NI à `is_competitive_catch` (migration 105), NI aux constantes de rate-limit de `createCatch`, NI à la RLS.** C'est l'anti-triche du sprint 69 : il est intouchable dans ce sprint.

---

## Workstreams & dépendances

| WS | Bloc(s) | Durée | Dépend de | Parallélisable jour 1 |
|----|---------|-------|-----------|----------------------|
| A | Bloc 0 — baseline | 0,5 j | — | ✅ |
| B | Bloc 1 — installation iOS | 1,5 j | — | ✅ |
| C | Bloc 2 — push qui arrive | 0,5 j | B (la feuille d'installation) | ❌ |
| D | Bloc 3 — file offline | 3-4 j | — | ✅ |
| E | Bloc 4 — page offline honnête | 0,5 j | D (la promesse doit être vraie) | ❌ |
| VERIF | revue finale | 0,5 j | tous | ❌ (toujours en dernier) |

---

## Bloc 0 — La mesure d'avant (WS A)

Sprint 89 a posé la règle : on lit avant d'écrire. Ce bloc ne change **aucun** comportement produit, il pose les chiffres contre lesquels on jugera le sprint. Sans lui, « la PWA marche mieux » restera une impression.

> **Connecteurs** : **PostHog** pour les sessions, **supabase-guard** (RO) pour les abonnés push et les prises. Aucune écriture.

### Tâches

1. Relever sur 30 jours glissants : part iOS / Android / desktop des sessions ; nombre de sessions lancées en `display-mode: standalone` (si l'événement n'existe pas, le noter comme **non mesurable aujourd'hui** — c'est une conclusion valable, pas un échec).
2. Compter les abonnements Web Push existants, ventilés par plateforme d'endpoint (Apple `web.push.apple.com` vs FCM). **Hypothèse à confirmer ou infirmer par la donnée : zéro abonné iOS.**
3. Compter les prises créées / 7 j et / 30 j, et la distribution du nombre de prises par utilisateur et par jour (sert à calibrer le débat rate-limit du Bloc 3).
4. Écrire `docs/sprint-90/BASELINE.md` : un chiffre par ligne, avec la requête SQL ou la requête PostHog qui l'a produit, et la date du relevé.

### Critères d'acceptation

- `docs/sprint-90/BASELINE.md` existe ; **chaque** chiffre est accompagné de sa source reproductible.
- Aucun fichier applicatif modifié par ce bloc (`git diff --stat` ne montre que `docs/`).

### Garde-fous

- Ne pas « estimer » un chiffre manquant. Une case vide marquée *non mesurable* vaut mieux qu'un nombre inventé.

---

## Bloc 1 — Le chemin d'installation sur iOS (WS B)

**Le trou.** `components/pwa/PwaProvider.tsx` se termine par `if (!showBanner || !installEvent) return null`, et `installEvent` n'est alimenté que par l'écouteur `beforeinstallprompt`. **WebKit n'émet jamais cet événement et n'a aucun équivalent.** Sur iPhone, la bannière d'installation ne s'affiche donc jamais : « installer l'app » n'existe tout simplement pas. 82 % du trafic est mobile (GSC 90 j, cf S75) — c'est une fonctionnalité morte sur une part majeure de l'audience, et c'est le préalable de tout le reste (le push iOS en dépend, cf Bloc 2).

> **Connecteurs** : **docs-researcher** avant de coder la détection de plateforme (User-Agent iPadOS, `navigator.standalone`, `display-mode: standalone`) — cette détection est un nid à faux positifs. **qa-chrome** pour la non-régression Android.

### Tâches

1. **Dédupliquer la détection.** Elle existe déjà, en double, dans `components/push/use-push-subscription.ts` (fonction `detectSupport`, qui gère correctement l'iPadOS déguisé en Mac via `maxTouchPoints`). Extraire vers `lib/pwa/platform.ts` : `detectPlatform(): { isIOS: boolean; isStandalone: boolean; iosBrowser: 'safari' | 'other' }`. `PwaProvider.tsx` **et** `use-push-subscription.ts` l'importent. Pas de troisième copie.
2. **Branche iOS dans `PwaProvider.tsx`.** Mêmes règles que la branche Android — 2ᵉ session, dismissable, mêmes clés `cdp-session-count` / `cdp-install-dismissed`, mêmes `safeGet`/`safeSet` de `lib/storage/safe.ts` — mais au lieu d'appeler `prompt()`, ouvrir une feuille.
3. **`components/pwa/IosInstallSheet.tsx`** (nouveau) : trois étapes illustrées — Partager → « Sur l'écran d'accueil » → Ajouter — en tutoiement, avec l'icône Partager d'iOS reproduite (pas une capture d'écran d'iOS : elle vieillira). Fermable, jamais bloquante.
4. **Chrome / Firefox / Edge sur iOS ne peuvent pas installer.** Détecter (`CriOS`, `FxiOS`, `EdgiOS` dans l'UA) et afficher « ouvre cette page dans Safari pour l'installer » — surtout pas des instructions Partager qui ne mèneront à rien.
5. **Page permanente `/app`** dans le groupe `(marketing)`, indexable : ce que l'installation apporte concrètement (les marées à un tap, les alertes, le log sans réseau), instructions iOS **et** Android, lien depuis le footer. ➜ Cette page resservira telle quelle en M14 §7.5 de la roadmap mobile pour héberger les liens stores.
6. **Mesure** : événements PostHog `pwa_install_sheet_shown`, `pwa_install_sheet_dismissed`, et `pwa_installed` (émis au premier lancement détecté en standalone) — avec la plateforme en propriété. C'est ce qui rendra le Bloc 0 comparable dans un mois.

### Critères d'acceptation

- Sur **iPhone Safari réel**, 2ᵉ session : la feuille apparaît, les trois étapes correspondent à l'iOS courant, l'ajout à l'écran d'accueil fonctionne, et le relancement depuis l'icône s'ouvre **sans la barre d'URL Safari** (donc bien en standalone).
- Sur **Chrome iOS** : message « ouvre dans Safari », et aucune instruction Partager affichée.
- Sur **Android Chrome** : comportement strictement **inchangé** (`beforeinstallprompt`, bouton « Installer », mêmes clés de stockage). Non-régression explicite à démontrer.
- **Stockage refusé** (Safari mode strict) : aucune exception levée, la feuille ne s'affiche simplement pas. Le garde-fou du sprint 88 — poser l'`addEventListener` **avant** toute lecture de stockage — reste vrai dans la nouvelle branche.
- `/app` répond 200, est dans le sitemap, et sa copie ne promet rien que le produit ne fasse.

### Garde-fous

- La feuille ne devient jamais une modale bloquante, et ne se re-propose pas après un refus.
- Ne pas toucher au cycle d'enregistrement du service worker ni au toast de mise à jour (bloc du haut de `PwaProvider.tsx`) : il a déjà été durci au S88, avec un `.catch()` silencieux **volontaire** dont le commentaire explique les six issues Sentry qu'il ferme. Ne pas « corriger » ce silence.

---

## Bloc 2 — Le push qui arrive vraiment sur iPhone (WS C — dépend du Bloc 1)

`use-push-subscription.ts` rend déjà l'état `'ios-needs-pwa'`, et `EnablePushAlerts.tsx` affiche « installe l'app sur ton écran d'accueil ». Le diagnostic est donc **déjà juste dans le code** — mais c'est un cul-de-sac : ni bouton, ni instructions. Or sur iOS le Web Push n'existe **que** pour une PWA ajoutée à l'écran d'accueil. Conséquence directe : les alertes spot favori (migration `106_favorite_spots_alerts.sql`) et grosses marées (`111_j2_nudge_and_big_tide_alerts.sql`) — l'argument n°1 qui justifiait le push natif — ne sonnent chez **aucun** utilisateur iPhone. Le tuyau `lib/push/send.ts` est prêt, il est bouché en amont.

> **Connecteurs** : **supabase-guard** pour vérifier ce que contient réellement la table des abonnements avant/après. **qa-chrome** pour la non-régression Android.

### Tâches

1. `components/push/EnablePushAlerts.tsx`, branche `ios-needs-pwa` : remplacer le texte mort par un bouton qui ouvre `IosInstallSheet` (Bloc 1).
2. Faire de même partout ailleurs : chercher **tous** les consommateurs de `usePushSubscription` (au minimum la page de réglages notifications, WS C du sprint 39) et vérifier qu'aucun ne laisse un iPhone sur une impasse.
3. **Le retour.** Une fois installée, l'app repasse en `support: 'supported'`. Vérifier qu'un utilisateur qui installe **depuis cet écran** retrouve bien l'opt-in au lancement suivant — sinon il installe, ne comprend pas qu'il doit revenir, et on a gagné une icône sans gagner une alerte.
4. Ajouter la plateforme en propriété de l'événement `push_subscribed`.

### Critères d'acceptation

- **iPhone réel, bout en bout** : depuis `/carnet` après une première prise → bouton → feuille → installation → relance depuis l'icône → l'opt-in est proposé → autorisation accordée → un push de test envoyé via `lib/push/send.ts` **arrive sur l'écran verrouillé** et ouvre le bon écran au tap.
- Tier gratuit (Découverte) : l'upsell reste un upsell. Aucune promesse d'alerte à quelqu'un que le cron ne notifiera pas — l'honnêteté de tier du sprint 48 reste intacte.
- Android : parcours inchangé.
- `permission: 'denied'` : le message explique comment réactiver, sans re-proposer en boucle (comportement actuel préservé).

### Garde-fous

- La permission n'est demandée **que** sur geste utilisateur, jamais au mount. C'est déjà la règle du hook, elle ne se négocie pas.
- Ne pas modifier le contrat exporté de `usePushSubscription` (`PushSupport`, `UsePushSubscription`) : le commentaire du fichier le déclare stable et il a plusieurs consommateurs.

---

## Bloc 3 — La file offline du log de prise (WS D) ⭐ le cœur du sprint

**Pourquoi.** Loguer au bord de l'eau sans réseau, c'est LA promesse du carnet et l'argument du tier Local. Aujourd'hui c'est impossible : `public/sw.js` ignore volontairement `/api/`, Supabase et tout ce qui n'est pas GET — et il a raison, un service worker n'a pas à rejouer un Server Action. Le manque est côté client.

**État exact avant de coder** (à relire, ne pas supposer) :

- `components/catches/CatchForm.tsx` (~2 041 lignes ; la soumission est autour des lignes 700-800) sauvegarde déjà un brouillon local (`DRAFT_KEY`), purgé au seul succès. Le **texte** survit donc à un échec ; la **photo** non ; et **rien ne repart tout seul**.
- La photo passe par le Server Action `uploadCatchPhoto(FormData)` **avant** l'appel `createCatch({ ...data, photo_path })`. Hors réseau, les deux échouent.
- `lib/catches/actions.ts` / `createCatch` applique un rate-limit (20/24 h, burst 5/h) et appelle en cascade `notifyFollowersOfPublicCatch`, `buildCatchCelebration`, `recomputeSoloChallenges`, `emitDopamineNotifications`, `emitRankChangeNotifications`.
- `safeConditions(lat, lng, datetime)` interroge Open-Meteo **à la date de la prise**, pas à l'instant de l'insertion : une prise rejouée plus tard récupère donc les bonnes conditions. **À confirmer en test**, c'est un pilier du moat.

> **Connecteurs** : **supabase-guard** (RO) pour lire le schéma live de `catches` avant d'écrire la migration — colonnes existantes, index, contraintes miroir du sprint 69. **docs-researcher** avant IndexedDB / `navigator.storage.persist()` / l'ajout éventuel d'`idb`.

### Les cinq contraintes dures (aucune n'est négociable)

1. **Pas de Background Sync sur iOS.** Le rejeu se fait en premier plan : écouteur `online` + tentative à l'ouverture de l'app. Aucun handler `sync` dans `sw.js`.
2. **Fenêtre anti-datage de 48 h.** `is_competitive_catch` (migration 105) : `caught_at ∈ [created_at − 48 h, created_at + 15 min]`. Une prise loguée hors réseau et synchronisée **au-delà** de 48 h reste **entière** dans le carnet, les stats et le scoring perso — elle ne crédite simplement ni XP, ni série, ni défi. C'est le comportement voulu et on n'y touche pas. Mais l'utilisateur doit le **savoir** : au-delà de 36 h en file, la bannière passe en avertissement explicite.
3. **Les rate-limits s'appliquent au rejeu.** Une bonne sortie produit facilement 6 prises ; le burst est à 5/h. Le rejeu envoie **en série** et s'arrête **proprement** sur `CATCH_LIMIT_HOUR_MSG` en reprogrammant plus tard — il ne boucle pas, il ne retente pas en rafale, et il dit à l'utilisateur ce qui se passe.
   > ⚠️ **DEMANDER À JOHN AVANT** : exempter le rejeu offline du **burst 5/h** (jamais du plafond 20/24 h), pour qu'une 6ᵉ prise ne perde pas sa fenêtre de 48 h en attendant son tour.
   > ⚠️ **Piège à connaître avant d'en discuter** : `countCatchesCreatedSince` **ne lit aucune colonne de source**. Il distingue `unitaire` de `bulk` par `technique is not null` / `technique is null` (`lib/catches/actions.ts:130`) — un proxy, pas une donnée. Une prise rejouée depuis la file a une `technique`, elle compte donc comme `unitaire` et prend le burst en pleine face. Exempter le rejeu suppose donc **une vraie colonne de provenance** dans la migration 114, pas un `if`. C'est un arbitrage anti-triche **et** un élargissement de périmètre : décision de John, pas d'agent. **Défaut si John ne tranche pas : on respecte la limite telle quelle et on avertit l'utilisateur.**
4. **Persistance du stockage.** WebKit accorde `navigator.storage.persist()` sur heuristique — dont, explicitement, « le site est ouvert en Home Screen Web App » — et exclut de l'éviction les origines en mode persistant. Appeler `navigator.storage.persist()` à la **première** mise en file et enregistrer le résultat. **Si c'est refusé, l'UI le dit** (« envoie tes prises dès que tu as du réseau ») au lieu de promettre une durabilité qu'on n'a pas. Un carnet de pêche qui perd une prise en silence est pire qu'un carnet qui ne sait pas loguer hors ligne.
5. **Idempotence.** Un Server Action peut réussir côté serveur et perdre sa réponse (c'est déjà arrivé en prod : WAF/challenge Vercel, cf le `catch` commenté dans `CatchForm.tsx`). Sans clé d'idempotence, le rejeu **duplique la prise — donc l'XP, donc le classement**. C'est la faille la plus grave de ce bloc.

### Tâches

1. **Migration `114_catch_client_id.sql`** (numéro à confirmer via supabase-guard, 113 est le dernier sur disque) : colonne `client_id uuid null` sur `catches` + index **unique partiel** `(user_id, client_id) where client_id is not null`. RLS inchangée. Puis regénérer `lib/types.ts`.
2. `lib/catches/schema.ts` : `client_id` optionnel (uuid) dans `createCatchSchema`.
3. `lib/catches/actions.ts` / `createCatch` : si `client_id` est fourni et qu'une prise existe déjà pour ce couple `(user_id, client_id)`, renvoyer l'`id` existant **sans réinsérer**. ⚠️ Un simple `on conflict do nothing` ne suffit pas : il faut **court-circuiter toute la cascade** (XP, célébration, défis, notifications followers, notifications de rang). Un rejeu ne doit produire *aucun* effet de bord une deuxième fois.
4. **`lib/offline/queue.ts`** (nouveau) : IndexedDB, un store `pending_catches`. Une entrée = `{ client_id, input: CreateCatchInput, photo: Blob | null, photoName: string | null, queued_at: number, attempts: number, last_error: string | null }`. API : `enqueue`, `list`, `remove`, `markAttempt`, `clear`. Sans dépendance externe si l'API brute reste lisible ; sinon `idb` (~1 kB) **après passage par docs-researcher**.
5. **`components/catches/CatchForm.tsx`** : à la soumission, si `!navigator.onLine` **ou** si l'upload / `createCatch` échoue pour une raison **réseau**, générer `crypto.randomUUID()`, mettre en file, purger le brouillon, afficher « Prise enregistrée. Elle part dès que tu as du réseau. », router vers `/carnet`.
   ⚠️ **Distinguer erreur réseau et erreur métier.** Une erreur de validation, un `Non authentifié`, un dépassement de rate-limit, un `MEASURED_PHOTO_MSG` ne se mettent **jamais** en file : ils se rejoueraient à l'identique et échoueraient à l'identique, pour l'éternité.
6. **`lib/offline/replay.ts`** + **`components/offline/PendingCatchesBanner.tsx`** : rejeu séquentiel (upload photo → `createCatch` avec `client_id` → `remove`), déclenché sur l'événement `online` et à l'ouverture de l'app. Bannière : « N prise(s) en attente », avertissement au-delà de 36 h en file, bouton « Réessayer », et un chemin pour consulter ou supprimer une entrée définitivement bloquée (sinon on crée une file fantôme que l'utilisateur ne peut pas vider).
7. **`/carnet`** : afficher les prises en attente en tête de liste, visuellement distinctes (« en attente d'envoi »), et **jamais** comptées dans les stats, les records ou l'XP tant qu'elles ne sont pas parties.
8. **`public/sw.js`** : ajouter le shell de `/carnet/nouvelle` à `SHELL_URLS` et bumper `CACHE_VERSION` (`cdp-v2` → `cdp-v3`). Sans ça, le formulaire est **inatteignable** hors réseau et toute la file ne sert à rien. Ne pas toucher à `isBypassed` ni à la stratégie de fetch.
9. **Tests Vitest** : idempotence (même `client_id` deux fois = 1 prise, 1 seul `xp_events`, 1 seul lot de notifications) ; file (enqueue / list / remove / persistance) ; classification erreur réseau vs erreur métier ; rejeu qui s'arrête sur rate-limit sans boucler ; conditions rejouées à la date de la prise.

### Critères d'acceptation

- **Mode avion sur téléphone réel** : `/carnet/nouvelle` s'ouvre, le formulaire complet fonctionne photo comprise, l'enregistrement donne une confirmation **explicite** « en attente ». Réseau rétabli → la prise part seule en moins de 10 s, photo comprise, et apparaît normalement dans le carnet.
- **Rejeu du même `client_id` deux fois** (simulable en tuant la réponse après l'insert) : **une seule** ligne dans `catches`, **un seul** `xp_events` — vérifié **en SQL**, pas à l'œil — et un seul lot de notifications followers.
- Une prise synchronisée à **moins** de 48 h crédite l'XP ; à **plus** de 48 h ne le crédite pas **et reste entière** dans le carnet et le scoring. Les deux cas testés, `is_competitive_catch` inchangée.
- **6 prises en file** : les 5 premières partent, la 6ᵉ ne fait pas boucler le rejeu, et l'utilisateur voit pourquoi et quand elle partira.
- `navigator.storage.persist()` est appelé à la première mise en file ; son résultat est mesuré et, s'il est négatif, la copie de la bannière change.
- **Non-régression** : une prise loguée normalement en ligne suit exactement le chemin actuel, **sans passer par IndexedDB**. Stats, XP, célébrations, records, notifications : identiques.
- **Sécurité** : aucune coordonnée de spot flouté ni aucune donnée d'autrui n'atterrit dans IndexedDB ; la file est **purgée à la déconnexion** (un téléphone partagé ne rejoue pas la prise de quelqu'un d'autre).

### Garde-fous

- **Ne pas toucher** : `supabase/migrations/105_xp_integrity.sql`, `is_competitive_catch`, les constantes de rate-limit, la RLS, `blur_spot_geom`, la fonction `isBypassed` de `sw.js`.
- Aucun handler `sync` dans le service worker.
- Une prise en attente n'est **jamais** affichée comme loguée dans un compteur, un record ou un classement.
- ⚠️ **DEMANDER À JOHN AVANT** : la source `offline` exemptée du burst (contrainte 3).

---

## Bloc 4 — La page offline dit enfin quelque chose d'utile (WS E — dépend du Bloc 3)

`app/offline/page.tsx` annonce aujourd'hui l'absence de réseau. Une fois le Bloc 3 livré, cette page peut proposer l'action utile plutôt que constater la panne.

> **Connecteurs** : **qa-chrome** (simulation offline DevTools) pour la vérification rapide, appareil réel pour la validation finale.

### Tâches

1. Réécrire la copie : « Pas de réseau — mais tu peux quand même loguer ta prise », avec un lien vers `/carnet/nouvelle` (désormais précaché par le Bloc 3, tâche 8).
2. Y afficher le nombre de prises en attente si la file n'est pas vide.
3. Vérifier que le fallback `caches.match('/offline')` de `sw.js` sert bien la nouvelle version après le bump de `CACHE_VERSION`.

### Critères d'acceptation

- En mode avion, une navigation vers une page non cachée sert `/offline`, le lien vers `/carnet/nouvelle` **fonctionne**, et le compteur de file est juste.
- Après déploiement, le toast « Mettre à jour » apparaît une fois et l'ancienne page offline ne réapparaît plus (pas de version fantôme).

### Garde-fous

- Ne pas promettre le mode hors ligne sur des pages qui ne le sont pas (la carte, notamment : les tuiles ne sont pas cachées et ce n'est pas le sujet de ce sprint).

---

## Workstream VERIF (obligatoire, agent indépendant qui n'a pas écrit le code)

1. Lancer `/verif-sprint` (`pnpm test` + `pnpm build` + `pnpm typecheck` + `pnpm lint` + revue croisée + passe anti-régression). Puis **deploy-watch** après déploiement — le SW et IndexedDB produisent des erreurs runtime silencieuses, Sentry est le juge.
2. Relire **chaque** critère d'acceptation ci-dessus et cocher ✅/❌ **avec preuve** (capture, requête SQL, sortie de test). Un critère sans preuve est un ❌.
3. **Passe sécurité dédiée** : contenu réel d'IndexedDB inspecté dans les DevTools (aucune coordonnée, aucune donnée d'un autre compte) ; purge à la déconnexion vérifiée ; migration 114 relue (RLS intacte, index unique bien partiel) ; `get_advisors` sans nouvelle alerte.
4. **Passe anti-triche** : démontrer en SQL qu'aucun chemin du rejeu ne crédite deux fois l'XP, et que la fenêtre 48 h se comporte exactement comme avant le sprint.
5. **Passe copy** : tutoiement partout, zod en français, et surtout — aucune promesse que le produit ne tient pas. En particulier : ne jamais écrire « tes prises sont sauvegardées en sécurité » si `navigator.storage.persist()` a été refusé.
6. **Passe non-régression Android** : le parcours d'installation et de log en ligne sur Android Chrome est identique à avant le sprint.
7. Livrer `docs/sprint-90/RECAP.md` : fait / comment tester / reste manuel John.

---

## Reste manuel John (post-sprint)

- **QA sur iPhone et Android physiques** — non délégable (cf Préalable) : ajout à l'écran d'accueil, push sur écran verrouillé, log complet en mode avion, retour du réseau.
- Appliquer la **migration 114** en prod, régénérer `lib/types.ts`, lancer `get_advisors`.
- Trancher le point ⚠️ du Bloc 3, contrainte 3 (source `offline` exemptée du burst 5/h).
- Merge → `main` + déploiement (auto-deploy Vercel).
- **Hors sprint mais c'est l'horloge : lancer le DUNS.** Gratuit, 2 à 4 semaines, chemin critique des deux comptes org le jour où la phase native démarre.
- Dans un mois : rejouer le Bloc 0 et comparer. Si la part d'installations iOS et le nombre d'abonnés push n'ont pas bougé, c'est le Bloc 1 qu'il faut revoir — pas le natif qu'il faut lancer.

---

## Annexe — les faits externes sur lesquels ce brief s'appuie

Vérifiés le 2026-08-26. À re-vérifier avant M1 : WebKit bouge.

| Fait | Conséquence dans ce brief |
|---|---|
| iOS n'a **aucun** équivalent de `beforeinstallprompt` ; l'installation passe par Partager → Ajouter à l'écran d'accueil, **et seulement dans Safari** | Bloc 1, tâches 2-4 |
| Le Web Push sur iOS ne fonctionne **que** pour une PWA ajoutée à l'écran d'accueil (iOS 16.4+) | Bloc 2 en entier ; c'est la raison pour laquelle le Bloc 1 le précède |
| Ni Background Sync, ni Periodic Background Sync, ni Background Fetch sur iOS | Bloc 3, contrainte 1 : rejeu en premier plan |
| Quotas WebKit depuis Safari 17 : par pourcentage de disque, pas un plafond fixe. `navigator.storage.persist()` est accordé sur heuristique, dont « ouvert en Home Screen Web App » ; les origines en mode persistant sont exclues de l'éviction | Bloc 3, contrainte 4 |
| Apple Developer Program : 99 €/an, requis seulement à TestFlight/soumission. Play Console : 25 $ une fois. EAS : free tier suffisant jusqu'à la beta | Aucune dépense n'est engagée par ce sprint |
