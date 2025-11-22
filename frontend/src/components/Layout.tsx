import type { ReactNode } from 'react'
import { useSelector } from 'react-redux'
import type { RootState } from '../store'
import { Navigation } from './Navigation'

interface LayoutProps {
  children: ReactNode
}

export function Layout({ children }: LayoutProps) {
  const isAuthenticated = useSelector((state: RootState) => state.auth.isAuthenticated)

  return (
    <div className="min-h-screen bg-background text-foreground">
      {isAuthenticated && <Navigation />}
      <main className={isAuthenticated ? "pt-16" : ""}>{children}</main>
    </div>
  )
}