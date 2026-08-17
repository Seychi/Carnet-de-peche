import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import path from 'node:path'

/**
 * ★ SPRINT 86, Blocs 1 et 2 — « le dernier mètre » du tunnel sans compte.
 *
 * Ce que ce fichier verrouille, et pourquoi il lit la SOURCE :
 *
 * L'environnement Vitest de ce dépôt est `node` (pas de jsdom, pas de
 * `@testing-library`), et `CatchForm` est un composant client qui monte
 * `useRouter`, `useSearchParams`, `react-hook-form`, GSAP et MapLibre par
 * ricochet : on ne peut pas le rendre ici. On verrouille donc le CONTRAT dans le
 * texte du composant, exactement comme `catch-log-abandoned.test.ts` le fait
 * depuis le sprint 81. Le comportement réel, lui, est couvert par
 * `e2e/09-brouillon-anonyme.spec.ts` (Playwright, stack locale).
 *
 * Deux choses sont protégées ici, dans cet ordre d'importance :
 *
 *  1. ★★★ **Le mode connecté n'a rien vu changer.** Un seul fichier de ~1 900
 *     lignes sert les deux modes. C'est le risque principal du sprint : chaque
 *     construction nouvelle doit être gardée par `anonymousDraft`, et les
 *     libellés / le chemin de soumission d'un inscrit doivent être intacts.
 *
 *  2. Le parcours anonyme est réduit à UNE action, et le brouillon COOKIE
 *     survit — c'est le piège du sprint : supprimer le bouton ne doit pas
 *     supprimer le mécanisme, sinon l'inscription différée des sprints 77-78
 *     meurt et « Ta prise de bar à … t'attend » disparaît de /auth/register.
 */

const SOURCE = readFileSync(path.resolve(__dirname, '..', 'CatchForm.tsx'), 'utf8')

/** Source hors commentaires : le POURQUOI d'un correctif cite forcément l'ancien état. */
const CODE = SOURCE.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '')

/** Corps du composant, à partir de sa déclaration (exclut les constantes de tête). */
const BODY = SOURCE.slice(SOURCE.indexOf('export function CatchForm'))

// ─────────────────────────────────────────────────────────────────────────────
// ★ 1. NON-RÉGRESSION DU MODE CONNECTÉ
// ─────────────────────────────────────────────────────────────────────────────

