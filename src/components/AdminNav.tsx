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
      <nav className="surface-card surface-card--muted flex items-center gap-1 overflow-x-auto rounded-[var(--radius-panel)] p-1 no-scrollbar sm:gap-2">
        {links.map(({ href, label }) => {
          const isActive = pathname === href;
          return (
            <Link
              key={href}
              href={href}
              prefetch={false}
              className={`nav-pill whitespace-nowrap ${
                isActive ? "nav-pill--active" : "nav-pill--inactive"
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
