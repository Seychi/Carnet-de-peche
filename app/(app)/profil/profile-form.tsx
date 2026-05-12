'use client'

import { useState, useTransition } from 'react'
import { toast } from 'sonner'
import { updateProfile, deleteAccount } from './actions'
import { Loader2, Trash2 } from 'lucide-react'

const DEPARTMENTS = [
  { value: '14', label: '14 — Calvados' }, { value: '17', label: '17 — Charente-Maritime' },
  { value: '22', label: '22 — Côtes-d\'Armor' }, { value: '29', label: '29 — Finistère' },
  { value: '33', label: '33 — Gironde' }, { value: '34', label: '34 — Hérault' },
  { value: '35', label: '35 — Ille-et-Vilaine' }, { value: '40', label: '40 — Landes' },
  { value: '44', label: '44 — Loire-Atlantique' }, { value: '50', label: '50 — Manche' },
  { value: '56', label: '56 — Morbihan' }, { value: '62', label: '62 — Pas-de-Calais' },
  { value: '64', label: '64 — Pyrénées-Atlantiques' }, { value: '66', label: '66 — Pyrénées-Orientales' },
  { value: '76', label: '76 — Seine-Maritime' }, { value: '83', label: '83 — Var' },
  { value: '85', label: '85 — Vendée' },
]

const TECHNIQUES = [
  { value: 'leurres', label: 'Leurres' },
  { value: 'surfcasting', label: 'Surfcasting' },
  { value: 'flottante', label: 'Flottante' },
  { value: 'vif', label: 'Vif' },
]

const SPECIES = [
  { value: 'bar', label: 'Bar' },
  { value: 'dorade_royale', label: 'Dorade royale' },
  { value: 'lieu_jaune', label: 'Lieu jaune' },
  { value: 'maquereau', label: 'Maquereau' },
  { value: 'sar', label: 'Sar' },
  { value: 'orphie', label: 'Orphie' },
]

type Profile = {
  id: string
  username: string | null
  bio: string | null
  city: string | null
  home_department: string | null
  level: string | null
  techniques: string[]
  favorite_species: string[]
  fishing_frequency: string | null
  avatar_url: string | null
  created_at: string
}

function Avatar({ username, avatarUrl }: { username: string | null; avatarUrl: string | null }) {
  const initials = username ? username.slice(0, 2).toUpperCase() : '?'
  if (avatarUrl) {
    return (
      <img
        src={avatarUrl}
        alt={username ?? 'Avatar'}
        className="w-20 h-20 rounded-full object-cover border-4 border-white shadow"
      />
    )
  }
  return (
    <div className="w-20 h-20 rounded-full bg-navy-900 flex items-center justify-center border-4 border-white shadow">
      <span className="text-white font-display font-bold text-xl">{initials}</span>
    </div>
  )
}

function DeleteModal({ onConfirm, onCancel, isPending }: {
  onConfirm: () => void
  onCancel: () => void
  isPending: boolean
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-[18px] p-8 max-w-md w-full shadow-2xl">
        <h2 className="font-display text-navy-900 text-xl mb-3">Supprimer mon compte</h2>
        <p className="text-sm text-ink-700 leading-relaxed mb-2">
          Cette action est <strong>irréversible</strong>. Ton compte, ton carnet de pêche, tes photos et toutes tes données seront définitivement supprimés.
        </p>
        <p className="text-sm text-ink-500 mb-6">
          Les prises que tu as partagées publiquement pourront rester anonymisées dans les statistiques communautaires.
        </p>
        <div className="flex gap-3">
          <button
            onClick={onCancel}
            disabled={isPending}
            className="flex-1 px-5 py-2.5 border border-ink-200 rounded-[10px] text-sm font-medium text-ink-700 hover:bg-ink-100 transition-colors"
          >
            Annuler
          </button>
          <button
            onClick={onConfirm}
            disabled={isPending}
            className="flex-1 px-5 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-[10px] text-sm font-semibold transition-colors flex items-center justify-center gap-2"
          >
            {isPending ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={16} />}
            Supprimer définitivement
          </button>
        </div>
      </div>
    </div>
  )
}

