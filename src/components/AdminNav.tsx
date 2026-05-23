"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { adminLinks } from "@/components/admin/admin-links";

export default function AdminNav() {
  const pathname = usePathname();

  return (
    <aside className="sticky top-[calc(var(--smart-header-height,56px)+1.5rem)] hidden h-fit w-56 shrink-0 lg:block">
      <nav
        aria-label="Admin navigation"
        className="surface-card surface-card--muted flex flex-col gap-1 p-2"
      >
        <div className="px-3 py-2 text-[10px] font-semibold tracking-[0.2em] text-white/30 uppercase">
          Admin
        </div>
        {adminLinks.map(({ href, label }) => {
          const isActive = pathname === href || pathname.startsWith(`${href}/`);
          return (
            <Link
              key={href}
              href={href}
              prefetch={false}
              className={`nav-pill w-full ${
                isActive ? "nav-pill--active" : "nav-pill--inactive"
              }`}
              aria-current={isActive ? "page" : undefined}
            >
              {label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
