import { type NextRequest, NextResponse } from "next/server"
import Stripe from "stripe"
import { doc, updateDoc, getDoc } from "firebase/firestore"
import { db } from "@/lib/firebase/config"

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2024-11-20.acacia",
})

export async function POST(request: NextRequest) {
  try {
    const { sessionId, userId } = await request.json()

    if (!sessionId || !userId) {
      return NextResponse.json({ error: "Missing sessionId or userId" }, { status: 400 })
    }

    console.log("[v0] Verifying checkout session:", sessionId, "for user:", userId)

    const session = await stripe.checkout.sessions.retrieve(sessionId, {
      expand: ["line_items", "line_items.data.price.product"],
    })

    if (session.payment_status !== "paid") {
      return NextResponse.json({ error: "Payment not completed" }, { status: 400 })
    }

    const priceId = session.line_items?.data[0]?.price?.id
    console.log("[v0] Price ID from session:", priceId)

    // Map price IDs to tiers
    const tierMap: Record<string, string> = {
      price_1SEJqf5I63txB0RGffH4TL4q: "prata", // R$ 19,90
      price_1SEJrb5I63txB0RGmEzQuWdw: "gold", // R$ 39,90
      price_1SEJsm5I63txB0RGwaobzeyd: "platinum", // R$ 79,90
      price_1SEJtR5I63txB0RGvcbpNBay: "diamante", // R$ 99,90
    }

    const tier = priceId ? tierMap[priceId] : null

    if (!tier) {
      console.error("[v0] Unknown price ID:", priceId)
      return NextResponse.json({ error: "Unknown subscription tier" }, { status: 400 })
    }

    console.log("[v0] Mapped tier:", tier, "from price ID:", priceId)
    console.log("[v0] Updating user level to:", tier, "type:", typeof tier)

    const userRef = doc(db, "users", userId)
    const userDoc = await getDoc(userRef)

    if (!userDoc.exists()) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    await updateDoc(userRef, {
      level: tier,
      subscription: {
        tier,
        status: "active",
        stripeCustomerId: session.customer as string,
        stripeSubscriptionId: session.subscription as string,
        currentPeriodEnd: new Date(session.expires_at * 1000),
        updatedAt: new Date(),
      },
      updatedAt: new Date(),
    })

    console.log("[v0] User level updated successfully to:", tier)
    const updatedUserDoc = await getDoc(userRef)
    console.log("[v0] Verified user level in database:", updatedUserDoc.data()?.level)

    return NextResponse.json({
      success: true,
      tier,
      message: "Subscription verified and user level updated",
    })
  } catch (error) {
    console.error("[v0] Error verifying checkout:", error)
    return NextResponse.json({ error: "Failed to verify checkout session" }, { status: 500 })
  }
}
