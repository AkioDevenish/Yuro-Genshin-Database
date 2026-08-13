import { requireUser } from "@/lib/auth";
import { can } from "@/lib/roles";
import { AppShell } from "@/components/app-shell";
import { NAV_SECTIONS } from "@/components/nav-config";
import { logoutAction } from "../(auth)/login/actions";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();

  const sections = NAV_SECTIONS.map((section) => ({
    ...section,
    items: section.items.filter((item) => can(user.role, item.permission)),
  })).filter((section) => section.items.length > 0);

  return (
    <AppShell
      sections={sections}
      user={{ name: user.name, email: user.email, role: user.role }}
      logout={logoutAction}
    >
      {children}
    </AppShell>
  );
}
