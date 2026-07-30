import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { useApp } from '../context/AppContext'
import { updateProfile } from '../services/dataService'
import { supabase } from '../services/supabaseClient'

const AVATAR_COLORS = [
  '#0F6E56',
  '#185FA5',
  '#993C1D',
  '#993556',
  '#534AB7',
  '#3B6D11',
]

export default function EditProfile() {
  const navigate = useNavigate()
  const { currentUser, setCurrentUser, showToast } = useApp()

  const [fullName, setFullName] = useState(currentUser?.full_name ?? '')
  const [residence, setResidence] = useState(currentUser?.residence ?? '')
  const [avatarColor, setAvatarColor] = useState(currentUser?.avatar_color ?? AVATAR_COLORS[0])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  // Redirect if somehow reached without a session
  if (!currentUser) {
    navigate('/student')
    return null
  }

  const initials = fullName
    .trim()
    .split(' ')
    .filter(Boolean)
    .map(w => w[0].toUpperCase())
    .slice(0, 2)
    .join('')

  const handleSave = async () => {
    setError('')

    if (!fullName.trim()) {
      setError('Full name is required.')
      return
    }
    if (!residence.trim()) {
      setError('Residence is required.')
      return
    }

    setLoading(true)

    // Upsert into residences table so new residences are recorded
    const { error: residenceErr } = await supabase
      .from('residences')
      .upsert({ name: residence.trim() }, { onConflict: 'name', ignoreDuplicates: true })

    if (residenceErr) {
      // Non-fatal — residence upsert failing should not block profile save
      console.warn('Residence upsert failed:', residenceErr.message)
    }

const { user, error: updateErr } = await updateProfile(currentUser.id, {
      full_name: fullName.trim(),
      residence: residence.trim(),
      avatar_color: avatarColor,
    })

    setLoading(false)

    if (updateErr) {
      setError(updateErr)
      return
    }

    if (user) {
      setCurrentUser(user)
    }

    showToast('Profile updated.', 'success')
    navigate(`/profile/${currentUser.id}`)
  }

  const inputClass =
    'w-full bg-slate-card border border-slate-border rounded-xl px-4 py-3 text-cream text-sm placeholder:text-cream-muted focus:outline-none focus:border-teal-light transition-colors'

  return (
    <div className="min-h-screen bg-slate-deep">
      {/* Header */}
      <div className="sticky top-0 z-50 bg-slate-deep border-b border-slate-border h-14 flex items-center px-4 gap-3">
        <button
          onClick={() => navigate(`/profile/${currentUser.id}`)}
          className="text-cream-muted hover:text-cream"
        >
          <ArrowLeft size={20} />
        </button>
        <span className="text-cream font-bold">Edit Profile</span>
      </div>

      <div className="max-w-sm mx-auto px-4 pt-8 pb-24">

        {/* Live avatar preview */}
        <div className="flex flex-col items-center mb-8">
          <div
            className="w-20 h-20 rounded-full flex items-center justify-center text-white font-bold text-2xl mb-2 transition-colors duration-200"
            style={{ backgroundColor: avatarColor }}
          >
            {initials || currentUser.avatar_initials}
          </div>
          <p className="text-cream-muted text-xs">Choose a colour below</p>
        </div>

        {/* Colour swatches */}
        <div className="flex gap-3 justify-center mb-8">
          {AVATAR_COLORS.map(color => (
            <button
              key={color}
              onClick={() => setAvatarColor(color)}
              className="w-9 h-9 rounded-full transition-transform duration-150 focus:outline-none"
              style={{
                backgroundColor: color,
                transform: avatarColor === color ? 'scale(1.25)' : 'scale(1)',
                boxShadow: avatarColor === color ? `0 0 0 2px #1a1a2e, 0 0 0 4px ${color}` : 'none',
              }}
              aria-label={`Select colour ${color}`}
            />
          ))}
        </div>

        {/* Form fields */}
        <div className="flex flex-col gap-3">
          <input
            type="text"
            placeholder="Full Name"
            value={fullName}
            onChange={e => setFullName(e.target.value)}
            className={inputClass}
          />

          <div>
            <input
              type="text"
              placeholder="Your residence (e.g. Dalrymple House)"
              value={residence}
              onChange={e => setResidence(e.target.value)}
              className={inputClass}
            />
            <p className="text-cream-muted text-xs px-1 mt-1">
              Type your residence name exactly as it appears on campus.
            </p>
          </div>

          {error && (
            <p className="text-red-400 text-sm px-1">{error}</p>
          )}

          <button
            onClick={handleSave}
            disabled={loading}
            className="w-full bg-ember hover:bg-ember-dark disabled:opacity-40 text-white font-bold py-3 rounded-xl transition-colors mt-2"
          >
            {loading ? 'Saving...' : 'Save Changes'}
          </button>

          <button
            onClick={() => navigate(`/profile/${currentUser.id}`)}
            className="text-cream-muted text-sm text-center mt-1 hover:text-cream transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  )
}
