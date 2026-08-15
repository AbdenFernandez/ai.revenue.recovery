import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { withErrorHandling } from "@/lib/api/route-handler";
import { SESSION_COOKIE_NAME, ACTIVE_BIZ_COOKIE_NAME } from "@/lib/auth/session";

export const POST = withErrorHandling(async () => {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE_NAME);
  cookieStore.delete(ACTIVE_BIZ_COOKIE_NAME);

  return NextResponse.json({ message: "Successfully logged out." });
});
