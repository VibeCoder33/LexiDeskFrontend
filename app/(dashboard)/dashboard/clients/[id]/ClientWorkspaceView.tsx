'use client'

import * as React from 'react'
import Link from 'next/link'
import useSWR from 'swr'
import {
  ClientDetailResponse,
  fetchClientById,
  updateClientScratchpad,
  regenerateMagicLink,
  revokeMagicLink,
  restoreMagicLink,
  fetchDocumentPreviewUrl,
  updateDocument,
  deleteDocument,
  formatApiError,
} from '@/lib/api'
import { StatusBadge } from '@/components/ui/status-badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { SiteHeader } from '@/components/site-header'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { toast } from 'sonner'
import {
  ArrowLeft,
  Copy,
  Check,
  RotateCw,
  Ban,
  FileText,
  Loader2,
  Calendar,
  Phone,
  ShieldCheck,
  ChevronLeft,
  ChevronRight,
  Eye,
  Trash2,
  Lock,
} from 'lucide-react'

interface ClientWorkspaceViewProps {
  clientId: string
  initialData: ClientDetailResponse | null
}

export function ClientWorkspaceView({
  clientId,
  initialData,
}: ClientWorkspaceViewProps) {
  const { data, mutate } = useSWR<ClientDetailResponse>(
    `/api/clients/${clientId}`,
    () => fetchClientById(clientId),
    {
      fallbackData: initialData || undefined,
      // SWR poll every 3 seconds while any document is PENDING per spec
      refreshInterval: (latest) => {
        const hasPending = latest?.documents.some((d) => d.verification === 'PENDING')
        return hasPending ? 3000 : 0
      },
    }
  )

  // Scratchpad state & debounced autosave (800ms)
  const [scratchpadText, setScratchpadText] = React.useState(data?.scratchpad || '')
  const [prevDataScratchpad, setPrevDataScratchpad] = React.useState(data?.scratchpad)
  const [scratchpadStatus, setScratchpadStatus] = React.useState<'saved' | 'saving' | 'dirty'>('saved')
  const debouncedTimeoutRef = React.useRef<NodeJS.Timeout | null>(null)

  if (data?.scratchpad !== undefined && data.scratchpad !== prevDataScratchpad && scratchpadStatus === 'saved') {
    setPrevDataScratchpad(data.scratchpad)
    setScratchpadText(data.scratchpad)
  }

  const handleScratchpadChange = (newVal: string) => {
    setScratchpadText(newVal)
    setScratchpadStatus('dirty')

    if (debouncedTimeoutRef.current) {
      clearTimeout(debouncedTimeoutRef.current)
    }

    debouncedTimeoutRef.current = setTimeout(async () => {
      setScratchpadStatus('saving')
      try {
        await updateClientScratchpad(clientId, newVal)
        setScratchpadStatus('saved')
      } catch {
        setScratchpadStatus('dirty')
      }
    }, 800)
  }

  // Link controls
  const [copiedLink, setCopiedLink] = React.useState(false)
  const [isRevoking, setIsRevoking] = React.useState(false)
  const [isRegenerating, setIsRegenerating] = React.useState(false)

  const copyMagicLink = () => {
    if (!data?.magicLink) return
    const appUrl = typeof window !== 'undefined' ? window.location.origin : ''
    const url = `${appUrl}/portal/${data.magicLink.id}` // Link url
    navigator.clipboard.writeText(url)
    setCopiedLink(true)
    toast.success('Magic link copied')
    setTimeout(() => setCopiedLink(false), 2000)
  }

  const handleToggleRevoke = async () => {
    setIsRevoking(true)
    try {
      if (data?.magicLink?.isRevoked) {
        await restoreMagicLink(clientId)
        toast.success('Portal access restored')
      } else {
        await revokeMagicLink(clientId)
        toast.success('Portal access revoked')
      }
      mutate()
    } catch (err: unknown) {
      toast.error(formatApiError(err))
    } finally {
      setIsRevoking(false)
    }
  }

  const handleRegenerate = async () => {
    setIsRegenerating(true)
    try {
      const res = await regenerateMagicLink(clientId)
      toast.success('New magic link generated')
      navigator.clipboard.writeText(res.url)
      mutate()
    } catch (err: unknown) {
      toast.error(formatApiError(err))
    } finally {
      setIsRegenerating(false)
    }
  }

  // Preview Modal state
  const [previewDocIndex, setPreviewDocIndex] = React.useState<number | null>(null)
  const [previewUrl, setPreviewUrl] = React.useState<string | null>(null)
  const [isPreviewLoading, setIsPreviewLoading] = React.useState(false)

  const allDocuments = React.useMemo(() => data?.documents || [], [data?.documents])
  const activePreviewDoc = previewDocIndex !== null ? allDocuments[previewDocIndex] || null : null

  const openPreview = React.useCallback(async (index: number) => {
    setPreviewDocIndex(index)
    setIsPreviewLoading(true)
    setPreviewUrl(null)
    const doc = allDocuments[index]
    if (doc) {
      try {
        const res = await fetchDocumentPreviewUrl(doc.id)
        setPreviewUrl(res.previewUrl)
        mutate() // Marks reviewed
      } catch (err: unknown) {
        toast.error(formatApiError(err))
      } finally {
        setIsPreviewLoading(false)
      }
    }
  }, [allDocuments, mutate])

  const closePreview = () => {
    setPreviewDocIndex(null)
    setPreviewUrl(null)
  }

  // Keyboard navigation for preview modal (Left, Right, Esc)
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (previewDocIndex === null) return
      if (e.key === 'Escape') {
        closePreview()
      } else if (e.key === 'ArrowRight' && previewDocIndex < allDocuments.length - 1) {
        openPreview(previewDocIndex + 1)
      } else if (e.key === 'ArrowLeft' && previewDocIndex > 0) {
        openPreview(previewDocIndex - 1)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [previewDocIndex, allDocuments.length, openPreview])

  // Badge Override & Document Management
  const handleOverrideStatus = async (
    docId: string,
    newStatus: 'VERIFIED' | 'NEEDS_REVIEW'
  ) => {
    try {
      await updateDocument(docId, { verification: newStatus })
      toast.success(`Document marked as ${newStatus}`)
      mutate()
    } catch (err: unknown) {
      toast.error(formatApiError(err))
    }
  }

  const handleDeleteDoc = async (docId: string) => {
    if (!confirm('Are you sure you want to delete this document from the vault?')) return
    try {
      await deleteDocument(docId)
      toast.success('Document deleted')
      mutate()
    } catch (err: unknown) {
      toast.error(formatApiError(err))
    }
  }

  if (!data) {
    return (
      <div className="p-8 text-center text-xs text-[var(--muted-foreground)] flex items-center justify-center gap-2">
        <Loader2 className="w-4 h-4 animate-spin text-[var(--primary)]" />
        <span>Loading workspace…</span>
      </div>
    )
  }

  // Group documents by category
  const categories = Array.from(
    new Set([
      ...data.requirements.map((r) => r.category),
      ...data.documents.map((d) => d.category),
    ])
  )

  return (
    <div className="flex flex-col min-h-full">
      <SiteHeader
        title={`${data.name} — Workspace`}
        subtitle={`${data.matterType} &bull; Created ${new Date(data.createdAt).toLocaleDateString('en-IN')}`}
      />

      <div className="p-4 md:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto w-full">
        <Link
          href="/dashboard/clients"
          className="inline-flex items-center gap-1.5 text-xs text-[var(--muted-foreground)] hover:text-[var(--primary)] transition-colors mb-2"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Clients Directory</span>
        </Link>

        {/* Split Pane Container */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* ── Left Pane: Context, Scratchpad & Link Controls (5 cols) ── */}
          <div className="lg:col-span-5 space-y-5">
            {/* Client Context Card */}
            <Card className="bg-[var(--card)] border border-[var(--border)] shadow-xs">
              <CardHeader className="pb-3 border-b border-[var(--border)]">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-bold text-[var(--foreground)]">
                    {data.name}
                  </CardTitle>
                  <StatusBadge
                    variant={
                      data.status === 'ACTION_NEEDED'
                        ? 'action'
                        : data.status === 'UP_TO_DATE'
                        ? 'verified'
                        : data.status === 'WAITING_ON_CLIENT'
                        ? 'warning'
                        : 'muted'
                    }
                  >
                    {data.status.replace(/_/g, ' ')}
                  </StatusBadge>
                </div>
              </CardHeader>
              <CardContent className="pt-3 space-y-3 text-xs">
                <div className="flex items-center gap-2 text-[var(--foreground)]">
                  <Phone className="w-3.5 h-3.5 text-[var(--muted-foreground)]" />
                  <span className="font-mono">{data.phone}</span>
                </div>

                {data.keyDate && (
                  <div className="flex items-center gap-2 text-[var(--foreground)]">
                    <Calendar className="w-3.5 h-3.5 text-[var(--primary)]" />
                    <span>
                      <strong>{data.keyDateLabel || 'Deadline'}:</strong>{' '}
                      {new Date(data.keyDate).toLocaleDateString('en-IN', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                      })}
                    </span>
                  </div>
                )}

                {/* Role-Specific details */}
                {data.details && Object.keys(data.details).length > 0 && (
                  <div className="pt-2 border-t border-[var(--border)] space-y-1">
                    <span className="text-[11px] font-semibold text-[var(--muted-foreground)] block uppercase tracking-wider">
                      Matter Parameters
                    </span>
                    {Object.entries(data.details).map(([key, val]) => (
                      <div key={key} className="flex justify-between text-[11px] py-0.5">
                        <span className="text-[var(--muted-foreground)] capitalize">
                          {key.replace(/([A-Z])/g, ' $1')}:
                        </span>
                        <span className="font-medium text-[var(--foreground)] text-right">
                          {String(val)}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Private Scratchpad Card */}
            <Card className="bg-[var(--card)] border border-[var(--border)] shadow-xs">
              <CardHeader className="pb-2 border-b border-[var(--border)] flex flex-row items-center justify-between">
                <CardTitle className="text-xs font-bold text-[var(--foreground)]">
                  Private Scratchpad
                </CardTitle>
                <span className="text-[10px] text-[var(--muted-foreground)] font-mono">
                  {scratchpadStatus === 'saving'
                    ? 'Saving…'
                    : scratchpadStatus === 'dirty'
                    ? 'Unsaved changes'
                    : 'Saved'}
                </span>
              </CardHeader>
              <CardContent className="pt-3">
                <Textarea
                  value={scratchpadText}
                  onChange={(e) => handleScratchpadChange(e.target.value)}
                  placeholder="Private notes for this matter (autosaves automatically, invisible to client)…"
                  rows={5}
                  className="text-xs resize-none bg-[var(--background)] border-[var(--border)] focus-visible:ring-1 focus-visible:ring-[var(--primary)] leading-relaxed"
                />
              </CardContent>
            </Card>

            {/* Magic Link Controls Card */}
            <Card className="bg-[var(--card)] border border-[var(--border)] shadow-xs">
              <CardHeader className="pb-2 border-b border-[var(--border)]">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <Lock className="w-4 h-4 text-[var(--primary)]" />
                    <CardTitle className="text-xs font-bold text-[var(--foreground)]">
                      Magic Link Access
                    </CardTitle>
                  </div>
                  {data.magicLink?.isRevoked ? (
                    <StatusBadge variant="action">Access Revoked</StatusBadge>
                  ) : data.magicLink?.isExpired ? (
                    <StatusBadge variant="warning">Link Expired</StatusBadge>
                  ) : (
                    <StatusBadge variant="verified">Portal Active</StatusBadge>
                  )}
                </div>
              </CardHeader>
              <CardContent className="pt-3 space-y-3 text-xs">
                {data.magicLink && (
                  <div className="space-y-1 text-[11px] text-[var(--muted-foreground)]">
                    <div>
                      Expires:{' '}
                      <span className="text-[var(--foreground)] font-medium">
                        {new Date(data.magicLink.expiresAt).toLocaleDateString('en-IN', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric',
                        })}
                      </span>
                    </div>
                    {data.magicLink.lastUsedAt && (
                      <div>
                        Last accessed:{' '}
                        {new Date(data.magicLink.lastUsedAt).toLocaleDateString('en-IN', {
                          day: 'numeric',
                          month: 'short',
                        })}
                      </div>
                    )}
                  </div>
                )}

                <div className="flex flex-wrap gap-2 pt-1">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={copyMagicLink}
                    disabled={data.magicLink?.isRevoked}
                    className="text-xs h-8 gap-1.5 bg-[var(--card)] hover:bg-[var(--muted)]"
                  >
                    {copiedLink ? <Check className="w-3.5 h-3.5 text-[#059669]" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedLink ? 'Copied' : 'Copy Link'}</span>
                  </Button>

                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleRegenerate}
                    disabled={isRegenerating}
                    className="text-xs h-8 gap-1.5 bg-[var(--card)] hover:bg-[var(--muted)]"
                  >
                    <RotateCw className={`w-3.5 h-3.5 ${isRegenerating ? 'animate-spin' : ''}`} />
                    <span>Regenerate</span>
                  </Button>

                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleToggleRevoke}
                    disabled={isRevoking}
                    className={`text-xs h-8 gap-1.5 ${
                      data.magicLink?.isRevoked
                        ? 'text-[#059669] hover:bg-[color-mix(in_srgb,var(--success)_10%,transparent)] border-[#059669]'
                        : 'text-[var(--accent)] hover:bg-[color-mix(in_srgb,var(--accent)_10%,transparent)] border-[color-mix(in_srgb,var(--accent)_40%,transparent)]'
                    }`}
                  >
                    <Ban className="w-3.5 h-3.5" />
                    <span>{data.magicLink?.isRevoked ? 'Restore Access' : 'Revoke Link'}</span>
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* ── Right Pane: Smart Document Vault (7 cols) ── */}
          <div className="lg:col-span-7 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-[var(--primary)]" />
                <h2 className="text-sm font-bold text-[var(--foreground)]">
                  Smart Document Vault
                </h2>
              </div>
              <span className="text-xs text-[var(--muted-foreground)]">
                {data.documents.length} Files uploaded &bull; AI Verification active
              </span>
            </div>

            {/* Category Groups */}
            <div className="space-y-4">
              {categories.map((category) => {
                const categoryReqs = data.requirements.filter((r) => r.category === category)
                const categoryDocs = data.documents.filter((d) => d.category === category)

                return (
                  <Card key={category} className="bg-[var(--card)] border border-[var(--border)] overflow-hidden shadow-xs">
                    <CardHeader className="py-2.5 px-4 bg-[var(--background)] border-b border-[var(--border)] flex flex-row items-center justify-between">
                      <span className="text-xs font-bold text-[var(--foreground)]">
                        {category}
                      </span>
                      <span className="text-[11px] text-[var(--muted-foreground)] font-medium">
                        {categoryDocs.length} {categoryDocs.length === 1 ? 'file' : 'files'}
                      </span>
                    </CardHeader>

                    <CardContent className="p-0 divide-y divide-[var(--border)] text-xs">
                      {/* Requirements checklist rows */}
                      {categoryReqs.map((req) => {
                        const matchedDoc = data.documents.find((d) => d.requirementId === req.id)
                        return (
                          <div key={req.id} className="p-3 flex items-center justify-between gap-3 bg-[var(--card)]">
                            <div className="flex items-center gap-2 min-w-0">
                              <span className="font-medium text-[var(--foreground)] truncate">
                                {req.label}
                              </span>
                              {req.isRequired && (
                                <span className="text-[10px] text-[var(--muted-foreground)]">
                                  (Required)
                                </span>
                              )}
                            </div>

                            <div className="shrink-0">
                              {!matchedDoc ? (
                                <StatusBadge variant="action">🔴 Missing</StatusBadge>
                              ) : matchedDoc.verification === 'VERIFIED' ? (
                                <StatusBadge variant="verified">🟢 Verified</StatusBadge>
                              ) : matchedDoc.verification === 'NEEDS_REVIEW' ? (
                                <StatusBadge
                                  variant="warning"
                                  title={matchedDoc.verificationNote || 'Review required'}
                                >
                                  🟡 Needs Review
                                </StatusBadge>
                              ) : (
                                <StatusBadge variant="muted">Checking…</StatusBadge>
                              )}
                            </div>
                          </div>
                        )
                      })}

                      {/* Documents in this category */}
                      {categoryDocs.map((doc) => {
                        const globalIndex = allDocuments.findIndex((d) => d.id === doc.id)
                        return (
                          <div
                            key={doc.id}
                            className="p-3 pl-6 flex items-center justify-between gap-3 bg-[var(--card)] hover:bg-[var(--muted)] transition-colors group"
                          >
                            <div className="flex items-center gap-2.5 min-w-0">
                              <FileText className="w-4 h-4 text-[var(--primary)] shrink-0" />
                              <div className="min-w-0">
                                <span className="font-semibold text-[var(--foreground)] block truncate">
                                  {doc.fileName}
                                </span>
                                <div className="flex items-center gap-2 text-[10px] text-[var(--muted-foreground)]">
                                  <span>{(doc.sizeBytes / 1024).toFixed(0)} KB</span>
                                  {doc.detectedType && (
                                    <span>&bull; AI Type: {doc.detectedType}</span>
                                  )}
                                  {doc.verificationNote && (
                                    <span className="text-[var(--secondary)] truncate max-w-xs font-medium">
                                      &bull; {doc.verificationNote}
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>

                            <div className="flex items-center gap-1.5 shrink-0">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => openPreview(globalIndex)}
                                className="h-7 text-xs px-2 gap-1 bg-[var(--card)] hover:bg-[var(--background)]"
                                title="Open preview modal"
                              >
                                <Eye className="w-3 h-3" />
                                <span>Preview</span>
                              </Button>

                              {/* Manual Override Status Action */}
                              {doc.verification === 'NEEDS_REVIEW' && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleOverrideStatus(doc.id, 'VERIFIED')}
                                  className="h-7 text-[11px] px-2 text-[#059669] border-[#059669] hover:bg-[color-mix(in_srgb,var(--success)_10%,transparent)]"
                                  title="Manually verify document"
                                >
                                  Verify
                                </Button>
                              )}

                              <button
                                type="button"
                                onClick={() => handleDeleteDoc(doc.id)}
                                className="opacity-0 group-hover:opacity-100 text-[var(--muted-foreground)] hover:text-[var(--accent)] p-1 rounded transition-opacity cursor-pointer"
                                title="Delete document"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        )
                      })}
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          </div>
        </div>
      </div>

      {/* ── Document Preview Modal (PDF / Images / Keyboard Navigation) ── */}
      <Dialog open={previewDocIndex !== null} onOpenChange={closePreview}>
        <DialogContent className="max-w-4xl w-[95vw] h-[85vh] bg-[var(--card)] border border-[var(--border)] shadow-elevation-2 flex flex-col p-0 overflow-hidden">
          <DialogHeader className="p-4 border-b border-[var(--border)] bg-[var(--card)] flex flex-row items-center justify-between shrink-0">
            <div className="flex items-center gap-2 min-w-0 pr-4">
              <FileText className="w-4 h-4 text-[var(--primary)] shrink-0" />
              <DialogTitle className="text-sm font-bold text-[var(--foreground)] truncate">
                {activePreviewDoc?.fileName}
              </DialogTitle>
              {activePreviewDoc && (
                <StatusBadge
                  variant={
                    activePreviewDoc.verification === 'VERIFIED'
                      ? 'verified'
                      : activePreviewDoc.verification === 'NEEDS_REVIEW'
                      ? 'warning'
                      : 'muted'
                  }
                  className="text-[10px] ml-2 shrink-0"
                >
                  {activePreviewDoc.verification}
                </StatusBadge>
              )}
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <Button
                size="sm"
                variant="outline"
                disabled={previewDocIndex === 0}
                onClick={() => previewDocIndex !== null && openPreview(previewDocIndex - 1)}
                className="h-7 px-2"
                title="Previous file (Left Arrow)"
              >
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <Button
                size="sm"
                variant="outline"
                disabled={previewDocIndex === allDocuments.length - 1}
                onClick={() => previewDocIndex !== null && openPreview(previewDocIndex + 1)}
                className="h-7 px-2"
                title="Next file (Right Arrow)"
              >
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </DialogHeader>

          <div className="flex-1 bg-[var(--background)] flex items-center justify-center p-4 overflow-hidden relative">
            {isPreviewLoading ? (
              <div className="flex flex-col items-center gap-2 text-xs text-[var(--muted-foreground)]">
                <Loader2 className="w-6 h-6 animate-spin text-[var(--primary)]" />
                <span>Loading preview…</span>
              </div>
            ) : previewUrl ? (
              activePreviewDoc?.mimeType.includes('pdf') ? (
                <iframe
                  src={previewUrl}
                  className="w-full h-full rounded border border-[var(--border)] bg-white"
                  title="PDF Preview"
                />
              ) : (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img
                  src={previewUrl}
                  alt={activePreviewDoc?.fileName || 'Document Preview'}
                  className="max-w-full max-h-full object-contain rounded shadow-sm"
                />
              )
            ) : (
              <div className="text-xs text-[var(--muted-foreground)]">
                Unable to load preview for this file.
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
