import type { CustomerSegment } from "@/types/intelligence";

const SEGMENT_COLORS: Record<CustomerSegment, string> = {
  VIP: "bg-purple-500 text-purple-700 dark:text-purple-300",
  "High Value": "bg-indigo-500 text-indigo-700 dark:text-indigo-300",
  Active: "bg-emerald-500 text-emerald-700 dark:text-emerald-300",
  "Potential High Value": "bg-blue-500 text-blue-700 dark:text-blue-300",
  New: "bg-cyan-500 text-cyan-700 dark:text-cyan-300",
  "At Risk": "bg-amber-500 text-amber-700 dark:text-amber-300",
  Dormant: "bg-orange-500 text-orange-700 dark:text-orange-300",
  "Win Back": "bg-rose-500 text-rose-700 dark:text-rose-300",
  Lost: "bg-zinc-400 text-zinc-600 dark:text-zinc-400",
};

interface SegmentChartProps {
  distribution: Record<CustomerSegment, number>;
  totalCustomers: number;
}

export function SegmentChart({ distribution, totalCustomers }: SegmentChartProps) {
  const segments = Object.entries(distribution) as [CustomerSegment, number][];

  return (
    <div className="space-y-3">
      {/* Horizontal Multi-color Stacked Bar */}
      {totalCustomers > 0 ? (
        <div className="flex h-3 w-full overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-800">
          {segments.map(([segment, count]) => {
            if (count === 0) return null;
            const pct = (count / totalCustomers) * 100;
            const barBg = SEGMENT_COLORS[segment].split(" ")[0];
            return (
              <div
                key={segment}
                style={{ width: `${pct}%` }}
                className={`${barBg} transition-all`}
                title={`${segment}: ${count} (${pct.toFixed(1)}%)`}
              />
            );
          })}
        </div>
      ) : null}

      {/* Segment Distribution List */}
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {segments.map(([segment, count]) => {
          const pct = totalCustomers > 0 ? (count / totalCustomers) * 100 : 0;
          const colorClasses = SEGMENT_COLORS[segment];
          const dotBg = colorClasses.split(" ")[0];

          return (
            <div
              key={segment}
              className="flex items-center justify-between rounded-md border border-zinc-200 p-2 text-xs dark:border-zinc-800"
            >
              <div className="flex items-center gap-2">
                <span className={`h-2.5 w-2.5 rounded-full ${dotBg}`} />
                <span className="font-medium text-zinc-800 dark:text-zinc-200">
                  {segment}
                </span>
              </div>
              <span className="font-semibold text-zinc-600 dark:text-zinc-400">
                {count} ({pct.toFixed(0)}%)
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
