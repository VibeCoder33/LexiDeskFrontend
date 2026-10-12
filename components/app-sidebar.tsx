'use client'

import * as React from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { User } from '@/types/auth'
import { NavUser } from './nav-user'
import { Button } from '@/components/ui/button'
import { LayoutDashboard, Users, UserPlus } from 'lucide-react'

interface AppSidebarProps {
  user: User
  onUserUpdate?: (updated: User) => void
}

export function AppSidebar({ user, onUserUpdate }: AppSidebarProps) {
  const pathname = usePathname()

  const navItems = [
    {
      title: 'Home',
      href: '/dashboard',
      icon: LayoutDashboard,
      isActive: pathname === '/dashboard',
    },
    {
      title: 'Clients',
      href: '/dashboard/clients',
      icon: Users,
      isActive: pathname.startsWith('/dashboard/clients') && pathname !== '/dashboard/clients/new',
    },
  ]

  return (
    <aside className="w-64 h-screen shrink-0 bg-[var(--card)] border-r border-[var(--border)] flex flex-col justify-between select-none">
      <div className="flex flex-col flex-1 p-4 overflow-y-auto">
        {/* Brand Header */}
        <div className="flex items-center gap-2.5 px-2 py-3 mb-4">
          <div className="w-8 h-8 rounded-lg bg-[var(--primary)] flex items-center justify-center text-white font-bold text-base shadow-xs">
            L
          </div>
          <div>
            <span className="text-base font-bold tracking-tight text-[var(--foreground)] block leading-none">
              LexiDesk
            </span>
            <span className="text-[10px] text-[var(--muted-foreground)] block mt-0.5">
              Client Document Vault
            </span>
          </div>
        </div>

        {/* Primary Navigation */}
        <nav className="space-y-1 mb-4">
          {navItems.map((item) => {
            const Icon = item.icon
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 px-3 py-2 rounded-md text-xs font-medium transition-colors ${
                  item.isActive
                    ? 'bg-[color-mix(in_srgb,var(--primary)_10%,transparent)] text-[var(--primary)] font-bold'
                    : 'text-[var(--foreground)] hover:bg-[var(--muted)]'
                }`}
              >
                <Icon
                  className={`w-4 h-4 shrink-0 ${
                    item.isActive ? 'text-[var(--primary)]' : 'text-[var(--muted-foreground)]'
                  }`}
                />
                <span>{item.title}</span>
              </Link>
            )
          })}
        </nav>

        {/* Full-width Create Client button below nav */}
        <div className="px-1 mb-6">
          <Link href="/dashboard/clients/new">
            <Button
              className="w-full bg-[var(--primary)] text-white hover:bg-[color-mix(in_srgb,var(--primary)_90%,black)] text-xs h-9 font-medium shadow-xs flex items-center justify-center gap-2"
            >
              <UserPlus className="w-3.5 h-3.5" />
              <span>Create Client</span>
            </Button>
          </Link>
        </div>
      </div>

      {/* Footer Profile Area */}
      <div className="p-3 border-t border-[var(--border)] bg-[var(--card)]">
        <NavUser user={user} onUserUpdate={onUserUpdate} />
      </div>
    </aside>
  )
}
