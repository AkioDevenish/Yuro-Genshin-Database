"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { assertPermission, recordAudit } from "@/lib/auth";

export type TaxonomyKind = "category" | "location";
export type TaxonomyState = { error?: string; ok?: boolean };

const TABLES: Record<TaxonomyKind, { table: string; path: string }> = {
  category: { table: "categories", path: "/categories" },
  location: { table: "locations", path: "/locations" },
};

function kindOf(formData: FormData): TaxonomyKind {
  return formData.get("kind") === "location" ? "location" : "category";
}

export async function saveTaxonomyAction(
  _prev: TaxonomyState,
  formData: FormData,
): Promise<TaxonomyState> {
  try {
    const user = await assertPermission("taxonomy.manage");
    const kind = kindOf(formData);
    const { table, path } = TABLES[kind];

    const id = Number(formData.get("id")) || null;
    const name = String(formData.get("name") ?? "").trim();
    const description = String(formData.get("description") ?? "").trim() || null;

    if (!name) return { error: "Enter a name." };

    if (id) {
      db.prepare(`UPDATE ${table} SET name = ?, description = ? WHERE id = ?`).run(
        name,
        description,
        id,
      );
      recordAudit({ user, action: "UPDATE", entity: kind, entityId: id, details: name });
    } else {
      const info = db
        .prepare(`INSERT INTO ${table} (name, description) VALUES (?, ?)`)
        .run(name, description);
      recordAudit({
        user,
        action: "CREATE",
        entity: kind,
        entityId: Number(info.lastInsertRowid),
        details: name,
      });
    }

    revalidatePath(path);
    revalidatePath("/inventory");
    return { ok: true };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (message.includes("UNIQUE constraint failed")) {
      return { error: "Something with that name already exists." };
    }
    return { error: message || "Could not save." };
  }
}

export async function deleteTaxonomyAction(
  _prev: TaxonomyState,
  formData: FormData,
): Promise<TaxonomyState> {
  try {
    const user = await assertPermission("taxonomy.manage");
    const kind = kindOf(formData);
    const { table, path } = TABLES[kind];
    const id = Number(formData.get("id"));
    if (!id) return { error: "Nothing selected." };

    const row = db.prepare(`SELECT name FROM ${table} WHERE id = ?`).get(id) as
      | { name: string }
      | undefined;

    // Items keep existing — the schema sets their foreign key to NULL.
    db.prepare(`DELETE FROM ${table} WHERE id = ?`).run(id);

    if (row) {
      recordAudit({ user, action: "DELETE", entity: kind, entityId: id, details: row.name });
    }

    revalidatePath(path);
    revalidatePath("/inventory");
    return { ok: true };
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Could not delete." };
  }
}
