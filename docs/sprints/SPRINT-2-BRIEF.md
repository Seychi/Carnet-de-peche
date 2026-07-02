# 🛠️ Sprint 2 — Polish & fondations publiques

> Sprint d'1 semaine. Objectif : transformer le squelette auth/onboarding en site **prêt à recevoir des inscriptions publiques** légalement et visuellement.

---

## 🎯 Objectif

À la fin du sprint 2, on doit pouvoir :

1. **Inviter 10 testeurs externes** sans honte → toutes les pages publiques sont propres, cohérentes, mobile-first
2. **Être conforme RGPD/LCEN** → mentions légales, politique de confidentialité, CGU en ligne
3. **Onboarder un user du clic landing au /home** → parcours fluide sans rupture visuelle
4. **Permettre à un user de consulter et éditer son profil** → page `/profil` minimale fonctionnelle

**Hors scope (sprint 3+)** : carnet de pêche CRUD, carte interactive MapLibre, paiements Stripe, feed social, modération.

---

## 📋 Backlog priorisé (5 jours dev)

### Jour 1-2 — Pages légales + footer (DÉBLOQUE LE PUBLIC)

**Tâche 2.1 — Footer global**

Crée `components/layout/Footer.tsx` utilisé sur toutes les pages (intégrer dans `app/layout.tsx` racine sous `{children}`).

Structure :
- Colonne 1 (logo + tagline) : "Carnet de Pêche — Logue. Partage. Progresse."
- Colonne 2 (Produit) : Carte, Spots populaires, Guides, Tarifs
- Colonne 3 (Communauté) : Fil régional, Espèces, Techniques
- Colonne 4 (Légal) : Mentions légales, Confidentialité, CGU, Contact
- Bandeau bas : `© 2026 Carnet de Pêche · Tous droits réservés` + liens sociaux (Instagram, TikTok, YouTube en `aria-label`, icônes lucide-react)

Style : fond `bg-ink-900`, texte `text-ink-50/80`, padding `py-16`, max-width container 1280px.

**Tâche 2.2 — Page `/legal/mentions-legales`**

Crée `app/legal/mentions-legales/page.tsx`.

Contenu obligatoire (LCEN article 6) :
- **Éditeur** : nom de l'entreprise (à compléter par John : EI / SASU / micro), adresse postale, email contact
- **Directeur de publication** : John [Nom de famille]
- **Hébergeur** : Vercel Inc., 340 S Lemon Ave #4133, Walnut, CA 91789, USA — site : vercel.com
- **Hébergeur BDD** : Supabase Inc., 970 Toa Payoh North #07-04, Singapore 318992
- **Service emails** : Resend Inc., 2261 Market Street #5039, San Francisco, CA 94114, USA
- **Conditions d'usage** : pêche dans le respect de la réglementation française (tailles minimales, périodes, quotas)

⚠️ Laisse des placeholders `[À COMPLÉTER PAR JOHN]` pour les infos perso. John remplira dans un 2e commit.

**Tâche 2.3 — Page `/legal/confidentialite`**

Crée `app/legal/confidentialite/page.tsx`.

Sections RGPD obligatoires :
1. **Responsable du traitement** : nom, adresse, email DPO (peut être le même que founder en early stage)
2. **Données collectées** :
   - Identité : pseudo, email, département, fréquence de pêche
   - Préférences : espèces ciblées, techniques
   - Données techniques : adresse IP, user-agent, cookies de session
   - Contenu : prises loguées, photos, posts du fil régional, coordonnées GPS (floutées 1 km par défaut)
3. **Finalités** : fournir le service, modérer le contenu, améliorer le produit, envoyer les emails transactionnels (jamais marketing sans opt-in séparé)
4. **Base légale** : exécution du contrat (CGU acceptées) + intérêt légitime (modération anti-spam) + consentement (notifications push, marketing futur)
5. **Sous-traitants** : Supabase (hébergement DB UE-Frankfurt), Resend (emails UE), Vercel (hosting US — clauses contractuelles types), Open-Meteo (API publique sans données perso)
6. **Durée de conservation** : compte actif → indéfiniment, compte inactif > 3 ans → suppression auto, sauvegardes → 30 jours
7. **Droits** : accès, rectification, suppression, portabilité, opposition → email `contact@carnet-de-peche.com`
8. **Cookies** : session Supabase (technique, exempté), Plausible analytics (anonymisé, exempté de consentement), pas de tracking publicitaire
9. **CNIL** : droit de plainte auprès de la CNIL → cnil.fr

