"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { TopNavigation } from "@/components/top-navigation"
import { BottomNavigation } from "@/components/bottom-navigation"
import { PremiumContentOverlay } from "@/components/premium-content-overlay"
import {
  Heart,
  MessageCircle,
  Star,
  Camera,
  MoreHorizontal,
  Sparkles,
  Clock,
  ImageIcon,
  Video,
  Play,
  Lock,
  Gift,
  Verified,
  RefreshCw,
  Crown,
} from "lucide-react"
import { useParams, useRouter } from "next/navigation"
import {
  getUserByUsername,
  getPostsByAuthor,
  type CreatorProfile,
  checkUserLiked,
  toggleLike,
  toggleRetweet,
  checkUserRetweeted,
  getCurrentUserLevel,
  checkContentAccess,
  getUserProfile,
  getCreatorHighlights,
  type CreatorHighlight,
  getCreatorServices,
  type CreatorService,
} from "@/lib/firebase/firestore"
import { getServiceProduct } from "@/lib/service-products"
import { useAuthState } from "react-firebase-hooks/auth"
import { auth } from "@/lib/firebase/config"
import { useToast } from "@/hooks/use-toast"
import { detectSocialPlatform } from "@/lib/social-media-utils"

interface FirebasePost {
  id: string
  content: string
  images: string[]
  videos: string[]
  likes: number
  comments: number
  retweets: number
  createdAt: any
  requiredLevel?: string
}

const serviceIcons = {
  "chamada-video": Video,
  "chat-privado": MessageCircle,
  "conteudo-exclusivo": ImageIcon,
  "pack-fotos": Play,
  "encontro-virtual": Gift,
  default: Star,
}

