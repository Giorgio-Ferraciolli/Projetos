import { createBrowserRouter, Outlet } from 'react-router'

import { AppLayout } from '../components/layout/AppLayout'
import { CommunitiesPage } from '../pages/CommunitiesPage'
import { CommunityPage } from '../pages/CommunityPage'
import { CreateCommunityPage } from '../pages/CreateCommunityPage'
import { CreatePostPage } from '../pages/CreatePostPage'
import { ExplorePage } from '../pages/ExplorePage'
import { FeedPage } from '../pages/FeedPage'
import { LoginPage } from '../pages/LoginPage'
import { NotFoundPage } from '../pages/NotFoundPage'
import { PostPage } from '../pages/PostPage'
import { ProfilePage } from '../pages/ProfilePage'
import { SettingsPage } from '../pages/SettingsPage'
import { SignupPage } from '../pages/SignupPage'
import { GuestOnly, RequireAuth } from './guards'

/** Mapa de rotas da aplicação. */
export const router = createBrowserRouter([
  {
    element: (
      <GuestOnly>
        <Outlet />
      </GuestOnly>
    ),
    children: [
      { path: '/login', element: <LoginPage /> },
      { path: '/signup', element: <SignupPage /> },
    ],
  },
  {
    element: (
      <RequireAuth>
        <AppLayout />
      </RequireAuth>
    ),
    children: [
      { path: '/', element: <FeedPage /> },
      { path: '/explore', element: <ExplorePage /> },
      { path: '/create', element: <CreatePostPage /> },
      { path: '/posts/:postId', element: <PostPage /> },
      { path: '/u/:username', element: <ProfilePage /> },
      { path: '/settings', element: <SettingsPage /> },
      { path: '/communities', element: <CommunitiesPage /> },
      { path: '/communities/new', element: <CreateCommunityPage /> },
      { path: '/communities/:communityId', element: <CommunityPage /> },
      { path: '*', element: <NotFoundPage /> },
    ],
  },
])
