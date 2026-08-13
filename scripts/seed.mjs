#!/usr/bin/env node
/**
 * Creates the schema, the first administrator and (optionally) a set of
 * realistic demo records so the system is not empty on the first sign-in.
 *
 *   npm run seed                       → schema + administrator
 *   npm run seed -- --demo             → also loads a demo catalogue
 *   npm run seed -- --reset --demo     → drops every table and rebuilds
 *
 * Reads DATABASE_URL (or POSTGRES_URL). Credentials can be supplied with
 * ADMIN_EMAIL / ADMIN_PASSWORD / ADMIN_NAME.
 */
import postgres from "postgres";
import { randomBytes, scrypt } from "node:crypto";
import { promisify } from "node:util";
import fs from "node:fs";
import path from "node:path";
import { SCHEMA_SQL } from "../src/lib/schema.mjs";

const scryptAsync = promisify(scrypt);

const args = new Set(process.argv.slice(2));
const withDemo = args.has("--demo");
const reset = args.has("--reset");

loadEnvFiles();

const DATABASE_URL = process.env.DATABASE_URL || process.env.POSTGRES_URL;
if (!DATABASE_URL) {
  console.error(
    "\nDATABASE_URL is not set.\n\n" +
      "Create .env.local with a line like:\n" +
      "  DATABASE_URL=postgresql://user:password@host/dbname?sslmode=require\n\n" +
      "Free PostgreSQL hosting: neon.tech or supabase.com\n",
  );
  process.exit(1);
}

const ADMIN_NAME = process.env.ADMIN_NAME || "IICA Administrator";
const ADMIN_EMAIL = (process.env.ADMIN_EMAIL || "admin@iica.org").toLowerCase();
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "ChangeMe123";

const sql = postgres(DATABASE_URL, { prepare: false, onnotice: () => {} });

try {
  await main();
} catch (error) {
  console.error("\nSeed failed:", error.message);
  process.exitCode = 1;
} finally {
  await sql.end();
}

async function main() {
  if (reset) {
    await sql.unsafe(`
      DROP TABLE IF EXISTS audit_logs, movements, items, categories, locations, users CASCADE;
    `);
    console.log("• Existing tables dropped");
  }

  await sql.unsafe(SCHEMA_SQL);
  console.log("• Schema is up to date");

  const [existing] = await sql`SELECT id FROM users WHERE lower(email) = ${ADMIN_EMAIL}`;

  let adminId;
  if (existing) {
    adminId = existing.id;
    console.log(`• Administrator ${ADMIN_EMAIL} already exists — left untouched`);
  } else {
    const [row] = await sql`
      INSERT INTO users (name, email, password_hash, role, status)
      VALUES (${ADMIN_NAME}, ${ADMIN_EMAIL}, ${await hash(ADMIN_PASSWORD)}, 'ADMIN', 'ACTIVE')
      RETURNING id`;
    adminId = row.id;
    console.log(`• Administrator created: ${ADMIN_EMAIL} / ${ADMIN_PASSWORD}`);
  }

  if (withDemo) {
    const [{ count }] = await sql`SELECT COUNT(*)::int AS count FROM items`;
    if (count > 0) {
      console.log("• Demo data skipped — the catalogue already has items");
    } else {
      await seedDemo(adminId);
    }
  }

  console.log("\nDone. Start the app with `npm run dev` and sign in.");
}

async function hash(password) {
  const salt = randomBytes(16);
  const derived = await scryptAsync(password, salt, 64);
  return `scrypt$${salt.toString("hex")}$${derived.toString("hex")}`;
}

