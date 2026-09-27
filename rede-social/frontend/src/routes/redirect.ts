import type { Location } from 'react-router'

/** Página que o usuário tentou abrir antes do login (com ?busca e #âncora), ou o feed. */
export function redirectTarget(state: unknown): string {
  const from = (state as { from?: Location } | null)?.from
  return from ? `${from.pathname}${from.search}${from.hash}` : '/'
}
