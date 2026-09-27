import type { ReactNode } from 'react'
import { Navigate, useLocation } from 'react-router'

import { PageLoader } from '../components/ui/Spinner'
import { ErrorState } from '../components/ui/States'
import { useAuth } from '../hooks/useAuth'
import { redirectTarget } from './redirect'

/** Só renderiza o conteúdo para usuários logados; os demais vão para o login. */
export function RequireAuth({ children }: { children: ReactNode }) {
  const { user, isLoading, error, retry } = useAuth()
  const location = useLocation()

  if (isLoading) return <PageLoader label="Verificando sua sessão..." />
  if (error) return <SessionError error={error} onRetry={retry} />
  if (!user) return <Navigate to="/login" replace state={{ from: location }} />
  return children
}

/** Páginas de login e cadastro: quem já está logado segue para o feed (ou para onde ia). */
export function GuestOnly({ children }: { children: ReactNode }) {
  const { user, isLoading, error, retry } = useAuth()
  const location = useLocation()

  if (isLoading) return <PageLoader label="Verificando sua sessão..." />
  if (error) return <SessionError error={error} onRetry={retry} />
  if (user) {
    return <Navigate to={redirectTarget(location.state)} replace />
  }
  return children
}

function SessionError({ error, onRetry }: { error: unknown; onRetry: () => void }) {
  return (
    <div style={{ maxWidth: 480, margin: '15vh auto', padding: '0 16px' }}>
      <ErrorState error={error} title="Não foi possível verificar sua sessão" onRetry={onRetry} />
    </div>
  )
}
