# Sprint 81 — RECAP (PARTIEL)
## La mesure honnête

> **Statut au 2026-08-15, 15h10** : Blocs 0 (partiel), **1 (code complet, drapeau ÉTEINT)** et
> **6 (clos avec preuve)** faits. **Blocs 2, 3, 4, 5 NON FAITS.** Voir « Ce qui n'est pas fait »
> en bas, c'est la partie la plus importante de ce document.
>
> ⚠️ Ligne **datée**. La vérité est HEAD de `main` et la prod, jamais cette phrase.
>
> **Aucune migration.** Aucune RPC, aucune policy. **1328 tests verts** (109 fichiers),
> build OK, `tsc` OK, `next lint` OK, lint de copie OK.

---

## Bloc 0 — Le gate

**Le S80 est déployé** (`acf0c71` poussé le 15/08 ~14h55, déploiement Vercel confirmé en
interrogeant la prod). Le préalable §1 est satisfait.

⚠️ **Fait partiellement.** La preuve mécanique du S80 (point 1) a été rejouée **au moment du
S80 lui-même**, sur le build local puis, pour les parties serveur, en production. Elle n'a pas
été **re-rejouée en production après déploiement** dans le cadre de ce sprint. Les relevés
PostHog (points 2, 3, 4) et les captures « avant » (point 5) **ne sont pas faits**.

★ **Ce que je peux dire du relevé J+14 du S79 sans le mesurer** : le S79 a été déployé
**aujourd'hui à ~14h05**. La fenêtre fait donc **moins d'une heure**. Le brief le prévoit
explicitement (point 2, dernier tiret) : *« si la fenêtre fait moins de 10 jours, dis-le et ne
conclus pas »*. Il n'y a rien à relever, et tout relevé fait maintenant serait trompeur. Le
vrai J+14 tombe **le 29/08**.

---

## Bloc 1 — Le comptage sans cookie ✅ (codé, drapeau éteint)

### Ce que la recherche a établi, contre les hypothèses du brief

Le brief demandait de **ne pas coder de mémoire** et de vérifier trois choses. Vérifiées dans
le SDK **installé**, pas dans une documentation en ligne :

| Question du brief | Réponse, et sa source |
|---|---|
| `cookieless_mode` existe-t-il en `posthog-js@^1.393.0` ? | **OUI.** `cookieless_mode?: 'always' \| 'on_reject'` est déclaré dans `@posthog/types@1.391.0`, `dist/posthog-config.d.ts:1589`, et présent dans le bundle `posthog-js@1.393.0`. `tsc --noEmit` l'accepte. **Aucune montée de version, donc rien à te demander.** |
| `'on_reject'` couvre-t-il celui qui **n'a pas encore répondu**, ou seulement celui qui a **refusé** ? | ★ **Les deux.** La doc de `is_capturing()` dans le SDK installé : *« if the cookieless_mode is set to `'on_reject'`, we will capture events in cookieless mode if the user has opted out **or been defaulted to opt-out** »*. Or `opt_out_capturing_by_default: true` met précisément le visiteur qui n'a pas tranché dans cet état. **C'était la question qui décidait de la forme du correctif** : elle rend `lib/consent.ts` inutile à modifier, et le correctif tient en une ligne de config. |
| Que devient `opt_out_capturing_by_default` ? | Il **reste**, et c'est lui qui arme `'on_reject'`. Le consentement ne recule pas : c'est son périmètre qui change. |

### ★★★ Le piège, à ne surtout pas rater

> *« Note that you **MUST enable cookieless mode in your PostHog project's settings**, otherwise
> all your cookieless events **will be ignored**. »* — documentation du SDK installé.

**Le drapeau côté code ne suffit pas.** Il y a un **réglage à activer dans le projet PostHog**
(côté tableau de bord). Sans lui, allumer `NEXT_PUBLIC_ANALYTICS_COOKIELESS` produirait
exactement zéro événement supplémentaire, en silence, et on conclurait à tort que le bloc ne
marche pas. **C'est un point manuel bloquant, ajouté au reste à faire.**

### Ce qui a été codé

- `components/analytics/PostHogProvider.tsx` : `cookieless_mode: 'on_reject'`, **ajouté
  conditionnellement** selon `NEXT_PUBLIC_ANALYTICS_COOKIELESS`.
  Absent, `'0'`, `''` ou toute autre valeur ⇒ **objet de config strictement identique à avant
  le sprint**. Seuls `'1'` et `'true'` allument.
- **`'on_reject'` et pas `'always'`** : `'always'` couperait les cookies pour **tout le monde**,
  y compris ceux qui ont accepté, et on perdrait le funnel identifié, la seule chose que la
  roadmap sait lire de bout en bout.
- `person_profiles: 'identified_only'`, `opt_out_capturing_by_default: true`,
  `disable_session_recording: true`, `autocapture: false` : **tous conservés**.
- `app/(marketing)/legal/confidentialite/page.tsx` : un paragraphe et une ligne de tableau
  décrivant la mesure sans cookie, **gatés sur la MÊME variable**. Page et comportement
  basculent ensemble : il n'existe aucun instant où la page ment sur le dispositif. Drapeau
  éteint ⇒ le texte actuel reste vrai au mot près.
- `components/analytics/__tests__/cookieless-flag.test.ts` (8 cas) : verrouille le drapeau
  (éteint par défaut), le mode retenu, l'absence de profil anonyme, et le fait que l'opt-out
  par défaut n'est pas retiré.

### Ce qui n'est PAS fait dans ce bloc

