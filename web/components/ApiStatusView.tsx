import React from "react";
import { Loader, RefreshCw } from "lucide-react";

interface ApiStatusViewProps {
  apiHealth: Record<string, { status: "idle" | "healthy" | "error"; latency: number | null; data?: string }>;
  pinging: Record<string, boolean>;
  pingEndpoint: (service: string, route: string, method: "GET" | "POST", payload?: any) => Promise<void>;
}

export default function ApiStatusView({
  apiHealth,
  pinging,
  pingEndpoint
}: ApiStatusViewProps) {
  return (
    <div className="max-w-4xl mx-auto flex flex-col gap-6">
      
      <div className="bg-[var(--color-surface)] border border-[var(--color-border)] p-5 rounded-md">
        <h2 className="text-base font-bold text-[var(--color-text-primary)]">Integrations Control Room</h2>
        <p className="text-xs text-[var(--color-text-secondary)] mt-1">Live status, healthchecks, and metrics logs of the monorepo integrations and router gateways.</p>
      </div>

      {/* Integrations Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* 1. Leads API Card */}
        <div className="bg-[var(--color-surface)] border border-[var(--color-border)] p-5 rounded-md flex flex-col justify-between gap-4">
          <div className="flex justify-between items-start">
            <div className="min-w-0">
              <h3 className="text-xs font-bold text-[var(--color-text-primary)] uppercase tracking-wider">CRM Leads Database API</h3>
              <code className="text-[10px] text-[var(--color-text-muted)] block mt-1">GET /api/leads</code>
            </div>
            <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${
              apiHealth.leads.status === "healthy" ? "bg-[var(--color-success)]" :
              apiHealth.leads.status === "error" ? "bg-[var(--color-danger)]" : "bg-[var(--color-border)]"
            }`} />
          </div>

          <div className="bg-black/25 p-3 rounded-md border border-[var(--color-border)]">
            <span className="text-[9px] text-[var(--color-text-muted)] uppercase tracking-wider font-bold block mb-1">Latency & Status</span>
            <div className="text-xs text-[var(--color-text-secondary)] flex items-center justify-between">
              <span>Status: <strong className="text-[var(--color-text-primary)] capitalize">{apiHealth.leads.status}</strong></span>
              {apiHealth.leads.latency !== null && <span>Latency: <strong className="text-[var(--color-text-primary)]">{apiHealth.leads.latency}ms</strong></span>}
            </div>
          </div>

          <button
            onClick={() => pingEndpoint("leads", "/api/leads", "GET")}
            disabled={pinging.leads}
            className="w-full bg-[var(--color-border)] hover:bg-[var(--color-border)]/80 text-[var(--color-text-primary)] font-bold text-[11px] py-2 rounded-md transition-all cursor-pointer flex items-center justify-center gap-1.5 border border-transparent hover:border-[var(--color-primary)]/20"
          >
            {pinging.leads ? <Loader size={12} className="animate-spin" /> : <RefreshCw size={12} />}
            Ping Leads Gateway
          </button>
        </div>

        {/* 2. Tasks API Card */}
        <div className="bg-[var(--color-surface)] border border-[var(--color-border)] p-5 rounded-md flex flex-col justify-between gap-4">
          <div className="flex justify-between items-start">
            <div className="min-w-0">
              <h3 className="text-xs font-bold text-[var(--color-text-primary)] uppercase tracking-wider">Background Tasks API</h3>
              <code className="text-[10px] text-[var(--color-text-muted)] block mt-1">GET /api/tasks</code>
            </div>
            <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${
              apiHealth.tasks.status === "healthy" ? "bg-[var(--color-success)]" :
              apiHealth.tasks.status === "error" ? "bg-[var(--color-danger)]" : "bg-[var(--color-border)]"
            }`} />
          </div>

          <div className="bg-black/25 p-3 rounded-md border border-[var(--color-border)]">
            <span className="text-[9px] text-[var(--color-text-muted)] uppercase tracking-wider font-bold block mb-1">Latency & Status</span>
            <div className="text-xs text-[var(--color-text-secondary)] flex items-center justify-between">
              <span>Status: <strong className="text-[var(--color-text-primary)] capitalize">{apiHealth.tasks.status}</strong></span>
              {apiHealth.tasks.latency !== null && <span>Latency: <strong className="text-[var(--color-text-primary)]">{apiHealth.tasks.latency}ms</strong></span>}
            </div>
          </div>

          <button
            onClick={() => pingEndpoint("tasks", "/api/tasks", "GET")}
            disabled={pinging.tasks}
            className="w-full bg-[var(--color-border)] hover:bg-[var(--color-border)]/80 text-[var(--color-text-primary)] font-bold text-[11px] py-2 rounded-md transition-all cursor-pointer flex items-center justify-center gap-1.5 border border-transparent hover:border-[var(--color-primary)]/20"
          >
            {pinging.tasks ? <Loader size={12} className="animate-spin" /> : <RefreshCw size={12} />}
            Ping Tasks Gateway
          </button>
        </div>

        {/* 3. Google Drive API Card */}
        <div className="bg-[var(--color-surface)] border border-[var(--color-border)] p-5 rounded-md flex flex-col justify-between gap-4">
          <div className="flex justify-between items-start">
            <div className="min-w-0">
              <h3 className="text-xs font-bold text-[var(--color-text-primary)] uppercase tracking-wider">Google Drive Storage Sync</h3>
              <code className="text-[10px] text-[var(--color-text-muted)] block mt-1">GET /api/drive</code>
            </div>
            <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${
              apiHealth.drive.status === "healthy" ? "bg-[var(--color-success)]" :
              apiHealth.drive.status === "error" ? "bg-[var(--color-danger)]" : "bg-[var(--color-border)]"
            }`} />
          </div>

          <div className="bg-black/25 p-3 rounded-md border border-[var(--color-border)]">
            <span className="text-[9px] text-[var(--color-text-muted)] uppercase tracking-wider font-bold block mb-1">Latency & Status</span>
            <div className="text-xs text-[var(--color-text-secondary)] flex items-center justify-between">
              <span>Status: <strong className="text-[var(--color-text-primary)] capitalize">{apiHealth.drive.status}</strong></span>
              {apiHealth.drive.latency !== null && <span>Latency: <strong className="text-[var(--color-text-primary)]">{apiHealth.drive.latency}ms</strong></span>}
            </div>
          </div>

          <button
            onClick={() => pingEndpoint("drive", "/api/drive", "GET")}
            disabled={pinging.drive}
            className="w-full bg-[var(--color-border)] hover:bg-[var(--color-border)]/80 text-[var(--color-text-primary)] font-bold text-[11px] py-2 rounded-md transition-all cursor-pointer flex items-center justify-center gap-1.5 border border-transparent hover:border-[var(--color-primary)]/20"
          >
            {pinging.drive ? <Loader size={12} className="animate-spin" /> : <RefreshCw size={12} />}
            Ping Drive Sync
          </button>
        </div>

        {/* 4. SQLite Sync Gateway Card */}
        <div className="bg-[var(--color-surface)] border border-[var(--color-border)] p-5 rounded-md flex flex-col justify-between gap-4">
          <div className="flex justify-between items-start">
            <div className="min-w-0">
              <h3 className="text-xs font-bold text-[var(--color-text-primary)] uppercase tracking-wider">SQLite Drizzle Sync Gateway</h3>
              <code className="text-[10px] text-[var(--color-text-muted)] block mt-1">POST /api/sync</code>
            </div>
            <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${
              apiHealth.sync.status === "healthy" ? "bg-[var(--color-success)]" :
              apiHealth.sync.status === "error" ? "bg-[var(--color-danger)]" : "bg-[var(--color-border)]"
            }`} />
          </div>

          <div className="bg-black/25 p-3 rounded-md border border-[var(--color-border)]">
            <span className="text-[9px] text-[var(--color-text-muted)] uppercase tracking-wider font-bold block mb-1">Latency & Status</span>
            <div className="text-xs text-[var(--color-text-secondary)] flex items-center justify-between">
              <span>Status: <strong className="text-[var(--color-text-primary)] capitalize">{apiHealth.sync.status}</strong></span>
              {apiHealth.sync.latency !== null && <span>Latency: <strong className="text-[var(--color-text-primary)]">{apiHealth.sync.latency}ms</strong></span>}
            </div>
          </div>

          <button
            onClick={() => pingEndpoint("sync", "/api/sync", "POST", { operations: [] })}
            disabled={pinging.sync}
            className="w-full bg-[var(--color-border)] hover:bg-[var(--color-border)]/80 text-[var(--text-primary)] font-bold text-[11px] py-2 rounded-md transition-all cursor-pointer flex items-center justify-center gap-1.5 border border-transparent hover:border-[var(--color-primary)]/20"
          >
            {pinging.sync ? <Loader size={12} className="animate-spin" /> : <RefreshCw size={12} />}
            Ping Database Sync
          </button>
        </div>

      </div>

      {/* Console Logs panel */}
      <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-md overflow-hidden shadow-sm">
        <div className="px-5 py-3.5 border-b border-[var(--color-border)] bg-black/5 flex items-center justify-between">
          <h3 className="text-xs font-bold text-[var(--color-text-primary)] uppercase tracking-wider">Integration Diagnostic Logs</h3>
          <span className="text-[9px] bg-[var(--color-border)] text-[var(--color-text-secondary)] font-mono px-2 py-0.5 rounded-sm">Console JSON</span>
        </div>

        <div className="p-4 bg-black/45 text-[11px] font-mono text-[var(--color-text-secondary)] overflow-x-auto max-h-64 leading-relaxed">
          {Object.values(apiHealth).every(h => h.status === "idle") ? (
            <div className="text-center italic py-6 text-[var(--color-text-muted)]">
              Diagnostic console is empty. Ping any gateway integration above to print response payloads.
            </div>
          ) : (
            <pre className="whitespace-pre">
              {JSON.stringify(apiHealth, null, 2)}
            </pre>
          )}
        </div>
      </div>

    </div>
  );
}
