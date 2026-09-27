/**
 * Chaves do cache do TanStack Query, centralizadas para evitar erros de digitação.
 * Todas as listas de posts começam com 'posts', o que permite atualizar um post
 * (ex.: curtida) em todas as listas de uma vez.
 */
export const queryKeys = {
  session: ['session'] as const,

  posts: ['posts'] as const,
  feed: ['posts', 'feed'] as const,
  userPosts: (username: string) => ['posts', 'user', username] as const,
  communityPosts: (communityId: number) => ['posts', 'community', communityId] as const,
  post: (postId: number) => ['posts', 'detail', postId] as const,

  users: (q: string) => ['users', 'search', q] as const,
  profile: (username: string) => ['users', 'profile', username] as const,
  profiles: ['users', 'profile'] as const,

  communities: ['communities'] as const,
  communityList: (params: { q: string; mine: boolean }) => ['communities', 'list', params] as const,
  // Fica sob ['communities', 'list'] para ser invalidada junto com as listas.
  myCommunitiesMenu: ['communities', 'list', 'menu'] as const,
  community: (communityId: number) => ['communities', 'detail', communityId] as const,
  communityMembers: (communityId: number) => ['communities', 'members', communityId] as const,
}
