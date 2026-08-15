import Link from "next/link";
import { appMetadata } from "@/lib/config";

export function SiteHeader() {
  return (
    <header className="border-b border-border bg-card/80 backdrop-blur">
      <div className="mx-auto flex h-14 w-full max-w-5xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <Link
          href="/"
          className="text-sm font-semibold tracking-tight text-zinc-900"
        >
          {appMetadata.name}
        </Link>
        <nav aria-label="Primary">
          <ul className="flex items-center gap-4 text-sm text-zinc-600">
            <li>
              <Link href="/" className="hover:text-zinc-900">
                Home
              </Link>
            </li>
            <li>
              <Link href="/dashboard" className="hover:text-zinc-900">
                Dashboard
              </Link>
            </li>
            <li>
              <Link
                href="/login"
                className="rounded-md bg-zinc-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-zinc-800"
              >
                Sign in
              </Link>
            </li>
          </ul>
        </nav>
      </div>
    </header>
  );
}
