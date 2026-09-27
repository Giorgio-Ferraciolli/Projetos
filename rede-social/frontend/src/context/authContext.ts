import { createContext } from 'react'

import type { CurrentUser } from '../api/types'

export interface AuthContextValue {
  user: CurrentUser | null
  isLoading: boolean
  /** Erro ao verificar a sessão (ex.: servidor fora do ar). 401 não é erro: é "deslogado". */
  error: unknown
  retry: () => void
  /** Atualiza o usuário logado no cache (após login, cadastro ou edição de perfil). */
  setUser: (user: CurrentUser | null) => void
}

export const AuthContext = createContext<AuthContextValue | null>(null)
