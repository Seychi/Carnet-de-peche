import 'server-only'
import * as React from 'react'
import { createServiceRoleClient } from '@/lib/supabase/service-role'
import { getEmailRecipient, type EmailRecipient } from '@/lib/email/recipient'
import { sendEmail } from '@/lib/email/send'
import { captureServerEvent } from '@/lib/analytics/server'
import { getDeptNextWindow, getDeptUpcomingWindows } from '@/lib/conditions/dept-window'
import { DEPARTMENT_LABELS } from '@/lib/geo/departments'
import { formatWindowWhen, isParisWeekend } from './dates'
import { ONCE_SENT_KEY, type LifecycleKind } from './kinds'
import WelcomeEmail from '@/emails/welcome'
import FirstWindowEmail from '@/emails/first-window'
import FirstCatchNudgeEmail from '@/emails/first-catch-nudge'
import ImportNudgeEmail from '@/emails/import-nudge'
import WeeklyWindowEmail from '@/emails/weekly-window'
import type { FishingWindow } from '@/lib/solunar/types'

// ─── Orchestrateur des emails de cycle de vie (sprint 74, migration 108) ──────
//
// Modèle repris de lib/email/spot-alert.tsx (sprint 72), à la lettre :
//   - ne throw JAMAIS vers l'appelant (cron ou server action) : renvoie un booléen ;
//   - getEmailRecipient({ marketing: true }) → l'opt-out GLOBAL prime sur tout ;
//   - sendEmail no-op sans RESEND_API_KEY (dev) et ne throw pas non plus.
//
// ORDRE VOLONTAIRE : on envoie D'ABORD, on journalise ENSUITE (exigence du brief :
// « écriture lifecycle_emails APRÈS envoi réussi, pas de dédup fantôme »). Un
// crash entre les deux peut donc au pire rejouer un email le lendemain ; l'inverse
// (journaliser avant) perdrait l'email pour toujours, ce qui est bien pire pour un
// sprint dont le sujet EST le point de contact. Le cron tournant 1×/jour, la
// fenêtre de rejeu est d'un jour, et le PK (user_id, kind, sent_key) la referme.
//
// RGPD — catégorie MARKETING pour les 4 kinds, y compris le welcome : ce sont des
// emails d'activation, pas l'exécution d'un contrat. Conséquence assumée et
// voulue : un compte désinscrit du marketing ne reçoit AUCUN email de ce module.

/** Données d'affichage d'un créneau, communes aux 3 emails qui en montrent un. */
export type WindowParts = {
  windowWhen: string
  placeLabel: string
  reasons: string[]
}

/**
 * Met un `FishingWindow` en forme pour un email. Renvoie null si le pipeline
 * solunar n'a rien donné : les appelants omettent alors le bloc créneau plutôt
 * que d'inventer une heure (règle d'honnêteté : jamais de donnée fabriquée).
 */
export function toWindowParts(
  window: FishingWindow | null,
  dept: string,
  now: Date,
): WindowParts | null {
  if (!window) return null
  return {
    windowWhen: formatWindowWhen(window.startTimeISO, window.startLocal, now),
    placeLabel: `Secteur ${DEPARTMENT_LABELS[dept] ?? dept}`,
    // Les raisons viennent déjà en français du moteur (lib/solunar) : on n'en
    // réécrit aucune, on borne juste la longueur pour ne pas noyer le bloc.
    reasons: window.factors.reasons.slice(0, 3),
  }
}

/**
 * Meilleur créneau tombant un samedi ou un dimanche (heure de Paris) parmi les
 * prochains. Renvoie null si aucun : on préfère ne pas envoyer plutôt que titrer
 * « ton créneau du week-end » sur un créneau de mardi.
 */
export function pickWeekendWindow(windows: FishingWindow[]): FishingWindow | null {
  const weekend = windows.filter((w) => isParisWeekend(new Date(w.startTimeISO)))
  if (weekend.length === 0) return null
  return weekend.reduce((best, w) => (w.score > best.score ? w : best))
}

/**
 * Cet email est-il DÉJÀ parti ? Le journal 108 est la source de vérité de la dédup :
 * le greffon cron filtre déjà en amont, mais `completeOnboarding` peut être rejoué
 * sans passer par lui, et le seul garde `!before.onboarded` ne survivrait pas à une
 * ré-écriture du profil. Fail-OUVERT en cas d'erreur de lecture : mieux vaut risquer
 * un doublon qu'avaler silencieusement le seul point de contact du sprint.
 */
async function alreadySent(
  userId: string,
  kind: LifecycleKind,
  sentKey: string,
): Promise<boolean> {
  try {
    const supabase = createServiceRoleClient()
    const { data, error } = await supabase
      .from('lifecycle_emails')
      .select('user_id')
      .eq('user_id', userId)
      .eq('kind', kind)
      .eq('sent_key', sentKey)
      .maybeSingle()
    if (error) return false
    return data != null
  } catch {
    return false
  }
}

/** Journalise l'envoi (dédup migration 108). Best-effort : ne casse jamais l'envoi. */
async function journalSend(
  userId: string,
  kind: LifecycleKind,
  sentKey: string,
): Promise<boolean> {
  try {
    const supabase = createServiceRoleClient()
    const { error } = await supabase
      .from('lifecycle_emails')
      .insert({ user_id: userId, kind, sent_key: sentKey })
    if (error) {
      // 23505 = doublon : un autre run a déjà journalisé, ce n'est pas une anomalie.
      console.error('[lifecycle] journal échoué', { userId, kind, sentKey, error: error.message })
      return false
    }
    return true
  } catch (err) {
    console.error('[lifecycle] journal exception', { userId, kind, err })
    return false
  }
}

