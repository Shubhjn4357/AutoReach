"use client";

import React, { useEffect, useState } from "react";
import api, { SessionSummary } from "../../app/lib/api";
import { Play, Square, Trash2, Plus, QrCode, RefreshCw, X, Radio } from "lucide-react";

export default function SessionsView() {
  const [sessions, setSessions] = useState<SessionSummary[]>([]);
  const [newSessionName, setNewSessionName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [qrModalSession, setQrModalSession] = useState<string | null>(null);
  const [qrCodeData, setQrCodeData] = useState<string | null>(null);
  const [qrPollInterval, setQrPollInterval] = useState<NodeJS.Timeout | null>(null);

  const fetchSessions = async () => {
    try {
      setLoading(true);
      const list = await api.sessions.list();
      setSessions(list);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to load sessions");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSessions();
    return () => {
      if (qrPollInterval) clearInterval(qrPollInterval);
    };
  }, []);

  const handleCreateSession = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSessionName.trim()) return;

    try {
      setError(null);
      await api.sessions.create(newSessionName.trim());
      setNewSessionName("");
      fetchSessions();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to create session");
    }
  };

  const handleStartSession = async (id: string) => {
    try {
      setError(null);
      await api.sessions.start(id);
      fetchSessions();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to start session");
    }
  };

  const handleStopSession = async (id: string) => {
    try {
      setError(null);
      await api.sessions.stop(id);
      fetchSessions();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to stop session");
    }
  };

  const handleDeleteSession = async (id: string) => {
    if (!confirm(`Are you sure you want to delete session "${id}"?`)) return;
    try {
      setError(null);
      await api.sessions.delete(id);
      fetchSessions();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to delete session");
    }
  };

  const handleOpenQRModal = (id: string) => {
    setQrModalSession(id);
    setQrCodeData(null);
    
    // Connect first
    api.sessions.start(id).catch(() => {});

    // Poll QR and status
    const interval = setInterval(async () => {
      try {
        const qrRes = await api.sessions.getQR(id);
        setQrCodeData(qrRes.qrCode);
        
        if (qrRes.status === "ready") {
          clearInterval(interval);
          setQrModalSession(null);
          fetchSessions();
        }
      } catch (err) {
        console.error("Error polling QR:", err);
      }
    }, 3000);

    setQrPollInterval(interval);
  };

  const handleCloseQRModal = () => {
    if (qrPollInterval) {
      clearInterval(qrPollInterval);
      setQrPollInterval(null);
    }
    setQrModalSession(null);
    setQrCodeData(null);
  };

  return (
    <div className="space-y-8 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
            Node Manager
          </h1>
          <p className="text-sm text-[var(--color-text-secondary)] mt-1">
            Provision, connect, and link standalone stateful WhatsApp nodes.
          </p>
        </div>
        <button
          onClick={fetchSessions}
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

      {/* Creation form */}
      <form onSubmit={handleCreateSession} className="glass-card p-6 rounded-[var(--radius-lg)] flex gap-4 items-end max-w-xl">
        <div className="flex-1 space-y-2">
          <label className="text-xs font-semibold text-[var(--color-text-secondary)] uppercase tracking-wider">
            Register New Node Session
          </label>
          <input
            type="text"
            placeholder="e.g. support-session, sales-team"
            value={newSessionName}
            onChange={(e) => setNewSessionName(e.target.value)}
            className="w-full bg-[var(--color-bg)] border border-[var(--color-border)] rounded-[var(--radius-md)] px-4 py-2.5 text-sm text-white placeholder-[var(--color-text-muted)] focus:outline-none focus:border-indigo-500 transition-all"
          />
        </div>
        <button
          type="submit"
          className="flex items-center gap-2 px-5 py-2.5 text-sm font-semibold rounded-[var(--radius-md)] bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-600/20 active:scale-95 transition-all cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          Create Session
        </button>
      </form>

      {/* List */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {sessions.map((session) => (
          <div key={session.id} className="glass-card p-6 rounded-[var(--radius-lg)] flex flex-col justify-between h-[220px]">
            <div>
              <div className="flex items-start justify-between">
                <span className="font-mono font-bold text-white text-lg">{session.id}</span>
                <span
                  className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                    session.status === "ready"
                      ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/20"
                      : session.status === "connecting"
                      ? "bg-amber-500/15 text-amber-400 border border-amber-500/20"
                      : "bg-zinc-500/15 text-zinc-400 border border-[var(--color-border)]"
                  }`}
                >
                  <Radio className={`w-3 h-3 mr-1 ${session.status === "ready" ? "animate-pulse" : ""}`} />
                  {session.status.toUpperCase()}
                </span>
              </div>
              <div className="mt-4 space-y-1 text-sm text-[var(--color-text-secondary)]">
                <p>Phone: <span className="text-white font-medium">{session.phone || "Not Linked"}</span></p>
                <p>Device User: <span className="text-white font-medium">{session.pushName || "N/A"}</span></p>
              </div>
            </div>

            <div className="flex items-center justify-between border-t border-[var(--color-border)] pt-4 mt-4">
              <div className="flex gap-2">
                {session.status !== "ready" && session.status !== "connecting" ? (
                  <button
                    onClick={() => handleStartSession(session.id)}
                    className="p-2 rounded-[var(--radius-sm)] bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 hover:text-emerald-300 transition-all cursor-pointer"
                    title="Connect Session"
                  >
                    <Play className="w-4 h-4" />
                  </button>
                ) : (
                  <button
                    onClick={() => handleStopSession(session.id)}
                    className="p-2 rounded-[var(--radius-sm)] bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 hover:text-amber-300 transition-all cursor-pointer"
                    title="Disconnect Session"
                  >
                    <Square className="w-4 h-4" />
                  </button>
                )}

                {session.status !== "ready" && (
                  <button
                    onClick={() => handleOpenQRModal(session.id)}
                    className="p-2 rounded-[var(--radius-sm)] bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-400 hover:text-indigo-300 transition-all cursor-pointer"
                    title="Scan QR Code"
                  >
                    <QrCode className="w-4 h-4" />
                  </button>
                )}
              </div>

              <button
                onClick={() => handleDeleteSession(session.id)}
                className="p-2 rounded-[var(--radius-sm)] bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 hover:text-rose-300 transition-all cursor-pointer"
                title="Delete Session"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        ))}

        {sessions.length === 0 && !loading && (
          <div className="col-span-full text-center py-12 text-[var(--color-text-secondary)] glass-card rounded-[var(--radius-lg)]">
            No active nodes registered. Register your first node above.
          </div>
        )}
      </div>

      {/* QR Modal Overlay */}
      {qrModalSession && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-md">
          <div className="glass-surface p-8 rounded-[var(--radius-xl)] max-w-md w-full relative space-y-6 text-center animate-fade-in shadow-2xl">
            <button
              onClick={handleCloseQRModal}
              className="absolute top-4 right-4 p-1.5 rounded-lg hover:bg-white/10 text-[var(--color-text-secondary)] hover:text-white transition-all"
            >
              <X className="w-5 h-5" />
            </button>
            <div>
              <h3 className="text-xl font-bold text-white">Link device for "{qrModalSession}"</h3>
              <p className="text-sm text-[var(--color-text-secondary)] mt-1">
                Open WhatsApp on your mobile device and scan this QR code to authenticate.
              </p>
            </div>

            <div className="flex justify-center">
              <div className="p-4 bg-white rounded-2xl w-[260px] h-[260px] flex items-center justify-center border-4 border-indigo-500 shadow-lg">
                {qrCodeData ? (
                  <img src={qrCodeData} alt="WhatsApp QR Code" className="w-full h-full object-contain" />
                ) : (
                  <div className="flex flex-col items-center gap-3 text-zinc-500 text-sm">
                    <RefreshCw className="w-8 h-8 animate-spin text-indigo-500" />
                    Generating QR code...
                  </div>
                )}
              </div>
            </div>

            <div className="text-xs text-[var(--color-text-muted)]">
              This code will refresh automatically. Modal will close once connection status updates to Ready.
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
