import { NextResponse } from "next/server";
import { withErrorHandling } from "@/lib/api/route-handler";
import { requireAuth } from "@/lib/auth/session";
import { executeImportSchema } from "@/schemas/customer";
import { customerService } from "@/services/customer-service";

export const POST = withErrorHandling(
  async (request: Request, context?: unknown) => {
    const { params } = (context as { params: Promise<{ id: string }> }) || {};
    const { id } = await params;
    const { userId } = await requireAuth(request);

    const body: unknown = await request.json();
    const parsed = executeImportSchema.parse(body);

    const result = await customerService.executeCsvImport(
      userId,
      id,
      parsed.rows,
    );

    return NextResponse.json({ data: result }, { status: 201 });
  },
);
