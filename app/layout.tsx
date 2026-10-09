import type { Metadata } from "next";
import "./globals.css";
import { TopNav } from "@/components/layout/TopNav";
import { Footer } from "@/components/layout/Footer";
import { getDataOrigin } from "@/lib/db/repository";

export const metadata: Metadata = {
  title: "Benchmark Hospital",
  description: "Compare every hospital site against a benchmark hospital and see the real need before a decision is made.",
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const origin = await getDataOrigin();
  return (
    <html lang="en">
      <body className="min-h-screen antialiased">
        <TopNav demo={origin === "demo"} />
        <main className="mx-auto w-full max-w-[1240px] px-4 pb-16 pt-8 sm:px-6">{children}</main>
        <Footer demo={origin === "demo"} />
      </body>
    </html>
  );
}
