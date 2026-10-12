import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import NextTopLoader from 'nextjs-toploader'
import { Toaster } from '@/components/ui/sonner'
import './globals.css'

const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-sans',
})

export const metadata: Metadata = {
  title: 'LexiDesk — Role-Based Document Workspace for Indian Professionals',
  description:
    'Document collection and client workspace SaaS engineered for Property Lawyers, Litigation Lawyers, and Chartered Accountants.',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" className={inter.variable}>
      <body className="antialiased font-sans bg-[var(--background)] text-[var(--foreground)] min-h-screen">
        <NextTopLoader color="#422EC3" showSpinner={false} />
        {children}
        <Toaster position="top-right" richColors />
      </body>
    </html>
  )
}
