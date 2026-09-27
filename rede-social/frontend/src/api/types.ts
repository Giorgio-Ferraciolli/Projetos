// Tipos das respostas da API (espelham os schemas Pydantic do backend).

export interface UserSummary {
  id: number
  name: string
  username: string
  avatar_url: string | null
}

export interface UserProfile extends UserSummary {
  bio: string | null
  age: number
  posts_count: number
  communities_count: number
  created_at: string
}

/** Dados do usuário logado (inclui informações privadas). */
export interface CurrentUser extends UserSummary {
  email: string
  bio: string | null
  birth_date: string
  age: number
  created_at: string
}

export interface CommunityRef {
  id: number
  name: string
}

export interface CommunitySummary extends CommunityRef {
  description: string
  cover_url: string | null
  members_count: number
  is_member: boolean
}

export interface CommunityDetail extends CommunitySummary {
  owner: UserSummary
  posts_count: number
  is_owner: boolean
  created_at: string
}

export interface CommunityMember {
  user: UserSummary
  role: 'owner' | 'member'
  joined_at: string
}

export interface Post {
  id: number
  caption: string | null
  image_url: string | null
  created_at: string
  author: UserSummary
  community: CommunityRef | null
  likes_count: number
  liked_by_me: boolean
  can_delete: boolean
}

export interface LikeStatus {
  likes_count: number
  liked_by_me: boolean
}

/** Paginação por offset (listas de usuários e comunidades). */
export interface Page<T> {
  items: T[]
  total: number
  limit: number
  offset: number
}

/** Paginação por cursor (feeds de posts). */
export interface CursorPage<T> {
  items: T[]
  next_cursor: number | null
}
