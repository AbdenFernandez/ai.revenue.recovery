export type CustomerStatus =
  | "active"
  | "inactive"
  | "lost"
  | "churned"
  | "recovered";

export interface Customer {
  id: string;
  businessId: string;
  name: string;
  email: string;
  phone: string | null;
  company: string | null;
  lastPurchaseDate: string | null;
  totalPurchaseAmount: number;
  purchaseCount: number;
  averageOrderValue: number;
  lastContactDate: string | null;
  serviceType: string | null;
  customerStatus: CustomerStatus;
  consentStatus: boolean;
  optOutStatus: boolean;
  createdAt: string;
  updatedAt: string;
}

export type CustomerSortField =
  | "name"
  | "email"
  | "company"
  | "totalPurchaseAmount"
  | "purchaseCount"
  | "averageOrderValue"
  | "lastPurchaseDate"
  | "createdAt";

export type SortOrder = "asc" | "desc";

export interface CustomerFilters {
  search?: string;
  status?: CustomerStatus | "all";
  serviceType?: string;
  minAmount?: number;
  maxAmount?: number;
  optOut?: boolean;
  startDate?: string;
  endDate?: string;
  sortBy?: CustomerSortField;
  sortOrder?: SortOrder;
}

export interface CustomerStats {
  totalCustomers: number;
  activeCount: number;
  inactiveCount: number;
  lostCount: number;
  churnedCount: number;
  recoveredCount: number;
  totalRevenue: number;
  averageLtv: number;
}

export type CsvTargetField =
  | "name"
  | "email"
  | "phone"
  | "company"
  | "lastPurchaseDate"
  | "totalPurchaseAmount"
  | "purchaseCount"
  | "serviceType"
  | "customerStatus"
  | "consentStatus"
  | "optOutStatus";

export type CsvColumnMapping = Record<string, CsvTargetField | "skip">;

export interface ImportValidationRow {
  rowNumber: number;
  raw: Record<string, string>;
  parsed?: {
    name: string;
    email: string;
    phone?: string | null;
    company?: string | null;
    lastPurchaseDate?: string | null;
    totalPurchaseAmount: number;
    purchaseCount: number;
    averageOrderValue: number;
    serviceType?: string | null;
    customerStatus: CustomerStatus;
    consentStatus: boolean;
    optOutStatus: boolean;
  };
  status: "valid" | "invalid" | "duplicate";
  errors: string[];
}

export interface ImportPreviewResult {
  headers: string[];
  suggestedMapping: CsvColumnMapping;
  totalRows: number;
  validRows: ImportValidationRow[];
  invalidRows: ImportValidationRow[];
  duplicateRows: ImportValidationRow[];
  summary: {
    total: number;
    valid: number;
    invalid: number;
    duplicates: number;
  };
}

export interface ImportExecutionResult {
  importedCount: number;
  skippedCount: number;
  message: string;
}
