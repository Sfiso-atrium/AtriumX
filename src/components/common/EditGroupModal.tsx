// src/components/common/EditGroupModal.tsx
import { useState, useRef } from 'react'
import { X, Camera } from 'lucide-react'
import { StudyGroup, updateStudyGroupName, uploadStudyGroupAvatar } from '../../services/dataService'
import GroupAvatarImage from './GroupAvatarImage'

export default function EditGroupModal({
  group, onClose, onSaved,
}: {
  group: StudyGroup
  onClose: () => void
  onSaved: (updated: StudyGroup) => void
}) {
  const [name, setName] = useState(group.name)
  const [avatarPath, setAvatarPath] = useState(group.avatar_url)
  const [saving, setSaving] = useState(false)
  const [uploadingAvatar, setUploadingAvatar] = useState(false)
  const [error, setError] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleAvatarPick = async (file: File | undefined) => {
    if (!file) return
    setUploadingAvatar(true)
    setError('')
    const { error: uploadError, path } = await uploadStudyGroupAvatar(group.id, file, avatarPath)
    setUploadingAvatar(false)
    if (uploadError) { setError(uploadError); return }
    setAvatarPath(path)
  }

  const handleSave = async () => {
    if (!name.trim()) { setError('Group name cannot be empty.'); return }
    setSaving(true)
    setError('')
    const { error: nameError } = await updateStudyGroupName(group.id, name)
    setSaving(false)
    if (nameError) { setError(nameError); return }
    onSaved({ ...group, name: name.trim(), avatar_url: avatarPath })
    onClose()
  }

  return (
    <div className="fixed inset-0 z-[300] bg-black/60 flex items-end sm:items-center justify-center">
      <div className="bg-slate-card border border-slate-border rounded-t-3xl sm:rounded-3xl w-full sm:max-w-sm p-6">
        <div className="flex items-center justify-between mb-5">
          <p className="text-cream font-bold text-base">Edit Group</p>
          <button onClick={onClose} className="text-cream-muted hover:text-cream">
            <X size={20} />
          </button>
        </div>

        <div className="flex flex-col items-center gap-3 mb-5">
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={uploadingAvatar}
            className="relative"
          >
            <GroupAvatarImage path={avatarPath} size={72} />
            <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-sapphire-light flex items-center justify-center border-2 border-slate-card">
              <Camera size={12} className="text-white" />
            </div>
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={e => handleAvatarPick(e.target.files?.[0])}
          />
          <p className="text-cream-muted text-xs">{uploadingAvatar ? 'Uploading...' : 'Tap to change avatar'}</p>
        </div>

        <label className="text-cream-muted text-xs font-bold uppercase tracking-wider mb-1.5 block">
          Group name
        </label>
        <input
          value={name}
          onChange={e => setName(e.target.value)}
          maxLength={60}
          className="w-full bg-slate-deep border border-slate-border rounded-xl px-3.5 py-2.5 text-cream text-sm mb-2 focus:outline-none focus:border-teal-light"
        />

        {error && <p className="text-red-400 text-xs mb-3">{error}</p>}

        <button
          onClick={handleSave}
          disabled={saving || uploadingAvatar}
          className="w-full bg-sapphire-light hover:opacity-85 disabled:opacity-50 text-white font-bold py-3 rounded-xl transition-opacity mt-2"
        >
          {saving ? 'Saving...' : 'Save Changes'}
        </button>
      </div>
    </div>
  )
}
