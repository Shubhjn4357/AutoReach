"use client";

import { useEffect, useState } from "react";
import api, { getErrorMessage, type AuditLogSummary } from "@/app/lib/api";
import { Loader2 } from "lucide-react";

export default function LogsPage() {
  const [logs, setLogs] = useState<AuditLogSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState({ action: "", severity: "" });

  const fetchLogs = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.auditLogs.list();
      // Apply client-side filtering since API doesn't support it yet
      const filteredLogs = data.data.filter(log => {
        if (filters.action && !log.action.toLowerCase().includes(filters.action.toLowerCase())) {
          return false;
        }
        if (filters.severity && log.severity !== filters.severity) {
          return false;
        }
        return true;
      });
      setLogs(filteredLogs);
    } catch (err: unknown) {
      setError(getErrorMessage(err, "Failed to load logs"));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, [filters]);

  const handleFilterChange = (e: React.ChangeEvent<HTMLSelectElement | HTMLInputElement>) => {
    const { name, value } = e.target;
    setFilters((prev) => ({ ...prev, [name]: value }));
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h1 className="text-lg font-semibold">Audit Logs</h1>
      </div>

      <div className="space-y-2">
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          <div>
            <label className="block text-xs font-medium text-white mb-1">Action Filter</label>
            <input
              name="action"
              value={filters.action}
              onChange={handleFilterChange}
              className="w-full px-2 py-1 bg-[#0a0a0c] border border-[#22222a] rounded text-xs placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-[#30d5c8]"
              placeholder="e.g., message.send"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-white mb-1">Severity Filter</label>
            <select
              name="severity"
              value={filters.severity}
              onChange={handleFilterChange}
              className="w-full px-2 py-1 bg-[#0a0a0c] border border-[#22222a] rounded text-xs placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-[#30d5c8]"
            >
              <option value="">All</option>
              <option value="info">Info</option>
              <option value="warn">Warning</option>
              <option value="error">Error</option>
            </select>
          </div>
        </div>
      </div>

      {loading && <Loader2 className="h-4 w-4 animate-spin text-gray-500" />}
      {error && <p className="text-red-400 text-xs">{error}</p>}

      {!loading && !error && (
        <div className="bg-[#121215] rounded-lg overflow-hidden">
          <table className="min-w-full text-xs">
            <thead className="bg-[#0a0a0c]"><tr>
              <th className="px-3 py-1 text-left text-xs text-gray-500 font-medium">Time</th>
              <th className="px-3 py-1 text-left text-xs text-gray-500 font-medium">Action</th>
              <th className="px-3 py-1 text-left text-xs text-gray-500 font-medium">Severity</th>
              <th className="px-3 py-1 text-left text-xs text-gray-500 font-medium">Source</th>
              <th className="px-3 py-1 text-left text-xs text-gray-500 font-medium">Message</th>
            </tr></thead>
            <tbody className="divide-y divide-[#22222a]">
              {logs.length === 0 ? (
                <tr><td colSpan={5} className="px-3 py-4 text-center text-gray-600 text-xs">No logs found</td></tr>
              ) : (
                logs.map((log) => (
                  <tr key={log.id} className="hover:bg-[#1a1a20]">
                    <td className="px-3 py-1 whitespace-nowrap">{new Date(log.createdAt).toLocaleString()}</td>
                    <td className="px-3 py-1 whitespace-nowrap break-all">{log.action}</td>
                    <td className="px-3 py-1">
                      <span
                        className="px-1 py-0 rounded text-xs"
                      >
                        {log.severity}
                      </span>
                    </td>
                    <td className="px-3 py-1 whitespace-nowrap text-xs">
                      {(log.apiKeyName || log.sessionId) && (
                        <div className="space-y-0.5">
                          {log.apiKeyName && (
                            <div>
                              API Key: <strong className="whitespace-nowrap">{log.apiKeyName}</strong>
                            </div>
                          )}
                          {log.sessionId && (
                            <div className="mt-0.5">
                              Session: <strong className="whitespace-nowrap">{log.sessionId}</strong>
                            </div>
                          )}
                        </div>
                      )}
                      {"-"}
                    </td>
                    <td className="px-3 py-1 whitespace-nowrap break-all text-xs">
                      {log.errorMessage || "-"}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
