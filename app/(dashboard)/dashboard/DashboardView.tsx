'use client'

import * as React from 'react'
import Link from 'next/link'
import useSWR from 'swr'
import {
  DashboardData,
  fetchDashboardData,
  nudgeClient,
  formatApiError,
} from '@/lib/api'
import { StatusBadge } from '@/components/ui/status-badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { SiteHeader } from '@/components/site-header'
import { toast } from 'sonner'
import {
  Clock,
  ArrowRight,
  Send,
  CheckCircle2,
  AlertTriangle,
  FolderOpen,
} from 'lucide-react'

interface DashboardViewProps {
  initialData: DashboardData | null
}

export function DashboardView({ initialData }: DashboardViewProps) {
  const { data, mutate } = useSWR<DashboardData>('/api/dashboard', fetchDashboardData, {
    fallbackData: initialData || undefined,
    revalidateOnFocus: true,
  })

  const [nudgingId, setNudgingId] = React.useState<string | null>(null)

  const handleNudge = async (clientId: string) => {
    setNudgingId(clientId)
    try {
      const res = await nudgeClient(clientId)
      toast.success('Nudge recorded. Opening WhatsApp…')
      window.open(res.nudgeUrl, '_blank', 'noopener,noreferrer')
      mutate()
    } catch (err: unknown) {
      toast.error(formatApiError(err))
    } finally {
      setNudgingId(null)
    }
  }

  const roleNameMap: Record<string, string> = {
    PROPERTY_LAWYER: 'Property Attorney Dashboard',
    LITIGATION_LAWYER: 'Litigation Lawyer Dashboard',
    CA: 'Chartered Accountant Dashboard',
    SUPER: 'Administrator Dashboard',
  }

  const title = data ? roleNameMap[data.role] || 'Professional Dashboard' : 'Dashboard'

  return (
    <div className="flex flex-col min-h-full">
      <SiteHeader title={title} subtitle="Overview of pending uploads, hearings, and deadlines" />

      <div className="p-6 md:p-8 space-y-6 max-w-7xl mx-auto w-full">
        {/* Hero Metric Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {data?.metrics.map((metric) => (
            <Card
              key={metric.key}
              className={`bg-[var(--card)] border transition-shadow hover:shadow-elevation-1 ${
                metric.urgent
                  ? 'border-[var(--secondary)] bg-[color-mix(in_srgb,var(--secondary)_4%,var(--card))]'
                  : 'border-[var(--border)]'
              }`}
            >
              <CardHeader className="pb-2 pt-4 px-5">
                <CardTitle className="text-xs font-medium text-[var(--muted-foreground)] flex items-center justify-between">
                  <span>{metric.label}</span>
                  {metric.urgent && (
                    <StatusBadge variant="urgent" className="text-[10px] px-1.5 py-0">
                      Urgent
                    </StatusBadge>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent className="px-5 pb-4">
                <div
                  className={`text-3xl font-bold tracking-tight ${
                    metric.urgent ? 'text-[var(--secondary)]' : 'text-[var(--foreground)]'
                  }`}
                >
                  {metric.value}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Two Columns: Action Required & Waiting on Client */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Column 1: Action Required */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-bold text-[var(--foreground)]">
                  Action Required
                </h2>
                <span className="text-xs px-2 py-0.5 rounded-full bg-[color-mix(in_srgb,var(--secondary)_10%,transparent)] text-[var(--secondary)] font-semibold">
                  {data?.actionRequired.length || 0}
                </span>
              </div>
              <span className="text-xs text-[var(--muted-foreground)]">
                Unreviewed uploads & items needing review
              </span>
            </div>

            <Card className="bg-[var(--card)] border border-[var(--border)] overflow-hidden divide-y divide-[var(--border)] shadow-xs">
              {data?.actionRequired.length === 0 ? (
                <div className="p-8 text-center text-xs text-[var(--muted-foreground)] space-y-2">
                  <CheckCircle2 className="w-8 h-8 text-[var(--success)] mx-auto opacity-80" />
                  <p className="font-medium text-[var(--foreground)]">All Caught Up</p>
                  <p>No new uploads pending your review.</p>
                </div>
              ) : (
                data?.actionRequired.map((item) => (
                  <Link
                    key={item.clientId}
                    href={`/dashboard/clients/${item.clientId}`}
                    className="p-4 flex items-center justify-between hover:bg-[var(--muted)] transition-colors group block"
                  >
                    <div className="space-y-1 min-w-0 pr-4">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold text-[var(--foreground)] truncate">
                          {item.name}
                        </span>
                        <span className="text-[11px] text-[var(--muted-foreground)]">
                          &bull; {item.matterType}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 flex-wrap">
                        {item.newFiles > 0 && (
                          <StatusBadge variant="action">
                            {item.newFiles} New {item.newFiles === 1 ? 'File' : 'Files'}
                          </StatusBadge>
                        )}
                        {item.needsReview > 0 && (
                          <StatusBadge variant="warning" icon={<AlertTriangle className="w-3 h-3" />}>
                            Review Required
                          </StatusBadge>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      {item.lastUploadAt && (
                        <span className="text-[11px] text-[var(--muted-foreground)] hidden sm:inline">
                          {new Date(item.lastUploadAt).toLocaleDateString('en-IN', {
                            day: 'numeric',
                            month: 'short',
                          })}
                        </span>
                      )}
                      <ArrowRight className="w-4 h-4 text-[var(--muted-foreground)] group-hover:text-[var(--primary)] group-hover:translate-x-0.5 transition-all" />
                    </div>
                  </Link>
                ))
              )}
            </Card>
          </div>

          {/* Column 2: Waiting on Client */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-bold text-[var(--foreground)]">
                  Waiting on Client
                </h2>
                <span className="text-xs px-2 py-0.5 rounded-full bg-[var(--muted)] text-[var(--muted-foreground)] font-semibold">
                  {data?.waitingOnClient.length || 0}
                </span>
              </div>
              <span className="text-xs text-[var(--muted-foreground)]">
                Active link sent, documents missing
              </span>
            </div>

            <Card className="bg-[var(--card)] border border-[var(--border)] overflow-hidden divide-y divide-[var(--border)] shadow-xs">
              {data?.waitingOnClient.length === 0 ? (
                <div className="p-8 text-center text-xs text-[var(--muted-foreground)] space-y-2">
                  <FolderOpen className="w-8 h-8 text-[var(--muted-foreground)] mx-auto opacity-60" />
                  <p className="font-medium text-[var(--foreground)]">No Pending Requests</p>
                  <p>All clients have submitted their required files.</p>
                </div>
              ) : (
                data?.waitingOnClient.map((item) => (
                  <div
                    key={item.clientId}
                    className="p-4 flex items-center justify-between hover:bg-[var(--muted)] transition-colors gap-3"
                  >
                    <Link
                      href={`/dashboard/clients/${item.clientId}`}
                      className="min-w-0 flex-1 space-y-1 block group"
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold text-[var(--foreground)] group-hover:text-[var(--primary)] transition-colors truncate">
                          {item.name}
                        </span>
                        <span className="text-[11px] text-[var(--muted-foreground)]">
                          &bull; {item.matterType}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-[11px] text-[var(--muted-foreground)]">
                        <StatusBadge variant="action">
                          {item.missingCount} Missing
                        </StatusBadge>
                        {item.linkSentAt && (
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            Sent{' '}
                            {new Date(item.linkSentAt).toLocaleDateString('en-IN', {
                              day: 'numeric',
                              month: 'short',
                            })}
                          </span>
                        )}
                      </div>
                    </Link>

                    <Button
                      size="sm"
                      variant="outline"
                      disabled={nudgingId === item.clientId}
                      onClick={() => handleNudge(item.clientId)}
                      className="text-xs h-8 px-2.5 bg-[var(--card)] hover:bg-[color-mix(in_srgb,var(--success)_10%,transparent)] hover:text-[#059669] hover:border-[#059669] shrink-0 transition-colors"
                      title="Send WhatsApp reminder"
                    >
                      <Send className="w-3.5 h-3.5 mr-1.5" />
                      <span>{nudgingId === item.clientId ? 'Sending…' : 'Nudge'}</span>
                    </Button>
                  </div>
                ))
              )}
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}
