"use client";

import React, { useState } from "react";
import api from "../../app/lib/api";
import { Send, Image, CheckCircle, RefreshCw, SendHorizonal } from "lucide-react";

export default function MessageTesterView() {
  const [phone, setPhone] = useState("");
  const [text, setText] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const handleTestSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!phone.trim()) return;

    try {
      setLoading(true);
      setError(null);
      setSuccess(null);

      // Clean phone format
      const cleanedPhone = phone.trim().replace(/\D/g, "");

      const res = await api.whatsapp.send(
        cleanedPhone,
        text.trim(),
        imageUrl.trim() || undefined,
        imageUrl.trim() ? "Test Image Attachment" : undefined
      );

      if (res.success) {
        setSuccess(`Message dispatched successfully! ID: ${res.messageId || "N/A"}`);
        setText("");
        setImageUrl("");
      } else {
        setError("Message dispatch failed");
      }
    } catch (err: any) {
      setError(err.message || "Failed to dispatch test message");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-8 animate-fade-in">
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
          Message Tester
        </h1>
        <p className="text-sm text-[var(--color-text-secondary)] mt-1">
          Send test text or media payloads directly to a WhatsApp contact phone.
        </p>
      </div>

      {error && (
        <div className="p-4 rounded-[var(--radius-md)] bg-rose-500/10 border border-rose-500/20 text-rose-300 text-sm max-w-xl">
          {error}
        </div>
      )}

      {success && (
        <div className="p-4 rounded-[var(--radius-md)] bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-sm max-w-xl">
          {success}
        </div>
      )}

      {/* Simulator form */}
      <form onSubmit={handleTestSend} className="glass-card p-6 rounded-[var(--radius-lg)] space-y-6 max-w-xl">
        <div className="space-y-2">
          <label className="text-xs font-semibold text-[var(--color-text-secondary)] uppercase tracking-wider">
            Recipient Phone Number (with Country Code)
          </label>
          <input
            type="tel"
            required
            placeholder="e.g. 14155552671"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            className="w-full bg-[var(--color-bg)] border border-[var(--color-border)] rounded-[var(--radius-md)] px-4 py-2.5 text-sm text-white placeholder-[var(--color-text-muted)] focus:outline-none focus:border-indigo-500 transition-all font-mono"
          />
        </div>

        <div className="space-y-2">
          <label className="text-xs font-semibold text-[var(--color-text-secondary)] uppercase tracking-wider">
            Image URL Attachment (Optional)
          </label>
          <input
            type="url"
            placeholder="https://example.com/image.png"
            value={imageUrl}
            onChange={(e) => setImageUrl(e.target.value)}
            className="w-full bg-[var(--color-bg)] border border-[var(--color-border)] rounded-[var(--radius-md)] px-4 py-2.5 text-sm text-white placeholder-[var(--color-text-muted)] focus:outline-none focus:border-indigo-500 transition-all"
          />
        </div>

        <div className="space-y-2">
          <label className="text-xs font-semibold text-[var(--color-text-secondary)] uppercase tracking-wider">
            Message Body Text
          </label>
          <textarea
            required
            rows={5}
            placeholder="Compose your test payload message..."
            value={text}
            onChange={(e) => setText(e.target.value)}
            className="w-full bg-[var(--color-bg)] border border-[var(--color-border)] rounded-[var(--radius-md)] px-4 py-2.5 text-sm text-white placeholder-[var(--color-text-muted)] focus:outline-none focus:border-indigo-500 transition-all resize-none"
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="flex items-center gap-2 px-5 py-2.5 text-sm font-semibold rounded-[var(--radius-md)] bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg active:scale-95 transition-all cursor-pointer disabled:opacity-50"
        >
          {loading ? (
            <>
              <RefreshCw className="w-4 h-4 animate-spin" />
              Dispatching...
            </>
          ) : (
            <>
              <SendHorizonal className="w-4 h-4" />
              Send Test Message
            </>
          )}
        </button>
      </form>
    </div>
  );
}
