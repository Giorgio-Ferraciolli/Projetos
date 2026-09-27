import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useCallback, useEffect, useMemo, type ReactNode } from 'react'

import { authApi } from '../api/auth'
import { setUnauthorizedHandler } from '../api/client'
import type { CurrentUser } from '../api/types'
import { queryKeys } from '../hooks/queryKeys'
import { AuthContext } from './authContext'

/**
 * Mantém o usuário logado. A sessão fica em um cookie httpOnly que o JavaScript não
 * consegue ler, então perguntamos ao backend (/users/me) quem está logado.
 */
export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient()

  // getSession devolve null para 401 (ninguém logado); outros erros seguem a política
  // padrão de novas tentativas do QueryClient.
  const { data, isPending, error, refetch } = useQuery({
    queryKey: queryKeys.session,
    queryFn: authApi.getSession,
    staleTime: Infinity,
  })

  const setUser = useCallback(
    (user: CurrentUser | null) => {
      if (user === null) {
        // Ao sair, descartamos o cache para não mostrar dados da conta anterior.
        queryClient.removeQueries({ predicate: (query) => query.queryKey[0] !== 'session' })
      }
      queryClient.setQueryData(queryKeys.session, user)
    },
    [queryClient],
  )

  // Se qualquer chamada receber 401 (sessão expirada), voltamos para o login.
  useEffect(() => {
    setUnauthorizedHandler(() => setUser(null))
    return () => setUnauthorizedHandler(null)
  }, [setUser])

  const value = useMemo(
    () => ({
      user: data ?? null,
      isLoading: isPending,
      error,
      retry: () => void refetch(),
      setUser,
    }),
    [data, isPending, error, refetch, setUser],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
