import { redirect } from "next/navigation";
import { findUserByCredentials, getSessionUser, setSession } from "@/lib/auth";
import { getDB } from "@/lib/db";

async function loginAction(formData: FormData) {
  "use server";
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "").trim();
  const u = findUserByCredentials(email, password);
  if (!u) {
    redirect(`/login?error=${encodeURIComponent("Invalid email or password.")}`);
  }
  await setSession(u.id);
  redirect("/dashboard");
}

async function quickLogin(formData: FormData) {
  "use server";
  const userId = String(formData.get("userId") ?? "");
  const db = getDB();
  if (!db.users.find((u) => u.id === userId)) {
    redirect(`/login?error=${encodeURIComponent("Unknown demo user.")}`);
  }
  await setSession(userId);
  redirect("/dashboard");
}

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; switch?: string }>;
}) {
  const sp = await searchParams;
  const existing = await getSessionUser();
  if (existing && !sp.switch) redirect("/dashboard");
  const db = getDB();
  const demo = db.users;

  return (
    <div style={{ minHeight: "100vh", display: "grid", gridTemplateColumns: "1fr 480px", background: "var(--bg)" }} className="login-shell">
      <aside
        style={{
          background:
            "linear-gradient(135deg, #0c1a36 0%, #1f2c5a 45%, #312e81 100%)",
          color: "white", padding: "48px", display: "flex", flexDirection: "column", justifyContent: "space-between",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10, fontWeight: 700, fontSize: 18 }}>
          <span className="brand-dot" style={{ width: 32, height: 32, borderRadius: 10, background: "linear-gradient(135deg,#3b82f6,#8b5cf6)", display: "inline-flex", alignItems: "center", justifyContent: "center" }}>⚛</span>
          Atom Portal
        </div>
        <div style={{ maxWidth: 460 }}>
          <h1 style={{ fontSize: 36, fontWeight: 800, letterSpacing: "-0.03em", lineHeight: 1.1, marginBottom: 18 }}>
            Goal setting, made structured.
          </h1>
          <p style={{ color: "#cbd5e1", fontSize: 15, lineHeight: 1.55 }}>
            Draft, align, approve, and review goals through every quarter — with built-in audit trail, escalation rules, and shared KPIs across teams.
          </p>
          <ul style={{ marginTop: 28, color: "#cbd5e1", fontSize: 14, display: "grid", gap: 10 }}>
            <li>✓ Phase 1 — Goal creation &amp; manager approval with locking</li>
            <li>✓ Phase 2 — Quarterly check-ins with scoring formulas</li>
            <li>✓ Shared / departmental goals across teams</li>
            <li>✓ Audit trail, escalation engine, analytics dashboard</li>
            <li>✓ Achievement export to CSV / Excel</li>
          </ul>
        </div>
        <div style={{ fontSize: 12, color: "#94a3b8" }}>© Atomquest Hackathon 1.0 — In-House Portal</div>
      </aside>

      <main style={{ padding: "56px 48px", display: "flex", flexDirection: "column", justifyContent: "center" }}>
        <h2 className="section-title" style={{ marginBottom: 6 }}>Sign in</h2>
        <p className="muted" style={{ marginBottom: 24 }}>
          Use one of the seeded accounts below, or pick a role to jump straight in.
        </p>

        {sp.error ? (
          <div className="banner banner-danger" style={{ marginBottom: 16 }}>
            <strong style={{ marginRight: 6 }}>!</strong> {sp.error}
          </div>
        ) : null}

        <a
          href="/api/auth/sso"
          className="btn btn-lg"
          style={{
            width: "100%", background: "#ffffff", color: "#333", border: "1px solid #ccc",
            display: "flex", alignItems: "center", justifyContent: "center", gap: 10,
            marginBottom: 16, fontSize: 14, fontWeight: 600, textDecoration: "none",
          }}
        >
          <svg width="20" height="20" viewBox="0 0 21 21"><rect x="1" y="1" width="9" height="9" fill="#f25022"/><rect x="11" y="1" width="9" height="9" fill="#7fba00"/><rect x="1" y="11" width="9" height="9" fill="#00a4ef"/><rect x="11" y="11" width="9" height="9" fill="#ffb900"/></svg>
          Sign in with Microsoft
        </a>

        <div style={{ display: "flex", alignItems: "center", gap: 12, margin: "0 0 16px" }}>
          <div style={{ flex: 1, height: 1, background: "var(--border)" }} />
          <span style={{ fontSize: 12, color: "var(--text-muted)" }}>or sign in with credentials</span>
          <div style={{ flex: 1, height: 1, background: "var(--border)" }} />
        </div>

        <form action={loginAction} style={{ display: "grid", gap: 12 }}>
          <div>
            <label className="field-label" htmlFor="email">Email</label>
            <input id="email" name="email" type="email" required className="input" placeholder="you@atom.dev" />
          </div>
          <div>
            <label className="field-label" htmlFor="password">Password</label>
            <input id="password" name="password" type="password" required className="input" />
          </div>
          <button type="submit" className="btn btn-primary btn-lg">Sign in</button>
        </form>

        <div className="divider" style={{ margin: "24px 0" }} />

        <div style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 10, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.04em" }}>Demo accounts</div>
        <div style={{ display: "grid", gap: 8 }}>
          {demo.map((u) => (
            <form key={u.id} action={quickLogin} style={{ display: "flex", alignItems: "center", gap: 10, padding: 10, border: "1px solid var(--border)", borderRadius: 8, background: "var(--panel)" }}>
              <span className="avatar" style={{ background: u.avatarColor }}>{u.name.split(" ").map((n) => n[0]).slice(0, 2).join("")}</span>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13, fontWeight: 600 }}>{u.name}</div>
                <div style={{ fontSize: 11, color: "var(--text-muted)" }}>{u.email} · {u.designation}</div>
              </div>
              <span className={`badge ${u.role === "admin" ? "badge-primary" : u.role === "manager" ? "badge-warning" : "badge-info"}`}>{u.role}</span>
              <input type="hidden" name="userId" value={u.id} />
              <button type="submit" className="btn btn-secondary btn-sm">Sign in</button>
            </form>
          ))}
        </div>

        <p style={{ marginTop: 18, fontSize: 12, color: "var(--text-faint)" }}>
          Tip: passwords for seeded users are <span className="kbd">employee</span>, <span className="kbd">manager</span>, or <span className="kbd">admin</span>.
        </p>
      </main>

      <style>{`
        @media (max-width: 860px) {
          .login-shell { grid-template-columns: 1fr !important; }
          .login-shell aside { display: none; }
        }
      `}</style>
    </div>
  );
}