export default function CreatorProfilePage() {
  const params = useParams()
  const router = useRouter()
  const username = params.username as string
  const [user] = useAuthState(auth)
  const [creator, setCreator] = useState<CreatorProfile | null>(null)
  const [posts, setPosts] = useState<FirebasePost[]>([])
  const [currentUserProfile, setCurrentUserProfile] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<"posts" | "services" | "gallery">("posts")
  const [likedPosts, setLikedPosts] = useState<Set<string>>(new Set())
  const [retweetedPosts, setRetweetedPosts] = useState<Set<string>>(new Set())
  const [userLevel, setUserLevel] = useState<"Gold" | "Platinum" | "Diamante">("Gold")
  const [commentModalOpen, setCommentModalOpen] = useState(false)
  const [selectedPostId, setSelectedPostId] = useState<string | null>(null)
  const [highlights, setHighlights] = useState<CreatorHighlight[]>([])
  const [selectedHighlight, setSelectedHighlight] = useState<CreatorHighlight | null>(null)
  const [currentStoryIndex, setCurrentStoryIndex] = useState(0)
  const [storyViewerOpen, setStoryViewerOpen] = useState(false)
  const [services, setServices] = useState<CreatorService[]>([])
  const [isOwner, setIsOwner] = useState(false)
  const { toast } = useToast()

  useEffect(() => {
    const loadCreatorProfile = async () => {
      if (!username) return

      try {
        setIsLoading(true)

        const creatorProfile = await getUserByUsername(username)
        if (creatorProfile && creatorProfile.userType === "creator") {
          setCreator(creatorProfile as CreatorProfile)

          const creatorPosts = await getPostsByAuthor(username)
          setPosts(creatorPosts)

          console.log("[v0] Loading highlights for creator profile:", creatorProfile.uid)
          const creatorHighlights = await getCreatorHighlights(creatorProfile.uid)
          console.log("[v0] Loaded highlights for profile:", creatorHighlights)
          setHighlights(creatorHighlights)

          console.log("[v0] Loading services for creator profile:", creatorProfile.uid)
          const creatorServices = await getCreatorServices(creatorProfile.uid)
          console.log("[v0] Loaded services for profile:", creatorServices)
          setServices(creatorServices.filter((s) => s.isActive))
        }

        if (user) {
          const currentProfile = await getUserProfile(user.uid)
          setCurrentUserProfile(currentProfile)

          if (creatorProfile && currentProfile) {
            setIsOwner(currentProfile.uid === creatorProfile.uid)
          }

          if (currentProfile) {
            const level = await getCurrentUserLevel(user.uid)
            setUserLevel(level)
          }
        }
      } catch (error) {
        console.error("Error loading creator profile:", error)
      } finally {
        setIsLoading(false)
      }
    }

    loadCreatorProfile()
  }, [username, user])

  useEffect(() => {
    const checkLikedPosts = async () => {
      if (!user || posts.length === 0) return

      const likedSet = new Set<string>()
      for (const post of posts) {
        if (post.id) {
          const isLiked = await checkUserLiked(user.uid, post.id)
          if (isLiked) {
            likedSet.add(post.id)
          }
        }
      }
      setLikedPosts(likedSet)
    }

    checkLikedPosts()
  }, [user, posts])

  useEffect(() => {
    const checkRetweetedPosts = async () => {
      if (!user || posts.length === 0) return

      const retweetedSet = new Set<string>()
      for (const post of posts) {
        if (post.id) {
          const isRetweeted = await checkUserRetweeted(user.uid, post.id)
          if (isRetweeted) {
            retweetedSet.add(post.id)
          }
        }
      }
      setRetweetedPosts(retweetedSet)
    }

    checkRetweetedPosts()
  }, [user, posts])

  const handleLike = async (postId: string) => {
    if (!user) {
      toast({
        title: "Login necessário",
        description: "Você precisa estar logado para curtir posts",
        variant: "destructive",
      })
      return
    }

    try {
      const wasLiked = await toggleLike(user.uid, postId)

      setLikedPosts((prev) => {
        const newSet = new Set(prev)
        if (wasLiked) {
          newSet.add(postId)
        } else {
          newSet.delete(postId)
        }
        return newSet
      })

      setPosts((prevPosts) =>
        prevPosts.map((post) =>
          post.id === postId ? { ...post, likes: (post.likes || 0) + (wasLiked ? 1 : -1) } : post,
        ),
      )
    } catch (error) {
      console.error("Error toggling like:", error)
    }
  }

  const handleComment = (postId: string) => {
    if (!user) {
      toast({
        title: "Login necessário",
        description: "Você precisa estar logado para comentar",
        variant: "destructive",
      })
      return
    }

    if (!currentUserProfile) {
      toast({
        title: "Erro",
        description: "Não foi possível verificar seu perfil",
        variant: "destructive",
      })
      return
    }

    const userTier = currentUserProfile.level?.toLowerCase() || "bronze"

    // Bronze and Prata users cannot comment
    if (userTier === "bronze" || userTier === "prata" || userTier === "silver") {
      toast({
        title: "Recurso Bloqueado",
        description:
          "Comentários estão disponíveis apenas para assinantes Gold ou superior. Faça upgrade para desbloquear!",
        variant: "destructive",
      })
      return
    }

    setSelectedPostId(postId)
    setCommentModalOpen(true)
  }

  const handleShare = async (postId: string) => {
    if (!user) {
      toast({
        title: "Login necessário",
        description: "Você precisa estar logado para retuitar",
        variant: "destructive",
      })
      return
    }

    if (!currentUserProfile) {
      toast({
        title: "Erro",
        description: "Não foi possível verificar seu perfil",
        variant: "destructive",
      })
      return
    }

    const userTier = currentUserProfile.level?.toLowerCase() || "bronze"

    // Bronze users cannot retweet
    if (userTier === "bronze") {
      toast({
        title: "Recurso Bloqueado",
        description:
          "Retweets estão disponíveis apenas para assinantes Prata ou superior. Faça upgrade para desbloquear!",
        variant: "destructive",
      })
      return
    }

    try {
      const wasRetweeted = await toggleRetweet(user.uid, postId, username)

      setRetweetedPosts((prev) => {
        const newSet = new Set(prev)
        if (wasRetweeted) {
          newSet.add(postId)
        } else {
          newSet.delete(postId)
        }
        return newSet
      })

      toast({
        title: wasRetweeted ? "Post retuitado!" : "Retweet removido",
        description: wasRetweeted ? "O post foi adicionado ao seu perfil" : "O post foi removido do seu perfil",
      })
    } catch (error) {
      console.error("Error toggling retweet:", error)
    }
  }

  const canComment = () => {
    if (!currentUserProfile) return false
    const userTier = currentUserProfile.level?.toLowerCase() || "bronze"
    // Only Gold, Platinum, and Diamante can comment
    return !["bronze", "prata", "silver"].includes(userTier)
  }

  const canRetweet = () => {
    if (!currentUserProfile) return false
    const userTier = currentUserProfile.level?.toLowerCase() || "bronze"
    // Bronze users cannot retweet
    return userTier !== "bronze"
  }

  const handleCommentAdded = (postId: string) => {
    setPosts((prevPosts) =>
      prevPosts.map((post) => (post.id === postId ? { ...post, comments: (post.comments || 0) + 1 } : post)),
    )
  }

  const hasContentAccess = (requiredLevel?: string) => {
    // Se é o dono do perfil, sempre tem acesso
    if (isOwner) return true

    if (!requiredLevel || requiredLevel === "Gold") return true
    return checkContentAccess(userLevel, requiredLevel)
  }

  const formatNumber = (num: number) => {
    if (num >= 1000000) {
      return `${(num / 1000000).toFixed(1)}M`
    }
    if (num >= 1000) {
      return `${(num / 1000).toFixed(1)}K`
    }
    return num.toString()
  }

  const formatTimestamp = (timestamp: any) => {
    if (!timestamp) return "agora"

    try {
      const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp)
      const now = new Date()
      const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60))

      if (diffInMinutes < 1) return "agora"
      if (diffInMinutes < 60) return `${diffInMinutes}m`
      if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}h`
      return `${Math.floor(diffInMinutes / 1440)}d`
    } catch (error) {
      return "agora"
    }
  }

  const getServiceIcon = (serviceId: string) => {
    return serviceIcons[serviceId] || serviceIcons.default
  }

  const openStoryViewer = (highlight: CreatorHighlight) => {
    if (!hasContentAccess(highlight.requiredLevel)) {
      toast({
        title: "Conteúdo Premium",
        description: `Este destaque requer nível ${highlight.requiredLevel}. Assine para ter acesso!`,
        variant: "default",
      })
      return
    }

    setSelectedHighlight(highlight)
    setCurrentStoryIndex(0)
    setStoryViewerOpen(true)
  }

  const closeStoryViewer = () => {
    setStoryViewerOpen(false)
    setSelectedHighlight(null)
    setCurrentStoryIndex(0)
  }

  const nextStory = () => {
    if (selectedHighlight && currentStoryIndex < selectedHighlight.images.length - 1) {
      setCurrentStoryIndex(currentStoryIndex + 1)
    } else {
      closeStoryViewer()
    }
  }

  const prevStory = () => {
    if (currentStoryIndex > 0) {
      setCurrentStoryIndex(currentStoryIndex - 1)
    }
  }

  const getTimeRemaining = (expiresAt: any) => {
    if (!expiresAt) return null

    try {
      const expiryDate = expiresAt.toDate ? expiresAt.toDate() : new Date(expiresAt)
      const now = new Date()
      const diffInHours = Math.floor((expiryDate.getTime() - now.getTime()) / (1000 * 60 * 60))

      if (diffInHours < 0) return "Expirado"
      if (diffInHours < 1) return "< 1h"
      if (diffInHours < 24) return `${diffInHours}h`
      const days = Math.floor(diffInHours / 24)
      return `${days}d`
    } catch (error) {
      return null
    }
  }

  const getLevelBadgeColor = (level: string) => {
    const normalizedLevel = level.toLowerCase()
    switch (normalizedLevel) {
      case "bronze":
        return "bg-orange-600/20 text-orange-400"
      case "prata":
      case "silver":
        return "bg-gray-400/20 text-gray-300"
      case "gold":
        return "bg-amber-500/20 text-amber-400"
      case "premium":
      case "platinum":
        return "bg-purple-600/20 text-purple-400"
      case "diamante":
      case "diamond":
        return "bg-cyan-500/20 text-cyan-400"
      default:
        return "bg-blue-500/20 text-blue-400"
    }
  }

  const getLevelBadge = (level: string) => {
    switch (level) {
      case "Bronze":
        return "B"
      case "Gold":
        return "G"
      case "Platinum":
        return "P"
      case "Diamante":
        return "D"
      default:
        return "G"
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <TopNavigation title="Carregando..." showBackButton />
        <div className="max-w-md mx-auto p-4 space-y-4">
          {[...Array(3)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-4">
                <div className="h-20 bg-muted rounded" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    )
  }

  if (!creator) {
    return (
      <div className="min-h-screen bg-background">
        <TopNavigation title="Perfil não encontrado" showBackButton />
        <div className="max-w-md mx-auto p-4 text-center">
          <h2 className="text-2xl font-bold mb-4">Criadora não encontrada</h2>
          <p className="text-muted-foreground mb-4">Esta criadora não existe ou foi removida.</p>
          <Button onClick={() => router.push("/creators")}>Ver outras criadoras</Button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <TopNavigation
        title={`@${creator.username}`}
        showBackButton={true}
        backHref="/feed"
        userProfile={currentUserProfile}
      />

      <main className="w-full max-w-4xl mx-auto">
        <div className="p-4 sm:p-6 space-y-4 sm:space-y-6">
          {creator.coverImage ? (
            <div className="relative rounded-2xl overflow-hidden -mx-4 sm:-mx-6 -mt-4 sm:-mt-6 mb-12 sm:mb-16">
              <img
                src={creator.coverImage || "/placeholder.svg?height=160&width=400&query=creator cover"}
                alt="Capa do perfil"
                className="w-full h-32 sm:h-40 object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
              {currentUserProfile?.username === creator.username && (
                <div className="absolute top-3 sm:top-4 right-3 sm:right-4">
                  <Button
                    size="sm"
                    variant="secondary"
                    className="rounded-full bg-black/50 hover:bg-black/70 text-white border-0 text-xs sm:text-sm"
                    onClick={() => router.push("/creator-settings")}
                  >
                    <Camera className="h-3 w-3 sm:h-4 sm:w-4 mr-1" />
                    Editar
                  </Button>
                </div>
              )}
            </div>
          ) : (
            <div className="h-4 sm:h-6" />
          )}

          <div
            className={`flex items-start justify-between relative z-10 gap-3 mb-4 ${creator.coverImage ? "-mt-20 sm:-mt-24" : ""}`}
          >
            <div className="flex items-start space-x-2 sm:space-x-3 flex-1 min-w-0">
              <Avatar className="h-20 w-20 sm:h-24 sm:w-24 ring-4 ring-background shadow-2xl flex-shrink-0">
                <AvatarImage
                  src={creator.profileImage || "/placeholder.svg"}
                  alt={creator.displayName}
                  className="object-cover"
                />
                <AvatarFallback className="text-xl sm:text-2xl font-bold">
                  {creator.displayName.charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>

              <div className={`flex-1 min-w-0 ${creator.coverImage ? "pt-10 sm:pt-12" : ""}`}>
                <div className="flex flex-col space-y-1 mb-1">
                  <h2 className="text-base sm:text-lg font-bold text-foreground truncate pr-2">
                    {creator.displayName}
                  </h2>
                  <div className="flex items-center space-x-2 sm:space-x-3 flex-wrap gap-y-1">
                    <p className="text-xs sm:text-sm text-muted-foreground truncate">@{creator.username}</p>
                    <Badge
                      variant="secondary"
                      className="bg-primary text-primary-foreground border-0 text-xs px-2 py-0.5"
                    >
                      <Star className="h-3 w-3 mr-1" />
                      Criadora
                    </Badge>
                    {creator.isVerified && <Verified className="h-3 w-3 text-primary" />}
                  </div>
                </div>
              </div>
            </div>

            {currentUserProfile?.username !== creator.username && (
              <div className={`flex-shrink-0 ${creator.coverImage ? "pt-10 sm:pt-12" : ""}`}>
                <Button
                  size="sm"
                  className="rounded-full bg-primary hover:bg-primary/90 text-primary-foreground border-0 shadow-lg font-semibold text-xs sm:text-sm"
                  onClick={() => router.push(`/chat/${creator.username}`)}
                >
                  <MessageCircle className="h-3 w-3 sm:h-4 sm:w-4 mr-1" />
                  Chat
                </Button>
              </div>
            )}
          </div>

          <div className="space-y-3">
            <p className="text-sm leading-relaxed text-foreground/90">
              {creator.bio || "Criadora de conteúdo exclusivo"}
            </p>

            {creator.socialLinks && Array.isArray(creator.socialLinks) && creator.socialLinks.length > 0 && (
              <div className="flex items-center justify-center space-x-3 py-2">
                {creator.socialLinks.map((link, index) => {
                  const platform = detectSocialPlatform(link)
                  const Icon = platform.icon
                  return (
                    <a
                      key={index}
                      href={link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center justify-center w-9 h-9 rounded-full bg-muted hover:bg-muted/80 transition-colors"
                      title={platform.name}
                    >
                      <Icon className="h-4 w-4" style={{ color: platform.color }} />
                    </a>
                  )
                })}
              </div>
            )}

            <div className="flex justify-around py-3 sm:py-4 bg-card rounded-xl border border-border shadow-sm">
              <div className="text-center">
                <div className="text-lg sm:text-xl font-bold text-primary">{posts.length}</div>
                <div className="text-xs text-muted-foreground">Posts</div>
              </div>
              <div className="text-center">
                <div className="text-lg sm:text-xl font-bold text-primary">
                  {creator.followerCount
                    ? creator.followerCount >= 1000000
                      ? `${(creator.followerCount / 1000000).toFixed(1)}M`
                      : creator.followerCount >= 1000
                        ? `${(creator.followerCount / 1000).toFixed(1)}K`
                        : creator.followerCount
                    : "0"}
                </div>
                <div className="text-xs text-muted-foreground">Seguidores</div>
              </div>
              <div className="text-center">
                <div className="text-lg sm:text-xl font-bold text-primary">{creator.satisfaction || 98}%</div>
                <div className="text-xs text-muted-foreground">Satisfação</div>
              </div>
            </div>
          </div>

          {currentUserProfile?.username !== creator.username && (
            <Button
              className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-semibold py-3 sm:py-4 rounded-xl shadow-lg transform hover:scale-[1.02] transition-all duration-200 text-sm sm:text-base"
              onClick={() => router.push(`/subscribe/${creator.uid}`)}
            >
              <div className="flex items-center justify-center space-x-2">
                <Sparkles className="h-4 w-4 sm:h-5 sm:w-5" />
                <span className="truncate">Assinar Prata - R$ 19,90/mês</span>
              </div>
            </Button>
          )}

          <div className="space-y-3">
            <h3 className="text-base sm:text-lg font-semibold">Destaques</h3>
            <div className="flex space-x-3 sm:space-x-4 py-2 overflow-x-auto -mx-2 px-2">
              {highlights.length === 0 ? (
                <div className="text-center py-8 w-full">
                  <div className="text-4xl mb-2">✨</div>
                  <div className="text-sm text-muted-foreground">Nenhum destaque ainda</div>
                </div>
              ) : (
                highlights.map((highlight) => (
                  <div
                    key={highlight.id}
                    className="flex flex-col items-center space-y-2 flex-shrink-0 cursor-pointer group"
                    onClick={() => openStoryViewer(highlight)}
                  >
                    <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-gradient-to-br from-primary to-primary/60 p-1 relative transform group-hover:scale-105 transition-transform duration-200">
                      <div className="w-full h-full rounded-full overflow-hidden">
                        <img
                          src={highlight.coverImage || "/placeholder.svg?height=80&width=80"}
                          alt={highlight.name}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                      </div>
                      <div className="absolute -bottom-1 -right-1 w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center text-white text-xs font-bold shadow-lg border-2 border-background">
                        {getLevelBadge(highlight.requiredLevel)}
                      </div>
                      {highlight.isTemporary && highlight.expiresAt && (
                        <div className="absolute -top-1 -right-1 w-6 h-6 sm:w-7 sm:h-7 rounded-full bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center shadow-lg border-2 border-background">
                          <Clock className="text-primary-foreground h-3 w-3 sm:h-3.5 sm:w-3.5" />
                        </div>
                      )}
                      {!hasContentAccess(highlight.requiredLevel) && (
                        <div className="absolute inset-0 bg-black/50 rounded-full flex items-center justify-center">
                          <Lock className="text-white text-sm h-3 w-3 sm:h-4 sm:w-4" />
                        </div>
                      )}
                    </div>
                    <span className="text-xs text-muted-foreground max-w-[60px] sm:max-w-[70px] truncate text-center">
                      {highlight.name}
                    </span>
                    {highlight.isTemporary && highlight.expiresAt && (
                      <span className="text-[10px] font-semibold text-primary bg-primary/10 px-2 py-0.5 rounded-full border border-primary/20">
                        {getTimeRemaining(highlight.expiresAt)}
                      </span>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        <div className="border-t border-border bg-background/80 backdrop-blur-sm sticky top-0 z-20">
          <div className="flex overflow-x-auto">
            {[
              { key: "posts", label: "Posts", icon: MessageCircle },
              { key: "services", label: "Serviços", icon: Gift },
              { key: "gallery", label: "Galeria", icon: Camera },
            ].map(({ key, label, icon: Icon }) => (
              <Button
                key={key}
                variant="ghost"
                className={`flex-1 min-w-[70px] sm:min-w-[80px] py-2 sm:py-3 rounded-none border-b-2 text-xs font-medium ${
                  activeTab === key
                    ? "border-primary text-primary bg-primary/5"
                    : "border-transparent text-muted-foreground hover:text-foreground"
                }`}
                onClick={() => setActiveTab(key as any)}
              >
                <Icon className="h-3 w-3 sm:h-4 sm:w-4 mr-1" />
                <span className="hidden sm:inline">{label}</span>
              </Button>
            ))}
          </div>
        </div>

        <div className="pb-20">
          {activeTab === "posts" && (
            <div className="space-y-4 p-4">
              {posts.length === 0 ? (
                <div className="text-center py-12 space-y-2">
                  <div className="text-4xl">📝</div>
                  <div className="text-lg font-semibold">Nenhum post ainda</div>
                  <div className="text-sm text-muted-foreground">Os posts de {creator.displayName} aparecerão aqui</div>
                </div>
              ) : (
                <div className="space-y-4">
                  {posts.map((post) => (
                    <Card key={post.id} className="border-border/50 fade-in">
                      <CardHeader className="pb-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-3">
                            <Avatar className="h-10 w-10 sm:h-11 sm:w-11 ring-2 ring-primary/20 flex-shrink-0">
                              <AvatarImage src={creator.profileImage || "/placeholder.svg"} alt={creator.displayName} />
                              <AvatarFallback>{creator.displayName.charAt(0).toUpperCase()}</AvatarFallback>
                            </Avatar>
                            <div>
                              <div className="flex items-center space-x-1.5">
                                <h3 className="font-semibold text-sm sm:text-base">{creator.displayName}</h3>
                                <div className="w-5 h-5 bg-gradient-to-br from-primary to-primary/80 rounded-full flex items-center justify-center flex-shrink-0 ring-1 ring-primary/20 shadow-md">
                                  <Verified className="h-3 w-3 text-primary-foreground" />
                                </div>
                                {post.requiredLevel && post.requiredLevel !== "Gold" && (
                                  <span
                                    className={`px-2 py-1 text-xs rounded-full ${getLevelBadgeColor(post.requiredLevel)}`}
                                  >
                                    {post.requiredLevel}
                                  </span>
                                )}
                              </div>
                              <p className="text-muted-foreground text-xs sm:text-sm">
                                @{creator.username} • {formatTimestamp(post.createdAt)}
                              </p>
                            </div>
                          </div>
                          <Button variant="ghost" size="sm" className="rounded-full">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </div>
                      </CardHeader>

                      <CardContent className="pt-0">
                        <div className="relative">
                          <div className={!hasContentAccess(post.requiredLevel) ? "filter blur-md" : ""}>
                            <p className="text-sm mb-3 leading-relaxed">{post.content}</p>

                            {post.images && post.images.length > 0 && (
                              <div className="mb-4 rounded-lg overflow-hidden">
                                <img
                                  src={post.images[0] || "/placeholder.svg"}
                                  alt="Post content"
                                  className="w-full h-auto object-cover"
                                />
                              </div>
                            )}

                            {post.videos && post.videos.length > 0 && (
                              <div className="mb-4 rounded-lg overflow-hidden">
                                <video src={post.videos[0]} controls className="w-full h-auto object-cover" />
                              </div>
                            )}
                          </div>

                          {!hasContentAccess(post.requiredLevel) && post.requiredLevel && (
                            <PremiumContentOverlay
                              requiredLevel={post.requiredLevel as "Gold" | "Platinum" | "Diamante"}
                              userLevel={userLevel}
                            />
                          )}
                        </div>

                        <div className="flex items-center justify-between pt-2">
                          <div className="flex items-center space-x-4">
                            <Button
                              variant="ghost"
                              size="sm"
                              className={`rounded-full p-2 ${
                                post.id && likedPosts.has(post.id) ? "text-red-500" : "text-muted-foreground"
                              } hover:text-red-500 transition-colors`}
                              onClick={() => post.id && handleLike(post.id)}
                            >
                              <Heart
                                className={`h-5 w-5 ${post.id && likedPosts.has(post.id) ? "fill-current" : ""}`}
                              />
                              <span className="ml-1 text-xs">{formatNumber(post.likes || 0)}</span>
                            </Button>

                            <Button
                              variant="ghost"
                              size="sm"
                              className={`rounded-full p-2 transition-colors ${
                                canComment()
                                  ? "text-muted-foreground hover:text-primary"
                                  : "text-muted-foreground/50 cursor-not-allowed"
                              }`}
                              onClick={() => post.id && handleComment(post.id)}
                              disabled={!canComment()}
                            >
                              <MessageCircle className="h-5 w-5" />
                              <span className="ml-1 text-xs">{formatNumber(post.comments || 0)}</span>
                            </Button>
                          </div>

                          <Button
                            variant="ghost"
                            size="sm"
                            className={`rounded-full p-2 transition-colors ${
                              canRetweet()
                                ? post.id && retweetedPosts.has(post.id)
                                  ? "text-green-500"
                                  : "text-muted-foreground hover:text-green-500"
                                : "text-muted-foreground/50 cursor-not-allowed"
                            }`}
                            onClick={() => post.id && handleShare(post.id)}
                            disabled={!canRetweet()}
                          >
                            <RefreshCw className="h-5 w-5" />
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === "services" && (
            <div className="p-4 space-y-4">
              {services.length === 0 ? (
                <div className="text-center py-12 space-y-2">
                  <div className="text-4xl">💎</div>
                  <div className="text-lg font-semibold">Nenhum serviço disponível</div>
                  <div className="text-sm text-muted-foreground">
                    {creator.displayName} ainda não oferece serviços personalizados
                  </div>
                </div>
              ) : (
                <div className="grid gap-4 sm:gap-6">
                  {services.map((service) => {
                    const serviceProduct = getServiceProduct(service.serviceProductId)
                    if (!serviceProduct) return null

                    const IconComponent = getServiceIcon(serviceProduct.category)
                    const originalPrice = serviceProduct.priceInCents / 100
                    const displayPrice = originalPrice

                    return (
                      <Card
                        key={service.id}
                        className="border-primary/30 hover:border-primary/60 transition-all duration-300 hover:shadow-lg hover:shadow-primary/20 overflow-hidden"
                      >
                        {service.coverImage && (
                          <div className="relative w-full h-40 sm:h-48 overflow-hidden">
                            <img
                              src={service.coverImage || "/placeholder.svg"}
                              alt={serviceProduct.name}
                              className="w-full h-full object-cover"
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
                            <div className="absolute top-3 left-3 flex flex-wrap gap-2">
                              {service.isBestSeller && (
                                <Badge className="bg-gradient-to-r from-purple-600 to-pink-600 text-white border-0 shadow-lg text-xs font-bold">
                                  <Sparkles className="h-3 w-3 mr-1" />
                                  MAIS VENDIDO
                                </Badge>
                              )}
                              {service.isExclusive && (
                                <Badge className="bg-gradient-to-r from-pink-600 to-purple-600 text-white border-0 shadow-lg text-xs font-bold">
                                  <Crown className="h-3 w-3 mr-1" />
                                  EXCLUSIVO
                                </Badge>
                              )}
                            </div>
                          </div>
                        )}
                        <CardContent className="p-4 sm:p-6">
                          <div className="flex items-start gap-3 sm:gap-4 mb-4">
                            <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-xl bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center flex-shrink-0 ring-2 ring-primary/20">
                              <IconComponent className="h-6 w-6 sm:h-7 sm:w-7 text-primary" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-start justify-between gap-2 mb-1">
                                <h3 className="font-bold text-base sm:text-lg leading-tight">{serviceProduct.name}</h3>
                                {!service.coverImage && (
                                  <div className="flex flex-wrap gap-1 flex-shrink-0">
                                    {service.isBestSeller && (
                                      <Badge className="bg-gradient-to-r from-purple-600 to-pink-600 text-white border-0 text-[10px] px-1.5 py-0.5">
                                        <Sparkles className="h-2.5 w-2.5 mr-0.5" />
                                        TOP
                                      </Badge>
                                    )}
                                    {service.isExclusive && (
                                      <Badge className="bg-gradient-to-r from-pink-600 to-purple-600 text-white border-0 text-[10px] px-1.5 py-0.5">
                                        <Crown className="h-2.5 w-2.5 mr-0.5" />
                                        VIP
                                      </Badge>
                                    )}
                                  </div>
                                )}
                              </div>
                              <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed mb-3">
                                {service.customDescription || serviceProduct.description}
                              </p>
                              <Badge
                                variant="outline"
                                className="text-[10px] sm:text-xs border-primary/30 text-primary/80"
                              >
                                {serviceProduct.category === "video"
                                  ? "Videochamada"
                                  : serviceProduct.category === "pack"
                                    ? "Pack de Fotos"
                                    : serviceProduct.category === "custom"
                                      ? "Personalizado"
                                      : "Encontro"}
                              </Badge>
                            </div>
                          </div>

                          <div className="bg-gradient-to-br from-primary/5 to-primary/10 rounded-xl p-3 sm:p-4 mb-4 border border-primary/20">
                            <div className="flex items-center justify-center mb-2">
                              <div className="text-center">
                                <div className="flex items-baseline gap-1 justify-center">
                                  <span className="text-2xl sm:text-3xl font-bold text-primary">
                                    R$ {displayPrice.toFixed(2).replace(".", ",")}
                                  </span>
                                </div>
                              </div>
                            </div>
                          </div>

                          <Button
                            size="lg"
                            className="w-full rounded-xl bg-gradient-to-r from-purple-900/60 to-pink-900/60 hover:from-purple-800/70 hover:to-pink-800/70 border border-purple-500/30 text-white font-semibold shadow-md hover:shadow-lg transition-all duration-200 h-12 sm:h-14 text-sm sm:text-base"
                            onClick={() => router.push(`/subscribe/${creator.uid}?tab=services`)}
                          >
                            <Gift className="h-4 w-4 sm:h-5 sm:w-5 mr-2" />
                            Comprar Agora
                          </Button>

                          {/* Trust indicators */}
                          <div className="flex items-center justify-center gap-3 sm:gap-4 mt-3 text-[10px] sm:text-xs text-muted-foreground">
                            <div className="flex items-center gap-1">
                              <Lock className="h-3 w-3" />
                              <span>Pagamento Seguro</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <Sparkles className="h-3 w-3" />
                              <span>Entrega Rápida</span>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    )
                  })}
                </div>
              )}
            </div>
          )}

          {activeTab === "gallery" && (
            <div className="p-4">
              {posts.filter((post) => post.images?.length > 0 || post.videos?.length > 0).length === 0 ? (
                <div className="text-center py-12 space-y-2">
                  <div className="text-4xl">🖼️</div>
                  <div className="text-lg font-semibold">Nenhuma mídia ainda</div>
                  <div className="text-sm text-muted-foreground">
                    As fotos e vídeos de {creator.displayName} aparecerão aqui
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-3 gap-1 sm:gap-2">
                  {posts
                    .filter((post) => post.images?.length > 0 || post.videos?.length > 0)
                    .flatMap((post) => {
                      const media = []

                      // Add images
                      if (post.images && post.images.length > 0) {
                        post.images.forEach((image) => {
                          media.push({
                            type: "image" as const,
                            url: image,
                            postId: post.id,
                            requiredLevel: post.requiredLevel,
                          })
                        })
                      }

                      // Add videos
                      if (post.videos && post.videos.length > 0) {
                        post.videos.forEach((video) => {
                          media.push({
                            type: "video" as const,
                            url: video,
                            postId: post.id,
                            requiredLevel: post.requiredLevel,
                          })
                        })
                      }

                      return media
                    })
                    .map((media, index) => (
                      <div
                        key={`${media.postId}-${index}`}
                        className="relative aspect-square bg-muted rounded-lg overflow-hidden group cursor-pointer"
                      >
                        <div className={!hasContentAccess(media.requiredLevel) ? "filter blur-md" : ""}>
                          {media.type === "image" ? (
                            <img
                              src={media.url || "/placeholder.svg"}
                              alt="Gallery item"
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                            />
                          ) : (
                            <div className="relative w-full h-full">
                              <video src={media.url} className="w-full h-full object-cover" muted />
                              <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                                <Play className="h-8 w-8 text-white" />
                              </div>
                            </div>
                          )}
                        </div>

                        {!hasContentAccess(media.requiredLevel) && media.requiredLevel && (
                          <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                            <div className="text-center space-y-1">
                              <Lock className="h-6 w-6 text-white mx-auto" />
                              <span className="text-xs text-white font-semibold">{media.requiredLevel}</span>
                            </div>
                          </div>
                        )}

                        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                          <div className="absolute bottom-2 left-2 right-2 flex items-center justify-between text-white text-xs">
                            <div className="flex items-center space-x-2">
                              {media.type === "video" && <Video className="h-3 w-3" />}
                              {media.type === "image" && <ImageIcon className="h-3 w-3" />}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                </div>
              )}
            </div>
          )}
        </div>
      </main>

      {storyViewerOpen && selectedHighlight && (
        <div className="fixed inset-0 bg-black z-50 flex items-center justify-center">
          <button
            onClick={closeStoryViewer}
            className="absolute top-4 right-4 text-white z-10 p-2 hover:bg-white/10 rounded-full transition-colors"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-6 w-6"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>

          {/* Story container with 9:16 aspect ratio */}
          <div className="relative w-full max-w-[500px] h-full max-h-[calc(100vh-2rem)] mx-auto flex items-center justify-center">
            {/* Progress bars at the top */}
            <div className="absolute top-0 left-0 right-0 flex space-x-1 z-20 p-2">
              {selectedHighlight.images.map((_, index) => (
                <div key={index} className="h-0.5 flex-1 rounded-full bg-white/30 overflow-hidden">
                  <div
                    className={`h-full bg-white transition-all duration-300 ${index === currentStoryIndex ? "w-full" : index < currentStoryIndex ? "w-full" : "w-0"}`}
                  />
                </div>
              ))}
            </div>

            {/* Creator profile header */}
            <div className="absolute top-4 left-4 right-16 z-20 flex items-center space-x-3">
              <div className="relative">
                <Avatar className="h-10 w-10 ring-2 ring-white/30">
                  <AvatarImage src={creator.profileImage || "/placeholder.svg"} alt={creator.displayName} />
                  <AvatarFallback>{creator.displayName.charAt(0).toUpperCase()}</AvatarFallback>
                </Avatar>
                {/* Level badge on avatar */}
                <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-gradient-to-br from-purple-600 to-pink-600 flex items-center justify-center text-white text-[10px] font-bold shadow-lg border-2 border-black">
                  {getLevelBadge(selectedHighlight.requiredLevel)}
                </div>
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center space-x-1.5">
                  <h3 className="font-semibold text-white text-sm truncate">{creator.displayName}</h3>
                  {creator.isVerified && <Verified className="h-3.5 w-3.5 text-white flex-shrink-0" />}
                </div>
                <p className="text-white/80 text-xs">
                  {selectedHighlight.isTemporary && selectedHighlight.expiresAt
                    ? getTimeRemaining(selectedHighlight.expiresAt)
                    : "Destaque"}
                </p>
              </div>
              {/* Level badge pill */}
              <div className="flex-shrink-0">
                <Badge className="bg-gradient-to-r from-purple-600 to-pink-600 text-white border-0 text-xs font-bold shadow-lg">
                  <Crown className="h-3 w-3 mr-1" />
                  {selectedHighlight.requiredLevel}
                </Badge>
              </div>
            </div>

            {/* Navigation buttons */}
            <button
              onClick={prevStory}
              className="absolute left-2 top-1/2 -translate-y-1/2 text-white z-10 p-2 hover:bg-white/10 rounded-full transition-colors disabled:opacity-30"
              disabled={currentStoryIndex === 0}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-6 w-6"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>

            {/* Story image with 9:16 aspect ratio */}
            <div className="relative w-full aspect-[9/16] bg-black rounded-lg overflow-hidden shadow-2xl">
              <img
                src={selectedHighlight.images[currentStoryIndex] || "/placeholder.svg"}
                alt={`${selectedHighlight.name} - ${currentStoryIndex + 1}`}
                className="w-full h-full object-cover"
              />

              {/* Gradient overlays for better text visibility */}
              <div className="absolute top-0 left-0 right-0 h-32 bg-gradient-to-b from-black/60 via-black/20 to-transparent pointer-events-none" />
              <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-black/60 via-black/20 to-transparent pointer-events-none" />
            </div>

            <button
              onClick={nextStory}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-white z-10 p-2 hover:bg-white/10 rounded-full transition-colors"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-6 w-6"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>

            {/* Story info at the bottom */}
            <div className="absolute bottom-4 left-4 right-4 z-20">
              <div className="bg-black/40 backdrop-blur-md rounded-2xl p-4 border border-white/10 shadow-xl">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-bold text-white text-base">{selectedHighlight.name}</h3>
                  <span className="text-white/70 text-sm font-medium">
                    {currentStoryIndex + 1}/{selectedHighlight.images.length}
                  </span>
                </div>
                {selectedHighlight.description && (
                  <p className="text-white/90 text-sm leading-relaxed">{selectedHighlight.description}</p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      <BottomNavigation userProfile={currentUserProfile} />
    </div>
  )
}
