"use server";

import { revalidatePath } from "next/cache";
import { sql } from "@/lib/db";
import { assertPermission, recordAudit } from "@/lib/auth";

export type TaxonomyKind = "category" | "location";
export type TaxonomyState = { error?: string; ok?: boolean };

const PATHS: Record<TaxonomyKind, string> = {
  category: "/categories",
  location: "/locations",
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

    const id = Number(formData.get("id")) || null;
    const name = String(formData.get("name") ?? "").trim();
    const description = String(formData.get("description") ?? "").trim() || null;

    if (!name) return { error: "Enter a name." };

    if (id) {
      // The table name is not user input — it comes from the two-value union above.
      if (kind === "category") {
        await sql`UPDATE categories SET name = ${name}, description = ${description} WHERE id = ${id}`;
      } else {
        await sql`UPDATE locations SET name = ${name}, description = ${description} WHERE id = ${id}`;
      }
      await recordAudit({ user, action: "UPDATE", entity: kind, entityId: id, details: name });
    } else {
      const [row] =
        kind === "category"
          ? await sql<{ id: number }[]>`
              INSERT INTO categories (name, description) VALUES (${name}, ${description})
              RETURNING id`
          : await sql<{ id: number }[]>`
              INSERT INTO locations (name, description) VALUES (${name}, ${description})
              RETURNING id`;
      await recordAudit({
        user,
        action: "CREATE",
        entity: kind,
        entityId: row.id,
        details: name,
      });
    }

    revalidatePath(PATHS[kind]);
    revalidatePath("/inventory");
    return { ok: true };
  } catch (error) {
    if ((error as { code?: string })?.code === "23505") {
      return { error: "Something with that name already exists." };
    }
    return { error: error instanceof Error ? error.message : "Could not save." };
  }
}

export async function deleteTaxonomyAction(
  _prev: TaxonomyState,
  formData: FormData,
): Promise<TaxonomyState> {
  try {
    const user = await assertPermission("taxonomy.manage");
    const kind = kindOf(formData);
    const id = Number(formData.get("id"));
    if (!id) return { error: "Nothing selected." };

    // Items keep existing — the schema sets their foreign key to NULL.
    const [row] =
      kind === "category"
        ? await sql<{ name: string }[]>`DELETE FROM categories WHERE id = ${id} RETURNING name`
        : await sql<{ name: string }[]>`DELETE FROM locations WHERE id = ${id} RETURNING name`;

    if (row) {
      await recordAudit({ user, action: "DELETE", entity: kind, entityId: id, details: row.name });
    }

    revalidatePath(PATHS[kind]);
    revalidatePath("/inventory");
    return { ok: true };
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Could not delete." };
  }
}
