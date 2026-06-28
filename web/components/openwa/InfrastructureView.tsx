"use client";

import React, { useEffect, useState } from "react";
import api, { InfraStatus } from "../../app/lib/api";
import { Database, Layers, Cpu, HardDrive, RefreshCw } from "lucide-react";

export default function InfrastructureView() {
  const [status, setStatus] = useState<InfraStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchDiagnosticData = async () => {
    try {
      setLoading(true);
      const statusRes = await api.infra.status();
      setStatus(statusRes);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to load infrastructure diagnostics");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDiagnosticData();
  }, []);

  return (
    <div className="space-y-8 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
            Infrastructure & Diagnostics
          </h1>
          <p className="text-sm text-[var(--color-text-secondary)] mt-1">
            Validate active state and config of databases, message brokers, and queues.
          </p>
        </div>
        <button
          onClick={fetchDiagnosticData}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-[var(--radius-md)] bg-[var(--color-surface)] border border-[var(--color-border)] hover:border-indigo-500 hover:text-white transition-all duration-300 shadow-md active:scale-95"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          Run Health Check
        </button>
      </div>

      {error && (
        <div className="p-4 rounded-[var(--radius-md)] bg-rose-500/10 border border-rose-500/20 text-rose-300 text-sm">
          {error}
        </div>
      )}

      {/* Grid status cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* SQL Database */}
        <div className="glass-card p-6 rounded-[var(--radius-lg)] space-y-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 rounded-lg">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-white text-base">Relational Database</h3>
              <p className="text-xs text-[var(--color-text-secondary)]">Local persistent SQLite instance</p>
            </div>
          </div>

          <div className="space-y-2 text-sm text-[var(--color-text-secondary)]">
            <div className="flex justify-between">
              <span>Status</span>
              <span className="text-emerald-400 font-semibold flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                Connected
              </span>
            </div>
            <div className="flex justify-between">
              <span>Driver Type</span>
              <span className="font-mono text-white">libsql / sqlite3</span>
            </div>
            <div className="flex justify-between">
              <span>Storage Source</span>
              <span className="font-mono text-white">file:local.db</span>
            </div>
          </div>
        </div>

        {/* Redis Broker */}
        <div className="glass-card p-6 rounded-[var(--radius-lg)] space-y-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-500/10 border border-purple-500/20 text-purple-400 rounded-lg">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-white text-base">Redis Event Broker</h3>
              <p className="text-xs text-[var(--color-text-secondary)]">Job queue and distributed cache</p>
            </div>
          </div>

          {(() => {
            const redisObj = status?.redis && typeof status.redis === "object" ? status.redis : null;
            return (
              <div className="space-y-2 text-sm text-[var(--color-text-secondary)]">
                <div className="flex justify-between">
                  <span>Status</span>
                  {redisObj?.connected ? (
                    <span className="text-emerald-400 font-semibold flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                      Connected
                    </span>
                  ) : (
                    <span className="text-zinc-500 font-semibold flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-zinc-500"></span>
                      Bypassed
                    </span>
                  )}
                </div>
                <div className="flex justify-between">
                  <span>Broker Mode</span>
                  <span className="text-white">
                    {redisObj?.connected ? "Redis Distributed Broker" : "SQLite Memory Fallback"}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Hostname</span>
                  <span className="font-mono text-white">
                    {redisObj?.host || "127.0.0.1"}:{redisObj?.port || 6379}
                  </span>
                </div>
              </div>
            );
          })()}
        </div>

        {/* Node Engine */}
        <div className="glass-card p-6 rounded-[var(--radius-lg)] space-y-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 rounded-lg">
              <Cpu className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-white text-base">WhatsApp Gateway Socket</h3>
              <p className="text-xs text-[var(--color-text-secondary)]">Stateful session coordinator engine</p>
            </div>
          </div>

          <div className="space-y-2 text-sm text-[var(--color-text-secondary)]">
            <div className="flex justify-between">
              <span>Engine Driver</span>
              <span className="font-mono text-white">@whiskeysockets/baileys</span>
            </div>
            <div className="flex justify-between">
              <span>Connection Strategy</span>
              <span className="text-white">Stateful Long-polling Socket</span>
            </div>
            <div className="flex justify-between">
              <span>Headless Mode</span>
              <span className="text-emerald-400 font-semibold">Enabled (Node CLI)</span>
            </div>
          </div>
        </div>

        {/* Local Storage */}
        <div className="glass-card p-6 rounded-[var(--radius-lg)] space-y-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-pink-500/10 border border-pink-500/20 text-pink-400 rounded-lg">
              <HardDrive className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-white text-base">File Storage</h3>
              <p className="text-xs text-[var(--color-text-secondary)]">Local directory and S3 state backups</p>
            </div>
          </div>

          <div className="space-y-2 text-sm text-[var(--color-text-secondary)]">
            <div className="flex justify-between">
              <span>Strategy</span>
              <span className="text-white">Local Directory Backup</span>
            </div>
            <div className="flex justify-between">
              <span>Local Session Path</span>
              <span className="font-mono text-white">./sessions</span>
            </div>
            <div className="flex justify-between">
              <span>S3 Integration</span>
              <span className="text-zinc-500 font-semibold">Disabled (Offline Mode)</span>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
