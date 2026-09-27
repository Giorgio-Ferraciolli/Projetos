import { apiRequest } from './client'
import type { CursorPage, LikeStatus, Post } from './types'

export interface CreatePostInput {
  caption?: string
  image?: File | null
  communityId?: number | null
}

export const postsApi = {
  getFeed: (cursor?: number) =>
    apiRequest<CursorPage<Post>>('/posts/feed', { query: { cursor } }),

  get: (postId: number) => apiRequest<Post>(`/posts/${postId}`),

  create: ({ caption, image, communityId }: CreatePostInput) => {
    const formData = new FormData()
    if (caption?.trim()) formData.append('caption', caption.trim())
    if (image) formData.append('image', image)
    if (communityId) formData.append('community_id', String(communityId))
    return apiRequest<Post>('/posts', { method: 'POST', formData })
  },

  remove: (postId: number) => apiRequest<void>(`/posts/${postId}`, { method: 'DELETE' }),

  like: (postId: number) => apiRequest<LikeStatus>(`/posts/${postId}/like`, { method: 'PUT' }),

  unlike: (postId: number) =>
    apiRequest<LikeStatus>(`/posts/${postId}/like`, { method: 'DELETE' }),
}
