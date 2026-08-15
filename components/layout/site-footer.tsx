import { appMetadata } from "@/lib/config";

export function SiteFooter() {
  return (
    <footer className="border-t border-border bg-card">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-2 px-4 py-6 text-sm text-zinc-600 sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-8">
        <p>
          © {new Date().getFullYear()} {appMetadata.name}
        </p>
        <p>Version {appMetadata.version}</p>
      </div>
    </footer>
  );
}
