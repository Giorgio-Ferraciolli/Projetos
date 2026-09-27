import {
  keepPreviousData,
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query'

import {
  communitiesApi,
  type CreateCommunityInput,
  type UpdateCommunityInput,
} from '../api/communities'
import type { CommunityDetail, CommunitySummary } from '../api/types'
import { queryKeys } from './queryKeys'
import { nextOffset } from './useUsers'

const PAGE_SIZE = 20

export function useCommunityList(params: { q: string; mine: boolean }) {
  return useInfiniteQuery({
    queryKey: queryKeys.communityList(params),
    queryFn: ({ pageParam }) =>
      communitiesApi.list({ ...params, limit: PAGE_SIZE, offset: pageParam }),
    initialPageParam: 0,
    getNextPageParam: nextOffset<CommunitySummary>,
    placeholderData: keepPreviousData,
  })
}

/** Comunidades das quais o usuário participa (menu lateral e seletor de destino do post). */
export function useMyCommunities() {
  return useQuery({
    // Chave diferente da lista paginada: cada chave do cache deve guardar um só formato de dado.
    queryKey: queryKeys.myCommunitiesMenu,
    queryFn: () => communitiesApi.list({ mine: true, limit: 50 }),
    select: (page) => page.items,
  })
}

export function useCommunity(communityId: number) {
  return useQuery({
    queryKey: queryKeys.community(communityId),
    queryFn: () => communitiesApi.get(communityId),
    enabled: Number.isInteger(communityId) && communityId > 0,
  })
}

export function useCommunityMembers(communityId: number) {
  return useInfiniteQuery({
    queryKey: queryKeys.communityMembers(communityId),
    queryFn: ({ pageParam }) => communitiesApi.getMembers(communityId, pageParam),
    initialPageParam: 0,
    getNextPageParam: nextOffset,
  })
}

/** Salva a comunidade atualizada no cache e recarrega as listas afetadas. */
function useApplyCommunityUpdate() {
  const queryClient = useQueryClient()
  return (community: CommunityDetail) => {
    queryClient.setQueryData(queryKeys.community(community.id), community)
    void queryClient.invalidateQueries({ queryKey: ['communities', 'list'] })
    void queryClient.invalidateQueries({ queryKey: queryKeys.communityMembers(community.id) })
    void queryClient.invalidateQueries({ queryKey: queryKeys.feed })
    void queryClient.invalidateQueries({ queryKey: queryKeys.profiles })
  }
}

export function useCreateCommunity() {
  const applyUpdate = useApplyCommunityUpdate()
  return useMutation({
    mutationFn: (input: CreateCommunityInput) => communitiesApi.create(input),
    onSuccess: applyUpdate,
  })
}

export function useUpdateCommunity(communityId: number) {
  const applyUpdate = useApplyCommunityUpdate()
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: UpdateCommunityInput) => communitiesApi.update(communityId, input),
    onSuccess: (community) => {
      applyUpdate(community)
      // O nome da comunidade aparece nos posts.
      void queryClient.invalidateQueries({ queryKey: queryKeys.posts })
    },
  })
}

export function useUpdateCommunityCover(communityId: number) {
  const applyUpdate = useApplyCommunityUpdate()
  return useMutation({
    mutationFn: (file: File) => communitiesApi.updateCover(communityId, file),
    onSuccess: applyUpdate,
  })
}

export function useMembership(communityId: number) {
  const applyUpdate = useApplyCommunityUpdate()
  return useMutation({
    mutationFn: (action: 'join' | 'leave') =>
      action === 'join' ? communitiesApi.join(communityId) : communitiesApi.leave(communityId),
    onSuccess: applyUpdate,
  })
}
