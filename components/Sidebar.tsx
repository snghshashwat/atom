"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import Icon from "./Icon";
import type { Role } from "@/lib/types";

interface NavItem {
  href: string;
  label: string;
  icon: React.ComponentProps<typeof Icon>["name"];
  roles: Role[];
  pill?: string;
}

const NAV: { group: string; items: NavItem[] }[] = [
  {
    group: "Workspace",
    items: [
      { href: "/dashboard", label: "Dashboard", icon: "home", roles: ["employee", "manager", "admin"] },
      { href: "/notifications", label: "Notifications", icon: "bell", roles: ["employee", "manager", "admin"] },
    ],
  },
  {
    group: "My goals",
    items: [
      { href: "/goals", label: "Goal sheet", icon: "target", roles: ["employee", "manager", "admin"] },
      { href: "/checkins", label: "My check-ins", icon: "check", roles: ["employee", "manager", "admin"] },
    ],
  },
  {
    group: "Team",
    items: [
      { href: "/approvals", label: "Approvals", icon: "shield", roles: ["manager", "admin"] },
      { href: "/team", label: "Team check-ins", icon: "team", roles: ["manager", "admin"] },
      { href: "/shared-goals", label: "Shared goals", icon: "share", roles: ["manager", "admin"] },
    ],
  },
  {
    group: "Insights",
    items: [
      { href: "/reports", label: "Reports", icon: "download", roles: ["manager", "admin"] },
      { href: "/completion", label: "Completion", icon: "bar-chart", roles: ["manager", "admin"] },
      { href: "/analytics", label: "Analytics", icon: "bar-chart", roles: ["manager", "admin"] },
    ],
  },
  {
    group: "Administration",
    items: [
      { href: "/admin/cycles", label: "Cycles", icon: "calendar", roles: ["admin"] },
      { href: "/admin/users", label: "Users & hierarchy", icon: "users", roles: ["admin"] },
      { href: "/admin/escalation", label: "Escalation rules", icon: "alert", roles: ["admin"] },
      { href: "/admin/sso", label: "SSO / Azure AD", icon: "key", roles: ["admin"] },
      { href: "/admin/audit", label: "Audit trail", icon: "history", roles: ["admin"] },
    ],
  },
];

export default function Sidebar({ role }: { role: Role }) {
  const pathname = usePathname() ?? "";
  return (
    <aside className="sidebar">
      <Link href="/dashboard" className="brand">
        <span className="dot">⚛</span>
        <span>Atom Portal</span>
      </Link>

      {NAV.map((group) => {
        const items = group.items.filter((i) => i.roles.includes(role));
        if (items.length === 0) return null;
        return (
          <div className="nav-group" key={group.group}>
            <div className="nav-group-title">{group.group}</div>
            {items.map((item) => {
              const active =
                item.href === "/dashboard"
                  ? pathname === "/dashboard"
                  : pathname === item.href || pathname.startsWith(item.href + "/");
              return (
                <Link key={item.href} href={item.href} className={`nav-item ${active ? "active" : ""}`}>
                  <Icon name={item.icon} className="icon" />
                  <span>{item.label}</span>
                  {item.pill ? <span className="pill">{item.pill}</span> : null}
                </Link>
              );
            })}
          </div>
        );
      })}

      <div style={{ marginTop: "auto", paddingTop: 16, fontSize: 11, color: "#64748b", padding: "12px" }}>
        <div style={{ marginBottom: 6 }}>Build: Atom v1.0 · Demo</div>
        <div style={{ opacity: 0.7 }}>Goal Setting &amp; Tracking</div>
      </div>
    </aside>
  );
}
