"use client";

import { useState } from "react";
import Icon from "@/components/Icon";
import { useToast } from "@/components/Toast";
import type { Role, User } from "@/lib/types";

interface RoleMap {
  azureGroup: string;
  mappedRole: Role;
  members: number;
}

interface Props {
  users: User[];
  roleMapping: RoleMap[];
}

function buildSSOLogs(users: User[]) {
  const now = Date.now();
  return users.slice(0, 7).map((u, i) => ({
    user: u,
    time: new Date(now - (i * 3 + 1) * 60 * 60 * 1000).toLocaleString(),
  }));
}

export default function SSOClient({ users, roleMapping }: Props) {
  const toast = useToast();
  const [config, setConfig] = useState({
    tenantId: "",
    clientId: "",
    clientSecret: "",
    redirectUri: typeof window !== "undefined" ? `${window.location.origin}/api/auth/sso/callback` : "/api/auth/sso/callback",
    syncHierarchy: true,
    autoProvision: true,
    syncSchedule: "daily",
  });
  const [ssoLogs] = useState(() => buildSSOLogs(users));
  const [testStatus, setTestStatus] = useState<"idle" | "testing" | "success" | "error">("idle");
  const [syncStatus, setSyncStatus] = useState<"idle" | "syncing" | "done">("idle");
  const [tab, setTab] = useState<"config" | "roles" | "hierarchy" | "logs">("config");

  function testConnection() {
    setTestStatus("testing");
    setTimeout(() => {
      if (config.tenantId && config.clientId) {
        setTestStatus("success");
        toast.success("Connection test successful (simulated). Azure AD tenant is reachable.");
      } else {
        setTestStatus("error");
        toast.error("Connection failed: please provide Tenant ID and Client ID.");
      }
    }, 1500);
  }

  function simulateSync() {
    setSyncStatus("syncing");
    setTimeout(() => {
      setSyncStatus("done");
      toast.success(`Hierarchy sync complete: ${users.length} users synced from Azure AD (simulated).`);
    }, 2000);
  }

  return (
    <>
      <div className="tab-row">
        <button className={`tab ${tab === "config" ? "active" : ""}`} onClick={() => setTab("config")}>SSO Configuration</button>
        <button className={`tab ${tab === "roles" ? "active" : ""}`} onClick={() => setTab("roles")}>Role Mapping</button>
        <button className={`tab ${tab === "hierarchy" ? "active" : ""}`} onClick={() => setTab("hierarchy")}>Hierarchy Sync</button>
        <button className={`tab ${tab === "logs" ? "active" : ""}`} onClick={() => setTab("logs")}>SSO Logs</button>
      </div>

      {tab === "config" && (
        <div style={{ display: "grid", gap: 16 }}>
          <div className="card">
            <div className="card-header">
              <div>
                <div className="card-title">Microsoft Entra ID Connection</div>
                <div className="card-subtitle">Register Atom Portal as an Enterprise Application in your Azure AD tenant.</div>
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <button className="btn btn-secondary" onClick={testConnection} disabled={testStatus === "testing"}>
                  {testStatus === "testing" ? "Testing…" : <><Icon name="zap" /> Test connection</>}
                </button>
                <button className="btn btn-primary">
                  <Icon name="check" /> Save configuration
                </button>
              </div>
            </div>
            <div className="card-body" style={{ display: "grid", gap: 14 }}>
              {testStatus === "success" && (
                <div className="banner banner-success"><Icon name="check-circle" /> Azure AD connection verified. SSO is ready to activate.</div>
              )}
              {testStatus === "error" && (
                <div className="banner banner-danger"><Icon name="alert" /> Connection failed. Verify your Tenant ID and Client ID.</div>
              )}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
                <div>
                  <label className="field-label">Tenant ID</label>
                  <input className="input" value={config.tenantId} onChange={(e) => setConfig({ ...config, tenantId: e.target.value })} placeholder="e.g., 72f988bf-86f1-41af-91ab-2d7cd011db47" />
                  <div className="field-hint">Found in Azure Portal → Azure Active Directory → Overview</div>
                </div>
                <div>
                  <label className="field-label">Application (Client) ID</label>
                  <input className="input" value={config.clientId} onChange={(e) => setConfig({ ...config, clientId: e.target.value })} placeholder="e.g., 6731de76-14a6-49ae-97bc-6eba6914391e" />
                  <div className="field-hint">From the App Registration → Overview</div>
                </div>
                <div>
                  <label className="field-label">Client Secret</label>
                  <input type="password" className="input" value={config.clientSecret} onChange={(e) => setConfig({ ...config, clientSecret: e.target.value })} placeholder="••••••••••••••••" />
                  <div className="field-hint">Generate under Certificates & Secrets</div>
                </div>
                <div>
                  <label className="field-label">Redirect URI</label>
                  <input className="input" value={config.redirectUri} readOnly style={{ background: "var(--panel-2)" }} />
                  <div className="field-hint">Add this URI to your App Registration → Authentication</div>
                </div>
              </div>

              <div className="divider" />

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
                <div>
                  <label className="field-label">OIDC Discovery Endpoint</label>
                  <input className="input" readOnly value={config.tenantId ? `https://login.microsoftonline.com/${config.tenantId}/v2.0/.well-known/openid-configuration` : "—"} style={{ background: "var(--panel-2)", fontSize: 12 }} />
                </div>
                <div>
                  <label className="field-label">Token Claims Mapped</label>
                  <div style={{ display: "flex", gap: 6, marginTop: 6, flexWrap: "wrap" }}>
                    <span className="badge badge-info">oid → userId</span>
                    <span className="badge badge-info">preferred_username → email</span>
                    <span className="badge badge-info">name → displayName</span>
                    <span className="badge badge-info">groups → role mapping</span>
                    <span className="badge badge-info">manager → hierarchy</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="card">
            <div className="card-header">
              <div className="card-title">SSO Settings</div>
            </div>
            <div className="card-body" style={{ display: "grid", gap: 12 }}>
              <label className="checkbox">
                <input type="checkbox" checked={config.autoProvision} onChange={(e) => setConfig({ ...config, autoProvision: e.target.checked })} />
                <div>
                  <div style={{ fontWeight: 600 }}>Auto-provision new users</div>
                  <div className="muted" style={{ marginTop: 2 }}>Automatically create Atom accounts when new Azure AD users sign in for the first time.</div>
                </div>
              </label>
              <label className="checkbox">
                <input type="checkbox" checked={config.syncHierarchy} onChange={(e) => setConfig({ ...config, syncHierarchy: e.target.checked })} />
                <div>
                  <div style={{ fontWeight: 600 }}>Sync reporting hierarchy</div>
                  <div className="muted" style={{ marginTop: 2 }}>Derive manager → employee relationships from the Azure AD <code>manager</code> attribute.</div>
                </div>
              </label>
              <div>
                <label className="field-label">Hierarchy Sync Schedule</label>
                <select className="select" style={{ maxWidth: 260 }} value={config.syncSchedule} onChange={(e) => setConfig({ ...config, syncSchedule: e.target.value })}>
                  <option value="realtime">Real-time (on each login)</option>
                  <option value="hourly">Hourly</option>
                  <option value="daily">Daily</option>
                  <option value="manual">Manual only</option>
                </select>
              </div>
            </div>
          </div>
        </div>
      )}

      {tab === "roles" && (
        <div className="card">
          <div className="card-header">
            <div>
              <div className="card-title">Azure AD Group → Atom Role Mapping</div>
              <div className="card-subtitle">Map Azure AD security groups to Atom portal roles. Users inherit the role of their highest-priority group.</div>
            </div>
          </div>
          <table className="table">
            <thead>
              <tr>
                <th>Azure AD Group</th>
                <th>Atom Role</th>
                <th>Priority</th>
                <th>Current Members</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {roleMapping.map((m, i) => (
                <tr key={m.azureGroup}>
                  <td>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <Icon name="cloud" size={16} />
                      <div>
                        <div style={{ fontWeight: 600 }}>{m.azureGroup}</div>
                        <div className="muted">Security group</div>
                      </div>
                    </div>
                  </td>
                  <td>
                    <span className={`badge ${m.mappedRole === "admin" ? "badge-primary" : m.mappedRole === "manager" ? "badge-warning" : "badge-info"}`}>{m.mappedRole}</span>
                  </td>
                  <td>{i + 1}</td>
                  <td><strong>{m.members}</strong> users</td>
                  <td><span className="badge badge-success">Active</span></td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="card-footer" style={{ fontSize: 12, color: "var(--text-muted)" }}>
            <Icon name="info" size={14} /> Priority determines which role is assigned when a user belongs to multiple groups. Lower number = higher priority.
          </div>
        </div>
      )}

      {tab === "hierarchy" && (
        <div style={{ display: "grid", gap: 16 }}>
          <div className="card">
            <div className="card-header">
              <div>
                <div className="card-title">Org Hierarchy from Azure AD</div>
                <div className="card-subtitle">Reporting lines derived from the Azure AD <code>manager</code> attribute on each user object.</div>
              </div>
              <button className="btn btn-secondary" onClick={simulateSync} disabled={syncStatus === "syncing"}>
                {syncStatus === "syncing" ? "Syncing…" : <><Icon name="refresh" /> Sync now</>}
              </button>
            </div>
            {syncStatus === "done" && (
              <div className="card-body" style={{ padding: "12px 18px" }}>
                <div className="banner banner-success"><Icon name="check-circle" /> Last sync: {new Date().toLocaleString()} — {users.length} users processed, 0 conflicts.</div>
              </div>
            )}
            <table className="table">
              <thead>
                <tr>
                  <th>Employee</th>
                  <th>Azure AD UPN</th>
                  <th>Reports to (Azure AD)</th>
                  <th>Reports to (Atom)</th>
                  <th>Sync Status</th>
                </tr>
              </thead>
              <tbody>
                {users.filter((u) => u.role === "employee").map((u) => {
                  const mgr = users.find((m) => m.id === u.managerId);
                  return (
                    <tr key={u.id}>
                      <td>
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          <span className="avatar" style={{ width: 28, height: 28, fontSize: 10, background: u.avatarColor }}>{u.name.split(" ").map((n) => n[0]).slice(0, 2).join("")}</span>
                          <div>
                            <div style={{ fontWeight: 600 }}>{u.name}</div>
                            <div className="muted">{u.designation}</div>
                          </div>
                        </div>
                      </td>
                      <td><code style={{ fontSize: 12 }}>{u.email}</code></td>
                      <td>{mgr ? mgr.name : "—"}</td>
                      <td>{mgr ? mgr.name : "—"}</td>
                      <td><span className="badge badge-success">In sync</span></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {tab === "logs" && (
        <div className="card">
          <div className="card-header">
            <div className="card-title">SSO Authentication Logs</div>
          </div>
          <table className="table">
            <thead>
              <tr>
                <th>Timestamp</th>
                <th>User</th>
                <th>Method</th>
                <th>Result</th>
                <th>IP Address</th>
              </tr>
            </thead>
            <tbody>
              {ssoLogs.map((row) => (
                <tr key={row.user.id}>
                  <td style={{ whiteSpace: "nowrap" }}>{row.time}</td>
                  <td>
                    <div style={{ fontWeight: 600 }}>{row.user.name}</div>
                    <div className="muted">{row.user.email}</div>
                  </td>
                  <td><span className="badge badge-info">Demo Login</span></td>
                  <td><span className="badge badge-success">Success</span></td>
                  <td><code style={{ fontSize: 12 }}>127.0.0.1</code></td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="card-footer" style={{ fontSize: 12, color: "var(--text-muted)" }}>
            In production, SSO logs are populated automatically on each Azure AD authentication event.
          </div>
        </div>
      )}
    </>
  );
}
