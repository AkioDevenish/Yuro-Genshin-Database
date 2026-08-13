import { ROLE_LABELS, type Role } from "@/lib/roles";

const STYLES: Record<Role, string> = {
  ADMIN: "border-gold-400/35 bg-gold-400/10 text-gold-300",
  MANAGER: "border-brand-400/35 bg-brand-500/10 text-brand-300",
  STAFF: "border-sky-400/35 bg-sky-400/10 text-sky-300",
  VIEWER: "border-white/15 bg-white/5 text-white/60",
};

export function RoleBadge({ role, className = "" }: { role: Role; className?: string }) {
  return (
    <span className={`chip ${STYLES[role] ?? STYLES.VIEWER} ${className}`}>
      {ROLE_LABELS[role] ?? role}
    </span>
  );
}
