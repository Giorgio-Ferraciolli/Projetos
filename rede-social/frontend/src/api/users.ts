import { apiRequest } from './client'
import type { CurrentUser, CursorPage, Page, Post, UserProfile, UserSummary } from './types'

export interface ProfileUpdateInput {
  name?: string
  username?: string
  email?: string
  birth_date?: string
  bio?: string
}

export interface PasswordChangeInput {
  current_password: string
  new_password: string
}

export const usersApi = {
  search: (params: { q?: string; limit?: number; offset?: number }) =>
    apiRequest<Page<UserSummary>>('/users', { query: params }),

  getProfile: (username: string) =>
    apiRequest<UserProfile>(`/users/${encodeURIComponent(username)}`),

  getPosts: (username: string, cursor?: number) =>
    apiRequest<CursorPage<Post>>(`/users/${encodeURIComponent(username)}/posts`, {
      query: { cursor },
    }),

  updateMe: (input: ProfileUpdateInput) =>
    apiRequest<CurrentUser>('/users/me', { method: 'PATCH', json: input }),

  changePassword: (input: PasswordChangeInput) =>
    apiRequest<void>('/users/me/password', { method: 'PUT', json: input }),

  uploadAvatar: (file: File) => {
    const formData = new FormData()
    formData.append('file', file)
    return apiRequest<CurrentUser>('/users/me/avatar', { method: 'PUT', formData })
  },

  removeAvatar: () => apiRequest<CurrentUser>('/users/me/avatar', { method: 'DELETE' }),
}
