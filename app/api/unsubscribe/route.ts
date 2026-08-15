import { NextResponse } from "next/server";
import { withErrorHandling } from "@/lib/api/route-handler";
import { unsubscribeRequestSchema } from "@/schemas/email";
import { emailService } from "@/services/email-service";

export const POST = withErrorHandling(async (request: Request) => {
  const body = await request.json();
  const input = unsubscribeRequestSchema.parse(body);

  const result = await emailService.processUnsubscribe(input.token);


  return NextResponse.json({
    data: result,
    message: "You have been successfully unsubscribed.",
  });
});
