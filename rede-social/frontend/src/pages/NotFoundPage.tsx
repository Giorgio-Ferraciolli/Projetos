import { SearchX } from 'lucide-react'
import { Link } from 'react-router'

import { EmptyState } from '../components/ui/States'
import { usePageTitle } from '../hooks/usePageTitle'

export function NotFoundPage({ message = 'A página que você procura não existe.' }) {
  usePageTitle('Não encontrado')
  return (
    <EmptyState
      icon={<SearchX size={28} />}
      title="Nada por aqui"
      description={message}
      action={<Link to="/">Voltar para o feed</Link>}
    />
  )
}
