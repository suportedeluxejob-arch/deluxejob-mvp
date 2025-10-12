// Sistema de avatares predefinidos para usuários
export const AVATAR_OPTIONS = [
  {
    id: "avatar-1",
    name: "Hacker Verde",
    url: "/avatars/avatar-1.jpg",
    color: "bg-emerald-600",
  },
  {
    id: "avatar-2",
    name: "Anime Roxo",
    url: "/avatars/avatar-2.jpg",
    color: "bg-purple-600",
  },
  {
    id: "avatar-3",
    name: "Urbano",
    url: "/avatars/avatar-3.jpg",
    color: "bg-slate-600",
  },
  {
    id: "avatar-4",
    name: "Máscara Rosa",
    url: "/avatars/avatar-4.jpg",
    color: "bg-pink-600",
  },
  {
    id: "avatar-5",
    name: "Cyber Smiley",
    url: "/avatars/avatar-5.jpg",
    color: "bg-cyan-600",
  },
  {
    id: "avatar-6",
    name: "Tech Roxo",
    url: "/avatars/avatar-6.jpg",
    color: "bg-violet-600",
  },
  {
    id: "avatar-7",
    name: "Executivo",
    url: "/avatars/avatar-7.jpg",
    color: "bg-blue-600",
  },
  {
    id: "avatar-8",
    name: "Luxo",
    url: "/avatars/avatar-8.jpg",
    color: "bg-indigo-600",
  },
]

export const getRandomAvatar = () => {
  const randomIndex = Math.floor(Math.random() * AVATAR_OPTIONS.length)
  return AVATAR_OPTIONS[randomIndex]
}

export const getAvatarById = (id: string) => {
  return AVATAR_OPTIONS.find((avatar) => avatar.id === id) || AVATAR_OPTIONS[0]
}
