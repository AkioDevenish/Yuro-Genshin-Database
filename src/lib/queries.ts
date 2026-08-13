import "server-only";
import { sql } from "./db";
import type { Role } from "./roles";

export type ItemRow = {
  id: number;
  sku: string;
  name: string;
  description: string | null;
  category_id: number | null;
  location_id: number | null;
  category_name: string | null;
  location_name: string | null;
  unit: string;
  quantity: number;
  min_quantity: number;
  unit_cost: number;
  supplier: string | null;
  created_at: Date;
  updated_at: Date;
};

export type MovementRow = {
  id: number;
  item_id: number;
  item_name: string;
  item_sku: string;
  user_name: string | null;
  type: "IN" | "OUT" | "ADJUST";
  quantity: number;
  balance_after: number;
  note: string | null;
  created_at: Date;
};

export type UserRow = {
  id: number;
  name: string;
  email: string;
  role: Role;
  status: "ACTIVE" | "DISABLED";
  created_at: Date;
  last_login_at: Date | null;
};

export type TaxonomyRow = {
  id: number;
  name: string;
  description: string | null;
  created_at: Date;
  item_count: number;
};

/**
 * `unit_cost` is NUMERIC in the database, which the driver hands back as a
 * string; every read casts it to float8 so the app always sees a number.
 */
const ITEM_SELECT = `
  SELECT i.id, i.sku, i.name, i.description, i.category_id, i.location_id,
         i.unit, i.quantity, i.min_quantity, i.unit_cost::float8 AS unit_cost,
         i.supplier, i.created_at, i.updated_at,
         c.name AS category_name, l.name AS location_name
  FROM items i
  LEFT JOIN categories c ON c.id = i.category_id
  LEFT JOIN locations  l ON l.id = i.location_id
`;

export type ItemFilters = {
  search?: string;
  categoryId?: number;
  locationId?: number;
  stock?: "all" | "low" | "out";
  sort?: "name" | "quantity" | "value" | "updated";
};

export async function listItems(filters: ItemFilters = {}): Promise<ItemRow[]> {
  const where: string[] = [];
  const params: unknown[] = [];

  if (filters.search) {
    const n = params.length;
    where.push(
      `(i.name ILIKE $${n + 1} OR i.sku ILIKE $${n + 1} OR i.supplier ILIKE $${n + 1} OR i.description ILIKE $${n + 1})`,
    );
    params.push(`%${filters.search}%`);
  }
  if (filters.categoryId) {
    where.push(`i.category_id = $${params.length + 1}`);
    params.push(filters.categoryId);
  }
  if (filters.locationId) {
    where.push(`i.location_id = $${params.length + 1}`);
    params.push(filters.locationId);
  }
  if (filters.stock === "low") where.push("i.quantity > 0 AND i.quantity <= i.min_quantity");
  if (filters.stock === "out") where.push("i.quantity = 0");

  const orderBy =
    filters.sort === "quantity"
      ? "i.quantity ASC"
      : filters.sort === "value"
        ? "(i.quantity * i.unit_cost) DESC"
        : filters.sort === "updated"
          ? "i.updated_at DESC"
          : "lower(i.name) ASC";

  const query = `${ITEM_SELECT} ${where.length ? `WHERE ${where.join(" AND ")}` : ""} ORDER BY ${orderBy}`;
  return sql.unsafe<ItemRow[]>(query, params as never[]);
}

export async function getItem(id: number): Promise<ItemRow | undefined> {
  const rows = await sql.unsafe<ItemRow[]>(`${ITEM_SELECT} WHERE i.id = $1`, [id] as never[]);
  return rows[0];
}

export async function listMovements(
  options: { itemId?: number; limit?: number } = {},
): Promise<MovementRow[]> {
  const limit = options.limit ?? 50;
  if (options.itemId) {
    return sql<MovementRow[]>`
      SELECT m.*, i.name AS item_name, i.sku AS item_sku, u.name AS user_name
      FROM movements m
      JOIN items i ON i.id = m.item_id
      LEFT JOIN users u ON u.id = m.user_id
      WHERE m.item_id = ${options.itemId}
      ORDER BY m.created_at DESC, m.id DESC
      LIMIT ${limit}`;
  }
  return sql<MovementRow[]>`
    SELECT m.*, i.name AS item_name, i.sku AS item_sku, u.name AS user_name
    FROM movements m
    JOIN items i ON i.id = m.item_id
    LEFT JOIN users u ON u.id = m.user_id
    ORDER BY m.created_at DESC, m.id DESC
    LIMIT ${limit}`;
}

