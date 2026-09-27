import { ImagePlus, Send } from 'lucide-react'
import { useId, useState, type FormEvent } from 'react'

import { getErrorMessage } from '../../api/client'
import type { Post } from '../../api/types'
import { useCurrentUser } from '../../hooks/useAuth'
import { useMyCommunities } from '../../hooks/useCommunities'
import { useCreatePost } from '../../hooks/usePosts'
import { useToast } from '../../hooks/useToast'
import { MAX_CAPTION_LENGTH } from '../../lib/validation'
import { Avatar } from '../ui/Avatar'
import { Button } from '../ui/Button'
import { ImagePicker } from '../ui/ImagePicker'
import { FormAlert } from '../ui/States'
import styles from './PostComposer.module.css'

interface PostComposerProps {
  /** Publica sempre nesta comunidade (página da comunidade). */
  communityId?: number
  /** Mostra um seletor "Publicar em": meu perfil ou uma das minhas comunidades. */
  allowDestinationChoice?: boolean
  /** Já começa com o seletor de imagem aberto. */
  startWithImage?: boolean
  onCreated?: (post: Post) => void
}

export function PostComposer({
  communityId,
  allowDestinationChoice = false,
  startWithImage = false,
  onCreated,
}: PostComposerProps) {
  const user = useCurrentUser()
  const toast = useToast()
  const createPost = useCreatePost()
  const captionId = useId()
  const [caption, setCaption] = useState('')
  const [image, setImage] = useState<File | null>(null)
  const [showImagePicker, setShowImagePicker] = useState(startWithImage)
  const [destination, setDestination] = useState<number | null>(communityId ?? null)
  const [error, setError] = useState<string | null>(null)

  const firstName = user.name.split(' ')[0]
  const tooLong = caption.length > MAX_CAPTION_LENGTH
  const canSubmit = (caption.trim().length > 0 || image !== null) && !tooLong

  function handleSubmit(event: FormEvent) {
    event.preventDefault()
    if (!canSubmit) return
    setError(null)
    createPost.mutate(
      { caption, image, communityId: destination },
      {
        onSuccess: (post) => {
          setCaption('')
          setImage(null)
          setShowImagePicker(startWithImage)
          toast.success('Publicação criada!')
          onCreated?.(post)
        },
        onError: (mutationError) => setError(getErrorMessage(mutationError)),
      },
    )
  }

  return (
    <form className={styles.composer} onSubmit={handleSubmit} aria-label="Criar publicação">
      <div className={styles.row}>
        <Avatar name={user.name} src={user.avatar_url} size="md" />
        <label htmlFor={captionId} className="visually-hidden">
          Legenda da publicação
        </label>
        <textarea
          id={captionId}
          className={styles.textarea}
          value={caption}
          onChange={(event) => setCaption(event.target.value)}
          placeholder={`No que você está pensando, ${firstName}?`}
          rows={caption.length > 80 ? 4 : 2}
          disabled={createPost.isPending}
        />
      </div>

      {showImagePicker && (
        <ImagePicker file={image} onChange={setImage} disabled={createPost.isPending} />
      )}

      {allowDestinationChoice && <DestinationSelect value={destination} onChange={setDestination} />}

      {error && <FormAlert>{error}</FormAlert>}

      <div className={styles.footer}>
        <Button
          variant="ghost"
          size="sm"
          icon={<ImagePlus size={18} />}
          onClick={() => {
            // Esconder o seletor também descarta a imagem (senão ela seria publicada "invisível").
            if (showImagePicker) setImage(null)
            setShowImagePicker(!showImagePicker)
          }}
          aria-pressed={showImagePicker}
          className={styles.imageToggle}
        >
          Foto
        </Button>
        <span className={`${styles.counter} ${tooLong ? styles.counterError : ''}`}>
          {caption.length > MAX_CAPTION_LENGTH - 200 && `${caption.length}/${MAX_CAPTION_LENGTH}`}
        </span>
        <Button
          type="submit"
          size="sm"
          icon={<Send size={16} />}
          disabled={!canSubmit}
          isLoading={createPost.isPending}
        >
          Publicar
        </Button>
      </div>
    </form>
  )
}

function DestinationSelect({
  value,
  onChange,
}: {
  value: number | null
  onChange: (communityId: number | null) => void
}) {
  const selectId = useId()
  const { data: communities = [] } = useMyCommunities()
  // Sem comunidades, a única opção seria "Meu perfil": não há o que escolher.
  if (communities.length === 0) return null

  return (
    <div className={styles.destination}>
      <label htmlFor={selectId}>Publicar em</label>
      <select
        id={selectId}
        value={value ?? ''}
        onChange={(event) => onChange(event.target.value ? Number(event.target.value) : null)}
        className={styles.select}
      >
        <option value="">Meu perfil</option>
        {communities.map((community) => (
          <option key={community.id} value={community.id}>
            Comunidade: {community.name}
          </option>
        ))}
      </select>
    </div>
  )
}
