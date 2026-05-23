import {
  Activity,
  ClipboardList,
  MessageSquareText,
  Mic2,
  Swords,
  Users,
} from "lucide-react";

export const adminLinks = [
  { href: "/admin/users", label: "Users", icon: Users },
  { href: "/admin/emcees", label: "Emcees", icon: Mic2 },
  { href: "/admin/battles", label: "Battles", icon: Swords },
  { href: "/admin/reviews", label: "Audit Log", icon: ClipboardList },
  { href: "/admin/feedback", label: "Feedback", icon: MessageSquareText },
  { href: "/admin/activity", label: "Activity", icon: Activity },
];
