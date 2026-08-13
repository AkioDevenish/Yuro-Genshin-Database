#!/usr/bin/env node
/**
 * Creates the database, the first administrator and (optionally) a set of
 * realistic demo records so the system is not empty on the first sign-in.
 *
 *   npm run seed                       → admin only
 *   npm run seed -- --demo             → admin + demo catalogue
 *   npm run seed -- --reset --demo     → wipe and rebuild everything
 *
 * Credentials can be supplied with ADMIN_EMAIL / ADMIN_PASSWORD / ADMIN_NAME.
 */
import Database from "better-sqlite3";
import { randomBytes, scrypt } from "node:crypto";
import { promisify } from "node:util";
import fs from "node:fs";
import path from "node:path";
import { SCHEMA_SQL } from "../src/lib/schema.mjs";

const scryptAsync = promisify(scrypt);

const args = new Set(process.argv.slice(2));
const withDemo = args.has("--demo");
const reset = args.has("--reset");

const DATA_DIR = process.env.DATA_DIR
  ? path.resolve(process.env.DATA_DIR)
  : path.join(process.cwd(), "data");
const DB_FILE = path.join(DATA_DIR, "inventory.db");

const ADMIN_NAME = process.env.ADMIN_NAME || "IICA Administrator";
const ADMIN_EMAIL = (process.env.ADMIN_EMAIL || "admin@iica.org").toLowerCase();
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "ChangeMe123";

async function hash(password) {
  const salt = randomBytes(16);
  const derived = await scryptAsync(password, salt, 64);
  return `scrypt$${salt.toString("hex")}$${derived.toString("hex")}`;
}

fs.mkdirSync(DATA_DIR, { recursive: true });

if (reset) {
  for (const suffix of ["", "-wal", "-shm"]) {
    fs.rmSync(`${DB_FILE}${suffix}`, { force: true });
  }
  console.log("• Existing database removed");
}

const db = new Database(DB_FILE);
db.pragma("journal_mode = WAL");
db.pragma("foreign_keys = ON");
db.exec(SCHEMA_SQL);

const existingAdmin = db
  .prepare("SELECT id FROM users WHERE lower(email) = ?")
  .get(ADMIN_EMAIL);

let adminId;
if (existingAdmin) {
  adminId = existingAdmin.id;
  console.log(`• Administrator ${ADMIN_EMAIL} already exists — left untouched`);
} else {
  const info = db
    .prepare(
      "INSERT INTO users (name, email, password_hash, role, status) VALUES (?, ?, ?, 'ADMIN', 'ACTIVE')",
    )
    .run(ADMIN_NAME, ADMIN_EMAIL, await hash(ADMIN_PASSWORD));
  adminId = Number(info.lastInsertRowid);
  console.log(`• Administrator created: ${ADMIN_EMAIL} / ${ADMIN_PASSWORD}`);
}

if (withDemo) {
  const itemCount = db.prepare("SELECT COUNT(*) AS n FROM items").get().n;
  if (itemCount > 0) {
    console.log("• Demo data skipped — the catalogue already has items");
  } else {
    await seedDemo();
  }
}

db.close();
console.log("\nDone. Start the app with `npm run dev` and sign in.");

