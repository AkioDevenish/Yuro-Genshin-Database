import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { needsSetup } from "@/lib/setup";

export const dynamic = "force-dynamic";

export default async function RootPage() {
  if (await needsSetup()) redirect("/setup");
  redirect((await getCurrentUser()) ? "/dashboard" : "/login");
}
