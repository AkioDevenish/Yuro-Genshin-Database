"use server";

import { revalidatePath } from "next/cache";
import { sql } from "@/lib/db";
import { assertPermission, recordAudit } from "@/lib/auth";
import { formatUnits } from "@/lib/format";

export type MovementState = { error?: string; ok?: boolean; message?: string };

export async function recordMovementAction(
  _prev: MovementState,
  formData: FormData,
): Promise<MovementState> {
  try {
    const user = await assertPermission("movement.record");

    const itemId = Number(formData.get("item_id"));
    const type = String(formData.get("type") ?? "");
    const amount = Math.trunc(Number(formData.get("quantity")));
    const note = String(formData.get("note") ?? "").trim();

    if (!itemId) return { error: "Choose an item first." };
    if (!["IN", "OUT", "ADJUST"].includes(type)) return { error: "Choose a movement type." };
    if (!Number.isFinite(amount) || amount <= 0) {
      return { error: "Enter a quantity greater than zero." };
    }

    const result = await sql.begin(async (tx) => {
      // Lock the row so two people moving the same item cannot race each other.
      const [item] = await tx<
        { id: number; name: string; sku: string; quantity: number; unit: string }[]
      >`SELECT id, name, sku, quantity, unit FROM items WHERE id = ${itemId} FOR UPDATE`;

      if (!item) return { error: "That item no longer exists." };

      // ADJUST sets the balance outright; IN/OUT move it relative to what is there.
      const balanceAfter =
        type === "IN" ? item.quantity + amount : type === "OUT" ? item.quantity - amount : amount;

      if (balanceAfter < 0) {
        return {
          error: `Only ${formatUnits(item.quantity, item.unit)} of ${item.name} are on hand — you cannot issue ${amount}.`,
        };
      }

      const delta = balanceAfter - item.quantity;

      await tx`
        INSERT INTO movements (item_id, user_id, type, quantity, balance_after, note)
        VALUES (${itemId}, ${user.userId}, ${type}, ${type === "ADJUST" ? delta : amount},
                ${balanceAfter}, ${note || null})`;

      await tx`UPDATE items SET quantity = ${balanceAfter}, updated_at = now() WHERE id = ${itemId}`;

      return { item, balanceAfter };
    });

    if ("error" in result) return { error: result.error };

    const { item, balanceAfter } = result;

    await recordAudit({
      user,
      action: `MOVEMENT_${type}`,
      entity: "item",
      entityId: itemId,
      details: `${item.sku} — ${item.quantity} → ${balanceAfter} ${item.unit}${note ? ` (${note})` : ""}`,
    });

    revalidatePath("/movements");
    revalidatePath("/inventory");
    revalidatePath(`/inventory/${itemId}`);
    revalidatePath("/dashboard");

    return {
      ok: true,
      message: `${item.name} is now at ${formatUnits(balanceAfter, item.unit)}.`,
    };
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Could not record that movement." };
  }
}
