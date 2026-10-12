'use client'

import * as React from 'react'
import { User } from '@/types/auth'
import { updateFirmSettings, formatApiError } from '@/lib/api'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'
import { Loader2, Building2 } from 'lucide-react'

interface FirmSettingsModalProps {
  user: User
  isOpen: boolean
  onClose: () => void
  onUpdate: (updatedUser: User) => void
}

export function FirmSettingsModal({
  user,
  isOpen,
  onClose,
  onUpdate,
}: FirmSettingsModalProps) {
  const [firmName, setFirmName] = React.useState(user.firmName || '')
  const [firmAddress, setFirmAddress] = React.useState(user.firmAddress || '')
  const [firmPhone, setFirmPhone] = React.useState(user.firmPhone || '')
  const [isSaving, setIsSaving] = React.useState(false)

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      onClose()
    } else {
      setFirmName(user.firmName || '')
      setFirmAddress(user.firmAddress || '')
      setFirmPhone(user.firmPhone || '')
    }
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSaving(true)

    try {
      const updated = await updateFirmSettings({
        firmName: firmName.trim(),
        firmAddress: firmAddress.trim(),
        firmPhone: firmPhone.trim(),
      })
      toast.success('Firm settings updated successfully')
      onUpdate(updated)
      onClose()
    } catch (err: unknown) {
      toast.error(formatApiError(err))
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md bg-[var(--card)] border border-[var(--border)] shadow-elevation-2">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <Building2 className="w-5 h-5 text-[var(--primary)]" />
            <DialogTitle className="text-base font-semibold text-[var(--foreground)]">
              Firm Settings
            </DialogTitle>
          </div>
          <DialogDescription className="text-xs text-[var(--muted-foreground)]">
            Manage your firm details shown on client documents and public upload portals.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSave} className="space-y-4 pt-2">
          <div className="space-y-1.5">
            <Label htmlFor="firmName" className="text-xs font-medium text-[var(--foreground)]">
              Firm / Practice Name
            </Label>
            <Input
              id="firmName"
              value={firmName}
              onChange={(e) => setFirmName(e.target.value)}
              placeholder="e.g. Naik & Associates Legal"
              className="bg-[var(--card)] border-[var(--border)] text-sm"
              required
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="firmAddress" className="text-xs font-medium text-[var(--foreground)]">
              Office Address
            </Label>
            <Input
              id="firmAddress"
              value={firmAddress}
              onChange={(e) => setFirmAddress(e.target.value)}
              placeholder="e.g. Shivajinagar, Pune, Maharashtra"
              className="bg-[var(--card)] border-[var(--border)] text-sm"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="firmPhone" className="text-xs font-medium text-[var(--foreground)]">
              Official Contact Phone
            </Label>
            <Input
              id="firmPhone"
              value={firmPhone}
              onChange={(e) => setFirmPhone(e.target.value)}
              placeholder="e.g. +919876543001"
              className="bg-[var(--card)] border-[var(--border)] text-sm"
            />
          </div>

          <DialogFooter className="gap-2 sm:gap-0 pt-2 border-t border-[var(--border)]">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={isSaving}
              className="text-xs"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isSaving}
              className="bg-[var(--primary)] text-white hover:bg-[color-mix(in_srgb,var(--primary)_90%,black)] text-xs"
            >
              {isSaving ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                  Saving…
                </>
              ) : (
                'Save Changes'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
