import React from "react";
import { Sparkles, Users, CheckSquare, Cpu, Settings, Sun, Moon, LogOut, ChevronLeft, ChevronRight } from "lucide-react";

interface SidebarProps {
  activeTab: "leads" | "tasks" | "api-status" | "settings";
  setActiveTab: (tab: "leads" | "tasks" | "api-status" | "settings") => void;
  leadsCount: number;
  pendingTasksCount: number;
  user: any;
  theme: "dark" | "light";
  toggleThemeMode: () => void;
  handleLogout: () => void;
  isCollapsed: boolean;
  setIsCollapsed: (collapsed: boolean) => void;
}

export default function Sidebar({
  activeTab,
  setActiveTab,
  leadsCount,
  pendingTasksCount,
  user,
  theme,
  toggleThemeMode,
  handleLogout,
  isCollapsed,
  setIsCollapsed
}: SidebarProps) {
  return (
    <aside className={`bg-[var(--color-surface)] border-r border-[var(--color-border)] flex flex-col justify-between h-screen sticky top-0 z-30 shrink-0 transition-all duration-300 ease-in-out ${isCollapsed ? "w-20" : "w-64"}`}>
      <div>
        {/* Logo Brand Panel */}
        <div className={`h-16 border-b border-[var(--color-border)] flex items-center transition-all duration-300 ${isCollapsed ? "justify-center px-4 gap-0" : "px-6 gap-3"}`}>
          <div className="bg-[var(--color-primary)] w-8 h-8 rounded-md flex items-center justify-center shadow-md shrink-0">
            <Sparkles size={16} className="text-white" />
          </div>
          {!isCollapsed && (
            <>
              <span className="text-lg font-black tracking-tight bg-gradient-to-r from-white to-[var(--color-text-secondary)] bg-clip-text text-transparent">AutoReach</span>
              <span className="text-[9px] bg-[var(--color-primary)]/20 text-[var(--color-primary)] px-1.5 py-0.5 rounded-sm font-bold uppercase tracking-wider">v1.0</span>
            </>
          )}
          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className={`p-1.5 rounded-md hover:bg-[var(--color-border)] text-[var(--color-text-secondary)] hover:text-white transition-colors cursor-pointer shrink-0 ${isCollapsed ? "mt-0" : "ml-auto"}`}
            title={isCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
          >
            {isCollapsed ? <ChevronRight size={15} /> : <ChevronLeft size={15} />}
          </button>
        </div>

        {/* Nav menu links */}
        <nav className="p-4 flex flex-col gap-1.5">
          <div 
            onClick={() => setActiveTab("leads")}
            className={`sidebar-link ${activeTab === "leads" ? "active" : ""} ${isCollapsed ? "justify-center px-0 h-10 w-10 mx-auto" : ""}`}
            title={isCollapsed ? `Leads & CRM (${leadsCount})` : undefined}
          >
            <div className="relative flex items-center justify-center shrink-0">
              <Users size={16} />
              {isCollapsed && leadsCount > 0 && (
                <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-[var(--color-primary)] border-2 border-[var(--color-surface)]" />
              )}
            </div>
            {!isCollapsed && (
              <>
                <span className="flex-1">Leads & CRM</span>
                <span className={`text-xs px-2 py-0.5 rounded-full font-bold ${activeTab === "leads" ? "bg-white/20 text-white" : "bg-[var(--color-border)] text-[var(--color-text-secondary)]"}`}>
                  {leadsCount}
                </span>
              </>
            )}
          </div>

          <div 
            onClick={() => setActiveTab("tasks")}
            className={`sidebar-link ${activeTab === "tasks" ? "active" : ""} ${isCollapsed ? "justify-center px-0 h-10 w-10 mx-auto" : ""}`}
            title={isCollapsed ? `Tasks Manager (${pendingTasksCount})` : undefined}
          >
            <div className="relative flex items-center justify-center shrink-0">
              <CheckSquare size={16} />
              {isCollapsed && pendingTasksCount > 0 && (
                <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-[var(--color-danger)] border-2 border-[var(--color-surface)]" />
              )}
            </div>
            {!isCollapsed && (
              <>
                <span className="flex-1">Tasks Manager</span>
                {pendingTasksCount > 0 && (
                  <span className={`text-xs px-2 py-0.5 rounded-full font-bold ${activeTab === "tasks" ? "bg-white/20 text-white" : "bg-[var(--color-primary)]/15 text-[var(--color-primary)]"}`}>
                    {pendingTasksCount}
                  </span>
                )}
              </>
            )}
          </div>

          <div 
            onClick={() => setActiveTab("api-status")}
            className={`sidebar-link ${activeTab === "api-status" ? "active" : ""} ${isCollapsed ? "justify-center px-0 h-10 w-10 mx-auto" : ""}`}
            title={isCollapsed ? "API Integrations" : undefined}
          >
            <div className="relative flex items-center justify-center shrink-0">
              <Cpu size={16} />
              {isCollapsed && (
                <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-[var(--color-success)] border-2 border-[var(--color-surface)] animate-pulse" />
              )}
            </div>
            {!isCollapsed && (
              <>
                <span className="flex-1">API Integrations</span>
                <span className="w-2 h-2 rounded-full bg-[var(--color-success)] animate-pulse" />
              </>
            )}
          </div>

          <div 
            onClick={() => setActiveTab("settings")}
            className={`sidebar-link ${activeTab === "settings" ? "active" : ""} ${isCollapsed ? "justify-center px-0 h-10 w-10 mx-auto" : ""}`}
            title={isCollapsed ? "Settings" : undefined}
          >
            <Settings size={16} className="shrink-0" />
            {!isCollapsed && <span>Settings</span>}
          </div>
        </nav>
      </div>

      {/* Footer profile container */}
      <div className={`p-4 border-t border-[var(--color-border)] flex flex-col gap-3 bg-black/10 transition-all duration-300 ${isCollapsed ? "items-center" : ""}`}>
        <div className="flex items-center gap-3 w-full justify-center">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[var(--color-primary)] to-[var(--color-secondary)] flex items-center justify-center font-bold text-sm text-white shadow-md shrink-0">
            {(user?.name || "U").substring(0, 2).toUpperCase()}
          </div>
          {!isCollapsed && (
            <div className="flex-1 min-w-0">
              <div className="text-xs text-[var(--color-text-secondary)] font-semibold truncate leading-none">Console Manager</div>
              <div className="text-sm font-bold text-[var(--color-text-primary)] mt-1 truncate">{user?.name || "User"}</div>
            </div>
          )}
        </div>

        <div className={`flex gap-2 w-full ${isCollapsed ? "flex-col items-center" : "items-center"}`}>
          {/* Theme Toggle */}
          <button 
            onClick={toggleThemeMode}
            className={`rounded-md bg-[var(--color-bg)] border border-[var(--color-border)] flex items-center justify-center hover:bg-[var(--color-border)] transition-colors cursor-pointer text-[var(--color-text-primary)] ${isCollapsed ? "w-10 h-10" : "flex-1 h-9"}`}
            title={isCollapsed ? `Switch theme` : "Toggle Theme"}
          >
            {theme === "dark" ? <Sun size={15} /> : <Moon size={15} />}
            {!isCollapsed && <span className="text-[11px] font-semibold ml-2 capitalize">{theme} Mode</span>}
          </button>

          {/* Logout button */}
          <button
            onClick={handleLogout}
            className={`rounded-md bg-[var(--color-bg)] border border-[var(--color-border)] flex items-center justify-center hover:bg-[var(--color-danger)]/10 hover:border-[var(--color-danger)] transition-colors cursor-pointer text-[var(--color-danger)] ${isCollapsed ? "w-10 h-10" : "w-9 h-9"}`}
            title="Log Out"
          >
            <LogOut size={15} />
          </button>
        </div>
      </div>
    </aside>
  );
}
