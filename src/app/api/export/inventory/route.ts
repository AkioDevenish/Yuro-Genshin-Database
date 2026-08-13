import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { can } from "@/lib/roles";
import { listItems, type ItemFilters } from "@/lib/queries";

function csvCell(value: unknown): string {
  const text = value == null ? "" : String(value);
  return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

export async function GET(request: Request) {
  const user = await getCurrentUser();
  if (!user || !can(user.role, "reports.view")) {
    return new NextResponse("Forbidden", { status: 403 });
  }

  const params = new URL(request.url).searchParams;
  const filters: ItemFilters = {
    search: params.get("q") ?? undefined,
    categoryId: Number(params.get("category")) || undefined,
    locationId: Number(params.get("location")) || undefined,
    stock: (params.get("stock") as ItemFilters["stock"]) ?? "all",
    sort: (params.get("sort") as ItemFilters["sort"]) ?? "name",
  };

  const header = [
    "SKU",
    "Name",
    "Category",
    "Location",
    "Unit",
    "Quantity",
    "Minimum",
    "Unit cost",
    "Total value",
    "Supplier",
    "Description",
    "Last updated",
  ];

  const rows = listItems(filters).map((item) => [
    item.sku,
    item.name,
    item.category_name ?? "",
    item.location_name ?? "",
    item.unit,
    item.quantity,
    item.min_quantity,
    item.unit_cost.toFixed(2),
    (item.quantity * item.unit_cost).toFixed(2),
    item.supplier ?? "",
    item.description ?? "",
    item.updated_at,
  ]);

  const csv = [header, ...rows].map((row) => row.map(csvCell).join(",")).join("\r\n");
  const stamp = new Date().toISOString().slice(0, 10);

  return new NextResponse(`﻿${csv}`, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="iica-inventory-${stamp}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
