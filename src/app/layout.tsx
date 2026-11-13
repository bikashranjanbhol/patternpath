import type { Metadata } from "next";
import "@fontsource-variable/inter";
import "@fontsource-variable/space-grotesk";
import "@fontsource-variable/jetbrains-mono";
import "./globals.css";
import { SiteHeader } from "@/components/site-header";

export const metadata: Metadata = {
  title: { default: "PatternPath — LeetCode by pattern", template: "%s · PatternPath" },
  description:
    "Every LeetCode problem grouped by the pattern that solves it, with step-by-step dry runs from brute force to optimal.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="flex min-h-full flex-col">
        <SiteHeader />
        <div className="flex-1">{children}</div>
        <footer className="border-t border-[#1c212c]">
          <div className="mx-auto flex max-w-7xl flex-wrap justify-between gap-4 px-6 py-8 text-sm text-dim">
            <span>© 2026 PatternPath. Not affiliated with LeetCode.</span>
            <span>Learn the pattern, not the answer.</span>
          </div>
        </footer>
      </body>
    </html>
  );
}
