"use client";

import React, { useEffect, useState } from "react";
import api, { SessionStats, SessionSummary } from "../../app/lib/api";
import { Activity, Radio, Cpu, Database, Plus, RefreshCw, Send, ShieldCheck } from "lucide-react";

export default function DashboardView() {
  const [stats, setStats] = useState<SessionStats | null>(null);
  const [sessionsList, setSessionsList] = useState<SessionSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      setError(null);
      const [statsRes, sessionsRes] = await Promise.all([
        api.sessions.stats(),
        api.sessions.list()
      ]);
      setStats(statsRes);
      setSessionsList(sessionsRes);
    } catch (err: any) {
      setError(err.message || "Failed to load dashboard statistics");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  return (
    <div className="space-y-8 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
            System Overview
          </h1>
          <p className="text-sm text-[var(--color-text-secondary)] mt-1">
            Real-time status monitoring and stats for your WhatsApp gateway nodes.
          </p>
        </div>
        <button
          onClick={fetchDashboardData}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-[var(--radius-md)] bg-[var(--color-surface)] border border-[var(--color-border)] hover:border-indigo-500 hover:text-white transition-all duration-300 shadow-md active:scale-95 disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </button>
      </div>

      {error && (
        <div className="p-4 rounded-[var(--radius-md)] bg-rose-500/10 border border-rose-500/20 text-rose-300 text-sm">
          {error}
        </div>
      )}

      {/* Stats grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="glass-card p-6 rounded-[var(--radius-lg)]">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-[var(--color-text-secondary)]">Active Nodes</span>
            <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
              <Radio className="w-5 h-5 animate-pulse" />
            </div>
          </div>
          <div className="mt-4">
            <span className="text-3xl font-black text-white">{stats?.active ?? 0}</span>
            <span className="text-xs text-[var(--color-text-muted)] ml-2">/ {stats?.total ?? 0} total</span>
          </div>
        </div>

        <div className="glass-card p-6 rounded-[var(--radius-lg)]">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-[var(--color-text-secondary)]">System Load</span>
            <div className="p-2.5 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400">
              <Cpu className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4">
            <span className="text-3xl font-black text-white">
              {stats?.memoryUsage ? formatBytes(stats.memoryUsage.heapUsed) : "0 MB"}
            </span>
            <span className="text-xs text-[var(--color-text-muted)] ml-2">allocated heap</span>
          </div>
        </div>

        <div className="glass-card p-6 rounded-[var(--radius-lg)]">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-[var(--color-text-secondary)]">API Security</span>
            <div className="p-2.5 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-400">
              <ShieldCheck className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4">
            <span className="text-3xl font-black text-white">Enforced</span>
            <span className="text-xs text-[var(--color-text-muted)] ml-2">SHA-256 validation</span>
          </div>
        </div>

        <div className="glass-card p-6 rounded-[var(--radius-lg)]">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-[var(--color-text-secondary)]">Webhooks Status</span>
            <div className="p-2.5 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400">
              <Activity className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4">
            <span className="text-3xl font-black text-white">Healthy</span>
            <span className="text-xs text-[var(--color-text-muted)] ml-2">Live event feeds</span>
          </div>
        </div>
      </div>

      {/* Nodes list */}
      <div className="glass-card p-6 rounded-[var(--radius-lg)]">
        <h2 className="text-lg font-bold text-white mb-4">Active WhatsApp Gateway Sessions</h2>
        {sessionsList.length === 0 ? (
          <div className="text-center py-8 text-[var(--color-text-secondary)]">
            No active nodes registered. Create one in the Sessions tab.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-[var(--color-border)] text-xs font-semibold text-[var(--color-text-secondary)] uppercase tracking-wider">
                  <th className="py-3 px-4">Node Name</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Phone Number</th>
                  <th className="py-3 px-4">Linked Device User</th>
                  <th className="py-3 px-4">Last Sync</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--color-border)] text-sm">
                {sessionsList.map((session) => (
                  <tr key={session.id} className="hover:bg-white/5 transition-colors">
                    <td className="py-4 px-4 font-mono font-bold text-white">{session.id}</td>
                    <td className="py-4 px-4">
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          session.status === "ready"
                            ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/20"
                            : "bg-amber-500/15 text-amber-400 border border-amber-500/20"
                        }`}
                      >
                        {session.status.toUpperCase()}
                      </span>
                    </td>
                    <td className="py-4 px-4 text-[var(--color-text-secondary)]">
                      {session.phone || "Not linked"}
                    </td>
                    <td className="py-4 px-4 text-[var(--color-text-secondary)]">
                      {session.pushName || "N/A"}
                    </td>
                    <td className="py-4 px-4 text-xs text-[var(--color-text-muted)]">
                      {session.updatedAt ? new Date(session.updatedAt).toLocaleString() : "Never"}
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
