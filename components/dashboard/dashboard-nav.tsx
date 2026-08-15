"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const navItems = [
  { name: "Overview", href: "/dashboard" },
  { name: "Customers", href: "/dashboard/customers" },
  { name: "Team Members", href: "/dashboard/members" },
  { name: "Settings & AI Tone", href: "/dashboard/settings" },
  { name: "Profile", href: "/dashboard/profile" },
];


export function DashboardNav() {
  const pathname = usePathname();

  return (
    <nav className="flex space-x-1 border-b border-zinc-200 dark:border-zinc-800">
      {navItems.map((item) => {
        const isActive = pathname === item.href;
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "border-b-2 px-4 py-2.5 text-sm font-medium transition-colors",
              isActive
                ? "border-zinc-900 text-zinc-900 dark:border-zinc-100 dark:text-zinc-100"
                : "border-transparent text-zinc-500 hover:border-zinc-300 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200",
            )}
          >
            {item.name}
          </Link>
        );
      })}
    </nav>
  );
}
