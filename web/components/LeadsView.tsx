import React from "react";
import { 
  Users, 
  Search, 
  Plus, 
  Edit3, 
  Trash2, 
  Loader, 
  Send, 
  MessageSquare, 
  ChevronRight, 
  FileText, 
  UploadCloud, 
  Sparkles, 
  DollarSign, 
  Phone, 
  Mail, 
  FolderOpen, 
  Activity, 
  AlertCircle 
} from "lucide-react";
import { Lead, LeadStatus } from "../../shared/types";

interface LeadsViewProps {
  leads: Lead[];
  metrics: { totalValue: number; winRate: number };
  pendingTasksCount: number;
  completedTasksCount: number;
  driveFiles: any[];
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  statusFilter: LeadStatus | "ALL";
  setStatusFilter: (filter: LeadStatus | "ALL") => void;
  selectedLeadId: string | null;
  setSelectedLeadId: (id: string | null) => void;
  setAddModalOpen: (open: boolean) => void;
  openEditModal: (lead: Lead) => void;
  handleDeleteLead: (id: string) => void;
  
  // AI CRM Auditor
  aiLoading: boolean;
  aiResult: any;
  setAiResult: (result: any) => void;
  runAiAudit: (lead: Lead) => void;
  dispatchLoading: boolean;
  handleMessageDispatch: (channel: "whatsapp" | "sms", text: string) => void;

  // Drive integration
  generateLoading: boolean;
  handleGenerateContract: (lead: Lead) => void;
  setActiveTab: (tab: "leads" | "tasks" | "api-status" | "settings") => void;
  user: any;
}

