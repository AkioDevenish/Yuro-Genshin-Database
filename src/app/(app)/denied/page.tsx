import Link from "next/link";
import { Lock } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { ROLE_DESCRIPTIONS } from "@/lib/roles";
import { RoleBadge } from "@/components/role-badge";

export const metadata = { title: "Access denied" };

const PERMISSION_NAMES: Record<string, string> = {
  "inventory.view": "viewing the inventory",
  "inventory.manage": "creating or editing items",
  "movement.record": "recording stock movements",
  "taxonomy.manage": "managing categories and locations",
  "reports.view": "viewing reports",
  "users.manage": "managing user accounts",
  "audit.view": "viewing the audit trail",
};

export default async function DeniedPage({
  searchParams,
}: {
  searchParams: Promise<{ permission?: string }>;
}) {
  const user = await requireUser();
  const { permission } = await searchParams;
  const activity = permission ? PERMISSION_NAMES[permission] : undefined;

  return (
    <div className="mx-auto flex max-w-md flex-col items-center py-20 text-center">
      <span className="flex h-14 w-14 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.03] text-white/40">
        <Lock size={22} />
      </span>
      <h1 className="mt-6 text-xl font-semibold tracking-tight text-white">
        You do not have access to this page
      </h1>
      <p className="mt-2 text-sm leading-relaxed text-white/45">
        {activity
          ? `Your access level does not include ${activity}.`
          : "Your access level does not include this part of the system."}{" "}
        Ask an administrator if you need it.
      </p>
      <div className="mt-5 flex items-center gap-2">
        <span className="text-xs text-white/35">Your level:</span>
        <RoleBadge role={user.role} />
      </div>
      <p className="mt-2 max-w-xs text-xs text-white/35">{ROLE_DESCRIPTIONS[user.role]}</p>
      <Link href="/dashboard" className="btn btn-primary mt-7">
        Back to the dashboard
      </Link>
    </div>
  );
}
