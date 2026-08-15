import type {
  Customer,
  CustomerFilters,
  CustomerStats,
  CustomerStatus,
} from "@/types/customer";
import type { PaginatedResult } from "@/types";

export class CustomerRepository {
  private static mockStore: Map<string, Customer> = new Map();

  static setMock(id: string, customer: Customer) {
    this.mockStore.set(id, customer);
  }

  static clearMocks() {
    this.mockStore.clear();
  }

  clearMocks() {
    CustomerRepository.clearMocks();
  }

  async list(
    businessId: string,
    filters: CustomerFilters = {},
    page = 1,
    pageSize = 20,
  ): Promise<PaginatedResult<Customer>> {
    let list = Array.from(CustomerRepository.mockStore.values()).filter(
      (c) => c.businessId === businessId,
    );

    // 1. Text Search
    if (filters.search) {
      const q = filters.search.toLowerCase().trim();
      list = list.filter(
        (c) =>
          c.name.toLowerCase().includes(q) ||
          c.email.toLowerCase().includes(q) ||
          (c.company && c.company.toLowerCase().includes(q)) ||
          (c.phone && c.phone.includes(q)) ||
          (c.serviceType && c.serviceType.toLowerCase().includes(q)),
      );
    }

    // 2. Status filter
    if (filters.status && filters.status !== "all") {
      list = list.filter((c) => c.customerStatus === filters.status);
    }

    // 3. Service type filter
    if (filters.serviceType) {
      const st = filters.serviceType.toLowerCase();
      list = list.filter(
        (c) => c.serviceType && c.serviceType.toLowerCase() === st,
      );
    }

    // 4. Amount range filter
    if (filters.minAmount !== undefined) {
      list = list.filter((c) => c.totalPurchaseAmount >= filters.minAmount!);
    }
    if (filters.maxAmount !== undefined) {
      list = list.filter((c) => c.totalPurchaseAmount <= filters.maxAmount!);
    }

    // 5. Opt-out filter
    if (filters.optOut !== undefined) {
      list = list.filter((c) => c.optOutStatus === filters.optOut);
    }

    // 6. Date range filter
    if (filters.startDate) {
      const start = new Date(filters.startDate).getTime();
      list = list.filter(
        (c) => c.lastPurchaseDate && new Date(c.lastPurchaseDate).getTime() >= start,
      );
    }
    if (filters.endDate) {
      const end = new Date(filters.endDate).getTime();
      list = list.filter(
        (c) => c.lastPurchaseDate && new Date(c.lastPurchaseDate).getTime() <= end,
      );
    }

    // 7. Sorting
    const sortBy = filters.sortBy || "createdAt";
    const sortOrder = filters.sortOrder || "desc";

    list.sort((a, b) => {
      const valA = a[sortBy] ?? "";
      const valB = b[sortBy] ?? "";

      if (typeof valA === "number" && typeof valB === "number") {

        return sortOrder === "asc" ? valA - valB : valB - valA;
      }

      const strA = String(valA).toLowerCase();
      const strB = String(valB).toLowerCase();
      if (strA < strB) return sortOrder === "asc" ? -1 : 1;
      if (strA > strB) return sortOrder === "asc" ? 1 : -1;
      return 0;
    });

    const total = list.length;
    const startIndex = (page - 1) * pageSize;
    const items = list.slice(startIndex, startIndex + pageSize);

    return {
      items: items.map((c) => ({ ...c })),
      page,
      pageSize,
      total,
    };
  }

  async findById(businessId: string, customerId: string): Promise<Customer | null> {
    const customer = CustomerRepository.mockStore.get(customerId);
    if (!customer || customer.businessId !== businessId) {
      return null;
    }
    return { ...customer };
  }

  async findByEmail(businessId: string, email: string): Promise<Customer | null> {
    const normalized = email.toLowerCase().trim();
    for (const customer of CustomerRepository.mockStore.values()) {
      if (
        customer.businessId === businessId &&
        customer.email.toLowerCase() === normalized
      ) {
        return { ...customer };
      }
    }
    return null;
  }

  async getAllEmails(businessId: string): Promise<Set<string>> {
    const emails = new Set<string>();
    for (const customer of CustomerRepository.mockStore.values()) {
      if (customer.businessId === businessId) {
        emails.add(customer.email.toLowerCase());
      }
    }
    return emails;
  }

  async create(
    businessId: string,
    data: {
      name: string;
      email: string;
      phone?: string | null;
      company?: string | null;
      lastPurchaseDate?: string | null;
      totalPurchaseAmount?: number;
      purchaseCount?: number;
      serviceType?: string | null;
      customerStatus?: CustomerStatus;
      consentStatus?: boolean;
      optOutStatus?: boolean;
    },
  ): Promise<Customer> {
    const id = crypto.randomUUID();
    const now = new Date().toISOString();
    const totalAmount = data.totalPurchaseAmount ?? 0;
    const purchaseCount = data.purchaseCount ?? 0;
    const aov =
      purchaseCount > 0 ? Math.round((totalAmount / purchaseCount) * 100) / 100 : 0;

    const customer: Customer = {
      id,
      businessId,
      name: data.name.trim(),
      email: data.email.toLowerCase().trim(),
      phone: data.phone?.trim() ?? null,
      company: data.company?.trim() ?? null,
      lastPurchaseDate: data.lastPurchaseDate ?? null,
      totalPurchaseAmount: totalAmount,
      purchaseCount,
      averageOrderValue: aov,
      lastContactDate: null,
      serviceType: data.serviceType?.trim() ?? null,
      customerStatus: data.customerStatus ?? "active",
      consentStatus: data.consentStatus ?? true,
      optOutStatus: data.optOutStatus ?? false,
      createdAt: now,
      updatedAt: now,
    };

    CustomerRepository.mockStore.set(id, customer);
    return { ...customer };
  }