describe('★ le mode connecté est intact', () => {
  it('garde ses trois libellés de soumission, mot pour mot', () => {
    expect(CODE).toContain("idle: 'Loguer la prise'")
    expect(CODE).toContain("idle: 'Enregistrer'")
    expect(CODE).toContain("saving: 'Sauvegarde…'")
    expect(CODE).toContain("conditions: 'Conditions en cours…'")
  })

  it('choisit encore son libellé sur `submitPhase`, jamais sur l’état du brouillon', () => {
    // Le ternaire du footer n'a plus de branche `draftState` : un anonyme a UN
    // libellé, un inscrit garde ses tables indexées par phase.
    expect(CODE).toContain('? SUBMIT_LABELS_DRAFT')
    expect(CODE).toContain('SUBMIT_LABELS_EDIT[submitPhase]')
    expect(CODE).toContain('SUBMIT_LABELS[submitPhase]')
    expect(CODE).not.toContain("draftState === 'idle'")
  })

  it('garde intact le chemin de soumission d’un inscrit (mesure, photo, création, célébration)', () => {
    expect(CODE).toContain('if (data.is_measured && !photoFile && !data.photo_path)')
    expect(CODE).toContain('await uploadCatchPhoto(fd)')
    expect(CODE).toContain('await updateCatch({')
    expect(CODE).toContain('await createCatch({ ...data, photo_path: photoPath })')
    expect(CODE).toContain('analytics.catchLogCompleted({')
    expect(CODE).toContain('setCelebration(result.celebration)')
    expect(CODE).toContain("toast.success('Prise loguée !')")
  })

  it('n’écrit JAMAIS le cookie de brouillon pour un inscrit', () => {
    // Les deux seules écritures possibles sont gardées : celle de l'autosave par
    // `draftSpotId`/`draftSpotSlug` (undefined hors mode anonyme), celle de la
    // soumission par `anonymousDraft && spotContext`.
    const writes = CODE.match(/writePendingCatch\(/g) ?? []
    expect(writes).toHaveLength(2)
    expect(CODE).toContain('const draftSpotId = anonymousDraft ? spotContext?.id : undefined')
    expect(CODE).toContain('const draftSpotSlug = anonymousDraft ? spotContext?.slug : undefined')
    expect(CODE).toContain('if (!draftSpotId || !draftSpotSlug || !toSave.species) return')
    expect(CODE).toContain('if (anonymousDraft && spotContext) {')
  })

  it('garde les notes et la carte Confidentialité dépliées pour un inscrit', () => {
    // Notes : toujours réservées au mode connecté (le cookie ne transporte aucun
    // texte libre) — inchangé par ce sprint.
    expect(CODE).toContain('{!anonymousDraft && (')
    // Le dépliant de confidentialité n'existe QUE pour un anonyme…
    expect(CODE).toMatch(/\{anonymousDraft && \(\s*<button\s+type="button"\s+onClick=\{\(\) => setPreciseSettingsOpen/)
    // …et la classe `hidden` du conteneur ne peut pas s'appliquer hors de ce mode.
    expect(CODE).toContain(
      "anonymousDraft ? (preciseSettingsOpen ? ' mt-3' : ' hidden') : ''",
    )
  })

  it('ne compte aucune impression de mur pour un inscrit (le bloc n’est pas monté)', () => {
    // Le hook n'émet que si l'élément a un rectangle de rendu ; pour un inscrit
    // le bloc n'est pas rendu du tout, donc `ref.current` reste nul.
    expect(CODE).toContain("useSignupWallImpression(pendingWallRef, 'pending_catch')")
    expect(CODE).toContain('{anonymousDraft && spotContext && (')
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// 2. BLOC 1 — une seule action pour un visiteur sans compte
// ─────────────────────────────────────────────────────────────────────────────

describe('Bloc 1 — une seule action', () => {
  it('a un libellé unique qui dit où il mène', () => {
    expect(CODE).toContain("const SUBMIT_LABELS_DRAFT = 'Créer mon carnet et enregistrer'")
  })

  it('a supprimé les deux libellés du parcours en deux temps', () => {
    // Volontairement sur la source ENTIÈRE, commentaires compris : un libellé
    // mort qui traîne dans un commentaire de ce fichier est une fausse piste.
    expect(SOURCE).not.toContain('Garder ma prise en brouillon')
    expect(SOURCE).not.toContain('Mettre à jour mon brouillon')
  })

  it('n’a plus d’état « enregistré » : il n’y a plus rien à réhydrater', () => {
    expect(CODE).toContain("useState<'idle' | 'failed'>('idle')")
    expect(CODE).not.toContain("'saved'")
    // Le correctif de repli du rapport de QA ne doit PAS avoir été ajouté en plus
    // (ce serait de la dette immédiate : l'état qu'il réhydrate n'existe plus).
    //
    // ⚠️ L'assertion visait l'INITIALISEUR d'état, pas toute mention du helper :
    // écrite en `not.toContain('readPendingCatch')` elle interdisait aussi la
    // relecture de CONTRÔLE que la revue croisée a rendue nécessaire (sans elle,
    // `written` valait `true` alors que le navigateur avait refusé le cookie).
    // On interdit donc l'usage proscrit, pas le nom.
    expect(CODE).not.toMatch(/useState\([^)]*readPendingCatch/)
    expect(CODE).not.toMatch(/=\s*readPendingCatch\(\)\s*\?/)
  })

  it('★ ne quitte la page que si le cookie a été RELU (le refus est silencieux)', () => {
    // `writeCookie` pose `document.cookie` et renvoie `true` sans relire : un
    // navigateur qui bloque les cookies en fait un no-op sans exception. Sans
    // cette relecture, on naviguait vers /auth/register avec un cookie
    // inexistant et la prise était perdue en silence. Elle ferme aussi
    // l'asymétrie de validation : `onSubmit` n'appelait pas `safeParse`, et un
    // spot au slug non conforme (il en existe un, approuvé et public, en prod)
    // produisait un cookie illisible.
    expect(CODE).toContain('}) && readPendingCatch() !== null')
    const write = CODE.indexOf('const written =')
    const push = CODE.indexOf('router.push(buildSignupHref')
    const guard = CODE.indexOf('if (!written)')
    expect(write).toBeGreaterThan(-1)
    expect(guard).toBeGreaterThan(write)
    expect(push).toBeGreaterThan(guard)
  })

  it('écrit le brouillon EN CONTINU, validé, dans l’autosave déjà en place', () => {
    const effect = CODE.slice(CODE.indexOf('localStorage.setItem(DRAFT_KEY'))
    expect(effect.slice(0, 1200)).toContain('pendingCatchSchema.safeParse({')
    expect(effect.slice(0, 1200)).toContain('if (candidate.success) writePendingCatch(candidate.data)')
    // Le brouillon localStorage (mécanisme n°1, utile aussi aux connectés) reste.
    expect(CODE).toContain("const DRAFT_KEY = 'carnet:draft-catch'")
    expect(CODE).toContain('localStorage.setItem(DRAFT_KEY')
    // Dépendances d'effet PRIMITIVES : un objet rejouerait l'effet à chaque rendu.
    expect(CODE).toContain('}, [watch, isEdit, draftSpotId, draftSpotSlug])')
  })

  it('navigue vers l’inscription, en désactivant le bouton AVANT le départ', () => {
    const branch = CODE.slice(
      CODE.indexOf('if (anonymousDraft && spotContext) {'),
      CODE.indexOf('if (data.is_measured'),
    )
    const savingAt = branch.indexOf("setSubmitPhase('saving')")
    const pushAt = branch.indexOf('router.push(buildSignupHref(')
    expect(savingAt, 'le basculement en « saving » doit exister').toBeGreaterThan(-1)
    expect(pushAt, 'la navigation doit exister').toBeGreaterThan(-1)
    expect(
      savingAt,
      'sans `saving` posé AVANT, rien ne bouge pendant le chargement et le visiteur reclique',
    ).toBeLessThan(pushAt)
    expect(branch).toContain('router.push(buildSignupHref(`/spots/${spotContext.slug}`))')
  })

  it('émet l’impression par le hook unifié, jamais par un useEffect maison', () => {
    expect(CODE).toContain("useSignupWallImpression(pendingWallRef, 'pending_catch')")
    expect(CODE).not.toContain('signupWallViewed')
    expect(CODE).toContain("analytics.signupWallClicked({ surface: 'pending_catch' })")
    // La surface ne change pas de nom : la renommer casserait l'historique.
    // Deux usages exactement : l'impression au montage, le clic du footer.
    expect(CODE.match(/'pending_catch'/g) ?? []).toHaveLength(2)
  })

  it('ne navigue PAS quand le cookie est refusé, et ouvre un nouvel onglet', () => {
    const branch = CODE.slice(
      CODE.indexOf('if (anonymousDraft && spotContext) {'),
      CODE.indexOf('if (data.is_measured'),
    )
    const failAt = branch.indexOf("setDraftState('failed')")
    const pushAt = branch.indexOf('router.push(')
    expect(failAt).toBeGreaterThan(-1)
    expect(failAt, 'le cas d’échec doit sortir AVANT toute navigation').toBeLessThan(pushAt)
    expect(branch.slice(failAt, pushAt)).toContain('return')
    // Nouvel onglet : quitter cet onglet-ci effacerait la saisie.
    expect(CODE).toContain('target="_blank"')
    expect(CODE).toContain('rel="noopener noreferrer"')
  })

  it('ne fait plus défiler que dans le cas d’échec', () => {
    const scrolls = CODE.match(/getElementById\('catch-pending-wall'\)/g) ?? []
    expect(scrolls, 'un seul défilement, celui du cas « failed »').toHaveLength(1)
    const branch = CODE.slice(CODE.indexOf('if (anonymousDraft && spotContext) {'))
    const failAt = branch.indexOf("setDraftState('failed')")
    const scrollAt = branch.indexOf("getElementById('catch-pending-wall')")
    expect(scrollAt).toBeGreaterThan(failAt)
    // Le confort de cadrage posé au sprint 77 (le bloc ne passe pas sous le
    // footer collant) ne doit pas être dégradé.
    expect(CODE).toContain("scrollIntoView({ behavior: 'smooth', block: 'center' })")
    expect(CODE).toContain('scroll-mt-20')
  })

  it('fait du bloc une promesse permanente, sans lien ni bouton dans le cas nominal', () => {
    const wall = BODY.slice(
      BODY.indexOf('{anonymousDraft && spotContext && ('),
      BODY.indexOf('{/* ── Footer sticky ── */}'),
    )
    expect(wall).toContain('role="status"')
    expect(wall).toContain('aria-live="polite"')
    // Le composant `SignupWall` (qui porte un CTA) a disparu de ce fichier, import
    // compris — sans quoi le lint casse. Attention : `useSignupWallImpression`
    // contient la même sous-chaîne, on vise donc l'usage et l'import.
    expect(SOURCE).not.toContain('<SignupWall')
    expect(SOURCE).not.toContain("import { SignupWall }")
    expect(SOURCE).not.toContain('components/map/SignupBanner')
    // Le seul élément interactif du bloc est dans la branche d'échec.
    const nominal = wall.slice(wall.indexOf(') : ('))
    expect(nominal).not.toContain('<a ')
    expect(nominal).not.toContain('<button')
    expect(nominal).not.toContain('<Link')
    expect(nominal).toContain('PENDING_CATCH_PROMISES.map(')
  })

  it('promet trois choses vraies AU CHARGEMENT, avant toute saisie', () => {
    // ⚠️ « reportée telle quelle » a été retiré : le cookie ne porte PAS les deux
    // réglages fins de coordonnées, et `replayPendingDrafts` les force en dur. La
    // puce nomme donc ce qui voyage réellement.
    expect(CODE).toContain(
      'Ton espèce, ta taille, ta date et ta visibilité sont reportées, tu ne retapes rien',
    )
    expect(SOURCE).not.toContain('Ta saisie est reportée telle quelle')
    expect(CODE).toContain('Ton carnet garde tes prises et apprend de tes sorties')
    expect(CODE).toContain('C’est gratuit, sans carte bancaire, en 30 secondes')
    // Jamais « ton brouillon est prêt » : à l'ouverture, il n'y a rien à garder.
    expect(SOURCE).not.toContain('Ton brouillon est prêt')
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// 3. BLOC 2 — les réglages fins de coordonnées, repliés pour un anonyme
// ─────────────────────────────────────────────────────────────────────────────

describe('Bloc 2 — confidentialité au repos pour un anonyme', () => {
  it('replie par défaut, et laisse le contenu atteignable en un clic', () => {
    expect(CODE).toContain('const [preciseSettingsOpen, setPreciseSettingsOpen] = useState(false)')
    expect(CODE).toContain('aria-expanded={preciseSettingsOpen}')
    expect(CODE).toContain('aria-controls="catch-precise-settings"')
    expect(CODE).toContain('id="catch-precise-settings"')
    // `type="button"` : sans lui, le dépliant soumettrait le formulaire.
    const fold = CODE.slice(CODE.indexOf('setPreciseSettingsOpen((o) => !o)') - 200)
    expect(fold.slice(0, 260)).toContain('type="button"')
  })

  it('ne touche à AUCUNE valeur par défaut de confidentialité', () => {
    expect(CODE).toContain("privacy: draft?.privacy ?? 'public'")
    expect(CODE).toContain('precise_for_friends: draft?.precise_for_friends ?? true')
    expect(CODE).toContain('reveal_precise_to_public: draft?.reveal_precise_to_public ?? false')
    expect(CODE).toContain('checked={field.value ?? true}')
    expect(CODE).toContain('checked={field.value ?? false}')
  })

  it('garde hors du repli le choix de visibilité et l’encart « Ton coin reste ton coin »', () => {
    // Sprint 77, Bloc 8 : jamais un réglage de visibilité enterré derrière un
    // menu, surtout quand la valeur par défaut est « publique ». Le repli ne
    // couvre donc QUE les deux interrupteurs de coordonnées précises.
    const card = BODY.slice(
      BODY.indexOf('Section 7 : Notes & Confidentialité'),
      BODY.indexOf('id="catch-precise-settings"'),
    )
    expect(card).toContain('Qui voit cette prise')
    expect(card).toContain('Ton coin reste ton coin.')
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// 4. Invariants qui ne bougent pas
// ─────────────────────────────────────────────────────────────────────────────

describe('invariants', () => {
  it('ne met dans le cookie ni coordonnée, ni photo, ni note (RGPD, sprint 77)', () => {
    const writes = [
      CODE.slice(CODE.indexOf('pendingCatchSchema.safeParse({'), CODE.indexOf('if (candidate.success)')),
      CODE.slice(
        CODE.indexOf('const written = writePendingCatch({'),
        CODE.indexOf('submittedRef.current = true'),
      ),
    ]
    for (const payload of writes) {
      expect(payload).not.toContain('latitude')
      expect(payload).not.toContain('longitude')
      expect(payload).not.toContain('notes')
      expect(payload).not.toContain('photo')
      expect(payload).not.toContain('location_label')
    }
  })

  it('n’écrit toujours rien en base pour un anonyme (le brouillon est un cookie)', () => {
    const branch = CODE.slice(
      CODE.indexOf('if (anonymousDraft && spotContext) {'),
      CODE.indexOf('if (data.is_measured'),
    )
    expect(branch).not.toContain('createCatch')
    expect(branch).not.toContain('uploadCatchPhoto')
    expect(branch).not.toContain('supabase')
    expect(branch).not.toContain('fetch(')
  })
})
