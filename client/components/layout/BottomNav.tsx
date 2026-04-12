import { Link, useLocation } from "react-router-dom";
import { Home, Calendar, Activity, LogOut } from "lucide-react";
import { cn } from "@/lib/utils";

export default function BottomNav() {
  const location = useLocation();

  const navItems = [
    {
      label: "Dashboard",
      path: "/dashboard",
      icon: Home,
    },
    {
      label: "Book",
      path: "/book-appointment",
      icon: Calendar,
    },
    {
      label: "Queue",
      path: "/queue",
      icon: Activity,
    },
    {
      label: "Logout",
      path: "/",
      icon: LogOut,
      onClick: () => {
        window.location.href = "/";
      },
    },
  ];

  return (
    <div className="bg-white border-t border-gray-200 shadow-lg">
      <div className="flex justify-around items-center h-16">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = location.pathname === item.path;

          return (
            <Link
              key={item.path}
              to={item.path}
              onClick={item.onClick}
              className={cn(
                "flex flex-col items-center justify-center w-full h-full gap-1 text-xs font-medium transition-colors",
                isActive
                  ? "text-primary border-t-2 border-primary"
                  : "text-gray-600 hover:text-primary hover:bg-blue-50"
              )}
            >
              <Icon size={20} />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
