import type { ReactNode } from "react";

export function PageHeader({
  eyebrow,
  title,
  description,
  actions,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  actions?: ReactNode;
}) {
  return (
    <div className="animate-rise mb-7 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0">
        {eyebrow && (
          <div className="mb-1.5 text-[11px] font-semibold uppercase tracking-[0.18em] text-brand-400">
            {eyebrow}
          </div>
        )}
        <h1 className="text-2xl font-semibold tracking-tight text-white sm:text-[1.7rem]">
          {title}
        </h1>
        {description && (
          <p className="mt-1.5 max-w-2xl text-sm leading-relaxed text-white/45">{description}</p>
        )}
      </div>
      {actions && <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

export function StatCard({
  label,
  value,
  hint,
  icon,
  tone = "default",
}: {
  label: string;
  value: string;
  hint?: string;
  icon?: ReactNode;
  tone?: "default" | "warn" | "danger" | "good";
}) {
  const tones = {
    default: "text-white",
    good: "text-brand-300",
    warn: "text-gold-300",
    danger: "text-rose-300",
  } as const;

  return (
    <div className="panel p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-white/40">
          {label}
        </div>
        {icon && (
          <span className="flex h-8 w-8 items-center justify-center rounded-lg border border-white/10 bg-white/[0.03] text-white/45">
            {icon}
          </span>
        )}
      </div>
      <div className={`mt-3 text-[1.75rem] font-semibold tracking-tight ${tones[tone]}`}>
        {value}
      </div>
      {hint && <div className="mt-1 text-xs text-white/35">{hint}</div>}
    </div>
  );
}

export function SectionCard({
  title,
  description,
  action,
  children,
  bodyClassName = "",
}: {
  title: string;
  description?: string;
  action?: ReactNode;
  children: ReactNode;
  bodyClassName?: string;
}) {
  return (
    <section className="panel overflow-hidden">
      <header className="flex items-start justify-between gap-3 border-b border-white/8 px-5 py-4">
        <div>
          <h2 className="text-sm font-semibold tracking-tight text-white">{title}</h2>
          {description && <p className="mt-0.5 text-xs text-white/40">{description}</p>}
        </div>
        {action}
      </header>
      <div className={bodyClassName}>{children}</div>
    </section>
  );
}

export function EmptyState({
  icon,
  title,
  description,
  action,
}: {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-14 text-center">
      {icon && (
        <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.03] text-white/35">
          {icon}
        </div>
      )}
      <div className="text-sm font-semibold text-white/85">{title}</div>
      {description && <p className="mt-1.5 max-w-sm text-sm text-white/40">{description}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

export function StockPill({ quantity, min }: { quantity: number; min: number }) {
  if (quantity === 0) {
    return <span className="chip border-rose-400/35 bg-rose-500/10 text-rose-300">Out of stock</span>;
  }
  if (quantity <= min) {
    return <span className="chip border-gold-400/35 bg-gold-400/10 text-gold-300">Low stock</span>;
  }
  return <span className="chip border-brand-400/30 bg-brand-500/10 text-brand-300">In stock</span>;
}

/** Horizontal proportion bar used across the dashboard and reports. */
export function MeterRow({
  label,
  value,
  max,
  caption,
}: {
  label: string;
  value: number;
  max: number;
  caption: string;
}) {
  const pct = max > 0 ? Math.max(2, Math.round((value / max) * 100)) : 0;
  return (
    <div>
      <div className="flex items-baseline justify-between gap-3 text-sm">
        <span className="truncate text-white/80">{label}</span>
        <span className="shrink-0 text-xs text-white/45">{caption}</span>
      </div>
      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/[0.06]">
        <div
          className="h-full rounded-full bg-gradient-to-r from-brand-500 to-brand-300"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}
