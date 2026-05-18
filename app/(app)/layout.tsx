import Sidebar from "@/components/Sidebar";
import Topbar from "@/components/Topbar";
import { ToastProvider } from "@/components/Toast";
import { requireUser } from "@/lib/auth";
import { getActiveCycle, goalSettingState, activeQuarter } from "@/lib/cycles";
import { getDB } from "@/lib/db";
import { unreadCount } from "@/lib/notify";

export default async function AppShell({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  const cycle = getActiveCycle();
  const phase = goalSettingState(cycle) === "open"
    ? "Goal Setting · Open"
    : activeQuarter(cycle)
      ? `${activeQuarter(cycle)} Check-in · Open`
      : "Cycle closed";
  const db = getDB();
  const switchable = db.users.map((u) => ({ id: u.id, name: u.name, role: u.role, avatarColor: u.avatarColor }));
  return (
    <ToastProvider>
      <Sidebar role={user.role} />
      <div className="shell-main">
        <Topbar
          user={user}
          notifCount={unreadCount(user.id)}
          cycleName={cycle.name}
          cyclePhase={phase}
          switchableUsers={switchable}
        />
        <div className="page">{children}</div>
      </div>
    </ToastProvider>
  );
}
