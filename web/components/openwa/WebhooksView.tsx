"use client";

import React, { useEffect, useState } from "react";
import api, { WebhookSummary } from "../../app/lib/api";
import { Plus, Trash2, Send, CheckCircle, RefreshCw, Activity, ShieldAlert } from "lucide-react";

export default function WebhooksView() {
  const [webhooks, setWebhooks] = useState<WebhookSummary[]>([]);
  const [url, setUrl] = useState("");
  const [secret, setSecret] = useState("");
  const [selectedEvents, setSelectedEvents] = useState<string[]>(["message.received"]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const availableEvents = ["message.sent", "message.received", "session.status", "session.qr"];

  const fetchWebhooks = async () => {
    try {
      setLoading(true);
      const list = await api.webhooks.list();
      setWebhooks(list);
    } catch (err: any) {
      setError(err.message || "Failed to fetch webhooks");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWebhooks();
  }, []);

  const handleToggleEvent = (event: string) => {
    setSelectedEvents((prev) =>
      prev.includes(event) ? prev.filter((e) => e !== event) : [...prev, event]
    );
  };

  const handleCreateWebhook = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!url.trim()) return;

    try {
      setError(null);
      setSuccess(null);
      await api.webhooks.create("default", {
        url: url.trim(),
        events: selectedEvents,
        secret: secret.trim() || undefined,
      });
      setUrl("");
      setSecret("");
      setSelectedEvents(["message.received"]);
      setSuccess("Webhook endpoint configured successfully");
      fetchWebhooks();
    } catch (err: any) {
      setError(err.message || "Failed to create webhook");
    }
  };

  const handleDeleteWebhook = async (id: string) => {
    if (!confirm("Are you sure you want to delete this webhook endpoint?")) return;
    try {
      setError(null);
      setSuccess(null);
      await api.webhooks.delete("default", id);
      setSuccess("Webhook endpoint deleted");
      fetchWebhooks();
    } catch (err: any) {
      setError(err.message || "Failed to delete webhook");
    }
  };

  const handleTestWebhook = async (id: string) => {
    try {
      setError(null);
      setSuccess(null);
      const testRes = await api.webhooks.test("default", id);
      if (testRes.success) {
        setSuccess(`Test payload delivered successfully (Status Code: ${testRes.statusCode})`);
      } else {
        setError(`Test delivery failed (Status Code: ${testRes.statusCode})`);
      }
    } catch (err: any) {
      setError(err.message || "Test dispatch failed");
    }
  };

  return (
    <div className="space-y-8 animate-fade-in">
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
          Webhook Integrator
        </h1>
        <p className="text-sm text-[var(--color-text-secondary)] mt-1">
          Deliver realtime WhatsApp event streams directly to custom API listeners.
        </p>
      </div>

      {error && (
        <div className="p-4 rounded-[var(--radius-md)] bg-rose-500/10 border border-rose-500/20 text-rose-300 text-sm">
          {error}
        </div>
      )}

      {success && (
        <div className="p-4 rounded-[var(--radius-md)] bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-sm">
          {success}
        </div>
      )}

      {/* Creation form */}
      <form onSubmit={handleCreateWebhook} className="glass-card p-6 rounded-[var(--radius-lg)] space-y-6 max-w-2xl">
        <h3 className="text-sm font-bold text-white uppercase tracking-wider">Configure webhook callback</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="text-xs font-semibold text-[var(--color-text-secondary)]">Callback URL</label>
            <input
              type="url"
              required
              placeholder="https://api.yourdomain.com/webhooks/whatsapp"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              className="w-full bg-[var(--color-bg)] border border-[var(--color-border)] rounded-[var(--radius-md)] px-4 py-2.5 text-sm text-white placeholder-[var(--color-text-muted)] focus:outline-none focus:border-indigo-500 transition-all"
            />
          </div>

          <div className="space-y-2">
            <label className="text-xs font-semibold text-[var(--color-text-secondary)]">Secret Token (Optional)</label>
            <input
              type="text"
              placeholder="e.g. signature verification token"
              value={secret}
              onChange={(e) => setSecret(e.target.value)}
              className="w-full bg-[var(--color-bg)] border border-[var(--color-border)] rounded-[var(--radius-md)] px-4 py-2.5 text-sm text-white placeholder-[var(--color-text-muted)] focus:outline-none focus:border-indigo-500 transition-all"
            />
          </div>
        </div>

        {/* Triggers */}
        <div className="space-y-2">
          <label className="text-xs font-semibold text-[var(--color-text-secondary)]">Event Subscriptions</label>
          <div className="flex flex-wrap gap-3">
            {availableEvents.map((event) => {
              const isSelected = selectedEvents.includes(event);
              return (
                <button
                  type="button"
                  key={event}
                  onClick={() => handleToggleEvent(event)}
                  className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-all cursor-pointer ${
                    isSelected
                      ? "bg-indigo-600 border-indigo-500 text-white shadow-md shadow-indigo-600/10"
                      : "bg-[var(--color-surface)] border-[var(--color-border)] text-[var(--color-text-secondary)] hover:text-white"
                  }`}
                >
                  {event}
                </button>
              );
            })}
          </div>
        </div>

        <button
          type="submit"
          className="flex items-center gap-2 px-5 py-2.5 text-sm font-semibold rounded-[var(--radius-md)] bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg active:scale-95 transition-all cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          Add Webhook Listener
        </button>
      </form>

      {/* Grid List */}
      <div className="grid grid-cols-1 gap-6">
        {webhooks.map((webhook) => (
          <div key={webhook.id} className="glass-card p-6 rounded-[var(--radius-lg)] flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div className="space-y-2 min-w-0 flex-1">
              <div className="flex items-center gap-3">
                <span className="font-mono text-xs font-bold bg-white/5 border border-[var(--color-border)] px-2 py-0.5 rounded text-indigo-400">
                  {webhook.id}
                </span>
                <span
                  className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                    webhook.active
                      ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                      : "bg-rose-500/10 text-rose-400 border border-rose-500/20"
                  }`}
                >
                  {webhook.active ? "ACTIVE" : "INACTIVE"}
                </span>
              </div>
              <p className="font-mono text-sm text-white truncate font-bold">{webhook.url}</p>
              <div className="flex flex-wrap gap-1.5 mt-2">
                {webhook.events.map((e) => (
                  <span key={e} className="text-[10px] bg-white/5 border border-[var(--color-border)] text-[var(--color-text-secondary)] px-2 py-0.5 rounded">
                    {e}
                  </span>
                ))}
              </div>
            </div>

            <div className="flex gap-2 shrink-0">
              <button
                onClick={() => handleTestWebhook(webhook.id)}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-[var(--radius-sm)] bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-400 hover:text-indigo-300 transition-all cursor-pointer"
              >
                <Send className="w-3.5 h-3.5" />
                Test Payload
              </button>
              <button
                onClick={() => handleDeleteWebhook(webhook.id)}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-[var(--radius-sm)] bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 hover:text-rose-300 transition-all cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Delete
              </button>
            </div>
          </div>
        ))}

        {webhooks.length === 0 && !loading && (
          <div className="text-center py-12 text-[var(--color-text-secondary)] glass-card rounded-[var(--radius-lg)]">
            No webhook subscriptions configured. Create one above to forward events.
          </div>
        )}
      </div>
    </div>
  );
}
