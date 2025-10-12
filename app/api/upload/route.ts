import { put } from "@vercel/blob"
import { NextResponse } from "next/server"

export async function POST(request: Request) {
  try {
    console.log("[v0] Upload API called")

    const formData = await request.formData()
    const file = formData.get("file") as File

    if (!file) {
      console.log("[v0] No file provided")
      return NextResponse.json({ error: "Nenhum arquivo fornecido" }, { status: 400 })
    }

    console.log("[v0] File received:", {
      name: file.name,
      type: file.type,
      size: file.size,
    })

    // Validate file type
    const isImage = file.type.startsWith("image/")
    const isVideo = file.type.startsWith("video/")

    if (!isImage && !isVideo) {
      return NextResponse.json({ error: "Apenas imagens e vídeos são permitidos" }, { status: 400 })
    }

    const maxSize = 4 * 1024 * 1024 // 4MB (below 4.5MB serverless limit)
    if (file.size > maxSize) {
      const sizeMB = (file.size / (1024 * 1024)).toFixed(1)
      return NextResponse.json(
        {
          error: `Arquivo muito grande (${sizeMB}MB). Máximo 4MB. Por favor, comprima o ${isVideo ? "vídeo" : "arquivo"} antes de enviar.`,
        },
        { status: 413 },
      )
    }

    console.log("[v0] Uploading to Vercel Blob...")

    try {
      const blob = await put(file.name, file, {
        access: "public",
      })

      console.log("[v0] Upload successful:", blob.url)

      return NextResponse.json({
        url: blob.url,
        filename: file.name,
        size: file.size,
        type: file.type,
      })
    } catch (blobError: any) {
      console.error("[v0] Vercel Blob error:", blobError)
      return NextResponse.json(
        {
          error: "Erro ao fazer upload para o armazenamento. Tente novamente ou use um arquivo menor.",
        },
        { status: 500 },
      )
    }
  } catch (error: any) {
    console.error("[v0] Upload error:", error)
    return NextResponse.json({ error: "Falha no upload. Tente novamente." }, { status: 500 })
  }
}
