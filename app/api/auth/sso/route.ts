import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({
    status: "demo_mode",
    message: "Azure AD SSO endpoint. In production, this redirects to Microsoft login.microsoftonline.com for OIDC authentication.",
    flow: [
      "1. User clicks 'Sign in with Microsoft' on login page",
      "2. Redirect to Azure AD authorization endpoint with client_id, redirect_uri, scope=openid+profile+email",
      "3. User authenticates with Microsoft credentials (MFA if configured)",
      "4. Azure AD redirects back to /api/auth/sso/callback with authorization code",
      "5. Backend exchanges code for tokens, reads oid/groups/manager claims",
      "6. Creates or updates Atom user, sets session cookie, redirects to /dashboard",
    ],
    requiredConfig: {
      AZURE_TENANT_ID: "Your Microsoft Entra ID tenant ID",
      AZURE_CLIENT_ID: "Application (client) ID from App Registration",
      AZURE_CLIENT_SECRET: "Client secret from Certificates & Secrets",
      AZURE_REDIRECT_URI: "/api/auth/sso/callback",
    },
    claimMapping: {
      oid: "User unique identifier → user.id",
      preferred_username: "UPN → user.email",
      name: "Display name → user.name",
      groups: "Security group memberships → role mapping",
      "extension_manager": "Manager attribute → user.managerId (hierarchy sync)",
    },
  });
}

export async function POST() {
  return NextResponse.json(
    { error: "SSO is in demo mode. Configure Azure AD tenant in Admin → SSO to enable." },
    { status: 501 },
  );
}
