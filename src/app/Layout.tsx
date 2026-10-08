import { Outlet } from 'react-router-dom'
import { BottomNav } from './BottomNav'
import { OfflineBanner } from '../ui/OfflineBanner'
import { UpdatePrompt } from '../ui/UpdatePrompt'

export function Layout() {
  return (
    <div className="mx-auto flex min-h-dvh max-w-xl flex-col">
      <OfflineBanner />
      <main className="flex-1 px-4 pt-[max(1.5rem,env(safe-area-inset-top))] pb-28">
        <Outlet />
      </main>
      <UpdatePrompt />
      <BottomNav />
    </div>
  )
}
