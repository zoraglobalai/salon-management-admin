import type { User } from "../../modules/auth/types/auth.types";

/**
 * Check if a user can access the POS (Point of Sale) system
 * 
 * Rules:
 * - Managers can always access POS
 * - Owners can access POS only if they don't have a manager assigned
 * 
 * @param user The authenticated user
 * @returns true if user can access POS, false otherwise
 */
export function canAccessPOS(user: User | null): boolean {
  if (!user) return false;
  
  // Managers always have POS access
  if (user.role === "MANAGER") return true;
  
  // Owners can access POS only if they don't have a manager assigned
  if (user.role === "OWNER" || user.role === "INDEPENDENT_OWNER") {
    return !user.hasManager;
  }
  
  return false;
}
