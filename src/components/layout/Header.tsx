"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Activity } from "lucide-react";
import MobileMenu from "./MobileMenu";

const navLinks = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/players",   label: "Players"   },
  { href: "/faq",       label: "FAQ"       },
];

export default function Header() {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-40 w-full bg-surface-card border-b border-surface-border">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">

        {/* Logo */}
        <Link href="/dashboard" className="flex items-center gap-2 shrink-0">
          <div className="w-8 h-8 rounded-md bg-brand-600 flex items-center justify-center">
            <Activity size={18} className="text-white" />
          </div>
          <span className="font-bold text-white text-sm sm:text-base tracking-tight">
            Milton Pickleball
          </span>
        </Link>

        {/* Desktop nav */}
        <nav className="hidden md:flex items-center gap-1">
          {navLinks.map(({ href, label }) => {
            const active = pathname === href || pathname.startsWith(href + "/");
            return (
              <Link
                key={href}
                href={href}
                className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                  active
                    ? "bg-brand-700 text-white"
                    : "text-slate-400 hover:text-white hover:bg-surface"
                }`}
              >
                {label}
              </Link>
            );
          })}
        </nav>

        {/* Mobile menu toggle */}
        <MobileMenu />
      </div>
    </header>
  );
}
