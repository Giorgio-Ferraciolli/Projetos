import '@testing-library/jest-dom/vitest'
import { cleanup } from '@testing-library/react'
import { afterEach, vi } from 'vitest'

afterEach(() => {
  cleanup()
  // Desfaz os vi.stubGlobal('fetch', ...) feitos pelos testes.
  vi.unstubAllGlobals()
})
