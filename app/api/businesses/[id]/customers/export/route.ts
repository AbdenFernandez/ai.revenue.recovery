import { NextResponse } from "next/server";
import { withErrorHandling } from "@/lib/api/route-handler";
import { requireAuth } from "@/lib/auth/session";
import { customerQuerySchema } from "@/schemas/customer";
import { customerService } from "@/services/customer-service";
import type { CustomerFilters } from "@/types/customer";

export const GET = withErrorHandling(
  async (request: Request, context?: unknown) => {
    const { params } = (context as { params: Promise<{ id: string }> }) || {};
    const { id } = await params;
    const { userId } = await requireAuth(request);

    const url = new URL(request.url);
    const searchParams = Object.fromEntries(url.searchParams.entries());
    const query = customerQuerySchema.parse(searchParams);

    const csvContent = await customerService.exportCustomersCsv(
      userId,
      id,
      query as CustomerFilters,
    );

    return new NextResponse(csvContent, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="customers_${id}_${new Date()
          .toISOString()
          .slice(0, 10)}.csv"`,
      },
    });
  },
);
