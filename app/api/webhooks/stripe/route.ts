import { type NextRequest, NextResponse } from "next/server"
import { stripe } from "@/lib/stripe"
import { headers } from "next/headers"
import type Stripe from "stripe"

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!

export async function POST(req: NextRequest) {
  try {
    const body = await req.text()
    const headersList = await headers()
    const signature = headersList.get("stripe-signature")

    if (!signature) {
      console.error("[v0] No Stripe signature found")
      return NextResponse.json({ error: "No signature" }, { status: 400 })
    }

    let event: Stripe.Event

    try {
      event = stripe.webhooks.constructEvent(body, signature, webhookSecret)
    } catch (err) {
      console.error("[v0] Webhook signature verification failed:", err)
      return NextResponse.json({ error: "Invalid signature" }, { status: 400 })
    }

    console.log("[v0] Stripe webhook event received:", event.type)

    // Handle different event types
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session
        await handleCheckoutCompleted(session)
        break
      }

      case "customer.subscription.created":
      case "customer.subscription.updated": {
        const subscription = event.data.object as Stripe.Subscription
        await handleSubscriptionUpdated(subscription)
        break
      }

      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription
        await handleSubscriptionDeleted(subscription)
        break
      }

      case "invoice.paid": {
        const invoice = event.data.object as Stripe.Invoice
        await handleInvoicePaid(invoice)
        break
      }

      case "invoice.payment_failed": {
        const invoice = event.data.object as Stripe.Invoice
        await handleInvoicePaymentFailed(invoice)
        break
      }

      default:
        console.log("[v0] Unhandled event type:", event.type)
    }

    return NextResponse.json({ received: true })
  } catch (error) {
    console.error("[v0] Webhook error:", error)
    return NextResponse.json({ error: "Webhook handler failed" }, { status: 500 })
  }
}

async function handleCheckoutCompleted(session: Stripe.Checkout.Session) {
  console.log("[v0] Checkout completed:", session.id)

  const userId = session.metadata?.userId
  const creatorId = session.metadata?.creatorId
  const tier = session.metadata?.tier as "prata" | "gold" | "platinum" | "diamante"

  if (!userId || !creatorId || !tier) {
    console.error("[v0] Missing metadata in checkout session")
    return
  }

  const { updateUserSubscription, updateUserLevel } = await import("@/lib/firebase/firestore")

  // Update user subscription status
  await updateUserSubscription(userId, {
    tier,
    status: "active",
    stripeCustomerId: session.customer as string,
    stripeSubscriptionId: session.subscription as string,
  })

  // Update user level to match subscription tier
  const levelMap: Record<string, "Bronze" | "Prata" | "Gold" | "Platinum" | "Diamante"> = {
    prata: "Prata",
    gold: "Gold",
    platinum: "Platinum",
    diamante: "Diamante",
  }

  await updateUserLevel(userId, levelMap[tier])

  console.log("[v0] User subscription and level updated:", userId, tier, levelMap[tier])
}

async function handleSubscriptionUpdated(subscription: Stripe.Subscription) {
  console.log("[v0] Subscription updated:", subscription.id)

  const userId = subscription.metadata?.userId
  const tier = subscription.metadata?.tier as "prata" | "gold" | "platinum" | "diamante"

  if (!userId || !tier) {
    console.error("[v0] Missing metadata in subscription")
    return
  }

  const { updateUserSubscription, updateUserLevel } = await import("@/lib/firebase/firestore")

  await updateUserSubscription(userId, {
    tier,
    status: subscription.status as "active" | "canceled" | "past_due",
    stripeSubscriptionId: subscription.id,
  })

  // Update user level to match subscription tier
  const levelMap: Record<string, "Bronze" | "Prata" | "Gold" | "Platinum" | "Diamante"> = {
    prata: "Prata",
    gold: "Gold",
    platinum: "Platinum",
    diamante: "Diamante",
  }

  await updateUserLevel(userId, levelMap[tier])

  console.log("[v0] User subscription and level updated:", userId, tier, levelMap[tier])
}

async function handleSubscriptionDeleted(subscription: Stripe.Subscription) {
  console.log("[v0] Subscription deleted:", subscription.id)

  const userId = subscription.metadata?.userId

  if (!userId) {
    console.error("[v0] Missing userId in subscription metadata")
    return
  }

  const { updateUserSubscription, updateUserLevel, createNotificationWithExpiry } = await import(
    "@/lib/firebase/firestore"
  )

  await updateUserSubscription(userId, {
    tier: "bronze",
    status: "canceled",
  })

  // Reset user level to Bronze when subscription is canceled
  await updateUserLevel(userId, "Bronze")

  // Enviar notificação sobre o cancelamento
  await createNotificationWithExpiry({
    userId,
    type: "system",
    title: "Assinatura Cancelada",
    message:
      "Sua assinatura foi cancelada e você voltou para o tier Bronze. Você ainda pode interagir e ganhar XP! Faça upgrade novamente quando quiser.",
    fromUserId: "deluxe-platform-uid",
    fromUsername: "deluxe",
    fromDisplayName: "DeLuxe",
    fromProfileImage: "/deluxe-logo.png",
  })

  console.log("[v0] User subscription canceled and level reset to Bronze:", userId)
}

