import React from "react";
import { ChevronRight } from "lucide-react";

interface HeaderProps {
  activeTab: "leads" | "tasks" | "api-status" | "settings";
  totalValue: number;
  winRate: number;
}

export default function Header({
  activeTab,
  totalValue,
  winRate,
}: HeaderProps) {
  const formatTabName = (tab: string) => {
    if (tab === "api-status") return "API Status";
    return tab;
  };

  return (
    <header className="h-16 border-b border-[var(--color-border)] bg-[var(--color-surface)] px-8 flex items-center justify-between shrink-0">
      <div className="flex items-center gap-2 text-xs font-semibold text-[var(--color-text-secondary)]">
        <span>Console</span>
        <ChevronRight size={12} />
        <span className="text-[var(--color-text-primary)] capitalize font-bold">
          {formatTabName(activeTab)} View
        </span>
      </div>

      <div className="flex items-center gap-4">
        {/* Sync Badge */}
        <div className="flex items-center gap-2 bg-[var(--color-bg)] border border-[var(--color-border)] px-3 py-1 rounded-full text-[11px] font-semibold text-[var(--color-text-secondary)]">
          <span className="w-1.5 h-1.5 rounded-full bg-[#22C55E]" />
          <span>Monorepo SQLite Live</span>
        </div>

        {/* Pipelines Summary */}
        <div className="hidden lg:flex items-center gap-4 bg-[var(--color-bg)] border border-[var(--color-border)] px-4 py-1 rounded-full text-[11px] font-semibold">
          <span className="text-[var(--color-text-secondary)]">
            Pipeline:{" "}
            <strong className="text-[#5E6BFF]">
              ${totalValue.toLocaleString()}
            </strong>
          </span>
          <div className="w-[1px] h-3 bg-[var(--color-border)]" />
          <span className="text-[var(--color-text-secondary)]">
            Win Rate: <strong className="text-[#22C55E]">{winRate}%</strong>
          </span>
        </div>
      </div>
    </header>
  );
}
