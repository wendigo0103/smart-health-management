import { useNavigate, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { ShieldCheck, User } from "lucide-react";
import { useState } from "react";

export default function ModeSwitcher() {
  const navigate = useNavigate();
  const location = useLocation();
  const [isAdminMode, setIsAdminMode] = useState(location.pathname.startsWith("/admin"));

  const handleModeSwitch = (adminMode: boolean) => {
    setIsAdminMode(adminMode);
    if (adminMode) {
      navigate("/admin/dashboard");
    } else {
      navigate("/dashboard");
    }
  };

  return (
    <div className="hidden md:flex items-center gap-2 px-3 py-2 bg-gray-50 rounded-lg border border-gray-200 hover:border-primary transition-colors">
      <div className="flex items-center gap-2">
        <User size={16} className={isAdminMode ? "text-gray-400" : "text-primary"} />
        <span className={`text-xs font-medium ${isAdminMode ? "text-gray-400" : "text-primary"}`}>Patient</span>
      </div>

      <Switch
        checked={isAdminMode}
        onCheckedChange={handleModeSwitch}
        aria-label="Switch between patient and admin mode"
      />

      <div className="flex items-center gap-2">
        <ShieldCheck size={16} className={isAdminMode ? "text-primary" : "text-gray-400"} />
        <span className={`text-xs font-medium ${isAdminMode ? "text-primary" : "text-gray-400"}`}>Admin</span>
      </div>
    </div>
  );
}
