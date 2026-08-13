"use client";

import { useActionState, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useFormStatus } from "react-dom";
import { AlertCircle, Loader2, Pencil, Trash2, UserPlus } from "lucide-react";
import { Modal } from "@/components/modal";
import { ROLES, ROLE_DESCRIPTIONS, ROLE_LABELS, type Role } from "@/lib/roles";
import type { UserRow } from "@/lib/queries";
import {
  createUserAction,
  deleteUserAction,
  updateUserAction,
  type UserState,
} from "./actions";

function Submit({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className="btn btn-primary" disabled={pending}>
      {pending && <Loader2 size={15} className="animate-spin" />}
      {pending ? "Saving…" : label}
    </button>
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

function RoleChooser({ defaultRole }: { defaultRole?: Role }) {
  const [role, setRole] = useState<Role>(defaultRole ?? "VIEWER");
  return (
    <div>
      <span className="label">Access level</span>
      <div className="grid gap-2 sm:grid-cols-2">
        {ROLES.map((option) => (
          <label
            key={option}
            className={`cursor-pointer rounded-xl border p-3 transition ${
              role === option
                ? "border-brand-400/50 bg-brand-500/10"
                : "border-white/10 bg-white/[0.02] hover:bg-white/[0.05]"
            }`}
          >
            <input
              type="radio"
              name="role"
              value={option}
              checked={role === option}
              onChange={() => setRole(option)}
              className="sr-only"
            />
            <div className="text-sm font-semibold text-white">{ROLE_LABELS[option]}</div>
            <div className="mt-0.5 text-xs leading-relaxed text-white/45">
              {ROLE_DESCRIPTIONS[option]}
            </div>
          </label>
        ))}
      </div>
    </div>
  );
}

function CreateForm({ onDone }: { onDone: () => void }) {
  const [state, action] = useActionState<UserState, FormData>(createUserAction, {});
  const router = useRouter();

  useEffect(() => {
    if (state.ok) {
      onDone();
      router.refresh();
    }
  }, [state, onDone, router]);

  return (
    <form action={action} className="space-y-4">
      <ErrorBanner message={state.error} />
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="label" htmlFor="new-name">
            Full name
          </label>
          <input id="new-name" name="name" required className="field" placeholder="Ana Pérez" />
        </div>
        <div>
          <label className="label" htmlFor="new-email">
            Email address
          </label>
          <input
            id="new-email"
            name="email"
            type="email"
            required
            className="field"
            placeholder="ana.perez@iica.org"
          />
        </div>
      </div>
      <div>
        <label className="label" htmlFor="new-password">
          Temporary password
        </label>
        <input
          id="new-password"
          name="password"
          type="text"
          required
          className="field font-mono"
          placeholder="At least 8 characters, with a number"
        />
      </div>
      <RoleChooser />
      <div className="flex justify-end gap-2 pt-1">
        <button type="button" className="btn btn-ghost" onClick={onDone}>
          Cancel
        </button>
        <Submit label="Create account" />
      </div>
    </form>
  );
}

export function NewUserButton() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button className="btn btn-primary" onClick={() => setOpen(true)}>
        <UserPlus size={15} /> Invite user
      </button>
      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="Create an account"
        description="Set a temporary password and share it with the person directly."
      >
        <CreateForm onDone={() => setOpen(false)} />
      </Modal>
    </>
  );
}

function UpdateForm({ user, onDone }: { user: UserRow; onDone: () => void }) {
  const [state, action] = useActionState<UserState, FormData>(updateUserAction, {});
  const router = useRouter();

  useEffect(() => {
    if (state.ok) {
      onDone();
      router.refresh();
    }
  }, [state, onDone, router]);

  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="id" value={user.id} />
      <ErrorBanner message={state.error} />
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="label" htmlFor={`name-${user.id}`}>
            Full name
          </label>
          <input
            id={`name-${user.id}`}
            name="name"
            required
            defaultValue={user.name}
            className="field"
          />
        </div>
        <div>
          <label className="label" htmlFor={`email-${user.id}`}>
            Email address
          </label>
          <input
            id={`email-${user.id}`}
            name="email"
            type="email"
            required
            defaultValue={user.email}
            className="field"
          />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="label" htmlFor={`password-${user.id}`}>
            Reset password
          </label>
          <input
            id={`password-${user.id}`}
            name="password"
            type="text"
            className="field font-mono"
            placeholder="Leave blank to keep current"
          />
        </div>
        <div>
          <label className="label" htmlFor={`status-${user.id}`}>
            Account status
          </label>
          <select
            id={`status-${user.id}`}
            name="status"
            defaultValue={user.status}
            className="field"
          >
            <option value="ACTIVE">Active — can sign in</option>
            <option value="DISABLED">Disabled — access blocked</option>
          </select>
        </div>
      </div>

      <RoleChooser defaultRole={user.role} />

      <div className="flex justify-end gap-2 pt-1">
        <button type="button" className="btn btn-ghost" onClick={onDone}>
          Cancel
        </button>
        <Submit label="Save changes" />
      </div>
    </form>
  );
}

export function EditUserButton({ user, isSelf }: { user: UserRow; isSelf: boolean }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        className="rounded-lg p-2 text-white/40 transition hover:bg-white/5 hover:text-white"
        onClick={() => setOpen(true)}
        aria-label={`Edit ${user.name}`}
      >
        <Pencil size={15} />
      </button>
      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title={`Edit ${user.name}`}
        description={isSelf ? "This is your own account." : undefined}
      >
        <UpdateForm user={user} onDone={() => setOpen(false)} />
      </Modal>
    </>
  );
}

function RemoveForm({ user, onDone }: { user: UserRow; onDone: () => void }) {
  const [state, action] = useActionState<UserState, FormData>(deleteUserAction, {});
  const router = useRouter();

  useEffect(() => {
    if (state.ok) {
      onDone();
      router.refresh();
    }
  }, [state, onDone, router]);

  return (
    <>
      <p className="mb-4 text-sm leading-relaxed text-white/60">
        The account is deleted and can no longer sign in. Stock movements they recorded stay in the
        history, but are no longer attributed to a named user. Disabling the account instead keeps
        that attribution intact.
      </p>
      <ErrorBanner message={state.error} />
      <form action={action} className="flex justify-end gap-2">
        <input type="hidden" name="id" value={user.id} />
        <button type="button" className="btn btn-ghost" onClick={onDone}>
          Cancel
        </button>
        <DeleteSubmit />
      </form>
    </>
  );
}

export function DeleteUserButton({ user }: { user: UserRow }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        className="rounded-lg p-2 text-white/40 transition hover:bg-rose-500/10 hover:text-rose-300"
        onClick={() => setOpen(true)}
        aria-label={`Remove ${user.name}`}
      >
        <Trash2 size={15} />
      </button>
      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title={`Remove ${user.name}?`}
        width="max-w-md"
      >
        <RemoveForm user={user} onDone={() => setOpen(false)} />
      </Modal>
    </>
  );
}

function DeleteSubmit() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className="btn btn-danger" disabled={pending}>
      {pending ? <Loader2 size={15} className="animate-spin" /> : <Trash2 size={15} />}
      Remove access
    </button>
  );
}