export function ProfileForm({ profile, email }: { profile: Profile; email: string }) {
  const [isPending, startTransition] = useTransition()
  const [isDeleting, startDeleteTransition] = useTransition()
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [bioLength, setBioLength] = useState(profile.bio?.length ?? 0)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const formData = new FormData(e.currentTarget)
    startTransition(async () => {
      const result = await updateProfile(formData)
      if (result.error) {
        toast.error(result.error)
      } else {
        toast.success('Profil mis à jour !')
      }
    })
  }

  function handleDeleteConfirm() {
    startDeleteTransition(async () => {
      const result = await deleteAccount()
      if (result?.error) {
        toast.error(result.error)
        setShowDeleteModal(false)
      }
    })
  }

  return (
    <>
      {showDeleteModal && (
        <DeleteModal
          onConfirm={handleDeleteConfirm}
          onCancel={() => setShowDeleteModal(false)}
          isPending={isDeleting}
        />
      )}

      <form onSubmit={handleSubmit} className="flex flex-col gap-6">

        {/* Avatar + email */}
        <div className="bg-white border border-ink-100 rounded-[18px] p-6 flex items-center gap-5">
          <Avatar username={profile.username} avatarUrl={profile.avatar_url} />
          <div>
            <p className="font-semibold text-navy-900">{profile.username ?? 'Nouveau pêcheur'}</p>
            <p className="text-sm text-ink-500 mt-0.5">{email}</p>
            <p className="text-xs text-ink-400 mt-1">
              Membre depuis {new Date(profile.created_at).toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })}
            </p>
          </div>
        </div>

        {/* Infos principales */}
        <div className="bg-white border border-ink-100 rounded-[18px] p-6 flex flex-col gap-5">
          <h2 className="font-semibold text-navy-900">Informations</h2>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="username" className="text-sm font-medium text-ink-700">
              Pseudo <span className="text-red-500">*</span>
            </label>
            <input
              id="username"
              name="username"
              type="text"
              defaultValue={profile.username ?? ''}
              required
              minLength={3}
              maxLength={30}
              className="px-4 py-2.5 border border-ink-200 rounded-[10px] text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
              placeholder="ton_pseudo"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="bio" className="text-sm font-medium text-ink-700 flex justify-between">
              Bio
              <span className="text-ink-400 font-normal">{bioLength} / 200</span>
            </label>
            <textarea
              id="bio"
              name="bio"
              defaultValue={profile.bio ?? ''}
              maxLength={200}
              rows={3}
              onChange={(e) => setBioLength(e.target.value.length)}
              className="px-4 py-2.5 border border-ink-200 rounded-[10px] text-sm resize-none focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
              placeholder="Pêcheur du bord depuis 10 ans, passionné de bars au leurre..."
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <label htmlFor="city" className="text-sm font-medium text-ink-700">Ville</label>
              <input
                id="city"
                name="city"
                type="text"
                defaultValue={profile.city ?? ''}
                className="px-4 py-2.5 border border-ink-200 rounded-[10px] text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                placeholder="Brest"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label htmlFor="home_department" className="text-sm font-medium text-ink-700">
                Département principal
              </label>
              <select
                id="home_department"
                name="home_department"
                defaultValue={profile.home_department ?? ''}
                className="px-4 py-2.5 border border-ink-200 rounded-[10px] text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent bg-white"
              >
                <option value="">Sélectionne ton département</option>
                {DEPARTMENTS.map((d) => (
                  <option key={d.value} value={d.value}>{d.label}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Pratique */}
        <div className="bg-white border border-ink-100 rounded-[18px] p-6 flex flex-col gap-5">
          <h2 className="font-semibold text-navy-900">Ta pratique</h2>

          {/* Techniques */}
          <div className="flex flex-col gap-2">
            <p className="text-sm font-medium text-ink-700">Techniques</p>
            <div className="flex flex-wrap gap-2">
              {TECHNIQUES.map((t) => (
                <label key={t.value} className="inline-flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    name="techniques"
                    value={t.value}
                    defaultChecked={profile.techniques?.includes(t.value)}
                    className="w-4 h-4 rounded border-ink-300 text-teal-600 focus:ring-teal-500"
                  />
                  <span className="text-sm text-ink-700">{t.label}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Espèces */}
          <div className="flex flex-col gap-2">
            <p className="text-sm font-medium text-ink-700">Espèces favorites</p>
            <div className="flex flex-wrap gap-2">
              {SPECIES.map((s) => (
                <label key={s.value} className="inline-flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    name="favorite_species"
                    value={s.value}
                    defaultChecked={profile.favorite_species?.includes(s.value)}
                    className="w-4 h-4 rounded border-ink-300 text-teal-600 focus:ring-teal-500"
                  />
                  <span className="text-sm text-ink-700">{s.label}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Niveau */}
          <div className="flex flex-col gap-2">
            <p className="text-sm font-medium text-ink-700">Niveau</p>
            <div className="flex gap-4">
              {[
                { value: 'debutant', label: 'Débutant' },
                { value: 'intermediaire', label: 'Intermédiaire' },
                { value: 'expert', label: 'Expert' },
              ].map((l) => (
                <label key={l.value} className="inline-flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="level"
                    value={l.value}
                    defaultChecked={profile.level === l.value}
                    className="w-4 h-4 border-ink-300 text-teal-600 focus:ring-teal-500"
                  />
                  <span className="text-sm text-ink-700">{l.label}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Fréquence */}
          <div className="flex flex-col gap-1.5">
            <label htmlFor="fishing_frequency" className="text-sm font-medium text-ink-700">
              Fréquence de pêche
            </label>
            <select
              id="fishing_frequency"
              name="fishing_frequency"
              defaultValue={profile.fishing_frequency ?? ''}
              className="px-4 py-2.5 border border-ink-200 rounded-[10px] text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent bg-white"
            >
              <option value="">Sélectionne une fréquence</option>
              <option value="rare">Occasionnellement</option>
              <option value="weekly">Chaque semaine</option>
              <option value="daily">Presque tous les jours</option>
              <option value="seasonal">Saisonnièrement</option>
            </select>
          </div>
        </div>

        {/* Bouton sauvegarde */}
        <button
          type="submit"
          disabled={isPending}
          className="w-full py-3.5 bg-navy-900 hover:bg-navy-800 text-white font-semibold rounded-[12px] transition-colors duration-200 flex items-center justify-center gap-2 disabled:opacity-60"
        >
          {isPending && <Loader2 size={16} className="animate-spin" />}
          Mettre à jour mon profil
        </button>

        {/* Zone danger */}
        <div className="bg-red-50 border border-red-100 rounded-[18px] p-6">
          <h2 className="font-semibold text-red-800 mb-2">Zone de danger</h2>
          <p className="text-sm text-red-700 mb-4">
            La suppression de ton compte est définitive et irréversible. Toutes tes données seront effacées.
          </p>
          <button
            type="button"
            onClick={() => setShowDeleteModal(true)}
            className="inline-flex items-center gap-2 px-5 py-2.5 border border-red-300 text-red-700 hover:bg-red-100 rounded-[10px] text-sm font-medium transition-colors"
          >
            <Trash2 size={15} />
            Supprimer mon compte
          </button>
        </div>
      </form>
    </>
  )
}
