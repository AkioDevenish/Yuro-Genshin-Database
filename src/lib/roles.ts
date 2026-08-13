export const ROLES = ["ADMIN", "MANAGER", "STAFF", "VIEWER"] as const;

export type Role = (typeof ROLES)[number];

export const ROLE_LABELS: Record<Role, string> = {
  ADMIN: "Administrator",
  MANAGER: "Manager",
  STAFF: "Staff",
  VIEWER: "Viewer",
};

export const ROLE_DESCRIPTIONS: Record<Role, string> = {
  ADMIN: "Full control, including user accounts, settings and the audit trail.",
  MANAGER: "Manages the catalogue — items, categories, locations and stock.",
  STAFF: "Records stock movements in and out of the warehouse.",
  VIEWER: "Read-only access to inventory and reports.",
};

/**
 * Every permission the app checks. Anything not listed for a role is denied.
 */
export const PERMISSIONS = [
  "inventory.view",
  "inventory.manage",
  "movement.record",
  "taxonomy.manage",
  "reports.view",
  "users.manage",
  "audit.view",
] as const;

export type Permission = (typeof PERMISSIONS)[number];

const ROLE_PERMISSIONS: Record<Role, Permission[]> = {
  VIEWER: ["inventory.view", "reports.view"],
  STAFF: ["inventory.view", "reports.view", "movement.record"],
  MANAGER: [
    "inventory.view",
    "reports.view",
    "movement.record",
    "inventory.manage",
    "taxonomy.manage",
  ],
  ADMIN: [...PERMISSIONS],
};

export function can(role: Role | undefined | null, permission: Permission): boolean {
  if (!role) return false;
  return ROLE_PERMISSIONS[role]?.includes(permission) ?? false;
}

export function isRole(value: unknown): value is Role {
  return typeof value === "string" && (ROLES as readonly string[]).includes(value);
}
