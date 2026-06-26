"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import api, { getErrorMessage, type PluginSummary } from "@/app/lib/api";
import { Loader2, PlayCircle, PauseCircle } from "lucide-react";

export default function PluginsPage() {
  const [plugins, setPlugins] = useState<PluginSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchPlugins = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.plugins.list();
      setPlugins(data);
    } catch (err: unknown) {
      setError(getErrorMessage(err, "Failed to load plugins"));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPlugins();
    const interval = setInterval(fetchPlugins, 15000);
    return () => clearInterval(interval);
  }, []);

  const handleToggle = async (plugin: PluginSummary) => {
    try {
      if (plugin.status === "enabled") {
        await api.plugins.disable(plugin.id);
      } else {
        await api.plugins.enable(plugin.id);
      }
      // Refresh after toggle
      await fetchPlugins();
    } catch (err: unknown) {
      alert("Error toggling plugin: " + getErrorMessage(err));
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h1 className="text-lg font-semibold">Plugins</h1>
        <Link href="/plugins/new" className="px-3 py-1 bg-[#30d5c8] text-[#0a0a0c] text-xs rounded hover:bg-[#25c1b2]">
          Upload Plugin
        </Link>
      </div>

      {loading && (
        <div className="flex h-32 items-center justify-center">
          <Loader2 className="h-4 w-4 animate-spin" />
        </div>
      )}

      {error && <p className="text-red-400 text-xs">{error}</p>}

      {!loading && !error && (
        <div className="overflow-x-auto">
          <table className="min-w-full bg-[#121215] rounded-xl overflow-hidden">
            <thead className="bg-[#0a0a0c]">
              <tr>
                <th className="px-3 py-1 text-left text-xs text-gray-500 font-medium">Name</th>
                <th className="px-3 py-1 text-left text-xs text-gray-500 font-medium">Type</th>
                <th className="px-3 py-1 text-left text-xs text-gray-500 font-medium">Version</th>
                <th className="px-3 py-1 text-left text-xs text-gray-500 font-medium">Status</th>
                <th className="px-3 py-1 text-left text-xs text-gray-500 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#22222a]">
              {plugins.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-3 py-4 text-center text-gray-600 text-xs">No plugins installed</td>
                </tr>
              ) : 
                plugins.map((p) => (
                  <tr key={p.id} className="hover:bg-[#1a1a20]">
                    <td className="px-3 py-1">
                      <div className="flex items-center space-x-2">
                        <div className="h-6 w-6 bg-[#0a0a0c] flex items-center justify-center rounded-full text-xs">
                          {p.name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <p className="text-xs font-medium text-white">{p.name}</p>
                          {p.description && <p className="text-xs text-gray-400">{p.description}</p>}
                        </div>
                      </div>
                    </td>
                    <td className="px-3 py-1 whitespace-nowrap">{p.type}</td>
                    <td className="px-3 py-1 whitespace-nowrap">{p.version}</td>
                    <td className="px-3 py-1 whitespace-nowrap">
                      <span
                        className={`px-1 py-0 rounded text-xs ${
                          p.status === "enabled" ? "bg-emerald-500/15 text-emerald-300" : "bg-gray-500/15 text-gray-300"
                        }`}
                      >
                        {p.status}
                      </span>
                    </td>
                    <td className="px-3 py-1 whitespace-nowrap text-right text-xs space-x-1">
                      <button
                        onClick={() => handleToggle(p)}
                        className="inline-flex items-center gap-1 px-1 py-0 rounded text-xs"
                      >
                        {p.status === "enabled" ? <PauseCircle className="h-3 w-3" /> : <PlayCircle className="h-3 w-3" />}
                        {p.status === "enabled" ? "Disable" : "Enable"}
                      </button>
                      {p.type === "extension" && (
                        <button
                          onClick={() => alert("Configure plugin: " + p.name)}
                          className="ml-1 px-1 py-0 text-xs bg-blue-600/20 text-blue-400 rounded hover:bg-blue-600/30"
                        >
                          Configure
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              }
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
