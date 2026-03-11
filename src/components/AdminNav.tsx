"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export default function AdminNav() {
  const pathname = usePathname();

  const links = [
    { href: "/admin/users", label: "Directory" },
    { href: "/admin/emcees", label: "Emcees" },
    { href: "/admin/reviews", label: "Audit Log" },
    { href: "/admin/activity", label: "Activity" },
  ];

  return (
    <div className="mb-8 flex gap-2 overflow-x-auto border-b border-white/10 pb-2">
      {links.map(({ href, label }) => {
        const isActive = pathname === href;
        return (
          <Link
            key={href}
            href={href}
            className={`flex items-center rounded-t-xl px-4 py-2 text-xs font-semibold tracking-widest uppercase transition-all whitespace-nowrap ${
              isActive
                ? "border-b-2 border-primary bg-white/10 text-white"
                : "text-white/40 hover:bg-white/5 hover:text-white"
            }`}
          >
            {label}
          </Link>
        );
      })}
    </div>
  );
}
