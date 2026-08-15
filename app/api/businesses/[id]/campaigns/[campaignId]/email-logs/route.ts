import { NextResponse } from "next/server";
import { withErrorHandling } from "@/lib/api/route-handler";
import { requireAuth } from "@/lib/auth/session";
import { emailService } from "@/services/email-service";

export const GET = withErrorHandling(
  async (request: Request, context?: unknown) => {
    const { params } =
      (context as { params: Promise<{ id: string; campaignId: string }> }) ||
      {};
    const { id, campaignId } = await params;
    const { userId } = await requireAuth(request);

    const logs = await emailService.getCampaignEmailLogs(
      userId,
      id,
      campaignId,
    );

    return NextResponse.json({ data: logs });
  },
);