/**
 * Pipeline commun : destinataire (opt-out respecté) → envoi → journal → mesure.
 * `render` reçoit le destinataire résolu pour en tirer le prénom et le token de
 * désinscription. Renvoie true UNIQUEMENT si l'email est réellement parti.
 */
async function deliver(args: {
  userId: string
  kind: LifecycleKind
  sentKey: string
  subject: string
  render: (recipient: EmailRecipient) => React.ReactElement
}): Promise<boolean> {
  const { userId, kind, sentKey, subject, render } = args
  try {
    // Dédup durable (migration 108). Redondant avec le filtrage du greffon cron,
    // indispensable pour le welcome, qui part depuis une server action.
    if (await alreadySent(userId, kind, sentKey)) return false

    const recipient = await getEmailRecipient(userId, { marketing: true })
    if (!recipient) return false

    const { sent } = await sendEmail({ to: recipient.email, subject, react: render(recipient) })
    if (!sent) return false

    await journalSend(userId, kind, sentKey)
    // Funnel d'activation (Bloc 4) : émis APRÈS envoi réussi seulement, sinon la
    // métrique compterait des emails jamais partis (no-op sans clé Resend, par ex).
    await captureServerEvent(userId, 'lifecycle_email_sent', { kind })
    return true
  } catch (err) {
    console.error('[lifecycle] envoi échoué', { userId, kind, err })
    return false
  }
}

/**
 * Bienvenue, à la complétion de l'onboarding. Appelé depuis `completeOnboarding`
 * (server action, session utilisateur) : la dédup ne peut donc PAS s'appuyer sur
 * le seul `!before.onboarded` si l'action est rejouée, d'où le journal 108.
 */
export async function sendWelcomeEmail(
  userId: string,
  dept: string | null,
  now: Date = new Date(),
): Promise<boolean> {
  const parts = dept ? toWindowParts(await getDeptNextWindow(dept), dept, now) : null

  return deliver({
    userId,
    kind: 'welcome',
    sentKey: ONCE_SENT_KEY,
    subject: 'Bienvenue dans Carnet de Pêche 🎣',
    render: (r) => (
      <WelcomeEmail
        firstName={r.firstName}
        windowWhen={parts?.windowWhen ?? null}
        placeLabel={parts?.placeLabel ?? null}
        reasons={parts?.reasons ?? []}
        unsubToken={r.unsubToken}
      />
    ),
  })
}

/** J+1 « ton créneau ». Sans créneau calculable, on n'envoie pas : l'email n'aurait plus d'objet. */
export async function sendFirstWindowEmail(
  userId: string,
  dept: string,
  favorite: { name: string; slug: string } | null,
  now: Date = new Date(),
): Promise<boolean> {
  const parts = toWindowParts(await getDeptNextWindow(dept), dept, now)
  if (!parts) return false

  return deliver({
    userId,
    kind: 'j1_window',
    sentKey: ONCE_SENT_KEY,
    subject: `Ton prochain créneau : ${parts.windowWhen}`,
    render: (r) => (
      <FirstWindowEmail
        firstName={r.firstName}
        windowWhen={parts.windowWhen}
        placeLabel={parts.placeLabel}
        reasons={parts.reasons}
        favoriteSpotName={favorite?.name ?? null}
        favoriteSpotSlug={favorite?.slug ?? null}
        unsubToken={r.unsubToken}
      />
    ),
  })
}

/**
 * J+2 « logue ta première prise » (sprint 77, Bloc 8.4). Aucun créneau à calculer :
 * un seul CTA, le formulaire de prise, pré-rempli avec le spot favori si le compte
 * en a un. Contrairement au J+1, cet email part MÊME sans favori ni créneau : son
 * objet ne dépend d'aucune donnée externe, donc rien ne peut le rendre malhonnête.
 */
export async function sendFirstCatchNudgeEmail(
  userId: string,
  favorite: { name: string; id: string } | null,
): Promise<boolean> {
  return deliver({
    userId,
    kind: 'j2_first_catch',
    sentKey: ONCE_SENT_KEY,
    subject: 'Il manque une prise à ton carnet',
    render: (r) => (
      <FirstCatchNudgeEmail
        firstName={r.firstName}
        favoriteSpotName={favorite?.name ?? null}
        favoriteSpotId={favorite?.id ?? null}
        unsubToken={r.unsubToken}
      />
    ),
  })
}

/** J+3 « débloque tes tendances ». Aucun créneau : un seul CTA, l'import. */
export async function sendImportNudgeEmail(userId: string): Promise<boolean> {
  return deliver({
    userId,
    kind: 'j3_import',
    sentKey: ONCE_SENT_KEY,
    subject: '3 prises suffisent pour débloquer tes tendances',
    render: (r) => <ImportNudgeEmail firstName={r.firstName} unsubToken={r.unsubToken} />,
  })
}

/** Hebdo du vendredi. `weekKey` = clé ISO (« 2026-W32 »), la dédup est par semaine. */
export async function sendWeeklyWindowEmail(
  userId: string,
  dept: string,
  weekKey: string,
  now: Date = new Date(),
): Promise<boolean> {
  // 12 fenêtres : de quoi couvrir la fin du vendredi + samedi + dimanche.
  const weekend = pickWeekendWindow(await getDeptUpcomingWindows(dept, 12))
  const parts = toWindowParts(weekend, dept, now)
  if (!parts) return false

  return deliver({
    userId,
    kind: 'weekly_window',
    sentKey: weekKey,
    subject: `Ton créneau du week-end : ${parts.windowWhen}`,
    render: (r) => (
      <WeeklyWindowEmail
        firstName={r.firstName}
        windowWhen={parts.windowWhen}
        placeLabel={parts.placeLabel}
        reasons={parts.reasons}
        unsubToken={r.unsubToken}
      />
    ),
  })
}
