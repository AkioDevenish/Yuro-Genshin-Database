import { requireUser } from "@/lib/auth";
import { PERMISSIONS, ROLE_DESCRIPTIONS, can } from "@/lib/roles";
import { initials } from "@/lib/format";
import { PageHeader, SectionCard } from "@/components/ui";
import { RoleBadge } from "@/components/role-badge";
import { DetailsForm, PasswordForm } from "./profile-forms";

export const metadata = { title: "Your profile" };

const PERMISSION_LABELS: Record<string, string> = {
  "inventory.view": "View the inventory",
  "reports.view": "View reports and exports",
  "movement.record": "Record stock movements",
  "inventory.manage": "Create, edit and delete items",
  "taxonomy.manage": "Manage categories and locations",
  "users.manage": "Manage user accounts",
  "audit.view": "View the audit trail",
};

export default async function ProfilePage() {
  const user = await requireUser();
  const allowed = PERMISSIONS.filter((p) => can(user.role, p));

  return (
    <>
      <PageHeader eyebrow="Account" title="Your profile" />

      <div className="grid gap-5 xl:grid-cols-[1fr_340px]">
        <div className="space-y-5">
          <SectionCard title="Your details" bodyClassName="px-5 py-5">
            <DetailsForm name={user.name} email={user.email} />
          </SectionCard>

          <SectionCard
            title="Password"
            description="Choose something you do not use anywhere else"
            bodyClassName="px-5 py-5"
          >
            <PasswordForm />
          </SectionCard>
        </div>

        <div className="space-y-5">
          <div className="panel p-6 text-center">
            <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-brand-400 to-brand-700 text-lg font-bold text-ink-950">
              {initials(user.name)}
            </span>
            <div className="mt-4 text-base font-semibold text-white">{user.name}</div>
            <div className="text-sm text-white/40">{user.email}</div>
            <div className="mt-3 flex justify-center">
              <RoleBadge role={user.role} />
            </div>
            <p className="mt-3 text-xs leading-relaxed text-white/40">
              {ROLE_DESCRIPTIONS[user.role]}
            </p>
          </div>

          <SectionCard
            title="What you can do"
            description="Granted by your access level"
            bodyClassName="divide-y divide-white/5"
          >
            {allowed.map((permission) => (
              <div key={permission} className="flex items-center gap-2.5 px-5 py-3 text-sm">
                <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-brand-400" />
                <span className="text-white/70">{PERMISSION_LABELS[permission] ?? permission}</span>
              </div>
            ))}
          </SectionCard>
        </div>
      </div>
    </>
  );
}
