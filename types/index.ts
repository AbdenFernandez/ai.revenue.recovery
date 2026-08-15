export * from "./auth";
export * from "./customer";
export * from "./intelligence";
export * from "./ai";
export * from "./campaign";




export type TenantId = string;

export type UserId = string;

export interface Timestamps {
  createdAt: string;
  updatedAt: string;
}

export interface TenantScoped {
  tenantId: TenantId;
}

export interface ApiSuccessResponse<T> {
  data: T;
}

export interface PaginatedResult<T> {
  items: T[];
  page: number;
  pageSize: number;
  total: number;
}

