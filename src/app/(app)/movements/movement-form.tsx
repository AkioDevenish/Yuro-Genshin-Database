"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useFormStatus } from "react-dom";
import { AlertCircle, ArrowDownLeft, ArrowUpRight, CheckCircle2, Loader2, SlidersHorizontal } from "lucide-react";
import { formatUnits } from "@/lib/format";
import { recordMovementAction, type MovementState } from "./actions";

type ItemOption = { id: number; name: string; sku: string; quantity: number; unit: string };

const TYPES = [
  { value: "IN", label: "Receive", icon: ArrowDownLeft, hint: "Adds to the quantity on hand" },
  { value: "OUT", label: "Issue", icon: ArrowUpRight, hint: "Takes stock out of the store" },
  {
    value: "ADJUST",
    label: "Correct",
    icon: SlidersHorizontal,
    hint: "Sets the quantity to a counted figure",
  },
] as const;

function Submit() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className="btn btn-primary w-full" disabled={pending}>
      {pending && <Loader2 size={15} className="animate-spin" />}
      {pending ? "Recording…" : "Record movement"}
    </button>
  );
}

export function MovementForm({
  items,
  lockedItem,
}: {
  items: ItemOption[];
  lockedItem?: ItemOption;
}) {
  const [state, action] = useActionState<MovementState, FormData>(recordMovementAction, {});
  const [type, setType] = useState<(typeof TYPES)[number]["value"]>("IN");
  const [itemId, setItemId] = useState<string>(lockedItem ? String(lockedItem.id) : "");
  const formRef = useRef<HTMLFormElement>(null);
  const router = useRouter();

  useEffect(() => {
    if (state.ok) {
      formRef.current?.reset();
      router.refresh();
    }
  }, [state, router]);

  const selected = lockedItem ?? items.find((i) => String(i.id) === itemId);
  const activeType = TYPES.find((t) => t.value === type)!;

  return (
    <form ref={formRef} action={action} className="space-y-4">
      {state.error && (
        <div className="flex items-start gap-2 rounded-xl border border-rose-500/30 bg-rose-500/10 px-3 py-2.5 text-sm text-rose-200">
          <AlertCircle size={16} className="mt-0.5 shrink-0" />
          <span>{state.error}</span>
        </div>
      )}
      {state.ok && state.message && (
        <div className="flex items-start gap-2 rounded-xl border border-brand-500/30 bg-brand-500/10 px-3 py-2.5 text-sm text-brand-200">
          <CheckCircle2 size={16} className="mt-0.5 shrink-0" />
          <span>{state.message}</span>
        </div>
      )}

      <div>
        <span className="label">Movement type</span>
        <div className="grid grid-cols-3 gap-2">
          {TYPES.map((option) => {
            const Icon = option.icon;
            const active = type === option.value;
            return (
              <button
                key={option.value}
                type="button"
                onClick={() => setType(option.value)}
                className={`flex flex-col items-center gap-1.5 rounded-xl border px-2 py-3 text-xs font-semibold transition ${
                  active
                    ? "border-brand-400/50 bg-brand-500/12 text-brand-200"
                    : "border-white/10 bg-white/[0.02] text-white/50 hover:bg-white/[0.05]"
                }`}
              >
                <Icon size={16} />
                {option.label}
              </button>
            );
          })}
        </div>
        <p className="mt-2 text-xs text-white/35">{activeType.hint}</p>
      </div>
      <input type="hidden" name="type" value={type} />

      {lockedItem ? (
        <input type="hidden" name="item_id" value={lockedItem.id} />
      ) : (
        <div>
          <label className="label" htmlFor="item_id">
            Item
          </label>
          <select
            id="item_id"
            name="item_id"
            required
            value={itemId}
            onChange={(e) => setItemId(e.target.value)}
            className="field"
          >
            <option value="">Select an item…</option>
            {items.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name} · {item.sku} ({formatUnits(item.quantity, item.unit)})
              </option>
            ))}
          </select>
        </div>
      )}

      <div>
        <label className="label" htmlFor="quantity">
          {type === "ADJUST" ? "Counted quantity" : "Quantity"}
        </label>
        <input
          id="quantity"
          name="quantity"
          type="number"
          min={type === "ADJUST" ? 0 : 1}
          step="1"
          required
          placeholder="0"
          className="field"
        />
        {selected && (
          <p className="mt-2 text-xs text-white/35">
            Currently {formatUnits(selected.quantity, selected.unit)} on hand.
          </p>
        )}
      </div>

      <div>
        <label className="label" htmlFor="note">
          Reference / note
        </label>
        <input
          id="note"
          name="note"
          placeholder="Delivery note, requesting department…"
          className="field"
        />
      </div>

      <Submit />
    </form>
  );
}
