'use client'

import * as React from 'react'
import {
  QuickNoteItem,
  fetchQuickNotes,
  createQuickNote,
  deleteQuickNote,
  formatApiError,
} from '@/lib/api'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import { StickyNote, Trash2, CornerDownLeft, Loader2 } from 'lucide-react'

export function QuickNotesFab() {
  const [isOpen, setIsOpen] = React.useState(false)
  const [notes, setNotes] = React.useState<QuickNoteItem[]>([])
  const [inputText, setInputText] = React.useState('')
  const [isSubmitting, setIsSubmitting] = React.useState(false)
  const [isLoading, setIsLoading] = React.useState(false)

  // Keyboard shortcut: press 'n' or 'N' when no input/textarea is focused to toggle notes
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        (e.key === 'n' || e.key === 'N') &&
        !['INPUT', 'TEXTAREA', 'SELECT'].includes((e.target as HTMLElement)?.tagName) &&
        !e.ctrlKey &&
        !e.metaKey &&
        !e.altKey
      ) {
        e.preventDefault()
        setIsOpen((prev) => !prev)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  const handleOpenChange = (open: boolean) => {
    setIsOpen(open)
    if (open) {
      setIsLoading(true)
      fetchQuickNotes(15)
        .then((res) => setNotes(res))
        .catch(() => {})
        .finally(() => setIsLoading(false))
    }
  }

  const handleSave = async () => {
    const text = inputText.trim()
    if (!text || isSubmitting) return

    setIsSubmitting(true)
    const optimisticNote: QuickNoteItem = {
      id: `temp-${Date.now()}`,
      body: text,
      createdAt: new Date().toISOString(),
    }

    setNotes((prev) => [optimisticNote, ...prev])
    setInputText('')

    try {
      const saved = await createQuickNote(text)
      setNotes((prev) => prev.map((n) => (n.id === optimisticNote.id ? saved : n)))
    } catch (err: unknown) {
      setNotes((prev) => prev.filter((n) => n.id !== optimisticNote.id))
      toast.error(formatApiError(err))
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleKeyDownInTextarea = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSave()
    }
  }

  const handleDelete = async (id: string) => {
    const previous = notes
    setNotes((prev) => prev.filter((n) => n.id !== id))
    try {
      await deleteQuickNote(id)
    } catch (err: unknown) {
      setNotes(previous)
      toast.error(formatApiError(err))
    }
  }

  return (
    <div className="fixed bottom-6 right-6 z-40">
      <Popover open={isOpen} onOpenChange={handleOpenChange}>
        <PopoverTrigger
          className="w-12 h-12 rounded-full bg-[var(--primary)] text-white flex items-center justify-center hover:scale-105 active:scale-95 transition-transform cursor-pointer shadow-elevation-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[var(--primary)]"
          title="Quick Notes (Press 'N')"
          aria-label="Open Quick Notes"
        >
          <StickyNote className="w-5 h-5 text-white" />
        </PopoverTrigger>

        <PopoverContent
          align="end"
          side="top"
          className="w-80 sm:w-96 p-0 bg-[var(--card)] border border-[var(--border)] shadow-elevation-2 rounded-xl overflow-hidden"
        >
          <div className="p-3 bg-[var(--card)] border-b border-[var(--border)] flex items-center justify-between">
            <div className="flex items-center gap-1.5 font-semibold text-xs text-[var(--foreground)]">
              <StickyNote className="w-4 h-4 text-[var(--primary)]" />
              <span>Quick Notes</span>
            </div>
            <span className="text-[10px] text-[var(--muted-foreground)] px-1.5 py-0.5 rounded bg-[var(--muted)] border border-[var(--border)] font-mono">
              Press N
            </span>
          </div>

          {/* New note input */}
          <div className="p-3 border-b border-[var(--border)] bg-[var(--background)]">
            <Textarea
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyDown={handleKeyDownInTextarea}
              placeholder="Jot a quick note… (Enter to save, Shift+Enter for newline)"
              rows={2}
              className="resize-none text-xs bg-[var(--card)] border-[var(--border)] focus-visible:ring-1 focus-visible:ring-[var(--primary)]"
            />
            <div className="flex justify-between items-center mt-2 text-[10px] text-[var(--muted-foreground)]">
              <span>Enter to save</span>
              <Button
                type="button"
                size="sm"
                onClick={handleSave}
                disabled={!inputText.trim() || isSubmitting}
                className="h-6 text-[11px] px-2.5 bg-[var(--primary)] text-white hover:bg-[color-mix(in_srgb,var(--primary)_90%,black)]"
              >
                {isSubmitting ? (
                  <Loader2 className="w-3 h-3 animate-spin" />
                ) : (
                  <>
                    <CornerDownLeft className="w-3 h-3 mr-1" />
                    Save
                  </>
                )}
              </Button>
            </div>
          </div>

          {/* Notes list */}
          <div className="max-h-60 overflow-y-auto divide-y divide-[var(--border)]">
            {isLoading ? (
              <div className="p-6 text-center text-xs text-[var(--muted-foreground)]">
                <Loader2 className="w-4 h-4 animate-spin mx-auto mb-1 text-[var(--primary)]" />
                Loading notes…
              </div>
            ) : notes.length === 0 ? (
              <div className="p-6 text-center text-xs text-[var(--muted-foreground)]">
                No notes yet. Type above and press Enter.
              </div>
            ) : (
              notes.map((note) => (
                <div
                  key={note.id}
                  className="p-3 text-xs flex items-start justify-between gap-2 hover:bg-[var(--muted)] transition-colors group"
                >
                  <div className="flex-1 space-y-1">
                    <p className="text-[var(--foreground)] whitespace-pre-wrap leading-relaxed text-xs">
                      {note.body}
                    </p>
                    <span className="text-[10px] text-[var(--muted-foreground)] block">
                      {new Date(note.createdAt).toLocaleDateString('en-IN', {
                        day: 'numeric',
                        month: 'short',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleDelete(note.id)}
                    className="opacity-0 group-hover:opacity-100 text-[var(--muted-foreground)] hover:text-[var(--accent)] p-1 rounded transition-opacity cursor-pointer"
                    title="Delete note"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))
            )}
          </div>
        </PopoverContent>
      </Popover>
    </div>
  )
}
