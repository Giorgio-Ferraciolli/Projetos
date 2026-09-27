import { Search, UserRoundSearch } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { useSearchParams } from 'react-router'

import { Button } from '../components/ui/Button'
import { PageLoader } from '../components/ui/Spinner'
import { EmptyState, ErrorState } from '../components/ui/States'
import { UserCard } from '../components/users/UserCard'
import { useCurrentUser } from '../hooks/useAuth'
import { useDebouncedValue } from '../hooks/useDebouncedValue'
import { usePageTitle } from '../hooks/usePageTitle'
import { useUserSearch } from '../hooks/useUsers'
import { pluralize } from '../lib/format'
import styles from './Page.module.css'
import exploreStyles from './ExplorePage.module.css'

export function ExplorePage() {
  usePageTitle('Explorar pessoas')
  const currentUser = useCurrentUser()
  const [searchParams, setSearchParams] = useSearchParams()
  // A URL (?q=) é a fonte da verdade da busca: permite voltar, compartilhar o link
  // e receber buscas feitas pela barra superior.
  const query = searchParams.get('q') ?? ''
  const [input, setInput] = useState(query)
  const debouncedInput = useDebouncedValue(input.trim(), 300)
  const lastTypedQuery = useRef(debouncedInput)
  const search = useUserSearch(query)

  // Ao parar de digitar, grava o texto na URL.
  useEffect(() => {
    if (debouncedInput === lastTypedQuery.current) return
    lastTypedQuery.current = debouncedInput
    if (debouncedInput !== query) {
      setSearchParams(debouncedInput ? { q: debouncedInput } : {}, { replace: true })
    }
  }, [debouncedInput, query, setSearchParams])

  // Busca vinda de fora (barra superior): atualiza o campo. Ajustar o estado durante a
  // renderização evita um efeito (https://react.dev/learn/you-might-not-need-an-effect).
  const [previousQuery, setPreviousQuery] = useState(query)
  if (query !== previousQuery) {
    setPreviousQuery(query)
    setInput(query)
  }

  const users = search.data?.pages.flatMap((page) => page.items) ?? []
  const total = search.data?.pages[0]?.total ?? 0

  return (
    <div className={styles.stack}>
      <header>
        <h1 className={styles.pageTitle}>Explorar pessoas</h1>
        <p className={styles.pageSubtitle}>Encontre pessoas pelo nome ou nome de usuário.</p>
      </header>

      <div className={styles.searchBox} role="search">
        <Search size={20} className={styles.searchIcon} aria-hidden="true" />
        <input
          type="search"
          className={styles.searchInput}
          value={input}
          onChange={(event) => setInput(event.target.value)}
          placeholder="Buscar por nome ou @usuário"
          aria-label="Buscar pessoas"
          autoFocus
        />
      </div>

      {search.isPending && <PageLoader />}
      {search.isError && <ErrorState error={search.error} onRetry={() => void search.refetch()} />}

      {search.isSuccess && users.length === 0 && (
        <EmptyState
          icon={<UserRoundSearch size={28} />}
          title="Ninguém encontrado"
          description={query ? `Nenhum resultado para "${query}".` : 'Ainda não há usuários.'}
        />
      )}

      {users.length > 0 && (
        <>
          <p className={styles.resultCount} aria-live="polite">
            {pluralize(total, 'pessoa encontrada', 'pessoas encontradas')}
          </p>
          <div className={exploreStyles.grid}>
            {users.map((user) => (
              <UserCard key={user.id} user={user} isCurrentUser={user.id === currentUser.id} />
            ))}
          </div>
          {search.hasNextPage && (
            <Button
              variant="secondary"
              onClick={() => void search.fetchNextPage()}
              isLoading={search.isFetchingNextPage}
              className={exploreStyles.loadMore}
            >
              Carregar mais
            </Button>
          )}
        </>
      )}
    </div>
  )
}
