"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import api, { getErrorMessage, type ApiKeySummary } from "@/app/lib/api";
import { Trash2, Copy, Loader2, Plus } from "lucide-react";

export default function ApiKeysPage() {
  const [apiKeys, setApiKeys] = useState<ApiKeySummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchApiKeys = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.apiKeys.list();
      setApiKeys(data);
    } catch (err: unknown) {
      setError(getErrorMessage(err, "Failed to load API keys"));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchApiKeys();
  }, []);

  const handleRevoke = async (id: string) => {
    if (window.confirm("Revoke this API key?")) {
      try {
        await api.apiKeys.revoke(id);
        setApiKeys(prev => prev.filter(key => key.id !== id));
      } catch (err: unknown) {
        alert("Error revoking key: " + getErrorMessage(err));
      }
    }
  };

  const handleCopy = (key: string) => {
    navigator.clipboard.writeText(key).then(
      () => alert("API key copied to clipboard"),
      (err) => alert("Failed to copy: " + err)
    );
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h1 className="text-lg font-semibold">API Keys</h1>
        <Link href="/api-keys/new" className="flex items-center gap-1 px-3 py-1.5 bg-[#30d5c8] text-[#0a0a0c] text-xs rounded font-medium">
          <Plus className="h-3.5 w-3.5" /> New Key
        </Link>
      </div>
      {loading && <Loader2 className="h-4 w-4 animate-spin text-gray-500" />}
      {error && <p className="text-red-400 text-xs">{error}</p>}
      {!loading && !error && (
        <div className="bg-[#121215] rounded-lg overflow-hidden">
          <table className="min-w-full text-sm">
            <thead className="bg-[#0a0a0c]"><tr>
              <th className="px-4 py-2 text-left text-xs text-gray-500 font-medium">Name</th>
              <th className="px-4 py-2 text-left text-xs text-gray-500 font-medium">Key Prefix</th>
              <th className="px-4 py-2 text-left text-xs text-gray-500 font-medium">Role</th>
              <th className="px-4 py-2 text-left text-xs text-gray-500 font-medium">Status</th>
              <th className="px-4 py-2 text-right text-xs text-gray-500 font-medium">Actions</th>
            </tr></thead>
            <tbody className="divide-y divide-[#22222a]">
              {apiKeys.length === 0 ? (
                <tr><td colSpan={5} className="px-4 py-8 text-center text-gray-600 text-xs">No API keys</td></tr>
              ) : (
                apiKeys.map((key) => (
                  <tr key={key.id} className="hover:bg-[#1a1a20]">
                    <td className="px-4 py-2">{key.name}</td>
                    <td className="px-4 py-2">{key.keyPrefix}</td>
                    <td className="px-4 py-2 text-capitalize">{key.role}</td>
                    <td className="px-4 py-2 text-xs">{key.isActive ? "Active" : "Inactive"}</td>
                    <td className="px-4 py-2 text-right text-xs space-x-2">
                      <button
                        onClick={() => {
                          // Edit not implemented in this minimal version
                          alert("Edit functionality not implemented in minimal design");
                        }}
                        className="text-gray-600 hover:text-gray-300"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => {
                          if (key.apiKey) {
                            navigator.clipboard.writeText(key.apiKey).then(
                              () => alert("API key copied to clipboard"),
                              (err) => alert("Failed to copy: " + err)
                            );
                          } else {
                            alert("Full key only shown upon creation");
                          }
                        }}
                        className="text-green-600 hover:text-green-400"
                      >
                        <Copy className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={() => handleRevoke(key.id)}
                        className="text-red-600 hover:text-red-400"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
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
