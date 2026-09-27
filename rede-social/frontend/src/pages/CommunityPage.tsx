import { zodResolver } from '@hookform/resolvers/zod'
import { Camera, Crown, LogIn, LogOut, MessageSquareText, PenLine, UsersRound } from 'lucide-react'
import { useRef, useState, type ChangeEvent } from 'react'
import { useForm } from 'react-hook-form'
import { Link, useParams, useSearchParams } from 'react-router'

import { ApiError, getErrorMessage } from '../api/client'
import type { CommunityDetail } from '../api/types'
import { CommunityCover } from '../components/communities/CommunityCover'
import { PostComposer } from '../components/posts/PostComposer'
import { PostList } from '../components/posts/PostList'
import { Avatar } from '../components/ui/Avatar'
import { Button } from '../components/ui/Button'
import { TextAreaField, TextField } from '../components/ui/Field'
import { PageLoader } from '../components/ui/Spinner'
import { EmptyState, ErrorState, FormAlert } from '../components/ui/States'
import {
  useCommunity,
  useCommunityMembers,
  useMembership,
  useUpdateCommunity,
  useUpdateCommunityCover,
} from '../hooks/useCommunities'
import { usePageTitle } from '../hooks/usePageTitle'
import { useCommunityPosts } from '../hooks/usePosts'
import { useToast } from '../hooks/useToast'
import { formatMonthYear, pluralize } from '../lib/format'
import { applyServerErrors } from '../lib/forms'
import {
  ACCEPTED_IMAGE_TYPES,
  communitySchema,
  validateImageFile,
  type CommunityValues,
} from '../lib/validation'
import { NotFoundPage } from './NotFoundPage'
import styles from './Page.module.css'
import communityStyles from './CommunityPage.module.css'

type Tab = 'posts' | 'members'

export function CommunityPage() {
  const communityId = Number(useParams().communityId)
  // A key faz o React criar uma página nova ao ir de uma comunidade para outra pelo menu:
  // sem ela, estados locais (texto do post, formulário de edição) passariam de uma para outra.
  return <CommunityView key={communityId} communityId={communityId} />
}

function CommunityView({ communityId }: { communityId: number }) {
  const { data: community, isPending, isError, error, refetch } = useCommunity(communityId)
  const [searchParams, setSearchParams] = useSearchParams()
  const tab: Tab = searchParams.get('tab') === 'members' ? 'members' : 'posts'
  const [editing, setEditing] = useState(false)
  usePageTitle(community?.name ?? 'Comunidade')

  const invalidId = !Number.isInteger(communityId) || communityId <= 0
  if (invalidId || (error instanceof ApiError && error.status === 404)) {
    return <NotFoundPage message="Esta comunidade não existe." />
  }
  if (isPending) return <PageLoader />
  if (isError) return <ErrorState error={error} onRetry={() => void refetch()} />

  return (
    <div className={styles.stack}>
      <CommunityHeader community={community} onEdit={() => setEditing((value) => !value)} />

      {editing && community.is_owner && (
        <EditCommunityForm community={community} onDone={() => setEditing(false)} />
      )}

      <div className={styles.tabs} role="group" aria-label="Seções da comunidade">
        <button
          type="button"
          aria-pressed={tab === 'posts'}
          className={`${styles.tab} ${tab === 'posts' ? styles.tabActive : ''}`}
          onClick={() => setSearchParams({}, { replace: true })}
        >
          Publicações
        </button>
        <button
          type="button"
          aria-pressed={tab === 'members'}
          className={`${styles.tab} ${tab === 'members' ? styles.tabActive : ''}`}
          onClick={() => setSearchParams({ tab: 'members' }, { replace: true })}
        >
          Membros ({community.members_count})
        </button>
      </div>

      {tab === 'posts' ? <CommunityPosts community={community} /> : <MemberList communityId={community.id} />}
    </div>
  )
}

