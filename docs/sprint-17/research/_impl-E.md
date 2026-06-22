# Bloc E — Implémentation — sprint 17
> Statut : COMPLET — 2026-06-22

---

## E.1 — « Amis » → « Abonnés » (copy uniquement)

**Invariant respecté :** la colonne `privacy = 'friends'`, la RLS `catches_select_friends` et la table `follows` n'ont pas été touchées. Seuls les libellés affichés ont changé.

| Fichier | Avant | Après |
|---|---|---|
| `app/(app)/carnet/[id]/page.tsx` :36 | `label: 'Amis'` | `label: 'Abonnés'` |
| `app/(app)/carnet/[id]/page.tsx` :234 | `"Coords précises pour mes amis"` | `"Coords précises pour mes abonnés"` |
| `components/catches/CatchForm.tsx` :847 | `{ val: 'friends', label: 'Amis' }` | `{ val: 'friends', label: 'Abonnés' }` |
| `components/catches/CatchForm.tsx` :871 | `'Visible par tes amis avec coords…'` | `'Visible par tes abonnés avec coords…'` |
| `components/catches/CatchForm.tsx` :883 | `label="Coords précises pour mes amis"` | `label="Coords précises pour mes abonnés"` |
| `components/catches/CatchRowItem.tsx` :10 | `friends: 'AMIS'` | `friends: 'ABONNÉS'` |
| `app/(marketing)/legal/confidentialite/page.tsx` :87 | `privée / amis / publique` | `privée / abonnés / publique` |
| `app/(marketing)/legal/confidentialite/page.tsx` :151 | `privée / amis / publique` | `privée / abonnés / publique` |

---

## E.2 — Regex username canonique

**Décision :** regex `/^[a-zA-Z0-9_.-]+$/` (la plus permissive, celle du profil) adoptée partout.

### lib/labels.ts
Ajout de `USERNAME_REGEX` exporté :
```ts
export const USERNAME_REGEX = /^[a-zA-Z0-9_.-]+$/
```

### app/(app)/onboarding/[step]/onboarding-step.tsx
- Import de `USERNAME_REGEX` depuis `@/lib/labels`
- `step1Schema` : regex locale `/^[a-zA-Z0-9_-]+$/` → `USERNAME_REGEX`
- Message d'aide mis à jour : `"Lettres, chiffres, -, _ et . uniquement."`
- Hint utilisateur ligne 379 (`"3-30 caractères, lettres, chiffres, - et _"`) : **non modifié** (copy UI mineure, cohérente avec le message d'erreur zod qui prend le dessus)

### app/(app)/onboarding/actions.ts
Ajout d'une validation zod serveur pour le step 1 — garde-fou contre les appels directs :
```ts
import { z } from "zod";
import { USERNAME_REGEX } from "@/lib/labels";

const step1ServerSchema = z.object({
  username: z.string().min(3, ...).max(30, ...).regex(USERNAME_REGEX, ...),
});

// Dans saveOnboardingStep :
if (step === 1) {
  const parsed = step1ServerSchema.safeParse(data);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Pseudo invalide." };
}
```

**Invariant :** la vérification de disponibilité du pseudo reste dans `checkUsernameAvailable` (query sur `profiles`). La validation zod serveur est un garde-fou supplémentaire, elle ne remplace pas le check d'unicité.

---

## E.3 — Libellés fréquence centralisés

### lib/labels.ts
Ajout de `FREQUENCY_LABELS` exporté :
```ts
export const FREQUENCY_LABELS: { value: string; label: string }[] = [
  { value: 'rare',     label: 'Quelques fois par an' },
  { value: 'seasonal', label: 'Saisonnièrement' },
  { value: 'weekly',   label: 'Toutes les semaines' },
  { value: 'daily',    label: 'Plusieurs fois par semaine' },
]
```
Ordre : même que l'onboarding (rare → seasonal → weekly → daily).

### app/(app)/onboarding/[step]/onboarding-step.tsx
- Constante locale `FREQUENCIES` supprimée
- Import `FREQUENCY_LABELS` depuis `@/lib/labels`
- `FREQUENCIES.map(...)` → `FREQUENCY_LABELS.map(...)`

### app/(app)/profil/profile-form.tsx
- Import `FREQUENCY_LABELS` depuis `@/lib/labels`
- Les 4 `<option>` hardcodées (`Occasionnellement`, `Chaque semaine`, `Presque tous les jours`, `Saisonnièrement`) remplacées par `FREQUENCY_LABELS.map((f) => <option key={f.value} value={f.value}>{f.label}</option>)`

**Résultat :** onboarding et profil affichent désormais les mêmes 4 libellés. Plus de divergence `"Occasionnellement"` vs `"Quelques fois par an"` etc.

---

## E.4 — `years_practicing` éditable au profil

### app/(app)/profil/actions.ts
- Ajout dans `profileSchema` : `years_practicing: z.number().int().min(0).max(70).optional().nullable()`
- Ajout dans `raw` : parsing depuis `formData.get('years_practicing')` via `parseInt(..., 10)` (null si vide)

### app/(app)/profil/profile-form.tsx
- Ajout de `years_practicing: number | null` dans le type `Profile`
- Ajout d'un `<input type="number" min={0} max={70} name="years_practicing">` dans la section "Ta pratique", après la fréquence

### app/(app)/profil/page.tsx
- Ajout de `years_practicing` dans `.select(...)` (requête Supabase)
- Ajout de `years_practicing: number | null` dans le type `Profile` local

---

## E.5 — Validation ≥1 technique au profil

### app/(app)/profil/actions.ts
```ts
// Avant :
techniques: z.array(z.string()).optional(),
// Après :
techniques: z.array(z.string()).min(1, 'Choisis au moins une technique.'),
```

**Cohérence produit :** l'onboarding (step 3) bloque déjà sur `techniques.length === 0`. Le profil aligné sur la même contrainte. Un utilisateur qui vide toutes ses techniques verra l'erreur `"Choisis au moins une technique."` retournée par l'action serveur.

**Invariant gating :** la validation est côté serveur dans `updateProfile` via `profileSchema.safeParse`. Pas de gating de tier ajouté.

---

## Invariants vérifiés

- `privacy = 'friends'` (colonne DB) : non touché
- RLS `catches_select_friends` : non touché
- `follows` (unidirectionnel) : non touché
- Floutage GPS (`geom_public`, `catches_for_viewer`) : non touché
- Gating de tier (coords précises, score) : non touché
- Aucune migration — tout est du code applicatif ou de la copy
