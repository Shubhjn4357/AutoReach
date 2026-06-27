"use client";

import React, { useEffect, useState } from "react";
import api, { MessageTemplateSummary } from "../../app/lib/api";
import { Plus, Trash2, Layout, RefreshCw, FileText } from "lucide-react";

export default function TemplatesView() {
  const [templates, setTemplates] = useState<MessageTemplateSummary[]>([]);
  const [name, setName] = useState("");
  const [body, setBody] = useState("");
  const [header, setHeader] = useState("");
  const [footer, setFooter] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const fetchTemplates = async () => {
    try {
      setLoading(true);
      const list = await api.templates.list();
      setTemplates(list);
    } catch (err: any) {
      setError(err.message || "Failed to load templates");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTemplates();
  }, []);

  const handleCreateTemplate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !body.trim()) return;

    try {
      setError(null);
      setSuccess(null);
      await api.templates.create("default", {
        name: name.trim(),
        body: body.trim(),
        header: header.trim() || undefined,
        footer: footer.trim() || undefined,
      });
      setName("");
      setBody("");
      setHeader("");
      setFooter("");
      setSuccess("Message template registered successfully");
      fetchTemplates();
    } catch (err: any) {
      setError(err.message || "Failed to create template");
    }
  };

  const handleDeleteTemplate = async (id: string) => {
    if (!confirm("Are you sure you want to delete this template?")) return;
    try {
      setError(null);
      setSuccess(null);
      await api.templates.delete("default", id);
      setSuccess("Template removed successfully");
      fetchTemplates();
    } catch (err: any) {
      setError(err.message || "Failed to delete template");
    }
  };

  return (
    <div className="space-y-8 animate-fade-in">
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
          Message Templates
        </h1>
        <p className="text-sm text-[var(--color-text-secondary)] mt-1">
          Compose message templates using custom parameters for automated CRM campaigns.
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
      <form onSubmit={handleCreateTemplate} className="glass-card p-6 rounded-[var(--radius-lg)] space-y-6 max-w-2xl">
        <h3 className="text-sm font-bold text-white uppercase tracking-wider">Register Template</h3>

        <div className="space-y-2">
          <label className="text-xs font-semibold text-[var(--color-text-secondary)]">Template Name</label>
          <input
            type="text"
            required
            placeholder="e.g. lead-followup, event-invite"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full bg-[var(--color-bg)] border border-[var(--color-border)] rounded-[var(--radius-md)] px-4 py-2.5 text-sm text-white placeholder-[var(--color-text-muted)] focus:outline-none focus:border-indigo-500 transition-all"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="text-xs font-semibold text-[var(--color-text-secondary)]">Header Text (Optional)</label>
            <input
              type="text"
              placeholder="e.g. Quick Update"
              value={header}
              onChange={(e) => setHeader(e.target.value)}
              className="w-full bg-[var(--color-bg)] border border-[var(--color-border)] rounded-[var(--radius-md)] px-4 py-2.5 text-sm text-white placeholder-[var(--color-text-muted)] focus:outline-none focus:border-indigo-500 transition-all"
            />
          </div>

          <div className="space-y-2">
            <label className="text-xs font-semibold text-[var(--color-text-secondary)]">Footer Text (Optional)</label>
            <input
              type="text"
              placeholder="e.g. Reply STOP to opt out"
              value={footer}
              onChange={(e) => setFooter(e.target.value)}
              className="w-full bg-[var(--color-bg)] border border-[var(--color-border)] rounded-[var(--radius-md)] px-4 py-2.5 text-sm text-white placeholder-[var(--color-text-muted)] focus:outline-none focus:border-indigo-500 transition-all"
            />
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-xs font-semibold text-[var(--color-text-secondary)]">Message Body</label>
          <textarea
            required
            rows={4}
            placeholder="Hello [Name], we noticed you were interested in AutoReach..."
            value={body}
            onChange={(e) => setBody(e.target.value)}
            className="w-full bg-[var(--color-bg)] border border-[var(--color-border)] rounded-[var(--radius-md)] px-4 py-2.5 text-sm text-white placeholder-[var(--color-text-muted)] focus:outline-none focus:border-indigo-500 transition-all resize-none"
          />
          <p className="text-[10px] text-[var(--color-text-muted)]">
            Use tags like <code className="font-mono text-indigo-400 font-semibold">[Name]</code> to merge details dynamically from CRM leads.
          </p>
        </div>

        <button
          type="submit"
          className="flex items-center gap-2 px-5 py-2.5 text-sm font-semibold rounded-[var(--radius-md)] bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg active:scale-95 transition-all cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          Create Template
        </button>
      </form>

      {/* Grid list */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {templates.map((template) => (
          <div key={template.id} className="glass-card p-6 rounded-[var(--radius-lg)] flex flex-col justify-between h-[260px]">
            <div>
              <div className="flex justify-between items-start">
                <span className="font-bold text-white text-base">{template.name}</span>
                <span className="text-[10px] text-[var(--color-text-muted)] font-mono uppercase bg-white/5 px-2 py-0.5 border border-[var(--color-border)] rounded">
                  {template.id}
                </span>
              </div>
              <div className="mt-4 space-y-3">
                {template.header && (
                  <div className="text-xs font-bold text-zinc-400 tracking-wide border-b border-[var(--color-border)] pb-1">
                    {template.header}
                  </div>
                )}
                <p className="text-sm text-[var(--color-text-secondary)] line-clamp-3 leading-relaxed">
                  {template.body}
                </p>
                {template.footer && (
                  <div className="text-[10px] text-[var(--color-text-muted)] font-medium">
                    {template.footer}
                  </div>
                )}
              </div>
            </div>

            <div className="flex justify-end border-t border-[var(--color-border)] pt-4 mt-4">
              <button
                onClick={() => handleDeleteTemplate(template.id)}
                className="p-2 rounded-[var(--radius-sm)] bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 hover:text-rose-300 transition-all cursor-pointer"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        ))}

        {templates.length === 0 && !loading && (
          <div className="col-span-full text-center py-12 text-[var(--color-text-secondary)] glass-card rounded-[var(--radius-lg)]">
            No templates registered. Add your first message template above.
          </div>
        )}
      </div>
    </div>
  );
}
