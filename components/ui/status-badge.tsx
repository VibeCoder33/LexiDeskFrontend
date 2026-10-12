import * as React from 'react'
import { cn } from '@/lib/utils'

export type StatusBadgeVariant = 'action' | 'verified' | 'urgent' | 'warning' | 'muted'

export interface StatusBadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant: StatusBadgeVariant
  icon?: React.ReactNode
}

/**
 * StatusBadge — single source of truth for status badges across LexiDesk.
 * Styled strictly per theme.txt section 5.
 */
export const StatusBadge: React.FC<StatusBadgeProps> = ({
  variant,
  icon,
  className,
  children,
  ...props
}) => {
  const variantStyles: Record<StatusBadgeVariant, string> = {
    // Action / Missing: secondary at 10% opacity bg + secondary text
    action:
      'bg-[color-mix(in_srgb,var(--secondary)_10%,transparent)] text-[var(--secondary)] border-[color-mix(in_srgb,var(--secondary)_25%,transparent)]',
    // Verified / Done: success at 10% opacity bg + success text
    verified:
      'bg-[color-mix(in_srgb,var(--success)_10%,transparent)] text-[var(--success)] border-[color-mix(in_srgb,var(--success)_25%,transparent)]',
    // Urgent: deep crimson solid accent with white text
    urgent:
      'bg-[var(--accent)] text-[var(--accent-foreground)] border-transparent font-semibold shadow-xs',
    // Warning / Needs Review: warning at 10% opacity bg + warning text
    warning:
      'bg-[color-mix(in_srgb,var(--warning)_12%,transparent)] text-[#B45309] border-[color-mix(in_srgb,var(--warning)_25%,transparent)]',
    // Muted / Closed: muted bg + muted foreground text
    muted:
      'bg-[var(--muted)] text-[var(--muted-foreground)] border-[var(--border)]',
  }

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium border transition-colors select-none',
        variantStyles[variant],
        className
      )}
      {...props}
    >
      {icon && <span className="shrink-0">{icon}</span>}
      <span>{children}</span>
    </span>
  )
}
