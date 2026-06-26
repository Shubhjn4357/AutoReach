"use client";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import api, { type SessionSummary } from "@/app/lib/api";
import { Trash2, RefreshCw, Play, Square } from "lucide-react";

export default function SessionDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;
  const [session, setSession] = useState<SessionSummary | null>(null);
  const [qr, setQr] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try { setSession(await api.sessions.get(id)); } catch {}
      finally { setLoading(false); }
    };
    load();
    const i = setInterval(load, 5000);
    return () => clearInterval(i);
  }, [id]);

  const fetchQR = async () => {
    try { const d = await api.sessions.getQR(id); setQr(d.qrCode); } catch {}
  };

  const handleStart = () => api.sessions.start(id).then(() => fetchQR()).catch(() => {});
  const handleStop = () => api.sessions.stop(id).catch(() => {});
  const handleDelete = async () => {
    if (!confirm("Delete?")) return;
    await api.sessions.delete(id).catch(() => {});
    router.push("/sessions");
  };

  const statusColor = (s: string) =>
    s === "ready" ? "text-green-400" : ["qr_ready","initializing","connecting"].includes(s) ? "text-amber-400" : "text-gray-500";

  if (loading) return <p className="text-sm text-gray-500">Loading...</p>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold">{session?.name || id}</h1>
          {session && <p className={`text-xs ${statusColor(session?.status)}`}>{session?.status}</p>}
        </div>
        <div className="flex gap-2">
          <button onClick={handleStart} className="p-1.5 bg-green-600/10 text-green-400 rounded hover:bg-green-600/20"><Play className="h-4 w-4" /></button>
          <button onClick={handleStop} className="p-1.5 bg-amber-600/10 text-amber-400 rounded hover:bg-amber-600/20"><Square className="h-4 w-4" /></button>
          <button onClick={fetchQR} className="p-1.5 bg-blue-600/10 text-blue-400 rounded hover:bg-blue-600/20"><RefreshCw className="h-4 w-4" /></button>
          <button onClick={handleDelete} className="p-1.5 bg-red-600/10 text-red-400 rounded hover:bg-red-600/20"><Trash2 className="h-4 w-4" /></button>
        </div>
      </div>

      {session?.phone && <p className="text-xs text-gray-400">Phone: {session.phone}</p>}

      {qr && (
        <div className="bg-[#121215] rounded-lg p-4 flex flex-col items-center">
          <img src={qr} alt="QR Code" className="w-48 h-48" />
          <p className="text-xs text-gray-500 mt-2">Scan to link</p>
        </div>
      )}

      {!qr && session?.status !== "ready" && (
        <div className="bg-[#121215] rounded-lg p-6 text-center">
          <p className="text-xs text-gray-500">Click the QR button to get a linking code</p>
        </div>
      )}
    </div>
  );
}
