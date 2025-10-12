import { initializeApp } from "firebase/app"
import { getFirestore, collection, getDocs, deleteDoc, doc } from "firebase/firestore"

const firebaseConfig = {
  apiKey: "AIzaSyCoTBdVUdRRGBioZWa78Nz0YQibJYp06vk",
  authDomain: "deluxejob-8fc1e.firebaseapp.com",
  projectId: "deluxejob-8fc1e",
  storageBucket: "deluxejob-8fc1e.firebasestorage.app",
  messagingSenderId: "23015412981",
  appId: "1:23015412981:web:94c64b99c912d2ffe521bc",
}

const app = initializeApp(firebaseConfig)
const db = getFirestore(app)

async function deleteOldNotifications() {
  try {
    console.log("[v0] Iniciando limpeza de notificações antigas...")

    const notificationsRef = collection(db, "notifications")
    const querySnapshot = await getDocs(notificationsRef)

    console.log(`[v0] Total de notificações encontradas: ${querySnapshot.size}`)

    let deletedCount = 0

    for (const docSnapshot of querySnapshot.docs) {
      const data = docSnapshot.data()

      // Verificar se é uma notificação antiga (sem fromDisplayName "DeLuxe" ou com mensagem antiga)
      const isOldNotification =
        data.fromDisplayName !== "DeLuxe" ||
        data.title?.includes("Bem-vindo à plataforma!") ||
        data.message?.includes("minha plataforma exclusiva") ||
        data.title?.includes("💝")

      if (isOldNotification) {
        await deleteDoc(doc(db, "notifications", docSnapshot.id))
        deletedCount++
        console.log(`[v0] Deletada notificação antiga: "${data.title || "Sem título"}"`)
      }
    }

    console.log(`[v0] ✅ Limpeza concluída! ${deletedCount} notificações antigas foram removidas.`)
    console.log("[v0] Agora apenas notificações da DeLuxe com a logo aparecerão!")
  } catch (error) {
    console.error("[v0] ❌ Erro ao deletar notificações antigas:", error)
  }
}

deleteOldNotifications()
