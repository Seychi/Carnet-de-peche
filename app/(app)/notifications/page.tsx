import Link from 'next/link'
import { redirect } from 'next/navigation'
import { Bell, Heart, MessageCircle, UserPlus, MapPinCheck, MapPinX, Sparkles, Users, CalendarClock, Fish, Waves } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { fr } from 'date-fns/locale'
import { createClient } from '@/lib/supabase/server'
import { getUserTier } from '@/lib/auth/tier'
import { getNotifications, type AppNotification } from '@/app/actions/notifications'
import { getNotificationPrefs } from '@/app/actions/notification-prefs'
import { MarkAllRead } from './MarkAllRead'
import { PushSettingsToggle } from '@/components/notifications/PushSettingsToggle'
import { NotificationTypeToggles } from '@/components/notifications/NotificationTypeToggles'

export const metadata = {
  title: 'Notifications · Carnet de Pêche',
}

export const dynamic = 'force-dynamic'

// Libellé + icône par type de notif.
function describe(n: AppNotification): { icon: typeof Bell; label: string } {
  const who = n.actor_username ?? 'Un pêcheur'
  switch (n.type) {
    case 'new_follower':
      return { icon: UserPlus, label: `${who} s’est abonné à toi` }
    case 'post_liked':
      return { icon: Heart, label: `${who} a aimé ton post` }
    case 'post_commented':
      return { icon: MessageCircle, label: `${who} a commenté ton post` }
    case 'catch_commented':
      return { icon: MessageCircle, label: `${who} a commenté ta prise` }
    case 'mention':
      return { icon: MessageCircle, label: `${who} t’a mentionné` }
    case 'spot_approved':
      return { icon: MapPinCheck, label: 'Ton spot a été validé 🎣' }
    case 'spot_rejected':
      return { icon: MapPinX, label: 'Ta proposition de spot n’a pas été retenue' }
    case 'optimal_window':
      return { icon: Sparkles, label: 'Créneau favorable près de chez toi' }
    case 'spot_verified':
      return { icon: MapPinCheck, label: 'La coordonnée de ton spot a été vérifiée 🎣' }
    case 'recfishing_reminder':
      return { icon: Fish, label: 'Pense à déclarer ta prise (RecFishing)' }
    case 'outing_join':
      return { icon: Users, label: `${who} a demandé à rejoindre ta sortie` }
    case 'outing_accepted':
      return { icon: Users, label: 'Ta demande de sortie a été acceptée 🎣' }
    case 'outing_full':
      return { icon: Users, label: 'Ta sortie est complète' }
    case 'outing_cancelled':
      return { icon: Users, label: 'Une sortie a été annulée' }
    case 'outing_message':
      return { icon: MessageCircle, label: 'Nouveau message dans la sortie' }
    case 'outing_reminder':
      return { icon: CalendarClock, label: 'Ta sortie est demain' }
    case 'big_tide':
      return { icon: Waves, label: 'Grande marée à venir près de chez toi' }
    case 'species_closure':
      return { icon: Fish, label: 'Rappel réglementation : période de fermeture qui approche' }
    case 'weekly_digest':
      return { icon: Sparkles, label: 'Ta semaine de pêche en résumé' }
    case 'followed_catch':
      return { icon: Fish, label: `${who} a publié une prise` }
    case 'nearby_outing':
      return { icon: Users, label: 'Nouvelle sortie près de chez toi' }
    default:
      return { icon: Bell, label: `${who} a interagi avec toi` }
  }
}

