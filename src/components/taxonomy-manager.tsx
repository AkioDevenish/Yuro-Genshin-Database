"use client";

import { useActionState, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useFormStatus } from "react-dom";
import { AlertCircle, FolderOpen, Loader2, Pencil, Plus, Trash2 } from "lucide-react";
import { Modal } from "@/components/modal";
import { EmptyState } from "@/components/ui";
import {
  deleteTaxonomyAction,
  saveTaxonomyAction,
  type TaxonomyKind,
  type TaxonomyState,
} from "@/app/(app)/_actions/taxonomy";
import type { TaxonomyRow } from "@/lib/queries";
import { formatNumber } from "@/lib/format";

function Submit({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className="btn btn-primary" disabled={pending}>
      {pending && <Loader2 size={15} className="animate-spin" />}
      {pending ? "Saving…" : label}
    </button>
  );
}

function DeleteSubmit() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className="btn btn-danger" disabled={pending}>
      {pending ? <Loader2 size={15} className="animate-spin" /> : <Trash2 size={15} />}
      Delete
    </button>
  );
}

function DeleteForm({
  kind,
  entry,
  onDone,
  nounLower,
}: {
  kind: TaxonomyKind;
  entry: TaxonomyRow;
  onDone: () => void;
  nounLower: string;
}) {
  const [state, action] = useActionState<TaxonomyState, FormData>(deleteTaxonomyAction, {});
  const router = useRouter();

  useEffect(() => {
    if (state.ok) {
      onDone();
      router.refresh();
    }
  }, [state, onDone, router]);

  return (
    <>
      <p className="text-sm leading-relaxed text-white/60">
        {entry.item_count
          ? `${formatNumber(entry.item_count)} item${entry.item_count === 1 ? "" : "s"} use this ${nounLower}. They will stay in the inventory but become unassigned.`
          : `No items use this ${nounLower}, so nothing else changes.`}
      </p>
      {state.error && (
        <div className="mt-4 flex items-start gap-2 rounded-xl border border-rose-500/30 bg-rose-500/10 px-3 py-2.5 text-sm text-rose-200">
          <AlertCircle size={16} className="mt-0.5 shrink-0" />
          <span>{state.error}</span>
        </div>
      )}
      <form action={action} className="mt-5 flex justify-end gap-2">
        <input type="hidden" name="kind" value={kind} />
        <input type="hidden" name="id" value={entry.id} />
        <button type="button" className="btn btn-ghost" onClick={onDone}>
          Cancel
        </button>
        <DeleteSubmit />
      </form>
    </>
  );
}

function EntryForm({
  kind,
  entry,
  onDone,
  nounLower,
}: {
  kind: TaxonomyKind;
  entry?: TaxonomyRow;
  onDone: () => void;
  nounLower: string;
}) {
  const [state, action] = useActionState<TaxonomyState, FormData>(saveTaxonomyAction, {});
  const router = useRouter();

  useEffect(() => {
    if (state.ok) {
      onDone();
      router.refresh();
    }
  }, [state, onDone, router]);

  return (
    <form action={action} className="space-y-4">
      {state.error && (
        <div className="flex items-start gap-2 rounded-xl border border-rose-500/30 bg-rose-500/10 px-3 py-2.5 text-sm text-rose-200">
          <AlertCircle size={16} className="mt-0.5 shrink-0" />
          <span>{state.error}</span>
        </div>
      )}
      <input type="hidden" name="kind" value={kind} />
      {entry && <input type="hidden" name="id" value={entry.id} />}

      <div>
        <label className="label" htmlFor={`name-${entry?.id ?? "new"}`}>
          Name
        </label>
        <input
          id={`name-${entry?.id ?? "new"}`}
          name="name"
          required
          defaultValue={entry?.name}
          placeholder={kind === "category" ? "IT equipment" : "Main store — Head office"}
          className="field"
        />
      </div>

      <div>
        <label className="label" htmlFor={`description-${entry?.id ?? "new"}`}>
          Description
        </label>
        <textarea
          id={`description-${entry?.id ?? "new"}`}
          name="description"
          rows={3}
          defaultValue={entry?.description ?? ""}
          placeholder="Optional"
          className="field resize-y"
        />
      </div>

      <div className="flex justify-end gap-2 pt-1">
        <button type="button" className="btn btn-ghost" onClick={onDone}>
          Cancel
        </button>
        <Submit label={entry ? "Save changes" : `Add ${nounLower}`} />
      </div>
    </form>
  );
}

export function TaxonomyManager({
  kind,
  noun,
  entries,
  canManage,
}: {
  kind: TaxonomyKind;
  noun: string;
  entries: TaxonomyRow[];
  canManage: boolean;
}) {
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<TaxonomyRow | null>(null);
  const [deleting, setDeleting] = useState<TaxonomyRow | null>(null);
  const nounLower = noun.toLowerCase();

  return (
    <>
      {canManage && (
        <div className="mb-4 flex justify-end">
          <button className="btn btn-primary" onClick={() => setCreating(true)}>
            <Plus size={15} /> New {nounLower}
          </button>
        </div>
      )}

      {entries.length === 0 && (
        <div className="panel">
          <EmptyState
            icon={<FolderOpen size={20} />}
            title={`No ${nounLower} records yet`}
            description={
              canManage
                ? `Create your first ${nounLower} to start organising the catalogue.`
                : `An administrator or manager needs to create the first ${nounLower}.`
            }
          />
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {entries.map((entry) => (
          <div key={entry.id} className="panel flex flex-col p-5">
            <div className="flex items-start justify-between gap-3">
              <h3 className="text-sm font-semibold text-white">{entry.name}</h3>
              <span className="chip border-white/12 bg-white/5 text-white/55">
                {formatNumber(entry.item_count)} item{entry.item_count === 1 ? "" : "s"}
              </span>
            </div>
            <p className="mt-2 flex-1 text-sm leading-relaxed text-white/45">
              {entry.description || "No description."}
            </p>
            {canManage && (
              <div className="mt-4 flex gap-2 border-t border-white/8 pt-4">
                <button
                  className="btn btn-ghost flex-1"
                  onClick={() => setEditing(entry)}
                >
                  <Pencil size={14} /> Edit
                </button>
                <button className="btn btn-danger" onClick={() => setDeleting(entry)}>
                  <Trash2 size={14} />
                </button>
              </div>
            )}
          </div>
        ))}
      </div>

      <Modal
        open={creating}
        onClose={() => setCreating(false)}
        title={`New ${nounLower}`}
        width="max-w-lg"
      >
        <EntryForm kind={kind} onDone={() => setCreating(false)} nounLower={nounLower} />
      </Modal>

      <Modal
        open={editing !== null}
        onClose={() => setEditing(null)}
        title={`Edit ${editing?.name ?? ""}`}
        width="max-w-lg"
      >
        {editing && (
          <EntryForm
            kind={kind}
            entry={editing}
            onDone={() => setEditing(null)}
            nounLower={nounLower}
          />
        )}
      </Modal>

      <Modal
        open={deleting !== null}
        onClose={() => setDeleting(null)}
        title={`Delete ${deleting?.name ?? ""}?`}
        width="max-w-md"
      >
        {deleting && (
          <DeleteForm
            kind={kind}
            entry={deleting}
            onDone={() => setDeleting(null)}
            nounLower={nounLower}
          />
        )}
      </Modal>
    </>
  );
}
