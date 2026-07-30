interface ToastProps {
  toast: { id: string; message: string; type: 'success' | 'error' | 'info' }
}

export default function Toast({ toast }: ToastProps) {
  const borderColor = {
    success: 'border-l-green-500',
    error: 'border-l-red-500',
    info: 'border-l-teal-primary',
  }[toast.type]

  return (
    <div className={`pointer-events-auto bg-slate-card border border-slate-border border-l-4 ${borderColor} rounded-xl px-4 py-3 text-cream text-sm shadow-lg max-w-sm w-full`}>
      {toast.message}
    </div>
  )
}
