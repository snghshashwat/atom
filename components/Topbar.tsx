"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import Icon from "./Icon";
import type { Role, User } from "@/lib/types";

interface Props {
  user: Pick<User, "id" | "name" | "email" | "role" | "department" | "avatarColor">;
  notifCount: number;
  cycleName: string;
  cyclePhase: string;
  switchableUsers: { id: string; name: string; role: Role; avatarColor: string }[];
}

export default function Topbar({ user, notifCount, cycleName, cyclePhase, switchableUsers }: Props) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [switching, startTransition] = useTransition();

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    window.location.href = "/login";
  }

  async function switchTo(userId: string) {
    startTransition(async () => {
      await fetch("/api/auth/switch", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ userId }),
      });
      window.location.href = "/dashboard";
    });
  }

  const initials = user.name.split(" ").map((n) => n[0]).slice(0, 2).join("");

  return (
    <div className="topbar">
      <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
        <div style={{ fontSize: 13, color: "var(--text-muted)" }}>
          <span style={{ fontWeight: 600, color: "var(--text)" }}>{cycleName}</span>
          <span style={{ marginLeft: 8 }} className="badge badge-info">{cyclePhase}</span>
        </div>
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 8, position: "relative" }}>
        <Link href="/notifications" className="btn btn-ghost btn-sm" aria-label="Notifications" style={{ position: "relative" }}>
          <Icon name="bell" />
          {notifCount > 0 ? (
            <span style={{
              position: "absolute", top: -2, right: -2, background: "var(--danger)", color: "white",
              fontSize: 10, fontWeight: 700, borderRadius: 999, padding: "1px 5px", minWidth: 16, textAlign: "center",
            }}>{notifCount}</span>
          ) : null}
        </Link>

        <button
          type="button"
          className="btn btn-secondary btn-sm"
          onClick={() => setMenuOpen((v) => !v)}
          aria-expanded={menuOpen}
        >
          <span className="avatar" style={{ width: 24, height: 24, fontSize: 10, background: user.avatarColor }}>{initials}</span>
          <span style={{ display: "flex", flexDirection: "column", alignItems: "flex-start", lineHeight: 1.1 }}>
            <span style={{ fontSize: 12, fontWeight: 600 }}>{user.name}</span>
            <span style={{ fontSize: 10, color: "var(--text-muted)", textTransform: "capitalize" }}>{user.role} · {user.department}</span>
          </span>
        </button>

        {menuOpen ? (
          <>
            <button
              type="button"
              aria-label="Close menu"
              onClick={() => setMenuOpen(false)}
              style={{ position: "fixed", inset: 0, background: "transparent", border: 0, zIndex: 25 }}
            />
            <div
              style={{
                position: "absolute", top: "calc(100% + 6px)", right: 0, width: 320,
                background: "var(--panel)", border: "1px solid var(--border)", borderRadius: 8,
                boxShadow: "var(--shadow-md)", zIndex: 26, overflow: "hidden",
              }}
            >
              <div style={{ padding: "12px 14px", borderBottom: "1px solid var(--border)" }}>
                <div style={{ fontSize: 13, fontWeight: 600 }}>{user.name}</div>
                <div style={{ fontSize: 11, color: "var(--text-muted)" }}>{user.email}</div>
              </div>
              <div style={{ padding: "8px 4px" }}>
                <div style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: "0.04em", color: "var(--text-muted)", padding: "4px 10px", fontWeight: 600 }}>
                  Switch user (demo)
                </div>
                {switchableUsers.filter((u) => u.id !== user.id).map((u) => (
                  <button
                    type="button"
                    key={u.id}
                    onClick={() => switchTo(u.id)}
                    disabled={switching}
                    style={{
                      width: "100%", display: "flex", alignItems: "center", gap: 8, padding: "8px 10px",
                      background: "transparent", border: 0, cursor: "pointer", borderRadius: 6, textAlign: "left",
                    }}
                  >
                    <span className="avatar" style={{ width: 24, height: 24, fontSize: 10, background: u.avatarColor }}>
                      {u.name.split(" ").map((n) => n[0]).slice(0, 2).join("")}
                    </span>
                    <span style={{ flex: 1, fontSize: 13 }}>{u.name}</span>
                    <span className={`badge ${u.role === "admin" ? "badge-primary" : u.role === "manager" ? "badge-warning" : "badge-info"}`}>{u.role}</span>
                  </button>
                ))}
              </div>
              <div style={{ borderTop: "1px solid var(--border)", padding: 6 }}>
                <button onClick={logout} type="button" className="btn btn-ghost btn-sm" style={{ width: "100%", justifyContent: "flex-start" }}>
                  <Icon name="logout" /> Sign out
                </button>
              </div>
            </div>
          </>
        ) : null}
      </div>
    </div>
  );
}
