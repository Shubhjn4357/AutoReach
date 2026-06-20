import React from "react";
import { Sun, Moon } from "lucide-react";

interface SettingsViewProps {
  tempProfileName: string;
  setTempProfileName: (name: string) => void;
  handleUpdateProfile: () => void;
  theme: "dark" | "light";
  toggleThemeMode: () => void;
}

export default function SettingsView({
  tempProfileName,
  setTempProfileName,
  handleUpdateProfile,
  theme,
  toggleThemeMode
}: SettingsViewProps) {
  return (
    <div className="max-w-xl mx-auto flex flex-col gap-6">
      
      <div className="bg-[var(--color-surface)] border border-[var(--color-border)] p-5 rounded-md">
        <h2 className="text-base font-bold text-[var(--color-text-primary)]">System & Profile Settings</h2>
        <p className="text-xs text-[var(--color-text-secondary)] mt-1">Configure your user dashboard settings and database routing values.</p>
      </div>

      {/* Profile Card */}
      <div className="bg-[var(--color-surface)] border border-[var(--color-border)] p-5 rounded-md flex flex-col gap-4">
        <h3 className="text-xs font-bold text-[var(--color-text-primary)] uppercase tracking-wider">User Account Profile</h3>
        
        <div className="flex flex-col gap-2">
          <label className="text-[10px] text-[var(--color-text-secondary)] font-bold uppercase tracking-wider">Account Display Name</label>
          <input 
            type="text"
            value={tempProfileName}
            onChange={(e) => setTempProfileName(e.target.value)}
            className="bg-[var(--color-bg)] border border-[var(--color-border)] text-[var(--color-text-primary)] px-4 py-2.5 rounded-md text-xs outline-none focus:border-[var(--color-primary)] transition-all"
          />
        </div>

        <button
          onClick={handleUpdateProfile}
          className="bg-[var(--color-primary)] hover:bg-[var(--color-primary)]/95 text-white font-bold text-[11px] py-2.5 rounded-md cursor-pointer shadow-sm transition-all"
        >
          Save Profile Settings
        </button>
      </div>

      {/* Theme Settings Card */}
      <div className="bg-[var(--color-surface)] border border-[var(--color-border)] p-5 rounded-md flex flex-col gap-4">
        <h3 className="text-xs font-bold text-[var(--color-text-primary)] uppercase tracking-wider">Console Visual Mode</h3>
        <div className="flex justify-between items-center text-xs">
          <div>
            <div className="font-semibold text-[var(--color-text-primary)]">Dark and Light Theme</div>
            <div className="text-[11px] text-[var(--color-text-secondary)] mt-0.5">Toggle default system rendering theme.</div>
          </div>
          
          <button
            onClick={toggleThemeMode}
            className="bg-[var(--color-bg)] border border-[var(--color-border)] px-4 py-2 rounded-md text-xs font-semibold hover:bg-[var(--color-border)] transition-all cursor-pointer text-[var(--color-text-primary)] flex items-center gap-1.5"
          >
            {theme === "dark" ? <Sun size={12} /> : <Moon size={12} />}
            <span className="capitalize">{theme} Theme</span>
          </button>
        </div>
      </div>

      {/* About Monorepo */}
      <div className="bg-[var(--color-surface)] border border-[var(--color-border)] p-5 rounded-md text-xs">
        <h3 className="text-xs font-bold text-[var(--color-text-primary)] uppercase tracking-wider mb-3">About AutoReach Workspace</h3>
        <div className="flex flex-col gap-2.5 text-[11px] text-[var(--color-text-secondary)]">
          <div className="flex justify-between border-b border-[var(--color-border)] pb-2">
            <span>Monorepo Architecture</span>
            <span className="text-[var(--color-text-primary)] font-semibold">Next.js + Expo (Single-repo)</span>
          </div>
          <div className="flex justify-between border-b border-[var(--color-border)] pb-2">
            <span>Local Database Client</span>
            <span className="text-[var(--color-text-primary)] font-semibold">SQLite via Drizzle ORM</span>
          </div>
          <div className="flex justify-between pb-1">
            <span>Task Scheduler Queue</span>
            <span className="text-[var(--color-text-primary)] font-semibold">In-Memory Router Fallback</span>
          </div>
        </div>
      </div>

    </div>
  );
}
