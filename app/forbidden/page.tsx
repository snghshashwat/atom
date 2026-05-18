import Link from "next/link";

export default function Forbidden() {
  return (
    <div style={{ minHeight: "100vh", display: "grid", placeItems: "center", padding: 24 }}>
      <div className="card" style={{ maxWidth: 480, width: "100%" }}>
        <div className="card-body" style={{ textAlign: "center" }}>
          <div style={{ fontSize: 36, marginBottom: 8 }}>🔒</div>
          <h1 className="section-title">Access denied</h1>
          <p className="muted" style={{ marginTop: 6 }}>
            Your role doesn&apos;t have permission to view that page.
          </p>
          <div style={{ marginTop: 18, display: "flex", justifyContent: "center", gap: 8 }}>
            <Link href="/dashboard" className="btn btn-primary">Back to dashboard</Link>
            <Link href="/login?switch=1" className="btn btn-secondary">Switch role</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
