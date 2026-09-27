import { useNavigate } from 'react-router'

import { PostComposer } from '../components/posts/PostComposer'
import { usePageTitle } from '../hooks/usePageTitle'
import styles from './Page.module.css'

export function CreatePostPage() {
  usePageTitle('Criar publicação')
  const navigate = useNavigate()

  return (
    <div className={styles.stack}>
      <header>
        <h1 className={styles.pageTitle}>Criar publicação</h1>
        <p className={styles.pageSubtitle}>
          Compartilhe uma foto, um texto ou os dois — no seu perfil ou em uma comunidade.
        </p>
      </header>
      <PostComposer
        allowDestinationChoice
        startWithImage
        onCreated={(post) => navigate(`/posts/${post.id}`)}
      />
    </div>
  )
}
