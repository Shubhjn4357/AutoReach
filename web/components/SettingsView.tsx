import React, { useState, useEffect } from "react";
import { Sun, Moon, QrCode, LogOut, RefreshCw, Link2, AlertTriangle, CheckCircle2 } from "lucide-react";
import api from "../app/lib/api";

interface SettingsViewProps {
  tempProfileName: string;
  setTempProfileName: (name: string) => void;
  handleUpdateProfile: () => void;
  theme: "dark" | "light";
  toggleThemeMode: () => void;
}

export default function SettingsView({
  tempProfileName,
  setTempProfileName,
  handleUpdateProfile,
  theme,
  toggleThemeMode,
}: SettingsViewProps) {
  const [waStatus, setWaStatus] = useState<string>("DISCONNECTED");
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [phoneNumber, setPhoneNumber] = useState<string | null>(null);
  const [pushName, setPushName] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<boolean>(false);

  // Poll status every 3 seconds
  useEffect(() => {
    const fetchStatus = async () => {
      try {
        const json = (await api.whatsapp.status()) as { success?: boolean; data?: { status: string; phoneNumber: string | null; pushName: string | null } };
        if (json.success && json.data) {
          setWaStatus(json.data.status);
          setPhoneNumber(json.data.phoneNumber);
          setPushName(json.data.pushName);

          // If QR is ready, fetch the QR code
          if (json.data.status === "QR_READY") {
            const qrJson = (await api.whatsapp.qr()) as { success?: boolean; data?: { qrCode: string | null } };
            if (qrJson.success && qrJson.data) {
              setQrCode(qrJson.data.qrCode);
            }
          } else {
            setQrCode(null);
          }
        }
      } catch (err) {
        console.error("Failed to poll WhatsApp status:", err);
      }
    };

    fetchStatus(); // initial fetch
    const interval = setInterval(fetchStatus, 3000);
    return () => clearInterval(interval);
  }, []);

  const handleConnect = async () => {
    setActionLoading(true);
    try {
      const json = (await api.whatsapp.connect()) as { success?: boolean; error?: { message?: string } };
      if (!json.success) {
        alert(json.error?.message || "Failed to trigger connect loop");
      }
    } catch (err: unknown) {
      alert("Error: " + (err instanceof Error ? err.message : String(err)));
    } finally {
      setActionLoading(false);
    }
  };

  const handleDisconnect = async () => {
    setActionLoading(true);
    try {
      const json = (await api.whatsapp.disconnect()) as { success?: boolean; error?: { message?: string } };
      if (json.success) {
        setWaStatus("DISCONNECTED");
        setQrCode(null);
      } else {
        alert(json.error?.message || "Failed to disconnect");
      }
    } catch (err: unknown) {
      alert("Error: " + (err instanceof Error ? err.message : String(err)));
    } finally {
      setActionLoading(false);
    }
  };

  const handleLogout = async () => {
    if (!confirm("Are you sure you want to unlink and delete WhatsApp credentials?")) return;
    setActionLoading(true);
    try {
      const json = (await api.whatsapp.logout()) as { success?: boolean; error?: { message?: string } };
      if (json.success) {
        setWaStatus("DISCONNECTED");
        setQrCode(null);
        setPhoneNumber(null);
        setPushName(null);
      } else {
        alert(json.error?.message || "Failed to logout");
      }
    } catch (err: unknown) {
      alert("Error: " + (err instanceof Error ? err.message : String(err)));
    } finally {
      setActionLoading(false);
    }
  };

  // Render WhatsApp status pill styling
  const renderStatusBadge = () => {
    switch (waStatus) {
      case "READY":
        return (
          <span className="flex items-center gap-1 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 px-2.5 py-1 rounded text-[10px] font-bold uppercase tracking-wider">
            <CheckCircle2 size={10} /> Linked & Online
          </span>
        );
      case "INITIALIZING":
        return (
          <span className="flex items-center gap-1 bg-amber-500/10 border border-amber-500/30 text-amber-400 px-2.5 py-1 rounded text-[10px] font-bold uppercase tracking-wider animate-pulse">
            <RefreshCw size={10} className="animate-spin" /> Initializing
          </span>
        );
      case "QR_READY":
        return (
          <span className="flex items-center gap-1 bg-sky-500/10 border border-sky-500/30 text-sky-400 px-2.5 py-1 rounded text-[10px] font-bold uppercase tracking-wider">
            <QrCode size={10} /> Scan QR Code
          </span>
        );
      case "FAILED":
        return (
          <span className="flex items-center gap-1 bg-rose-500/10 border border-rose-500/30 text-rose-400 px-2.5 py-1 rounded text-[10px] font-bold uppercase tracking-wider">
            <AlertTriangle size={10} /> Setup Failed
          </span>
        );
      default:
        return (
          <span className="flex items-center gap-1 bg-zinc-500/10 border border-zinc-500/30 text-zinc-400 px-2.5 py-1 rounded text-[10px] font-bold uppercase tracking-wider">
            <Link2 size={10} /> Disconnected
          </span>
        );
    }
  };

  return (
    <div className="max-w-xl mx-auto flex flex-col gap-6">
      <div className="bg-[var(--color-surface)] border border-[var(--color-border)] p-5 rounded-md">
        <h2 className="text-base font-bold text-[var(--color-text-primary)]">
          System & Profile Settings
        </h2>
        <p className="text-xs text-[var(--color-text-secondary)] mt-1">
          Configure your user dashboard settings and database routing values.
        </p>
      </div>

      {/* WhatsApp Automation Gateway */}
      <div className="bg-[var(--color-surface)] border border-[var(--color-border)] p-5 rounded-md flex flex-col gap-4">
        <div className="flex justify-between items-center">
          <h3 className="text-xs font-bold text-[var(--color-text-primary)] uppercase tracking-wider">
            WhatsApp automation gateway
          </h3>
          {renderStatusBadge()}
        </div>

        <p className="text-[11px] text-[var(--color-text-secondary)] leading-relaxed">
          The persistent WhatsApp session runs in a background WebSocket container. To link a new WhatsApp device, click <strong>Link Device</strong> and scan the generated QR code.
        </p>

        {waStatus === "QR_READY" && qrCode && (
          <div className="flex flex-col items-center justify-center p-6 bg-white rounded-lg border border-[var(--color-border)] my-2 max-w-[280px] mx-auto">
            <img src={qrCode} alt="WhatsApp Web QR Code" className="w-[180px] h-[180px] object-contain" />
            <span className="text-[10px] text-zinc-500 font-medium tracking-wide mt-3 text-center">
              Scan this code inside WhatsApp Web Settings (Linked Devices) to pair.
            </span>
          </div>
        )}

        {waStatus === "READY" && phoneNumber && (
          <div className="bg-[var(--color-bg)] border border-[var(--color-border)] p-4 rounded-md text-xs flex flex-col gap-1">
            <div className="flex justify-between">
              <span className="text-[var(--color-text-secondary)] font-medium">Linked Phone:</span>
              <span className="text-[var(--color-text-primary)] font-bold">+{phoneNumber}</span>
            </div>
            {pushName && (
              <div className="flex justify-between mt-1">
                <span className="text-[var(--color-text-secondary)] font-medium">Profile Name:</span>
                <span className="text-[var(--color-text-primary)] font-bold">{pushName}</span>
              </div>
            )}
          </div>
        )}

        <div className="flex gap-3">
          {waStatus === "DISCONNECTED" || waStatus === "FAILED" ? (
            <button
              onClick={handleConnect}
              disabled={actionLoading}
              className="flex-1 bg-[var(--color-primary)] hover:bg-[var(--color-primary)]/95 disabled:bg-[var(--color-primary)]/40 text-white font-bold text-[11px] py-2.5 rounded-md cursor-pointer shadow-sm transition-all"
            >
              {actionLoading ? "Connecting..." : "Link Device"}
            </button>
          ) : (
            <>
              {waStatus === "QR_READY" && (
                <button
                  onClick={handleDisconnect}
                  disabled={actionLoading}
                  className="flex-1 bg-[var(--color-bg)] border border-[var(--color-border)] text-[var(--color-text-primary)] hover:bg-white/5 font-bold text-[11px] py-2.5 rounded-md cursor-pointer transition-all"
                >
                  Cancel Linking
                </button>
              )}
              <button
                onClick={handleLogout}
                disabled={actionLoading}
                className="flex-1 bg-red-600 hover:bg-red-500 disabled:bg-red-800 text-white font-bold text-[11px] py-2.5 rounded-md cursor-pointer transition-all flex items-center justify-center gap-1.5"
              >
                <LogOut size={12} /> Unlink Device
              </button>
            </>
          )}
        </div>
      </div>

      {/* Profile Card */}
      <div className="bg-[var(--color-surface)] border border-[var(--color-border)] p-5 rounded-md flex flex-col gap-4">
        <h3 className="text-xs font-bold text-[var(--color-text-primary)] uppercase tracking-wider">
          User Account Profile
        </h3>

        <div className="flex flex-col gap-2">
          <label className="text-[10px] text-[var(--color-text-secondary)] font-bold uppercase tracking-wider">
            Account Display Name
          </label>
          <input
            type="text"
            value={tempProfileName}
            onChange={(e) => setTempProfileName(e.target.value)}
            className="bg-[var(--color-bg)] border border-[var(--color-border)] text-[var(--color-text-primary)] px-4 py-2.5 rounded-md text-xs outline-none focus:border-[var(--color-primary)] transition-all"
          />
        </div>

        <button
          onClick={handleUpdateProfile}
          className="bg-[var(--color-primary)] hover:bg-[var(--color-primary)]/95 text-white font-bold text-[11px] py-2.5 rounded-md cursor-pointer shadow-sm transition-all"
        >
          Save Profile Settings
        </button>
      </div>

      {/* Theme Settings Card */}
      <div className="bg-[var(--color-surface)] border border-[var(--color-border)] p-5 rounded-md flex flex-col gap-4">
        <h3 className="text-xs font-bold text-[var(--color-text-primary)] uppercase tracking-wider">
          Console Visual Mode
        </h3>
        <div className="flex justify-between items-center text-xs">
          <div>
            <div className="font-semibold text-[var(--color-text-primary)]">
              Dark and Light Theme
            </div>
            <div className="text-[11px] text-[var(--color-text-secondary)] mt-0.5">
              Toggle default system rendering theme.
            </div>
          </div>

          <button
            onClick={toggleThemeMode}
            className="bg-[var(--color-bg)] border border-[var(--color-border)] px-4 py-2 rounded-md text-xs font-semibold hover:bg-[var(--color-border)] transition-all cursor-pointer text-[var(--color-text-primary)] flex items-center gap-1.5"
          >
            {theme === "dark" ? <Sun size={12} /> : <Moon size={12} />}
            <span className="capitalize">{theme} Theme</span>
          </button>
        </div>
      </div>

      {/* About Monorepo */}
      <div className="bg-[var(--color-surface)] border border-[var(--color-border)] p-5 rounded-md text-xs">
        <h3 className="text-xs font-bold text-[var(--color-text-primary)] uppercase tracking-wider mb-3">
          About AutoReach Workspace
        </h3>
        <div className="flex flex-col gap-2.5 text-[11px] text-[var(--color-text-secondary)]">
          <div className="flex justify-between border-b border-[var(--color-border)] pb-2">
            <span>Monorepo Architecture</span>
            <span className="text-[var(--color-text-primary)] font-semibold">
              Next.js + Expo (Single-repo)
            </span>
          </div>
          <div className="flex justify-between border-b border-[var(--color-border)] pb-2">
            <span>Local Database Client</span>
            <span className="text-[var(--color-text-primary)] font-semibold">
              SQLite via Drizzle ORM
            </span>
          </div>
          <div className="flex justify-between pb-1">
            <span>Task Scheduler Queue</span>
            <span className="text-[var(--color-text-primary)] font-semibold">
              Stateful Baileys Socket Engine
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
