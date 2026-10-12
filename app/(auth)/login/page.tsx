'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { loginUser, formatApiError } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Loader2, AlertCircle, ShieldAlert } from 'lucide-react'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = React.useState('')
  const [password, setPassword] = React.useState('')
  const [isLoading, setIsLoading] = React.useState(false)
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null)
  const [isShaking, setIsShaking] = React.useState(false)
  const [showForgotNotice, setShowForgotNotice] = React.useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (isLoading) return

    setIsLoading(true)
    setErrorMessage(null)

    try {
      await loginUser(email.trim(), password)
      router.replace('/dashboard')
    } catch (err: unknown) {
      setIsLoading(false)
      const message = formatApiError(err)
      setErrorMessage(message)

      // Trigger shake animation
      setIsShaking(true)
      setTimeout(() => setIsShaking(false), 600)
    }
  }

  const fillDemoCredentials = (demoEmail: string) => {
    setEmail(demoEmail)
    setPassword('LexiDesk@2024')
    setErrorMessage(null)
  }

  return (
    <div className="w-full">
      <style jsx global>{`
        @keyframes card-shake {
          0%, 100% { transform: translateX(0); }
          20%, 60% { transform: translateX(-8px); }
          40%, 80% { transform: translateX(8px); }
        }
        .animate-shake {
          animation: card-shake 0.5s cubic-bezier(.36,.07,.19,.97) both;
        }
        @media (prefers-reduced-motion: reduce) {
          .animate-shake {
            animation: none !important;
          }
        }
      `}</style>

      <Card
        className={`w-full bg-[var(--card)] border border-[var(--border)] shadow-elevation-1 transition-all ${
          isShaking ? 'animate-shake border-[var(--accent)]' : ''
        }`}
      >
        <CardHeader className="space-y-1 pb-4">
          <CardTitle className="text-xl font-bold tracking-tight text-[var(--foreground)]">
            Sign in to LexiDesk
          </CardTitle>
          <CardDescription className="text-xs text-[var(--muted-foreground)]">
            Enter your professional account email and password to access your workspace.
          </CardDescription>
        </CardHeader>

        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-4 pt-0">
            {errorMessage && (
              <div
                role="alert"
                className="flex items-start gap-2.5 p-3 rounded-md bg-[color-mix(in_srgb,var(--accent)_10%,transparent)] border border-[color-mix(in_srgb,var(--accent)_30%,transparent)] text-xs text-[var(--accent)] font-medium"
              >
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{errorMessage}</span>
              </div>
            )}

            <div className="space-y-1.5">
              <Label htmlFor="email" className="text-xs font-medium text-[var(--foreground)]">
                Email address
              </Label>
              <Input
                id="email"
                type="email"
                placeholder="name@lexidesk.dev"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={isLoading}
                className="bg-[var(--card)] border-[var(--border)] text-sm focus-visible:ring-2 focus-visible:ring-[var(--primary)]"
              />
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label htmlFor="password" className="text-xs font-medium text-[var(--foreground)]">
                  Password
                </Label>
                <button
                  type="button"
                  onClick={() => setShowForgotNotice(!showForgotNotice)}
                  className="text-xs text-[var(--primary)] hover:underline font-medium cursor-pointer"
                >
                  Forgot password?
                </button>
              </div>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={isLoading}
                className="bg-[var(--card)] border-[var(--border)] text-sm focus-visible:ring-2 focus-visible:ring-[var(--primary)]"
              />
            </div>

            {showForgotNotice && (
              <div className="p-3 rounded-md bg-[var(--muted)] border border-[var(--border)] text-xs text-[var(--muted-foreground)]">
                <div className="flex items-center gap-1.5 font-medium text-[var(--foreground)] mb-1">
                  <ShieldAlert className="w-3.5 h-3.5 text-[var(--primary)]" />
                  <span>Password Reset Notice</span>
                </div>
                In Phase 1, password resets are handled by your organization administrator. Contact your administrator or use the demo credentials below.
              </div>
            )}

            <Button
              type="submit"
              disabled={isLoading}
              className="w-full bg-[var(--primary)] hover:bg-[color-mix(in_srgb,var(--primary)_90%,black)] text-white font-medium text-sm h-10 shadow-sm transition-all"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Signing In…
                </>
              ) : (
                'Sign In'
              )}
            </Button>
          </CardContent>

          <CardFooter className="flex flex-col border-t border-[var(--border)] pt-4 gap-2">
            <span className="text-[11px] text-[var(--muted-foreground)] font-medium self-start">
              Quick demo account fill:
            </span>
            <div className="grid grid-cols-3 gap-2 w-full">
              <button
                type="button"
                onClick={() => fillDemoCredentials('property@lexidesk.dev')}
                className="px-2 py-1.5 text-[11px] rounded border border-[var(--border)] bg-[var(--background)] hover:bg-[var(--muted)] text-[var(--foreground)] font-medium text-center transition-colors cursor-pointer truncate"
                title="Property Lawyer"
              >
                Property
              </button>
              <button
                type="button"
                onClick={() => fillDemoCredentials('litigation@lexidesk.dev')}
                className="px-2 py-1.5 text-[11px] rounded border border-[var(--border)] bg-[var(--background)] hover:bg-[var(--muted)] text-[var(--foreground)] font-medium text-center transition-colors cursor-pointer truncate"
                title="Litigation Lawyer"
              >
                Litigation
              </button>
              <button
                type="button"
                onClick={() => fillDemoCredentials('ca@lexidesk.dev')}
                className="px-2 py-1.5 text-[11px] rounded border border-[var(--border)] bg-[var(--background)] hover:bg-[var(--muted)] text-[var(--foreground)] font-medium text-center transition-colors cursor-pointer truncate"
                title="Chartered Accountant"
              >
                CA
              </button>
            </div>
          </CardFooter>
        </form>
      </Card>
    </div>
  )
}
