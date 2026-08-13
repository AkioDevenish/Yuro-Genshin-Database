export const CURRENCY = process.env.NEXT_PUBLIC_CURRENCY || "USD";

export function formatCurrency(value: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: CURRENCY,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value || 0);
}

/** Headline figures read better without cents. */
export function formatCurrencyCompact(value: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: CURRENCY,
    maximumFractionDigits: 0,
  }).format(value || 0);
}

export function formatNumber(value: number): string {
  return new Intl.NumberFormat("en-US").format(value || 0);
}

const IRREGULAR_UNITS: Record<string, string> = {
  box: "boxes",
  batch: "batches",
  pair: "pairs",
};

/** "24 units", "3 boxes", "1 ream" — units are free text, so keep the rule simple. */
export function formatUnits(quantity: number, unit: string): string {
  const singular = unit.trim() || "unit";
  if (quantity === 1) return `${formatNumber(quantity)} ${singular}`;
  const plural =
    IRREGULAR_UNITS[singular.toLowerCase()] ??
    (/(s|x|z|ch|sh)$/i.test(singular) ? `${singular}es` : `${singular}s`);
  return `${formatNumber(quantity)} ${plural}`;
}

export type Timestamp = string | Date;

/** The driver hands back `Date` for timestamptz columns; strings may still arrive from forms. */
function toDate(value: Timestamp): Date {
  if (value instanceof Date) return value;
  return new Date(value.includes("T") ? value : `${value.replace(" ", "T")}Z`);
}

export function formatDate(value: Timestamp | null | undefined): string {
  if (!value) return "—";
  return toDate(value).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export function formatDateTime(value: Timestamp | null | undefined): string {
  if (!value) return "—";
  return toDate(value).toLocaleString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function relativeTime(value: Timestamp | null | undefined): string {
  if (!value) return "—";
  const diff = Date.now() - toDate(value).getTime();
  const minutes = Math.round(diff / 60000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  if (days < 30) return `${days}d ago`;
  return formatDate(value);
}

export function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}