function CommunityHeader({ community, onEdit }: { community: CommunityDetail; onEdit: () => void }) {
  const toast = useToast()
  const membership = useMembership(community.id)
  const updateCover = useUpdateCommunityCover(community.id)
  const coverInputRef = useRef<HTMLInputElement>(null)

  function handleMembership() {
    const action = community.is_member ? 'leave' : 'join'
    membership.mutate(action, {
      onSuccess: () =>
        toast.success(action === 'join' ? `Você entrou em ${community.name}!` : 'Você saiu da comunidade.'),
      onError: (error) => toast.error(getErrorMessage(error)),
    })
  }

  function handleCoverChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return
    const validationError = validateImageFile(file)
    if (validationError) {
      toast.error(validationError)
      return
    }
    updateCover.mutate(file, {
      onSuccess: () => toast.success('Capa atualizada!'),
      onError: (error) => toast.error(getErrorMessage(error)),
    })
  }

  return (
    <section className={communityStyles.header}>
      <div className={communityStyles.coverWrapper}>
        <CommunityCover name={community.name} url={community.cover_url} className={communityStyles.cover} />
        {community.is_owner && (
          <>
            <input
              ref={coverInputRef}
              type="file"
              accept={ACCEPTED_IMAGE_TYPES.join(',')}
              className="visually-hidden"
              onChange={handleCoverChange}
              tabIndex={-1}
              aria-hidden="true"
            />
            <Button
              size="sm"
              variant="secondary"
              icon={<Camera size={16} />}
              className={communityStyles.coverButton}
              onClick={() => coverInputRef.current?.click()}
              isLoading={updateCover.isPending}
            >
              Trocar capa
            </Button>
          </>
        )}
      </div>

      <div className={communityStyles.body}>
        <div className={communityStyles.titleRow}>
          <div>
            <h1 className={communityStyles.name}>{community.name}</h1>
            <p className={communityStyles.meta}>
              <UsersRound size={16} /> {pluralize(community.members_count, 'membro', 'membros')}
              <span aria-hidden="true">·</span>
              {pluralize(community.posts_count, 'publicação', 'publicações')}
            </p>
          </div>
          <div className={communityStyles.actions}>
            {community.is_owner ? (
              <Button variant="secondary" icon={<PenLine size={16} />} onClick={onEdit}>
                Editar
              </Button>
            ) : (
              <Button
                variant={community.is_member ? 'secondary' : 'primary'}
                icon={community.is_member ? <LogOut size={16} /> : <LogIn size={16} />}
                onClick={handleMembership}
                isLoading={membership.isPending}
              >
                {community.is_member ? 'Sair da comunidade' : 'Participar'}
              </Button>
            )}
          </div>
        </div>
        <p className={communityStyles.description}>{community.description}</p>
        <p className={communityStyles.owner}>
          Criada por{' '}
          <Link to={`/u/${community.owner.username}`}>{community.owner.name}</Link> em{' '}
          {formatMonthYear(community.created_at)}
        </p>
      </div>
    </section>
  )
}

function EditCommunityForm({ community, onDone }: { community: CommunityDetail; onDone: () => void }) {
  const toast = useToast()
  const updateCommunity = useUpdateCommunity(community.id)
  const [formError, setFormError] = useState<string | null>(null)
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isDirty },
  } = useForm<CommunityValues>({
    resolver: zodResolver(communitySchema),
    defaultValues: { name: community.name, description: community.description },
  })

  const onSubmit = handleSubmit((values) => {
    setFormError(null)
    updateCommunity.mutate(values, {
      onSuccess: () => {
        toast.success('Comunidade atualizada!')
        onDone()
      },
      onError: (error) =>
        setFormError(applyServerErrors(error, setError, ['name', 'description'] as const)),
    })
  })

  return (
    <section className={styles.card} aria-labelledby="edit-community-title">
      <h2 id="edit-community-title" className={styles.cardTitle}>
        Editar comunidade
      </h2>
      <p className={styles.cardDescription}>Apenas você, como dono, pode alterar estas informações.</p>
      <form className={styles.form} onSubmit={onSubmit} noValidate>
        {formError && <FormAlert>{formError}</FormAlert>}
        <TextField label="Nome" error={errors.name?.message} {...register('name')} />
        <TextAreaField
          label="Descrição"
          rows={4}
          error={errors.description?.message}
          {...register('description')}
        />
        <div className={styles.formActions}>
          <Button variant="ghost" onClick={onDone}>
            Cancelar
          </Button>
          <Button type="submit" isLoading={updateCommunity.isPending} disabled={!isDirty}>
            Salvar
          </Button>
        </div>
      </form>
    </section>
  )
}

function CommunityPosts({ community }: { community: CommunityDetail }) {
  const posts = useCommunityPosts(community.id)

  return (
    <>
      {community.is_member ? (
        <PostComposer communityId={community.id} />
      ) : (
        <p className={communityStyles.notice}>Participe da comunidade para publicar aqui.</p>
      )}
      <PostList
        query={posts}
        empty={
          <EmptyState
            icon={<MessageSquareText size={28} />}
            title="Nenhuma publicação ainda"
            description={
              community.is_member
                ? 'Seja a primeira pessoa a publicar nesta comunidade!'
                : 'Participe da comunidade e comece a conversa.'
            }
          />
        }
      />
    </>
  )
}

function MemberList({ communityId }: { communityId: number }) {
  const members = useCommunityMembers(communityId)

  if (members.isPending) return <PageLoader />
  if (members.isError) return <ErrorState error={members.error} onRetry={() => void members.refetch()} />

  const items = members.data.pages.flatMap((page) => page.items)
  return (
    <section className={communityStyles.members} aria-label="Membros">
      <ul className={communityStyles.memberList}>
        {items.map(({ user, role, joined_at }) => (
          <li key={user.id}>
            <Link to={`/u/${user.username}`} className={communityStyles.member}>
              <Avatar name={user.name} src={user.avatar_url} size="md" />
              <span className={communityStyles.memberText}>
                <strong>{user.name}</strong>
                <span>
                  @{user.username} · desde {formatMonthYear(joined_at)}
                </span>
              </span>
              {role === 'owner' && (
                <span className={communityStyles.ownerBadge}>
                  <Crown size={14} /> Dono
                </span>
              )}
            </Link>
          </li>
        ))}
      </ul>
      {members.hasNextPage && (
        <Button
          variant="secondary"
          onClick={() => void members.fetchNextPage()}
          isLoading={members.isFetchingNextPage}
        >
          Carregar mais membros
        </Button>
      )}
    </section>
  )
}
