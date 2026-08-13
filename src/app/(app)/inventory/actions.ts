"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { assertPermission, recordAudit } from "@/lib/auth";

export type FormState = { error?: string; ok?: boolean };

function text(formData: FormData, key: string): string {
  return String(formData.get(key) ?? "").trim();
}

function intOf(formData: FormData, key: string, fallback = 0): number {
  const value = Number(formData.get(key));
  return Number.isFinite(value) ? Math.trunc(value) : fallback;
}

function floatOf(formData: FormData, key: string, fallback = 0): number {
  const value = Number(formData.get(key));
  return Number.isFinite(value) ? value : fallback;
}

function optionalId(formData: FormData, key: string): number | null {
  const raw = text(formData, key);
  if (!raw) return null;
  const value = Number(raw);
  return Number.isFinite(value) && value > 0 ? value : null;
}

function validate(formData: FormData): string | null {
  if (!text(formData, "name")) return "The item needs a name.";
  if (!text(formData, "sku")) return "The item needs a SKU or asset code.";
  if (intOf(formData, "quantity") < 0) return "Quantity cannot be negative.";
  if (intOf(formData, "min_quantity") < 0) return "Minimum level cannot be negative.";
  if (floatOf(formData, "unit_cost") < 0) return "Unit cost cannot be negative.";
  return null;
}

export async function createItemAction(_prev: FormState, formData: FormData): Promise<FormState> {
  let newId: number;
  try {
    const user = await assertPermission("inventory.manage");
    const problem = validate(formData);
    if (problem) return { error: problem };

    const sku = text(formData, "sku").toUpperCase();
    const quantity = intOf(formData, "quantity");

    const insert = db.prepare(
      `INSERT INTO items (sku, name, description, category_id, location_id, unit, quantity,
                          min_quantity, unit_cost, supplier)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    );

    const result = db.transaction(() => {
      const info = insert.run(
        sku,
        text(formData, "name"),
        text(formData, "description") || null,
        optionalId(formData, "category_id"),
        optionalId(formData, "location_id"),
        text(formData, "unit") || "unit",
        quantity,
        intOf(formData, "min_quantity"),
        floatOf(formData, "unit_cost"),
        text(formData, "supplier") || null,
      );
      const id = Number(info.lastInsertRowid);

      if (quantity > 0) {
        db.prepare(
          `INSERT INTO movements (item_id, user_id, type, quantity, balance_after, note)
           VALUES (?, ?, 'IN', ?, ?, 'Opening balance')`,
        ).run(id, user.userId, quantity, quantity);
      }
      return id;
    })();

    newId = result;
    recordAudit({
      user,
      action: "CREATE",
      entity: "item",
      entityId: newId,
      details: `${sku} — ${text(formData, "name")}`,
    });
  } catch (error) {
    return { error: describe(error, "That SKU is already in use.") };
  }

  revalidatePath("/inventory");
  revalidatePath("/dashboard");
  redirect(`/inventory/${newId}`);
}

export async function updateItemAction(_prev: FormState, formData: FormData): Promise<FormState> {
  try {
    const user = await assertPermission("inventory.manage");
    const id = intOf(formData, "id");
    if (!id) return { error: "Missing item reference." };

    const problem = validate(formData);
    if (problem) return { error: problem };

    const existing = db.prepare("SELECT quantity FROM items WHERE id = ?").get(id) as
      | { quantity: number }
      | undefined;
    if (!existing) return { error: "That item no longer exists." };

    const quantity = intOf(formData, "quantity");
    const sku = text(formData, "sku").toUpperCase();

    db.transaction(() => {
      db.prepare(
        `UPDATE items SET sku = ?, name = ?, description = ?, category_id = ?, location_id = ?,
                          unit = ?, quantity = ?, min_quantity = ?, unit_cost = ?, supplier = ?,
                          updated_at = datetime('now')
         WHERE id = ?`,
      ).run(
        sku,
        text(formData, "name"),
        text(formData, "description") || null,
        optionalId(formData, "category_id"),
        optionalId(formData, "location_id"),
        text(formData, "unit") || "unit",
        quantity,
        intOf(formData, "min_quantity"),
        floatOf(formData, "unit_cost"),
        text(formData, "supplier") || null,
        id,
      );

      // Editing the quantity directly is a correction — keep the ledger honest.
      if (quantity !== existing.quantity) {
        db.prepare(
          `INSERT INTO movements (item_id, user_id, type, quantity, balance_after, note)
           VALUES (?, ?, 'ADJUST', ?, ?, 'Corrected while editing the item')`,
        ).run(id, user.userId, quantity - existing.quantity, quantity);
      }
    })();

    recordAudit({ user, action: "UPDATE", entity: "item", entityId: id, details: sku });
  } catch (error) {
    return { error: describe(error, "That SKU is already in use.") };
  }

  revalidatePath("/inventory");
  revalidatePath("/dashboard");
  return { ok: true };
}

export async function deleteItemAction(formData: FormData) {
  const user = await assertPermission("inventory.manage");
  const id = intOf(formData, "id");
  const item = db.prepare("SELECT sku, name FROM items WHERE id = ?").get(id) as
    | { sku: string; name: string }
    | undefined;

  if (item) {
    db.prepare("DELETE FROM items WHERE id = ?").run(id);
    recordAudit({
      user,
      action: "DELETE",
      entity: "item",
      entityId: id,
      details: `${item.sku} — ${item.name}`,
    });
  }

  revalidatePath("/inventory");
  revalidatePath("/dashboard");
  redirect("/inventory");
}

function describe(error: unknown, uniqueMessage: string): string {
  const message = error instanceof Error ? error.message : String(error);
  if (message.includes("UNIQUE constraint failed")) return uniqueMessage;
  return message || "Something went wrong. Please try again.";
}
