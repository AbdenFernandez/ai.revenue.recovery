export interface CardProps {
  title: string;
  description?: string;
  children: React.ReactNode;
  className?: string;
}

export function Card({ title, description, children, className }: CardProps) {
  return (
    <article
      className={`rounded-xl border border-border bg-card p-6 shadow-sm ${className ?? ""}`}
    >
      <header className="mb-4 space-y-1">
        <h2 className="text-lg font-semibold text-zinc-900">{title}</h2>
        {description ? (
          <p className="text-sm text-zinc-600">{description}</p>
        ) : null}
      </header>
      {children}
    </article>
  );
}
