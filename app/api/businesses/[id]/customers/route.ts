import { NextResponse } from "next/server";
import { withErrorHandling } from "@/lib/api/route-handler";
import { requireAuth } from "@/lib/auth/session";
import { createCustomerSchema, customerQuerySchema } from "@/schemas/customer";
import { customerService } from "@/services/customer-service";

export const GET = withErrorHandling(
  async (request: Request, context?: unknown) => {
    const { params } = (context as { params: Promise<{ id: string }> }) || {};
    const { id } = await params;
    const { userId } = await requireAuth(request);

    const url = new URL(request.url);
    const searchParams = Object.fromEntries(url.searchParams.entries());
    const query = customerQuerySchema.parse(searchParams);

    const result = await customerService.listCustomers(userId, id, query);

    return NextResponse.json({ data: result });
  },
);

export const POST = withErrorHandling(
  async (request: Request, context?: unknown) => {
    const { params } = (context as { params: Promise<{ id: string }> }) || {};
    const { id } = await params;
    const { userId } = await requireAuth(request);

    const body: unknown = await request.json();
    const parsed = createCustomerSchema.parse(body);

    const customer = await customerService.createCustomer(userId, id, parsed);

    return NextResponse.json({ data: customer }, { status: 201 });
  },
);