export async function listCategories(): Promise<TaxonomyRow[]> {
  return sql<TaxonomyRow[]>`
    SELECT c.*, (SELECT COUNT(*)::int FROM items i WHERE i.category_id = c.id) AS item_count
    FROM categories c ORDER BY lower(c.name)`;
}

export async function listLocations(): Promise<TaxonomyRow[]> {
  return sql<TaxonomyRow[]>`
    SELECT l.*, (SELECT COUNT(*)::int FROM items i WHERE i.location_id = l.id) AS item_count
    FROM locations l ORDER BY lower(l.name)`;
}

export async function listUsers(): Promise<UserRow[]> {
  return sql<UserRow[]>`
    SELECT id, name, email, role, status, created_at, last_login_at
    FROM users ORDER BY lower(name)`;
}

export type AuditRow = {
  id: number;
  user_label: string | null;
  action: string;
  entity: string;
  entity_id: string | null;
  details: string | null;
  created_at: Date;
};

export async function listAuditLogs(limit = 100): Promise<AuditRow[]> {
  return sql<AuditRow[]>`
    SELECT id, user_label, action, entity, entity_id, details, created_at
    FROM audit_logs ORDER BY created_at DESC, id DESC LIMIT ${limit}`;
}

export type DashboardStats = {
  totalItems: number;
  totalUnits: number;
  totalValue: number;
  lowStock: number;
  outOfStock: number;
  categories: number;
  locations: number;
  activeUsers: number;
  movementsThisWeek: number;
};

export async function dashboardStats(): Promise<DashboardStats> {
  const [row] = await sql<DashboardStats[]>`
    SELECT
      (SELECT COUNT(*)::int FROM items) AS "totalItems",
      (SELECT COALESCE(SUM(quantity), 0)::int FROM items) AS "totalUnits",
      (SELECT COALESCE(SUM(quantity * unit_cost), 0)::float8 FROM items) AS "totalValue",
      (SELECT COUNT(*)::int FROM items WHERE quantity > 0 AND quantity <= min_quantity) AS "lowStock",
      (SELECT COUNT(*)::int FROM items WHERE quantity = 0) AS "outOfStock",
      (SELECT COUNT(*)::int FROM categories) AS categories,
      (SELECT COUNT(*)::int FROM locations) AS locations,
      (SELECT COUNT(*)::int FROM users WHERE status = 'ACTIVE') AS "activeUsers",
      (SELECT COUNT(*)::int FROM movements WHERE created_at >= now() - interval '7 days')
        AS "movementsThisWeek"`;
  return row;
}

export type BreakdownRow = { name: string; items: number; units: number; value: number };

export async function stockByCategory(): Promise<BreakdownRow[]> {
  return sql<BreakdownRow[]>`
    SELECT COALESCE(c.name, 'Uncategorised') AS name,
           COUNT(i.id)::int AS items,
           COALESCE(SUM(i.quantity), 0)::int AS units,
           COALESCE(SUM(i.quantity * i.unit_cost), 0)::float8 AS value
    FROM items i
    LEFT JOIN categories c ON c.id = i.category_id
    GROUP BY c.id, c.name
    ORDER BY value DESC`;
}

export async function stockByLocation(): Promise<BreakdownRow[]> {
  return sql<BreakdownRow[]>`
    SELECT COALESCE(l.name, 'Unassigned') AS name,
           COUNT(i.id)::int AS items,
           COALESCE(SUM(i.quantity), 0)::int AS units,
           COALESCE(SUM(i.quantity * i.unit_cost), 0)::float8 AS value
    FROM items i
    LEFT JOIN locations l ON l.id = i.location_id
    GROUP BY l.id, l.name
    ORDER BY value DESC`;
}

export type TrendRow = { day: string; inbound: number; outbound: number };

export async function movementTrend(days = 14): Promise<TrendRow[]> {
  return sql<TrendRow[]>`
    SELECT to_char(created_at, 'YYYY-MM-DD') AS day,
           COALESCE(SUM(CASE WHEN type = 'IN'  THEN quantity ELSE 0 END), 0)::int AS inbound,
           COALESCE(SUM(CASE WHEN type = 'OUT' THEN quantity ELSE 0 END), 0)::int AS outbound
    FROM movements
    WHERE created_at >= now() - make_interval(days => ${days})
    GROUP BY day
    ORDER BY day`;
}

export async function lowStockItems(limit = 8): Promise<ItemRow[]> {
  return sql.unsafe<ItemRow[]>(
    `${ITEM_SELECT} WHERE i.quantity <= i.min_quantity
     ORDER BY (i.quantity - i.min_quantity) ASC, lower(i.name) LIMIT $1`,
    [limit] as never[],
  );
}
