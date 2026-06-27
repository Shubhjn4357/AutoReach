"use client";

import React, { useEffect, useState } from "react";
import api, { PluginSummary } from "../../app/lib/api";
import { ToggleLeft, ToggleRight, Radio, Shield, RefreshCw } from "lucide-react";

export default function PluginsView() {
  const [pluginsList, setPluginsList] = useState<PluginSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchPlugins = async () => {
    try {
      setLoading(true);
      const list = await api.plugins.list();
      setPluginsList(list);
    } catch (err: any) {
      setError(err.message || "Failed to load system extensions");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPlugins();
  }, []);

  const handleTogglePlugin = async (id: string, currentStatus: string) => {
    try {
      if (currentStatus === "enabled") {
        await api.plugins.disable(id);
      } else {
        await api.plugins.enable(id);
      }
      fetchPlugins();
    } catch (err: any) {
      setError(err.message || "Failed to update plugin state");
    }
  };

  return (
    <div className="space-y-8 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
            System Extensions
          </h1>
          <p className="text-sm text-[var(--color-text-secondary)] mt-1">
            Toggle global backend background handlers, automation services, and LLM integrations.
          </p>
        </div>
        <button
          onClick={fetchPlugins}
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

      {/* Extensions grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {pluginsList.map((plugin) => {
          const isEnabled = plugin.status === "enabled";
          return (
            <div key={plugin.id} className="glass-card p-6 rounded-[var(--radius-lg)] flex flex-col justify-between h-[200px]">
              <div>
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-white text-base">{plugin.name}</h3>
                  <span className="text-[10px] text-[var(--color-text-muted)] font-mono uppercase bg-white/5 border border-[var(--color-border)] px-2 py-0.5 rounded">
                    v{plugin.version}
                  </span>
                </div>
                <p className="text-sm text-[var(--color-text-secondary)] mt-2 leading-relaxed line-clamp-3">
                  {plugin.description}
                </p>
              </div>

              <div className="flex items-center justify-between border-t border-[var(--color-border)] pt-4 mt-4">
                <span className="text-xs text-[var(--color-text-muted)]">
                  Status:{" "}
                  <span className={`font-semibold ${isEnabled ? "text-indigo-400" : "text-zinc-500"}`}>
                    {plugin.status.toUpperCase()}
                  </span>
                </span>

                <button
                  onClick={() => handleTogglePlugin(plugin.id, plugin.status)}
                  className="text-[var(--color-text-secondary)] hover:text-white transition-all cursor-pointer"
                >
                  {isEnabled ? (
                    <ToggleRight className="w-10 h-10 text-indigo-500" />
                  ) : (
                    <ToggleLeft className="w-10 h-10 text-zinc-600" />
                  )}
                </button>
              </div>
            </div>
          );
        })}

          {pluginsList.length === 0 && !loading && (
            <div className="col-span-full text-center py-12 text-[var(--color-text-secondary)] glass-card rounded-[var(--radius-lg)]">
              No active system extensions detected on the backend host.
            </div>
          )}
        </div>
    </div>
  );
}
