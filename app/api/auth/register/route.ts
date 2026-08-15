import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { withErrorHandling } from "@/lib/api/route-handler";
import { registerSchema } from "@/schemas/auth";
import { authService } from "@/services/auth-service";
import { SESSION_COOKIE_NAME, ACTIVE_BIZ_COOKIE_NAME } from "@/lib/auth/session";

export const POST = withErrorHandling(async (request: Request) => {
  const body: unknown = await request.json();
  const parsed = registerSchema.parse(body);

  const session = await authService.register(parsed);

  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE_NAME, session.user.id, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 7, // 7 days
  });

  if (session.activeBusinessId) {
    cookieStore.set(ACTIVE_BIZ_COOKIE_NAME, session.activeBusinessId, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 30,
    });
  }

  return NextResponse.json({ data: session }, { status: 201 });
});
