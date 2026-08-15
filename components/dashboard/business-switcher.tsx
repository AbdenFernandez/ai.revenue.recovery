"use client";

import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

export function BusinessSwitcher() {
  const { session, activeBusinessId, activeRole, switchBusiness, refreshSession } =
    useAuth();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newBizName, setNewBizName] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const memberships = session?.memberships || [];


  const handleCreateBusiness = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsCreating(true);
    setError(null);
    try {
      const res = await fetch("/api/businesses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newBizName }),
      });
      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error?.message || "Failed to create workspace.");
      }
      setIsModalOpen(false);
      setNewBizName("");
      await refreshSession();
      await switchBusiness(json.data.business.id);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Error creating workspace.");
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <>
      <div className="flex items-center gap-2">
        <select
          id="workspace-switcher"
          aria-label="Select active workspace"
          value={activeBusinessId ?? ""}
          onChange={(e) => {
            if (e.target.value === "NEW") {
              setIsModalOpen(true);
            } else {
              void switchBusiness(e.target.value);
            }
          }}
          className="h-9 rounded-md border border-zinc-300 bg-white px-2.5 py-1 text-sm font-medium text-zinc-900 shadow-xs focus:border-zinc-900 focus:outline-hidden"
        >
          {memberships.map((m) => (
            <option key={m.businessId} value={m.businessId}>
              {m.businessName} ({m.role})
            </option>
          ))}
          <option value="NEW">+ Create New Workspace</option>
        </select>

        {activeRole ? (
          <Badge
            variant={
              activeRole === "OWNER"
                ? "info"
                : activeRole === "ADMIN"
                ? "success"
                : "default"
            }
          >
            {activeRole}
          </Badge>
        ) : null}
      </div>

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Create New Workspace"
        description="Set up an additional business entity with isolated customers and recovery campaigns."
      >
        <form onSubmit={handleCreateBusiness} className="space-y-4">
          {error ? <p className="text-xs text-red-600">{error}</p> : null}
          <Input
            id="newBizName"
            label="Workspace Name"
            placeholder="e.g. Acme EMEA"
            value={newBizName}
            onChange={(e) => setNewBizName(e.target.value)}
            required
          />
          <div className="flex justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setIsModalOpen(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isCreating}>
              {isCreating ? "Creating..." : "Create"}
            </Button>
          </div>
        </form>
      </Modal>
    </>
  );
}
