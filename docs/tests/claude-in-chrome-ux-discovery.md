# 🔍 Brief Claude in Chrome — Audit UX & opportunités d'amélioration

> **Mode opératoire** : copie-colle le PROMPT ci-dessous dans Claude in Chrome (extension navigateur). Il va naviguer le site de bout en bout sur les 4 tiers utilisateur, prendre des screenshots, et te rendre un rapport orienté **opportunités d'amélioration** (pas chasse aux régressions — ce volet est déjà couvert par les briefs sprint).
>
> **Différence vs briefs précédents** :
> - `docs/sprint-3.5/claude-in-chrome-test-brief.md` = régression auth + carnet
> - `docs/tests/comptes-test.md` (section "Prompt Claude in Chrome mis à jour") = vérif freemium par tier
> - `docs/tests/smoke-test-chrome.md` = smoke sprint 7
> - **CE doc** = audit UX, friction, copy, opportunités, ressenti "amateur vs pro"
>
> **Cadence recommandée** : 1× par sprint majeur (8, 9, 10, 11) + ad hoc quand tu sens que le produit a dérivé.

---

## Avant de coller le prompt

1. **Lance le site sur prod** (`https://www.carnet-de-peche.com`) plutôt que localhost — l'audit doit voir ce que l'utilisateur voit
2. **Confirme que les 3 comptes test existent** (cf `docs/tests/comptes-test.md`) :
   - `redkps4+discovery@gmail.com`
   - `redkps4+local@gmail.com`
   - `redkps4+itinerant@gmail.com`
   - Password commun : `CarnetTest2026!`
3. **Prévois 30-45 min** de run (Claude in Chrome navigue lentement, prend des screenshots, ouvre la console)
4. **Garde un Notion ou bloc-notes** ouvert pour annoter les actions à faire au fil de la lecture du rapport

---

## PROMPT (à coller dans Claude in Chrome)

