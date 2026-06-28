"use client";

import React, { useEffect, useState, useRef } from "react";
import api, { MessageTemplateSummary } from "../../app/lib/api";
import { Plus, Trash2, RefreshCw, Calendar, UploadCloud, Clock, X, Check } from "lucide-react";

const STAGES = ["ALL", "NEW", "CONTACTED", "QUALIFIED", "PROPOSAL", "NEGOTIATION", "WON", "LOST"];

export default function TemplatesView() {
  const [templates, setTemplates] = useState<MessageTemplateSummary[]>([]);
  const [name, setName] = useState("");
  const [body, setBody] = useState("");
  const [header, setHeader] = useState("");
  const [footer, setFooter] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Campaign Scheduling States
  const [scheduleModalOpen, setScheduleModalOpen] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<MessageTemplateSummary | null>(null);
  const [campaignName, setCampaignName] = useState("");
  const [targetStage, setTargetStage] = useState("ALL");
  const [scheduledDateTime, setScheduledDateTime] = useState("");
  const [mediaUrl, setMediaUrl] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [draggingError, setDraggingError] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchTemplates = async () => {
    try {
      setLoading(true);
      const list = await api.templates.list();
      setTemplates(list);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to load templates");
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
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to create template");
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
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to delete template");
    }
  };

  const handleOpenScheduleModal = (template: MessageTemplateSummary) => {
    setSelectedTemplate(template);
    setCampaignName(`${template.name} Scheduled Campaign`);
    setTargetStage("ALL");
    setScheduledDateTime("");
    setMediaUrl(null);
    setDraggingError(null);
    setSuccess(null);
    setError(null);
    setScheduleModalOpen(true);
  };

  const handleFile = (file: File) => {
    if (!file.type.startsWith("image/")) {
      setDraggingError("Please drop or select an image file.");
      return;
    }
    setDraggingError(null);
    const reader = new FileReader();
    reader.onload = (e) => {
      if (e.target?.result) {
        setMediaUrl(e.target.result as string);
      }
    };
    reader.onerror = () => {
      setDraggingError("Failed to read image file.");
    };
    reader.readAsDataURL(file);
  };

  const handleScheduleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTemplate || !campaignName.trim() || !scheduledDateTime) {
      setError("Please enter campaign name and scheduled date/time.");
      return;
    }

    try {
      setLoading(true);
      setError(null);
      setSuccess(null);

      // Fetch CRM leads to gather recipient contact IDs
      const leads = await api.crm.listLeads();
      const targetLeads = targetStage === "ALL" 
        ? leads 
        : leads.filter((l) => l.status === targetStage);

      if (targetLeads.length === 0) {
        setError(`No CRM leads found matching target stage: ${targetStage}`);
        setLoading(false);
        return;
      }

      const scheduledTimeMs = new Date(scheduledDateTime).getTime();
      const res = await api.campaigns.create({
        name: campaignName.trim(),
        messageTemplateId: selectedTemplate.id,
        status: "scheduled",
        mediaUrl: mediaUrl || null,
        scheduledAt: scheduledTimeMs,
        recipientIds: targetLeads.map((l) => l.id),
      });

      if (res.success || res.campaignId) {
        setSuccess(`Campaign "${campaignName}" successfully scheduled for ${new Date(scheduledDateTime).toLocaleString()} (${targetLeads.length} recipients)!`);
        setScheduleModalOpen(false);
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to schedule campaign.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-8 animate-fade-in">
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
          Message Templates
        </h1>
        <p className="text-sm text-[var(--color-text-secondary)] mt-1">
          Compose message templates and schedule automated campaigns to CRM leads.
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
          <div key={template.id} className="glass-card p-6 rounded-[var(--radius-lg)] flex flex-col justify-between h-[270px]">
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

            <div className="flex justify-between border-t border-[var(--color-border)] pt-4 mt-4">
              <button
                onClick={() => handleOpenScheduleModal(template)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-[var(--radius-sm)] bg-indigo-600/15 hover:bg-indigo-600/25 border border-indigo-500/25 text-indigo-400 hover:text-indigo-300 transition-all cursor-pointer text-xs font-bold"
              >
                <Calendar className="w-3.5 h-3.5" />
                Schedule Campaign
              </button>
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

      {/* Schedule Modal */}
      {scheduleModalOpen && selectedTemplate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 animate-fade-in">
          <div className="glass-card w-full max-w-lg p-6 rounded-[var(--radius-lg)] space-y-6 relative border border-[var(--color-border)] shadow-2xl">
            <button
              onClick={() => setScheduleModalOpen(false)}
              className="absolute top-4 right-4 p-1 rounded hover:bg-white/10 text-[var(--color-text-secondary)] hover:text-white transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-2">
              <Clock className="w-5 h-5 text-indigo-400" />
              <h3 className="text-lg font-bold text-white">Schedule Campaign: {selectedTemplate.name}</h3>
            </div>

            <form onSubmit={handleScheduleSubmit} className="space-y-4">
              <div className="space-y-2">
                <label className="text-xs font-semibold text-[var(--color-text-secondary)] uppercase tracking-wider">Campaign Name</label>
                <input
                  type="text"
                  required
                  placeholder="Campaign Friendly Name"
                  value={campaignName}
                  onChange={(e) => setCampaignName(e.target.value)}
                  className="w-full bg-[var(--color-bg)] border border-[var(--color-border)] rounded-[var(--radius-md)] px-4 py-2 text-sm text-white focus:outline-none focus:border-indigo-500 transition-all"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-[var(--color-text-secondary)] uppercase tracking-wider">Target CRM Stage</label>
                  <select
                    value={targetStage}
                    onChange={(e) => setTargetStage(e.target.value)}
                    className="w-full bg-[var(--color-bg)] border border-[var(--color-border)] rounded-[var(--radius-md)] px-4 py-2 text-sm text-white focus:outline-none focus:border-indigo-500 transition-all"
                  >
                    {STAGES.map((s) => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-semibold text-[var(--color-text-secondary)] uppercase tracking-wider">Scheduled Date & Time</label>
                  <input
                    type="datetime-local"
                    required
                    value={scheduledDateTime}
                    onChange={(e) => setScheduledDateTime(e.target.value)}
                    className="w-full bg-[var(--color-bg)] border border-[var(--color-border)] rounded-[var(--radius-md)] px-4 py-2 text-sm text-white focus:outline-none focus:border-indigo-500 transition-all font-mono"
                  />
                </div>
              </div>

              {/* Drag-and-Drop Image Dropzone */}
              <div className="space-y-2">
                <label className="text-xs font-semibold text-[var(--color-text-secondary)] uppercase tracking-wider">
                  Campaign Image Poster Attachment (Optional)
                </label>
                
                {mediaUrl ? (
                  <div className="relative border border-[var(--color-border)] rounded-lg p-2 bg-[var(--color-bg)] flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <img src={mediaUrl} className="w-12 h-12 rounded object-cover border border-[var(--color-border)]" alt="Preview" />
                      <span className="text-xs text-white truncate max-w-[200px]">Attached Poster Image</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setMediaUrl(null)}
                      className="p-1 rounded hover:bg-white/10 text-[var(--color-text-secondary)] hover:text-rose-400 transition-colors cursor-pointer"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <div
                    onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                    onDragLeave={() => setIsDragging(false)}
                    onDrop={(e) => {
                      e.preventDefault();
                      setIsDragging(false);
                      const file = e.dataTransfer.files[0];
                      if (file) handleFile(file);
                    }}
                    onClick={() => fileInputRef.current?.click()}
                    className={`border-2 border-dashed rounded-lg p-6 flex flex-col items-center justify-center cursor-pointer transition-all ${
                      isDragging
                        ? "border-indigo-500 bg-indigo-500/10 text-white"
                        : "border-[var(--color-border)] bg-[var(--color-bg)] text-[var(--color-text-muted)] hover:border-indigo-500/50 hover:bg-white/5"
                    }`}
                  >
                    <UploadCloud className={`w-8 h-8 mb-2 ${isDragging ? "text-indigo-400 animate-bounce" : "text-[var(--color-text-muted)]"}`} />
                    <span className="text-xs font-bold text-center">Drag & drop poster image here, or click to browse</span>
                    <span className="text-[10px] mt-1 text-[var(--color-text-muted)]">Supports PNG, JPG, JPEG (Max 1MB)</span>
                    
                    <input
                      type="file"
                      ref={fileInputRef}
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) handleFile(file);
                      }}
                      accept="image/*"
                      className="hidden"
                    />
                  </div>
                )}
                {draggingError && <p className="text-xs text-rose-400 font-semibold">{draggingError}</p>}
              </div>

              <div className="flex gap-3 pt-4 justify-end">
                <button
                  type="button"
                  onClick={() => setScheduleModalOpen(false)}
                  className="px-4 py-2 text-sm font-semibold rounded bg-white/5 hover:bg-white/10 text-[var(--color-text-secondary)] hover:text-white transition-all cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex items-center gap-2 px-5 py-2 text-sm font-semibold rounded bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg active:scale-95 transition-all cursor-pointer disabled:opacity-50"
                >
                  {loading ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      Scheduling...
                    </>
                  ) : (
                    <>
                      <Check className="w-4 h-4" />
                      Confirm Schedule
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
