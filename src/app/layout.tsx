import type { Metadata } from "next";
import "./globals.css";
import Header from "@/components/layout/Header";

export const metadata: Metadata = {
  metadataBase: new URL("https://mpr-dashboard.vercel.app"),
  title: {
    template: "%s | Milton Player Rating (MPR)",
    default: "Milton Player Rating (MPR)",
  },
  description:
    "Player analytics, ratings, match history, and season statistics for Milton Pickleball.",
  openGraph: {
    siteName: "Milton Player Rating (MPR)",
    type: "website",
    description:
      "Player analytics, ratings, match history, and season statistics for Milton Pickleball.",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className="min-h-screen flex flex-col">
        <Header />
        <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {children}
        </main>
        <footer className="border-t border-surface-border py-4 text-center text-xs text-slate-500">
          Milton Pickleball Analytics
        </footer>
      </body>
    </html>
  );
}
