"use client"
import { useState, useEffect } from "react"
import { useAuthState } from "react-firebase-hooks/auth"
import { auth, db } from "@/lib/firebase/config"
import { collection, query, where, onSnapshot, deleteDoc, getDocs } from "firebase/firestore"
import { getUserProfile, type UserProfile } from "@/lib/firebase/firestore"
import { useRouter } from "next/navigation"
import { Card, CardContent } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { MessageCircle, MoreVertical, Trash2, Crown } from "lucide-react"
import { formatDistanceToNow } from "date-fns"
import { ptBR } from "date-fns/locale"

interface Conversation {
  creatorId: string
  creatorProfile: UserProfile | null
  lastMessage: string
  lastMessageTime: Date
  unreadCount: number
}

export function CreatorsListForUsers() {
  const [user] = useAuthState(auth)
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [loading, setLoading] = useState(true)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [conversationToDelete, setConversationToDelete] = useState<string | null>(null)
  const router = useRouter()

  useEffect(() => {
    if (!user) return

    console.log("[v0] Setting up conversations listener for user:", user.uid)

    // Buscar mensagens onde o usuário é participante
    const messagesRef = collection(db, "chatMessages")
    const q = query(messagesRef, where("participants", "array-contains", user.uid))

    const unsubscribe = onSnapshot(q, async (snapshot) => {
      console.log("[v0] Received", snapshot.docs.length, "messages")

      // Agrupar mensagens por criadora
      const conversationsMap = new Map<string, Conversation>()

      for (const doc of snapshot.docs) {
        const data = doc.data()
        const otherUserId = data.participants.find((id: string) => id !== user.uid)

        if (!otherUserId) continue

        // Buscar perfil da criadora
        let creatorProfile = conversationsMap.get(otherUserId)?.creatorProfile

        if (!creatorProfile) {
          try {
            creatorProfile = await getUserProfile(otherUserId)
            console.log("[v0] Loaded creator profile:", creatorProfile?.username)
          } catch (error) {
            console.error("[v0] Error loading creator profile:", error)
            continue
          }
        }

        // Verificar se é criadora
        if (creatorProfile?.userType !== "creator") continue

        const existingConv = conversationsMap.get(otherUserId)
        const messageTime = data.timestamp?.toDate() || new Date()

        if (!existingConv || messageTime > existingConv.lastMessageTime) {
          conversationsMap.set(otherUserId, {
            creatorId: otherUserId,
            creatorProfile,
            lastMessage: data.message || "",
            lastMessageTime: messageTime,
            unreadCount: 0, // TODO: Implementar contagem de não lidas
          })
        }
      }

      // Converter para array e ordenar por última mensagem
      const conversationsArray = Array.from(conversationsMap.values()).sort(
        (a, b) => b.lastMessageTime.getTime() - a.lastMessageTime.getTime(),
      )

      console.log("[v0] Loaded", conversationsArray.length, "conversations for user")
      setConversations(conversationsArray)
      setLoading(false)
    })

    return () => unsubscribe()
  }, [user])

  const handleDeleteConversation = async (creatorId: string) => {
    if (!user) return

    try {
      console.log("[v0] Deleting conversation with creator:", creatorId)

      // Buscar todas as mensagens da conversa
      const messagesRef = collection(db, "chatMessages")
      const chatId1 = `${user.uid}_${creatorId}`
      const chatId2 = `${creatorId}_${user.uid}`

      const q1 = query(messagesRef, where("chatId", "==", chatId1))
      const q2 = query(messagesRef, where("chatId", "==", chatId2))

      const [snapshot1, snapshot2] = await Promise.all([getDocs(q1), getDocs(q2)])

      // Deletar todas as mensagens
      const deletePromises = [...snapshot1.docs, ...snapshot2.docs].map((doc) => deleteDoc(doc.ref))

      await Promise.all(deletePromises)

      console.log("[v0] Conversation deleted successfully")
      setDeleteDialogOpen(false)
      setConversationToDelete(null)
    } catch (error) {
      console.error("[v0] Error deleting conversation:", error)
    }
  }

  const handleChatClick = (username: string) => {
    console.log("[v0] Navigating to chat with creator:", username)
    router.push(`/chat/${username}`)
  }

  if (loading) {
    return (
      <div className="text-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
        <p className="text-muted-foreground mt-4">Carregando conversas...</p>
      </div>
    )
  }

  if (conversations.length === 0) {
    return (
      <div className="text-center py-12 space-y-4">
        <div className="p-4 bg-muted/30 rounded-full w-fit mx-auto">
          <MessageCircle className="h-12 w-12 text-muted-foreground" />
        </div>
        <div>
          <h3 className="font-semibold text-lg mb-2">Nenhuma conversa ainda</h3>
          <p className="text-muted-foreground text-sm">Suas conversas com criadoras aparecerão aqui</p>
        </div>
      </div>
    )
  }

  return (
    <>
      <div className="space-y-3">
        {conversations.map((conversation) => {
          if (!conversation.creatorProfile) return null

          return (
            <Card
              key={conversation.creatorId}
              className="hover:shadow-lg transition-all duration-200 cursor-pointer hover:border-primary/30 bg-gradient-to-br from-background to-muted/20"
            >
              <CardContent className="p-4">
                <div className="flex items-start space-x-4">
                  <div
                    className="flex-shrink-0 cursor-pointer"
                    onClick={() => handleChatClick(conversation.creatorProfile!.username)}
                  >
                    <Avatar className="h-14 w-14 ring-2 ring-primary/30 shadow-md">
                      <AvatarImage
                        src={conversation.creatorProfile.profileImage || "/placeholder.svg"}
                        alt={conversation.creatorProfile.displayName}
                      />
                      <AvatarFallback className="bg-gradient-to-br from-primary/20 to-primary/10">
                        {conversation.creatorProfile.displayName.charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                  </div>

                  <div
                    className="flex-1 min-w-0 cursor-pointer"
                    onClick={() => handleChatClick(conversation.creatorProfile!.username)}
                  >
                    <div className="flex items-center space-x-2 mb-1">
                      <h3 className="font-semibold truncate">{conversation.creatorProfile.displayName}</h3>
                      {conversation.creatorProfile.isVerified && (
                        <div className="w-4 h-4 bg-primary rounded-full flex items-center justify-center flex-shrink-0">
                          <span className="text-primary-foreground text-xs">✓</span>
                        </div>
                      )}
                      <Badge variant="secondary" className="text-xs flex-shrink-0">
                        <Crown className="h-3 w-3 mr-1" />
                        Criadora
                      </Badge>
                    </div>

                    <p className="text-sm text-muted-foreground line-clamp-1 mb-1">{conversation.lastMessage}</p>

                    <p className="text-xs text-muted-foreground">
                      {formatDistanceToNow(conversation.lastMessageTime, {
                        addSuffix: true,
                        locale: ptBR,
                      })}
                    </p>
                  </div>

                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm" className="rounded-full p-2 flex-shrink-0">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem
                        className="text-destructive focus:text-destructive"
                        onClick={(e) => {
                          e.stopPropagation()
                          setConversationToDelete(conversation.creatorId)
                          setDeleteDialogOpen(true)
                        }}
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Excluir Conversa
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir Conversa</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir esta conversa? Todas as mensagens serão removidas permanentemente. Esta
              ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => conversationToDelete && handleDeleteConversation(conversationToDelete)}
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