- Les critères d'acceptation **se mesurent drapeau allumé** (inventaire de `document.cookie`,
  `localStorage`, `sessionStorage` ; un seul `$pageview` à l'acceptation ; absence de profil
  personne). Ils **n'ont pas été exécutés**, puisque le drapeau reste éteint tant que tu n'as
  pas tranché. La tâche 5 (double `$pageview` à la bascule) est donc **ouverte** : c'est le
  premier test à faire le jour où tu allumes.
- La vérification qu'aucun tableau de bord existant ne dépend du GeoIP (pays/région), que le
  mode sans cookie supprime.

---

## Bloc 6 — La colonne qui ment : ★ elle ne ment pas

Le brief demandait de **compter avant d'écrire**. Compté :

```sql
select count(*) from public.spots where department <> btrim(department);  -- 0
select count(distinct department), count(distinct btrim(department)) from public.spots;  -- 24, 24
```

**Zéro ligne non normalisée. 24 valeurs distinctes avant et après `btrim`, à l'identique.**
Et sur une ligne du département 34 : `department = '34'` renvoie **`true`**, `length()` vaut **2**.

**Explication.** `spots.department` est de type `char(3)`, un type **complété par des espaces à
la sérialisation**. La valeur `"34 "` que l'audit a relevée est un artefact de l'export JSON,
pas un contenu de base : en SQL, `char` **ignore les blancs de fin dans les comparaisons**, par
définition du type. `department = '34'`, `.eq('department', '34')` et les `group by` marchent
donc déjà.

**Conséquence : aucune migration n'est nécessaire, et je n'en ai pas écrit.** Une migration
`btrim` aurait touché 0 ligne, et une contrainte `check` sur un `char(n)` aurait été
tautologique. Tu n'as pas de feu vert à donner sur ce point : il n'y a rien à exécuter.

⚠️ **Le risque résiduel est réel mais ailleurs** : côté JavaScript, `'34 ' === '34'` est faux.
C'est pour ça que le code trime déjà à la frontière (`String(row.department).trim()` sur la
fiche de spot, le correctif `home_department` du S67, `deptLabel` du S52). C'est un sujet de
revue de code, pas de migration. **Non audité exhaustivement dans ce sprint.**

★ C'est le **troisième** brief d'affilée dont une prémisse ne tient pas : le S79 en a corrigé
cinq sur six, le S80 a démonté un faux positif de `display: none`, le S81 avait lui-même
anticipé le cas au §3a. Compter avant d'écrire a évité une écriture en production inutile.

---

## Ce qui n'est PAS fait, et pourquoi

Je me suis arrêté sur une **limite de session** (celle qui avait déjà tué quatre agents
d'analyse en début de journée). Plutôt que d'être coupé au milieu d'un fichier, j'ai clos
proprement sur un état vert et commité.

| Bloc | État | Note |
|---|---|---|
| **0** | Partiel | Preuve mécanique du S80 non re-rejouée en prod ; relevés PostHog et captures « avant » non faits. Le relevé J+14 du S79 **ne peut pas** être fait : fenêtre < 1 h |
| **2** — bandeau qui disparaît | **Non fait** | Dépendance dure au Bloc 1. Il ne **doit pas** être fait tant que le drapeau du Bloc 1 n'est pas allumé et vérifié : un bandeau retiré sans comptage sans cookie, c'est la mesure qui passe de 29 % à **0 %** |
| **3** — auto-référencement | **Non fait** | Commence par une re-mesure PostHog. Le §3a du brief prédit qu'il se clôt en une heure |
| **4** — tableau de bord + `catch_log_abandoned` | **Non fait** | Le `catch_log_abandoned` mobile traîne depuis le S79 |
| **5** — les trois LCP | **Non fait** | ⚠️ Sa base doit être relevée **AVANT** que le drapeau du Bloc 1 s'allume, sinon l'avant et l'après ne seront pas comparables (la population mesurée change) |

---

## Reste manuel John

1. ★★★ **Activer le mode sans cookie dans les réglages du projet PostHog** avant toute chose.
   Sans ce réglage côté PostHog, allumer le drapeau ne produit **rien**, en silence.
2. ⚠️ **Le feu vert du Bloc 1.** Le code est là, le drapeau est éteint. La question est « on
   l'allume ? », pas « on le code ? ». Les trois questions pour le juriste sont rédigées telles
   quelles dans le brief (§ « La question de conformité »).
   **Ordre à respecter le jour de l'allumage** : (a) réglage PostHog, (b) relever la base LCP
   du Bloc 5, (c) allumer `NEXT_PUBLIC_ANALYTICS_COOKIELESS=1` sur Vercel, (d) vérifier les
   critères du Bloc 1 en navigateur, (e) alors seulement le Bloc 2.
3. **Bloc 6 : rien à faire.** Aucune migration, aucun feu vert attendu.
4. **Relevé J+14 du S79 le 29/08** : `signup_wall_clicked / signup_wall_viewed` mobile.
   Base 0,83 %, cible > 3 %.
5. ⚠️ **CTR `/spots` à J+7 et J+14.** Sous 6 %, retour en arrière sur le Bloc 1 du S80 puis
   dépublication du lot 1. **Seul frein non dégaté de la roadmap.**
6. **Trancher l'amendement de la roadmap** (préalable §3b du brief) : le critère « visiteurs
   PostHog > 70 % des clics GSC » ne survit pas à la rotation quotidienne du sel. Je peux le
   réécrire sur la définition du Bloc 0 dès que tu le dis.
7. **Export GSC des impressions `/especes/*`** — bloqué depuis le S78, c'est le plus vieux
   point ouvert de la série.
8. **Lancer l'amorçage du S82 maintenant** (20 fondateurs actifs, 100 prises) : quatre semaines
   de travail humain, pas du code.
