"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import api, { getErrorMessage, type InfraConfig, type InfraStatus } from "@/app/lib/api";
import { Loader2 } from "lucide-react";

export default function InfrastructurePage() {
  const [status, setStatus] = useState<InfraStatus | null>(null);
  const [config, setConfig] = useState<InfraConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchStatus = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.infra.status();
      setStatus(data);
    } catch (err: unknown) {
      setError(getErrorMessage(err, "Failed to fetch infrastructure status"));
    } finally {
      setLoading(false);
    }
  };

  const fetchConfig = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.infra.config();
      setConfig(data);
    } catch (err: unknown) {
      setError(getErrorMessage(err, "Failed to fetch infrastructure config"));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStatus();
    fetchConfig();
  }, []);

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h1 className="text-lg font-semibold">Infrastructure</h1>
        <Link href="/infrastructure/settings" className="px-3 py-1 bg-[#30d5c8] text-[#0a0a0c] text-xs rounded hover:bg-[#25c1b2]">
          Settings
        </Link>
      </div>

      {loading && (
        <div className="grid grid-cols-2 gap-4">
          <div className="flex h-32 items-center justify-center">
            <Loader2 className="h-4 w-4 animate-spin" />
          </div>
          <div className="flex h-32 items-center justify-center">
            <Loader2 className="h-4 w-4 animate-spin" />
          </div>
        </div>
      )}

      {error && <p className="text-red-400 text-xs">{error}</p>}

      {!loading && !error && (
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-[#121215] rounded-lg p-4">
            <h2 className="text-xs font-semibold mb-2">Status</h2>
            <pre className="text-xs bg-[#0a0a0c] p-2 rounded overflow-auto">{JSON.stringify(status, null, 2)}</pre>
          </div>
          <div className="bg-[#121215] rounded-lg p-4">
            <h2 className="text-xs font-semibold mb-2">Configuration</h2>
            <pre className="text-xs bg-[#0a0a0c] p-2 rounded overflow-auto">{JSON.stringify(config, null, 2)}</pre>
          </div>
        </div>
      )}
    </div>
  );
}
