"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export default function AdminNav() {
  const pathname = usePathname();

  const links = [
    { href: "/admin/users", label: "Users" },
    { href: "/admin/emcees", label: "Emcees" },
    { href: "/admin/battles", label: "Battles" },
    { href: "/admin/reviews", label: "Audit Log" },
    { href: "/admin/activity", label: "Activity" },
  ];

  return (
    <div className="mb-10 flex items-center justify-center sm:justify-start">
      <nav className="flex items-center gap-1 overflow-x-auto rounded-2xl border border-white/10 bg-white/5 p-1 no-scrollbar sm:gap-2">
        {links.map(({ href, label }) => {
          const isActive = pathname === href;
          return (
            <Link
              key={href}
              href={href}
              prefetch={false}
              className={`relative flex items-center px-4 py-2.5 text-[10px] font-bold tracking-widest uppercase transition-all whitespace-nowrap rounded-xl sm:px-6 sm:text-xs ${
                isActive
                  ? "bg-primary/10 text-primary border border-primary/20"
                  : "text-white/40 hover:text-white"
              }`}
            >
              {label}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