/** Next.js loads .env files for the app; this script has to do it itself. */
function loadEnvFiles() {
  for (const file of [".env.local", ".env"]) {
    const full = path.join(process.cwd(), file);
    if (!fs.existsSync(full)) continue;
    for (const line of fs.readFileSync(full, "utf8").split("\n")) {
      const match = line.match(/^\s*([A-Z_][A-Z0-9_]*)\s*=\s*(.*)\s*$/i);
      if (!match) continue;
      const [, key, rawValue] = match;
      if (process.env[key] !== undefined) continue;
      process.env[key] = rawValue.replace(/^["'](.*)["']$/, "$1").trim();
    }
  }
}

async function seedDemo(adminId) {
  const people = [
    ["Marisol Rivera", "marisol.rivera@iica.org", "MANAGER", "Manager123"],
    ["Daniel Okoye", "daniel.okoye@iica.org", "STAFF", "Staff12345"],
    ["Priya Raman", "priya.raman@iica.org", "VIEWER", "Viewer1234"],
  ];

  const userIds = {};
  for (const [name, email, role, password] of people) {
    const [row] = await sql`
      INSERT INTO users (name, email, password_hash, role, status)
      VALUES (${name}, ${email}, ${await hash(password)}, ${role}, 'ACTIVE')
      RETURNING id`;
    userIds[role] = row.id;
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

  const categoryIds = [];
  for (const [name, description] of categories) {
    const [row] = await sql`
      INSERT INTO categories (name, description) VALUES (${name}, ${description}) RETURNING id`;
    categoryIds.push(row.id);
  }
  const locationIds = [];
  for (const [name, description] of locations) {
    const [row] = await sql`
      INSERT INTO locations (name, description) VALUES (${name}, ${description}) RETURNING id`;
    locationIds.push(row.id);
  }

  //     sku,  name, category, location, unit, qty, min, cost, supplier
  const items = [
    ["IICA-IT-0001", "Laptop — Dell Latitude 5440", 0, 1, "unit", 24, 6, 1180, "Tech Supplies Ltd"],
    ["IICA-IT-0002", 'Monitor — 24" IPS', 0, 1, "unit", 31, 8, 210, "Tech Supplies Ltd"],
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

  const notes = {
    IN: ["Supplier delivery", "Purchase order fulfilled", "Returned from project", "Restock"],
    OUT: [
      "Issued to field team",
      "Assigned to new staff member",
      "Project requisition",
      "Replacement issued",
    ],
  };

  const staffIds = [userIds.MANAGER, userIds.STAFF, adminId];
  const pick = (list) => list[Math.floor(Math.random() * list.length)];

  for (const [sku, name, cat, loc, unit, qty, min, cost, supplier] of items) {
    const [item] = await sql`
      INSERT INTO items (sku, name, category_id, location_id, unit, quantity, min_quantity,
                         unit_cost, supplier)
      VALUES (${sku}, ${name}, ${categoryIds[cat]}, ${locationIds[loc]}, ${unit}, ${qty}, ${min},
              ${cost}, ${supplier})
      RETURNING id`;

    // Walk backwards from the current quantity so the ledger reconciles exactly.
    let balance = qty;
    const rows = [];
    for (let step = 1; step <= 6; step++) {
      const type = Math.random() < 0.55 ? "IN" : "OUT";
      const size = Math.max(1, Math.round(Math.max(qty, 4) * (0.05 + Math.random() * 0.2)));
      const before = type === "IN" ? balance - size : balance + size;
      if (before < 0) continue;
      rows.push({ type, size, balanceAfter: balance, daysAgo: step * 3 + Math.floor(Math.random() * 3) });
      balance = before;
    }

    await sql`
      INSERT INTO movements (item_id, user_id, type, quantity, balance_after, note, created_at)
      VALUES (${item.id}, ${pick(staffIds)}, 'IN', ${balance}, ${balance}, 'Opening balance',
              now() - make_interval(days => ${45 + Math.floor(Math.random() * 40)}))`;

    for (const row of rows.reverse()) {
      await sql`
        INSERT INTO movements (item_id, user_id, type, quantity, balance_after, note, created_at)
        VALUES (${item.id}, ${pick(staffIds)}, ${row.type}, ${row.size}, ${row.balanceAfter},
                ${pick(notes[row.type])}, now() - make_interval(days => ${row.daysAgo}))`;
    }
  }

  await sql`
    INSERT INTO audit_logs (user_id, user_label, action, entity, details)
    VALUES (${adminId}, ${`${ADMIN_NAME} <${ADMIN_EMAIL}>`}, 'SEED', 'system',
            'Demo catalogue generated')`;

  console.log(`• Demo catalogue created: ${items.length} items with movement history`);
}
