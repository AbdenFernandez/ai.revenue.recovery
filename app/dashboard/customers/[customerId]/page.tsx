"use client";

import { use, useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/use-auth";
import { useBusiness } from "@/hooks/use-business";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Modal } from "@/components/ui/modal";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import type { Customer, CustomerStatus } from "@/types/customer";

export default function CustomerDetailPage({
  params,
}: {
  params: Promise<{ customerId: string }>;
}) {
  const { customerId } = use(params);
  const router = useRouter();
  const { activeBusinessId } = useAuth();
  const { role: myRole } = useBusiness(activeBusinessId);

  const [customer, setCustomer] = useState<Customer | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Edit Modal State
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editName, setEditName] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [editCompany, setEditCompany] = useState("");
  const [editTotalAmount, setEditTotalAmount] = useState(0);
  const [editPurchaseCount, setEditPurchaseCount] = useState(0);
  const [editServiceType, setEditServiceType] = useState("");
  const [editStatus, setEditStatus] = useState<CustomerStatus>("active");
  const [editConsent, setEditConsent] = useState(true);
  const [editOptOut, setEditOptOut] = useState(false);
  const [isSubmittingEdit, setIsSubmittingEdit] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  // Delete Modal State
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const canDelete = myRole === "OWNER" || myRole === "ADMIN";

  const fetchCustomer = useCallback(async () => {
    if (!activeBusinessId || !customerId) return;
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/businesses/${activeBusinessId}/customers/${customerId}`,
      );
      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error?.message || "Customer not found.");
      }
      setCustomer(json.data);
      // Pre-fill edit fields
      setEditName(json.data.name);
      setEditEmail(json.data.email);
      setEditPhone(json.data.phone || "");
      setEditCompany(json.data.company || "");
      setEditTotalAmount(json.data.totalPurchaseAmount);
      setEditPurchaseCount(json.data.purchaseCount);
      setEditServiceType(json.data.serviceType || "");
      setEditStatus(json.data.customerStatus);
      setEditConsent(json.data.consentStatus);
      setEditOptOut(json.data.optOutStatus);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to load customer.");
    } finally {
      setIsLoading(false);
    }
  }, [activeBusinessId, customerId]);

  useEffect(() => {
    void fetchCustomer();
  }, [fetchCustomer]);


  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeBusinessId || !customerId) return;
    setIsSubmittingEdit(true);
    setEditError(null);

    try {
      const res = await fetch(
        `/api/businesses/${activeBusinessId}/customers/${customerId}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: editName,
            email: editEmail,
            phone: editPhone || null,
            company: editCompany || null,
            totalPurchaseAmount: Number(editTotalAmount),
            purchaseCount: Number(editPurchaseCount),
            serviceType: editServiceType || null,
            customerStatus: editStatus,
            consentStatus: editConsent,
            optOutStatus: editOptOut,
          }),
        },
      );
      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error?.message || "Failed to update customer.");
      }
      setCustomer(json.data);
      setIsEditOpen(false);
    } catch (err: unknown) {
      setEditError(err instanceof Error ? err.message : "Update failed.");
    } finally {
      setIsSubmittingEdit(false);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!activeBusinessId || !customerId) return;
    setIsDeleting(true);
    setDeleteError(null);

    try {
      const res = await fetch(
        `/api/businesses/${activeBusinessId}/customers/${customerId}`,
        {
          method: "DELETE",
        },
      );
      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error?.message || "Failed to delete customer.");
      }
      router.push("/dashboard/customers");
    } catch (err: unknown) {
      setDeleteError(err instanceof Error ? err.message : "Deletion failed.");
      setIsDeleting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="py-12 text-center text-sm text-zinc-500">
        Loading customer details...
      </div>
    );
  }

  if (error || !customer) {
    return (
      <div className="space-y-4">
        <Alert variant="error">{error || "Customer record not found."}</Alert>
        <Link href="/dashboard/customers">
          <Button variant="secondary">← Return to Customers</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <div className="flex items-center gap-2">
            <Link
              href="/dashboard/customers"
              className="text-xs font-medium text-zinc-500 hover:underline"
            >
              ← Customers
            </Link>
            <span className="text-zinc-400">/</span>
            <span className="text-xs text-zinc-600 dark:text-zinc-300">
              {customer.name}
            </span>
          </div>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
            {customer.name}
          </h1>
          <p className="text-xs text-zinc-500">ID: {customer.id}</p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => setIsEditOpen(true)}
          >
            ✏️ Edit Customer
          </Button>
          {canDelete ? (
            <Button
              variant="danger"
              size="sm"
              onClick={() => setIsDeleteOpen(true)}
            >
              Delete
            </Button>
          ) : null}
        </div>
      </div>

      {/* Main Grid: Info + Financial Metrics */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Contact & Profile Card */}
        <Card title="Contact & Profile" description="Identity and communication endpoints">
          <dl className="divide-y divide-zinc-200 text-sm dark:divide-zinc-800">
            <div className="py-2.5 flex justify-between">
              <dt className="text-zinc-500">Email Address</dt>
              <dd className="font-medium text-zinc-900 dark:text-zinc-100">
                {customer.email}
              </dd>
            </div>
            <div className="py-2.5 flex justify-between">
              <dt className="text-zinc-500">Phone</dt>
              <dd className="font-medium text-zinc-900 dark:text-zinc-100">
                {customer.phone || "—"}
              </dd>
            </div>
            <div className="py-2.5 flex justify-between">
              <dt className="text-zinc-500">Company</dt>
              <dd className="font-medium text-zinc-900 dark:text-zinc-100">
                {customer.company || "—"}
              </dd>
            </div>
            <div className="py-2.5 flex justify-between">
              <dt className="text-zinc-500">Service / Tier</dt>
              <dd className="font-medium text-zinc-900 dark:text-zinc-100">
                {customer.serviceType || "—"}
              </dd>
            </div>
            <div className="py-2.5 flex justify-between">
              <dt className="text-zinc-500">Created Date</dt>
              <dd className="text-zinc-600 dark:text-zinc-400">
                {new Date(customer.createdAt).toLocaleDateString()}
              </dd>
            </div>
          </dl>
        </Card>

        {/* Financial & Activity Metrics */}
        <Card title="Financial History" description="LTV and purchase tracking">
          <dl className="divide-y divide-zinc-200 text-sm dark:divide-zinc-800">
            <div className="py-2.5 flex justify-between">
              <dt className="text-zinc-500">Total Purchase Amount</dt>
              <dd className="text-base font-bold text-emerald-600">
                ${customer.totalPurchaseAmount.toLocaleString()}
              </dd>
            </div>
            <div className="py-2.5 flex justify-between">
              <dt className="text-zinc-500">Order Count</dt>
              <dd className="font-medium text-zinc-900 dark:text-zinc-100">
                {customer.purchaseCount} orders
              </dd>
            </div>
            <div className="py-2.5 flex justify-between">
              <dt className="text-zinc-500">Average Order Value (AOV)</dt>
              <dd className="font-medium text-zinc-900 dark:text-zinc-100">
                ${customer.averageOrderValue.toFixed(2)}
              </dd>
            </div>
            <div className="py-2.5 flex justify-between">
              <dt className="text-zinc-500">Last Purchase Date</dt>
              <dd className="text-zinc-600 dark:text-zinc-400">
                {customer.lastPurchaseDate
                  ? new Date(customer.lastPurchaseDate).toLocaleDateString()
                  : "Never"}
              </dd>
            </div>
            <div className="py-2.5 flex justify-between">
              <dt className="text-zinc-500">Last Contact Date</dt>
              <dd className="text-zinc-600 dark:text-zinc-400">
                {customer.lastContactDate
                  ? new Date(customer.lastContactDate).toLocaleDateString()
                  : "Never"}
              </dd>
            </div>
          </dl>
        </Card>
      </div>

      {/* Status & Compliance Section */}
      <Card title="Recovery Status & Compliance" description="AI targeting permissions">
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="rounded-lg border border-zinc-200 p-3 dark:border-zinc-800">
            <p className="text-xs text-zinc-500">Lifecycle Status</p>
            <div className="mt-1">
              <Badge
                variant={
                  customer.customerStatus === "active"
                    ? "success"
                    : customer.customerStatus === "inactive"
                    ? "warning"
                    : customer.customerStatus === "recovered"
                    ? "info"
                    : "default"
                }
              >
                {customer.customerStatus}
              </Badge>
            </div>
          </div>

          <div className="rounded-lg border border-zinc-200 p-3 dark:border-zinc-800">
            <p className="text-xs text-zinc-500">Marketing Consent</p>
            <p className="mt-1 text-sm font-semibold text-zinc-900 dark:text-zinc-100">
              {customer.consentStatus ? "✅ Opted In" : "❌ No Consent"}
            </p>
          </div>

          <div className="rounded-lg border border-zinc-200 p-3 dark:border-zinc-800">
            <p className="text-xs text-zinc-500">Opt-Out Status</p>
            <p className="mt-1 text-sm font-semibold text-zinc-900 dark:text-zinc-100">
              {customer.optOutStatus ? "🚫 Opted Out" : "Active / Reachable"}
            </p>
          </div>
        </div>
      </Card>

      {/* Edit Customer Modal */}
      <Modal
        isOpen={isEditOpen}
        onClose={() => setIsEditOpen(false)}
        title="Edit Customer"
        description="Update customer identity, financial metrics, and compliance settings."
      >
        <form onSubmit={handleEditSubmit} className="space-y-4">
          {editError ? <Alert variant="error">{editError}</Alert> : null}

          <div className="grid gap-3 sm:grid-cols-2">
            <Input
              id="editName"
              label="Full Name"
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              required
            />
            <Input
              id="editEmail"
              type="email"
              label="Email Address"
              value={editEmail}
              onChange={(e) => setEditEmail(e.target.value)}
              required
            />
            <Input
              id="editPhone"
              label="Phone Number"
              value={editPhone}
              onChange={(e) => setEditPhone(e.target.value)}
            />
            <Input
              id="editCompany"
              label="Company"
              value={editCompany}
              onChange={(e) => setEditCompany(e.target.value)}
            />
            <Input
              id="editTotalAmount"
              type="number"
              step="0.01"
              label="Total Spent ($)"
              value={editTotalAmount}
              onChange={(e) => setEditTotalAmount(Number(e.target.value))}
            />
            <Input
              id="editOrders"
              type="number"
              label="Order Count"
              value={editPurchaseCount}
              onChange={(e) => setEditPurchaseCount(Number(e.target.value))}
            />
            <Input
              id="editService"
              label="Service Tier"
              value={editServiceType}
              onChange={(e) => setEditServiceType(e.target.value)}
            />
            <Select
              id="editStatus"
              label="Customer Status"
              value={editStatus}
              onChange={(e) => setEditStatus(e.target.value as CustomerStatus)}
              options={[
                { label: "Active", value: "active" },
                { label: "Inactive", value: "inactive" },
                { label: "Lost", value: "lost" },
                { label: "Churned", value: "churned" },
                { label: "Recovered", value: "recovered" },
              ]}
            />
          </div>

          <div className="flex gap-4 border-t border-zinc-200 pt-3 dark:border-zinc-800">
            <label className="flex items-center gap-2 text-xs">
              <input
                type="checkbox"
                checked={editConsent}
                onChange={(e) => setEditConsent(e.target.checked)}
              />
              <span>Marketing Consent</span>
            </label>
            <label className="flex items-center gap-2 text-xs">
              <input
                type="checkbox"
                checked={editOptOut}
                onChange={(e) => setEditOptOut(e.target.checked)}
              />
              <span>Opted Out</span>
            </label>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setIsEditOpen(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmittingEdit}>
              {isSubmittingEdit ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Delete Customer Confirmation Modal */}
      <Modal
        isOpen={isDeleteOpen}
        onClose={() => setIsDeleteOpen(false)}
        title="Delete Customer"
        description="Are you sure you want to permanently delete this customer record?"
      >
        <div className="space-y-4">
          {deleteError ? <Alert variant="error">{deleteError}</Alert> : null}
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            This will permanently remove <strong>{customer.name}</strong> ({customer.email}) and all related activity metrics from this workspace.
          </p>
          <div className="flex justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setIsDeleteOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="danger"
              disabled={isDeleting}
              onClick={handleDeleteConfirm}
            >
              {isDeleting ? "Deleting..." : "Permanently Delete"}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
