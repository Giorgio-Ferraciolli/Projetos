import { AlertCircle, CheckCircle2, Info, X } from 'lucide-react'
import { useCallback, useMemo, useRef, useState, type ReactNode } from 'react'

import { ToastContext, type ToastApi, type ToastType } from './toastContext'
import styles from './ToastProvider.module.css'

interface Toast {
  id: number
  message: string
  type: ToastType
}

const DURATION_MS = 4000
const ICONS = { success: CheckCircle2, error: AlertCircle, info: Info }

/** Notificações rápidas (ex.: "Publicação criada!") no canto da tela. */
export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])
  const nextId = useRef(1)

  const dismiss = useCallback((id: number) => {
    setToasts((current) => current.filter((toast) => toast.id !== id))
  }, [])

  const show = useCallback(
    (message: string, type: ToastType = 'info') => {
      const id = nextId.current++
      setToasts((current) => [...current.slice(-2), { id, message, type }])
      window.setTimeout(() => dismiss(id), DURATION_MS)
    },
    [dismiss],
  )

  const api = useMemo<ToastApi>(
    () => ({
      show,
      success: (message) => show(message, 'success'),
      error: (message) => show(message, 'error'),
      info: (message) => show(message, 'info'),
    }),
    [show],
  )

  return (
    <ToastContext.Provider value={api}>
      {children}
      <div className={styles.viewport} aria-live="polite" aria-relevant="additions">
        {toasts.map((toast) => {
          const Icon = ICONS[toast.type]
          return (
            <div key={toast.id} className={`${styles.toast} ${styles[toast.type]}`} role="status">
              <Icon size={20} className={styles.icon} />
              <span className={styles.message}>{toast.message}</span>
              <button
                type="button"
                className={styles.close}
                onClick={() => dismiss(toast.id)}
                aria-label="Fechar notificação"
              >
                <X size={16} />
              </button>
            </div>
          )
        })}
      </div>
    </ToastContext.Provider>
  )
}
