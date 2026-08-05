# Lot 0 — Assainissement du backlog (exécuté le 2026-08-05)

> GO John du 2026-08-05 (« Lot 0 maintenant »). Toutes les écritures = `moderation_status='rejected'` (réversible, aucune suppression). Backlog : **941 → 813 spots pending**.

## 1. Noms invalides rejetés : 94

Objets OSM qui ne sont pas des spots de pêche nommés : lettres seules de pontons/pannes de marina (A, B, C… W, Y, Z, E'), « Panne A/E/G/I/L/O/V3/W » (pontons de plaisance, pêche non praticable), « Quai A…J / Quai 6 / Quai 11 », noms numériques (2, 6, 11, 16), sigles (ADM, PC, PFM, QR1/4/5, Y.C.T), « Accueil » ×2, « Quai Accueil et Quai Armement », « Go ».
Prédicat SQL exact dans le journal de session (regex lettres/pannes/quais + liste nominative).

## 2. Doublons exacts du catalogue curé rejetés : 15

Import à < 400 m d'une fiche curée désignant le même poste : Cap Couronne (13) · Pointe Rouge, môle (13) · Pointe du Raz (29) · Pointe Saint-Mathieu (29) · Pointe de Dinan (29) · Pointe du Moulinet (22) · Cap Fréhel (22) · Pointe du Grouin (35) · Pointe de Chassiron (17) · Pointe Saint-Gildas (44) · Cap Lihou = Pointe du Roc (50) · Digue de Socoa (64) · Môle Saint-Louis (34) · Cap Béar (66).

**Gardés au backlog malgré la proximité d'un curé** (postes distincts, à trancher en lot éditorial) : Pointe de la Torche (vs plage), Cap Câble (vs Port-Miou), Pointe aux Chevaux (vs Gourmalon), Embarcadère Niolon, Wharf de la Salie (vs plage), Hegoaldeko kaia (vs baie de Txingudi), Digue des Cavaliers (vs embouchure Adour), Jetées nord/sud de Canet, Cap de la Corniche (vs plage du Lazaret), Pointe Rouge pointe rocheuse (vs môle), Pointe de Trénaouret (vs anse de Térénez).

## 3. Doublons internes rejetés : 19 (37 gardés)

Grappes même nom + même département à < ~300 m : 1 gardé (le plus ancien) par grappe. Noms concernés : Caisson Phoenix (14, 31 objets OSM sur 12 km → dédupliqué par grappe spatiale, le lot éditorial 14 tranchera pêchable/pas pêchable), Digue (29), Digue du Nouveau Monde (17), Flotteurs Whale (14), La Cale (22), Pointe de la Jument (29), Pointe de la Loge (50), Pointe du Corbeau (29), Pointe du Grouin (14), Pointe du Rocher (17), Pointe du Vieux Château (56), Port de plaisance du Tréport (76), Quai du Mas Coulet (34). Les homonymes distants (vrais lieux différents) sont gardés et seront renommés avec leur toponyme en lot éditorial.

## 4. Normalisation hazards (fiches existantes) : 3 lignes

`sentier_exposé` → `sentier_expose`, `courants` → `courants_forts` (vocabulaire canonique du playbook §2.3).

## Backlog net par département (2026-08-05, après lot 0)

29→208 · 56→108 · 13→94 · 22→78 · 50→54 · 17→53 · 44→37 · 14→34 · 66→26 · 35→23 · 62→22 · 83→19 · 33→15 · 76→13 · 34→12 · 64→7 · 40→5 · 11→2 · 59→2 · 30→1. **Total : 813.**
