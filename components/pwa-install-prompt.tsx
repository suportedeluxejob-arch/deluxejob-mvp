"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { X, Heart, Sparkles, Zap } from "lucide-react"

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>
}

export function PWAInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [showPrompt, setShowPrompt] = useState(false)
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    console.log("[v0] PWA Install Prompt component mounted")

    const checkMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)
    setIsMobile(checkMobile)
    console.log("[v0] Is mobile device:", checkMobile)
    console.log("[v0] User agent:", navigator.userAgent)

    // Check if user already dismissed the prompt
    const dismissed = localStorage.getItem("pwa-install-dismissed")
    console.log("[v0] PWA install dismissed in localStorage:", dismissed)

    if (dismissed) {
      console.log("[v0] PWA prompt was previously dismissed, not showing")
      return
    }

    // Check if app is already installed
    const isStandalone = window.matchMedia("(display-mode: standalone)").matches
    console.log("[v0] App is standalone (already installed):", isStandalone)

    if (isStandalone) {
      console.log("[v0] App already installed, not showing prompt")
      return
    }

    if (checkMobile) {
      console.log("[v0] Mobile detected, will show prompt in 1 second")
      const timer = setTimeout(() => {
        console.log("[v0] Showing PWA install prompt now")
        setShowPrompt(true)
      }, 1000)

      return () => clearTimeout(timer)
    } else {
      console.log("[v0] Not mobile, waiting for beforeinstallprompt event")
    }

    // Listen for beforeinstallprompt event (for browsers that support it)
    const handler = (e: Event) => {
      console.log("[v0] beforeinstallprompt event fired")
      e.preventDefault()
      setDeferredPrompt(e as BeforeInstallPromptEvent)
      setShowPrompt(true)
    }

    window.addEventListener("beforeinstallprompt", handler)

    return () => {
      window.removeEventListener("beforeinstallprompt", handler)
    }
  }, [])

  useEffect(() => {
    console.log("[v0] showPrompt state changed to:", showPrompt)
  }, [showPrompt])

  const handleInstall = async () => {
    console.log("[v0] Install button clicked")

    if (deferredPrompt) {
      console.log("[v0] Using deferred prompt")
      deferredPrompt.prompt()
      const { outcome } = await deferredPrompt.userChoice
      console.log("[v0] User choice:", outcome)

      if (outcome === "accepted") {
        setShowPrompt(false)
        localStorage.setItem("pwa-install-dismissed", "true")
      }

      setDeferredPrompt(null)
    } else {
      console.log("[v0] No deferred prompt, showing manual instructions")
      const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent)
      const isAndroid = /Android/.test(navigator.userAgent)

      let message = ""
      if (isIOS) {
        message =
          "Para instalar no iOS:\n1. Toque no ícone de compartilhar\n2. Role para baixo e toque em 'Adicionar à Tela de Início'\n3. Toque em 'Adicionar'"
      } else if (isAndroid) {
        message =
          "Para instalar no Android:\n1. Toque no menu (⋮) no navegador\n2. Toque em 'Adicionar à tela inicial'\n3. Toque em 'Adicionar'"
      } else {
        message =
          "Para instalar:\n1. Abra o menu do navegador\n2. Selecione 'Adicionar à tela inicial'\n3. Confirme a instalação"
      }

      alert(message)
      setShowPrompt(false)
      localStorage.setItem("pwa-install-dismissed", "true")
    }
  }

  const handleDismiss = () => {
    console.log("[v0] Dismiss button clicked")
    setShowPrompt(false)
    localStorage.setItem("pwa-install-dismissed", "true")
  }

  console.log("[v0] PWA Install Prompt render - showPrompt:", showPrompt)

  if (!showPrompt) return null

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-300">
      <Card className="w-full max-w-md bg-zinc-900 border-zinc-800 p-6 space-y-6 relative animate-in slide-in-from-bottom duration-300">
        <Button
          variant="ghost"
          size="icon"
          className="absolute top-4 right-4 text-zinc-400 hover:text-white"
          onClick={handleDismiss}
        >
          <X className="h-5 w-5" />
        </Button>

        <div className="space-y-2">
          <h2 className="text-2xl font-bold text-white">Instalar DeLuxe</h2>
          <p className="text-zinc-400">Adicionar à Tela Inicial</p>
        </div>

        <div className="space-y-3">
          <div className="flex items-center gap-4 p-4 bg-zinc-800/50 rounded-xl border border-zinc-700/50">
            <div className="flex-shrink-0 w-12 h-12 rounded-full bg-gradient-to-br from-pink-500 to-rose-500 flex items-center justify-center">
              <Heart className="h-6 w-6 text-white" />
            </div>
            <p className="text-white font-medium">Conteúdo Exclusivo Premium</p>
          </div>

          <div className="flex items-center gap-4 p-4 bg-zinc-800/50 rounded-xl border border-zinc-700/50">
            <div className="flex-shrink-0 w-12 h-12 rounded-full bg-gradient-to-br from-pink-500 to-rose-500 flex items-center justify-center">
              <Zap className="h-6 w-6 text-white" />
            </div>
            <p className="text-white font-medium">Acesso Rápido e Fácil</p>
          </div>

          <div className="flex items-center gap-4 p-4 bg-zinc-800/50 rounded-xl border border-zinc-700/50">
            <div className="flex-shrink-0 w-12 h-12 rounded-full bg-gradient-to-br from-pink-500 to-rose-500 flex items-center justify-center">
              <Sparkles className="h-6 w-6 text-white" />
            </div>
            <p className="text-white font-medium">Experiência Mais Fluida</p>
          </div>
        </div>

        <div className="flex items-start gap-2 p-3 bg-pink-500/10 border border-pink-500/20 rounded-lg">
          <div className="flex-shrink-0 w-5 h-5 rounded-full bg-pink-500 flex items-center justify-center mt-0.5">
            <span className="text-white text-xs font-bold">i</span>
          </div>
          <p className="text-sm text-pink-200">Dica: Se já foi adicionado, abra da área de trabalho</p>
        </div>

        <div className="flex gap-3">
          <Button
            variant="outline"
            className="flex-1 rounded-full border-zinc-700 text-zinc-300 hover:bg-zinc-800 bg-transparent"
            onClick={handleDismiss}
          >
            Talvez Depois
          </Button>
          <Button
            className="flex-1 rounded-full bg-gradient-to-r from-pink-500 to-rose-500 hover:from-pink-600 hover:to-rose-600 text-white font-semibold"
            onClick={handleInstall}
          >
            Instalar
          </Button>
        </div>
      </Card>
    </div>
  )
}
