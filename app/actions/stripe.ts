"use server"

import { stripe } from "@/lib/stripe"
import { getSubscriptionProduct } from "@/lib/stripe-products"
import { getServiceProduct } from "@/lib/service-products"

export async function createSubscriptionCheckout(
  userId: string,
  creatorId: string,
  tier: "prata" | "gold" | "platinum" | "diamante",
) {
  try {
    console.log("[v0] Creating checkout - userId:", userId, "creatorId:", creatorId, "tier:", tier)

    if (!userId) {
      throw new Error("Usuário não autenticado")
    }

    // Get subscription product
    const product = getSubscriptionProduct(tier)
    if (!product) {
      throw new Error(`Produto de assinatura não encontrado para tier: ${tier}`)
    }

    console.log("[v0] Product found:", product.name, "Price ID:", product.stripePriceId)

    let appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://deluxejob.netlify.app"

    // Ensure URL has proper protocol format (https://)
    if (!appUrl.startsWith("http://") && !appUrl.startsWith("https://")) {
      appUrl = `https://${appUrl}`
    }

    // Fix malformed URLs like "https:domain.com" to "https://domain.com"
    appUrl = appUrl.replace(/^(https?):([^/])/, "$1://$2")

    console.log("[v0] Using app URL:", appUrl)

    // Create Stripe checkout session for subscription
    const session = await stripe.checkout.sessions.create({
      ui_mode: "embedded",
      mode: "subscription",
      line_items: [
        {
          price: product.stripePriceId,
          quantity: 1,
        },
      ],
      subscription_data: {
        metadata: {
          userId,
          creatorId,
          tier,
        },
      },
      metadata: {
        userId,
        creatorId,
        tier,
      },
      return_url: `${appUrl}/subscription/success?session_id={CHECKOUT_SESSION_ID}`,
    })

    console.log("[v0] Checkout session created successfully:", session.id)

    return {
      clientSecret: session.client_secret,
      sessionId: session.id,
      success: true,
    }
  } catch (error) {
    console.error("[v0] Error creating subscription checkout:", error)

    const errorMessage = error instanceof Error ? error.message : "Erro desconhecido ao criar checkout"
    console.error("[v0] Error details:", errorMessage)

    return {
      success: false,
      error: errorMessage,
    }
  }
}

export async function getCheckoutSession(sessionId: string) {
  try {
    const session = await stripe.checkout.sessions.retrieve(sessionId)
    return session
  } catch (error) {
    console.error("[v0] Error retrieving checkout session:", error)
    throw error
  }
}

export async function createServiceCheckout(userId: string, creatorId: string, serviceProductId: string) {
  try {
    console.log(
      "[v0] Creating service checkout - userId:",
      userId,
      "creatorId:",
      creatorId,
      "service:",
      serviceProductId,
    )

    if (!userId) {
      throw new Error("Usuário não autenticado")
    }

    const product = getServiceProduct(serviceProductId)
    if (!product) {
      throw new Error(`Serviço não encontrado: ${serviceProductId}`)
    }

    console.log("[v0] Service found:", product.name, "Price ID:", product.stripePriceId)

    let appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://deluxejob.netlify.app"

    if (!appUrl.startsWith("http://") && !appUrl.startsWith("https://")) {
      appUrl = `https://${appUrl}`
    }

    appUrl = appUrl.replace(/^(https?):([^/])/, "$1://$2")

    console.log("[v0] Using app URL:", appUrl)

    const session = await stripe.checkout.sessions.create({
      ui_mode: "embedded",
      mode: "payment",
      line_items: [
        {
          price: product.stripePriceId,
          quantity: 1,
        },
      ],
      metadata: {
        userId,
        creatorId,
        serviceProductId,
        type: "service_purchase",
      },
      return_url: `${appUrl}/service/success?session_id={CHECKOUT_SESSION_ID}`,
    })

    console.log("[v0] Service checkout session created successfully:", session.id)

    return {
      clientSecret: session.client_secret,
      sessionId: session.id,
      success: true,
    }
  } catch (error) {
    console.error("[v0] Error creating service checkout:", error)

    const errorMessage = error instanceof Error ? error.message : "Erro desconhecido ao criar checkout"
    console.error("[v0] Error details:", errorMessage)

    return {
      success: false,
      error: errorMessage,
    }
  }
}
