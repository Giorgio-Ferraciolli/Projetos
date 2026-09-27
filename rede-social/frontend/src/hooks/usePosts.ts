import {
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
  type InfiniteData,
  type QueryClient,
} from '@tanstack/react-query'

import { communitiesApi } from '../api/communities'
import { postsApi, type CreatePostInput } from '../api/posts'
import type { CursorPage, Post } from '../api/types'
import { usersApi } from '../api/users'
import { queryKeys } from './queryKeys'

type PostPages = InfiniteData<CursorPage<Post>, number | undefined>

/** Configuração comum das listas paginadas por cursor. */
function cursorPagination<TKey extends readonly unknown[]>(
  queryKey: TKey,
  fetchPage: (cursor?: number) => Promise<CursorPage<Post>>,
) {
  return {
    queryKey,
    queryFn: ({ pageParam }: { pageParam: number | undefined }) => fetchPage(pageParam),
    initialPageParam: undefined as number | undefined,
    getNextPageParam: (lastPage: CursorPage<Post>) => lastPage.next_cursor ?? undefined,
  }
}

export function useFeed() {
  return useInfiniteQuery(cursorPagination(queryKeys.feed, postsApi.getFeed))
}

export function useUserPosts(username: string) {
  return useInfiniteQuery({
    ...cursorPagination(queryKeys.userPosts(username), (cursor) =>
      usersApi.getPosts(username, cursor),
    ),
    enabled: username.toLowerCase() !== 'me',
  })
}

export function useCommunityPosts(communityId: number) {
  return useInfiniteQuery(
    cursorPagination(queryKeys.communityPosts(communityId), (cursor) =>
      communitiesApi.getPosts(communityId, cursor),
    ),
  )
}

export function usePost(postId: number) {
  return useQuery({
    queryKey: queryKeys.post(postId),
    queryFn: () => postsApi.get(postId),
    enabled: Number.isInteger(postId) && postId > 0,
  })
}

export function useCreatePost() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: CreatePostInput) => postsApi.create(input),
    onSuccess: (post) => {
      queryClient.setQueryData(queryKeys.post(post.id), post)
      invalidateAfterPostChange(queryClient)
    },
  })
}

export function useDeletePost() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (post: Post) => postsApi.remove(post.id),
    onSuccess: (_, post) => {
      queryClient.removeQueries({ queryKey: queryKeys.post(post.id) })
      removePostFromLists(queryClient, post.id)
      invalidateAfterPostChange(queryClient)
    },
  })
}

/**
 * Curtir/descurtir com atualização otimista: a interface muda na hora e, se a API
 * falhar, o estado anterior é restaurado.
 */
export function useToggleLike() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (post: Post) => (post.liked_by_me ? postsApi.unlike(post.id) : postsApi.like(post.id)),
    onMutate: (post) => {
      const liked = !post.liked_by_me
      updatePostEverywhere(queryClient, post.id, (current) => ({
        ...current,
        liked_by_me: liked,
        likes_count: Math.max(0, current.likes_count + (liked ? 1 : -1)),
      }))
    },
    onError: (_error, post) => {
      updatePostEverywhere(queryClient, post.id, (current) => ({
        ...current,
        liked_by_me: post.liked_by_me,
        likes_count: post.likes_count,
      }))
    },
    onSuccess: (status, post) => {
      updatePostEverywhere(queryClient, post.id, (current) => ({ ...current, ...status }))
    },
  })
}

// ---------- Helpers de cache ----------

function invalidateAfterPostChange(queryClient: QueryClient) {
  // Contadores de posts em perfis e comunidades também mudam.
  void queryClient.invalidateQueries({ queryKey: queryKeys.posts })
  void queryClient.invalidateQueries({ queryKey: queryKeys.profiles })
  void queryClient.invalidateQueries({ queryKey: queryKeys.communities })
}

function updatePostEverywhere(
  queryClient: QueryClient,
  postId: number,
  update: (post: Post) => Post,
) {
  queryClient.setQueriesData<PostPages | Post>({ queryKey: queryKeys.posts }, (data) => {
    if (!data) return data
    if ('pages' in data) {
      return {
        ...data,
        pages: data.pages.map((page) => ({
          ...page,
          items: page.items.map((post) => (post.id === postId ? update(post) : post)),
        })),
      }
    }
    return data.id === postId ? update(data) : data
  })
}

function removePostFromLists(queryClient: QueryClient, postId: number) {
  queryClient.setQueriesData<PostPages | Post>({ queryKey: queryKeys.posts }, (data) => {
    if (!data || !('pages' in data)) return data
    return {
      ...data,
      pages: data.pages.map((page) => ({
        ...page,
        items: page.items.filter((post) => post.id !== postId),
      })),
    }
  })
}
