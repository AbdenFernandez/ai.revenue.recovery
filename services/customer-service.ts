import { AppError } from "@/lib/errors";
import { assertRole, assertTenantAccess } from "@/lib/auth/authorization";
import { memberRepository } from "@/repositories/member-repository";
import { customerRepository } from "@/repositories/customer-repository";
import { parseCsv, formatCsv } from "@/lib/csv/csv-parser";
import { suggestMapping, validateAndTransformRows } from "@/lib/csv/csv-mapper";
import type {
  Customer,
  CustomerFilters,
  CustomerStats,
  ImportExecutionResult,
  ImportPreviewResult,
  CsvColumnMapping,
} from "@/types/customer";
import type { PaginatedResult } from "@/types";
import {
  createCustomerSchema,
  updateCustomerSchema,
  type CreateCustomerInput,
  type UpdateCustomerInput,
  type CustomerQueryInput,
} from "@/schemas/customer";

export class CustomerService {
  async listCustomers(
    userId: string,
    businessId: string,
    query: Partial<CustomerQueryInput> = {},
  ): Promise<PaginatedResult<Customer>> {

    const userMemberships = await memberRepository.findByUserId(userId);
    assertTenantAccess(userMemberships, businessId);

    const { page = 1, pageSize = 20, ...filters } = query;

    return customerRepository.list(
      businessId,
      filters as CustomerFilters,
      page,
      pageSize,
    );
  }

  async getCustomer(
    userId: string,
    businessId: string,
    customerId: string,
  ): Promise<Customer> {
    const userMemberships = await memberRepository.findByUserId(userId);
    assertTenantAccess(userMemberships, businessId);

    const customer = await customerRepository.findById(businessId, customerId);
    if (!customer) {
      throw new AppError({
        code: "NOT_FOUND",
        message: "Customer record not found.",
      });
    }

    return customer;
  }

  async createCustomer(
    userId: string,
    businessId: string,
    input: CreateCustomerInput,
  ): Promise<Customer> {
    const userMemberships = await memberRepository.findByUserId(userId);
    assertTenantAccess(userMemberships, businessId);

    const parsed = createCustomerSchema.parse(input);

    const existing = await customerRepository.findByEmail(
      businessId,
      parsed.email,
    );
    if (existing) {
      throw new AppError({
        code: "CONFLICT",
        message: `A customer with email "${parsed.email}" already exists in this workspace.`,
      });
    }

    return customerRepository.create(businessId, parsed);
  }

  async updateCustomer(
    userId: string,
    businessId: string,
    customerId: string,
    input: UpdateCustomerInput,
  ): Promise<Customer> {
    const userMemberships = await memberRepository.findByUserId(userId);
    assertTenantAccess(userMemberships, businessId);

    const parsed = updateCustomerSchema.parse(input);

    const existing = await customerRepository.findById(businessId, customerId);
    if (!existing) {
      throw new AppError({
        code: "NOT_FOUND",
        message: "Customer record not found.",
      });
    }

    if (parsed.email && parsed.email.toLowerCase() !== existing.email.toLowerCase()) {
      const emailConflict = await customerRepository.findByEmail(
        businessId,
        parsed.email,
      );
      if (emailConflict && emailConflict.id !== customerId) {
        throw new AppError({
          code: "CONFLICT",
          message: `Email "${parsed.email}" is already used by another customer in this workspace.`,
        });
      }
    }

    const updated = await customerRepository.update(businessId, customerId, parsed);
    if (!updated) {
      throw new AppError({
        code: "NOT_FOUND",
        message: "Failed to update customer.",
      });
    }

    return updated;
  }


  async deleteCustomer(
    userId: string,
    businessId: string,
    customerId: string,
  ): Promise<void> {
    const userMemberships = await memberRepository.findByUserId(userId);
    // Role safeguard: Only ADMIN and OWNER can delete customer records
    assertRole(userMemberships, businessId, "ADMIN");

    const deleted = await customerRepository.delete(businessId, customerId);
    if (!deleted) {
      throw new AppError({
        code: "NOT_FOUND",
        message: "Customer record not found.",
      });
    }
  }

  async getCustomerStats(
    userId: string,
    businessId: string,
  ): Promise<CustomerStats> {
    const userMemberships = await memberRepository.findByUserId(userId);
    assertTenantAccess(userMemberships, businessId);

    return customerRepository.getStats(businessId);
  }

  async previewCsvImport(
    userId: string,
    businessId: string,
    csvText: string,
    customMapping?: CsvColumnMapping,
  ): Promise<ImportPreviewResult> {
    const userMemberships = await memberRepository.findByUserId(userId);
    assertTenantAccess(userMemberships, businessId);

    const { headers, rows } = parseCsv(csvText);
    if (headers.length === 0 || rows.length === 0) {
      throw new AppError({
        code: "VALIDATION_ERROR",
        message: "CSV file is empty or missing headers.",
      });
    }

    const mapping = customMapping || suggestMapping(headers);
    const existingEmails = await customerRepository.getAllEmails(businessId);

    return validateAndTransformRows(rows, headers, mapping, existingEmails);
  }

  async executeCsvImport(
    userId: string,
    businessId: string,
    rows: CreateCustomerInput[],
  ): Promise<ImportExecutionResult> {
    const userMemberships = await memberRepository.findByUserId(userId);
    assertTenantAccess(userMemberships, businessId);

    if (!rows || rows.length === 0) {
      throw new AppError({
        code: "VALIDATION_ERROR",
        message: "No valid rows provided for import.",
      });
    }

    // Filter out any duplicates that might have been created concurrently
    const existingEmails = await customerRepository.getAllEmails(businessId);
    const dedupedRows = rows.filter((r) => !existingEmails.has(r.email.toLowerCase()));

    const importedCount = await customerRepository.bulkCreate(
      businessId,
      dedupedRows,
    );
    const skippedCount = rows.length - dedupedRows.length;

    return {
      importedCount,
      skippedCount,
      message: `Successfully imported ${importedCount} customer records${
        skippedCount > 0 ? ` (${skippedCount} duplicates skipped)` : ""
      }.`,
    };
  }

  async exportCustomersCsv(
    userId: string,
    businessId: string,
    filters: CustomerFilters = {},
  ): Promise<string> {
    const userMemberships = await memberRepository.findByUserId(userId);
    assertTenantAccess(userMemberships, businessId);

    // Fetch all matching customers (up to 5000 records for export)
    const result = await customerRepository.list(businessId, filters, 1, 5000);

    const columns = [
      { key: "name" as const, header: "Customer Name" },
      { key: "email" as const, header: "Email Address" },
      { key: "phone" as const, header: "Phone" },
      { key: "company" as const, header: "Company" },
      { key: "totalPurchaseAmount" as const, header: "Total Spent" },
      { key: "purchaseCount" as const, header: "Orders Count" },
      { key: "averageOrderValue" as const, header: "Average Order Value" },
      { key: "serviceType" as const, header: "Service Type" },
      { key: "customerStatus" as const, header: "Status" },
      { key: "lastPurchaseDate" as const, header: "Last Purchase Date" },
      { key: "optOutStatus" as const, header: "Opt Out" },
    ];

    return formatCsv(result.items as unknown as Record<string, unknown>[], columns);
  }
}


export const customerService = new CustomerService();
