import { ReactNode, useState } from "react";
import { Menu, X } from "lucide-react";
import { AdminShell } from "@/components/admin/AdminShell";

interface DashboardLayoutProps {
  children: ReactNode;
  /** Shown in the sticky top bar (defaults to "Admin Portal") */
  title?: string;
}

export function DashboardLayout({ children, title = "Admin Portal" }: DashboardLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="min-h-screen bg-slate-50 flex">
      <AdminShell sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} />

      <div className="flex-1 flex flex-col min-w-0">
        <header className="bg-white border-b border-slate-200 sticky top-0 z-30 shrink-0">
          <div className="flex items-center justify-between px-4 sm:px-6 py-4 gap-2">
            <button
              type="button"
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="md:hidden p-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors shrink-0"
              aria-expanded={sidebarOpen}
              aria-controls="admin-sidebar"
              aria-label={sidebarOpen ? "Close navigation menu" : "Open navigation menu"}
            >
              {sidebarOpen ? <X size={24} /> : <Menu size={24} />}
            </button>

            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 flex-1 text-center md:text-left truncate">
              {title}
            </h1>

            <div className="flex items-center gap-2 sm:gap-4 shrink-0">
              <span className="text-sm font-medium text-slate-600 hidden sm:inline">Admin User</span>
              <div className="w-10 h-10 bg-primary rounded-full flex items-center justify-center">
                <span className="text-primary-foreground font-bold text-sm">A</span>
              </div>
            </div>
          </div>
        </header>

        <main className="flex-1 px-4 sm:px-6 lg:px-8 py-8 overflow-auto" id="admin-main">
          {children}
        </main>
      </div>

      {sidebarOpen && (
        <button
          type="button"
          className="fixed inset-0 bg-black/50 z-30 md:hidden border-0 cursor-default"
          aria-label="Close sidebar"
          onClick={() => setSidebarOpen(false)}
        />
      )}
    </div>
  );
}
