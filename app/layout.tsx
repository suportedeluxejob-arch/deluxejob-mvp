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
  title: {
    default: "DeLuxe - Plataforma Premium de Conteúdo Exclusivo",
    template: "%s | DeLuxe",
  },
  description:
    "Acesse conteúdos exclusivos das suas criadoras favoritas. Plataforma premium com níveis Bronze, Prata, Gold, Platinum e Diamante. Conteúdo personalizado e experiência VIP.",
  keywords: [
    "conteúdo exclusivo",
    "plataforma premium",
    "criadoras de conteúdo",
    "assinatura",
    "conteúdo VIP",
    "DeLuxe",
  ],
  authors: [{ name: "DeLuxe" }],
  creator: "DeLuxe",
  publisher: "DeLuxe",
  openGraph: {
    type: "website",
    locale: "pt_BR",
    url: process.env.NEXT_PUBLIC_APP_URL || "https://deluxeisa.com",
    siteName: "DeLuxe",
    title: "DeLuxe - Plataforma Premium de Conteúdo Exclusivo",
    description:
      "Acesse conteúdos exclusivos das suas criadoras favoritas. Plataforma premium com níveis Bronze, Prata, Gold, Platinum e Diamante.",
    images: [
      {
        url: `${process.env.NEXT_PUBLIC_APP_URL || "https://deluxeisa.com"}/og-image.png`,
        width: 1200,
        height: 630,
        alt: "DeLuxe - Plataforma Premium de Conteúdo Exclusivo",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "DeLuxe - Plataforma Premium de Conteúdo Exclusivo",
    description: "Acesse conteúdos exclusivos das suas criadoras favoritas. Plataforma premium com experiência VIP.",
    images: [`${process.env.NEXT_PUBLIC_APP_URL || "https://deluxeisa.com"}/og-image.png`],
    creator: "@deluxeisa",
  },
  generator: "deluxeisa",
  manifest: "/manifest.json",
  themeColor: "#ec4899",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "DeLuxe",
  },
  icons: {
    icon: [
      { url: "/favicon.png", sizes: "any" },
      { url: "/favicon.png", sizes: "32x32", type: "image/png" },
      { url: "/favicon.png", sizes: "16x16", type: "image/png" },
    ],
    shortcut: "/favicon.png",
    apple: [{ url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
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
