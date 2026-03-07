"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Users, History, BarChart3, Mic2 } from "lucide-react";

export default function AdminNav() {
  const pathname = usePathname();

  const links = [
    { href: "/admin/users", label: "Directory", icon: Users },
    { href: "/admin/emcees", label: "Emcees", icon: Mic2 },
    { href: "/admin/reviews", label: "Audit Log", icon: History },
    { href: "/admin/activity", label: "Activity", icon: BarChart3 },
  ];

  return (
    <div className="mb-8 flex gap-2 overflow-x-auto border-b border-white/10 pb-2">
      {links.map(({ href, label, icon: Icon }) => {
        const isActive = pathname === href;
        return (
          <Link
            key={href}
            href={href}
            className={`flex items-center gap-2 rounded-t-xl px-4 py-2 text-xs font-black tracking-widest uppercase transition-all ${
              isActive
                ? "border-destructive border-b-2 bg-white/10 text-white"
                : "text-white/40 hover:bg-white/5 hover:text-white"
            }`}
          >
            <Icon className="h-4 w-4" />
            {label}
          </Link>
        );
      })}
    </div>
  );
}
