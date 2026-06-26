"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import api, { getErrorMessage, type SessionSummary } from "@/app/lib/api";
import { Plus, Trash2, Loader2 } from "lucide-react";

export default function SessionsPage() {
  const [sessions, setSessions] = useState<SessionSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchSessions = async () => {
    try { setSessions(await api.sessions.list()); } catch (e: unknown) { setError(getErrorMessage(e)); } finally { setLoading(false); }
  };

  useEffect(() => { fetchSessions(); const i = setInterval(fetchSessions, 10000); return () => clearInterval(i); }, []);

  const handleDelete = async (id: string) => {
    if (!confirm("Delete session?")) return;
    try { await api.sessions.delete(id); setSessions((p) => p.filter((s) => s.id !== id)); } catch (e: unknown) { alert(getErrorMessage(e)); }
  };

  const statusColor = (s: string) =>
    s === "ready" ? "text-green-400" : s === "qr_ready" || s === "initializing" ? "text-amber-400" : "text-gray-500";

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h1 className="text-lg font-semibold">Sessions</h1>
        <Link href="/sessions/new" className="flex items-center gap-1 px-3 py-1.5 bg-[#30d5c8] text-[#0a0a0c] text-xs rounded font-medium">
          <Plus className="h-3.5 w-3.5" /> New
        </Link>
      </div>
      {loading && <Loader2 className="h-4 w-4 animate-spin text-gray-500" />}
      {error && <p className="text-red-400 text-xs">{error}</p>}
      {!loading && !error && (
        <div className="bg-[#121215] rounded-lg overflow-hidden">
          <table className="min-w-full text-sm">
            <thead className="bg-[#0a0a0c]"><tr>
              <th className="px-4 py-2 text-left text-xs text-gray-500 font-medium">Name</th>
              <th className="px-4 py-2 text-left text-xs text-gray-500 font-medium">Status</th>
              <th className="px-4 py-2 text-left text-xs text-gray-500 font-medium">Phone</th>
              <th className="px-4 py-2 text-right text-xs text-gray-500 font-medium">Actions</th>
            </tr></thead>
            <tbody className="divide-y divide-[#22222a]">
              {sessions.length === 0 ? (
                <tr><td colSpan={4} className="px-4 py-8 text-center text-gray-600 text-xs">No sessions</td></tr>
              ) : sessions.map((s) => (
                <tr key={s.id} className="hover:bg-[#1a1a20]">
                  <td className="px-4 py-2"><Link href={`/sessions/${s.id}`} className="text-[#30d5c8] hover:underline">{s.name || s.id}</Link></td>
                  <td className={`px-4 py-2 text-xs ${statusColor(s.status)}`}>{s.status}</td>
                  <td className="px-4 py-2 text-xs text-gray-400">{s.phone || "-"}</td>
                  <td className="px-4 py-2 text-right">
                    <button onClick={() => handleDelete(s.id)} className="text-gray-600 hover:text-red-400"><Trash2 className="h-3.5 w-3.5" /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
