"use client";

import { useState } from "react";
import Link from "next/link";
import { useAuth } from "@/hooks/use-auth";
import { useBusiness } from "@/hooks/use-business";
import { useCustomers } from "@/hooks/use-customers";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Modal } from "@/components/ui/modal";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import type {
  CustomerStatus,
  CustomerSortField,
  SortOrder,
  CsvTargetField,
  CsvColumnMapping,
  ImportPreviewResult,
} from "@/types/customer";
import type { CreateCustomerInput } from "@/schemas/customer";

export default function CustomersPage() {
  const { activeBusinessId } = useAuth();
  const { role: myRole } = useBusiness(activeBusinessId);
  const {
    customers,
    stats,
    total,
    page,
    totalPages,
    filters,

    isLoading,
    error,
    setPage,
    setFilters,
    createCustomer,
    previewImport,
    executeImport,
    exportCsvUrl,
  } = useCustomers(activeBusinessId);

  // Add Customer Modal State
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [newName, setNewName] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [newPhone, setNewPhone] = useState("");
  const [newCompany, setNewCompany] = useState("");
  const [newTotalAmount, setNewTotalAmount] = useState(0);
  const [newPurchaseCount, setNewPurchaseCount] = useState(0);
  const [newServiceType, setNewServiceType] = useState("");
  const [newStatus, setNewStatus] = useState<CustomerStatus>("active");
  const [isSubmittingAdd, setIsSubmittingAdd] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);

  // CSV Import Modal State
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [csvRawText, setCsvRawText] = useState("");
  const [importStep, setImportStep] = useState<1 | 2 | 3>(1); // 1: Input, 2: Column Mapping, 3: Validation Preview
  const [previewResult, setPreviewResult] = useState<ImportPreviewResult | null>(
    null,
  );
  const [columnMapping, setColumnMapping] = useState<CsvColumnMapping>({});
  const [isProcessingImport, setIsProcessingImport] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);
  const [importSuccessMessage, setImportSuccessMessage] = useState<string | null>(
    null,
  );

  const canEdit = myRole === "OWNER" || myRole === "ADMIN";

  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmittingAdd(true);
    setAddError(null);
    try {
      await createCustomer({
        name: newName,
        email: newEmail,
        phone: newPhone || undefined,
        company: newCompany || undefined,
        totalPurchaseAmount: Number(newTotalAmount),
        purchaseCount: Number(newPurchaseCount),
        serviceType: newServiceType || undefined,
        customerStatus: newStatus,
      });
      setIsAddOpen(false);
      // Reset form
      setNewName("");
      setNewEmail("");
      setNewPhone("");
      setNewCompany("");
      setNewTotalAmount(0);
      setNewPurchaseCount(0);
      setNewServiceType("");
      setNewStatus("active");
    } catch (err: unknown) {
      setAddError(
        err instanceof Error ? err.message : "Failed to create customer.",
      );
    } finally {
      setIsSubmittingAdd(false);
    }
  };

  const handleCsvInputSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!csvRawText.trim()) return;

    setIsProcessingImport(true);
    setImportError(null);

    try {
      const preview = await previewImport(csvRawText);
      setPreviewResult(preview);
      setColumnMapping(preview.suggestedMapping);
      setImportStep(2);
    } catch (err: unknown) {
      setImportError(
        err instanceof Error ? err.message : "Failed to parse CSV file.",
      );
    } finally {
      setIsProcessingImport(false);
    }
  };

  const handleMappingConfirm = async () => {
    setIsProcessingImport(true);
    setImportError(null);
    try {
      const rePreview = await previewImport(csvRawText, columnMapping);
      setPreviewResult(rePreview);
      setImportStep(3);
    } catch (err: unknown) {
      setImportError(
        err instanceof Error ? err.message : "Failed to validate column mapping.",
      );
    } finally {
      setIsProcessingImport(false);
    }
  };

  const handleExecuteImport = async () => {
    if (!previewResult || previewResult.validRows.length === 0) return;

    setIsProcessingImport(true);
    setImportError(null);

    try {
      const rowsToImport: CreateCustomerInput[] = previewResult.validRows
        .filter((r) => r.parsed)
        .map((r) => ({
          name: r.parsed!.name,
          email: r.parsed!.email,
          phone: r.parsed!.phone ?? undefined,
          company: r.parsed!.company ?? undefined,
          lastPurchaseDate: r.parsed!.lastPurchaseDate ?? undefined,
          totalPurchaseAmount: r.parsed!.totalPurchaseAmount,
          purchaseCount: r.parsed!.purchaseCount,
          serviceType: r.parsed!.serviceType ?? undefined,
          customerStatus: r.parsed!.customerStatus,
          consentStatus: r.parsed!.consentStatus,
          optOutStatus: r.parsed!.optOutStatus,
        }));

      const res = await executeImport(rowsToImport);
      setImportSuccessMessage(res.message);
      setIsImportOpen(false);
      // Reset
      setCsvRawText("");
      setPreviewResult(null);
      setImportStep(1);
    } catch (err: unknown) {
      setImportError(
        err instanceof Error ? err.message : "Bulk import execution failed.",
      );
    } finally {
      setIsProcessingImport(false);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      setCsvRawText(text);
    };
    reader.readAsText(file);
  };

  return (
    <div className="space-y-6">
      {/* Header & Main Actions */}
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
            Customers & Activity
          </h1>
          <p className="text-sm text-zinc-500">
            Search, filter, analyze, and manage customer records for AI recovery campaigns.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <a href={exportCsvUrl} download>
            <Button variant="secondary" size="sm">
              📥 Export CSV
            </Button>
          </a>
          {canEdit ? (
            <>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => {
                  setImportError(null);
                  setImportStep(1);
                  setIsImportOpen(true);
                }}
              >
                📤 Import CSV
              </Button>
              <Button size="sm" onClick={() => setIsAddOpen(true)}>
                + Add Customer
              </Button>
            </>
          ) : null}
        </div>
      </div>

      {/* Notifications */}
      {importSuccessMessage ? (
        <Alert
          variant="success"
          title="Import Successful"
          className="cursor-pointer"
          onClick={() => setImportSuccessMessage(null)}
        >
          {importSuccessMessage} (Click to dismiss)
        </Alert>
      ) : null}
      {error ? <Alert variant="error">{error}</Alert> : null}

      {/* Summary KPI Cards */}
      {stats ? (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          <div className="rounded-lg border border-zinc-200 bg-white p-3 dark:border-zinc-800 dark:bg-zinc-900">
            <p className="text-xs font-medium text-zinc-500">Total Customers</p>
            <p className="mt-1 text-xl font-bold text-zinc-900 dark:text-zinc-100">
              {stats.totalCustomers}
            </p>
          </div>
          <div className="rounded-lg border border-zinc-200 bg-white p-3 dark:border-zinc-800 dark:bg-zinc-900">
            <p className="text-xs font-medium text-emerald-600">Active</p>
            <p className="mt-1 text-xl font-bold text-zinc-900 dark:text-zinc-100">
              {stats.activeCount}
            </p>
          </div>
          <div className="rounded-lg border border-zinc-200 bg-white p-3 dark:border-zinc-800 dark:bg-zinc-900">
            <p className="text-xs font-medium text-amber-600">Inactive</p>
            <p className="mt-1 text-xl font-bold text-zinc-900 dark:text-zinc-100">
              {stats.inactiveCount}
            </p>
          </div>
          <div className="rounded-lg border border-zinc-200 bg-white p-3 dark:border-zinc-800 dark:bg-zinc-900">
            <p className="text-xs font-medium text-red-600">Lost / Churned</p>
            <p className="mt-1 text-xl font-bold text-zinc-900 dark:text-zinc-100">
              {stats.lostCount + stats.churnedCount}
            </p>
          </div>
          <div className="rounded-lg border border-zinc-200 bg-white p-3 dark:border-zinc-800 dark:bg-zinc-900">
            <p className="text-xs font-medium text-blue-600">Total Revenue</p>
            <p className="mt-1 text-xl font-bold text-zinc-900 dark:text-zinc-100">
              ${stats.totalRevenue.toLocaleString()}
            </p>
          </div>
          <div className="rounded-lg border border-zinc-200 bg-white p-3 dark:border-zinc-800 dark:bg-zinc-900">
            <p className="text-xs font-medium text-zinc-500">Average LTV</p>
            <p className="mt-1 text-xl font-bold text-zinc-900 dark:text-zinc-100">
              ${stats.averageLtv.toLocaleString()}
            </p>
          </div>
        </div>
      ) : null}

      {/* Filter and Search Toolbar */}
      <Card title="Customer Filter & Search" description="Refine customer lists across parameters">
        <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-4">
          <Input
            id="customerSearch"
            label="Search"
            placeholder="Name, email, company, phone..."
            value={filters.search || ""}
            onChange={(e) => {
              setFilters((prev) => ({ ...prev, search: e.target.value }));
              setPage(1);
            }}
          />

          <Select
            id="statusFilter"
            label="Customer Status"
            value={filters.status || "all"}
            onChange={(e) => {
              setFilters((prev) => ({
                ...prev,
                status: e.target.value as CustomerStatus | "all",
              }));
              setPage(1);
            }}
            options={[
              { label: "All Statuses", value: "all" },
              { label: "Active", value: "active" },
              { label: "Inactive", value: "inactive" },
              { label: "Lost", value: "lost" },
              { label: "Churned", value: "churned" },
              { label: "Recovered", value: "recovered" },
            ]}
          />

          <Select
            id="sortBy"
            label="Sort By"
            value={filters.sortBy || "createdAt"}
            onChange={(e) => {
              setFilters((prev) => ({
                ...prev,
                sortBy: e.target.value as CustomerSortField,
              }));
            }}
            options={[
              { label: "Date Added", value: "createdAt" },
              { label: "Total Spent", value: "totalPurchaseAmount" },
              { label: "Order Count", value: "purchaseCount" },
              { label: "Average Order Value", value: "averageOrderValue" },
              { label: "Customer Name", value: "name" },
              { label: "Last Purchase", value: "lastPurchaseDate" },
            ]}
          />

          <Select
            id="sortOrder"
            label="Order"
            value={filters.sortOrder || "desc"}
            onChange={(e) => {
              setFilters((prev) => ({
                ...prev,
                sortOrder: e.target.value as SortOrder,
              }));
            }}
            options={[
              { label: "Descending", value: "desc" },
              { label: "Ascending", value: "asc" },
            ]}
          />
        </div>
      </Card>

      {/* Customer Data Table */}
      <Card
        title={`Customers (${total})`}
        description={`Showing page ${page} of ${totalPages}`}
      >
        {isLoading ? (
          <div className="py-12 text-center text-sm text-zinc-500">
            Loading customers...
          </div>
        ) : customers.length === 0 ? (
          <div className="py-12 text-center text-sm text-zinc-500">
            No customers found matching the search criteria.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-zinc-200 text-xs font-semibold uppercase text-zinc-500 dark:border-zinc-800">
                <tr>
                  <th className="py-3 pr-4">Customer</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Total Spent</th>
                  <th className="py-3 px-4 text-right">Orders</th>
                  <th className="py-3 px-4 text-right">AOV</th>
                  <th className="py-3 px-4">Last Purchase</th>
                  <th className="py-3 pl-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
                {customers.map((c) => (
                  <tr key={c.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/50">
                    <td className="py-3 pr-4">
                      <Link
                        href={`/dashboard/customers/${c.id}`}
                        className="font-medium text-zinc-900 hover:underline dark:text-zinc-100"
                      >
                        {c.name}
                      </Link>
                      <div className="text-xs text-zinc-500">
                        {c.email} {c.company ? `• ${c.company}` : ""}
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <Badge
                        variant={
                          c.customerStatus === "active"
                            ? "success"
                            : c.customerStatus === "inactive"
                            ? "warning"
                            : c.customerStatus === "recovered"
                            ? "info"
                            : "default"
                        }
                      >
                        {c.customerStatus}
                      </Badge>
                    </td>
                    <td className="py-3 px-4 text-right font-medium">
                      ${c.totalPurchaseAmount.toLocaleString()}
                    </td>
                    <td className="py-3 px-4 text-right text-zinc-600 dark:text-zinc-400">
                      {c.purchaseCount}
                    </td>
                    <td className="py-3 px-4 text-right text-zinc-600 dark:text-zinc-400">
                      ${c.averageOrderValue.toFixed(2)}
                    </td>
                    <td className="py-3 px-4 text-xs text-zinc-500">
                      {c.lastPurchaseDate
                        ? new Date(c.lastPurchaseDate).toLocaleDateString()
                        : "Never"}
                    </td>
                    <td className="py-3 pl-4 text-right">
                      <Link href={`/dashboard/customers/${c.id}`}>
                        <Button variant="ghost" size="sm">
                          Details →
                        </Button>
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination Footer */}
        {totalPages > 1 ? (
          <div className="mt-4 flex items-center justify-between border-t border-zinc-200 pt-4 dark:border-zinc-800">
            <p className="text-xs text-zinc-500">
              Page {page} of {totalPages} ({total} total records)
            </p>
            <div className="flex gap-2">
              <Button
                variant="secondary"
                size="sm"
                disabled={page <= 1 || isLoading}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                Previous
              </Button>
              <Button
                variant="secondary"
                size="sm"
                disabled={page >= totalPages || isLoading}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              >
                Next
              </Button>
            </div>
          </div>
        ) : null}
      </Card>

      {/* Add Customer Modal */}
      <Modal
        isOpen={isAddOpen}
        onClose={() => setIsAddOpen(false)}
        title="Add New Customer"
        description="Manually record a customer in this workspace."
      >
        <form onSubmit={handleAddSubmit} className="space-y-4">
          {addError ? <Alert variant="error">{addError}</Alert> : null}

          <div className="grid gap-3 sm:grid-cols-2">
            <Input
              id="addName"
              label="Full Name"
              placeholder="Alice Johnson"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              required
            />
            <Input
              id="addEmail"
              type="email"
              label="Email Address"
              placeholder="alice@company.com"
              value={newEmail}
              onChange={(e) => setNewEmail(e.target.value)}
              required
            />
            <Input
              id="addPhone"
              label="Phone Number"
              placeholder="+1 (555) 019-2834"
              value={newPhone}
              onChange={(e) => setNewPhone(e.target.value)}
            />
            <Input
              id="addCompany"
              label="Company"
              placeholder="Acme Corp"
              value={newCompany}
              onChange={(e) => setNewCompany(e.target.value)}
            />
            <Input
              id="addTotalAmount"
              type="number"
              step="0.01"
              label="Total Spent ($)"
              value={newTotalAmount}
              onChange={(e) => setNewTotalAmount(Number(e.target.value))}
            />
            <Input
              id="addOrders"
              type="number"
              label="Order Count"
              value={newPurchaseCount}
              onChange={(e) => setNewPurchaseCount(Number(e.target.value))}
            />
            <Input
              id="addService"
              label="Service / Product Tier"
              placeholder="Premium Subscription"
              value={newServiceType}
              onChange={(e) => setNewServiceType(e.target.value)}
            />
            <Select
              id="addStatus"
              label="Initial Status"
              value={newStatus}
              onChange={(e) => setNewStatus(e.target.value as CustomerStatus)}
              options={[
                { label: "Active", value: "active" },
                { label: "Inactive", value: "inactive" },
                { label: "Lost", value: "lost" },
                { label: "Churned", value: "churned" },
                { label: "Recovered", value: "recovered" },
              ]}
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setIsAddOpen(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmittingAdd}>
              {isSubmittingAdd ? "Saving..." : "Create Customer"}
            </Button>
          </div>
        </form>
      </Modal>

      {/* CSV Import Modal */}
      <Modal
        isOpen={isImportOpen}
        onClose={() => setIsImportOpen(false)}
        title="Import Customers from CSV"
        description="Upload customer data with automatic column synonym mapping and preview verification."
      >
        {importError ? <Alert variant="error" className="mb-4">{importError}</Alert> : null}

        {/* STEP 1: CSV Input */}
        {importStep === 1 ? (
          <form onSubmit={handleCsvInputSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-zinc-900 dark:text-zinc-100">
                Upload CSV File
              </label>
              <input
                type="file"
                accept=".csv,text/csv"
                onChange={handleFileUpload}
                className="mt-1 block w-full text-sm text-zinc-500 file:mr-4 file:rounded-md file:border-0 file:bg-zinc-100 file:px-3 file:py-2 file:text-xs file:font-semibold file:text-zinc-700 hover:file:bg-zinc-200"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-zinc-900 dark:text-zinc-100">
                Or Paste CSV Content
              </label>
              <textarea
                rows={6}
                value={csvRawText}
                onChange={(e) => setCsvRawText(e.target.value)}
                placeholder="name,email,phone,company,amount,orders&#10;Alice,alice@example.com,555-1234,Acme,450.00,3"
                className="mt-1 block w-full rounded-md border border-zinc-300 p-2 text-xs font-mono dark:bg-zinc-800"
                required
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button
                type="button"
                variant="secondary"
                onClick={() => setIsImportOpen(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isProcessingImport || !csvRawText.trim()}>
                {isProcessingImport ? "Analyzing..." : "Analyze CSV Columns →"}
              </Button>
            </div>
          </form>
        ) : null}

        {/* STEP 2: Column Mapping */}
        {importStep === 2 && previewResult ? (
          <div className="space-y-4">
            <p className="text-xs text-zinc-500">
              Verify detected column mappings before parsing rows:
            </p>

            <div className="max-h-60 space-y-2 overflow-y-auto pr-1">
              {previewResult.headers.map((header) => (
                <div
                  key={header}
                  className="flex items-center justify-between gap-4 rounded border border-zinc-200 p-2 dark:border-zinc-800"
                >
                  <span className="text-xs font-medium text-zinc-800 dark:text-zinc-200">
                    {header}
                  </span>
                  <select
                    value={columnMapping[header] || "skip"}
                    onChange={(e) => {
                      const val = e.target.value as CsvTargetField | "skip";
                      setColumnMapping((prev) => ({ ...prev, [header]: val }));
                    }}
                    className="rounded border border-zinc-300 bg-white px-2 py-1 text-xs dark:bg-zinc-800"
                  >
                    <option value="skip">— Skip Column —</option>
                    <option value="name">Name</option>
                    <option value="email">Email</option>
                    <option value="phone">Phone</option>
                    <option value="company">Company</option>
                    <option value="totalPurchaseAmount">Total Amount</option>
                    <option value="purchaseCount">Purchase Count</option>
                    <option value="lastPurchaseDate">Last Purchase Date</option>
                    <option value="serviceType">Service Type</option>
                    <option value="customerStatus">Status</option>
                    <option value="consentStatus">Consent</option>
                    <option value="optOutStatus">Opt Out</option>
                  </select>
                </div>
              ))}
            </div>

            <div className="flex justify-between pt-2">
              <Button
                type="button"
                variant="secondary"
                onClick={() => setImportStep(1)}
              >
                ← Back
              </Button>
              <Button type="button" onClick={handleMappingConfirm}>
                Validate Rows →
              </Button>
            </div>
          </div>
        ) : null}

        {/* STEP 3: Validation Preview */}
        {importStep === 3 && previewResult ? (
          <div className="space-y-4">
            {/* Validation Metrics */}
            <div className="grid grid-cols-4 gap-2 text-center text-xs">
              <div className="rounded border bg-zinc-50 p-2 dark:bg-zinc-800">
                <p className="text-zinc-500">Total Rows</p>
                <p className="text-base font-bold">{previewResult.summary.total}</p>
              </div>
              <div className="rounded border border-emerald-200 bg-emerald-50 p-2 dark:bg-emerald-950/40">
                <p className="text-emerald-700">Valid</p>
                <p className="text-base font-bold text-emerald-800">
                  {previewResult.summary.valid}
                </p>
              </div>
              <div className="rounded border border-amber-200 bg-amber-50 p-2 dark:bg-amber-950/40">
                <p className="text-amber-700">Duplicates</p>
                <p className="text-base font-bold text-amber-800">
                  {previewResult.summary.duplicates}
                </p>
              </div>
              <div className="rounded border border-red-200 bg-red-50 p-2 dark:bg-red-950/40">
                <p className="text-red-700">Invalid</p>
                <p className="text-base font-bold text-red-800">
                  {previewResult.summary.invalid}
                </p>
              </div>
            </div>

            {/* Error or Duplicate List Preview */}
            {previewResult.invalidRows.length > 0 ? (
              <div className="max-h-40 overflow-y-auto rounded border border-red-200 bg-red-50/50 p-2 text-xs text-red-800 dark:bg-red-950/20">
                <p className="font-semibold">Invalid Rows (Will be skipped):</p>
                <ul className="mt-1 list-disc pl-4 space-y-1">
                  {previewResult.invalidRows.slice(0, 5).map((r) => (
                    <li key={r.rowNumber}>
                      Row {r.rowNumber}: {r.errors.join(", ")}
                    </li>
                  ))}
                  {previewResult.invalidRows.length > 5 ? (
                    <li>...and {previewResult.invalidRows.length - 5} more</li>
                  ) : null}
                </ul>
              </div>
            ) : null}

            <div className="flex justify-between pt-2">
              <Button
                type="button"
                variant="secondary"
                onClick={() => setImportStep(2)}
              >
                ← Edit Mapping
              </Button>
              <Button
                type="button"
                disabled={isProcessingImport || previewResult.validRows.length === 0}
                onClick={handleExecuteImport}
              >
                {isProcessingImport
                  ? "Importing..."
                  : `Confirm & Import ${previewResult.validRows.length} Records`}
              </Button>
            </div>
          </div>
        ) : null}
      </Modal>
    </div>
  );
}
