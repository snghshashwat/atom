"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Icon from "@/components/Icon";
import { useToast } from "@/components/Toast";
import type { Notification } from "@/lib/types";

type Item = Notification & { when: string };

function EmailPreview({ n }: { n: Item }) {
  return (
    <div style={{ border: "1px solid var(--border)", borderRadius: 8, overflow: "hidden", background: "white" }}>
      <div style={{ background: "linear-gradient(135deg, #0c1a36, #1f2c5a)", padding: "16px 20px", display: "flex", alignItems: "center", gap: 10 }}>
        <span style={{ width: 28, height: 28, borderRadius: 8, background: "linear-gradient(135deg,#3b82f6,#8b5cf6)", display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: 14, color: "white" }}>⚛</span>
        <span style={{ color: "white", fontWeight: 700, fontSize: 14 }}>Atom Portal</span>
      </div>
      <div style={{ padding: "20px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "var(--text-muted)", marginBottom: 12 }}>
          <span><strong>From:</strong> noreply@atom.dev</span>
          <span>{n.when}</span>
        </div>
        <div style={{ fontSize: 11, color: "var(--text-muted)", marginBottom: 8 }}><strong>Subject:</strong> {n.title}</div>
        <div className="divider" style={{ margin: "12px 0" }} />
        <h3 style={{ margin: "0 0 8px", fontSize: 16 }}>{n.title}</h3>
        <p style={{ margin: "0 0 14px", fontSize: 13, color: "var(--text-muted)", lineHeight: 1.5 }}>{n.body}</p>
        {n.deepLink ? (
          <Link href={n.deepLink} style={{
            display: "inline-block", padding: "8px 18px", background: "var(--primary)", color: "white",
            borderRadius: 6, textDecoration: "none", fontSize: 13, fontWeight: 600,
          }}>
            View in Atom Portal &rarr;
          </Link>
        ) : null}
        <div className="divider" style={{ margin: "16px 0 10px" }} />
        <p style={{ fontSize: 11, color: "var(--text-faint)", margin: 0 }}>This email was sent by Atom Goal Setting Portal. If you believe this was sent in error, contact your HR administrator.</p>
      </div>
    </div>
  );
}

function TeamsCard({ n }: { n: Item }) {
  const kindColor = n.kind === "escalation" ? "#b91c1c" : n.kind === "goal_approved" ? "#047857" : n.kind === "goal_returned" ? "#b45309" : "#1f4ed8";
  return (
    <div style={{ border: "1px solid var(--border)", borderRadius: 8, overflow: "hidden", background: "white", maxWidth: 420 }}>
      <div style={{ height: 4, background: kindColor }} />
      <div style={{ padding: "14px 16px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
          <span style={{ width: 24, height: 24, borderRadius: 6, background: "linear-gradient(135deg,#3b82f6,#8b5cf6)", display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: 11, color: "white" }}>⚛</span>
          <span style={{ fontSize: 12, fontWeight: 600, color: "var(--text-muted)" }}>Atom Portal</span>
          <span style={{ fontSize: 11, color: "var(--text-faint)", marginLeft: "auto" }}>{n.when}</span>
        </div>
        <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 6 }}>{n.title}</div>
        <p style={{ fontSize: 13, color: "var(--text-muted)", margin: "0 0 12px", lineHeight: 1.4 }}>{n.body}</p>
        <div style={{ display: "flex", gap: 8 }}>
          {n.deepLink ? (
            <Link href={n.deepLink} style={{
              display: "inline-flex", alignItems: "center", gap: 4, padding: "6px 14px",
              background: "var(--primary)", color: "white", borderRadius: 4,
              textDecoration: "none", fontSize: 12, fontWeight: 600,
            }}>
              Open in Portal
            </Link>
          ) : null}
          <span style={{
            display: "inline-flex", alignItems: "center", gap: 4, padding: "6px 14px",
            background: "var(--panel-2)", color: "var(--text-muted)", borderRadius: 4,
            fontSize: 12, fontWeight: 600, border: "1px solid var(--border)",
          }}>
            Dismiss
          </span>
        </div>
      </div>
    </div>
  );
}

export default function NotificationsClient({ items }: { items: Item[] }) {
  const router = useRouter();
  const toast = useToast();
  const [tab, setTab] = useState<"all" | "in_app" | "email" | "teams">("all");
  const [pending, startTransition] = useTransition();
  const [expanded, setExpanded] = useState<string | null>(null);

  const filtered = items.filter((n) => tab === "all" ? true : n.channel === tab);
  const unread = filtered.filter((n) => !n.read).length;

  async function markAllRead() {
    startTransition(async () => {
      await fetch("/api/notifications/read-all", { method: "POST" });
      toast.success("Marked all as read.");
      router.refresh();
    });
  }

  return (
    <>
      <div className="page-header">
        <div>
          <h1 className="page-title">Notifications</h1>
          <p className="page-subtitle">In-app inbox, email previews, and Microsoft Teams adaptive card previews with deep links.</p>
        </div>
        <div className="toolbar">
          <button className="btn btn-secondary" onClick={markAllRead} disabled={pending || unread === 0}><Icon name="check" /> Mark all as read ({unread})</button>
        </div>
      </div>

      <div className="stat-grid" style={{ marginBottom: 16 }}>
        <div className="card stat">
          <div className="stat-label">Total</div>
          <div className="stat-value">{items.length}</div>
        </div>
        <div className="card stat">
          <div className="stat-label">Unread</div>
          <div className="stat-value" style={{ color: "var(--danger)" }}>{items.filter((n) => !n.read).length}</div>
        </div>
        <div className="card stat">
          <div className="stat-label">Emails queued</div>
          <div className="stat-value">{items.filter((n) => n.channel === "email").length}</div>
        </div>
        <div className="card stat">
          <div className="stat-label">Teams cards</div>
          <div className="stat-value">{items.filter((n) => n.channel === "teams").length}</div>
        </div>
      </div>

      <div className="tab-row">
        <button className={`tab ${tab === "all" ? "active" : ""}`} onClick={() => setTab("all")}>All ({items.length})</button>
        <button className={`tab ${tab === "in_app" ? "active" : ""}`} onClick={() => setTab("in_app")}><Icon name="bell" size={14} /> In-app ({items.filter((n) => n.channel === "in_app").length})</button>
        <button className={`tab ${tab === "email" ? "active" : ""}`} onClick={() => setTab("email")}><Icon name="mail" size={14} /> Email outbox ({items.filter((n) => n.channel === "email").length})</button>
        <button className={`tab ${tab === "teams" ? "active" : ""}`} onClick={() => setTab("teams")}><Icon name="globe" size={14} /> Teams cards ({items.filter((n) => n.channel === "teams").length})</button>
      </div>

      {tab === "email" && filtered.length > 0 && (
        <div className="banner banner-info" style={{ marginBottom: 12 }}>
          <Icon name="mail" />
          <div>These are rendered email previews showing exactly what would be sent via SMTP (Postmark, SES, or SendGrid). Click any notification to expand the full email template.</div>
        </div>
      )}
      {tab === "teams" && filtered.length > 0 && (
        <div className="banner banner-info" style={{ marginBottom: 12 }}>
          <Icon name="globe" />
          <div>These are Microsoft Teams Adaptive Card previews. In production, these are delivered via an incoming webhook to the recipient&apos;s Teams channel or chat. Deep links navigate directly to the relevant page.</div>
        </div>
      )}

      {filtered.length === 0 ? (
        <div className="empty">
          <div style={{ fontSize: 24, marginBottom: 6 }}>{tab === "email" ? "📧" : tab === "teams" ? "💬" : "🔔"}</div>
          <div style={{ fontWeight: 600, color: "var(--text)" }}>No notifications in this view.</div>
          <div style={{ marginTop: 4 }}>Notifications appear here when goals are submitted, approved, returned, or when escalations fire.</div>
        </div>
      ) : (
        <div style={{ display: "grid", gap: 8 }}>
          {filtered.map((n) => (
            <div key={n.id}>
              <div
                className="card"
                style={{ opacity: n.read ? 0.65 : 1, cursor: (n.channel === "email" || n.channel === "teams") ? "pointer" : undefined }}
                onClick={() => (n.channel === "email" || n.channel === "teams") ? setExpanded(expanded === n.id ? null : n.id) : undefined}
              >
                <div style={{ padding: 14, display: "flex", gap: 12, alignItems: "flex-start" }}>
                  <span className={`badge ${n.channel === "email" ? "badge-info" : n.channel === "teams" ? "badge-primary" : "badge-neutral"}`}>
                    <Icon name={n.channel === "email" ? "mail" : n.channel === "teams" ? "globe" : "bell"} size={12} />
                    {n.channel === "email" ? "Email" : n.channel === "teams" ? "Teams" : "In-app"}
                  </span>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
                      <strong>{n.title}</strong>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <span className={`badge ${n.kind === "escalation" ? "badge-danger" : n.kind === "goal_approved" ? "badge-success" : n.kind === "goal_returned" ? "badge-warning" : "badge-neutral"}`}>
                          {n.kind.replace(/_/g, " ")}
                        </span>
                        <span className="muted" style={{ fontSize: 12, whiteSpace: "nowrap" }}>{n.when}</span>
                      </div>
                    </div>
                    <p style={{ margin: "6px 0 0", fontSize: 13, color: "var(--text-muted)" }}>{n.body}</p>
                    <div style={{ display: "flex", gap: 8, marginTop: 10, alignItems: "center" }}>
                      {n.deepLink ? (
                        <Link href={n.deepLink} className="btn btn-secondary btn-sm" onClick={(e) => e.stopPropagation()}>
                          <Icon name="link" size={12} /> Open in portal
                        </Link>
                      ) : null}
                      {(n.channel === "email" || n.channel === "teams") ? (
                        <button className="btn btn-ghost btn-sm" onClick={(e) => { e.stopPropagation(); setExpanded(expanded === n.id ? null : n.id); }}>
                          <Icon name={expanded === n.id ? "chevron-down" : "chevron-right"} size={12} />
                          {expanded === n.id ? "Hide preview" : "Show preview"}
                        </button>
                      ) : null}
                      {!n.read && <span style={{ width: 8, height: 8, background: "var(--primary)", borderRadius: 999 }} />}
                    </div>
                  </div>
                </div>
              </div>
              {expanded === n.id && (
                <div style={{ padding: "12px 0 0 50px" }}>
                  {n.channel === "email" ? <EmailPreview n={n} /> : <TeamsCard n={n} />}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </>
  );
}