  async update(
    businessId: string,
    customerId: string,
    data: Partial<{
      name: string;
      email: string;
      phone: string | null;
      company: string | null;
      lastPurchaseDate: string | null;
      totalPurchaseAmount: number;
      purchaseCount: number;
      serviceType: string | null;
      customerStatus: CustomerStatus;
      consentStatus: boolean;
      optOutStatus: boolean;
      lastContactDate: string | null;
    }>,
  ): Promise<Customer | null> {
    const existing = await this.findById(businessId, customerId);
    if (!existing) return null;

    const totalAmount =
      data.totalPurchaseAmount !== undefined
        ? data.totalPurchaseAmount
        : existing.totalPurchaseAmount;
    const purchaseCount =
      data.purchaseCount !== undefined
        ? data.purchaseCount
        : existing.purchaseCount;
    const aov =
      purchaseCount > 0 ? Math.round((totalAmount / purchaseCount) * 100) / 100 : 0;

    const updated: Customer = {
      ...existing,
      ...(data.name !== undefined ? { name: data.name.trim() } : {}),
      ...(data.email !== undefined
        ? { email: data.email.toLowerCase().trim() }
        : {}),
      ...(data.phone !== undefined ? { phone: data.phone } : {}),
      ...(data.company !== undefined ? { company: data.company } : {}),
      ...(data.lastPurchaseDate !== undefined
        ? { lastPurchaseDate: data.lastPurchaseDate }
        : {}),
      totalPurchaseAmount: totalAmount,
      purchaseCount,
      averageOrderValue: aov,
      ...(data.serviceType !== undefined
        ? { serviceType: data.serviceType }
        : {}),
      ...(data.customerStatus !== undefined
        ? { customerStatus: data.customerStatus }
        : {}),
      ...(data.consentStatus !== undefined
        ? { consentStatus: data.consentStatus }
        : {}),
      ...(data.optOutStatus !== undefined
        ? { optOutStatus: data.optOutStatus }
        : {}),
      ...(data.lastContactDate !== undefined
        ? { lastContactDate: data.lastContactDate }
        : {}),
      updatedAt: new Date().toISOString(),
    };

    CustomerRepository.mockStore.set(customerId, updated);
    return { ...updated };
  }

  async delete(businessId: string, customerId: string): Promise<boolean> {
    const customer = CustomerRepository.mockStore.get(customerId);
    if (!customer || customer.businessId !== businessId) {
      return false;
    }
    return CustomerRepository.mockStore.delete(customerId);
  }

  async bulkCreate(
    businessId: string,
    customersData: Array<{
      name: string;
      email: string;
      phone?: string | null;
      company?: string | null;
      lastPurchaseDate?: string | null;
      totalPurchaseAmount?: number;
      purchaseCount?: number;
      serviceType?: string | null;
      customerStatus?: CustomerStatus;
      consentStatus?: boolean;
      optOutStatus?: boolean;
    }>,
  ): Promise<number> {
    const now = new Date().toISOString();
    let count = 0;

    for (const data of customersData) {
      const id = crypto.randomUUID();
      const totalAmount = data.totalPurchaseAmount ?? 0;
      const purchaseCount = data.purchaseCount ?? 0;
      const aov =
        purchaseCount > 0
          ? Math.round((totalAmount / purchaseCount) * 100) / 100
          : 0;

      const customer: Customer = {
        id,
        businessId,
        name: data.name.trim(),
        email: data.email.toLowerCase().trim(),
        phone: data.phone?.trim() ?? null,
        company: data.company?.trim() ?? null,
        lastPurchaseDate: data.lastPurchaseDate ?? null,
        totalPurchaseAmount: totalAmount,
        purchaseCount,
        averageOrderValue: aov,
        lastContactDate: null,
        serviceType: data.serviceType?.trim() ?? null,
        customerStatus: data.customerStatus ?? "active",
        consentStatus: data.consentStatus ?? true,
        optOutStatus: data.optOutStatus ?? false,
        createdAt: now,
        updatedAt: now,
      };

      CustomerRepository.mockStore.set(id, customer);
      count++;
    }

    return count;
  }

  async getStats(businessId: string): Promise<CustomerStats> {
    const customers = Array.from(CustomerRepository.mockStore.values()).filter(
      (c) => c.businessId === businessId,
    );

    let activeCount = 0;
    let inactiveCount = 0;
    let lostCount = 0;
    let churnedCount = 0;
    let recoveredCount = 0;
    let totalRevenue = 0;

    for (const c of customers) {
      totalRevenue += c.totalPurchaseAmount;
      switch (c.customerStatus) {
        case "active":
          activeCount++;
          break;
        case "inactive":
          inactiveCount++;
          break;
        case "lost":
          lostCount++;
          break;
        case "churned":
          churnedCount++;
          break;
        case "recovered":
          recoveredCount++;
          break;
      }
    }

    const totalCustomers = customers.length;
    const averageLtv =
      totalCustomers > 0
        ? Math.round((totalRevenue / totalCustomers) * 100) / 100
        : 0;

    return {
      totalCustomers,
      activeCount,
      inactiveCount,
      lostCount,
      churnedCount,
      recoveredCount,
      totalRevenue: Math.round(totalRevenue * 100) / 100,
      averageLtv,
    };
  }
}

export const customerRepository = new CustomerRepository();
