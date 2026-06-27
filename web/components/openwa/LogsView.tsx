"use client";

import React, { useEffect, useState } from "react";
import api, { AuditLogSummary } from "../../app/lib/api";
import { Terminal, ShieldAlert, CheckCircle, RefreshCw } from "lucide-react";

export default function LogsView() {
  const [logs, setLogs] = useState<AuditLogSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAuditLogs = async () => {
    try {
      setLoading(true);
      const res = await api.auditLogs.list();
      setLogs(res.data || []);
    } catch (err: any) {
      setError(err.message || "Failed to load audit logs");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAuditLogs();
  }, []);

  return (
    <div className="space-y-8 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
            Audit Logs
          </h1>
          <p className="text-sm text-[var(--color-text-secondary)] mt-1">
            Browse cryptographic signatures, REST routes requested, status codes, and operations logs.
          </p>
        </div>
        <button
          onClick={fetchAuditLogs}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-[var(--radius-md)] bg-[var(--color-surface)] border border-[var(--color-border)] hover:border-indigo-500 hover:text-white transition-all duration-300 shadow-md active:scale-95"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          Reload
        </button>
      </div>

      {error && (
        <div className="p-4 rounded-[var(--radius-md)] bg-rose-500/10 border border-rose-500/20 text-rose-300 text-sm">
          {error}
        </div>
      )}

      {/* Grid list */}
      <div className="glass-card p-6 rounded-[var(--radius-lg)]">
        <h2 className="text-lg font-bold text-white mb-4">Operations Console</h2>
        {logs.length === 0 ? (
          <div className="text-center py-8 text-[var(--color-text-secondary)]">
            No system events logged in audit table.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-[var(--color-border)] text-xs font-semibold text-[var(--color-text-secondary)] uppercase tracking-wider">
                  <th className="py-3 px-4">Event Date</th>
                  <th className="py-3 px-4">Action</th>
                  <th className="py-3 px-4">Severity</th>
                  <th className="py-3 px-4">Key ID Tag</th>
                  <th className="py-3 px-4">Route Method</th>
                  <th className="py-3 px-4">Target Path</th>
                  <th className="py-3 px-4 text-right">HTTP Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--color-border)] font-mono text-xs">
                {logs.map((log) => (
                  <tr key={log.id} className="hover:bg-white/5 transition-colors">
                    <td className="py-3.5 px-4 text-[var(--color-text-muted)]">
                      {new Date(log.createdAt).toLocaleString()}
                    </td>
                    <td className="py-3.5 px-4 font-bold text-white">{log.action}</td>
                    <td className="py-3.5 px-4">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold ${
                          log.severity === "error"
                            ? "bg-rose-500/10 text-rose-400 border border-rose-500/20"
                            : log.severity === "warn"
                            ? "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                            : "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                        }`}
                      >
                        {log.severity.toUpperCase()}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-[var(--color-text-secondary)] truncate max-w-[120px]">
                      {log.apiKeyId || "System"}
                    </td>
                    <td className="py-3.5 px-4 text-[var(--color-text-secondary)]">{log.method || "N/A"}</td>
                    <td className="py-3.5 px-4 text-[var(--color-text-secondary)] truncate max-w-[200px]" title={log.path || ""}>
                      {log.path || "/"}
                    </td>
                    <td className="py-3.5 px-4 text-right font-bold text-indigo-400">
                      {log.statusCode || 200}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
