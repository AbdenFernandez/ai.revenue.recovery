import { cookies } from "next/headers";
import { AppError } from "@/lib/errors";
import { authService } from "@/services/auth-service";
import type { AuthSession } from "@/types/auth";

export const SESSION_COOKIE_NAME = "ai_rec_session_user_id";
export const ACTIVE_BIZ_COOKIE_NAME = "ai_rec_active_business_id";

/**
 * Extracts and verifies the active user session from cookies or headers.
 * Throws UNAUTHORIZED if not authenticated.
 */
export async function requireAuth(
  request?: Request,
): Promise<{ userId: string; session: AuthSession }> {
  let userId: string | null = null;
  let preferredBusinessId: string | undefined;

  // 1. Try Next.js cookies
  try {
    const cookieStore = await cookies();
    userId = cookieStore.get(SESSION_COOKIE_NAME)?.value ?? null;
    preferredBusinessId = cookieStore.get(ACTIVE_BIZ_COOKIE_NAME)?.value;
  } catch {
    // If called in an environment where cookies() is unavailable, fallback to request headers
  }

  // 2. Fallback to request header (e.g. for API testing or Bearer tokens)
  if (!userId && request) {
    const authHeader = request.headers.get("Authorization");
    if (authHeader?.startsWith("Bearer ")) {
      userId = authHeader.replace("Bearer ", "").trim();
    }
    const bizHeader = request.headers.get("X-Business-Id");
    if (bizHeader) {
      preferredBusinessId = bizHeader;
    }
  }

  if (!userId) {
    throw new AppError({
      code: "UNAUTHORIZED",
      message: "Authentication required. Please log in to proceed.",
    });
  }

  const session = await authService.getSession(userId, preferredBusinessId);

  return { userId, session };
}

/**
 * Optional session extractor that does not throw if unauthenticated.
 */
export async function getOptionalAuth(
  request?: Request,
): Promise<{ userId: string; session: AuthSession } | null> {
  try {
    return await requireAuth(request);
  } catch {
    return null;
  }
}
