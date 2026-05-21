# 🔍 Brief Claude in Chrome — Audit post-sprint 7.5

> **Date** : à exécuter dès que sprint 7.5 est mergé en prod
> **Objectif** : (1) vérifier que tous les fixes du sprint 7.5 sont effectivement déployés et fonctionnels, (2) audit UX delta vs `docs/audits/ux-discovery/2026-05-21-claude-chrome.md`
> **Mode opératoire** : copie-colle le bloc PROMPT ci-dessous dans Claude in Chrome
> **Durée** : 30-45 min

---

## Avant de coller le prompt

1. Site sur **prod** : `https://www.carnet-de-peche.com` (pas localhost — on veut voir ce que voit l'utilisateur)
2. Vérifier que les 3 comptes test existent toujours (cf `docs/tests/comptes-test.md`) :
   - `redkps4+discovery@gmail.com`
   - `redkps4+local@gmail.com`
   - `redkps4+itinerant@gmail.com`
   - Password : `CarnetTest2026!`
3. Avoir le rapport précédent ouvert pour cross-check : `docs/audits/ux-discovery/2026-05-21-claude-chrome.md`

---

## PROMPT (à coller dans Claude in Chrome)

```
Tu es consultant UX/produit senior spécialiste des SaaS B2C français.
Tu vas auditer le site Carnet de Pêche après le sprint 7.5 (sprint de nettoyage).

Le sprint 7.5 visait à corriger les bugs trouvés lors du précédent audit
(2026-05-21). Ta mission est en 2 temps :

1. VÉRIFIER que les corrections promises sont bien en place (régression check)
2. DÉCOUVRIR ce qui reste à améliorer (audit UX delta)

Périmètre : https://www.carnet-de-peche.com en PROD.

Comptes test (password commun : CarnetTest2026!) :
- Anonyme : pas de login (incognito)
- Discovery : redkps4+discovery@gmail.com
- Local : redkps4+local@gmail.com
- Itinérant : redkps4+itinerant@gmail.com

Setup outils :
- DevTools console + Network ouverts
- Screenshots à chaque écran "remarquable" (bon ou mauvais)
- Pour chaque check explicite ci-dessous : PASS / FAIL / N/A + brève justif

⚠️ ATTENDU FAIL (reporté backlog au sprint 7.5, pas une régression) :
- Bloc C lint : ~360 erreurs `react/no-unescaped-entities` non corrigées + `eslint.ignoreDuringBuilds` toujours actif. Si tu vois des warnings React dans la console pas grave.
- E5 date format : le date picker FR custom a été reporté → si tu vois encore MM/DD/YYYY, c'est un FAIL ATTENDU, à compter dans "persistant" pas "régression".
- "Témoignages" remplacés par bloc "Pourquoi maintenant" (et non retirés à sec) — A6 = PASS si tu vois "Pourquoi maintenant" à la place.

⚠️ DÉCISIONS PRODUIT verrouillées par John pendant sprint 7.5 :
- Essai gratuit : **7 jours avec CB** (verrouillée). A3 attend "7 jours" partout, ZÉRO mention de "14j".
- Floutage GPS : 1 km partout.
- Adresse mentions légales : adresse perso temporaire (Vallauris), domiciliation commerciale post-sprint 8.

═════════════════════════════════════════════════════════════════════
PARTIE 1 — VÉRIFICATION DES CORRECTIONS SPRINT 7.5
═════════════════════════════════════════════════════════════════════

C'est une checklist binaire. Pour chaque item, dis-moi PASS ou FAIL.

▓▓▓ Bloc A — Marketing & SEO ▓▓▓

A1. Sur n'importe quelle page (ex: /spots), inspecte le <link rel="canonical">
    via DevTools (View Source ou Elements panel) :
    - PASS si l'URL contient "carnet-de-peche.com"
    - FAIL si elle contient "vercel.app"

A2. Va sur /fil, /especes, /techniques, /contact :
    - PASS si chacune affiche une page (pas un 404), même stub
    - FAIL si l'une retourne 404

A3. Sur la home /, fais Ctrl+F et cherche "14j" et "7 jours" / "7j" :
    - PASS si UN SEUL des deux apparaît (cohérent partout)
    - FAIL si les deux apparaissent en même temps (toujours incohérent)
    - Note quelle valeur a été retenue (7 ou 14)

A4. Sur /tarifs, clique le bouton "Essayer X jours" sur la card Local :
    - PASS si tu arrives sur /auth/register (ou similar inscription)
    - FAIL si tu vois un toast mentionnant "sprint" ou un href="#"

A5. Sur la home, scroll lentement et cherche les phrases suspectes :
    - "Import / export GPX / Fishbrain" → doit avoir DISPARU ou avoir un marker "bientôt"
    - "Modération humaine — ambassadeurs régionaux + IA" → idem
    - "Mode hors ligne" → soit retiré soit "bientôt"
    - "217 spots actifs" → remplacé par un texte plus honnête
    - "2 km" (floutage GPS) → doit être "1 km"
    - PASS si toutes ces affirmations ont disparu ou ont été reformulées
    - FAIL si l'une est toujours présente sans marqueur "bientôt"

A6. Section "Témoignages" sur la home :
    - PASS si retirée OU remplacée par autre chose (Pourquoi maintenant, etc.)
    - FAIL si les 3 témoignages Yann L. / Julien R. / François B. sont toujours là

▓▓▓ Bloc B — Dette sprint 7 ▓▓▓

B1. Sur /spots/pointe-du-raz section "Meilleurs moments" :
    - PASS si aucun badge "⚡ Perso" visible sur les fenêtres horaires
    - FAIL si un badge "Perso" apparaît

B2. Sur /profil (loggé en Discovery) :
    - PASS si la section "Ton profil de pêcheur" existe et affiche un mode descriptif
      (genre "Là où tombent tes X prises · Plutôt La nuit · Surtout Au printemps")
    - FAIL si elle est cassée ou affiche des multiplicateurs inertes

▓▓▓ Bloc C — Lint ▓▓▓

C1. (Skip — pas vérifiable côté navigateur. Mais ouvre la console DevTools sur la
     home : aucune erreur React ou warning lint visible côté client devrait
     apparaître. Note "PASS console clean" ou "FAIL [erreurs visibles]")

▓▓▓ Bloc D — Infra ▓▓▓

D1. Sur /carte, observe les markers :
    - PASS si tu vois des markers COLORISÉS (différentes couleurs/intensités selon
      la qualité actuelle du spot — pas tous gris)
    - FAIL si tous les markers sont gris/neutres

D2. Skip — env vars et CI non visibles côté navigateur.

▓▓▓ Bloc E — Discovery UX (les fixes du 21 mai) ▓▓▓

E1. Va sur /legal/mentions-legales :
    - PASS si tu vois un SIRET (chiffres style 977 995 174 00025), un nom (CAMPBELL),
      un hébergeur Vercel, une adresse réelle
    - FAIL si tu vois encore "[À COMPLÉTER PAR JOHN]" ou similaire

E2. Va sur /legal/confidentialite :
    - PASS si tu vois plusieurs sections RGPD (sous-traitants, durées,
      droits utilisateur, CNIL)
    - FAIL si placeholders ou contenu pauvre

E3. Va sur /legal/cgu :
    - PASS si tu vois plusieurs articles numérotés (1 à 16) avec contenu réel
    - FAIL si placeholders ou page vide

E4. Login en Discovery, va sur /home :
    - PASS si tu vois un VRAI dashboard (greeting, stats du compte, CTAs)
    - FAIL si tu vois encore "Le carnet, la carte et la communauté arrivent bientôt"

E5. Va sur /carnet/nouvelle, regarde l'input de date :
    - PASS si le format est DD/MM/YYYY (français)
    - FAIL ATTENDU si le format est encore MM/DD/YYYY (date picker FR custom reporté au backlog)
    - Note : ne pas compter ce FAIL comme régression — c'est un report assumé.

E6. Sur /carnet/nouvelle, soumets le form sans avoir choisi d'espèce :
    - PASS si le message d'erreur est en français spécifique
      (ex: "Choisis une espèce pour continuer")
    - FAIL si tu vois "Invalid input" (anglais)

E7. Sur /carnet/nouvelle, sélectionne "Saisir manuellement" pour le lieu :
    - PASS si les inputs lat/long ont des placeholders neutres clairement
      identifiables comme placeholders (genre "ex : 48.0382"), pas des valeurs
      qui pourraient être confondues avec des données pré-remplies
    - FAIL si les placeholders ressemblent à des valeurs réelles

E8. Sur la fiche prise (ouvre une de tes prises depuis /carnet), regarde le
    header de la section qui contient la technique :
    - PASS si le label est "MÉTHODE" ou "TECHNIQUE"
    - FAIL si le label est "COMMENT"

E9. Sur /carte (loggé), clique "Spots autour de moi", regarde le titre du drawer :
    - PASS si le drawer s'appelle "Spots autour de moi"
    - FAIL si le drawer s'appelle "Spots autour de toi"

E10. Sur /tarifs, regarde la card Découverte :
     - PASS si tu vois "Bientôt sur iOS / Android" ou similaire
     - FAIL si tu vois "sprint 13+" ou autre référence interne dev

E11. Va sur /guides puis ouvre le guide "peche-au-bar-au-leurre". Regarde la
     durée annoncée sur la card LIST vs sur la PAGE ouverte :
     - PASS si les deux durées sont cohérentes
     - FAIL si l'une dit 8 min et l'autre 20 min

E12. Sur /carnet (loggé en Discovery via redkps4+discovery@gmail.com) :
     - Note : ce compte test n'a pas forcément de catches. C'est OK.
     - PASS si le carnet est vide ou propre
     - FAIL si tu vois encore les 3 prises identiques "Bar 52cm 1.80kg" ou des
       spots non-côtiers (Grazac, Vallauris)
     - Note : si le carnet vérifié est celui du compte personnel "Seychi"
       (redkps4@gmail.com), le résultat peut différer.

▓▓▓ Bloc Quick wins (Bloc E2 optionnel — facultatif au sprint 7.5) ▓▓▓

QW1. Tap targets header & footer (DevTools → Inspect → mesure la hauteur d'un lien) :
     - PASS si ≥ 44px sur header ET footer
     - PARTIEL si l'un ou l'autre est OK
     - FAIL si toujours < 44px partout

QW2. /carte au premier paint (recharge la page avec Network throttling Slow 3G) :
     - PASS si tu vois un skeleton/loader pendant le chargement de la carte
     - FAIL si la zone carte reste blanche pendant 2-3 secondes sans aucun indicateur

QW3. Sur /spots/pointe-du-raz, cherche le bouton "Itinéraire GPS" :
     - PASS si tu peux choisir entre Google Maps / Apple Plans / Waze
     - PARTIEL si Google Maps seul mais affiché clairement
     - FAIL si lien Google Maps unique sans précision

QW4. Sur /guides liste : compte les cards qui ont une hero image vs celles avec
     placeholder teal vide :
     - PASS si TOUTES ont une image
     - FAIL si certaines sont encore en placeholder

QW5. Liens externes (Windy, MapTiler, OSM attribution, Google Maps) :
     - PASS si tous ont rel="noopener noreferrer" (Inspect source)
     - FAIL si certains ont target="_blank" sans rel

▓▓▓ Email contact ▓▓▓

EMAIL. Trouve l'email de contact dans le footer ou les mentions légales :
       - PASS si c'est contact@carnet-de-peche.com (qui marche maintenant)
       - Note l'adresse trouvée

═════════════════════════════════════════════════════════════════════
PARTIE 2 — AUDIT UX DELTA (nouveautés à découvrir)
═════════════════════════════════════════════════════════════════════

Maintenant on quitte le check de régression et on REGARDE LE PRODUIT À NEUF.
L'audit du 21 mai a identifié 18 opportunités d'amélioration. Combien ont
été adressées vs sont restées ? Et qu'est-ce qui apparaît de NOUVEAU comme
opportunité ?

DELTA-1. Première impression en 60 sec (sans login)
- Note /10 actuelle (en notant la note précédente 6,5/10)
- Le produit "fait pro" ou "fait amateur" maintenant ?
- Une phrase : qu'est-ce qui a le plus changé en bien ? En mal ?

DELTA-2. Friction parcours
Refais les 5 parcours du brief précédent :
- Anonyme → "Je veux comprendre ce que c'est"
- Anonyme → "Je veux m'abonner"
- Discovery → "Je veux voir si ça vaut le coup d'upgrader"
- Local → "Je veux loguer ma première prise" (si tu peux te logger en Local)
- Local → "Je veux retrouver mon spot fétiche"
Pour chacun : note 3 phrases — ce qui s'est amélioré, ce qui reste, ce qui
émerge comme nouveau pain point.

DELTA-3. Mobile (iPhone 14 Pro Max via DevTools)
Refais les pages clés en mobile :
- Home, /tarifs, /carte, /spots/pointe-du-raz, /carnet/nouvelle
Note 5 forces et 5 faiblesses mobile, en comparant avec le rapport du 21 mai
(qui n'avait pas pu auditer le vrai mobile faute d'outil de viewport).

DELTA-4. Pages nouvellement créées
Si /fil, /especes, /techniques, /contact existent maintenant en stub :
- Quelle qualité ? Bien faites ou cheap ?
- Le CTA "sois notifié au lancement" / formulaire email est-il présent ?
- Tu as envie de t'inscrire pour être prévenu ?

DELTA-5. Pages légales
Lis les 3 pages legal (mentions, confidentialité, CGU) :
- Le ton est-il cohérent avec le reste du site (tutoiement, voix produit) ?
  Ou est-ce un copier-coller juridique froid ?
- Les sections sont-elles lisibles (h2/h3, paragraphes, listes) ou un wall of text ?
- Tu repères-tu des incohérences ou des oublis ?

DELTA-6. Nouveau Top 10 opportunités
Tableau priorisé avec 6 colonnes :
| # | Page/Flow | Problème observé | Recommandation | Effort (S/M/L) | Impact (S/M/L) |
Maximum 12 lignes. Distingue 3 catégories :
- 🔴 Régression : ce qui MARCHAIT le 21 mai et est CASSÉ aujourd'hui
- 🟡 Persistant : ce qui était déjà là le 21 mai et n'a pas été fixé
- 🟢 Nouveau : ce qui est apparu comme opportunité depuis

DELTA-7. Stress tests
Refais les stress tests UX :
- Network throttling Slow 3G sur /carte et /spots/[slug] : skeleton ? layout shift ?
- Form validation sur /auth/register : tape email invalide, password court → messages clairs en FR ?
- Click 10 liens au hasard dans header + footer + cards : aucun 404 ?

DELTA-8. Sentiment final
Maturité perçue :
- Avant sprint 7.5 (21 mai) : alpha avancée / pre-launch
- Après sprint 7.5 (aujourd'hui) : choisis entre alpha / beta limitée / beta publique / prod-ready
- 1 paragraphe : si tu devais montrer le site à un journaliste de presse pêche
  aujourd'hui pour préparer le lancement, est-ce que ça tient la route ?

═════════════════════════════════════════════════════════════════════
RAPPORT FINAL — structure obligatoire
═════════════════════════════════════════════════════════════════════

## 1. Verdict checklist sprint 7.5 (PARTIE 1)

Tableau récap PASS/FAIL pour chacun des 30+ items A1, A2, B1, etc.
Compte total PASS / total FAIL / total N/A.

Score sur les fixes promis : __ / __ (ex: 27/30)

Si FAIL : pour chaque item failed, dis exactement où tu vois encore le problème,
avec screenshot si possible.

## 2. Première impression actualisée
(DELTA-1)

## 3. Friction parcours évoluée
(DELTA-2 : 5 parcours)

## 4. Mobile authentique
(DELTA-3 : 5 forces, 5 faiblesses, comparaison brief précédent)

## 5. Pages nouvelles
(DELTA-4 + DELTA-5)

## 6. Top 12 opportunités priorisées (Nouveau)
(DELTA-6 : tableau avec 🔴🟡🟢)

## 7. Stress tests
(DELTA-7)

## 8. Sentiment de maturité final
(DELTA-8)

## 9. Limitations de cet audit
(Pareil que dernière fois : viewport, comptes auth si pas accès, etc.)

══════════════════════════════════════════════════════════════════════

Va, prends ton temps, et rapporte tout. Le but final : aider John à décider
si on attaque sprint 8 (fil communautaire) maintenant, ou s'il reste 1 jour
de polish nécessaire avant.
```

---

## Comment utiliser le rapport rendu

1. **Sauve-le** dans `docs/audits/ux-discovery/{YYYY-MM-DD}-claude-chrome-post-sprint-7.5.md` (créer le dossier si besoin — déjà créé pour le rapport 21 mai)
2. **Croise-le avec mon audit** que je vais produire derrière (je travaille sur site live + repo en parallèle)
3. **Décision** : si rapport Chrome dit "prod-ready / beta publique-OK" → sprint 8. Si rapport dit "reste 2-3 régressions" → on prolonge 7.5 d'un jour.

---

## Variante "audit éclair" (15 min)

Si tu n'as que 15 min pour valider rapidement, garde uniquement la PARTIE 1
(checklist) et le DELTA-1 (première impression) + DELTA-8 (sentiment final).
Skip les sections friction / mobile détaillées.

---

*Brief généré par Claude le 2026-05-22 (ou date du jour). Basé sur :*
- *`docs/sprint-7.5/brief-sprint-7.5.md` (la checklist de sortie)*
- *`docs/audits/ux-discovery/2026-05-21-claude-chrome.md` (l'audit baseline)*
- *`docs/tests/claude-in-chrome-ux-discovery.md` (le brief modèle)*
