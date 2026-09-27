import {
  keepPreviousData,
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query'

import type { CurrentUser, Page, UserSummary } from '../api/types'
import { usersApi, type PasswordChangeInput, type ProfileUpdateInput } from '../api/users'
import { queryKeys } from './queryKeys'
import { useAuth } from './useAuth'

const PAGE_SIZE = 20

export function useUserSearch(q: string) {
  return useInfiniteQuery({
    queryKey: queryKeys.users(q),
    queryFn: ({ pageParam }) => usersApi.search({ q, limit: PAGE_SIZE, offset: pageParam }),
    initialPageParam: 0,
    getNextPageParam: nextOffset<UserSummary>,
    placeholderData: keepPreviousData,
  })
}

export function useProfile(username: string) {
  return useQuery({
    queryKey: queryKeys.profile(username),
    queryFn: () => usersApi.getProfile(username),
    enabled: username.toLowerCase() !== 'me',
  })
}

/** Aplica o resultado de qualquer alteração do próprio perfil ao cache. */
function useApplyUserUpdate() {
  const queryClient = useQueryClient()
  const { setUser } = useAuth()
  return (user: CurrentUser) => {
    setUser(user)
    // Nome, username e avatar aparecem em perfis e posts: recarregamos essas listas.
    void queryClient.invalidateQueries({ queryKey: queryKeys.profiles })
    void queryClient.invalidateQueries({ queryKey: queryKeys.posts })
    void queryClient.invalidateQueries({ queryKey: ['users', 'search'] })
  }
}

export function useUpdateProfile() {
  const applyUpdate = useApplyUserUpdate()
  return useMutation({
    mutationFn: (input: ProfileUpdateInput) => usersApi.updateMe(input),
    onSuccess: applyUpdate,
  })
}

export function useUpdateAvatar() {
  const applyUpdate = useApplyUserUpdate()
  return useMutation({ mutationFn: usersApi.uploadAvatar, onSuccess: applyUpdate })
}

export function useRemoveAvatar() {
  const applyUpdate = useApplyUserUpdate()
  return useMutation({ mutationFn: usersApi.removeAvatar, onSuccess: applyUpdate })
}

export function useChangePassword() {
  return useMutation({ mutationFn: (input: PasswordChangeInput) => usersApi.changePassword(input) })
}

/** Próximo offset de uma lista paginada, ou undefined quando acabou. */
export function nextOffset<T>(lastPage: Page<T>): number | undefined {
  const next = lastPage.offset + lastPage.items.length
  return next < lastPage.total ? next : undefined
}
