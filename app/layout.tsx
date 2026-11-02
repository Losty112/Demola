import type { Metadata } from "next";
import { Bebas_Neue, Inter } from "next/font/google";
import "./globals.css";
import { TopNav } from "@/components/layout/TopNav";
import { Footer } from "@/components/layout/Footer";
import { getDataOrigin } from "@/lib/db/repository";

const inter = Inter({ subsets: ["latin", "latin-ext"], variable: "--font-inter", display: "swap" });
/** Condensed display face for titles and big figures (see `.font-display` in globals.css). */
const bebas = Bebas_Neue({ subsets: ["latin", "latin-ext"], weight: "400", variable: "--font-bebas", display: "swap" });

export const metadata: Metadata = {
  title: "Benchmark Hospital",
  description: "Compare every hospital site against a benchmark hospital and see the real need before a decision is made.",
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const origin = await getDataOrigin();
  return (
    <html lang="en" className={`${inter.variable} ${bebas.variable}`}>
      <body className="min-h-screen antialiased">
        <TopNav demo={origin === "demo"} />
        {/* Full width: the page flow (hero or analysis sheet) sets its own container */}
        <main>{children}</main>
        <Footer demo={origin === "demo"} />
      </body>
    </html>
  );
}
