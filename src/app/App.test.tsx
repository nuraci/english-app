import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'
import { App } from './App'
import { navItems } from './navItems'

vi.mock('virtual:pwa-register/react', () => ({
  useRegisterSW: () => ({
    offlineReady: [false, vi.fn()],
    needRefresh: [false, vi.fn()],
    updateServiceWorker: vi.fn(),
  }),
}))

function renderAt(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <App />
    </MemoryRouter>,
  )
}

describe('App', () => {
  it('mostra le quattro voci della bottom navigation', () => {
    renderAt('/')
    const nav = screen.getByRole('navigation', { name: 'Navigazione principale' })
    for (const item of navItems) {
      expect(nav).toHaveTextContent(item.label)
    }
  })

  it.each([
    ['/', 'Oggi'],
    ['/allenamenti', 'Allenamenti'],
    ['/progressi', 'Progressi'],
    ['/impostazioni', 'Impostazioni'],
  ])('la rotta %s mostra la schermata %s', (path, title) => {
    renderAt(path)
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(title)
  })

  it('una rotta sconosciuta riporta a Oggi', () => {
    renderAt('/non-esiste')
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Oggi')
  })
})
