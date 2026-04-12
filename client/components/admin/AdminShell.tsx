import { Link, useLocation, useNavigate } from "react-router-dom";
import { clearAuthSession } from "@/lib/api";
import { Button } from "@/components/ui/button";
import {
  BarChart3,
  Settings,
  LogOut,
  LayoutDashboard,
  Activity,
  Calendar,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";

export interface AdminNavItem {
  label: string;
  path: string;
  icon: LucideIcon;
}

export const ADMIN_NAV_ITEMS: AdminNavItem[] = [
  { label: "Dashboard", path: "/admin/dashboard", icon: LayoutDashboard },
  { label: "Queue Control", path: "/admin/queue-control", icon: Activity },
  { label: "Appointments", path: "/admin/appointments", icon: Calendar },
  { label: "Analytics", path: "/admin/analytics", icon: BarChart3 },
  { label: "Settings", path: "/admin/settings", icon: Settings },
];

interface AdminShellProps {
  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
}

export function AdminShell({ sidebarOpen, setSidebarOpen }: AdminShellProps) {
  const location = useLocation();
  const navigate = useNavigate();

  const handleLogout = () => {
    clearAuthSession();
    navigate("/");
  };

  return (
    <aside
      id="admin-sidebar"
      className={cn(
        "fixed inset-y-0 left-0 z-40 w-64 bg-white border-r border-slate-200 transform transition-transform duration-200 md:relative md:translate-x-0 md:z-0",
        sidebarOpen ? "translate-x-0" : "-translate-x-full"
      )}
      aria-label="Admin navigation"
    >
      <div className="flex flex-col h-full min-h-screen md:min-h-0">
        <Link
          to="/admin/dashboard"
          className="flex items-center gap-3 px-6 py-6 border-b border-slate-200 hover:bg-slate-50"
          onClick={() => setSidebarOpen(false)}
        >
          <div className="w-10 h-10 bg-primary rounded-full flex items-center justify-center shrink-0">
            <span className="text-primary-foreground font-bold text-lg">H</span>
          </div>
          <div>
            <div className="font-bold text-slate-900">HealthQueue</div>
            <div className="text-xs text-slate-500">Admin Portal</div>
          </div>
        </Link>

        <nav className="flex-1 px-3 py-6 space-y-1 overflow-y-auto">
          {ADMIN_NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;

            return (
              <Link
                key={item.path}
                to={item.path}
                onClick={() => setSidebarOpen(false)}
                className={cn(
                  "flex items-center gap-3 px-4 py-3 rounded-lg font-medium transition-colors",
                  isActive
                    ? "bg-blue-100 text-primary border-l-4 border-primary"
                    : "text-slate-700 hover:bg-slate-100 hover:text-primary"
                )}
              >
                <Icon size={20} aria-hidden />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="px-3 py-4 border-t border-slate-200">
          <Button
            type="button"
            onClick={handleLogout}
            variant="ghost"
            className="w-full justify-start text-red-600 hover:text-red-700 hover:bg-red-50 gap-2"
          >
            <LogOut size={20} aria-hidden />
            Logout
          </Button>
        </div>
      </div>
    </aside>
  );
}
