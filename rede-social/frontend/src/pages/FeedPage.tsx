import { Newspaper } from 'lucide-react'
import { Link } from 'react-router'

import { PostComposer } from '../components/posts/PostComposer'
import { PostList } from '../components/posts/PostList'
import { EmptyState } from '../components/ui/States'
import { useFeed } from '../hooks/usePosts'
import { usePageTitle } from '../hooks/usePageTitle'
import styles from './Page.module.css'

export function FeedPage() {
  usePageTitle('Feed')
  const feed = useFeed()

  return (
    <div className={styles.stack}>
      <h1 className="visually-hidden">Feed</h1>
      <PostComposer allowDestinationChoice />
      <PostList
        query={feed}
        empty={
          <EmptyState
            icon={<Newspaper size={28} />}
            title="Seu feed está vazio"
            description={
              <>
                Faça a primeira publicação ou <Link to="/communities">entre em comunidades</Link>{' '}
                para ver mais conteúdo aqui.
              </>
            }
          />
        }
      />
    </div>
  )
}