export default function LeadsView({
  leads,
  metrics,
  pendingTasksCount,
  completedTasksCount,
  driveFiles,
  searchQuery,
  setSearchQuery,
  statusFilter,
  setStatusFilter,
  selectedLeadId,
  setSelectedLeadId,
  setAddModalOpen,
  openEditModal,
  handleDeleteLead,
  aiLoading,
  aiResult,
  setAiResult,
  runAiAudit,
  dispatchLoading,
  handleMessageDispatch,
  generateLoading,
  handleGenerateContract,
  setActiveTab,
  user
}: LeadsViewProps) {

  // Filter Lists
  const filteredLeads = leads.filter(lead => {
    const matchesSearch = lead.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          (lead.email && lead.email.toLowerCase().includes(searchQuery.toLowerCase())) ||
                          (lead.phone && lead.phone.includes(searchQuery));
    const matchesStatus = statusFilter === "ALL" ? true : lead.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const selectedLead = leads.find(l => l.id === selectedLeadId) || null;

  return (
    <div className="h-full flex flex-col lg:flex-row gap-6">
      
      {/* Sidebar list panel */}
      <div className="w-full lg:w-80 shrink-0 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-md flex flex-col overflow-hidden max-h-[calc(100vh-180px)] lg:max-h-none">
        
        {/* Search & Filter Inputs */}
        <div className="p-4 border-b border-[var(--color-border)] flex flex-col gap-3 bg-black/5">
          <div className="relative">
            <input 
              type="text"
              placeholder="Search contacts..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-[var(--color-bg)] border border-[var(--color-border)] rounded-md pl-9 pr-3 py-2 text-xs text-[var(--color-text-primary)] outline-none focus:border-[var(--color-primary)] transition-all"
            />
            <Search className="absolute left-3 top-2.5 text-[var(--color-text-muted)]" size={13} />
          </div>

          <div className="flex gap-2 overflow-x-auto pb-1">
            {(["ALL", "NEW", "CONTACTED", "QUALIFIED", "WON", "LOST"] as const).map(stage => (
              <button
                key={stage}
                onClick={() => setStatusFilter(stage)}
                className={`px-3 py-1.5 rounded-md text-[10px] font-bold border transition-all cursor-pointer whitespace-nowrap ${
                  statusFilter === stage 
                    ? "bg-[var(--color-primary)]/15 border-[var(--color-primary)] text-[var(--color-primary)]" 
                    : "bg-[var(--color-bg)] border-[var(--color-border)] text-[var(--color-text-secondary)] hover:border-[var(--color-primary)]/50"
                }`}
              >
                {stage}
              </button>
            ))}
          </div>
        </div>

        {/* Scrollable list */}
        <div className="flex-1 overflow-y-auto p-3 flex flex-col gap-2">
          <div className="flex justify-between items-center px-1 mb-1">
            <span className="text-[10px] text-[var(--color-text-secondary)] font-bold uppercase tracking-wider">Leads Found ({filteredLeads.length})</span>
            <button
              onClick={() => setAddModalOpen(true)}
              className="text-[var(--color-primary)] hover:text-[var(--color-primary)]/80 p-1 flex items-center gap-1 font-bold text-[10px]"
            >
              <Plus size={10} /> Add
            </button>
          </div>

          {filteredLeads.length === 0 ? (
            <div className="py-12 text-center flex flex-col items-center justify-center text-[var(--color-text-muted)]">
              <Users size={28} className="mb-2 opacity-40" />
              <span className="text-xs italic">No contacts found</span>
            </div>
          ) : (
            filteredLeads.map(lead => (
              <div
                key={lead.id}
                onClick={() => { setSelectedLeadId(lead.id); setAiResult(null); }}
                className={`p-3.5 rounded-md cursor-pointer transition-all border ${
                  selectedLeadId === lead.id 
                    ? "border-[var(--color-primary)] bg-[var(--color-primary)]/5 shadow-sm" 
                    : "border-transparent bg-[var(--color-bg)]/50 hover:bg-[var(--color-bg)] hover:border-[var(--color-border)]"
                }`}
              >
                <div className="flex justify-between items-start mb-1.5">
                  <span className="text-xs font-bold text-[var(--color-text-primary)] truncate pr-2">{lead.name}</span>
                  <span className="text-[var(--color-primary)] font-bold text-xs shrink-0">${lead.value.toLocaleString()}</span>
                </div>
                
                <div className="flex justify-between items-center text-[10px]">
                  <span className={`px-1.5 py-0.5 rounded-sm font-bold text-[8px] ${
                    lead.status === "WON" ? "bg-[var(--color-success)]/10 text-[var(--color-success)]" :
                    lead.status === "LOST" ? "bg-[var(--color-danger)]/10 text-[var(--color-danger)]" :
                    lead.status === "QUALIFIED" ? "bg-[var(--color-primary)]/10 text-[var(--color-primary)]" :
                    "bg-[var(--color-border)] text-[var(--color-text-secondary)]"
                  }`}>{lead.status}</span>
                  <span className="text-[var(--color-text-muted)] truncate">{lead.phone || "No Phone"}</span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Main Content Details Panel */}
      <div className="flex-1 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-md flex flex-col overflow-y-auto p-6 max-h-[calc(100vh-180px)] lg:max-h-none">
        
        {selectedLead ? (
          <div className="flex flex-col gap-6">
            {/* Lead Detail Header */}
            <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 pb-5 border-b border-[var(--color-border)]">
              <div className="flex items-center gap-3.5">
                <div className="w-12 h-12 rounded-md bg-gradient-to-br from-[var(--color-primary)]/10 to-[var(--color-secondary)]/10 border border-[var(--color-primary)]/20 flex items-center justify-center font-black text-lg text-[var(--color-primary)] shadow-sm">
                  {selectedLead.name.substring(0, 2).toUpperCase()}
                </div>
                <div>
                  <h2 className="text-lg font-bold text-[var(--color-text-primary)] leading-tight">{selectedLead.name}</h2>
                  <div className="flex items-center gap-2 mt-1.5">
                    <span className="text-[10px] text-[var(--color-text-secondary)]">Lead status:</span>
                    <span className="bg-[var(--color-primary)]/10 text-[var(--color-primary)] px-2 py-0.5 rounded-sm text-[9px] font-bold">{selectedLead.status}</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2.5">
                <button
                  onClick={() => openEditModal(selectedLead)}
                  className="bg-[var(--color-primary)]/10 border border-[var(--color-primary)]/20 text-[var(--color-primary)] hover:bg-[var(--color-primary)]/20 px-3.5 py-1.5 rounded-md text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5"
                >
                  <Edit3 size={12} />
                  Edit
                </button>
                <button
                  onClick={() => handleDeleteLead(selectedLead.id)}
                  className="bg-[var(--color-danger)]/10 border border-[var(--color-danger)]/20 text-[var(--color-danger)] hover:bg-[var(--color-danger)]/20 px-3.5 py-1.5 rounded-md text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5"
                >
                  <Trash2 size={12} />
                  Delete
                </button>
              </div>
            </div>

            {/* Lead Info Details Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="bg-[var(--color-bg)] border border-[var(--color-border)] p-4 rounded-md flex items-center gap-3">
                <div className="p-2 rounded-md bg-[var(--color-primary)]/10 text-[var(--color-primary)]">
                  <DollarSign size={16} />
                </div>
                <div className="min-w-0">
                  <span className="text-[9px] text-[var(--color-text-muted)] uppercase tracking-wider font-bold block">Deal Valuation</span>
                  <span className="text-sm font-bold text-[var(--color-primary)]">${selectedLead.value.toLocaleString()}</span>
                </div>
              </div>

              <div className="bg-[var(--color-bg)] border border-[var(--color-border)] p-4 rounded-md flex items-center gap-3">
                <div className="p-2 rounded-md bg-[var(--color-accent)]/10 text-[var(--color-accent)]">
                  <Phone size={16} />
                </div>
                <div className="min-w-0">
                  <span className="text-[9px] text-[var(--color-text-muted)] uppercase tracking-wider font-bold block">Phone Number</span>
                  <span className="text-xs font-semibold text-[var(--color-text-primary)] truncate block">{selectedLead.phone || "Not provided"}</span>
                </div>
              </div>

              <div className="bg-[var(--color-bg)] border border-[var(--color-border)] p-4 rounded-md flex items-center gap-3">
                <div className="p-2 rounded-md bg-[var(--color-secondary)]/10 text-[var(--color-secondary)]">
                  <Mail size={16} />
                </div>
                <div className="min-w-0">
                  <span className="text-[9px] text-[var(--color-text-muted)] uppercase tracking-wider font-bold block">Email Address</span>
                  <span className="text-xs text-[var(--color-text-primary)] truncate block">{selectedLead.email || "Not provided"}</span>
                </div>
              </div>
            </div>

            {/* Lead Notes */}
            <div className="bg-[var(--color-bg)] border border-[var(--color-border)] p-4 rounded-md">
              <span className="text-[9px] text-[var(--color-text-muted)] uppercase tracking-wider font-bold block mb-1.5">Internal Notes</span>
              <p className="text-xs text-[var(--color-text-secondary)] italic leading-relaxed">{selectedLead.notes || "No notes provided."}</p>
            </div>

            {/* Google Drive Files Integration */}
            <div className="bg-[var(--color-bg)] border border-[var(--color-border)] p-4 rounded-md">
              <div className="flex justify-between items-center mb-3">
                <div className="flex items-center gap-1.5">
                  <FolderOpen size={14} className="text-[var(--color-accent)]" />
                  <span className="text-[10px] text-[var(--color-text-primary)] uppercase tracking-wider font-bold font-sans">Google Drive Documents</span>
                </div>
                <button
                  onClick={() => handleGenerateContract(selectedLead)}
                  disabled={generateLoading}
                  className="bg-[var(--color-accent)]/10 hover:bg-[var(--color-accent)]/20 border border-[var(--color-accent)]/20 text-[var(--color-accent)] font-bold text-[10px] px-2.5 py-1 rounded-md flex items-center gap-1 cursor-pointer transition-colors"
                >
                  {generateLoading ? (
                    <Loader size={10} className="animate-spin" />
                  ) : (
                    <UploadCloud size={10} />
                  )}
                  Generate Contract
                </button>
              </div>

              {/* Files list */}
              <div className="flex flex-col gap-2">
                {driveFiles.filter(f => f.leadId === selectedLead.id).length === 0 ? (
                  <div className="text-[11px] text-[var(--color-text-muted)] italic py-3 text-center bg-black/10 rounded-md">
                    No documents uploaded yet. Click above to generate an agreement document.
                  </div>
                ) : (
                  driveFiles.filter(f => f.leadId === selectedLead.id).map(file => (
                    <div key={file.id} className="flex justify-between items-center bg-black/20 p-2.5 rounded-md border border-[var(--color-border)]">
                      <div className="flex items-center gap-2 min-w-0">
                        <FileText size={14} className="text-[var(--color-text-secondary)] shrink-0" />
                        <span className="text-[11px] text-[var(--color-text-secondary)] font-medium truncate">{file.name}</span>
                      </div>
                      <a 
                        href={file.webViewLink} 
                        target="_blank" 
                        rel="noreferrer"
                        className="text-[var(--color-accent)] hover:underline text-[10px] font-bold shrink-0 ml-4"
                      >
                        View File
                      </a>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Proactive AI Audit Section */}
            <div className="bg-[var(--color-primary)]/5 border border-[var(--color-primary)]/20 p-5 rounded-md">
              <div className="flex justify-between items-center mb-4">
                <div className="flex items-center gap-2">
                  <Sparkles size={16} className="text-[var(--color-primary)]" />
                  <h3 className="text-sm font-bold text-[var(--color-primary)]">AI CRM Auditor</h3>
                </div>

                <button
                  onClick={() => runAiAudit(selectedLead)}
                  disabled={aiLoading}
                  className="bg-[var(--color-primary)] hover:bg-[var(--color-primary)]/95 text-white px-3.5 py-1.5 rounded-md text-[10px] font-bold transition-all cursor-pointer flex items-center gap-1"
                >
                  {aiLoading ? <Loader size={10} className="animate-spin" /> : <Sparkles size={10} />}
                  Audit Opportunity
                </button>
              </div>

              {aiLoading && (
                <div className="py-8 flex flex-col items-center justify-center gap-2">
                  <Loader size={20} className="animate-spin text-[var(--color-primary)]" />
                  <span className="text-[10px] text-[var(--color-text-secondary)] italic animate-pulse">Running semantic evaluation...</span>
                </div>
              )}

              {aiResult ? (
                <div className="flex flex-col gap-4">
                  
                  {/* Grade Dashboard */}
                  <div className="bg-[var(--color-bg)] border border-[var(--color-border)] p-4 rounded-md flex items-center gap-4">
                    <div className="w-12 h-12 rounded-md bg-[var(--color-primary)]/10 border border-[var(--color-primary)]/20 flex items-center justify-center font-black text-lg text-[var(--color-primary)] shrink-0">
                      {aiResult.grade}
                    </div>
                    <div className="min-w-0">
                      <div className="text-xs font-bold text-[var(--color-text-primary)]">Lead Score: {aiResult.score}/100</div>
                      <p className="text-[11px] text-[var(--color-text-secondary)] mt-1.5 leading-relaxed">{aiResult.summary}</p>
                    </div>
                  </div>

                  <div className="bg-[var(--color-bg)] border border-[var(--color-border)] p-4 rounded-md">
                    <span className="text-[9px] text-[var(--color-primary)] uppercase tracking-wider font-bold block mb-1">Recommended Execution</span>
                    <p className="text-xs text-[var(--color-text-secondary)] leading-relaxed">{aiResult.suggestedAction}</p>
                  </div>

                  {aiResult.proposedQuickReply && (
                    <div className="bg-[var(--color-bg)] border border-[var(--color-border)] p-4 rounded-md">
                      <span className="text-[9px] text-[var(--color-accent)] uppercase tracking-wider font-bold block mb-1.5">Drafted Follow-up Message</span>
                      <div className="bg-black/35 p-3 rounded-md text-xs text-[var(--color-text-secondary)] italic leading-relaxed border border-[var(--color-border)] mb-3">
                        "{aiResult.proposedQuickReply}"
                      </div>

                      <div className="flex flex-wrap gap-2">
                        <button
                          onClick={() => handleMessageDispatch("whatsapp", aiResult.proposedQuickReply)}
                          disabled={dispatchLoading}
                          className="bg-[var(--color-success)]/10 border border-[var(--color-success)]/20 text-[var(--color-success)] hover:bg-[var(--color-success)]/20 px-3 py-2.5 rounded-md text-[10px] font-bold transition-all cursor-pointer flex items-center gap-1 flex-1 justify-center"
                        >
                          <MessageSquare size={12} />
                          Send WhatsApp
                        </button>
                        <button
                          onClick={() => handleMessageDispatch("sms", aiResult.proposedQuickReply)}
                          disabled={dispatchLoading}
                          className="bg-[var(--color-primary)]/10 border border-[var(--color-primary)]/20 text-[var(--color-primary)] hover:bg-[var(--color-primary)]/20 px-3 py-2.5 rounded-md text-[10px] font-bold transition-all cursor-pointer flex items-center gap-1 flex-1 justify-center"
                        >
                          <Send size={12} />
                          Send SMS
                        </button>
                      </div>
                    </div>
                  )}

                </div>
              ) : (
                <div className="py-4 text-center text-[11px] text-[var(--color-text-muted)] italic">
                  No audit active. Click 'Audit Opportunity' to trigger local model evaluator and generate actions.
                </div>
              )}
            </div>

          </div>
        ) : (
          // Default Dashboard landing
          <div className="flex flex-col gap-6">
            <div>
              <h2 className="text-xl font-bold text-[var(--color-text-primary)] font-sans">Welcome, {user?.name || "User"}</h2>
              <p className="text-xs text-[var(--color-text-secondary)] mt-1">Here is a quick overview of your current CRM pipelines & background workers.</p>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-[var(--color-bg)] border border-[var(--color-border)] p-4 rounded-md flex flex-col gap-1.5 shadow-sm">
                <span className="text-[10px] text-[var(--color-text-muted)] uppercase tracking-wider font-bold">Pipeline Value</span>
                <div className="flex items-baseline gap-2 mt-1">
                  <span className="text-xl font-black text-[var(--color-primary)]">${metrics.totalValue.toLocaleString()}</span>
                  <span className="text-[9px] text-[var(--color-success)] font-bold ml-1">+12%</span>
                </div>
              </div>

              <div className="bg-[var(--color-bg)] border border-[var(--color-border)] p-4 rounded-md flex flex-col gap-1.5 shadow-sm">
                <span className="text-[10px] text-[var(--color-text-muted)] uppercase tracking-wider font-bold">Win Probability</span>
                <div className="flex items-baseline gap-2 mt-1">
                  <span className="text-xl font-black text-[var(--color-success)]">{metrics.winRate}%</span>
                  <span className="text-[9px] text-[var(--color-text-muted)] ml-1">CRM Average</span>
                </div>
              </div>

              <div className="bg-[var(--color-bg)] border border-[var(--color-border)] p-4 rounded-md flex flex-col gap-1.5 shadow-sm">
                <span className="text-[10px] text-[var(--color-text-muted)] uppercase tracking-wider font-bold">Active Contacts</span>
                <div className="flex items-baseline gap-2 mt-1">
                  <span className="text-xl font-black text-[var(--color-text-primary)]">{leads.length}</span>
                  <span className="text-[9px] text-[var(--color-text-muted)] ml-1">leads tracked</span>
                </div>
              </div>

              <div className="bg-[var(--color-bg)] border border-[var(--color-border)] p-4 rounded-md flex flex-col gap-1.5 shadow-sm">
                <span className="text-[10px] text-[var(--color-text-muted)] uppercase tracking-wider font-bold">Pending Tasks</span>
                <div className="flex items-baseline gap-2 mt-1">
                  <span className="text-xl font-black text-[var(--color-secondary)]">{pendingTasksCount}</span>
                  <span className="text-[9px] text-[var(--color-secondary)]/70 font-semibold ml-1">{completedTasksCount} completed</span>
                </div>
              </div>
            </div>

            {/* Pipeline Stage Bar */}
            <div className="bg-[var(--color-bg)] border border-[var(--color-border)] p-5 rounded-md">
              <h4 className="text-xs font-bold text-[var(--color-text-primary)] mb-3">Pipeline Stage Distribution</h4>
              
              <div className="h-2 w-full rounded-md bg-[var(--color-border)] overflow-hidden flex">
                {(["NEW", "CONTACTED", "QUALIFIED", "WON", "LOST"] as const).map((stage, idx) => {
                  const stageCount = leads.filter(l => l.status === stage).length;
                  const ratio = leads.length > 0 ? (stageCount / leads.length) * 100 : 0;
                  
                  const colorsMap = ["var(--color-accent)", "var(--color-secondary)", "var(--color-primary)", "var(--color-success)", "var(--color-danger)"];
                  return (
                    <div 
                      key={stage} 
                      style={{ width: `${ratio}%`, backgroundColor: colorsMap[idx] }} 
                      title={`${stage}: ${stageCount} leads`}
                    />
                  );
                })}
              </div>

              <div className="flex justify-between items-center mt-3 text-[10px] text-[var(--color-text-secondary)] flex-wrap gap-2">
                {(["NEW", "CONTACTED", "QUALIFIED", "WON", "LOST"] as const).map((stage, idx) => {
                  return (
                    <div key={stage} className="flex items-center gap-1.5">
                      <span className={`w-2 h-2 rounded-full ${stage === "NEW" ? "bg-[var(--color-accent)]" : stage === "CONTACTED" ? "bg-[var(--color-secondary)]" : stage === "QUALIFIED" ? "bg-[var(--color-primary)]" : stage === "WON" ? "bg-[var(--color-success)]" : "bg-[var(--color-danger)]"}`} />
                      <span>{stage}: <strong className="text-[var(--color-text-primary)]">{leads.filter(l => l.status === stage).length}</strong></span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Sync Check */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-[var(--color-bg)] border border-[var(--color-border)] p-4 rounded-md">
                <h4 className="text-xs font-bold text-[var(--color-text-primary)] mb-3 flex items-center gap-2">
                  <Activity size={14} className="text-[var(--color-primary)]" />
                  Gateway Quick Actions
                </h4>
                
                <div className="flex flex-col gap-2">
                  <button
                    onClick={() => setActiveTab("api-status")}
                    className="bg-[var(--color-border)] hover:bg-[var(--color-border)]/80 text-[var(--color-text-primary)] text-[11px] font-semibold py-2 px-3 rounded-md flex items-center justify-between cursor-pointer border border-transparent hover:border-[var(--color-primary)]/25 text-left"
                  >
                    <span>Inspect Integrations Control Room</span>
                    <ChevronRight size={12} />
                  </button>

                  <button
                    onClick={() => setActiveTab("tasks")}
                    className="bg-[var(--color-border)] hover:bg-[var(--color-border)]/80 text-[var(--color-text-primary)] text-[11px] font-semibold py-2 px-3 rounded-md flex items-center justify-between cursor-pointer border border-transparent hover:border-[var(--color-primary)]/25 text-left"
                  >
                    <span>Go to Background Task Queue</span>
                    <ChevronRight size={12} />
                  </button>
                </div>
              </div>

              <div className="bg-[var(--color-bg)] border border-[var(--color-border)] p-4 rounded-md">
                <h4 className="text-xs font-bold text-[var(--color-text-primary)] mb-3 flex items-center gap-2">
                  <AlertCircle size={14} className="text-[var(--color-accent)]" />
                  CRM Operations Checklist
                </h4>
                
                <div className="text-[11px] text-[var(--color-text-secondary)] flex flex-col gap-2">
                  <div className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-[var(--color-success)]" />
                    <span>SQLite Database active at <code className="bg-black/40 px-1 rounded-sm">local.db</code></span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-[var(--color-success)]" />
                    <span>Next.js API sync dispatcher live</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-[var(--color-success)]" />
                    <span>CRON batch processors loaded</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
