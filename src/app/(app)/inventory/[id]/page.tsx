import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ArrowLeftRight, Lock } from "lucide-react";
import { requirePermission } from "@/lib/auth";
import { can } from "@/lib/roles";
import { getItem, listCategories, listLocations, listMovements } from "@/lib/queries";
import { formatCurrency, formatDate, formatDateTime, formatNumber, formatUnits } from "@/lib/format";
import { EmptyState, PageHeader, SectionCard, StatCard, StockPill } from "@/components/ui";
import { MovementTypeBadge } from "@/components/movement-badge";
import { MovementForm } from "../../movements/movement-form";
import { EditItemButton } from "../item-form";
import { DeleteItemButton } from "./delete-item";

type Params = Promise<{ id: string }>;

export async function generateMetadata({ params }: { params: Params }) {
  const { id } = await params;
  const item = getItem(Number(id));
  return { title: item?.name ?? "Item" };
}

export default async function ItemPage({ params }: { params: Params }) {
  const user = await requirePermission("inventory.view");
  const { id } = await params;
  const item = getItem(Number(id));
  if (!item) notFound();

  const movements = listMovements({ itemId: item.id, limit: 50 });
  const canManage = can(user.role, "inventory.manage");

  const details = [
    { label: "SKU / asset code", value: item.sku, mono: true },
    { label: "Category", value: item.category_name ?? "Uncategorised" },
    { label: "Location", value: item.location_name ?? "Unassigned" },
    { label: "Supplier", value: item.supplier ?? "—" },
    { label: "Unit of measure", value: item.unit },
    { label: "Minimum level", value: formatUnits(item.min_quantity, item.unit) },
    { label: "Added", value: formatDateTime(item.created_at) },
    { label: "Last updated", value: formatDateTime(item.updated_at) },
  ];

  return (
    <>
      <Link
        href="/inventory"
        className="mb-4 inline-flex items-center gap-1.5 text-sm text-white/45 transition hover:text-white"
      >
        <ArrowLeft size={15} /> Back to inventory
      </Link>

      <PageHeader
        eyebrow={item.category_name ?? "Uncategorised"}
        title={item.name}
        description={item.description ?? undefined}
        actions={
          canManage ? (
            <>
              <EditItemButton
                item={item}
                categories={listCategories().map((c) => ({ id: c.id, name: c.name }))}
                locations={listLocations().map((l) => ({ id: l.id, name: l.name }))}
              />
              <DeleteItemButton id={item.id} name={item.name} />
            </>
          ) : null
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="On hand"
          value={formatUnits(item.quantity, item.unit)}
          hint={`Minimum ${formatNumber(item.min_quantity)}`}
          tone={item.quantity === 0 ? "danger" : item.quantity <= item.min_quantity ? "warn" : "good"}
        />
        <StatCard label="Unit cost" value={formatCurrency(item.unit_cost)} />
        <StatCard
          label="Total value"
          value={formatCurrency(item.quantity * item.unit_cost)}
          hint="Quantity × unit cost"
        />
        <div className="panel flex flex-col justify-between p-5">
          <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-white/40">
            Status
          </div>
          <div className="mt-3">
            <StockPill quantity={item.quantity} min={item.min_quantity} />
          </div>
          <div className="mt-2 text-xs text-white/35">
            {item.quantity === 0
              ? "Reorder as soon as possible."
              : item.quantity <= item.min_quantity
                ? `Only ${formatNumber(item.quantity)} left — consider reordering.`
                : "Healthy stock level."}
          </div>
        </div>
      </div>

      <div className="mt-5 grid gap-5 xl:grid-cols-[360px_1fr]">
        <div className="space-y-5">
          <SectionCard title="Details" bodyClassName="divide-y divide-white/5">
            {details.map((row) => (
              <div key={row.label} className="flex items-center justify-between gap-4 px-5 py-3">
                <span className="text-xs uppercase tracking-[0.1em] text-white/35">
                  {row.label}
                </span>
                <span
                  className={`text-right text-sm text-white/85 ${row.mono ? "font-mono" : ""}`}
                >
                  {row.value}
                </span>
              </div>
            ))}
          </SectionCard>

          {can(user.role, "movement.record") ? (
            <SectionCard title="Move this item" bodyClassName="px-5 py-5">
              <MovementForm
                items={[]}
                lockedItem={{
                  id: item.id,
                  name: item.name,
                  sku: item.sku,
                  quantity: item.quantity,
                  unit: item.unit,
                }}
              />
            </SectionCard>
          ) : (
            <SectionCard title="Move this item" bodyClassName="">
              <EmptyState
                icon={<Lock size={20} />}
                title="Read-only access"
                description="Your role does not include recording stock movements."
              />
            </SectionCard>
          )}
        </div>

        <SectionCard
          title="Movement history"
          description="Newest first"
          bodyClassName="overflow-x-auto"
        >
          {movements.length === 0 ? (
            <EmptyState
              icon={<ArrowLeftRight size={20} />}
              title="No movements yet"
              description="Receipts and issues for this item will be listed here."
            />
          ) : (
            <table className="table-shell min-w-[560px]">
              <thead>
                <tr>
                  <th>Type</th>
                  <th className="text-right">Change</th>
                  <th className="text-right">Balance</th>
                  <th>By</th>
                  <th>Note</th>
                  <th className="text-right">When</th>
                </tr>
              </thead>
              <tbody>
                {movements.map((m) => (
                  <tr key={m.id}>
                    <td>
                      <MovementTypeBadge type={m.type} withLabel />
                    </td>
                    <td
                      className={`text-right font-semibold tabular-nums ${
                        m.type === "OUT" || m.quantity < 0 ? "text-gold-300" : "text-brand-300"
                      }`}
                    >
                      {m.type === "OUT" || m.quantity < 0 ? "−" : "+"}
                      {formatNumber(Math.abs(m.quantity))}
                    </td>
                    <td className="text-right tabular-nums text-white/70">
                      {formatNumber(m.balance_after)}
                    </td>
                    <td className="text-white/60">{m.user_name ?? "Removed user"}</td>
                    <td className="max-w-[200px] truncate text-white/45">{m.note ?? "—"}</td>
                    <td className="whitespace-nowrap text-right text-xs text-white/35">
                      {formatDate(m.created_at)}
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