async function handleInvoicePaid(invoice: Stripe.Invoice) {
  console.log("[v0] Invoice paid:", invoice.id)

  const subscription = await stripe.subscriptions.retrieve(invoice.subscription as string)
  const userId = subscription.metadata?.userId
  const creatorId = subscription.metadata?.creatorId
  const tier = subscription.metadata?.tier

  if (!userId || !creatorId) {
    console.error("[v0] Missing metadata in subscription")
    return
  }

  const { createTransaction, processMLMCommissions, getCreatorNetwork, getCreatorFinancials, updateCreatorFinancials } =
    await import("@/lib/firebase/firestore")

  const grossAmountCents = invoice.amount_paid
  const grossAmount = grossAmountCents / 100

  // Platform takes 30%, creator gets 70%
  const creatorShareCents = Math.floor(grossAmountCents * 0.7)
  const platformShareCents = Math.floor(grossAmountCents * 0.3)

  console.log(
    `[v0] Processing payment - Gross: R$ ${grossAmount.toFixed(2)}, Creator (70%): R$ ${(creatorShareCents / 100).toFixed(2)}, Platform (30%): R$ ${(platformShareCents / 100).toFixed(2)}`,
  )

  await createTransaction({
    creatorId,
    type: "subscription",
    amount: creatorShareCents,
    description: `Assinatura ${tier} - Usuário ${userId}`,
    fromUserId: userId,
    status: "completed",
    createdAt: new Date(),
  })

  const creatorFinancials = await getCreatorFinancials(creatorId)
  await updateCreatorFinancials(creatorId, {
    availableBalance: (creatorFinancials.availableBalance || 0) + creatorShareCents,
    directEarnings: (creatorFinancials.directEarnings || 0) + creatorShareCents,
    monthlyRevenue: (creatorFinancials.monthlyRevenue || 0) + creatorShareCents,
    totalEarnings: (creatorFinancials.totalEarnings || 0) + creatorShareCents,
  })

  console.log("[v0] Creator financials updated:", creatorId, `+R$ ${(creatorShareCents / 100).toFixed(2)}`)

  const network = await getCreatorNetwork(creatorId)
  let totalCommissionsPaidCents = 0

  if (network && network.length > 0 && network[0].referredBy) {
    totalCommissionsPaidCents = await processMLMCommissions(creatorId, grossAmountCents, userId)
    console.log(`[v0] MLM commissions processed: R$ ${(totalCommissionsPaidCents / 100).toFixed(2)}`)
  }

  const platformProfitCents = platformShareCents - totalCommissionsPaidCents

  await createTransaction({
    creatorId: "PLATFORM",
    type: "platform_revenue",
    amount: platformProfitCents,
    description: `Lucro da plataforma - Assinatura ${tier}`,
    fromUserId: userId,
    status: "completed",
    createdAt: new Date(),
  })

  console.log(`[v0] Platform profit recorded: R$ ${(platformProfitCents / 100).toFixed(2)}`)
}

async function handleInvoicePaymentFailed(invoice: Stripe.Invoice) {
  console.log("[v0] Invoice payment failed:", invoice.id)

  const subscription = await stripe.subscriptions.retrieve(invoice.subscription as string)
  const userId = subscription.metadata?.userId

  if (!userId) {
    console.error("[v0] Missing userId in subscription metadata")
    return
  }

  const { updateUserSubscription, createNotificationWithExpiry } = await import("@/lib/firebase/firestore")

  // Update subscription status to past_due
  await updateUserSubscription(userId, {
    status: "past_due",
  })

  // Enviar notificação sobre falha no pagamento
  await createNotificationWithExpiry({
    userId,
    type: "system",
    title: "Falha no Pagamento ⚠️",
    message:
      "Não conseguimos processar seu pagamento. Por favor, atualize suas informações de pagamento para continuar com acesso aos conteúdos exclusivos.",
    fromUserId: "deluxe-platform-uid",
    fromUsername: "deluxe",
    fromDisplayName: "DeLuxe",
    fromProfileImage: "/deluxe-logo.png",
  })

  console.log("[v0] Payment failed notification sent to user:", userId)
}
