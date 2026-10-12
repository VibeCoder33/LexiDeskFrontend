'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import {
  searchOmni,
  OmniSearchClient,
  OmniSearchDocument,
} from '@/lib/api'
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command'
import { User, FileText, Loader2 } from 'lucide-react'

interface GlobalCommandPaletteProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function GlobalCommandPalette({
  open,
  onOpenChange,
}: GlobalCommandPaletteProps) {
  const router = useRouter()
  const [query, setQuery] = React.useState('')
  const [isLoading, setIsLoading] = React.useState(false)
  const [clients, setClients] = React.useState<OmniSearchClient[]>([])
  const [documents, setDocuments] = React.useState<OmniSearchDocument[]>([])

  // Global Ctrl+K / Cmd+K listener
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.key === 'k' || e.key === 'K') && (e.metaKey || e.ctrlKey)) {
        e.preventDefault()
        onOpenChange(!open)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [open, onOpenChange])

  // Debounced search (200 ms)
  React.useEffect(() => {
    const trimmed = query.trim()
    if (trimmed.length < 2) {
      return
    }

    const timeout = setTimeout(async () => {
      setIsLoading(true)
      try {
        const res = await searchOmni(trimmed)
        setClients(res.clients)
        setDocuments(res.documents)
      } catch {
        setClients([])
        setDocuments([])
      } finally {
        setIsLoading(false)
      }
    }, 200)

    return () => clearTimeout(timeout)
  }, [query])

  const handleSelectClient = (id: string) => {
    onOpenChange(false)
    router.push(`/dashboard/clients/${id}`)
  }

  const handleSelectDocument = (clientId: string) => {
    onOpenChange(false)
    router.push(`/dashboard/clients/${clientId}`)
  }

  return (
    <CommandDialog open={open} onOpenChange={onOpenChange}>
      <CommandInput
        placeholder="Type a client name, matter, phone, or file name… (min 2 chars)"
        value={query}
        onValueChange={(val) => {
          setQuery(val)
          if (val.trim().length < 2) {
            setClients([])
            setDocuments([])
            setIsLoading(false)
          }
        }}
      />
      <CommandList className="max-h-80 overflow-y-auto">
        {isLoading && (
          <div className="py-6 text-center text-xs text-[var(--muted-foreground)] flex items-center justify-center gap-2">
            <Loader2 className="w-3.5 h-3.5 animate-spin text-[var(--primary)]" />
            <span>Searching vault…</span>
          </div>
        )}

        {!isLoading && query.trim().length >= 2 && clients.length === 0 && documents.length === 0 && (
          <CommandEmpty className="py-6 text-center text-xs text-[var(--muted-foreground)]">
            No matching clients or documents found.
          </CommandEmpty>
        )}

        {clients.length > 0 && (
          <CommandGroup heading="Clients Matching">
            {clients.map((c) => (
              <CommandItem
                key={`client-${c.id}`}
                value={`client ${c.name} ${c.matterType}`}
                onSelect={() => handleSelectClient(c.id)}
                className="flex items-center gap-2 px-3 py-2 text-xs cursor-pointer hover:bg-[var(--muted)]"
              >
                <User className="w-4 h-4 text-[var(--primary)] shrink-0" />
                <div className="flex-1 overflow-hidden">
                  <span className="font-medium text-[var(--foreground)]">{c.name}</span>
                  <span className="text-[var(--muted-foreground)] ml-2 text-[11px]">
                    {c.matterType} &bull; {c.phone}
                  </span>
                </div>
              </CommandItem>
            ))}
          </CommandGroup>
        )}

        {documents.length > 0 && (
          <CommandGroup heading="Documents Matching">
            {documents.map((d) => (
              <CommandItem
                key={`doc-${d.id}`}
                value={`doc ${d.fileName} ${d.clientName} ${d.category}`}
                onSelect={() => handleSelectDocument(d.clientId)}
                className="flex items-center gap-2 px-3 py-2 text-xs cursor-pointer hover:bg-[var(--muted)]"
              >
                <FileText className="w-4 h-4 text-[var(--secondary)] shrink-0" />
                <div className="flex-1 overflow-hidden">
                  <span className="font-medium text-[var(--foreground)]">{d.fileName}</span>
                  <span className="text-[var(--muted-foreground)] ml-2 text-[11px]">
                    Client: {d.clientName} ({d.category})
                  </span>
                </div>
              </CommandItem>
            ))}
          </CommandGroup>
        )}
      </CommandList>
    </CommandDialog>
  )
}
