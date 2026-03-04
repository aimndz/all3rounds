"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Users, History, BarChart3 } from "lucide-react";

export default function AdminNav() {
  const pathname = usePathname();

  const links = [
    { href: "/admin/users", label: "Directory", icon: Users },
    { href: "/admin/reviews", label: "Audit Log", icon: History },
    { href: "/admin/activity", label: "Activity", icon: BarChart3 },
  ];

  return (
    <div className="flex gap-2 mb-8 overflow-x-auto pb-2 border-b border-white/10">
      {links.map(({ href, label, icon: Icon }) => {
        const isActive = pathname === href;
        return (
          <Link
            key={href}
            href={href}
            className={`flex items-center gap-2 px-4 py-2 rounded-t-xl text-xs font-black uppercase tracking-widest transition-all ${
              isActive
                ? "bg-white/10 text-white border-b-2 border-destructive"
                : "text-white/40 hover:text-white hover:bg-white/5"
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
