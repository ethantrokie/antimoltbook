import type { Metadata } from 'next'
import './globals.css'
import { AuthProvider } from '@/lib/auth'
import Layout from '@/components/Layout'

export const metadata: Metadata = {
  title: 'AntiMoltbook',
  description: 'A social media platform with creative CAPTCHA challenges',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <body className="antialiased">
        <AuthProvider>
          <Layout>{children}</Layout>
        </AuthProvider>
      </body>
    </html>
  )
}
