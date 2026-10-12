'use client'

import * as React from 'react'
import { GlobalCommandPalette } from './global-command-palette'
import { Search } from 'lucide-react'

interface SiteHeaderProps {
  title?: string
  subtitle?: string
}

export function SiteHeader({ title, subtitle }: SiteHeaderProps) {
  const [isCommandOpen, setIsCommandOpen] = React.useState(false)

  return (
    <>
      <header className="h-14 border-b border-[var(--border)] bg-[var(--card)] px-6 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          {title && (
            <div>
              <h1 className="text-sm font-semibold text-[var(--foreground)] leading-none">
                {title}
              </h1>
              {subtitle && (
                <p className="text-[11px] text-[var(--muted-foreground)] mt-0.5">
                  {subtitle}
                </p>
              )}
            </div>
          )}
        </div>

        {/* Omni-Search Trigger Button */}
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setIsCommandOpen(true)}
            className="flex items-center gap-2 px-3 py-1.5 rounded-md border border-[var(--border)] bg-[var(--background)] hover:bg-[var(--muted)] text-xs text-[var(--muted-foreground)] transition-colors cursor-pointer w-60 justify-between"
          >
            <div className="flex items-center gap-2">
              <Search className="w-3.5 h-3.5 text-[var(--muted-foreground)]" />
              <span>Omni-Search…</span>
            </div>
            <kbd className="text-[10px] bg-[var(--card)] px-1.5 py-0.5 rounded border border-[var(--border)] font-mono text-[var(--muted-foreground)]">
              Ctrl+K
            </kbd>
          </button>
        </div>
      </header>

      <GlobalCommandPalette open={isCommandOpen} onOpenChange={setIsCommandOpen} />
    </>
  )
}
