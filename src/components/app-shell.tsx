"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import {
  ArrowLeftRight,
  BarChart3,
  Boxes,
  Gauge,
  LogOut,
  MapPin,
  Menu,
  ShieldCheck,
  Tags,
  Users,
  X,
} from "lucide-react";
import { BrandLockup, BrandMark } from "./brand";
import { RoleBadge } from "./role-badge";
import type { NavSection } from "./nav-config";
import type { Role } from "@/lib/roles";
import { initials } from "@/lib/format";

const ICONS: Record<string, React.ComponentType<{ size?: number }>> = {
  gauge: Gauge,
  chart: BarChart3,
  boxes: Boxes,
  arrows: ArrowLeftRight,
  tags: Tags,
  pin: MapPin,
  users: Users,
  shield: ShieldCheck,
};

type Props = {
  sections: NavSection[];
  user: { name: string; email: string; role: Role };
  logout: () => Promise<void>;
  children: React.ReactNode;
};

export function AppShell({ sections, user, logout, children }: Props) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  useEffect(() => setOpen(false), [pathname]);

  const nav = (
    <nav className="flex-1 space-y-6 overflow-y-auto px-3 py-2">
      {sections.map((section) => (
        <div key={section.title}>
          <div className="px-3 pb-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-white/30">
            {section.title}
          </div>
          <ul className="space-y-0.5">
            {section.items.map((item) => {
              const Icon = ICONS[item.icon] ?? Boxes;
              const active =
                pathname === item.href || pathname.startsWith(`${item.href}/`);
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className={`group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition ${
                      active
                        ? "bg-white/[0.07] font-semibold text-white shadow-[inset_0_1px_0_0_rgba(255,255,255,0.06)]"
                        : "text-white/55 hover:bg-white/[0.04] hover:text-white/90"
                    }`}
                  >
                    <span
                      className={`flex h-7 w-7 items-center justify-center rounded-lg border transition ${
                        active
                          ? "border-brand-400/40 bg-brand-500/15 text-brand-300"
                          : "border-white/10 bg-white/[0.03] text-white/45 group-hover:text-white/70"
                      }`}
                    >
                      <Icon size={15} />
                    </span>
                    <span className="truncate">{item.label}</span>
                    {active && (
                      <span className="ml-auto h-1.5 w-1.5 rounded-full bg-brand-400" />
                    )}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </nav>
  );

  const account = (
    <div className="border-t border-white/8 p-3">
      <Link
        href="/profile"
        className="flex items-center gap-3 rounded-xl p-2 transition hover:bg-white/[0.05]"
      >
        <span className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-brand-400 to-brand-700 text-xs font-bold text-ink-950">
          {initials(user.name)}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-medium text-white">{user.name}</span>
          <span className="block truncate text-xs text-white/40">{user.email}</span>
        </span>
      </Link>
      <div className="mt-2 flex items-center justify-between gap-2 px-2">
        <RoleBadge role={user.role} />
        <form action={logout}>
          <button
            type="submit"
            className="flex items-center gap-1.5 rounded-lg px-2 py-1 text-xs text-white/45 transition hover:bg-white/5 hover:text-rose-300"
          >
            <LogOut size={13} /> Sign out
          </button>
        </form>
      </div>
    </div>
  );

  return (
    <div className="flex min-h-screen">
      {/* Desktop sidebar */}
      <aside className="sticky top-0 hidden h-screen w-[264px] shrink-0 flex-col border-r border-white/8 bg-ink-900/60 backdrop-blur-xl lg:flex">
        <div className="px-5 py-5">
          <BrandLockup />
        </div>
        {nav}
        {account}
      </aside>

      {/* Mobile drawer */}
      {open && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div
            className="absolute inset-0 bg-ink-950/80 backdrop-blur-sm"
            onClick={() => setOpen(false)}
          />
          <aside className="absolute inset-y-0 left-0 flex w-[280px] flex-col border-r border-white/10 bg-ink-900">
            <div className="flex items-center justify-between px-5 py-5">
              <BrandLockup />
              <button
                onClick={() => setOpen(false)}
                className="rounded-lg p-1.5 text-white/50 hover:bg-white/5 hover:text-white"
                aria-label="Close navigation"
              >
                <X size={18} />
              </button>
            </div>
            {nav}
            {account}
          </aside>
        </div>
      )}

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-40 flex items-center gap-3 border-b border-white/8 bg-ink-950/70 px-4 py-3 backdrop-blur-xl lg:hidden">
          <button
            onClick={() => setOpen(true)}
            className="rounded-lg p-2 text-white/60 hover:bg-white/5 hover:text-white"
            aria-label="Open navigation"
          >
            <Menu size={18} />
          </button>
          <BrandMark size={28} />
          <span className="text-sm font-semibold text-white">IICA Inventory</span>
        </header>

        <main className="min-w-0 flex-1 px-4 py-6 sm:px-6 lg:px-8 lg:py-8">{children}</main>
      </div>
    </div>
  );
}
