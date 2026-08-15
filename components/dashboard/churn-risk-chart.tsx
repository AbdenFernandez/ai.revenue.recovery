import type { ChurnRiskTier } from "@/types/intelligence";

const RISK_CONFIG: Record<
  ChurnRiskTier,
  { label: string; barBg: string; textClass: string; desc: string }
> = {
  critical: {
    label: "Critical Risk (>80%)",
    barBg: "bg-red-500",
    textClass: "text-red-600 dark:text-red-400",
    desc: "Immediate churn danger or long dormancy",
  },
  high: {
    label: "High Risk (60-80%)",
    barBg: "bg-orange-500",
    textClass: "text-orange-600 dark:text-orange-400",
    desc: "Passing standard inactivity window",
  },
  medium: {
    label: "Medium Risk (35-60%)",
    barBg: "bg-amber-500",
    textClass: "text-amber-600 dark:text-amber-400",
    desc: "Warming period without recent transactions",
  },
  low: {
    label: "Low Risk (<35%)",
    barBg: "bg-emerald-500",
    textClass: "text-emerald-600 dark:text-emerald-400",
    desc: "Active buyers on regular purchase cadence",
  },
};

interface ChurnRiskChartProps {
  distribution: Record<ChurnRiskTier, number>;
  totalCustomers: number;
}

export function ChurnRiskChart({
  distribution,
  totalCustomers,
}: ChurnRiskChartProps) {
  const tiers: ChurnRiskTier[] = ["critical", "high", "medium", "low"];

  return (
    <div className="space-y-4">
      {tiers.map((tier) => {
        const count = distribution[tier] || 0;
        const pct = totalCustomers > 0 ? (count / totalCustomers) * 100 : 0;
        const config = RISK_CONFIG[tier];

        return (
          <div key={tier} className="space-y-1">
            <div className="flex items-center justify-between text-xs">
              <span className={`font-semibold ${config.textClass}`}>
                {config.label}
              </span>
              <span className="font-medium text-zinc-600 dark:text-zinc-400">
                {count} customers ({pct.toFixed(1)}%)
              </span>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-800">
              <div
                style={{ width: `${pct}%` }}
                className={`h-full ${config.barBg} transition-all`}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}
