import { ArrowDownLeft, ArrowUpRight, SlidersHorizontal } from "lucide-react";

const CONFIG = {
  IN: {
    label: "Received",
    icon: ArrowDownLeft,
    className: "border-brand-400/30 bg-brand-500/10 text-brand-300",
  },
  OUT: {
    label: "Issued",
    icon: ArrowUpRight,
    className: "border-gold-400/30 bg-gold-400/10 text-gold-300",
  },
  ADJUST: {
    label: "Adjusted",
    icon: SlidersHorizontal,
    className: "border-sky-400/30 bg-sky-400/10 text-sky-300",
  },
} as const;

export type MovementType = keyof typeof CONFIG;

export function MovementTypeBadge({
  type,
  withLabel = false,
}: {
  type: MovementType;
  withLabel?: boolean;
}) {
  const config = CONFIG[type] ?? CONFIG.ADJUST;
  const Icon = config.icon;

  if (withLabel) {
    return (
      <span className={`chip ${config.className}`}>
        <Icon size={12} /> {config.label}
      </span>
    );
  }

  return (
    <span
      className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border ${config.className}`}
      title={config.label}
    >
      <Icon size={14} />
    </span>
  );
}

export function movementLabel(type: MovementType) {
  return (CONFIG[type] ?? CONFIG.ADJUST).label;
}
