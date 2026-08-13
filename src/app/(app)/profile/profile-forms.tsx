"use client";

import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useFormStatus } from "react-dom";
import { AlertCircle, CheckCircle2, Loader2 } from "lucide-react";
import {
  changePasswordAction,
  updateProfileAction,
  type ProfileState,
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

function Banner({ state }: { state: ProfileState }) {
  if (state.error) {
    return (
      <div className="flex items-start gap-2 rounded-xl border border-rose-500/30 bg-rose-500/10 px-3 py-2.5 text-sm text-rose-200">
        <AlertCircle size={16} className="mt-0.5 shrink-0" />
        <span>{state.error}</span>
      </div>
    );
  }
  if (state.message) {
    return (
      <div className="flex items-start gap-2 rounded-xl border border-brand-500/30 bg-brand-500/10 px-3 py-2.5 text-sm text-brand-200">
        <CheckCircle2 size={16} className="mt-0.5 shrink-0" />
        <span>{state.message}</span>
      </div>
    );
  }
  return null;
}

export function DetailsForm({ name, email }: { name: string; email: string }) {
  const [state, action] = useActionState<ProfileState, FormData>(updateProfileAction, {});
  const router = useRouter();

  useEffect(() => {
    if (state.message) router.refresh();
  }, [state, router]);

  return (
    <form action={action} className="space-y-4">
      <Banner state={state} />
      <div>
        <label className="label" htmlFor="profile-name">
          Full name
        </label>
        <input id="profile-name" name="name" required defaultValue={name} className="field" />
      </div>
      <div>
        <label className="label" htmlFor="profile-email">
          Email address
        </label>
        <input id="profile-email" value={email} disabled className="field" />
        <p className="mt-2 text-xs text-white/35">
          Only an administrator can change the email address on an account.
        </p>
      </div>
      <div className="flex justify-end">
        <Submit label="Save details" />
      </div>
    </form>
  );
}

export function PasswordForm() {
  const [state, action] = useActionState<ProfileState, FormData>(changePasswordAction, {});

  return (
    <form action={action} className="space-y-4">
      <Banner state={state} />
      <div>
        <label className="label" htmlFor="current_password">
          Current password
        </label>
        <input
          id="current_password"
          name="current_password"
          type="password"
          required
          autoComplete="current-password"
          className="field"
        />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="label" htmlFor="new_password">
            New password
          </label>
          <input
            id="new_password"
            name="new_password"
            type="password"
            required
            autoComplete="new-password"
            className="field"
          />
        </div>
        <div>
          <label className="label" htmlFor="confirm_password">
            Confirm new password
          </label>
          <input
            id="confirm_password"
            name="confirm_password"
            type="password"
            required
            autoComplete="new-password"
            className="field"
          />
        </div>
      </div>
      <p className="text-xs text-white/35">
        At least 8 characters, including a letter and a number.
      </p>
      <div className="flex justify-end">
        <Submit label="Change password" />
      </div>
    </form>
  );
}
