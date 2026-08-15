"use client";

import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useBusiness } from "@/hooks/use-business";
import { useMembers } from "@/hooks/use-members";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Modal } from "@/components/ui/modal";
import { Badge } from "@/components/ui/badge";
import { Alert } from "@/components/ui/alert";
import { Card } from "@/components/ui/card";
import type { UserRole } from "@/types/auth";

export default function DashboardMembersPage() {
  const { activeBusinessId, user } = useAuth();
  const { role: myRole } = useBusiness(activeBusinessId);
  const { members, isLoading, error, addMember, updateRole, removeMember } =
    useMembers(activeBusinessId);

  const [isInviteOpen, setIsInviteOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<UserRole>("MEMBER");
  const [actionError, setActionError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const canManage = myRole === "OWNER" || myRole === "ADMIN";

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setActionError(null);
    try {
      await addMember({ email: inviteEmail, role: inviteRole });
      setIsInviteOpen(false);
      setInviteEmail("");
      setInviteRole("MEMBER");
    } catch (err: unknown) {
      setActionError(
        err instanceof Error ? err.message : "Failed to invite member.",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRoleChange = async (memberId: string, newRole: UserRole) => {
    setActionError(null);
    try {
      await updateRole(memberId, newRole);
    } catch (err: unknown) {
      setActionError(
        err instanceof Error ? err.message : "Failed to update role.",
      );
    }
  };

  const handleRemove = async (memberId: string, email: string) => {
    if (
      !window.confirm(`Are you sure you want to remove ${email} from this workspace?`)
    ) {
      return;
    }
    setActionError(null);
    try {
      await removeMember(memberId);
    } catch (err: unknown) {
      setActionError(
        err instanceof Error ? err.message : "Failed to remove member.",
      );
    }
  };

  if (isLoading) {
    return (
      <div className="py-12 text-center text-sm text-zinc-500">
        Loading team members...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
            Team Members & Roles
          </h1>
          <p className="text-sm text-zinc-500">
            Manage user access and permission levels for this workspace.
          </p>
        </div>
        {canManage ? (
          <Button onClick={() => setIsInviteOpen(true)}>+ Invite Member</Button>
        ) : null}
      </div>

      {actionError ? <Alert variant="error">{actionError}</Alert> : null}
      {error ? <Alert variant="error">{error}</Alert> : null}

      <Card title="Workspace Roster" description="All users with access to this tenant">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-zinc-200 text-xs font-semibold uppercase text-zinc-500 dark:border-zinc-800">
              <tr>
                <th className="py-3 pr-4">User</th>
                <th className="py-3 px-4">Role</th>
                <th className="py-3 px-4">Joined</th>
                <th className="py-3 pl-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
              {members.map((m) => {
                const isMe = m.userId === user?.id;
                const canEditRole =
                  myRole === "OWNER" ||
                  (myRole === "ADMIN" && m.role === "MEMBER");

                return (
                  <tr key={m.id}>
                    <td className="py-3 pr-4">
                      <div className="font-medium text-zinc-900 dark:text-zinc-100">
                        {m.profile?.fullName || "—"} {isMe ? "(You)" : ""}
                      </div>
                      <div className="text-xs text-zinc-500">
                        {m.profile?.email || m.userId}
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      {canEditRole && !isMe ? (
                        <select
                          aria-label={`Role for ${m.profile?.email || m.userId}`}
                          value={m.role}
                          onChange={(e) =>
                            void handleRoleChange(m.id, e.target.value as UserRole)
                          }
                          className="rounded border border-zinc-300 bg-white px-2 py-1 text-xs font-medium dark:bg-zinc-800"
                        >
                          <option value="MEMBER">MEMBER</option>
                          <option value="ADMIN">ADMIN</option>
                          {myRole === "OWNER" ? (
                            <option value="OWNER">OWNER</option>
                          ) : null}
                        </select>
                      ) : (
                        <Badge
                          variant={
                            m.role === "OWNER"
                              ? "info"
                              : m.role === "ADMIN"
                              ? "success"
                              : "default"
                          }
                        >
                          {m.role}
                        </Badge>
                      )}
                    </td>
                    <td className="py-3 px-4 text-xs text-zinc-500">
                      {new Date(m.createdAt).toLocaleDateString()}
                    </td>
                    <td className="py-3 pl-4 text-right">
                      {canManage && (!isMe || members.length > 1) ? (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() =>
                            void handleRemove(
                              m.id,
                              m.profile?.email || "this user",
                            )
                          }
                          className="text-xs text-red-600 hover:bg-red-50 hover:text-red-700 dark:hover:bg-red-950/30"
                        >
                          {isMe ? "Leave" : "Remove"}
                        </Button>
                      ) : null}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Invite Member Modal */}
      <Modal
        isOpen={isInviteOpen}
        onClose={() => setIsInviteOpen(false)}
        title="Invite Team Member"
        description="Grant a teammate access to this workspace."
      >
        <form onSubmit={handleInvite} className="space-y-4">
          <Input
            id="inviteEmail"
            type="email"
            label="Email Address"
            placeholder="colleague@company.com"
            value={inviteEmail}
            onChange={(e) => setInviteEmail(e.target.value)}
            required
          />

          <Select
            id="inviteRole"
            label="Role"
            value={inviteRole}
            onChange={(e) => setInviteRole(e.target.value as UserRole)}
            options={[
              { label: "MEMBER — Standard operational access", value: "MEMBER" },
              { label: "ADMIN — Team management and settings", value: "ADMIN" },
              ...(myRole === "OWNER"
                ? [{ label: "OWNER — Full ownership & billing", value: "OWNER" }]
                : []),
            ]}
          />

          <div className="flex justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setIsInviteOpen(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Inviting..." : "Send Invitation"}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
