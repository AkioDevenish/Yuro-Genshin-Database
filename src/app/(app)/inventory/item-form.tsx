"use client";

import { useActionState, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useFormStatus } from "react-dom";
import { AlertCircle, Loader2, Pencil, Plus, Save } from "lucide-react";
import { Modal } from "@/components/modal";
import { createItemAction, updateItemAction, type FormState } from "./actions";
import type { ItemRow, TaxonomyRow } from "@/lib/queries";

type Option = Pick<TaxonomyRow, "id" | "name">;

function Submit({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className="btn btn-primary" disabled={pending}>
      {pending ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />}
      {pending ? "Saving…" : label}
    </button>
  );
}

function Fields({
  item,
  categories,
  locations,
}: {
  item?: ItemRow;
  categories: Option[];
  locations: Option[];
}) {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <div className="sm:col-span-2">
        <label className="label" htmlFor="name">
          Item name
        </label>
        <input
          id="name"
          name="name"
          required
          defaultValue={item?.name}
          placeholder="Laptop — Dell Latitude 5440"
          className="field"
        />
      </div>

      <div>
        <label className="label" htmlFor="sku">
          SKU / asset code
        </label>
        <input
          id="sku"
          name="sku"
          required
          defaultValue={item?.sku}
          placeholder="IICA-IT-0001"
          className="field uppercase"
        />
      </div>

      <div>
        <label className="label" htmlFor="unit">
          Unit of measure
        </label>
        <input
          id="unit"
          name="unit"
          defaultValue={item?.unit ?? "unit"}
          placeholder="unit, box, litre…"
          className="field"
        />
      </div>

      <div>
        <label className="label" htmlFor="category_id">
          Category
        </label>
        <select
          id="category_id"
          name="category_id"
          defaultValue={item?.category_id ?? ""}
          className="field"
        >
          <option value="">Uncategorised</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="label" htmlFor="location_id">
          Location
        </label>
        <select
          id="location_id"
          name="location_id"
          defaultValue={item?.location_id ?? ""}
          className="field"
        >
          <option value="">Unassigned</option>
          {locations.map((l) => (
            <option key={l.id} value={l.id}>
              {l.name}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="label" htmlFor="quantity">
          Quantity on hand
        </label>
        <input
          id="quantity"
          name="quantity"
          type="number"
          min="0"
          step="1"
          defaultValue={item?.quantity ?? 0}
          className="field"
        />
      </div>

      <div>
        <label className="label" htmlFor="min_quantity">
          Minimum level
        </label>
        <input
          id="min_quantity"
          name="min_quantity"
          type="number"
          min="0"
          step="1"
          defaultValue={item?.min_quantity ?? 0}
          className="field"
        />
      </div>

      <div>
        <label className="label" htmlFor="unit_cost">
          Unit cost
        </label>
        <input
          id="unit_cost"
          name="unit_cost"
          type="number"
          min="0"
          step="0.01"
          defaultValue={item?.unit_cost ?? 0}
          className="field"
        />
      </div>

      <div>
        <label className="label" htmlFor="supplier">
          Supplier
        </label>
        <input
          id="supplier"
          name="supplier"
          defaultValue={item?.supplier ?? ""}
          placeholder="Optional"
          className="field"
        />
      </div>

      <div className="sm:col-span-2">
        <label className="label" htmlFor="description">
          Notes
        </label>
        <textarea
          id="description"
          name="description"
          rows={3}
          defaultValue={item?.description ?? ""}
          placeholder="Serial numbers, condition, handling notes…"
          className="field resize-y"
        />
      </div>
    </div>
  );
}

function ErrorBanner({ message }: { message?: string }) {
  if (!message) return null;
  return (
    <div className="mb-4 flex items-start gap-2 rounded-xl border border-rose-500/30 bg-rose-500/10 px-3 py-2.5 text-sm text-rose-200">
      <AlertCircle size={16} className="mt-0.5 shrink-0" />
      <span>{message}</span>
    </div>
  );
}

function CreateForm({
  categories,
  locations,
  onClose,
}: {
  categories: Option[];
  locations: Option[];
  onClose: () => void;
}) {
  const [state, action] = useActionState<FormState, FormData>(createItemAction, {});

  return (
    <form action={action}>
      <ErrorBanner message={state.error} />
      <Fields categories={categories} locations={locations} />
      <div className="mt-6 flex justify-end gap-2">
        <button type="button" className="btn btn-ghost" onClick={onClose}>
          Cancel
        </button>
        <Submit label="Create item" />
      </div>
    </form>
  );
}

export function NewItemButton({
  categories,
  locations,
}: {
  categories: Option[];
  locations: Option[];
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button className="btn btn-primary" onClick={() => setOpen(true)}>
        <Plus size={15} /> New item
      </button>
      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="Add an item"
        description="Anything the organisation holds — equipment, consumables or supplies."
      >
        <CreateForm
          categories={categories}
          locations={locations}
          onClose={() => setOpen(false)}
        />
      </Modal>
    </>
  );
}

function UpdateForm({
  item,
  categories,
  locations,
  onDone,
}: {
  item: ItemRow;
  categories: Option[];
  locations: Option[];
  onDone: () => void;
}) {
  const [state, action] = useActionState<FormState, FormData>(updateItemAction, {});
  const router = useRouter();

  useEffect(() => {
    if (state.ok) {
      onDone();
      router.refresh();
    }
  }, [state, onDone, router]);

  return (
    <form action={action}>
      <input type="hidden" name="id" value={item.id} />
      <ErrorBanner message={state.error} />
      <Fields item={item} categories={categories} locations={locations} />
      <div className="mt-6 flex justify-end gap-2">
        <button type="button" className="btn btn-ghost" onClick={onDone}>
          Cancel
        </button>
        <Submit label="Save changes" />
      </div>
    </form>
  );
}

export function EditItemButton({
  item,
  categories,
  locations,
}: {
  item: ItemRow;
  categories: Option[];
  locations: Option[];
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button className="btn btn-ghost" onClick={() => setOpen(true)}>
        <Pencil size={15} /> Edit
      </button>
      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title={`Edit ${item.name}`}
        description="Changing the quantity here is logged as a stock correction."
      >
        <UpdateForm
          item={item}
          categories={categories}
          locations={locations}
          onDone={() => setOpen(false)}
        />
      </Modal>
    </>
  );
}
