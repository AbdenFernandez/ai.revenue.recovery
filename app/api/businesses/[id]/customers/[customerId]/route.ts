import { NextResponse } from "next/server";
import { withErrorHandling } from "@/lib/api/route-handler";
import { requireAuth } from "@/lib/auth/session";
import { updateCustomerSchema } from "@/schemas/customer";
import { customerService } from "@/services/customer-service";

export const GET = withErrorHandling(
  async (request: Request, context?: unknown) => {
    const { params } =
      (context as { params: Promise<{ id: string; customerId: string }> }) || {};
    const { id, customerId } = await params;
    const { userId } = await requireAuth(request);

    const customer = await customerService.getCustomer(userId, id, customerId);

    return NextResponse.json({ data: customer });
  },
);

export const PATCH = withErrorHandling(
  async (request: Request, context?: unknown) => {
    const { params } =
      (context as { params: Promise<{ id: string; customerId: string }> }) || {};
    const { id, customerId } = await params;
    const { userId } = await requireAuth(request);
    const body: unknown = await request.json();
    const parsed = updateCustomerSchema.parse(body);

    const updated = await customerService.updateCustomer(
      userId,
      id,
      customerId,
      parsed,
    );

    return NextResponse.json({ data: updated });
  },
);

export const DELETE = withErrorHandling(
  async (request: Request, context?: unknown) => {
    const { params } =
      (context as { params: Promise<{ id: string; customerId: string }> }) || {};
    const { id, customerId } = await params;
    const { userId } = await requireAuth(request);

    await customerService.deleteCustomer(userId, id, customerId);

    return NextResponse.json({ message: "Customer deleted successfully." });
  },
);
