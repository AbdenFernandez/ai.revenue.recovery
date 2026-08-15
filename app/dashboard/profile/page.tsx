"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Alert } from "@/components/ui/alert";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default function DashboardProfilePage() {
  const { user, memberships, refreshSession } = useAuth();
  const [fullName, setFullName] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [profileStatus, setProfileStatus] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);
  const [passwordStatus, setPasswordStatus] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  const [isUpdatingProfile, setIsUpdatingProfile] = useState(false);
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);

  useEffect(() => {
    if (user?.fullName) {
      setFullName(user.fullName);
    }
  }, [user]);

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsUpdatingProfile(true);
    setProfileStatus(null);
    try {
      const res = await fetch("/api/auth/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fullName }),
      });
      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error?.message || "Failed to update profile.");
      }
      setProfileStatus({
        type: "success",
        message: "Profile updated successfully.",
      });
      await refreshSession();
    } catch (err: unknown) {
      setProfileStatus({
        type: "error",
        message:
          err instanceof Error ? err.message : "Error updating profile.",
      });
    } finally {
      setIsUpdatingProfile(false);
    }
  };

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      setPasswordStatus({
        type: "error",
        message: "New passwords do not match.",
      });
      return;
    }

    setIsUpdatingPassword(true);
    setPasswordStatus(null);
    try {
      const res = await fetch("/api/auth/update-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error?.message || "Failed to update password.");
      }
      setPasswordStatus({
        type: "success",
        message: "Password updated successfully.",
      });
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err: unknown) {
      setPasswordStatus({
        type: "error",
        message:
          err instanceof Error ? err.message : "Error updating password.",
      });
    } finally {
      setIsUpdatingPassword(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
          User Profile
        </h1>
        <p className="text-sm text-zinc-500">
          Manage your personal account details and security settings.
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Personal Details */}
        <Card
          title="Account Details"
          description="Your personal contact information"
        >
          {profileStatus ? (
            <div className="mb-4">
              <Alert variant={profileStatus.type}>{profileStatus.message}</Alert>
            </div>
          ) : null}

          <form onSubmit={handleUpdateProfile} className="space-y-4">
            <Input
              id="userEmail"
              label="Email Address"
              value={user?.email || ""}
              disabled
              helperText="Email cannot be modified directly."
            />

            <Input
              id="userFullName"
              label="Full Name"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Jane Doe"
              required
            />

            <div className="flex justify-end">
              <Button type="submit" disabled={isUpdatingProfile}>
                {isUpdatingProfile ? "Saving..." : "Save Profile"}
              </Button>
            </div>
          </form>
        </Card>

        {/* Security & Password */}
        <Card
          title="Security & Password"
          description="Update your sign-in credentials"
        >
          {passwordStatus ? (
            <div className="mb-4">
              <Alert variant={passwordStatus.type}>{passwordStatus.message}</Alert>
            </div>
          ) : null}

          <form onSubmit={handleUpdatePassword} className="space-y-4">
            <Input
              id="currentPassword"
              type="password"
              label="Current Password"
              placeholder="••••••••"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
            />

            <Input
              id="newPassword"
              type="password"
              label="New Password"
              placeholder="••••••••"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              helperText="Min 8 characters with upper, lower, and digit."
              required
            />

            <Input
              id="confirmPassword"
              type="password"
              label="Confirm New Password"
              placeholder="••••••••"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
            />

            <div className="flex justify-end">
              <Button type="submit" disabled={isUpdatingPassword}>
                {isUpdatingPassword ? "Updating..." : "Update Password"}
              </Button>
            </div>
          </form>
        </Card>
      </div>

      {/* Workspace Memberships */}
      <Card
        title="Active Workspace Memberships"
        description="All business accounts you are authorized to access"
      >
        <div className="divide-y divide-zinc-200 dark:divide-zinc-800">
          {memberships.map((m) => (
            <div
              key={m.businessId}
              className="flex items-center justify-between py-3"
            >
              <div>
                <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
                  {m.businessName}
                </p>
                <p className="text-xs text-zinc-500">ID: {m.businessId}</p>
              </div>
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
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
