import { ShieldCheck } from "lucide-react";
import { requirePermission } from "@/lib/auth";
import { listAuditLogs } from "@/lib/queries";
import { formatDateTime } from "@/lib/format";
import { EmptyState, PageHeader, SectionCard } from "@/components/ui";

export const metadata = { title: "Audit trail" };

const ACTION_STYLES: Record<string, string> = {
  CREATE: "border-brand-400/30 bg-brand-500/10 text-brand-300",
  UPDATE: "border-sky-400/30 bg-sky-400/10 text-sky-300",
  DELETE: "border-rose-400/30 bg-rose-500/10 text-rose-300",
  SIGN_IN: "border-white/15 bg-white/5 text-white/55",
  RESET_PASSWORD: "border-gold-400/30 bg-gold-400/10 text-gold-300",
};

function styleFor(action: string) {
  if (action.startsWith("MOVEMENT_")) return "border-gold-400/30 bg-gold-400/10 text-gold-300";
  return ACTION_STYLES[action] ?? "border-white/15 bg-white/5 text-white/55";
}

export default async function AuditPage() {
  await requirePermission("audit.view");
  const logs = await listAuditLogs(200);

  return (
    <>
      <PageHeader
        eyebrow="Administration"
        title="Audit trail"
        description="An append-only record of who changed what, kept for accountability and audits."
      />

      <SectionCard
        title="Recent activity"
        description={`Showing the ${logs.length} most recent entries`}
        bodyClassName="overflow-x-auto"
      >
        {logs.length === 0 ? (
          <EmptyState icon={<ShieldCheck size={20} />} title="Nothing recorded yet" />
        ) : (
          <table className="table-shell min-w-[720px]">
            <thead>
              <tr>
                <th>When</th>
                <th>Who</th>
                <th>Action</th>
                <th>Entity</th>
                <th>Details</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((log) => (
                <tr key={log.id}>
                  <td className="whitespace-nowrap text-xs text-white/45">
                    {formatDateTime(log.created_at)}
                  </td>
                  <td className="text-white/75">{log.user_label ?? "System"}</td>
                  <td>
                    <span className={`chip ${styleFor(log.action)}`}>
                      {log.action.replace(/_/g, " ").toLowerCase()}
                    </span>
                  </td>
                  <td className="text-white/55">
                    {log.entity}
                    {log.entity_id ? <span className="text-white/30"> #{log.entity_id}</span> : null}
                  </td>
                  <td className="max-w-[320px] truncate text-white/45">{log.details ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </SectionCard>
    </>
  );
}
