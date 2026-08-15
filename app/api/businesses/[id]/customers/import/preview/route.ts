import { NextResponse } from "next/server";
import { withErrorHandling } from "@/lib/api/route-handler";
import { requireAuth } from "@/lib/auth/session";
import { previewImportSchema } from "@/schemas/customer";
import { customerService } from "@/services/customer-service";
import type { CsvColumnMapping } from "@/types/customer";

export const POST = withErrorHandling(
  async (request: Request, context?: unknown) => {
    const { params } = (context as { params: Promise<{ id: string }> }) || {};
    const { id } = await params;
    const { userId } = await requireAuth(request);

    const body: unknown = await request.json();
    const parsed = previewImportSchema.parse(body);

    const preview = await customerService.previewCsvImport(
      userId,
      id,
      parsed.csvText,
      parsed.mapping as CsvColumnMapping | undefined,
    );

    return NextResponse.json({ data: preview });
  },
);
