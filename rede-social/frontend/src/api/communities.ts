import { apiRequest } from './client'
import type {
  CommunityDetail,
  CommunityMember,
  CommunitySummary,
  CursorPage,
  Page,
  Post,
} from './types'

export interface CreateCommunityInput {
  name: string
  description: string
  cover?: File | null
}

export interface UpdateCommunityInput {
  name?: string
  description?: string
}

export const communitiesApi = {
  list: (params: { q?: string; mine?: boolean; limit?: number; offset?: number }) =>
    apiRequest<Page<CommunitySummary>>('/communities', { query: params }),

  get: (communityId: number) => apiRequest<CommunityDetail>(`/communities/${communityId}`),

  create: ({ name, description, cover }: CreateCommunityInput) => {
    const formData = new FormData()
    formData.append('name', name)
    formData.append('description', description)
    if (cover) formData.append('cover', cover)
    return apiRequest<CommunityDetail>('/communities', { method: 'POST', formData })
  },

  update: (communityId: number, input: UpdateCommunityInput) =>
    apiRequest<CommunityDetail>(`/communities/${communityId}`, { method: 'PATCH', json: input }),

  updateCover: (communityId: number, file: File) => {
    const formData = new FormData()
    formData.append('file', file)
    return apiRequest<CommunityDetail>(`/communities/${communityId}/cover`, {
      method: 'PUT',
      formData,
    })
  },

  join: (communityId: number) =>
    apiRequest<CommunityDetail>(`/communities/${communityId}/membership`, { method: 'PUT' }),

  leave: (communityId: number) =>
    apiRequest<CommunityDetail>(`/communities/${communityId}/membership`, { method: 'DELETE' }),

  getMembers: (communityId: number, offset = 0) =>
    apiRequest<Page<CommunityMember>>(`/communities/${communityId}/members`, {
      query: { offset },
    }),

  getPosts: (communityId: number, cursor?: number) =>
    apiRequest<CursorPage<Post>>(`/communities/${communityId}/posts`, { query: { cursor } }),
}
