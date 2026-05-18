import { requireRole } from "@/lib/auth";
import { getDB } from "@/lib/db";
import Icon from "@/components/Icon";
import SSOClient from "./SSOClient";

export default async function SSOPage() {
  await requireRole("admin");
  const db = getDB();
  const users = db.users;
  const roleMapping = [
    { azureGroup: "Atom-Admin", mappedRole: "admin" as const, members: users.filter((u) => u.role === "admin").length },
    { azureGroup: "Atom-Manager", mappedRole: "manager" as const, members: users.filter((u) => u.role === "manager").length },
    { azureGroup: "Atom-Employee", mappedRole: "employee" as const, members: users.filter((u) => u.role === "employee").length },
  ];

  return (
    <>
      <div className="page-header">
        <div>
          <h1 className="page-title">Microsoft Entra ID (Azure AD) SSO</h1>
          <p className="page-subtitle">Configure Single Sign-On, automatic role mapping, and org hierarchy sync from Azure AD.</p>
        </div>
      </div>

      <div className="banner banner-info" style={{ marginBottom: 16 }}>
        <Icon name="info" />
        <div>
          <strong>Demo mode:</strong> This page shows the full Azure AD SSO configuration interface. In production, connect your Microsoft Entra ID tenant to enable SSO, automatic role assignment from Azure AD groups, and reporting-line sync from the <code>manager</code> attribute.
        </div>
      </div>

      <SSOClient users={users} roleMapping={roleMapping} />
    </>
  );
}
