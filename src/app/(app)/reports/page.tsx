import { Download } from "lucide-react";
import { requirePermission } from "@/lib/auth";
import {
  dashboardStats,
  listItems,
  movementTrend,
  stockByCategory,
  stockByLocation,
} from "@/lib/queries";
import { formatCurrency, formatCurrencyCompact, formatNumber } from "@/lib/format";
import { EmptyState, MeterRow, PageHeader, SectionCard, StatCard } from "@/components/ui";
import { TrendChart } from "@/components/trend-chart";

export const metadata = { title: "Reports" };

export default async function ReportsPage() {
  await requirePermission("reports.view");

  const stats = dashboardStats();
  const byCategory = stockByCategory();
  const byLocation = stockByLocation();
  const trend = movementTrend(30);
  const topValue = listItems({ sort: "value" }).slice(0, 10);

  const maxCategory = Math.max(1, ...byCategory.map((r) => r.value));
  const maxLocation = Math.max(1, ...byLocation.map((r) => r.value));
  const averageValue = stats.totalItems > 0 ? stats.totalValue / stats.totalItems : 0;

  return (
    <>
      <PageHeader
        eyebrow="Overview"
        title="Reports"
        description="Valuation, distribution and movement analysis across the whole organisation."
        actions={
          <a className="btn btn-ghost" href="/api/export/inventory" download>
            <Download size={15} /> Export inventory
          </a>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Total valuation"
          value={formatCurrencyCompact(stats.totalValue)}
          hint="Across every item"
          tone="good"
        />
        <StatCard
          label="Average item value"
          value={formatCurrencyCompact(averageValue)}
          hint={`${formatNumber(stats.totalItems)} items`}
        />
        <StatCard
          label="Units held"
          value={formatNumber(stats.totalUnits)}
          hint="Sum of all quantities"
        />
        <StatCard
          label="Needs reordering"
          value={formatNumber(stats.lowStock + stats.outOfStock)}
          hint="Low or out of stock"
          tone={stats.lowStock + stats.outOfStock > 0 ? "warn" : "default"}
        />
      </div>

      <div className="mt-5">
        <SectionCard
          title="Movement volume — last 30 days"
          description="Units received against units issued"
          bodyClassName="px-5 py-4"
        >
          <TrendChart data={trend} />
        </SectionCard>
      </div>

      <div className="mt-5 grid gap-5 xl:grid-cols-2">
        <SectionCard
          title="Value by category"
          description="Where the organisation's money is held"
          bodyClassName="space-y-4 px-5 py-5"
        >
          {byCategory.length === 0 ? (
            <EmptyState title="No data yet" />
          ) : (
            byCategory.map((row) => (
              <MeterRow
                key={row.name}
                label={row.name}
                value={row.value}
                max={maxCategory}
                caption={`${formatCurrencyCompact(row.value)} · ${formatNumber(row.items)} items`}
              />
            ))
          )}
        </SectionCard>

        <SectionCard
          title="Value by location"
          description="What each site is holding"
          bodyClassName="space-y-4 px-5 py-5"
        >
          {byLocation.length === 0 ? (
            <EmptyState title="No data yet" />
          ) : (
            byLocation.map((row) => (
              <MeterRow
                key={row.name}
                label={row.name}
                value={row.value}
                max={maxLocation}
                caption={`${formatCurrencyCompact(row.value)} · ${formatNumber(row.units)} units`}
              />
            ))
          )}
        </SectionCard>
      </div>

      <div className="mt-5">
        <SectionCard
          title="Highest-value items"
          description="The ten items carrying the most value"
          bodyClassName="overflow-x-auto"
        >
          {topValue.length === 0 ? (
            <EmptyState title="No items yet" />
          ) : (
            <table className="table-shell min-w-[640px]">
              <thead>
                <tr>
                  <th>Item</th>
                  <th>Category</th>
                  <th>Location</th>
                  <th className="text-right">Quantity</th>
                  <th className="text-right">Unit cost</th>
                  <th className="text-right">Total value</th>
                </tr>
              </thead>
              <tbody>
                {topValue.map((item) => (
                  <tr key={item.id}>
                    <td>
                      <div className="font-medium text-white">{item.name}</div>
                      <div className="font-mono text-xs text-white/35">{item.sku}</div>
                    </td>
                    <td className="text-white/55">{item.category_name ?? "—"}</td>
                    <td className="text-white/55">{item.location_name ?? "—"}</td>
                    <td className="text-right tabular-nums text-white/75">
                      {formatNumber(item.quantity)}
                    </td>
                    <td className="text-right tabular-nums text-white/55">
                      {formatCurrency(item.unit_cost)}
                    </td>
                    <td className="text-right font-semibold tabular-nums text-brand-300">
                      {formatCurrency(item.quantity * item.unit_cost)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </SectionCard>
      </div>
    </>
  );
}
