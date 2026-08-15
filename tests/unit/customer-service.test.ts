import { beforeEach, describe, expect, it } from "vitest";
import { customerService } from "@/services/customer-service";
import { customerRepository } from "@/repositories/customer-repository";
import { MemberRepository, memberRepository } from "@/repositories/member-repository";
import { BusinessRepository, businessRepository } from "@/repositories/business-repository";
import { AppError } from "@/lib/errors";


describe("CustomerService & Tenant Isolation", () => {
  const userOwnerA = "user-owner-a";
  const userMemberA = "user-member-a";
  const userOwnerB = "user-owner-b";

  const businessA = "biz-alpha";
  const businessB = "biz-beta";

  beforeEach(() => {
    customerRepository.clearMocks();
    memberRepository.clearMocks();
    businessRepository.clearMocks();

    // Setup Business A
    BusinessRepository.setMock(businessA, {
      id: businessA,
      name: "Alpha Corp",
      slug: "alpha",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
    MemberRepository.setMock("m-1", {
      id: "m-1",
      businessId: businessA,
      userId: userOwnerA,
      role: "OWNER",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
    MemberRepository.setMock("m-2", {
      id: "m-2",
      businessId: businessA,
      userId: userMemberA,
      role: "MEMBER",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    // Setup Business B
    BusinessRepository.setMock(businessB, {
      id: businessB,
      name: "Beta Corp",
      slug: "beta",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
    MemberRepository.setMock("m-3", {
      id: "m-3",
      businessId: businessB,
      userId: userOwnerB,
      role: "OWNER",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
  });


  it("creates, reads, updates, and calculates AOV for a customer", async () => {
    const created = await customerService.createCustomer(
      userOwnerA,
      businessA,
      {
        name: "Alice Johnson",
        email: "alice@alpha.com",
        phone: "555-0101",
        company: "Acme",
        totalPurchaseAmount: 900,
        purchaseCount: 3,
      },
    );

    expect(created.id).toBeDefined();
    expect(created.name).toBe("Alice Johnson");
    expect(created.averageOrderValue).toBe(300); // 900 / 3

    // Read
    const fetched = await customerService.getCustomer(
      userOwnerA,
      businessA,
      created.id,
    );
    expect(fetched.email).toBe("alice@alpha.com");

    // Update
    const updated = await customerService.updateCustomer(
      userOwnerA,
      businessA,
      created.id,
      {
        totalPurchaseAmount: 1200,
        purchaseCount: 4,
      },
    );
    expect(updated.averageOrderValue).toBe(300); // 1200 / 4
    expect(updated.totalPurchaseAmount).toBe(1200);
  });

  it("prevents duplicate email within the same tenant, but allows across tenants", async () => {
    await customerService.createCustomer(userOwnerA, businessA, {
      name: "Alice Alpha",
      email: "common@client.com",
    });

    // Duplicate in Business A should throw CONFLICT (409)
    await expect(
      customerService.createCustomer(userOwnerA, businessA, {
        name: "Alice Duplicate",
        email: "common@client.com",
      }),
    ).rejects.toThrowError(AppError);

    // Same email in Business B is completely permitted
    const customerB = await customerService.createCustomer(
      userOwnerB,
      businessB,
      {
        name: "Alice Beta",
        email: "common@client.com",
      },
    );
    expect(customerB.businessId).toBe(businessB);
  });

  it("prevents updating a customer to an email already taken by another customer in the same tenant", async () => {
    const cust1 = await customerService.createCustomer(userOwnerA, businessA, {
      name: "Customer 1",
      email: "cust1@alpha.com",
    });

    await customerService.createCustomer(userOwnerA, businessA, {
      name: "Customer 2",
      email: "cust2@alpha.com",
    });

    // Attempting to update cust1 email to cust2 email should throw CONFLICT (409)
    await expect(
      customerService.updateCustomer(userOwnerA, businessA, cust1.id, {
        email: "cust2@alpha.com",
      }),
    ).rejects.toThrowError(AppError);

    // Updating cust1 without changing email should succeed
    await expect(
      customerService.updateCustomer(userOwnerA, businessA, cust1.id, {
        name: "Customer 1 Renamed",
        email: "cust1@alpha.com",
      }),
    ).resolves.toBeDefined();
  });


  it("strictly enforces tenant isolation: User in Biz B cannot access Biz A customer", async () => {
    const customerA = await customerService.createCustomer(
      userOwnerA,
      businessA,
      {
        name: "Secret Client A",
        email: "secret@alpha.com",
      },
    );

    // User Owner B attempting to read customer A should throw FORBIDDEN
    await expect(
      customerService.getCustomer(userOwnerB, businessA, customerA.id),
    ).rejects.toThrowError(AppError);

    // User Owner B attempting to query Biz A using their own tenant ID should return 404
    await expect(
      customerService.getCustomer(userOwnerB, businessB, customerA.id),
    ).rejects.toThrowError(AppError);
  });

  it("enforces RBAC deletion safeguard: MEMBER cannot delete customer, OWNER can", async () => {
    const customer = await customerService.createCustomer(
      userOwnerA,
      businessA,
      {
        name: "Doomed Client",
        email: "doomed@alpha.com",
      },
    );

    // Member attempts delete -> throws FORBIDDEN (403)
    await expect(
      customerService.deleteCustomer(userMemberA, businessA, customer.id),
    ).rejects.toThrowError(AppError);

    // Owner attempts delete -> succeeds
    await expect(
      customerService.deleteCustomer(userOwnerA, businessA, customer.id),
    ).resolves.toBeUndefined();

    // Verify deleted
    await expect(
      customerService.getCustomer(userOwnerA, businessA, customer.id),
    ).rejects.toThrowError(AppError);
  });

  it("previews and executes CSV bulk import with duplicate detection", async () => {
    // Seed an existing customer in Business A
    await customerService.createCustomer(userOwnerA, businessA, {
      name: "Existing Client",
      email: "existing@alpha.com",
    });

    const csvText = `Name,Email,Amount,Orders\nDavid New,david@alpha.com,400,2\nExisting Client,existing@alpha.com,200,1\nMalformed Row,not-an-email,100,1`;

    const preview = await customerService.previewCsvImport(
      userOwnerA,
      businessA,
      csvText,
    );

    expect(preview.summary.total).toBe(3);
    expect(preview.summary.valid).toBe(1);
    expect(preview.summary.duplicates).toBe(1);
    expect(preview.summary.invalid).toBe(1);

    // Execute bulk import with valid rows
    const execution = await customerService.executeCsvImport(
      userOwnerA,
      businessA,
      preview.validRows.map((r) => r.parsed!),
    );

    expect(execution.importedCount).toBe(1);

    // Verify imported customer exists in DB
    const list = await customerService.listCustomers(userOwnerA, businessA);
    expect(list.items.some((c) => c.email === "david@alpha.com")).toBe(true);
  });

  it("exports customer data as filtered RFC 4180 CSV", async () => {
    await customerService.createCustomer(userOwnerA, businessA, {
      name: "Export Client 1",
      email: "export1@alpha.com",
      totalPurchaseAmount: 500,
      purchaseCount: 2,
    });

    const csv = await customerService.exportCustomersCsv(
      userOwnerA,
      businessA,
    );

    expect(csv).toContain("Customer Name,Email Address,Phone");
    expect(csv).toContain("Export Client 1,export1@alpha.com");
  });
});
