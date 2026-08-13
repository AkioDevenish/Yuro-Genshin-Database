import { requirePermission } from "@/lib/auth";
import { listUsers } from "@/lib/queries";
import { PERMISSIONS, ROLES, ROLE_DESCRIPTIONS, ROLE_LABELS, can } from "@/lib/roles";
import { formatDate, initials, relativeTime } from "@/lib/format";
import { PageHeader, SectionCard } from "@/components/ui";
import { RoleBadge } from "@/components/role-badge";
import { DeleteUserButton, EditUserButton, NewUserButton } from "./user-forms";

export const metadata = { title: "Users & access" };

const PERMISSION_LABELS: Record<string, string> = {
  "inventory.view": "View inventory",
  "reports.view": "View reports",
  "movement.record": "Record stock movements",
  "inventory.manage": "Create & edit items",
  "taxonomy.manage": "Manage categories & locations",
  "users.manage": "Manage user accounts",
  "audit.view": "View the audit trail",
};

export default async function UsersPage() {
  const admin = await requirePermission("users.manage");
  const users = listUsers();

  return (
    <>
      <PageHeader
        eyebrow="Administration"
        title="Users & access"
        description="Create accounts and decide exactly how much of the system each person can reach."
        actions={<NewUserButton />}
      />

      <SectionCard
        title={`${users.length} account${users.length === 1 ? "" : "s"}`}
        description="Disabled accounts keep their history but cannot sign in."
        bodyClassName="overflow-x-auto"
      >
        <table className="table-shell min-w-[720px]">
          <thead>
            <tr>
              <th>Person</th>
              <th>Access level</th>
              <th>Status</th>
              <th>Last sign-in</th>
              <th>Added</th>
              <th className="text-right">Manage</th>
            </tr>
          </thead>
          <tbody>
            {users.map((user) => (
              <tr key={user.id}>
                <td>
                  <div className="flex items-center gap-3">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-brand-400 to-brand-700 text-xs font-bold text-ink-950">
                      {initials(user.name)}
                    </span>
                    <div className="min-w-0">
                      <div className="truncate font-medium text-white">
                        {user.name}
                        {user.id === admin.userId && (
                          <span className="ml-2 text-xs font-normal text-white/35">you</span>
                        )}
                      </div>
                      <div className="truncate text-xs text-white/40">{user.email}</div>
                    </div>
                  </div>
                </td>
                <td>
                  <RoleBadge role={user.role} />
                </td>
                <td>
                  <span
                    className={`chip ${
                      user.status === "ACTIVE"
                        ? "border-brand-400/30 bg-brand-500/10 text-brand-300"
                        : "border-white/15 bg-white/5 text-white/45"
                    }`}
                  >
                    {user.status === "ACTIVE" ? "Active" : "Disabled"}
                  </span>
                </td>
                <td className="text-white/55">{relativeTime(user.last_login_at)}</td>
                <td className="text-white/45">{formatDate(user.created_at)}</td>
                <td>
                  <div className="flex items-center justify-end gap-1">
                    <EditUserButton user={user} isSelf={user.id === admin.userId} />
                    {user.id !== admin.userId && <DeleteUserButton user={user} />}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </SectionCard>

      <div className="mt-5">
        <SectionCard
          title="What each access level can do"
          description="Permissions are enforced on the server, not just hidden in the interface."
          bodyClassName="overflow-x-auto"
        >
          <table className="table-shell min-w-[640px]">
            <thead>
              <tr>
                <th>Permission</th>
                {ROLES.map((role) => (
                  <th key={role} className="text-center">
                    {ROLE_LABELS[role]}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {PERMISSIONS.map((permission) => (
                <tr key={permission}>
                  <td className="text-white/75">{PERMISSION_LABELS[permission] ?? permission}</td>
                  {ROLES.map((role) => (
                    <td key={role} className="text-center">
                      {can(role, permission) ? (
                        <span className="text-brand-400">●</span>
                      ) : (
                        <span className="text-white/12">—</span>
                      )}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
          <div className="grid gap-3 border-t border-white/8 px-5 py-4 sm:grid-cols-2 xl:grid-cols-4">
            {ROLES.map((role) => (
              <div key={role} className="panel-flat p-3.5">
                <RoleBadge role={role} />
                <p className="mt-2 text-xs leading-relaxed text-white/45">
                  {ROLE_DESCRIPTIONS[role]}
                </p>
              </div>
            ))}
          </div>
        </SectionCard>
      </div>
    </>
  );
}
