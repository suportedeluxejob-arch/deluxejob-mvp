import type React from "react"
import type { Metadata } from "next"
import { Poppins, Inter } from "next/font/google"
import { Analytics } from "@vercel/analytics/next"
import { Suspense } from "react"
import { RealTimeProvider } from "@/components/real-time-provider"
import { ToastProvider } from "@/components/toast-provider"
import { NotificationProvider } from "@/components/notification-provider"
import { ContentProtectionProvider } from "@/components/content-protection-provider"
import "./globals.css"

const poppins = Poppins({
  subsets: ["latin"],
  weight: ["400", "600", "700"],
  variable: "--font-poppins",
  display: "swap",
})

const inter = Inter({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-inter",
  display: "swap",
})

export const metadata: Metadata = {
  title: "DeLuxe Isa",
  description: "Plataforma premium de conteúdo exclusivo",
  generator: "v0.app",
  manifest: "/manifest.json",
  themeColor: "#ec4899",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "DeLuxe Isa",
  },
  icons: {
    icon: "/favicon.png",
    shortcut: "/favicon.png",
    apple: "/favicon.png",
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="pt-BR" className="dark">
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no" />
      </head>
      <body className={`font-sans ${poppins.variable} ${inter.variable} antialiased`}>
        <ToastProvider>
          <RealTimeProvider>
            <NotificationProvider>
              <ContentProtectionProvider>
                <Suspense fallback={null}>{children}</Suspense>
              </ContentProtectionProvider>
            </NotificationProvider>
          </RealTimeProvider>
        </ToastProvider>
        <Analytics />
      </body>
    </html>
  )
}
