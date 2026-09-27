import { ApiError, apiRequest } from './client'
import type { CurrentUser } from './types'

export interface LoginInput {
  login: string
  password: string
}

export interface RegisterInput {
  name: string
  username: string
  email: string
  password: string
  birth_date: string
  bio?: string
}

export const authApi = {
  login: (input: LoginInput) =>
    apiRequest<CurrentUser>('/auth/login', { method: 'POST', json: input }),

  register: (input: RegisterInput) =>
    apiRequest<CurrentUser>('/auth/register', { method: 'POST', json: input }),

  logout: () => apiRequest<void>('/auth/logout', { method: 'POST' }),

  /** Usuário da sessão atual, ou null se ninguém estiver logado. */
  async getSession(): Promise<CurrentUser | null> {
    try {
      return await apiRequest<CurrentUser>('/users/me')
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) return null
      throw error
    }
  },
}
