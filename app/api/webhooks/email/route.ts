import { NextResponse } from "next/server";
import { withErrorHandling } from "@/lib/api/route-handler";
import { emailWebhookEventSchema } from "@/schemas/email";
import { emailService } from "@/services/email-service";

export const POST = withErrorHandling(async (request: Request) => {
  const body = await request.json();
  const input = emailWebhookEventSchema.parse(body);

  const result = await emailService.handleWebhookEvent(input);

  return NextResponse.json({ data: result });
});
