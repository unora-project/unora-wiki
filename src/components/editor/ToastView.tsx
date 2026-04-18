import { useEffect } from 'react'
import { X } from 'lucide-react'

export type Toast = {
  kind: 'info' | 'success' | 'error'
  msg: string
  action?: { label: string; onClick: () => void }
} | null

export function ToastView({ toast, onDismiss }: { toast: NonNullable<Toast>; onDismiss: () => void }) {
  useEffect(() => {
    const ms = toast.action ? 8000 : 4000
    const id = setTimeout(onDismiss, ms)
    return () => clearTimeout(id)
  }, [toast, onDismiss])
  const tone =
    toast.kind === 'success' ? 'border-gilt/50 text-gilt'
      : toast.kind === 'error' ? 'border-ignis/50 text-ignis'
        : 'border-ash/30 text-ivory'
  return (
    <div
      role="status"
      className={`fixed bottom-4 right-4 z-40 flex max-w-md items-center gap-3 rounded-lg border bg-crypt-300 px-4 py-3 font-ui text-sm shadow-lg ${tone}`}
    >
      <span className="flex-1">{toast.msg}</span>
      {toast.action && (
        <button
          type="button"
          onClick={toast.action.onClick}
          className="rounded border border-gilt/60 bg-gilt/20 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-gilt hover:bg-gilt/30"
        >
          {toast.action.label}
        </button>
      )}
      <button
        type="button"
        onClick={onDismiss}
        aria-label="Dismiss"
        className="text-ash hover:text-ivory"
      ><X className="h-4 w-4" aria-hidden="true" /></button>
    </div>
  )
}
