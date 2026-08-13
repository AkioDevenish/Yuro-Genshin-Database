"use client";

import { useState } from "react";
import { useFormStatus } from "react-dom";
import { Loader2, Trash2, TriangleAlert } from "lucide-react";
import { Modal } from "@/components/modal";
import { deleteItemAction } from "../actions";

function ConfirmButton() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className="btn btn-danger" disabled={pending}>
      {pending ? <Loader2 size={15} className="animate-spin" /> : <Trash2 size={15} />}
      {pending ? "Deleting…" : "Delete permanently"}
    </button>
  );
}

export function DeleteItemButton({ id, name }: { id: number; name: string }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button className="btn btn-danger" onClick={() => setOpen(true)}>
        <Trash2 size={15} /> Delete
      </button>
      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="Delete this item?"
        width="max-w-md"
      >
        <div className="flex gap-3 rounded-xl border border-rose-500/25 bg-rose-500/8 p-4 text-sm text-rose-100/90">
          <TriangleAlert size={18} className="mt-0.5 shrink-0 text-rose-300" />
          <p>
            <strong className="font-semibold">{name}</strong> and its entire movement history will
            be removed. The deletion itself stays in the audit trail, but the stock history cannot
            be recovered.
          </p>
        </div>
        <form action={deleteItemAction} className="mt-5 flex justify-end gap-2">
          <input type="hidden" name="id" value={id} />
          <button type="button" className="btn btn-ghost" onClick={() => setOpen(false)}>
            Keep item
          </button>
          <ConfirmButton />
        </form>
      </Modal>
    </>
  );
}