**Tâche 2.4 — Page `/legal/cgu`**

Crée `app/legal/cgu/page.tsx`. Structure type :
1. Objet et acceptation
2. Inscription et compte (1 compte par personne physique, 18+ ou autorisation parentale)
3. Contenu utilisateur (UGC) : tu restes propriétaire, tu nous donnes une licence non-exclusive d'affichage
4. Règles de la communauté : pas de spot-burning, pas d'incitation au braconnage, respect des tailles légales
5. Modération : nous pouvons supprimer tout contenu enfreignant les règles ou la loi
6. Abonnements payants (préparer pour sprint 4) : prix HT/TTC, durée, renouvellement automatique, rétractation 14 jours
7. Responsabilité : informations communautaires données à titre informatif, vérifier soi-même la réglementation
8. Modification des CGU : préavis 30 jours, opposition possible
9. Droit applicable : droit français, juridiction compétente

**Tâche 2.5 — Composant `<LegalLayout>`**

Crée `components/layout/LegalLayout.tsx` réutilisé par les 3 pages légales :
- Container `max-w-3xl mx-auto px-6 py-16`
- H1 propre, table des matières sticky à droite sur desktop (`<aside>` `lg:block hidden`)
- Prose typography (Tailwind `prose prose-slate`)
- Date de dernière mise à jour en haut : `Dernière mise à jour : [DATE]`

---

### Jour 3-4 — Pages publiques marketing

**Tâche 2.6 — Page `/tarifs`**

Convertir `maquette/tarifs.html` en `app/tarifs/page.tsx` avec composants React. Structure :

- Hero : "3 formules. Aucune complexité." + sous-titre
- 3 cards côte-à-côte (desktop) / stack vertical (mobile) :
  - **Découverte** (gratuit, gris doux) — 7 features, CTA "Démarrer gratuitement" → `/auth/login`
  - **Local** (4,90 €/mois, bleu marine, **highlighted** "Le plus populaire") — 9 features, CTA "Essayer 14 jours"
  - **Itinérant** (9,90 €/mois, gradient bleu→émeraude) — 13 features, CTA "Essayer 14 jours"
