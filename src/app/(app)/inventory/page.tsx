import Link from "next/link";
import { Suspense } from "react";
import { Download, PackageSearch } from "lucide-react";
import { requirePermission } from "@/lib/auth";
import { can } from "@/lib/roles";
import { listCategories, listItems, listLocations, type ItemFilters } from "@/lib/queries";
import { formatCurrency, formatNumber, formatUnits, relativeTime } from "@/lib/format";
import { EmptyState, PageHeader, SectionCard, StockPill } from "@/components/ui";
import { InventoryFilters } from "./filters";
import { NewItemButton } from "./item-form";

export const metadata = { title: "Inventory" };

type Search = Promise<Record<string, string | string[] | undefined>>;

function one(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

export default async function InventoryPage({ searchParams }: { searchParams: Search }) {
  const user = await requirePermission("inventory.view");
  const params = await searchParams;

  const filters: ItemFilters = {
    search: one(params.q),
    categoryId: Number(one(params.category)) || undefined,
    locationId: Number(one(params.location)) || undefined,
    stock: (one(params.stock) as ItemFilters["stock"]) ?? "all",
    sort: (one(params.sort) as ItemFilters["sort"]) ?? "name",
  };

  const items = listItems(filters);
  const categories = listCategories();
  const locations = listLocations();
  const totalValue = items.reduce((sum, i) => sum + i.quantity * i.unit_cost, 0);

  const exportQuery = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    const single = one(value);
    if (single) exportQuery.set(key, single);
  }

  return (
    <>
      <PageHeader
        eyebrow="Warehouse"
        title="Inventory"
        description="Every item the organisation tracks, with live quantities and valuations."
        actions={
          <>
            <a
              className="btn btn-ghost"
              href={`/api/export/inventory?${exportQuery.toString()}`}
              download
            >
              <Download size={15} /> Export CSV
            </a>
            {can(user.role, "inventory.manage") && (
              <NewItemButton
                categories={categories.map((c) => ({ id: c.id, name: c.name }))}
                locations={locations.map((l) => ({ id: l.id, name: l.name }))}
              />
            )}
          </>
        }
      />

      <Suspense fallback={<div className="mb-4 h-10" />}>
        <InventoryFilters
          categories={categories.map((c) => ({ id: c.id, name: c.name }))}
          locations={locations.map((l) => ({ id: l.id, name: l.name }))}
        />
      </Suspense>

      <SectionCard
        title={`${formatNumber(items.length)} item${items.length === 1 ? "" : "s"}`}
        description={`Total value of the current selection: ${formatCurrency(totalValue)}`}
        bodyClassName="overflow-x-auto"
      >
        {items.length === 0 ? (
          <EmptyState
            icon={<PackageSearch size={20} />}
            title="Nothing matches those filters"
            description="Try a different search term, or clear the filters to see the whole catalogue."
          />
        ) : (
          <table className="table-shell min-w-[820px]">
            <thead>
              <tr>
                <th>Item</th>
                <th>Category</th>
                <th>Location</th>
                <th className="text-right">On hand</th>
                <th className="text-right">Value</th>
                <th>Status</th>
                <th className="text-right">Updated</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.id}>
                  <td>
                    <Link href={`/inventory/${item.id}`} className="group block">
                      <div className="font-medium text-white group-hover:text-brand-300">
                        {item.name}
                      </div>
                      <div className="font-mono text-xs text-white/35">{item.sku}</div>
                    </Link>
                  </td>
                  <td className="text-white/60">{item.category_name ?? "—"}</td>
                  <td className="text-white/60">{item.location_name ?? "—"}</td>
                  <td className="text-right tabular-nums">
                    <span className="font-semibold text-white">{formatNumber(item.quantity)}</span>
                    <span className="ml-1 text-xs text-white/35">
                      {formatUnits(item.quantity, item.unit).split(" ").slice(1).join(" ")}
                    </span>
                  </td>
                  <td className="text-right tabular-nums text-white/70">
                    {formatCurrency(item.quantity * item.unit_cost)}
                  </td>
                  <td>
                    <StockPill quantity={item.quantity} min={item.min_quantity} />
                  </td>
                  <td className="text-right text-xs text-white/35">
                    {relativeTime(item.updated_at)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </SectionCard>
    </>
  );
}
