import { AlertCircle, RefreshCw } from 'lucide-react'
import type { ReactNode } from 'react'

import { getErrorMessage } from '../../api/client'
import { Button } from './Button'
import styles from './States.module.css'

interface EmptyStateProps {
  icon: ReactNode
  title: string
  description?: ReactNode
  action?: ReactNode
}

/** Mostrado quando uma lista não tem itens, com uma sugestão do que fazer. */
export function EmptyState({ icon, title, description, action }: EmptyStateProps) {
  return (
    <div className={styles.state}>
      <div className={styles.icon}>{icon}</div>
      <h3 className={styles.title}>{title}</h3>
      {description && <p className={styles.description}>{description}</p>}
      {action && <div className={styles.action}>{action}</div>}
    </div>
  )
}

interface ErrorStateProps {
  error: unknown
  title?: string
  onRetry?: () => void
}

export function ErrorState({ error, title = 'Não foi possível carregar', onRetry }: ErrorStateProps) {
  return (
    <div className={styles.state} role="alert">
      <div className={`${styles.icon} ${styles.iconDanger}`}>
        <AlertCircle size={28} />
      </div>
      <h3 className={styles.title}>{title}</h3>
      <p className={styles.description}>{getErrorMessage(error)}</p>
      {onRetry && (
        <div className={styles.action}>
          <Button variant="secondary" icon={<RefreshCw size={16} />} onClick={onRetry}>
            Tentar novamente
          </Button>
        </div>
      )}
    </div>
  )
}

/** Mensagem de erro dentro de formulários. */
export function FormAlert({ children }: { children: ReactNode }) {
  return (
    <div className={styles.formAlert} role="alert">
      <AlertCircle size={18} />
      <span>{children}</span>
    </div>
  )
}
