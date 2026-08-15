"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/use-auth";
import { BusinessSwitcher } from "@/components/dashboard/business-switcher";
import { DashboardNav } from "@/components/dashboard/dashboard-nav";
import { Button } from "@/components/ui/button";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { session, user, isLoading, logout } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && !session) {
      router.push("/login");
    }
  }, [isLoading, session, router]);

  if (isLoading) {
    return (
      <div className="flex min-h-[calc(100vh-8rem)] items-center justify-center">
        <p className="text-sm text-zinc-500">Loading workspace session...</p>
      </div>
    );
  }

  if (!session) {
    return null;
  }

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
      {/* Top Workspace Bar */}
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <span className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
            Workspace:
          </span>
          <BusinessSwitcher />
        </div>

        <div className="flex items-center gap-3 text-sm">
          <span className="text-zinc-600 dark:text-zinc-400">
            {user?.fullName || user?.email}
          </span>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => void logout()}
            className="text-zinc-600 hover:text-red-600"
          >
            Sign out
          </Button>
        </div>
      </div>

      {/* Navigation Subheader */}
      <DashboardNav />

      {/* Main Content Area */}
      <main className="mt-6">{children}</main>
    </div>
  );
}