async function seedDemo() {
  const people = [
    ["Marisol Rivera", "marisol.rivera@iica.org", "MANAGER", "Manager123"],
    ["Daniel Okoye", "daniel.okoye@iica.org", "STAFF", "Staff12345"],
    ["Priya Raman", "priya.raman@iica.org", "VIEWER", "Viewer1234"],
  ];

  const insertUser = db.prepare(
    "INSERT INTO users (name, email, password_hash, role, status) VALUES (?, ?, ?, ?, 'ACTIVE')",
  );
  const userIds = {};
  for (const [name, email, role, password] of people) {
    const info = insertUser.run(name, email, await hash(password), role);
    userIds[role] = Number(info.lastInsertRowid);
    console.log(`• Demo user: ${email} / ${password} (${role})`);
  }

  const categories = [
    ["IT equipment", "Laptops, monitors, networking hardware and peripherals."],
    ["Office supplies", "Stationery and everyday consumables."],
    ["Field equipment", "Tools and instruments used on project sites."],
    ["Laboratory", "Reagents, glassware and testing equipment."],
    ["Vehicles & fuel", "Fleet consumables and spare parts."],
  ];
  const locations = [
    ["Head office — Main store", "Central storeroom on the ground floor."],
    ["Head office — IT room", "Secured room for computing equipment."],
    ["Regional office — North", "Regional store serving northern projects."],
    ["Field station A", "On-site container store."],
  ];

  const insertCategory = db.prepare("INSERT INTO categories (name, description) VALUES (?, ?)");
  const insertLocation = db.prepare("INSERT INTO locations (name, description) VALUES (?, ?)");
  const categoryIds = categories.map(([n, d]) => Number(insertCategory.run(n, d).lastInsertRowid));
  const locationIds = locations.map(([n, d]) => Number(insertLocation.run(n, d).lastInsertRowid));

  //     sku,  name, category, location, unit, qty, min, cost, supplier
  const items = [
    ["IICA-IT-0001", "Laptop — Dell Latitude 5440", 0, 1, "unit", 24, 6, 1180, "Tech Supplies Ltd"],
    ["IICA-IT-0002", "Monitor — 24\" IPS", 0, 1, "unit", 31, 8, 210, "Tech Supplies Ltd"],
    ["IICA-IT-0003", "Wireless mouse", 0, 1, "unit", 12, 15, 18.5, "Tech Supplies Ltd"],
    ["IICA-IT-0004", "Network switch — 24 port", 0, 1, "unit", 3, 2, 340, "NetCore"],
    ["IICA-IT-0005", "USB-C docking station", 0, 1, "unit", 0, 4, 165, "Tech Supplies Ltd"],
    ["IICA-OS-0101", "A4 copier paper", 1, 0, "ream", 180, 60, 4.2, "PaperWorks"],
    ["IICA-OS-0102", "Ballpoint pens (box of 50)", 1, 0, "box", 42, 20, 9.75, "PaperWorks"],
    ["IICA-OS-0103", "Toner cartridge — black", 1, 0, "unit", 7, 10, 88, "PrintPro"],
    ["IICA-OS-0104", "Lever arch files", 1, 0, "unit", 96, 30, 3.1, "PaperWorks"],
    ["IICA-FE-0201", "Soil moisture meter", 2, 3, "unit", 9, 4, 275, "AgriTools"],
    ["IICA-FE-0202", "GPS handheld unit", 2, 3, "unit", 5, 3, 420, "AgriTools"],
    ["IICA-FE-0203", "Field tent — 4 person", 2, 2, "unit", 6, 2, 310, "OutdoorCo"],
    ["IICA-FE-0204", "Safety boots", 2, 2, "pair", 22, 10, 64, "SafeWear"],
    ["IICA-LB-0301", "Nitrile gloves (box of 100)", 3, 0, "box", 38, 25, 12.4, "LabDirect"],
    ["IICA-LB-0302", "pH buffer solution", 3, 0, "litre", 14, 6, 27.9, "LabDirect"],
    ["IICA-LB-0303", "Glass beakers 500ml", 3, 0, "unit", 40, 12, 6.8, "LabDirect"],
    ["IICA-VF-0401", "Engine oil 15W-40", 4, 2, "litre", 120, 40, 5.6, "FleetParts"],
    ["IICA-VF-0402", "Tyre — 205/55 R16", 4, 2, "unit", 8, 4, 98, "FleetParts"],
    ["IICA-VF-0403", "First aid kit — vehicle", 4, 2, "unit", 11, 6, 34, "SafeWear"],
    ["IICA-IT-0006", "Projector — 4000 lumen", 0, 1, "unit", 2, 1, 690, "Tech Supplies Ltd"],
  ];

  const insertItem = db.prepare(
    `INSERT INTO items (sku, name, category_id, location_id, unit, quantity, min_quantity, unit_cost, supplier)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  );
  const insertMovement = db.prepare(
    `INSERT INTO movements (item_id, user_id, type, quantity, balance_after, note, created_at)
     VALUES (?, ?, ?, ?, ?, ?, datetime('now', ?))`,
  );

  const notes = {
    IN: ["Supplier delivery", "Purchase order fulfilled", "Returned from project", "Restock"],
    OUT: ["Issued to field team", "Assigned to new staff member", "Project requisition", "Replacement issued"],
    ADJUST: ["Physical count correction", "Damaged units written off", "Stocktake adjustment"],
  };

  const staffIds = [userIds.MANAGER, userIds.STAFF, adminId];
  const pick = (list) => list[Math.floor(Math.random() * list.length)];

  db.transaction(() => {
    for (const [sku, name, cat, loc, unit, qty, min, cost, supplier] of items) {
      const itemId = Number(
        insertItem.run(sku, name, categoryIds[cat], locationIds[loc], unit, qty, min, cost, supplier)
          .lastInsertRowid,
      );

      // Build a plausible 21-day history that lands exactly on the current quantity.
      const steps = [];
      let balance = qty;
      for (let day = 1; day <= 6; day++) {
        const type = Math.random() < 0.55 ? "IN" : "OUT";
        const size = Math.max(1, Math.round(Math.max(qty, 4) * (0.05 + Math.random() * 0.2)));
        steps.push({ type, size, daysAgo: day * 3 + Math.floor(Math.random() * 3) });
      }

      // Walk backwards from today so the ledger reconciles with the stored quantity.
      const rows = [];
      for (const step of steps) {
        const before = step.type === "IN" ? balance - step.size : balance + step.size;
        if (before < 0) continue;
        rows.push({ ...step, balanceAfter: balance });
        balance = before;
      }

      insertMovement.run(
        itemId,
        pick(staffIds),
        "IN",
        balance,
        balance,
        "Opening balance",
        `-${45 + Math.floor(Math.random() * 40)} days`,
      );

      for (const row of rows.reverse()) {
        insertMovement.run(
          itemId,
          pick(staffIds),
          row.type,
          row.size,
          row.balanceAfter,
          pick(notes[row.type]),
          `-${row.daysAgo} days`,
        );
      }
    }

    db.prepare(
      `INSERT INTO audit_logs (user_id, user_label, action, entity, details)
       VALUES (?, ?, 'SEED', 'system', 'Demo catalogue generated')`,
    ).run(adminId, `${ADMIN_NAME} <${ADMIN_EMAIL}>`);
  })();

  console.log(`• Demo catalogue created: ${items.length} items with movement history`);
}
