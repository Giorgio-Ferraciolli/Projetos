import { useMutation } from '@tanstack/react-query'
import { useContext } from 'react'

import { authApi, type LoginInput, type RegisterInput } from '../api/auth'
import type { CurrentUser } from '../api/types'
import { usersApi } from '../api/users'
import { AuthContext, type AuthContextValue } from '../context/authContext'

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth precisa estar dentro de <AuthProvider>.')
  return context
}

/** Usuário logado. Use apenas em páginas protegidas (dentro de RequireAuth). */
export function useCurrentUser(): CurrentUser {
  const { user } = useAuth()
  if (!user) throw new Error('useCurrentUser usado fora de uma rota protegida.')
  return user
}

export function useLogin() {
  const { setUser } = useAuth()
  return useMutation({
    mutationFn: (input: LoginInput) => authApi.login(input),
    onSuccess: setUser,
  })
}

/** Cadastro + envio opcional da foto de perfil (o cadastro já inicia a sessão). */
export function useRegister() {
  const { setUser } = useAuth()
  return useMutation({
    mutationFn: async ({ avatar, ...input }: RegisterInput & { avatar?: File | null }) => {
      const user = await authApi.register(input)
      if (!avatar) return { user, avatarFailed: false }
      try {
        return { user: await usersApi.uploadAvatar(avatar), avatarFailed: false }
      } catch {
        // A conta foi criada; a foto pode ser enviada depois nas configurações.
        return { user, avatarFailed: true }
      }
    },
    onSuccess: ({ user }) => setUser(user),
  })
}

export function useLogout() {
  const { setUser } = useAuth()
  return useMutation({
    mutationFn: authApi.logout,
    // Só limpamos a sessão local se o servidor apagou o cookie; em caso de erro o usuário
    // continua logado e pode tentar de novo (importante em computadores compartilhados).
    onSuccess: () => setUser(null),
  })
}
