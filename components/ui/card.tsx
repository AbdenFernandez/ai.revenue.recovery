export interface CardProps {
  title?: string;
  description?: string;
  children: React.ReactNode;
  className?: string;
}

export function Card({ title, description, children, className }: CardProps) {
  return (
    <article
      className={`rounded-xl border border-border bg-card p-6 shadow-sm ${className ?? ""}`}
    >
      {title || description ? (
        <header className="mb-4 space-y-1">
          {title ? (
            <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">{title}</h2>
          ) : null}
          {description ? (
            <p className="text-sm text-zinc-600 dark:text-zinc-400">{description}</p>
          ) : null}
        </header>
      ) : null}
      {children}
    </article>
  );
}

