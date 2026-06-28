"use client";

import React, { useEffect, useState } from "react";
import api, { ApiKeySummary } from "../../app/lib/api";
import { Plus, Trash2, CheckCircle, Copy } from "lucide-react";

export default function ApiKeysView() {
  const [keysList, setKeysList] = useState<ApiKeySummary[]>([]);
  const [name, setName] = useState("");
  const [role, setRole] = useState("operator");
  const [expiresInDays, setExpiresInDays] = useState("30");
  const [newlyCreatedKey, setNewlyCreatedKey] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const fetchApiKeys = async () => {
    try {
      const list = await api.apiKeys.list();
      setKeysList(list);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to load API keys");
    }
  };

  useEffect(() => {
    fetchApiKeys();
  }, []);

  const handleCreateKey = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    try {
      setError(null);
      setSuccess(null);
      setNewlyCreatedKey(null);
      
      const expiryDate = new Date();
      expiryDate.setDate(expiryDate.getDate() + parseInt(expiresInDays));

      const res = await api.apiKeys.create(name.trim(), role);
      setNewlyCreatedKey(res.apiKey);
      setName("");
      setSuccess("API Key generated successfully");
      fetchApiKeys();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to generate API Key");
    }
  };

  const handleRevokeKey = async (id: string) => {
    if (!confirm("Are you sure you want to revoke this API key? This cannot be undone.")) return;
    try {
      setError(null);
      setSuccess(null);
      await api.apiKeys.revoke(id);
      setSuccess("API key revoked");
      fetchApiKeys();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to revoke API key");
    }
  };

  const handleDeleteKey = async (id: string) => {
    if (!confirm("Are you sure you want to delete this key permanently?")) return;
    try {
      setError(null);
      setSuccess(null);
      await api.apiKeys.delete(id);
      setSuccess("API key deleted permanently");
      fetchApiKeys();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to delete API key");
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    alert("API Key copied to clipboard!");
  };

  return (
    <div className="space-y-8 animate-fade-in">
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
          API Credentials
        </h1>
        <p className="text-sm text-[var(--color-text-secondary)] mt-1">
          Issue and manage secure REST API keys for mobile client authentication.
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

      {/* Display newly created key card */}
      {newlyCreatedKey && (
        <div className="p-6 rounded-[var(--radius-lg)] bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 space-y-4 max-w-2xl">
          <div className="flex items-center gap-2 text-emerald-400 font-bold text-base">
            <CheckCircle className="w-5 h-5" />
            Make sure to copy your API key now. It won't be shown again!
          </div>
          <div className="flex items-center gap-3 bg-[var(--color-bg)] px-4 py-3 rounded-lg border border-[var(--color-border)] select-all font-mono text-sm text-white break-all">
            <span className="flex-1">{newlyCreatedKey}</span>
            <button
              onClick={() => copyToClipboard(newlyCreatedKey)}
              className="p-1 rounded bg-white/5 hover:bg-white/10 text-[var(--color-text-secondary)] hover:text-white transition-all cursor-pointer"
            >
              <Copy className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Creation panel */}
      <form onSubmit={handleCreateKey} className="glass-card p-6 rounded-[var(--radius-lg)] space-y-6 max-w-2xl">
        <h3 className="text-sm font-bold text-white uppercase tracking-wider">Generate API Key</h3>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-2 col-span-1 md:col-span-2">
            <label className="text-xs font-semibold text-[var(--color-text-secondary)]">Friendly Name</label>
            <input
              type="text"
              required
              placeholder="e.g. Sales Team Mobile APK"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full bg-[var(--color-bg)] border border-[var(--color-border)] rounded-[var(--radius-md)] px-4 py-2.5 text-sm text-white placeholder-[var(--color-text-muted)] focus:outline-none focus:border-indigo-500 transition-all"
            />
          </div>

          <div className="space-y-2">
            <label className="text-xs font-semibold text-[var(--color-text-secondary)]">Access Level</label>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value)}
              className="w-full bg-[var(--color-bg)] border border-[var(--color-border)] rounded-[var(--radius-md)] px-4 py-2.5 text-sm text-white focus:outline-none focus:border-indigo-500 transition-all"
            >
              <option value="viewer">Viewer</option>
              <option value="operator">Operator</option>
              <option value="admin">Administrator</option>
            </select>
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-xs font-semibold text-[var(--color-text-secondary)]">Lifespan</label>
          <div className="flex gap-4">
            {["7", "30", "90", "365"].map((d) => (
              <label key={d} className="flex items-center gap-2 text-sm text-[var(--color-text-secondary)] cursor-pointer">
                <input
                  type="radio"
                  name="expiresInDays"
                  value={d}
                  checked={expiresInDays === d}
                  onChange={(e) => setExpiresInDays(e.target.value)}
                  className="accent-indigo-600"
                />
                {d} Days
              </label>
            ))}
          </div>
        </div>

        <button
          type="submit"
          className="flex items-center gap-2 px-5 py-2.5 text-sm font-semibold rounded-[var(--radius-md)] bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg active:scale-95 transition-all cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          Generate API Key
        </button>
      </form>

      {/* Grid list */}
      <div className="glass-card p-6 rounded-[var(--radius-lg)]">
        <h2 className="text-lg font-bold text-white mb-4">Active Access Keys</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-[var(--color-border)] text-xs font-semibold text-[var(--color-text-secondary)] uppercase tracking-wider">
                <th className="py-3 px-4">Key Name</th>
                <th className="py-3 px-4">Prefix</th>
                <th className="py-3 px-4">Role</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Usage Count</th>
                <th className="py-3 px-4">Expires At</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--color-border)] text-sm">
              {keysList.map((key) => (
                <tr key={key.id} className="hover:bg-white/5 transition-colors">
                  <td className="py-4 px-4 font-semibold text-white">{key.name}</td>
                  <td className="py-4 px-4 font-mono text-[var(--color-text-secondary)]">{key.keyPrefix}...</td>
                  <td className="py-4 px-4">
                    <span className="px-2 py-0.5 rounded text-xs font-mono font-bold bg-indigo-500/10 border border-indigo-500/20 text-indigo-400">
                      {key.role.toUpperCase()}
                    </span>
                  </td>
                  <td className="py-4 px-4">
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${
                        key.isActive
                          ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/20"
                          : "bg-rose-500/15 text-rose-400 border border-rose-500/20"
                      }`}
                    >
                      {key.isActive ? "Active" : "Revoked"}
                    </span>
                  </td>
                  <td className="py-4 px-4 text-[var(--color-text-secondary)] font-mono">{key.usageCount}</td>
                  <td className="py-4 px-4 text-xs text-[var(--color-text-secondary)]">
                    {key.expiresAt ? new Date(key.expiresAt).toLocaleDateString() : "Never"}
                  </td>
                  <td className="py-4 px-4 text-right space-x-2">
                    {key.isActive && (
                      <button
                        onClick={() => handleRevokeKey(key.id)}
                        className="px-2.5 py-1 rounded text-xs bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/20 text-amber-400 hover:text-amber-300 transition-all cursor-pointer"
                      >
                        Revoke
                      </button>
                    )}
                    <button
                      onClick={() => handleDeleteKey(key.id)}
                      className="p-1 rounded bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 hover:text-rose-300 transition-all cursor-pointer"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