export default async function NotificationsPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const res = await getNotifications(50)
  const notifications = res.ok ? res.data : []
  const hasUnread = notifications.some((n) => !n.read_at)

  // Préférences par type de push (sprint 49 WS C). Scopé au viewer (auth.uid()).
  const notificationPrefs = await getNotificationPrefs()

  // Tier courant (sprint 51 WS-E) : la « fenêtre optimale » est réservée aux abonnés.
  // On ne montre pas un toggle « Activé » qui ne déclencherait jamais rien à un gratuit.
  const tier = await getUserTier()

  // Résolution des liens : pour les notifs liées à un post/prise, on retrouve
  // le département du post (route /fil/<dept>). Le post appartient au viewer
  // (destinataire) → RLS feed_posts_select_approved (author_id = auth.uid()) OK.
  // On ne lit que id + region de SES posts (aucun GPS, aucune vue contournée).
  const postTargetIds = [
    ...new Set(
      notifications
        .filter((n) => n.target_type === 'post')
        .map((n) => n.target_id)
        .filter((id): id is string => Boolean(id)),
    ),
  ]
  const regionByPostId = new Map<string, string>()
  if (postTargetIds.length > 0) {
    const { data: posts } = await supabase
      .from('feed_posts')
      .select('id, region')
      .in('id', postTargetIds)
    for (const p of posts ?? []) {
      if (p.region) regionByPostId.set(p.id, p.region)
    }
  }

  function hrefFor(n: AppNotification): string {
    if (n.type === 'new_follower') {
      return n.actor_username ? `/u/${n.actor_username}` : '/follows'
    }
    if (n.type === 'spot_approved' || n.type === 'spot_rejected' || n.type === 'spot_verified') {
      return '/spots/mes-propositions'
    }
    // Co-pêchage (sprint 40) : toutes les notifs de sortie mènent au board des sorties.
    if (n.target_type === 'outing' || n.type.startsWith('outing_')) {
      return '/sorties'
    }
    // Rappel RecFishing : déclarer ses prises depuis le carnet.
    if (n.type === 'recfishing_reminder') {
      return '/carnet'
    }
    // Créneau favorable du jour → la carte (couche « Ton score » + spots près de chez toi).
    if (n.type === 'optimal_window') {
      return '/carte'
    }
    // Notifs système (sprints 49/50). nearby_outing porte target_type='outing' et est
    // déjà routé vers /sorties par la branche ci-dessus, on ne le rajoute pas ici.
    if (n.type === 'big_tide') {
      return '/carte'
    }
    if (n.type === 'weekly_digest') {
      return '/home'
    }
    // species_closure ne porte pas le slug d'espèce (target_id est uuid en DB, le cron
    // ne le renseigne pas) : on mène à l'index des espèces, pas à une fiche précise.
    if (n.type === 'species_closure') {
      return '/especes'
    }
    // Prise d'un pêcheur suivi : sa fiche profil si on a le pseudo, sinon le fil.
    if (n.type === 'followed_catch') {
      return n.actor_username ? `/u/${n.actor_username}` : '/fil'
    }
    if (n.target_type === 'post' && n.target_id) {
      const region = regionByPostId.get(n.target_id)
      if (region) return `/fil/${region}`
    }
    return '/fil'
  }

  return (
    <div className="mx-auto w-full max-w-[680px] px-4 py-6 sm:px-6">
      <MarkAllRead hasUnread={hasUnread} />

      <h1 className="mb-5 font-display text-2xl font-bold text-navy-900">Notifications</h1>

      {notifications.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-[14px] border border-sand-200 bg-white px-6 py-12 text-center">
          <Bell size={28} strokeWidth={1.6} className="text-ink-300" aria-hidden="true" />
          <p className="text-sm text-ink-500">
            Pas encore de notification. Like, commentaire ou nouvel abonné : tout
            arrivera ici.
          </p>
        </div>
      ) : (
        <ul className="flex flex-col gap-2">
          {notifications.map((n) => {
            const { icon: Icon, label } = describe(n)
            const unread = !n.read_at
            return (
              <li key={n.id}>
                <Link
                  href={hrefFor(n)}
                  className={`flex items-start gap-3 rounded-[14px] border px-4 py-3 transition-colors hover:bg-sand-100 ${
                    unread
                      ? 'border-teal-300 bg-teal-50'
                      : 'border-sand-200 bg-white'
                  }`}
                >
                  <span
                    aria-hidden="true"
                    className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-full bg-sand-100 text-navy-900"
                  >
                    <Icon size={16} strokeWidth={1.9} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm text-navy-900">{label}</p>
                    {n.preview_text && (
                      <p className="mt-0.5 truncate text-xs text-ink-500">
                        « {n.preview_text} »
                      </p>
                    )}
                    <p className="mt-1 text-[11px] text-ink-400">
                      {formatDistanceToNow(new Date(n.created_at), {
                        addSuffix: true,
                        locale: fr,
                      })}
                    </p>
                  </div>
                  {unread && (
                    <span
                      aria-hidden="true"
                      className="mt-1.5 size-2 shrink-0 rounded-full bg-coral-500"
                    />
                  )}
                </Link>
              </li>
            )
          })}
        </ul>
      )}

      <section className="mt-8">
        <h2 className="mb-3 font-display text-lg font-bold text-navy-900">Réglages</h2>
        <div className="rounded-[14px] border border-sand-200 bg-white px-4 py-4">
          <PushSettingsToggle />
        </div>

        <div className="mt-4 rounded-[14px] border border-sand-200 bg-white px-4 py-4">
          <p className="mb-1 text-sm font-semibold text-navy-900">Quelles alertes recevoir</p>
          <p className="mb-4 text-xs text-ink-500 leading-relaxed">
            Choisis les push qui t&rsquo;intéressent. L&rsquo;interrupteur principal
            ci-dessus reste maître : s&rsquo;il est éteint, aucune alerte n&rsquo;arrive,
            quels que soient ces réglages.
          </p>
          <NotificationTypeToggles prefs={notificationPrefs} tier={tier} />
        </div>
      </section>
    </div>
  )
}
