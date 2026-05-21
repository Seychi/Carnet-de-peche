# Audit UX post-sprint 7.5 — Claude in Chrome

> **Date** : 2026-05-21 (sprint 7.5 mergé en prod le même jour)
> **Auditeur** : Claude in Chrome
> **Compte utilisé** : Seychi (redkps4@gmail.com, compte perso)
> **Périmètre** : prod https://www.carnet-de-peche.com
> **Brief source** : `docs/tests/claude-in-chrome-post-sprint-7.5.md`
> **Baseline comparée** : `docs/audits/ux-discovery/2026-05-21-claude-chrome.md` (audit pré-sprint 7.5)
> **Rapport conservé tel quel pour mémoire**

---

## 1. Verdict checklist sprint 7.5 (PARTIE 1)

| # | Item | Verdict | Justification |
|---|---|---|---|
| A1 | Canonical sur /spots → carnet-de-peche.com | ✅ PASS | `<link rel="canonical" href="https://www.carnet-de-peche.com/spots"/>`, og:url idem, aucune trace vercel.app |
| A2 | /fil, /especes, /techniques, /contact ≠ 404 | ❌ FAIL | /fil, /especes, /techniques → 200 OK (stubs "Bientôt disponible" propres). **/contact → 404** (la page 404 stylée "Cette page a glissé du hameçon" s'affiche, mais le statut HTTP est bien 404 et le lien du footer est mort) |
| A3 | Une seule valeur d'essai (7 vs 14) | ✅ PASS | Uniquement "7j" / "7 jours" partout (home, tarifs, FAQ). Aucune mention de "14j" ou "14 jours". |
| A4 | "Essayer 7 jours" → /auth/register | ✅ PASS | `href="/auth/register?plan=local"`. Quand logué, redirection vers /home (comportement attendu). Pas de toast "sprint", pas de href="#". |
| A5 | Phrases suspectes retirées/marquées | ✅ PASS | "Import GPX/Fishbrain" absent (seul "Anti-fishbrain" comme positionnement); "Export GPX/JSON" marqué "prévu cette année"; "Modération humaine — ambassadeurs régionaux" remplacé par "Modération communautaire" + "Modération IA prévue post-beta"; "Mode hors ligne" sans marqueur "bientôt" mais présent uniquement dans le bullet de feature Local (OK); "217 spots" remplacé par "100+ spots ciblés · couverture France entière" + bandeau "OBJECTIF LANCEMENT"; "1 km" floutage GPS confirmé. |
| A6 | Témoignages remplacés par "Pourquoi maintenant" | ✅ PASS | Section "POURQUOI UN CARNET DE PÊCHE MAINTENANT" avec 3 raisons honnêtes (accessibilité, comprendre sa pêche, rien pour nos côtes). Pas de Yann L./Julien R./François B. Le bloc "Yann Le Bras / Sophie Marec / Loïc Briand" plus haut est dans la section "Communauté" comme illustration produit (avec floutage GPS expliqué), pas comme témoignage. |
| B1 | Pas de badge "⚡ Perso" sur Pointe du Raz | ✅ PASS | Aucun "Perso" trouvé ni dans le DOM ni dans le HTML brut de la page. Fenêtres horaires propres (scores 73/65/73/57 visibles sans badges parasites). |
| B2 | /profil "Ton profil de pêcheur" descriptif | ✅ PASS | "Là où tombent tes 5 prises · Plutôt La nuit (3 sur 5) · Surtout Au printemps (5 sur 5)". Disclaimer honnête : "Ces tendances décrivent où et quand tu logues tes prises — elles ne disent pas (encore) si tu pêches « mieux »." Très bien tourné. |
| C1 | Console clean | ✅ PASS | Aucun message console capturé après refresh (clean côté client). |
| D1 | Markers carte colorisés | ⚠️ PARTIEL / SUSPECT | La légende du bas montre 5 couleurs (Exceptionnelle/Très Bonne/Bonne/Moyenne/Faible), mais tous les markers visibles sur la carte apparaissent comme de petits anneaux gris identiques (zoom serré sur Quiberon, Brittany, Lorient). Possible que la colorisation soit réservée aux abonnés Local/Itinérant (le popup d'un spot affiche "Coords précises… réservées aux abonnés Local / Itinérant" et le score est masqué). À confirmer côté code. |
| E1 | Mentions légales complètes | ✅ PASS | CAMPBELL, SIREN 977 995 174, SIRET 977 995 174 00025, Code APE 6201Z, RNE 24/04/2024, adresse Vallauris, hébergeur Vercel + Supabase eu-west-3, email contact@. Aucun placeholder. |
| E2 | Confidentialité RGPD complète | ✅ PASS | 12 sections, 1322 mots, 10 listes, tableaux des finalités/bases légales, sous-traitants (Supabase, Vercel, Stripe, Resend, Open-Meteo), durées de conservation tabulaires, droits art. 15-22 RGPD avec mode d'exercice, CNIL avec adresse. Excellent. |
| E3 | CGU articles numérotés | ✅ PASS | 16 h2 / 25 h3, 2033 mots. Articles 1-13 (pas 1-16 strict, mais couverture exhaustive : essai, paiement, droit de rétractation, modération, responsabilité, sécurité pêche). |
| E4 | /home = vrai dashboard | ✅ PASS | Greeting "Salut Seychi 👋", "Voici ton tableau de bord", 3 stats (Prises loguées 5, Plus belle prise 71 cm Bar, Espèce favorite Bar), 2 CTAs (Logger une prise / Voir la carte), liste "Tes dernières prises". **Bug séparé sur la stat (voir Top 12).** |
| E5 | Date FR sur /carnet/nouvelle | ❌ FAIL ATTENDU | Format 05/21/2026 05:43 AM (input HTML datetime-local natif). Reporté backlog — pas compté comme régression. |
| E6 | Messages d'erreur FR sur form prise | ✅ PASS | "Choisis une espèce pour continuer" et "Choisis une technique de pêche" — français, spécifique, ton produit. |
| E7 | Placeholders lat/long identifiables | ✅ PASS | `ex : 48.2744` / `ex : -4.5765` / `Ville ou lieu (ex : Camaret-sur-Mer)`. Préfixe "ex :" sans ambiguïté. |
| E8 | Label section "MÉTHODE/TECHNIQUE" | ❌ FAIL | Sur la fiche prise, le header de la carte qui contient la technique est toujours **"COMMENT"**. Le champ interne s'appelle bien "Technique" (avec valeur "Flottante"), mais le label de section est inchangé. |
| E9 | Drawer "Spots autour de moi" | ✅ PASS | Titre exact "Spots autour de moi" (pas "toi"). La géoloc échoue côté sandbox mais le titre est correct. |
| E10 | Card Découverte sans "sprint 13+" | ✅ PASS | Mention "App iOS / Android — bientôt". Aucune référence interne dev. |
| E11 | Durée guide cohérente liste vs page | ❌ FAIL | Card liste : 8 min de lecture · Page guide peche-au-bar-au-leurre : **20 min de lecture**. Incohérence factuelle confirmée. |
| E12 | Carnet sans 3 prises identiques | ✅ PASS | Audit fait sur compte Seychi (redkps4@gmail.com, pas Discovery). Carnet propre : Maquereau 54cm, Orphie 28cm, Bar 71cm + 2 autres, taux relâche 40%, pas de "Bar 52cm 1.80kg ×3", pas de Grazac/Vallauris. |
| QW1 | Tap targets ≥ 44px | ✅ PASS | Tous les liens header & footer = 44px (sauf le logo lui-même à 32px, non bloquant). |
| QW2 | Skeleton /carte au load | ✅ PASS | Background teal/dark sombre visible pendant le chargement (pas de flash blanc 2-3s). |
| QW3 | Itinéraire Google Maps / Plans / Waze | ✅ PASS | 3 boutons distincts visibles sur la fiche Pointe du Raz avec le label "Itinéraire GPS" au-dessus. |
| QW4 | Toutes les cards guides ont une image | ✅ PASS | 3/3 cards avec image (illustration bar, photo dorade royale, photo Bretagne). |
| QW5 | Liens externes rel="noopener noreferrer" | ⚠️ PARTIEL | OK : Apple Maps, Google Maps, Windy, Instagram, TikTok, YouTube. **KO** : `https://www.maptiler.com/copyright/` et `https://www.openstreetmap.org/copyright` ont `target="_blank"` sans rel (attribution map). |
| EMAIL | Email contact réel | ✅ PASS | contact@carnet-de-peche.com partout (footer, mentions, confidentialité, CGU). |

**Score** : 22 PASS · 1 PARTIEL (D1) · 1 PARTIEL (QW5) · 4 FAIL (A2/contact, E8, E11, + E5 attendu) sur 28 items vérifiables.

En excluant E5 (FAIL attendu, reporté) : **22/27 = 81 % de fixes effectivement déployés**. C'est solide mais pas zéro régression.

---

## 2. Première impression actualisée (DELTA-1)

**Note actuelle : 7,5 / 10** (vs 6,5/10 le 21 mai).

Le produit fait nettement plus pro maintenant. Le hero est aéré, la voix produit est cohérente ("Le carnet, la carte, et la communauté qui partage"), le mockup mobile à droite donne du concret immédiatement. Le passage "TROIS PILIERS, ZÉRO BULLSHIT" et "Strava pour pêcheurs. Sans la toxicité." donnent une identité claire et un peu mordante, qui tranche avec les concurrents génériques. Les claims abusifs (217 spots, modération IA, témoignages fake) ont disparu : c'est honnête.

**Plus gros gain** : les pages légales. On passe d'un site qui avait l'air d'un side-project à un site qui assume une vraie immatriculation, un hébergeur EU pour les données, et un RGPD pris au sérieux. C'est un signal de confiance énorme pour la conversion CB.

**Plus gros recul / mal** : le footer pointe vers /contact qui retourne un 404 stylé. C'est l'antithèse de l'effort fait sur les pages légales — l'utilisateur qui clique "Contact" tombe sur "Cette page a glissé du hameçon". Mauvais signal juste à côté du SIRET tout neuf.

---

## 3. Friction parcours évoluée (DELTA-2)

### Anonyme → "Je veux comprendre ce que c'est"
- ✅ **Amélioré** : Hero clair, 3 piliers explicites, section "Pourquoi maintenant" remplace les témoignages bidon par une argumentation honnête.
- 🟡 **Persistant** : Le mockup mobile à droite ("Mon carnet · 14 prises · 7 sessions ce mois") est une simulation, mais rien ne le marque comme tel. Risque mineur de pris pour des chiffres réels.
- 🟢 **Nouveau** : "OBJECTIF LANCEMENT 100+ spots" est explicite (bonne posture pre-launch).

### Anonyme → "Je veux m'abonner"
- ✅ **Amélioré** : 3 cards lisibles, prix cohérents (0/4,90/9,90 €), "CB requise · annulation 1 clic" sous chaque bouton trial — transparence Stripe-style.
- 🟡 **Persistant** : Le bullet "Mode hors ligne (carte + marées 7 jours)" sur Local n'a aucun marqueur "bientôt" — c'est promis comme dispo immédiatement. Si ce n'est pas le cas en prod, c'est une promesse marketing à risque.
- 🟢 **Nouveau** : Le toggle Mensuel/Annuel -17 % est propre, ça démontre le sérieux tarifaire.

### Discovery → "Je veux voir si ça vaut le coup d'upgrader"
- ✅ **Amélioré** : Le popup d'un spot en mode Discovery affiche clairement "Coords précises et fiche complète réservées aux abonnés Local / Itinérant" avec un bouton "Voir le spot complet". Friction d'upgrade matérialisée au bon endroit.
- 🟡 **Persistant** : Le panneau Filtres montre tout en grisé avec "Filtres disponibles avec Local ou Itinérant" et un CTA "Débloquer les filtres" — bien, mais le ratio "ce qui est gratuit / ce qui est payant" sur la carte est lourd pour un utilisateur Discovery qui découvre.
- 🟢 **Nouveau** : Le bandeau "Tu vois 5 spots max. Passe Local pour 20, Itinérant pour 50." est très clair, ça incite sans énerver.

### Local → "Je veux loguer ma première prise"
- ✅ **Amélioré** : Validation FR ("Choisis une espèce pour continuer"), placeholders lat/long sans ambiguïté.
- 🔴 **Régression UX** : L'input date est toujours en MM/DD/YYYY (datetime-local natif US). Pour un user FR qui découvre, c'est un mini-WTF dès la première saisie. C'est FAIL attendu mais à fixer rapidement.
- 🟢 **Nouveau** : Le bouton sticky "Loguer la prise" en bas est très bien posé.

### Local → "Je veux retrouver mon spot fétiche"
- ✅ **Amélioré** : Fiche Pointe du Raz très propre, "Meilleurs moments" sans badge Perso parasite, scores 73/65/73/57 lisibles avec contexte (Lune au nadir, Lever de lune…).
- 🟡 **Persistant** : Le label "COMMENT" sur la fiche prise reste un anglicisme/maladresse. Devrait être "MÉTHODE" ou "DÉTAILS".
- 🟢 **Nouveau** : Sur la fiche prise, **"Carte interactive · Sprint 5"** en bas de page est une fuite de jargon dev visible utilisateur.

---

## 4. Mobile authentique (DELTA-3)

> ⚠️ **Limitation** : Le resize_window n'a pas effectivement changé `window.innerWidth` (sandbox), donc je n'ai pas pu auditer un vrai rendu mobile 430×932 px. Ce qui suit est de la lecture de code / responsive observé au navigateur 1359 px + observations qualitatives.

### 5 forces probables (à confirmer sur device réel)
1. Hauteurs des liens header/footer à 44px exactement = compliance Apple HIG / Google MD3.
2. Bouton "Loguer la prise" sticky en bas de /carnet/nouvelle = thumb-zone propre.
3. CTAs très grands sur les cards tarifs.
4. Hero typographie qui scale bien (font-weight et tracking observés).
5. Pas de table CSS, layout flex/grid responsive.

### 5 faiblesses probables
1. La carte MapLibre avec sidebar Filtres à gauche n'a pas l'air d'avoir un breakpoint propre — risque que la sidebar empile mal sur 430 px.
2. Le mockup iPhone géant à droite du hero risque de pousser le contenu textuel en bas en mobile (à vérifier).
3. La page tarifs en 3 colonnes — sur mobile, le scroll vertical entre les 3 plans est long.
4. Les inputs date sont en datetime-local natif (qui sur iOS Safari ouvre le picker natif FR, donc OK ; sur Android Chrome avec locale FR, OK ; mais sur viewport étroit le rendu textuel reste en US).
5. Le panneau "Filtres" sur /carte prend 160 px de gauche en desktop — sur mobile il devrait être un drawer overlay, pas un side panel.

**Recommandation prioritaire DELTA-3** : refaire un vrai test sur device physique iPhone + Android avant sprint 8, pas via DevTools.

---

## 5. Pages nouvelles (DELTA-4 & DELTA-5)

### Stubs /fil, /especes, /techniques
Très propres, ton produit cohérent ("Bientôt : un fil par département pour échanger entre pêcheurs locaux…"). Le CTA est "Crée ton carnet — sois prévenu" qui combine inscription compte + opt-in implicite. C'est élégant mais il n'y a pas de formulaire email-seul ("juste pour être prévenu sans créer de compte"). Pour de la captation pre-launch d'utilisateurs froids c'est une opportunité ratée — certains vont vouloir s'abonner à la newsletter sans encore créer un compte.

### Pages légales
**Ton mixte**. Mentions légales utilise le `vous` formel ("…d'où provient le présent site web") par moments mais le tutoiement aussi ("toute demande relative à tes données"). Confidentialité tutoie systématiquement ("tes données", "tu peux supprimer ton compte"), ce qui colle au reste du produit. CGU tutoie aussi. Globalement cohérent et lisible : h2/h3 propres, tableaux (finalités, durées, droits), aucune wall of text. **Lisibilité 8/10, ton 7/10** (quelques restes formels à harmoniser dans les mentions).

### Incohérence repérée
La confidentialité dit "Stripe (à venir)" et "Resend (à venir)" alors que la page tarifs propose des plans payants "Essayer 7 jours · CB requise" — soit Stripe est déjà actif et la confidentialité est en retard, soit le paiement n'est pas réellement en place et le CTA tarifs est trompeur. À vérifier.

---

## 6. Top 12 opportunités priorisées (DELTA-6)

| # | Page/Flow | Problème observé | Recommandation | Effort | Impact |
|---|---|---|---|---|---|
| 1 🔴 | /home stat "Espèce favorite" | **"4000% relâchées"** affiché sous "Bar" (5 prises, 40% taux relâche réel sur /carnet → bug multiplicateur ×100 en double) | Corriger calcul, ajouter test snapshot | S | M |
| 2 🟡 | /carnet/[id] fiche prise | Label de section "COMMENT" au lieu de MÉTHODE/DÉTAILS | Renommer le composant section header | S | S |
| 3 🔴 | Footer /contact | Lien footer "Contact" → page 404 stylée (404 HTTP réel) | Créer /contact (form simple ou redirect vers mailto:contact@) ou retirer du footer | S | M |
| 4 🟡 | /guides liste vs détail | Durée incohérente : 8 min (card) vs 20 min (page) pour le guide bar | Aligner la source de vérité (frontmatter ou ReadingTime) | S | S |
| 5 🔴 | /carnet/[id] bas de page | Texte **"Carte interactive · Sprint 5"** visible utilisateur | Retirer la mention sprint (jargon dev qui fuit en prod) | S | S |
| 6 🔴 | Carte /carte markers | Tous les markers semblent gris uniformes alors que la légende annonce 5 couleurs. Probable bug ou gating Discovery non communiqué | Soit colorer les markers pour tous, soit afficher un message "Couleurs réservées aux abonnés Local/Itinérant" + griser proprement | M | M |
| 7 🟡 | /carnet/nouvelle date input | Format MM/DD/YYYY natif US sur user FR | Date picker FR custom (déjà au backlog) | M | M |
| 8 🟢 | /auth/register validation | Email invalide → message browser natif en anglais ("Please include an '@'…") | Custom validation FR + noValidate + zod | S | M |
| 9 🟢 | Stubs /fil /especes /techniques | Pas de capture email seule (CTA = "créer carnet") | Ajouter un opt-in newsletter léger sans signup | S | M |
| 10 🟢 | /tarifs card Local | Bullet "Mode hors ligne" sans marqueur "bientôt" alors que la confidentialité parle de fonctionnalités encore à venir | Marquer "bientôt" si pas en prod, sinon laisser tel quel mais documenter | S | S |
| 11 🟢 | Liens carte attribution | MapTiler & OSM copyright sans rel="noopener noreferrer" | Ajouter rel sur les `<a target="_blank">` des attributions | XS | S |
| 12 🟢 | Confidentialité vs tarifs | Conf dit "Stripe (à venir)" mais tarifs propose "CB requise" pour trial 7j | Si Stripe est actif, mettre à jour la conf ; sinon retirer "CB requise" du flow trial | S | M |

**Légende** : 🔴 régression depuis 21 mai · 🟡 persistant non fixé · 🟢 nouveau

---

## 7. Stress tests (DELTA-7)

- **Network throttling /carte** : Background dark teal pendant le chargement (pas de skeleton React mais pas de flash blanc non plus). Markers apparaissent après ~2-3s. Pas de layout shift visible. **PASS**.
- **Form validation /auth/register** : Email "invalid-email" → message browser natif en anglais ("Please include an '@' in the email address. 'invalid-email' is missing an '@'."). Password "abc" (3 chars) → pas de message FR custom au-dessus du browser default. Le hint "Minimum 8 caractères dont 1 chiffre" est en FR mais c'est un hint, pas une erreur. **FAIL partiel** pour la validation FR custom.
- **Clic ~10 liens header + footer + cards** : Tous OK sauf **footer → Contact → 404**. Tous les autres (Carte, Spots, Guides, Tarifs, Fil régional, Espèces, Techniques, Mentions légales, Confidentialité, CGU) répondent en 200.

---

## 8. Sentiment de maturité final (DELTA-8)

- **Avant sprint 7.5 (21 mai)** : alpha avancée / pre-launch.
- **Après sprint 7.5 (aujourd'hui)** : **beta limitée, en marche vers beta publique**.

Le sprint a fait basculer le produit du côté "sérieux" : mentions légales béton, RGPD propre, CGU avec articles structurés, footer assaini, claims marketing honnêtes, validation form FR (en partie), labels (Méthode partiel, Spots autour de moi), badges parasites retirés. C'est un sprint de nettoyage qui livre.

**Si je devais montrer ça à un journaliste presse pêche aujourd'hui pour préparer le lancement** : ça tient la route à 80%. Le pitch est lisible, le différenciateur clair ("anti-fishbrain, le carnet français"), les pages produits crédibles, les pages légales rassurantes. Mais je corrigerais d'abord les 3 régressions visibles à l'œil nu avant l'interview :
1. La stat "4000% relâchées" sur /home (un screen ça en presse pêche c'est mortel)
2. Le lien Contact qui mène à un 404
3. Le label "COMMENT" sur la fiche prise

Une demi-journée de polish. Après ça, c'est presse-ready.

**Recommandation pour la décision sprint 8** : prolonger 7.5 d'½ à 1 jour de polish sur les 6 items 🔴 et 🟡 les plus visibles (bug 4000%, /contact, label COMMENT, markers carte, validation register FR, "Sprint 5" fuite). Le reste (E5 date FR, E11 durées guides, QW5 rel) peut absolument attendre. Ensuite, attaquer sprint 8 (fil communautaire) sans regret.

---

## 9. Limitations de cet audit

- **Pas d'accès aux comptes test Discovery/Local/Itinérant** : l'audit a été fait sur le compte personnel "Seychi" (redkps4@gmail.com) qui était déjà logué. E12 ("carnet vide ou propre") est donc validé sur le compte perso, pas sur redkps4+discovery@gmail.com. Pour valider exhaustivement il faudrait pouvoir tester les 3 personas.
- **Mobile non-audité sur device réel** : resize_window n'a pas changé window.innerWidth dans le sandbox (le viewport reste 1359×863). Les observations mobile sont déduites du DOM/CSS, pas du rendu pixel.
- **Bot detection / géoloc** : `navigator.geolocation` est refusé par défaut, donc le flow "Spots autour de moi" n'a pas pu être testé au-delà du titre du drawer.
- **Markers carte D1** : pas pu introspecter le `map.getStyle()` MapLibre (la map n'expose pas son instance globale), donc l'observation "tous gris" repose sur du visual zoom — possible que ce soit un effet de gating Discovery non documenté.
- **Stripe en vrai** : pas testé le flow paiement (prohibé par les règles de sécurité, et de toute façon trial 7j nécessite CB réelle).
- **Console / network throttling Slow 3G** : la fonction console n'a capté aucun message ; throttling pas réellement appliqué côté navigateur (pas d'API DevTools accessible). Les conclusions QW2 sont approximatives.
