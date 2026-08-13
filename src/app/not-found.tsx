import Link from "next/link";
import { BrandMark } from "@/components/brand";

export const metadata = { title: "Page not found" };

export default function NotFound() {
  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center px-6 text-center">
      <BrandMark size={44} />
      <h1 className="mt-6 text-xl font-semibold tracking-tight text-white">Page not found</h1>
      <p className="mt-2 text-sm text-white/45">
        The page you were looking for has been moved or never existed.
      </p>
      <Link href="/dashboard" className="btn btn-primary mt-7">
        Back to the dashboard
      </Link>
    </div>
  );
}
