import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { withErrorHandling } from "@/lib/api/route-handler";
import {
  seedDemoData,
  DEMO_USER_ID,
  DEMO_BUSINESS_ID,
} from "@/lib/demo/seed";
import {
  SESSION_COOKIE_NAME,
  ACTIVE_BIZ_COOKIE_NAME,
} from "@/lib/auth/session";

export const POST = withErrorHandling(async () => {
  // Ensure demo data is loaded
  await seedDemoData();

  const cookieStore = await cookies();

  // Set session cookie
  cookieStore.set(SESSION_COOKIE_NAME, DEMO_USER_ID, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 7, // 7 days
  });

  // Set active business cookie
  cookieStore.set(ACTIVE_BIZ_COOKIE_NAME, DEMO_BUSINESS_ID, {
    httpOnly: false,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });

  return NextResponse.json({
    data: {
      userId: DEMO_USER_ID,
      businessId: DEMO_BUSINESS_ID,
      email: "demo@recovery.ai",
      name: "Dr. Sarah Mitchell",
      businessName: "Apex Revenue & Health Care",
    },
    message: "Logged into demo account successfully.",
  });
});
