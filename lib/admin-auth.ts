import { auth } from "./firebase/config"

// Admin user ID - should be set in environment variables
// For now, we'll use a hardcoded admin email that can be configured
const ADMIN_EMAIL = process.env.NEXT_PUBLIC_ADMIN_EMAIL || "admin@deluxeisa.app"

/**
 * Check if the current user is the platform admin
 */
export function isAdmin(userEmail: string | null | undefined): boolean {
  if (!userEmail) return false
  return userEmail === ADMIN_EMAIL
}

/**
 * Check if the current Firebase user is the platform admin
 */
export function isCurrentUserAdmin(): boolean {
  const user = auth.currentUser
  if (!user || !user.email) return false
  return isAdmin(user.email)
}

/**
 * Get admin email for display purposes
 */
export function getAdminEmail(): string {
  return ADMIN_EMAIL
}
