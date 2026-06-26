"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import api, { getErrorMessage, type WebhookSummary } from "@/app/lib/api";
import { Trash2, Loader2, RefreshCw } from "lucide-react";

export default function WebhooksPage() {
  const [webhooks, setWebhooks] = useState<WebhookSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchWebhooks = async () => {
    setLoading(true);
    setError(null);
    try {
      // Get all webhooks (no session filter)
      const data = await api.webhooks.list();
      setWebhooks(data);
    } catch (err: unknown) {
      setError(getErrorMessage(err, "Failed to load webhooks"));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWebhooks();
    const interval = setInterval(fetchWebhooks, 10000);
    return () => clearInterval(interval);
  }, []);

  const handleDelete = async (sessionId: string, webhookId: string) => {
    if (window.confirm("Delete this webhook?")) {
      try {
        await api.webhooks.delete(sessionId, webhookId);
        setWebhooks(prev => prev.filter(w => !(w.sessionId === sessionId && w.id === webhookId)));
      } catch (err: unknown) {
        alert("Error deleting webhook: " + getErrorMessage(err));
      }
    }
  };

  const handleRefresh = async () => {
    await fetchWebhooks();
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h1 className="text-lg font-semibold">Webhooks</h1>
        <div className="flex items-center space-x-2">
          <button
            onClick={handleRefresh}
            className="px-2 py-1 bg-[#30d5c8] text-[#0a0a0c] text-xs rounded hover:bg-[#25c1b2]"
          >
            <RefreshCw className="h-3 w-3 mr-1" />
            Refresh
          </button>
        </div>
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
                <th className="px-3 py-1 text-left text-xs text-gray-500 font-medium">Session</th>
                <th className="px-3 py-1 text-left text-xs text-gray-500 font-medium">URL</th>
                <th className="px-3 py-1 text-left text-xs text-gray-500 font-medium">Events</th>
                <th className="px-3 py-1 text-left text-xs text-gray-500 font-medium">Active</th>
                <th className="px-3 py-1 text-left text-xs text-gray-500 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#22222a]">
              {webhooks.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-3 py-4 text-center text-gray-600 text-xs">No webhooks found</td>
                </tr>
              ) : (
                webhooks.map((w) => (
                  <tr key={w.id} className="hover:bg-[#1a1a20]">
                    <td className="px-3 py-1">{w.sessionId}</td>
                    <td className="px-3 py-1 break-all text-xs">{w.url}</td>
                    <td className="px-3 py-1 text-xs">
                      {w.events.map((e: string) => (
                        <span key={e} className="inline-block px-1 py-0 bg-[#0a0a0c] text-xs mr-1 mb-1 rounded">
                          {e}
                        </span>
                      ))} 
                    </td>
                    <td className="px-3 py-1">
                      <span className={w.active ? "text-green-400" : "text-red-400"}>
                        {w.active ? "Yes" : "No"}
                      </span>
                    </td>
                    <td className="px-3 py-1 text-right text-xs space-x-1">
                      <button
                        onClick={() => {
                          // Trigger test
                          alert("Test webhook functionality not implemented yet");
                        }}
                        className="text-blue-600 hover:text-blue-400"
                      >
                        Test
                      </button>
                      <button
                        onClick={() => handleDelete(w.sessionId, w.id)}
                        className="text-red-600 hover:text-red-400"
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
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
