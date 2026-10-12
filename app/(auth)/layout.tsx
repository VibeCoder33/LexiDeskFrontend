import React from 'react'

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen w-full flex flex-col md:flex-row bg-[var(--background)]">
      {/* Left Pane — Brand & Vector Illustration */}
      <div className="hidden md:flex md:w-1/2 bg-[var(--background)] flex-col justify-between p-12 lg:p-16 border-r border-[var(--border)]">
        <div>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-[var(--primary)] flex items-center justify-center text-white font-bold text-xl shadow-sm">
              L
            </div>
            <div>
              <span className="text-xl font-bold tracking-tight text-[var(--foreground)]">
                LexiDesk
              </span>
              <span className="block text-xs text-[var(--muted-foreground)]">
                Professional Document Workspace
              </span>
            </div>
          </div>
        </div>

        {/* Inline SVG Abstract Illustration */}
        <div className="my-auto py-12 flex flex-col items-center justify-center">
          <svg
            className="w-80 h-80 max-w-full drop-shadow-sm"
            viewBox="0 0 320 320"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            {/* Vault Base Glow */}
            <circle cx="160" cy="160" r="130" fill="color-mix(in srgb, var(--primary) 5%, transparent)" />
            <circle cx="160" cy="160" r="100" fill="color-mix(in srgb, var(--primary) 8%, transparent)" />

            {/* Document Backing Card */}
            <rect
              x="80"
              y="70"
              width="160"
              height="180"
              rx="12"
              fill="var(--card)"
              stroke="var(--border)"
              strokeWidth="2"
            />
            {/* Folder Header */}
            <rect x="96" y="90" width="70" height="8" rx="4" fill="var(--primary)" />
            <rect x="96" y="110" width="128" height="6" rx="3" fill="var(--border)" />
            <rect x="96" y="124" width="110" height="6" rx="3" fill="var(--border)" />
            <rect x="96" y="138" width="90" height="6" rx="3" fill="var(--border)" />

            {/* Overlapping Secure Badge Shield */}
            <path
              d="M160 170 L200 185 V215 C200 235 180 250 160 255 C140 250 120 235 120 215 V185 Z"
              fill="var(--primary)"
              stroke="#FFFFFF"
              strokeWidth="2"
            />
            <path
              d="M152 212 L158 218 L170 206"
              stroke="#FFFFFF"
              strokeWidth="3"
              strokeLinecap="round"
              strokeLinejoin="round"
            />

            {/* Floating verification dots */}
            <circle cx="215" cy="115" r="5" fill="var(--success)" />
            <circle cx="105" cy="205" r="4" fill="var(--secondary)" />
          </svg>

          <div className="text-center mt-6 max-w-sm">
            <h3 className="text-lg font-semibold text-[var(--foreground)]">
              Secure Client Workspace
            </h3>
            <p className="text-xs text-[var(--muted-foreground)] mt-2 leading-relaxed">
              Purpose-built for Indian Property Attorneys, Litigation Lawyers, and Chartered Accountants to collect, verify, and manage client documents seamlessly.
            </p>
          </div>
        </div>

        <div className="text-xs text-[var(--muted-foreground)] flex items-center justify-between">
          <span>&copy; {new Date().getFullYear()} LexiDesk Systems</span>
          <span>Made for Indian Professionals</span>
        </div>
      </div>

      {/* Right Pane — Centered Card */}
      <div className="flex-1 flex items-center justify-center p-6 md:p-12 lg:p-16">
        <div className="w-full max-w-md">{children}</div>
      </div>
    </div>
  )
}
