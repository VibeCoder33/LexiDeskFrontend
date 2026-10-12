'use client'

import * as React from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { User } from '@/types/auth'
import { getRoleConfig } from '@/lib/roleConfig'
import { createClient, CreateClientResponse, formatApiError } from '@/lib/api'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { SiteHeader } from '@/components/site-header'
import { toast } from 'sonner'
import {
  UserPlus,
  Loader2,
  Copy,
  Check,
  Share2,
  FolderOpen,
  ArrowLeft,
  Calendar,
} from 'lucide-react'

interface CreateClientViewProps {
  user: User
}

export function CreateClientView({ user }: CreateClientViewProps) {
  const router = useRouter()
  const roleConfig = getRoleConfig(user.role)

  // Universal fields
  const [name, setName] = React.useState('')
  const [phone, setPhone] = React.useState('+91')
  const [matterType, setMatterType] = React.useState(
    roleConfig?.matterTypes[0] || 'General'
  )

  // Dynamic role fields
  const [dynamicDetails, setDynamicDetails] = React.useState<Record<string, string>>({})

  // Key date
  const [keyDate, setKeyDate] = React.useState('')
  const [keyDateLabel, setKeyDateLabel] = React.useState(
    roleConfig?.keyDateLabels[0] || ''
  )

  const [isLoading, setIsLoading] = React.useState(false)
  const [createdResult, setCreatedResult] = React.useState<CreateClientResponse | null>(null)
  const [copied, setCopied] = React.useState(false)

  const handleDynamicChange = (fieldName: string, value: string) => {
    setDynamicDetails((prev) => ({ ...prev, [fieldName]: value }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (isLoading) return

    setIsLoading(true)

    try {
      const payload = {
        name: name.trim(),
        phone: phone.trim(),
        matterType,
        details: dynamicDetails,
        keyDate: keyDate ? new Date(keyDate).toISOString() : null,
        keyDateLabel: keyDate ? keyDateLabel : null,
      }

      const result = await createClient(payload)
      setCreatedResult(result)
      toast.success('Client created and Magic Link generated!')
    } catch (err: unknown) {
      toast.error(formatApiError(err))
    } finally {
      setIsLoading(false)
    }
  }

  const copyLink = () => {
    if (!createdResult) return
    navigator.clipboard.writeText(createdResult.magicLink.url)
    setCopied(true)
    toast.success('Magic link copied to clipboard')
    setTimeout(() => setCopied(false), 2000)
  }

  const shareWhatsApp = () => {
    if (!createdResult) return
    const cleanPhone = phone.replace(/[^0-9]/g, '')
    const firmName = user.firmName || user.name
    const msg = `Hello ${name}, this is ${firmName}. Please upload the documents for your ${matterType} matter using this secure link: ${createdResult.magicLink.url}`
    const waUrl = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(msg)}`
    window.open(waUrl, '_blank', 'noopener,noreferrer')
  }

  return (
    <div className="flex flex-col min-h-full">
      <SiteHeader
        title="Create Client"
        subtitle="Provision a new client workspace and generate their secure upload link"
      />

      <div className="p-6 md:p-8 max-w-2xl mx-auto w-full">
        <Link
          href="/dashboard/clients"
          className="inline-flex items-center gap-1.5 text-xs text-[var(--muted-foreground)] hover:text-[var(--primary)] transition-colors mb-4"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Clients List</span>
        </Link>

        {createdResult ? (
          /* Success / Magic Link Ready View */
          <Card className="bg-[var(--card)] border border-[var(--border)] shadow-elevation-1">
            <CardHeader className="border-b border-[var(--border)] pb-4">
              <div className="w-10 h-10 rounded-full bg-[color-mix(in_srgb,var(--success)_15%,transparent)] text-[#059669] flex items-center justify-center mb-2">
                <Check className="w-5 h-5 stroke-[2.5]" />
              </div>
              <CardTitle className="text-lg font-bold text-[var(--foreground)]">
                Magic Link Ready
              </CardTitle>
              <CardDescription className="text-xs text-[var(--muted-foreground)]">
                A private document upload portal has been provisioned for{' '}
                <strong className="text-[var(--foreground)]">{createdResult.client.name}</strong>.
              </CardDescription>
            </CardHeader>

            <CardContent className="space-y-5 pt-5">
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-[var(--foreground)]">
                  Client Portal Link
                </Label>
                <div className="flex items-center gap-2">
                  <Input
                    readOnly
                    value={createdResult.magicLink.url}
                    className="bg-[var(--background)] border-[var(--border)] font-mono text-xs select-all text-[var(--foreground)]"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={copyLink}
                    className="shrink-0 text-xs gap-1.5 bg-[var(--card)] hover:bg-[var(--muted)]"
                  >
                    {copied ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-[#059669]" />
                        <span>Copied</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        <span>Copy</span>
                      </>
                    )}
                  </Button>
                </div>
                <span className="text-[11px] text-[var(--muted-foreground)] block">
                  Valid for 30 days. No client login or password required.
                </span>
              </div>

              <div className="flex flex-col sm:flex-row gap-3 pt-2">
                <Button
                  type="button"
                  onClick={shareWhatsApp}
                  className="flex-1 bg-[#25D366] hover:bg-[#1EBE5D] text-white font-medium text-xs h-10 gap-2 shadow-xs cursor-pointer"
                >
                  <Share2 className="w-4 h-4" />
                  <span>Send via WhatsApp</span>
                </Button>

                <Button
                  type="button"
                  onClick={() => router.push(`/dashboard/clients/${createdResult.client.id}`)}
                  className="flex-1 bg-[var(--primary)] text-white hover:bg-[color-mix(in_srgb,var(--primary)_90%,black)] text-xs h-10 gap-2 shadow-xs cursor-pointer"
                >
                  <FolderOpen className="w-4 h-4" />
                  <span>Open Client Workspace</span>
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          /* Form View */
          <Card className="bg-[var(--card)] border border-[var(--border)] shadow-elevation-1">
            <CardHeader className="border-b border-[var(--border)] pb-4">
              <div className="flex items-center gap-2">
                <UserPlus className="w-5 h-5 text-[var(--primary)]" />
                <CardTitle className="text-base font-bold text-[var(--foreground)]">
                  Client & Matter Information
                </CardTitle>
              </div>
              <CardDescription className="text-xs text-[var(--muted-foreground)]">
                Provide client contact details and role-specific matter parameters.
              </CardDescription>
            </CardHeader>

            <form onSubmit={handleSubmit}>
              <CardContent className="space-y-4 pt-5">
                {/* Universal Fields */}
                <div className="space-y-1.5">
                  <Label htmlFor="clientName" className="text-xs font-medium text-[var(--foreground)]">
                    Full Name <span className="text-[var(--secondary)]">*</span>
                  </Label>
                  <Input
                    id="clientName"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Suresh Kulkarni"
                    required
                    className="bg-[var(--card)] border-[var(--border)] text-sm"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="clientPhone" className="text-xs font-medium text-[var(--foreground)]">
                    WhatsApp / Phone (E.164) <span className="text-[var(--secondary)]">*</span>
                  </Label>
                  <Input
                    id="clientPhone"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+919876543210"
                    required
                    className="bg-[var(--card)] border-[var(--border)] text-sm font-mono"
                  />
                  <span className="text-[11px] text-[var(--muted-foreground)]">
                    Used for automated WhatsApp document upload links and status nudges.
                  </span>
                </div>

                {/* Matter Type Selection */}
                <div className="space-y-1.5">
                  <Label htmlFor="matterType" className="text-xs font-medium text-[var(--foreground)]">
                    Matter / Engagement Type <span className="text-[var(--secondary)]">*</span>
                  </Label>
                  {roleConfig && roleConfig.matterTypes.length > 1 ? (
                    <select
                      id="matterType"
                      value={matterType}
                      onChange={(e) => setMatterType(e.target.value)}
                      className="w-full h-9 px-3 rounded-md border border-[var(--border)] bg-[var(--card)] text-sm text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
                    >
                      {roleConfig.matterTypes.map((mt) => (
                        <option key={mt} value={mt}>
                          {mt}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <Input
                      id="matterType"
                      value={matterType}
                      onChange={(e) => setMatterType(e.target.value)}
                      placeholder="e.g. Litigation / Arbitration"
                      required
                      className="bg-[var(--card)] border-[var(--border)] text-sm"
                    />
                  )}
                </div>

                {/* Dynamic Fields from ROLE_CONFIG */}
                {roleConfig?.createFields.map((field) => (
                  <div key={field.name} className="space-y-1.5">
                    <Label htmlFor={field.name} className="text-xs font-medium text-[var(--foreground)]">
                      {field.label || field.name}{' '}
                      {field.required && <span className="text-[var(--secondary)]">*</span>}
                    </Label>
                    {field.type === 'select' && field.options ? (
                      <select
                        id={field.name}
                        value={dynamicDetails[field.name] || field.options[0] || ''}
                        onChange={(e) => handleDynamicChange(field.name, e.target.value)}
                        className="w-full h-9 px-3 rounded-md border border-[var(--border)] bg-[var(--card)] text-sm text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
                        required={field.required}
                      >
                        {field.options.map((opt) => (
                          <option key={opt} value={opt}>
                            {opt}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <Input
                        id={field.name}
                        value={dynamicDetails[field.name] || ''}
                        onChange={(e) => handleDynamicChange(field.name, e.target.value)}
                        placeholder={field.placeholder || ''}
                        pattern={field.pattern}
                        required={field.required}
                        className="bg-[var(--card)] border-[var(--border)] text-sm"
                      />
                    )}
                  </div>
                ))}

                {/* Optional Key Date for Dashboard Metrics */}
                <div className="pt-2 border-t border-[var(--border)] space-y-3">
                  <div className="flex items-center gap-1.5 text-xs font-medium text-[var(--foreground)]">
                    <Calendar className="w-3.5 h-3.5 text-[var(--primary)]" />
                    <span>Important Deadline / Milestone (Powers Dashboard Metrics)</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <Label htmlFor="keyDateLabel" className="text-[11px] text-[var(--muted-foreground)]">
                        Milestone Label
                      </Label>
                      {roleConfig?.keyDateLabels && roleConfig.keyDateLabels.length > 0 ? (
                        <select
                          id="keyDateLabel"
                          value={keyDateLabel}
                          onChange={(e) => setKeyDateLabel(e.target.value)}
                          className="w-full h-8 px-2.5 rounded-md border border-[var(--border)] bg-[var(--card)] text-xs text-[var(--foreground)] focus:outline-none focus:ring-1 focus:ring-[var(--primary)]"
                        >
                          {roleConfig.keyDateLabels.map((lbl) => (
                            <option key={lbl} value={lbl}>
                              {lbl}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <Input
                          id="keyDateLabel"
                          value={keyDateLabel}
                          onChange={(e) => setKeyDateLabel(e.target.value)}
                          placeholder="e.g. Next Hearing"
                          className="h-8 text-xs bg-[var(--card)] border-[var(--border)]"
                        />
                      )}
                    </div>

                    <div className="space-y-1">
                      <Label htmlFor="keyDate" className="text-[11px] text-[var(--muted-foreground)]">
                        Date
                      </Label>
                      <Input
                        id="keyDate"
                        type="date"
                        value={keyDate}
                        onChange={(e) => setKeyDate(e.target.value)}
                        className="h-8 text-xs bg-[var(--card)] border-[var(--border)]"
                      />
                    </div>
                  </div>
                </div>

                <div className="pt-4">
                  <Button
                    type="submit"
                    disabled={isLoading}
                    className="w-full bg-[var(--primary)] hover:bg-[color-mix(in_srgb,var(--primary)_90%,black)] text-white font-medium text-sm h-10 shadow-xs cursor-pointer"
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Generating Workspace & Link…
                      </>
                    ) : (
                      'Create & Generate Link'
                    )}
                  </Button>
                </div>
              </CardContent>
            </form>
          </Card>
        )}
      </div>
    </div>
  )
}