```
Tu es un consultant UX/produit senior, spécialiste des SaaS B2C français.
Tu vas auditer le site Carnet de Pêche pour identifier des OPPORTUNITÉS D'AMÉLIORATION.

Ce N'EST PAS une chasse aux bugs. Ce que je veux :
- Friction dans les parcours
- Copy qui pourrait être plus clair, plus engageant, plus honnête
- Hiérarchie de l'info sous-optimale
- États vides (empty states) frustrants ou non guidants
- États d'erreur peu utiles
- Animations qui freezent, sont trop longues, ou manquent
- Mobile UX qui mérite mieux (drawer qui colle, FAB mal placés, scroll cassé)
- Accessibilité ressentie (contraste, taille de tap, focus, lecture)
- Vitesse perçue (FOUC, layout shifts, images qui pop)
- Cohérence du tone (tutoiement, voix pêcheur)
- Tout ce qui te ferait dire "ça fait amateur" vs "ça fait pro"

Périmètre : https://www.carnet-de-peche.com en PROD.

Comptes test (password commun : CarnetTest2026!) :
- Anonyme : pas de login (incognito)
- Discovery : redkps4+discovery@gmail.com
- Local : redkps4+local@gmail.com
- Itinérant : redkps4+itinerant@gmail.com

Devices à tester (DevTools emulator quand nécessaire) :
- Desktop standard : largeur ~1440px
- Mobile iPhone 14 Pro Max (430×932)
- Mobile Pixel 7 (412×915) pour Android sample
- Tablette iPad Mini (768×1024) — rapide, juste 1-2 pages

Setup outils :
- DevTools console + Network ouverts en continu
- Capture screenshot à chaque écran "remarquable" (bon ou mauvais)
- Note les temps de chargement perçus
- Si une animation est saccadée, dis-le

═════════════════════════════════════════════════════════════════════
PARTIE 1 — Visiteur anonyme (incognito, desktop 1440px)
═════════════════════════════════════════════════════════════════════

1. Homepage / — Première impression (30 secondes max)
   - Score sur 10 ton ressenti instantané
   - Le tagline parle-t-il à un pêcheur du bord ? Pourquoi oui/non ?
   - Le hero répond-il aux 3 questions clés : C'est quoi ? À qui ? Combien ?
   - Quel est le PROCHAIN clic naturel ? Le bouton est-il évident ?

2. Scroll de la home jusqu'au footer
   - Note chaque section : ce qui marche, ce qui te fait douter
   - Au CTA bottom "Crée ton carnet" : as-tu envie de cliquer ? Pourquoi/pourquoi pas ?
   - Vérifie que tu n'as JAMAIS rencontré : href="#", placeholder lorem ipsum, image cassée, texte tronqué
   - Cohérence du tone : tutoiement partout ? Voix "pêcheur" maintenue ?
   - Promesses tenues vs vagues : repère toute affirmation difficile à prouver (chiffres ronds, témoignages, "le mieux", "X fois plus", etc.)

3. Tarifs /tarifs
   - Comprends-tu la différence Local / Itinérant en 5 secondes ?
   - L'essai "X jours" est-il cohérent partout (page tarifs + home) ?
   - Le toggle Mensuel / Annuel fonctionne-t-il et le calcul d'économie est-il clair ?
   - Clique sur "Essayer X jours" — où atterris-tu ? Est-ce ce que tu attendais ?
   - FAQ : les questions sont-elles celles que TOI tu te poserais à l'inscription ?

4. Spots /spots
   - Filtre par département + espèce : intuitive ?
   - Click sur une fiche spot → fiche complète : trop d'info ? Pas assez ?
   - Le freemium gating (coords floutées) est-il bien expliqué ou frustrant ?

5. Fiche spot /spots/pointe-du-raz (ouvre-la, scroll lentement, examine chaque bloc)
   - Le bloc "Meilleurs moments" (solunar) : comprend-on les couleurs, scores, badges ?
   - Le bloc "Conditions du jour" : info trop dense ou bien hiérarchisée ?
   - Le bloc "Prises récentes" (probablement vide) : empty state engageant ?
   - Le bloc "Accès" + "Dangers" : utile ou décoratif ?
   - Le CTA "Itinéraire GPS · Google Maps" : utile ? Manque-t-il Waze/Apple Maps ?
   - Le bouton "Logger ma prise" : redirige vers /auth/login?next=... ?
     → POST-INSCRIPTION, la prise est-elle pré-remplie avec le spot ? Tester si possible.

6. Carte /carte (DESKTOP)
   - Premier rendu : combien de temps avant de voir les markers ?
   - Markers : couleurs / clustering / interactions au hover et click
   - Filtres : où sont-ils, sont-ils tappables d'un coup d'œil ?
   - Bandeau upsell freemium : pénible ou bien dosé ?
   - Géolocalisation : tu cliques "Me géolocaliser" → comportement ?
   - Sheet "Spots autour de moi" : nombre de résultats, scroll, lisibilité

7. Pages éditoriales /guides + /guides/<un guide>
   - Liste guides : design ? Combien de guides en ligne ?
   - Un guide ouvert : lisibilité (taille texte, line-height, largeur de lecture)
   - Présence d'images, de liens vers spots, de CTAs ?
   - Tu vois-toi le partager sur WhatsApp à un pote pêcheur ?

8. Liens footer /fil + /especes + /techniques
   - Existent-ils en page complète ou stub "bientôt" ?
   - Si stub : engageant ou décevant ?
   - Si 404 : 🚨 alerte

9. Pages légales /legal/cgu, /legal/confidentialite, /legal/mentions-legales
   - Réelles ou placeholder ? Datent de quand ? Mentionnent bien Stripe / cookies / RGPD ?

═════════════════════════════════════════════════════════════════════
PARTIE 2 — Visiteur anonyme (incognito, MOBILE iPhone 14 Pro Max)
═════════════════════════════════════════════════════════════════════

10. Homepage mobile
    - Hero lisible sans scroll ?
    - CTA pouce-tappable (≥ 44×44px) ?
    - Stack mobile cohérent (texte au-dessus, mock app en-dessous) ?
    - Scroll fluide ? Animations qui rament ?

11. Carte /carte mobile (LE test critique)
    - Carte fullscreen, header masqué : OK ?
    - Sheet bottom drawer pour les filtres : snap points qui collent ?
    - Pinch zoom, drag pan : fluide ?
    - "Spots autour de moi" : sheet glisse bien, drag handle visible ?
    - Click un marker : popup ou drawer ? Lisible ?
    - Bouton géoloc : où il est, accessible au pouce ?

12. Fiche spot mobile
    - Scroll long : breakpoint visuel propre entre sections ?
    - Cartes conditions (météo, vagues) lisibles ?
    - Calendrier 7 jours solunar : scroll horizontal fluide ? Snap ?

13. Tarifs mobile
    - 3 cards : stack vertical clean ?
    - Toggle mensuel/annuel : tappable ?
    - CTA "Essayer X jours" : pouce-tappable, visible sans scroll de la card ?

═════════════════════════════════════════════════════════════════════
PARTIE 3 — Parcours INSCRIPTION (anonyme → registered)
═════════════════════════════════════════════════════════════════════

14. /auth/register
    - UI claire ? Champs minimaux ? Aide contextuelle ?
    - Validation email en temps réel ?
    - Password : indicateur de force ? Show/hide ?
    - Google OAuth : présent ? Apple : grisé "bientôt" ?
    - Liens vers /legal/cgu, /legal/confidentialite cliquables ?
    - Après submit : où atterris-tu ?
    - (Optionnel — sans aller jusqu'à la confirmation email) : note ton ressenti

15. Confirmation email
    - PAS DE TEST : tu n'as pas accès à la boîte mail. Skip cette étape.

═════════════════════════════════════════════════════════════════════
PARTIE 4 — Compte Discovery (login redkps4+discovery@gmail.com)
═════════════════════════════════════════════════════════════════════

16. /auth/login + login
    - Tabs Connexion/Inscription : laquelle est active par défaut ?
    - Magic link : visible ou caché derrière un toggle ?
    - "Mot de passe oublié" : visible ?
    - Login : combien de temps avant la redirection ?
    - Si redirect vers /onboarding : tu as déjà été onboardé, donc ça ne devrait pas. Sinon → /home

17. /home (page d'accueil connectée)
    - Que vois-tu ? Est-ce une vraie home utilisateur ou un dump de liens ?
    - Présence d'un "next best action" clair (logger une prise, explorer la carte, etc.) ?
    - Stats perso visibles (nb prises, dernier spot, etc.) ?

18. Bandeau upsell sur /carte
    - Affiché ou non ?
    - Texte du bandeau : pertinent, pas culpabilisant ?
    - Filtres grisés : tooltip explicatif au hover ?

19. /carnet (vide ou avec quelques prises)
    - Empty state : engageant et clair sur "comment loguer ma première prise" ?
    - Si non vide : grille des prises lisible, filtres utiles, stats résumées en haut ?

20. /carnet/nouvelle (sans soumettre)
    - Form : nombre de champs visibles d'un coup, hiérarchie claire ?
    - Champs conditionnels (selon technique sélectionnée) : transitions propres ?
    - Photo upload : draggable ? Preview ?
    - GPS auto : autorisation demandée ?
    - Confidentialité : choix par défaut clair ?
    - Bouton submit : visible sans scroll en mobile ?

21. /profil
    - Section "Ton profil de pêcheur" (PersonalScoreSection) : présente ?
    - Si compte Discovery vide de prises → empty state engageant ?
    - Form profil : modifications préservées ? Bouton save visible ?

22. Déconnexion
    - Où est le bouton déconnexion ? (Menu user en haut à droite ?)
    - Combien de clics pour se déconnecter ?
    - Redirige bien vers / ?

═════════════════════════════════════════════════════════════════════
PARTIE 5 — Compte Local (login redkps4+local@gmail.com)
═════════════════════════════════════════════════════════════════════

23. /carte avec tier Local
    - Tous les spots du dpt principal visibles avec coords précises (pas floutées) ?
    - Filtres actifs (pas grisés) ?
    - Bandeau upsell : ABSENT ?
    - Différenciation visuelle vs tier Discovery : claire ?

24. Filtres : sélectionne Espèce "Bar"
    - URL update ?
    - Markers filtrés en live ?
    - Compteur "X spots" en haut update ?
    - Reload (F5) : filtres persistent dans l'URL ?

25. /spot/{un slug du Finistère}
    - Coords précises visibles (pas "Coordonnées approchées") ?
    - Score d'activité 0-100 affiché ?
    - "Meilleurs moments" affichés sans dégradation tier ?

26. /carnet + log d'une vraie prise test
    - Logue une prise test "Bar 55cm, leurres, Pointe du Raz, privée"
    - La fiche détail s'ouvre-t-elle automatiquement ?
    - La prise apparaît-elle dans /carnet à la liste ?
    - SUPPRIME ENSUITE cette prise test (via menu actions sur la fiche)

═════════════════════════════════════════════════════════════════════
PARTIE 6 — Compte Itinérant (login redkps4+itinerant@gmail.com)
═════════════════════════════════════════════════════════════════════

27. /carte
    - Dropdown département actif : on peut switcher 29 → 83 ?
    - Switch dpt : carte se recentre ?
    - Tous les départements côtiers FR accessibles ?

28. "Spots autour de moi" tier Itinérant
    - Jusqu'à 50 résultats ?
    - Tri pertinent (par distance ou score) ?

═════════════════════════════════════════════════════════════════════
PARTIE 7 — Stress tests UX
═════════════════════════════════════════════════════════════════════

29. Connexion lente (Network throttling Slow 3G dans DevTools)
    - Recharge la home : que vois-tu pendant que ça charge ? Skeleton ? Spinner ? Page blanche ?
    - Recharge /carte : la carte affiche un skeleton ? Les markers pop d'un coup ou progressivement ?
    - Recharge /spots/pointe-du-raz : layout shift visible ?

30. Erreur réseau simulée (Offline dans DevTools)
    - Recharge n'importe quelle page connectée : message d'erreur ? Page blanche ?
    - Si un offline mode est attendu (sprint 16+, donc PAS encore) : "non implémenté, normal" → SKIP

31. Mauvais formulaires
    - /auth/login : email invalide → message d'erreur clair en français ?
    - /carnet/nouvelle : skip un champ requis → validation client ? Message clair ?
    - /profil : pseudo "a" (1 caractère) → message d'erreur ?

32. Liens externes
    - Sur fiche spot, click "Itinéraire GPS · Google Maps" → ouvre dans un nouvel onglet ?
    - Lien "Windy" : ouvre dans nouvel onglet, target=_blank rel=noopener ?

═════════════════════════════════════════════════════════════════════
PARTIE 8 — Inspirations / benchmarks rapides
═════════════════════════════════════════════════════════════════════

33. Compare 5 minutes avec https://spot-de-peche.com/
    - Qu'est-ce qu'ils font mieux que Carnet de Pêche ?
    - Qu'est-ce que Carnet de Pêche fait mieux ?
    - Donne 3 features qu'ils ont que Carnet de Pêche pourrait piquer (sans copier l'UX)

═════════════════════════════════════════════════════════════════════
RAPPORT FINAL — structure obligatoire
═════════════════════════════════════════════════════════════════════

Tu vas produire un rapport en 6 sections. Sois CONCRET, donne des exemples avec screenshots, et priorise tes recommandations.

## 1. Première impression (3 paragraphes max)
- Ressenti global après 10 min de navigation anonyme
- Note sur 10 (avec justification en 2 phrases)
- Le produit "fait pro" ou "fait amateur" ? Pourquoi ?

## 2. Top 10 opportunités d'amélioration (PRIORISÉES)
Tableau avec 6 colonnes :
| # | Page/Flow | Problème observé | Recommandation | Effort estimé (S/M/L) | Impact (S/M/L) |

Trie par impact décroissant. Au moins 10 lignes, idéalement 15-20.

## 3. Friction parcours (par parcours)
- Anonyme → "Je veux comprendre ce que c'est"
- Anonyme → "Je veux m'abonner"
- Discovery → "Je veux voir si ça vaut le coup d'upgrade"
- Local → "Je veux loguer ma première prise"
- Local → "Je veux retrouver mon spot fétiche"
Pour chaque : noter (a) là où ça coule, (b) là où ça frotte, (c) point d'abandon probable.

## 4. Copy & tone
- 5 phrases qui marchent particulièrement bien (avec emplacement)
- 5 phrases à reformuler (avec emplacement + suggestion)
- 3 mots/concepts qui sont peu clairs pour un pêcheur non-tech

## 5. Mobile vs desktop
- 3 forces mobile
- 3 faiblesses mobile
- 3 forces desktop
- 3 faiblesses desktop

## 6. Quick wins (les choses < 2h à corriger)
Liste de 5-10 corrections qui demanderaient moins de 2h chacune et qui amélioreraient significativement le ressenti.

## 7. Bugs critiques rencontrés (s'il y en a)
- Liste avec URL, comportement attendu vs observé, screenshot, erreurs console

## 8. Verdict final (1 paragraphe)
- État global du produit en mai 2026
- Maturité perçue (alpha / beta / prod-ready)
- Recommandation : faut-il prioriser tel ou tel chantier UX avant le sprint suivant ?
```

