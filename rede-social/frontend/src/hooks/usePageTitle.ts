import { useEffect } from 'react'

/** Define o título da aba do navegador: "Feed · Rede Social". */
export function usePageTitle(title: string | undefined) {
  useEffect(() => {
    document.title = title ? `${title} · Rede Social` : 'Rede Social'
  }, [title])
}
