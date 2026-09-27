import { useContext } from 'react'

import { ToastContext, type ToastApi } from '../context/toastContext'

export function useToast(): ToastApi {
  const context = useContext(ToastContext)
  if (!context) throw new Error('useToast precisa estar dentro de <ToastProvider>.')
  return context
}
