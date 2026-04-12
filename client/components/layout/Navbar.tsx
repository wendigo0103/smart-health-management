import { Bell, LogOut, User } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import ModeSwitcher from "../ModeSwitcher";
import { clearAuthSession, getStoredUser } from "@/lib/api";

export default function Navbar() {
  const navigate = useNavigate();
  const stored = getStoredUser();
  const patientName = stored?.name ?? "Guest";

  const handleLogout = () => {
    clearAuthSession();
    navigate("/");
  };

  return (
    <nav className="bg-white border-b border-gray-200 sticky top-0 z-50 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <Link to="/dashboard" className="flex items-center gap-2">
            <div className="w-10 h-10 bg-primary rounded-full flex items-center justify-center">
              <span className="text-white font-bold text-lg">H</span>
            </div>
            <span className="hidden sm:inline font-bold text-lg text-gray-900">HealthQueue</span>
          </Link>

          <div className="flex items-center gap-4">
            <ModeSwitcher />

            <button
              type="button"
              className="relative p-2 text-gray-600 hover:text-primary hover:bg-blue-50 rounded-lg transition-colors"
              aria-label="Notifications"
            >
              <Bell size={20} />
              <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></span>
            </button>

            <div className="hidden sm:flex items-center gap-2 px-3 py-2 bg-blue-50 rounded-lg">
              <User size={18} className="text-primary" />
              <span className="text-sm font-medium text-gray-900">{patientName}</span>
            </div>

            <Button
              variant="ghost"
              size="sm"
              onClick={handleLogout}
              className="text-gray-600 hover:text-red-600 gap-2"
            >
              <LogOut size={18} />
              <span className="hidden sm:inline">Logout</span>
            </Button>
          </div>
        </div>
      </div>
    </nav>
  );
}
