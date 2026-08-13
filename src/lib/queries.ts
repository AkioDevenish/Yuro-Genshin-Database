import "server-only";
import { db } from "./db";
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
  created_at: string;
  updated_at: string;
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
  created_at: string;
};

export type UserRow = {
  id: number;
  name: string;
  email: string;
  role: Role;
  status: "ACTIVE" | "DISABLED";
  created_at: string;
  last_login_at: string | null;
};

export type TaxonomyRow = {
  id: number;
  name: string;
  description: string | null;
  created_at: string;
  item_count: number;
};

const ITEM_SELECT = `
  SELECT i.*, c.name AS category_name, l.name AS location_name
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

export function listItems(filters: ItemFilters = {}): ItemRow[] {
  const where: string[] = [];
  const params: unknown[] = [];

  if (filters.search) {
    where.push("(i.name LIKE ? OR i.sku LIKE ? OR i.supplier LIKE ? OR i.description LIKE ?)");
    const needle = `%${filters.search}%`;
    params.push(needle, needle, needle, needle);
  }
  if (filters.categoryId) {
    where.push("i.category_id = ?");
    params.push(filters.categoryId);
  }
  if (filters.locationId) {
    where.push("i.location_id = ?");
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
          : "i.name COLLATE NOCASE ASC";

  const sql = `${ITEM_SELECT} ${where.length ? `WHERE ${where.join(" AND ")}` : ""} ORDER BY ${orderBy}`;
  return db.prepare(sql).all(...params) as ItemRow[];
}

export function getItem(id: number): ItemRow | undefined {
  return db.prepare(`${ITEM_SELECT} WHERE i.id = ?`).get(id) as ItemRow | undefined;
}

export function listMovements(options: { itemId?: number; limit?: number } = {}): MovementRow[] {
  const where = options.itemId ? "WHERE m.item_id = ?" : "";
  const params = options.itemId ? [options.itemId] : [];
  return db
    .prepare(
      `SELECT m.*, i.name AS item_name, i.sku AS item_sku, u.name AS user_name
       FROM movements m
       JOIN items i ON i.id = m.item_id
       LEFT JOIN users u ON u.id = m.user_id
       ${where}
       ORDER BY m.created_at DESC, m.id DESC
       LIMIT ?`,
    )
    .all(...params, options.limit ?? 50) as MovementRow[];
}

export function listCategories(): TaxonomyRow[] {
  return db
    .prepare(
      `SELECT c.*, (SELECT COUNT(*) FROM items i WHERE i.category_id = c.id) AS item_count
       FROM categories c ORDER BY c.name COLLATE NOCASE`,
    )
    .all() as TaxonomyRow[];
}

export function listLocations(): TaxonomyRow[] {
  return db
    .prepare(
      `SELECT l.*, (SELECT COUNT(*) FROM items i WHERE i.location_id = l.id) AS item_count
       FROM locations l ORDER BY l.name COLLATE NOCASE`,
    )
    .all() as TaxonomyRow[];
}

export function listUsers(): UserRow[] {
  return db
    .prepare(
      `SELECT id, name, email, role, status, created_at, last_login_at
       FROM users ORDER BY name COLLATE NOCASE`,
    )
    .all() as UserRow[];
}

export function listAuditLogs(limit = 100) {
  return db
    .prepare(
      `SELECT id, user_label, action, entity, entity_id, details, created_at
       FROM audit_logs ORDER BY created_at DESC, id DESC LIMIT ?`,
    )
    .all(limit) as {
    id: number;
    user_label: string | null;
    action: string;
    entity: string;
    entity_id: string | null;
    details: string | null;
    created_at: string;
  }[];
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

export function dashboardStats(): DashboardStats {
  const totals = db
    .prepare(
      `SELECT COUNT(*) AS totalItems,
              COALESCE(SUM(quantity), 0) AS totalUnits,
              COALESCE(SUM(quantity * unit_cost), 0) AS totalValue,
              COALESCE(SUM(CASE WHEN quantity > 0 AND quantity <= min_quantity THEN 1 ELSE 0 END), 0) AS lowStock,
              COALESCE(SUM(CASE WHEN quantity = 0 THEN 1 ELSE 0 END), 0) AS outOfStock
       FROM items`,
    )
    .get() as Omit<
    DashboardStats,
    "categories" | "locations" | "activeUsers" | "movementsThisWeek"
  >;

  const counts = db
    .prepare(
      `SELECT (SELECT COUNT(*) FROM categories) AS categories,
              (SELECT COUNT(*) FROM locations) AS locations,
              (SELECT COUNT(*) FROM users WHERE status = 'ACTIVE') AS activeUsers,
              (SELECT COUNT(*) FROM movements WHERE created_at >= datetime('now', '-7 days')) AS movementsThisWeek`,
    )
    .get() as Pick<
    DashboardStats,
    "categories" | "locations" | "activeUsers" | "movementsThisWeek"
  >;

  return { ...totals, ...counts };
}

export function stockByCategory() {
  return db
    .prepare(
      `SELECT COALESCE(c.name, 'Uncategorised') AS name,
              COUNT(i.id) AS items,
              COALESCE(SUM(i.quantity), 0) AS units,
              COALESCE(SUM(i.quantity * i.unit_cost), 0) AS value
       FROM items i
       LEFT JOIN categories c ON c.id = i.category_id
       GROUP BY c.id
       ORDER BY value DESC`,
    )
    .all() as { name: string; items: number; units: number; value: number }[];
}

export function stockByLocation() {
  return db
    .prepare(
      `SELECT COALESCE(l.name, 'Unassigned') AS name,
              COUNT(i.id) AS items,
              COALESCE(SUM(i.quantity), 0) AS units,
              COALESCE(SUM(i.quantity * i.unit_cost), 0) AS value
       FROM items i
       LEFT JOIN locations l ON l.id = i.location_id
       GROUP BY l.id
       ORDER BY value DESC`,
    )
    .all() as { name: string; items: number; units: number; value: number }[];
}

export function movementTrend(days = 14) {
  return db
    .prepare(
      `SELECT date(created_at) AS day,
              COALESCE(SUM(CASE WHEN type = 'IN' THEN quantity ELSE 0 END), 0) AS inbound,
              COALESCE(SUM(CASE WHEN type = 'OUT' THEN quantity ELSE 0 END), 0) AS outbound
       FROM movements
       WHERE created_at >= date('now', ?)
       GROUP BY day
       ORDER BY day`,
    )
    .all(`-${days} days`) as { day: string; inbound: number; outbound: number }[];
}

export function lowStockItems(limit = 8): ItemRow[] {
  return db
    .prepare(
      `${ITEM_SELECT} WHERE i.quantity <= i.min_quantity
       ORDER BY (i.quantity - i.min_quantity) ASC, i.name COLLATE NOCASE LIMIT ?`,
    )
    .all(limit) as ItemRow[];
}
