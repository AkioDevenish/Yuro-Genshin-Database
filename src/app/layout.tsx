import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "IICA Inventory",
    template: "%s · IICA Inventory",
  },
  description:
    "Inventory management for the IICA organisation — stock control, movement tracking and role-based access.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="app-aurora min-h-screen antialiased">{children}</body>
    </html>
  );
}
