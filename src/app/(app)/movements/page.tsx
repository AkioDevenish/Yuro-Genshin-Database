import Link from "next/link";
import { ArrowLeftRight, Lock } from "lucide-react";
import { requirePermission } from "@/lib/auth";
import { can } from "@/lib/roles";
import { listItems, listMovements } from "@/lib/queries";
import { formatDateTime, formatNumber } from "@/lib/format";
import { EmptyState, PageHeader, SectionCard } from "@/components/ui";
import { MovementTypeBadge } from "@/components/movement-badge";
import { MovementForm } from "./movement-form";

export const metadata = { title: "Stock movements" };

export default async function MovementsPage() {
  const user = await requirePermission("inventory.view");
  const movements = listMovements({ limit: 100 });
  const items = listItems().map((i) => ({
    id: i.id,
    name: i.name,
    sku: i.sku,
    quantity: i.quantity,
    unit: i.unit,
  }));

  return (
    <>
      <PageHeader
        eyebrow="Warehouse"
        title="Stock movements"
        description="Receipts, issues and stock corrections — every change is attributed and permanent."
      />

      <div className="grid gap-5 xl:grid-cols-[360px_1fr]">
        <div className="xl:sticky xl:top-6 xl:self-start">
          <SectionCard
            title="Record a movement"
            description="Updates the item balance immediately"
            bodyClassName="px-5 py-5"
          >
            {can(user.role, "movement.record") ? (
              items.length === 0 ? (
                <EmptyState
                  title="No items yet"
                  description="Add items to the catalogue before recording movements."
                />
              ) : (
                <MovementForm items={items} />
              )
            ) : (
              <EmptyState
                icon={<Lock size={20} />}
                title="Read-only access"
                description="Your role can view the movement history but not record new movements."
              />
            )}
          </SectionCard>
        </div>

        <SectionCard
          title="History"
          description={`Showing the ${formatNumber(movements.length)} most recent movements`}
          bodyClassName="overflow-x-auto"
        >
          {movements.length === 0 ? (
            <EmptyState
              icon={<ArrowLeftRight size={20} />}
              title="No movements yet"
              description="Once stock starts moving, the full history appears here."
            />
          ) : (
            <table className="table-shell min-w-[720px]">
              <thead>
                <tr>
                  <th>Type</th>
                  <th>Item</th>
                  <th className="text-right">Change</th>
                  <th className="text-right">Balance</th>
                  <th>Recorded by</th>
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
                    <td>
                      <Link
                        href={`/inventory/${m.item_id}`}
                        className="font-medium text-white hover:text-brand-300"
                      >
                        {m.item_name}
                      </Link>
                      <div className="font-mono text-xs text-white/35">{m.item_sku}</div>
                    </td>
                    <td
                      className={`text-right font-semibold tabular-nums ${
                        m.quantity < 0 || m.type === "OUT" ? "text-gold-300" : "text-brand-300"
                      }`}
                    >
                      {m.type === "OUT" ? "−" : m.quantity < 0 ? "−" : "+"}
                      {formatNumber(Math.abs(m.quantity))}
                    </td>
                    <td className="text-right tabular-nums text-white/70">
                      {formatNumber(m.balance_after)}
                    </td>
                    <td className="text-white/60">{m.user_name ?? "Removed user"}</td>
                    <td className="max-w-[220px] truncate text-white/45">{m.note ?? "—"}</td>
                    <td className="whitespace-nowrap text-right text-xs text-white/35">
                      {formatDateTime(m.created_at)}
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
