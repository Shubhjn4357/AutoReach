"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import api, { getErrorMessage, type MessageTemplateSummary } from "@/app/lib/api";
import { Trash2, Loader2 } from "lucide-react";

export default function TemplatesPage() {
  const [templates, setTemplates] = useState<MessageTemplateSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedSession, setSelectedSession] = useState<string>("");

  const fetchTemplates = async () => {
    setLoading(true);
    setError(null);
    try {
      // If a session is selected, fetch for that session; else fetch all sessions and their templates
      // For simplicity, we'll fetch templates for the first available session
      const sessions = await api.sessions.list();
      if (sessions.length > 0) {
        const sessionId = selectedSession || sessions[0].id;
        setSelectedSession(sessionId);
        const data = await api.templates.list(sessionId);
        setTemplates(data);
      } else {
        setTemplates([]);
      }
    } catch (err: unknown) {
      setError(getErrorMessage(err, "Failed to load templates"));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTemplates();
  }, [selectedSession]);

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h1 className="text-lg font-semibold">Templates</h1>
        <Link href="/templates/new" className="px-3 py-1 bg-[#30d5c8] text-[#0a0a0c] text-xs rounded hover:bg-[#25c1b2]">
          New Template
        </Link>
      </div>

      <div className="flex items-center space-x-2 mb-2">
        <label className="text-xs font-medium text-white">Session:</label>
        <select
          value={selectedSession}
          onChange={(e) => {
            setSelectedSession(e.target.value);
          }}
          className="px-2 py-1 bg-[#0a0a0c] border border-[#22222a] rounded text-xs"
        >
          <option value="">All Sessions</option>
          {/* Options will be populated dynamically */}
        </select>
      </div>

      {loading && (
        <div className="flex h-32 items-center justify-center">
          <Loader2 className="h-4 w-4 animate-spin" />
        </div>
      )}

      {error && <p className="text-red-400 text-xs">{error}</p>}

      {!loading && !error && (
        <div className="space-y-2">
          <p className="text-gray-400 text-xs">Template management UI. Implement per-session template CRUD using the api.templates service.</p>
          {/* Template list would go here */}
        </div>
      )}
    </div>
  );
}