---

## Comment utiliser le rapport rendu par Claude in Chrome

1. **Sauvegarder** le rapport dans `docs/audits/ux-discovery/{date}-claude-chrome.md` (créer le dossier si besoin)
2. **Croiser** avec le dernier audit auto (`docs/audits/AUDIT-{date}.md`) : les deux doivent converger sur les gros points
3. **Insérer dans le brief du prochain sprint** : reprendre la section "Quick wins" + Top 5 opportunités dans le brief actif
4. **Refaire le run** :
   - Après chaque sprint majeur (8, 9, 10, 11) — pour mesurer l'impact
   - Avant le Gate 1 (beta privée) — pour valider la prêteté
   - Avant le Gate 2 (lancement public) — pour le check final

---

## Variantes du prompt (pour adapter à des contextes spécifiques)

### Variante "audit éclair" (15 min)
Garde uniquement Parties 1, 2, 7 du prompt + sections 1, 2, 6, 8 du rapport. Utile en milieu de sprint.

### Variante "audit mobile only"
Garde Parties 2, 11-13 (mobile), 17 (mobile), 20 (mobile carnet), 23 (mobile carte Local). Rapport limité aux sections 5 et 6.

### Variante "audit funnel inscription"
Garde Parties 1 (sections 1-3) + 3 + 4 + 5 (sections 19-22). Focus rapport sur sections 3 et 6.

---

## Notes sécurité

- Les credentials des comptes test sont dans `docs/tests/comptes-test.md` (repo privé)
- Si tu rends le repo public un jour, change le password commun ET retire les emails de ce doc
- Claude in Chrome a accès à TON browser → il peut voir tes cookies, ton historique, tes onglets. Lance-le idéalement dans un profil Chrome dédié ou en mode test isolé
- Ne JAMAIS donner à Claude in Chrome les credentials du compte admin Supabase, Vercel, ou Stripe

---

*Brief généré par Claude le 2026-05-20. Inspiré de la convention `docs/sprint-3.5/claude-in-chrome-test-brief.md`.*