- Toggle mensuel / annuel (-17% sur annuel)
- Section FAQ tarifs : 6 questions (résiliation, période d'essai, paiement sécurisé, départements couverts, remboursement, B2B fédérations)
- CTA final : "Pas convaincu ? Loguer ta première prise est gratuit, sans CB."

⚠️ Le CTA "Essayer 14 jours" ne fait RIEN pour l'instant (placeholder pour sprint 4 Stripe). Affiche un toast "Disponible bientôt" au clic.

**Tâche 2.7 — Page `/carte` (placeholder propre)**

Crée `app/carte/page.tsx`. **Pas de map interactive en sprint 2** (c'est sprint 5). À la place :

- Hero : "La carte qui apprend"
- Visual statique : screenshot de la mockup avec spots, scores, filtres (peut être un PNG dans `/public/images/carte-preview.png`)
- 3 bullets : "Score 0-100 calibré sur les vraies prises" / "Filtres espèces + techniques" / "Couches météo et marées"
- CTA "Démarrer gratuitement" → `/auth/login`
- Sous-CTA "Voir comment ça marche" → ancre vers une section "Comment ça marche" en 4 étapes
- Badge en haut : "Carte interactive disponible en juin 2026" (gère les attentes)

**Tâche 2.8 — Page `/spots` (annuaire SEO)**

Crée `app/spots/page.tsx`. Objectif principal : **SEO**.

- Hero : "Les spots de pêche du bord en France"
- Filtres : par département (dropdown), par espèce (chips multi-select)
- Grille de 12 cards par défaut (paginated) : nom du spot, département, photo placeholder, 3 espèces phares, score 0-100, badge "Premium" si visibility=subscriber
- Cards cliquables → `app/spots/[slug]/page.tsx` (à scaffolder mais SSR avec contenu placeholder pour l'instant)
- Mention "Coordonnées précises réservées aux abonnés Local/Itinérant"
- Hot-fix : seul `seed.sql` injecte 10 spots Bretagne — l'annuaire affichera donc 10 résultats. C'est OK pour la beta.

**Tâche 2.9 — Page `/guides` (SEO content)**

Crée `app/guides/page.tsx`. Liste de guides éditoriaux. Pour le sprint 2, on crée juste **3 articles fondateurs** :

1. `app/guides/peche-au-bar-au-leurre/page.tsx` — 1500 mots, MDX si possible
2. `app/guides/peche-a-la-dorade-royale-au-surfcasting/page.tsx`
3. `app/guides/les-meilleurs-spots-de-peche-en-bretagne/page.tsx`

Structure de chaque guide :
- Hero avec titre H1 + sous-titre + date + temps de lecture
- Image héro
- Sommaire automatique (généré depuis les H2)
- Corps : H2, H3, paragraphes, listes, citations
- CTA encart au milieu : "Logue ta prochaine prise de bar → Crée ton carnet gratuit"
- CTA final : "Lire le guide suivant" + "Crée ton carnet"
- Footer schema.org Article markup (JSON-LD)

⚠️ Le contenu de ces 3 articles, c'est **toi qui le rédiges, pas Claude Code** (ou tu le commandes à César/Rôle B). Claude Code crée juste les fichiers avec du Lorem ipsum + la structure technique.

---

### Jour 5 — Profil + navigation cleanup

**Tâche 2.10 — Page `/profil`**

Crée `app/(app)/profil/page.tsx`. Vue protégée par middleware (déjà en place).

Sections :
- Avatar (cercle, initiales du pseudo en fallback si pas d'image)
- Pseudo + email (read-only sur l'email)
- Bio (max 200 chars, optionnelle, à créer en DB : `profiles.bio text`)
- Département (éditable via dropdown)
- Espèces ciblées (multi-select)
- Techniques (multi-select)
- Fréquence (radio)
- Notifications push (toggle)
- Bouton "Mettre à jour" → server action `updateProfile()`
- Section danger : "Supprimer mon compte" → modal de confirmation → suppression hard via RPC `delete_my_account()` (à créer en SQL)

**Tâche 2.11 — Header mobile fix + menu utilisateur**

Reprendre `components/layout/Header.tsx` :
- Si user connecté : afficher avatar+pseudo en haut à droite (au lieu de "Connexion / Créer mon carnet")
- Click sur avatar → dropdown : Mon profil, Mon carnet (placeholder), Paramètres (placeholder), Déconnexion
- Mobile : burger contient les mêmes liens + avatar en haut du drawer

**Tâche 2.12 — Page 404 et 500**

- `app/not-found.tsx` : visuel poisson sympa + texte "Cette page a glissé du hameçon" + bouton retour home
- `app/error.tsx` : "Le moulinet s'est cassé. Réessaie ou contacte-nous" + bouton "Recharger" + bouton "Retour"

---

## ✅ Definition of Done

Le sprint 2 est terminé quand :

- [ ] Les 3 pages légales sont en ligne, accessibles depuis le footer, RGPD-compliant
- [ ] `/tarifs`, `/carte`, `/spots`, `/guides` sont en ligne et responsive sur 4 viewports (375, 430, 768, 1280)
- [ ] Les 3 guides foundation sont scaffoldés (contenu Lorem accepté)
- [ ] `/profil` permet de voir et éditer ses infos onboarding
- [ ] Le header affiche l'avatar/pseudo de l'utilisateur connecté avec un dropdown menu
- [ ] Pages 404 / 500 fonctionnent et sont jolies
- [ ] **QA Phase 1-2-3** repasse en vert (zéro régression sur l'auth)
- [ ] `pnpm build` + `pnpm typecheck` + `pnpm lint` passent
- [ ] Push sur main → Vercel deploy → smoke test sur `https://carnet-de-peche.com`

---

## 📦 Fichiers à créer (récap)

```
app/
├── legal/
│   ├── mentions-legales/page.tsx
│   ├── confidentialite/page.tsx
│   └── cgu/page.tsx
├── tarifs/page.tsx
├── carte/page.tsx
├── spots/page.tsx
├── spots/[slug]/page.tsx
├── guides/page.tsx
├── guides/peche-au-bar-au-leurre/page.tsx
├── guides/peche-a-la-dorade-royale-au-surfcasting/page.tsx
├── guides/les-meilleurs-spots-de-peche-en-bretagne/page.tsx
├── (app)/profil/page.tsx
├── (app)/profil/actions.ts
├── not-found.tsx
└── error.tsx

components/
├── layout/
│   ├── Footer.tsx
│   ├── LegalLayout.tsx
│   └── Header.tsx (mise à jour)
└── ui/
    └── (composants shadcn à ajouter si besoin : dropdown-menu, avatar, separator)

public/
└── images/
    ├── carte-preview.png
    └── og-image-default.png
```

### Migration DB nécessaire

`supabase/migrations/005_profile_extension.sql` :
```sql
alter table public.profiles
  add column if not exists bio text check (char_length(bio) <= 200),
  add column if not exists avatar_url text;

-- RPC suppression compte (cascade géré par RLS + ON DELETE CASCADE des FK)
create or replace function public.delete_my_account()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  delete from auth.users where id = auth.uid();
end;
$$;

revoke all on function public.delete_my_account() from public;
grant execute on function public.delete_my_account() to authenticated;
```

---

## 🎨 Design system rappel (à respecter partout)

Tu as déjà ces tokens dans `globals.css`. Ne dérive pas, utilise-les tels quels :

| Token | Usage |
|---|---|
| `--ink-900` (#0A2F3D) | Texte principal, fond dark sections |
| `--ink-50` (#F8FAFC) | Fond clair |
| `--brand-600` (#0F766E) | Émeraude — CTAs secondaires, accents |
| `--brand-400` | Hover, focus rings |
| `--accent-400` (#F59E0B) | Badges "Populaire", étoiles |
| Police titres | Geist, weights 600/700 |
| Police corps | Geist, weight 400 |
| Border radius | 12px par défaut sur cards, 8px sur boutons |

Toutes les pages publiques : `<Header />` au-dessus, `<Footer />` en-dessous, container `max-w-7xl mx-auto px-6`.

---

## 🚦 Workflow recommandé

1. **Crée une branche** par chunk : `feat/sprint2-legal`, `feat/sprint2-tarifs`, etc. (ou tout sur `main` si tu pushes vite, à toi)
2. **Commits atomiques** : 1 page = 1 commit minimum
3. **Smoke test après chaque jour** : ouvre l'URL en incognito sur mobile + desktop
4. **QA Phase 1-2-3 en fin de sprint** : Claude in Chrome avec le script `QA-CHECKLIST.md`
5. **Tag la release** : `git tag v0.2.0` au moment du push final → utile pour rollback plus tard

---

## 💡 Anti-piège classique

- **Ne perds pas 2 jours sur le design system**. Tu as déjà 80% de ce qu'il faut. Si un composant manque (genre Avatar ou DropdownMenu shadcn), `pnpm dlx shadcn@latest add avatar dropdown-menu` et tu passes à la suite.
- **Le contenu légal n'est PAS du copywriting créatif**. C'est juridique, structuré, conservateur. Reste sobre.
- **Les 3 guides SEO en Lorem c'est OK pour le sprint 2**. On les rédigera proprement en sprint 2.5 ou via César. L'important c'est que la structure SSR/MDX/JSON-LD soit prête.
- **N'attaque pas la map MapLibre maintenant.** Tu auras envie. Résiste. C'est sprint 5.

---

## 📈 Après le sprint 2

Tu auras un site **public, légal, beau, sans crash**. À ce moment-là :

1. **Lance la beta privée** : invite 5-10 pêcheurs de ton réseau, observe les frictions de l'onboarding et du profil
2. **Sprint 3 — Carnet de pêche CRUD** (2 semaines) : la fonctionnalité qui fait vivre l'app
3. **Sprint 4 — Stripe + paiements** (1 semaine)
4. **Sprint 5 — Carte MapLibre v1** (3 semaines, le gros morceau)

---

*Dernière mise à jour : mai 2026. Préparé par Claude pour John.*
