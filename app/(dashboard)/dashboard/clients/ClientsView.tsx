'use client'

import * as React from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import useSWR from 'swr'
import {
  ClientItem,
  ClientsListResponse,
  fetchClients,
} from '@/lib/api'
import { StatusBadge } from '@/components/ui/status-badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card } from '@/components/ui/card'
import { SiteHeader } from '@/components/site-header'
import {
  UserPlus,
  Search,
  ArrowUpDown,
  FolderOpen,
} from 'lucide-react'

interface ClientsViewProps {
  initialData: ClientsListResponse | null
}

export function ClientsView({ initialData }: ClientsViewProps) {
  const router = useRouter()
  const [searchQuery, setSearchQuery] = React.useState('')
  const [statusFilter, setStatusFilter] = React.useState('ALL')
  const [sortKey, setSortKey] = React.useState<'name' | 'matterType' | 'lastActiveAt' | 'status'>('lastActiveAt')
  const [sortOrder, setSortOrder] = React.useState<'asc' | 'desc'>('desc')

  const { data, isLoading } = useSWR<ClientsListResponse>(
    ['/api/clients', searchQuery, statusFilter, sortKey, sortOrder],
    () =>
      fetchClients({
        q: searchQuery.trim() || undefined,
        status: statusFilter !== 'ALL' ? statusFilter : undefined,
        sort: sortKey,
        order: sortOrder,
        limit: 50,
      }),
    {
      fallbackData: initialData || undefined,
      revalidateOnFocus: true,
    }
  )

  const handleSort = (key: 'name' | 'matterType' | 'lastActiveAt' | 'status') => {
    if (sortKey === key) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')
    } else {
      setSortKey(key)
      setSortOrder('desc')
    }
  }

  const renderStatusBadge = (status: ClientItem['status']) => {
    switch (status) {
      case 'ACTION_NEEDED':
        return (
          <StatusBadge variant="action">
            <span className="w-1.5 h-1.5 rounded-full bg-[var(--secondary)] inline-block shrink-0" />
            <span>Action Needed</span>
          </StatusBadge>
        )
      case 'UP_TO_DATE':
        return (
          <StatusBadge variant="verified">
            <span className="w-1.5 h-1.5 rounded-full bg-[var(--success)] inline-block shrink-0" />
            <span>Up to Date</span>
          </StatusBadge>
        )
      case 'WAITING_ON_CLIENT':
        return (
          <StatusBadge variant="warning">
            <span className="w-1.5 h-1.5 rounded-full bg-[#F59E0B] inline-block shrink-0" />
            <span>Waiting on Client</span>
          </StatusBadge>
        )
      case 'CLOSED':
        return (
          <StatusBadge variant="muted">
            <span className="w-1.5 h-1.5 rounded-full bg-[var(--muted-foreground)] inline-block shrink-0" />
            <span>Closed</span>
          </StatusBadge>
        )
      default:
        return <StatusBadge variant="muted">{status}</StatusBadge>
    }
  }

  const clients = data?.clients || []

  return (
    <div className="flex flex-col min-h-full">
      <SiteHeader
        title="Clients Directory"
        subtitle="Manage client vaults, checklist requirements, and magic link access"
      />

      <div className="p-6 md:p-8 space-y-4 max-w-7xl mx-auto w-full">
        {/* Controls: Search, Filters, and New Client Button */}
        <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
          <div className="flex items-center gap-2 w-full sm:w-auto flex-1 max-w-md">
            <div className="relative w-full">
              <Search className="w-3.5 h-3.5 text-[var(--muted-foreground)] absolute left-3 top-1/2 -translate-y-1/2" />
              <Input
                placeholder="Filter by name, matter, or phone…"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8 text-xs h-9 bg-[var(--card)] border-[var(--border)]"
              />
            </div>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="h-9 px-3 rounded-md border border-[var(--border)] bg-[var(--card)] text-xs text-[var(--foreground)] focus:outline-none focus:ring-1 focus:ring-[var(--primary)] shrink-0"
            >
              <option value="ALL">All Statuses</option>
              <option value="ACTION_NEEDED">Action Needed</option>
              <option value="WAITING_ON_CLIENT">Waiting on Client</option>
              <option value="UP_TO_DATE">Up to Date</option>
              <option value="CLOSED">Closed</option>
            </select>
          </div>

          <Link href="/dashboard/clients/new" className="w-full sm:w-auto shrink-0">
            <Button className="w-full sm:w-auto bg-[var(--primary)] text-white hover:bg-[color-mix(in_srgb,var(--primary)_90%,black)] text-xs h-9 font-medium shadow-xs gap-1.5 cursor-pointer">
              <UserPlus className="w-3.5 h-3.5" />
              <span>Create Client</span>
            </Button>
          </Link>
        </div>

        {/* Data Table Card */}
        <Card className="bg-[var(--card)] border border-[var(--border)] overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[var(--background)] border-b border-[var(--border)] text-[var(--muted-foreground)] font-semibold">
                <tr>
                  <th
                    className="py-3 px-4 cursor-pointer hover:text-[var(--foreground)] transition-colors"
                    onClick={() => handleSort('name')}
                  >
                    <div className="flex items-center gap-1.5">
                      <span>Client Name</span>
                      <ArrowUpDown className="w-3 h-3" />
                    </div>
                  </th>
                  <th
                    className="py-3 px-4 cursor-pointer hover:text-[var(--foreground)] transition-colors"
                    onClick={() => handleSort('matterType')}
                  >
                    <div className="flex items-center gap-1.5">
                      <span>Matter Type</span>
                      <ArrowUpDown className="w-3 h-3" />
                    </div>
                  </th>
                  <th className="py-3 px-4">Contact Phone</th>
                  <th
                    className="py-3 px-4 cursor-pointer hover:text-[var(--foreground)] transition-colors"
                    onClick={() => handleSort('lastActiveAt')}
                  >
                    <div className="flex items-center gap-1.5">
                      <span>Last Active</span>
                      <ArrowUpDown className="w-3 h-3" />
                    </div>
                  </th>
                  <th
                    className="py-3 px-4 cursor-pointer hover:text-[var(--foreground)] transition-colors"
                    onClick={() => handleSort('status')}
                  >
                    <div className="flex items-center gap-1.5">
                      <span>Status</span>
                      <ArrowUpDown className="w-3 h-3" />
                    </div>
                  </th>
                  <th className="py-3 px-4 text-right">Vault</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-[var(--border)]">
                {clients.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-xs text-[var(--muted-foreground)]">
                      {isLoading ? 'Loading clients…' : 'No clients found matching the selected filter.'}
                    </td>
                  </tr>
                ) : (
                  clients.map((client) => (
                    <tr
                      key={client.id}
                      onClick={() => router.push(`/dashboard/clients/${client.id}`)}
                      className="hover:bg-[var(--muted)] transition-colors cursor-pointer group"
                    >
                      <td className="py-3 px-4 font-semibold text-[var(--foreground)] group-hover:text-[var(--primary)] transition-colors">
                        {client.name}
                      </td>
                      <td className="py-3 px-4 text-[var(--muted-foreground)]">
                        {client.matterType}
                      </td>
                      <td className="py-3 px-4 font-mono text-[11px] text-[var(--muted-foreground)]">
                        {client.phone}
                      </td>
                      <td className="py-3 px-4 text-[var(--muted-foreground)]">
                        {new Date(client.lastActiveAt).toLocaleDateString('en-IN', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric',
                        })}
                      </td>
                      <td className="py-3 px-4">
                        {renderStatusBadge(client.status)}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <span className="inline-flex items-center gap-1 text-[11px] text-[var(--primary)] font-medium group-hover:underline">
                          <FolderOpen className="w-3.5 h-3.5" />
                          <span>Open</span>
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    </div>
  )
}
