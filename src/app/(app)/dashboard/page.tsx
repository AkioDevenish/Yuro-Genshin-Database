import Link from "next/link";
import {
  AlertTriangle,
  ArrowLeftRight,
  Boxes,
  CircleSlash,
  Coins,
  MapPin,
  PackageSearch,
  Tags,
  Users,
} from "lucide-react";
import { requirePermission } from "@/lib/auth";
import { can } from "@/lib/roles";
import {
  dashboardStats,
  listMovements,
  lowStockItems,
  movementTrend,
  stockByCategory,
} from "@/lib/queries";
import {
  formatCurrency,
  formatCurrencyCompact,
  formatNumber,
  formatUnits,
  relativeTime,
} from "@/lib/format";
import { EmptyState, MeterRow, PageHeader, SectionCard, StatCard } from "@/components/ui";
import { TrendChart } from "@/components/trend-chart";
import { MovementTypeBadge } from "@/components/movement-badge";

export const metadata = { title: "Dashboard" };

export default async function DashboardPage() {
  const user = await requirePermission("inventory.view");
  const stats = dashboardStats();
  const lowStock = lowStockItems(6);
  const recent = listMovements({ limit: 8 });
  const byCategory = stockByCategory().slice(0, 6);
  const trend = movementTrend(14);
  const maxCategoryValue = Math.max(1, ...byCategory.map((c) => c.value));

  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";

  return (
    <>
      <PageHeader
        eyebrow={`${greeting}, ${user.name.split(" ")[0]}`}
        title="Today's position"
        description="A live snapshot of everything the organisation holds in stock."
        actions={
          can(user.role, "movement.record") ? (
            <Link href="/movements" className="btn btn-primary">
              <ArrowLeftRight size={15} /> Record movement
            </Link>
          ) : null
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Items tracked"
          value={formatNumber(stats.totalItems)}
          hint={`${formatNumber(stats.totalUnits)} units on hand`}
          icon={<Boxes size={15} />}
        />
        <StatCard
          label="Stock value"
          value={formatCurrencyCompact(stats.totalValue)}
          hint="Quantity × unit cost"
          icon={<Coins size={15} />}
          tone="good"
        />
        <StatCard
          label="Low stock"
          value={formatNumber(stats.lowStock)}
          hint="At or below minimum level"
          icon={<AlertTriangle size={15} />}
          tone={stats.lowStock > 0 ? "warn" : "default"}
        />
        <StatCard
          label="Out of stock"
          value={formatNumber(stats.outOfStock)}
          hint="Needs reordering now"
          icon={<CircleSlash size={15} />}
          tone={stats.outOfStock > 0 ? "danger" : "default"}
        />
      </div>

      <div className="mt-5 grid items-start gap-5 xl:grid-cols-[1.4fr_1fr]">
        <SectionCard
          title="Movement activity"
          description={`${formatNumber(stats.movementsThisWeek)} movements in the last 7 days`}
          bodyClassName="px-5 py-4"
        >
          <TrendChart data={trend} />
        </SectionCard>

        <SectionCard
          title="Value by category"
          description="Where the money is sitting"
          bodyClassName="space-y-4 px-5 py-5"
        >
          {byCategory.length === 0 ? (
            <EmptyState icon={<Tags size={20} />} title="No categories yet" />
          ) : (
            byCategory.map((row) => (
              <MeterRow
                key={row.name}
                label={row.name}
                value={row.value}
                max={maxCategoryValue}
                caption={`${formatCurrencyCompact(row.value)} · ${formatNumber(row.units)} units`}
              />
            ))
          )}
        </SectionCard>
      </div>

      <div className="mt-5 grid items-start gap-5 xl:grid-cols-2">
        <SectionCard
          title="Needs attention"
          description="Items at or below their minimum level"
          action={
            <Link href="/inventory?stock=low" className="text-xs text-brand-300 hover:underline">
              View all
            </Link>
          }
          bodyClassName="divide-y divide-white/5"
        >
          {lowStock.length === 0 ? (
            <EmptyState
              icon={<PackageSearch size={20} />}
              title="Everything is above its minimum"
              description="No reordering needed right now."
            />
          ) : (
            lowStock.map((item) => (
              <Link
                key={item.id}
                href={`/inventory/${item.id}`}
                className="flex items-center gap-4 px-5 py-3.5 transition hover:bg-white/[0.03]"
              >
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-medium text-white">{item.name}</div>
                  <div className="truncate text-xs text-white/40">
                    {item.sku} · {item.location_name ?? "Unassigned"}
                  </div>
                </div>
                <div className="text-right">
                  <div
                    className={`text-sm font-semibold ${
                      item.quantity === 0 ? "text-rose-300" : "text-gold-300"
                    }`}
                  >
                    {formatUnits(item.quantity, item.unit)}
                  </div>
                  <div className="text-xs text-white/35">min {formatNumber(item.min_quantity)}</div>
                </div>
              </Link>
            ))
          )}
        </SectionCard>

        <SectionCard
          title="Latest movements"
          description="The most recent stock changes"
          action={
            <Link href="/movements" className="text-xs text-brand-300 hover:underline">
              View all
            </Link>
          }
          bodyClassName="divide-y divide-white/5"
        >
          {recent.length === 0 ? (
            <EmptyState
              icon={<ArrowLeftRight size={20} />}
              title="No movements recorded"
              description="Stock receipts and issues will appear here."
            />
          ) : (
            recent.map((m) => (
              <div key={m.id} className="flex items-center gap-3 px-5 py-3.5">
                <MovementTypeBadge type={m.type} />
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm text-white">{m.item_name}</div>
                  <div className="truncate text-xs text-white/40">
                    {m.user_name ?? "Removed user"} · {relativeTime(m.created_at)}
                  </div>
                </div>
                <div className="shrink-0 text-sm font-semibold tabular-nums text-white/85">
                  {m.type === "OUT" ? "−" : m.type === "IN" ? "+" : "="}
                  {formatNumber(Math.abs(m.quantity))}
                </div>
              </div>
            ))
          )}
        </SectionCard>
      </div>

      {can(user.role, "users.manage") && (
        <div className="mt-5 grid gap-4 sm:grid-cols-3">
          <StatCard
            label="Active users"
            value={formatNumber(stats.activeUsers)}
            hint="Accounts that can sign in"
            icon={<Users size={15} />}
          />
          <StatCard
            label="Categories"
            value={formatNumber(stats.categories)}
            icon={<Tags size={15} />}
          />
          <StatCard
            label="Locations"
            value={formatNumber(stats.locations)}
            icon={<MapPin size={15} />}
          />
        </div>
      )}
    </>
  );
}
