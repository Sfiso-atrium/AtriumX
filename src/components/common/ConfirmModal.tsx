// src/components/common/ConfirmModal.tsx
//
// Generic "are you sure?" dialog for actions that can't be undone (or
// otherwise deserve a pause). Not tied to chat — any page can use it.
interface Props {
  title: string
  message: string
  confirmLabel?: string
  cancelLabel?: string
  destructive?: boolean
  confirmDisabled?: boolean
  onConfirm: () => void
  onCancel: () => void
}

export default function ConfirmModal({
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  destructive = false,
  confirmDisabled = false,
  onConfirm,
  onCancel,
}: Props) {
  return (
    <div className="fixed inset-0 bg-black/60 z-[200] flex items-center justify-center px-4">
      <div className="bg-slate-card border border-slate-border rounded-2xl w-full max-w-sm p-5 shadow-xl">
        <h3 className="text-cream font-bold text-lg mb-2">{title}</h3>
        <p className="text-cream-muted text-sm leading-relaxed mb-5">{message}</p>
        <div className="flex gap-3">
          <button
            onClick={onCancel}
            className="flex-1 border border-slate-border text-cream font-semibold text-sm py-2.5 rounded-xl hover:bg-slate-deep transition-colors"
          >
            {cancelLabel}
          </button>
          <button
            onClick={onConfirm}
            disabled={confirmDisabled}
            className={`flex-1 font-semibold text-sm py-2.5 rounded-xl text-white transition-colors disabled:opacity-50 ${
              destructive ? 'bg-red-500 hover:bg-red-600' : 'bg-teal-primary hover:bg-sapphire-primary'
            }`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}
