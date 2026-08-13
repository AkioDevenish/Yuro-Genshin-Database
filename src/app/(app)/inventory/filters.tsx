"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { Loader2, Search, X } from "lucide-react";

type Option = { id: number; name: string };

export function InventoryFilters({
  categories,
  locations,
}: {
  categories: Option[];
  locations: Option[];
}) {
  const router = useRouter();
  const params = useSearchParams();
  const [pending, startTransition] = useTransition();
  const [search, setSearch] = useState(params.get("q") ?? "");

  const apply = (key: string, value: string) => {
    const next = new URLSearchParams(params.toString());
    if (value) next.set(key, value);
    else next.delete(key);
    startTransition(() => router.replace(`/inventory?${next.toString()}`, { scroll: false }));
  };

  // Debounce free-text search so typing does not fire a request per keystroke.
  useEffect(() => {
    const current = params.get("q") ?? "";
    if (search === current) return;
    const timer = setTimeout(() => apply("q", search), 300);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  const hasFilters = ["q", "category", "location", "stock", "sort"].some((k) => params.get(k));

  return (
    <div className="mb-4 flex flex-wrap items-center gap-2.5">
      <div className="relative min-w-[220px] flex-1">
        <Search
          size={15}
          className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-white/30"
        />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by name, SKU or supplier…"
          className="field pl-9"
          aria-label="Search inventory"
        />
        {pending && (
          <Loader2
            size={15}
            className="absolute right-3 top-1/2 -translate-y-1/2 animate-spin text-white/35"
          />
        )}
      </div>

      <select
        value={params.get("category") ?? ""}
        onChange={(e) => apply("category", e.target.value)}
        className="field w-auto min-w-[150px]"
        aria-label="Filter by category"
      >
        <option value="">All categories</option>
        {categories.map((c) => (
          <option key={c.id} value={c.id}>
            {c.name}
          </option>
        ))}
      </select>

      <select
        value={params.get("location") ?? ""}
        onChange={(e) => apply("location", e.target.value)}
        className="field w-auto min-w-[150px]"
        aria-label="Filter by location"
      >
        <option value="">All locations</option>
        {locations.map((l) => (
          <option key={l.id} value={l.id}>
            {l.name}
          </option>
        ))}
      </select>

      <select
        value={params.get("stock") ?? ""}
        onChange={(e) => apply("stock", e.target.value)}
        className="field w-auto min-w-[140px]"
        aria-label="Filter by stock level"
      >
        <option value="">Any stock level</option>
        <option value="low">Low stock</option>
        <option value="out">Out of stock</option>
      </select>

      <select
        value={params.get("sort") ?? "name"}
        onChange={(e) => apply("sort", e.target.value === "name" ? "" : e.target.value)}
        className="field w-auto min-w-[140px]"
        aria-label="Sort"
      >
        <option value="name">Sort: name</option>
        <option value="quantity">Sort: lowest stock</option>
        <option value="value">Sort: highest value</option>
        <option value="updated">Sort: recently updated</option>
      </select>

      {hasFilters && (
        <button
          className="btn btn-ghost"
          onClick={() => startTransition(() => router.replace("/inventory", { scroll: false }))}
        >
          <X size={14} /> Clear
        </button>
      )}
    </div>
  );
}
