import { Plus, Search, UsersRound } from 'lucide-react'
import { useState } from 'react'
import { Link, useSearchParams } from 'react-router'

import { CommunityCard } from '../components/communities/CommunityCard'
import { Button } from '../components/ui/Button'
import { PageLoader } from '../components/ui/Spinner'
import { EmptyState, ErrorState } from '../components/ui/States'
import { useCommunityList } from '../hooks/useCommunities'
import { useDebouncedValue } from '../hooks/useDebouncedValue'
import { usePageTitle } from '../hooks/usePageTitle'
import styles from './Page.module.css'
import communitiesStyles from './CommunitiesPage.module.css'

type Tab = 'all' | 'mine'

export function CommunitiesPage() {
  usePageTitle('Comunidades')
  const [searchParams, setSearchParams] = useSearchParams()
  const tab: Tab = searchParams.get('tab') === 'mine' ? 'mine' : 'all'
  const [input, setInput] = useState('')
  const q = useDebouncedValue(input.trim(), 300)
  const list = useCommunityList({ q, mine: tab === 'mine' })
  const communities = list.data?.pages.flatMap((page) => page.items) ?? []

  return (
    <div className={styles.stack}>
      <header className={styles.pageHeader}>
        <div>
          <h1 className={styles.pageTitle}>Comunidades</h1>
          <p className={styles.pageSubtitle}>Encontre grupos com os mesmos interesses que você.</p>
        </div>
        <Link to="/communities/new" className={communitiesStyles.createLink}>
          <Plus size={18} /> Criar comunidade
        </Link>
      </header>

      <div className={styles.tabs} role="group" aria-label="Filtrar comunidades">
        {(['all', 'mine'] as const).map((value) => (
          <button
            key={value}
            type="button"
            aria-pressed={tab === value}
            className={`${styles.tab} ${tab === value ? styles.tabActive : ''}`}
            onClick={() => setSearchParams(value === 'mine' ? { tab: 'mine' } : {}, { replace: true })}
          >
            {value === 'all' ? 'Todas' : 'Minhas comunidades'}
          </button>
        ))}
      </div>

      <div className={styles.searchBox} role="search">
        <Search size={20} className={styles.searchIcon} aria-hidden="true" />
        <input
          type="search"
          className={styles.searchInput}
          value={input}
          onChange={(event) => setInput(event.target.value)}
          placeholder="Buscar comunidades"
          aria-label="Buscar comunidades"
        />
      </div>

      {list.isPending && <PageLoader />}
      {list.isError && <ErrorState error={list.error} onRetry={() => void list.refetch()} />}

      {list.isSuccess && communities.length === 0 && (
        <EmptyState
          icon={<UsersRound size={28} />}
          title={q ? 'Nenhuma comunidade encontrada' : tab === 'mine' ? 'Você ainda não participa de comunidades' : 'Nenhuma comunidade ainda'}
          description={
            q ? `Nenhum resultado para "${q}".` : 'Que tal criar a primeira e convidar outras pessoas?'
          }
          action={
            !q && (
              <Link to="/communities/new" className={communitiesStyles.createLink}>
                <Plus size={18} /> Criar comunidade
              </Link>
            )
          }
        />
      )}

      {communities.length > 0 && (
        <div className={communitiesStyles.grid}>
          {communities.map((community) => (
            <CommunityCard key={community.id} community={community} />
          ))}
        </div>
      )}

      {list.hasNextPage && (
        <Button
          variant="secondary"
          onClick={() => void list.fetchNextPage()}
          isLoading={list.isFetchingNextPage}
          className={communitiesStyles.loadMore}
        >
          Carregar mais
        </Button>
      )}
    </div>
  )
}
