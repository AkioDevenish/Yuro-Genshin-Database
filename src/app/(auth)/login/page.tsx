import { redirect } from "next/navigation";
import { ShieldCheck, Boxes, History, Users } from "lucide-react";
import { getCurrentUser } from "@/lib/auth";
import { BrandLockup } from "@/components/brand";
import { LoginForm } from "./login-form";

export const metadata = { title: "Sign in" };

const highlights = [
  {
    icon: Boxes,
    title: "One catalogue",
    body: "Every asset, consumable and supply tracked with SKUs, locations and valuations.",
  },
  {
    icon: History,
    title: "Complete stock history",
    body: "Each issue, receipt and correction is stamped with who did it and when.",
  },
  {
    icon: Users,
    title: "Role-based access",
    body: "Administrators, managers, staff and viewers each see exactly what they should.",
  },
];

export default async function LoginPage() {
  if (await getCurrentUser()) redirect("/dashboard");

  return (
    <main className="mx-auto flex min-h-screen max-w-6xl flex-col justify-center px-5 py-10">
      <div className="grid items-center gap-12 lg:grid-cols-[1.05fr_minmax(0,420px)]">
        <section className="animate-rise hidden lg:block">
          <BrandLockup />
          <h1 className="mt-10 text-[2.85rem] font-semibold leading-[1.08] tracking-tight text-white">
            Inventory control,
            <br />
            <span className="bg-gradient-to-r from-brand-300 via-brand-400 to-gold-300 bg-clip-text text-transparent">
              built for the whole organisation.
            </span>
          </h1>
          <p className="mt-5 max-w-lg text-[15px] leading-relaxed text-white/55">
            A single, self-hosted source of truth for what IICA owns, where it sits and who moved
            it. No licences, no per-seat fees — the system runs entirely on free, open tooling.
          </p>

          <ul className="mt-10 space-y-4">
            {highlights.map(({ icon: Icon, title, body }) => (
              <li key={title} className="flex gap-4">
                <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-brand-500/25 bg-brand-500/10 text-brand-300">
                  <Icon size={17} />
                </span>
                <div>
                  <div className="text-sm font-semibold text-white">{title}</div>
                  <div className="text-sm text-white/50">{body}</div>
                </div>
              </li>
            ))}
          </ul>
        </section>

        <section className="animate-rise panel p-7 sm:p-8">
          <div className="lg:hidden">
            <BrandLockup />
          </div>
          <h2 className="mt-6 text-xl font-semibold tracking-tight text-white lg:mt-0">
            Sign in to your workspace
          </h2>
          <p className="mt-1.5 text-sm text-white/45">
            Use the credentials issued by your IICA administrator.
          </p>

          <div className="mt-7">
            <LoginForm />
          </div>

          <div className="mt-7 flex items-start gap-2.5 border-t border-white/8 pt-5 text-xs leading-relaxed text-white/40">
            <ShieldCheck size={15} className="mt-0.5 shrink-0 text-brand-400" />
            <p>
              Sessions are encrypted and expire after 8 hours. Every sign-in and stock change is
              written to the audit trail. Lost your password? An administrator can reset it for you.
            </p>
          </div>
        </section>
      </div>
    </main>
  );
}
