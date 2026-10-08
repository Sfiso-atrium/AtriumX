import { useEffect, useRef, type ReactNode } from 'react'

export default function ReviewDialog({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) {
  const ref = useRef<HTMLDialogElement>(null)
  useEffect(() => {
    const dialog = ref.current
    dialog?.showModal()
    return () => { dialog?.close() }
  }, [])
  return <dialog ref={ref} aria-labelledby="review-dialog-title" onCancel={onClose}
    className="w-[calc(100%_-_2rem)] max-w-sm rounded-2xl border border-slate-border bg-slate-card p-6 text-cream backdrop:bg-black/70">
    <h2 id="review-dialog-title" className="text-xl font-bold">{title}</h2>
    {children}
    <button type="button" onClick={onClose} className="mt-4 w-full text-sm text-cream-muted underline">Close</button>
  </dialog>
}
