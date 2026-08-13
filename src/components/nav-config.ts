import type { Permission } from "@/lib/roles";

export type NavItem = {
  href: string;
  label: string;
  icon: string;
  permission: Permission;
  description: string;
};

export type NavSection = {
  title: string;
  items: NavItem[];
};

/** Icon names map to the lookup in `app-shell.tsx` (keeps this file server-safe). */
export const NAV_SECTIONS: NavSection[] = [
  {
    title: "Overview",
    items: [
      {
        href: "/dashboard",
        label: "Dashboard",
        icon: "gauge",
        permission: "inventory.view",
        description: "Live stock position",
      },
      {
        href: "/reports",
        label: "Reports",
        icon: "chart",
        permission: "reports.view",
        description: "Valuation and breakdowns",
      },
    ],
  },
  {
    title: "Warehouse",
    items: [
      {
        href: "/inventory",
        label: "Inventory",
        icon: "boxes",
        permission: "inventory.view",
        description: "The item catalogue",
      },
      {
        href: "/movements",
        label: "Stock movements",
        icon: "arrows",
        permission: "inventory.view",
        description: "Receipts, issues, corrections",
      },
      {
        href: "/categories",
        label: "Categories",
        icon: "tags",
        permission: "taxonomy.manage",
        description: "Group the catalogue",
      },
      {
        href: "/locations",
        label: "Locations",
        icon: "pin",
        permission: "taxonomy.manage",
        description: "Stores and offices",
      },
    ],
  },
  {
    title: "Administration",
    items: [
      {
        href: "/users",
        label: "Users & access",
        icon: "users",
        permission: "users.manage",
        description: "Accounts and roles",
      },
      {
        href: "/audit",
        label: "Audit trail",
        icon: "shield",
        permission: "audit.view",
        description: "Everything that happened",
      },
    ],
  },
];
