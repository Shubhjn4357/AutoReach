"use client"

import { useState } from "react";
import { useRouter } from "next/navigation";
import api, { getErrorMessage } from "@/app/lib/api";
import { Loader2, CheckCircle2 } from "lucide-react";
import Link from "next/link";

export default function NewApiKeyPage() {
  const [name, setName] = useState("");
  const [role, setRole] = useState("admin");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [apiKey, setApiKey] = useState<string | null>(null);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(false);
    try {
      const data = await api.apiKeys.create(name, role);
      setApiKey(data.apiKey);
      setSuccess(true);
      // Optionally redirect after a delay
      setTimeout(() => {
        router.push("/api-keys");
      }, 3000);
    } catch (err: unknown) {
      setError(getErrorMessage(err, "Failed to create API key"));
    } finally {
      setLoading(false);
    }
  };

  if (success && apiKey) {
    return (
      <div className="space-y-4">
        <div className="flex flex-col items-center text-center">
          <CheckCircle2 className="h-8 w-8 text-green-400 mb-2" />
          <h2 className="text-lg font-semibold">API Key Created</h2>
          <p className="text-xs text-gray-400">Your API key has been generated. Please copy it now as it won't be shown again.</p>
        </div>

        <div className="bg-[#0a0a0c] rounded-lg p-4">
          <div className="space-y-2">
            <p className="text-xs font-medium">Key Preview:</p>
            <div className="font-mono bg-[#121215] p-2 rounded">
              {apiKey.substring(0, 8)}...{apiKey.slice(-8)}
            </div>
            <p className="text-xs text-gray-400">Full key: <code className="bg-[#121215] px-1 rounded">{apiKey}</code></p>
            <button
              onClick={() => navigator.clipboard.writeText(apiKey)}
              className="w-full px-3 py-1 bg-[#30d5c8] text-[#0a0a0c] text-xs rounded hover:bg-[#25c1b2]"
            >
              Copy Full Key
            </button>
          </div>
        </div>

        <div className="text-xs text-gray-400">
          Redirecting to API keys list in 3 seconds...
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h1 className="text-lg font-semibold">Create New API Key</h1>
        <Link href="/api-keys" className="px-3 py-1 bg-[#30d5c8] text-[#0a0a0c] text-xs rounded hover:bg-[#25c1b2]">
          Back to List
        </Link>
      </div>

      <form onSubmit={handleSubmit} className="space-y-3">
        <div>
          <label className="block text-xs font-medium text-white mb-1">Name</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            className="w-full px-2 py-1 bg-[#0a0a0c] border border-[#22222a] rounded text-xs"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-white mb-1">Role</label>
          <select
            value={role}
            onChange={(e) => setRole(e.target.value)}
            className="w-full px-2 py-1 bg-[#0a0a0c] border border-[#22222a] rounded text-xs"
          >
            <option value="admin">Admin</option>
            <option value="user">User</option>
            <option value="readonly">Read Only</option>
          </select>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full px-3 py-1 bg-[#30d5c8] text-[#0a0a0c] text-xs font-medium rounded disabled:opacity-50 hover:bg-[#25c1b2]"
        >
          {loading ? "Creating..." : "Create API Key"}
        </button>

        {error && <p className="text-red-400 text-xs">{error}</p>}
      </form>
    </div>
  );
}
