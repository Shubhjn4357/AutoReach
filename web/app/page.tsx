"use client";

import React, { useState, useEffect } from "react";
import * as Lucide from "lucide-react";
const Users = Lucide.Users as any;
const TrendingUp = Lucide.TrendingUp as any;
const DollarSign = Lucide.DollarSign as any;
const CheckCircle = Lucide.CheckCircle as any;
const Sparkles = Lucide.Sparkles as any;
const RefreshCw = Lucide.RefreshCw as any;
const Phone = Lucide.Phone as any;
const Mail = Lucide.Mail as any;
const Briefcase = Lucide.Briefcase as any;
const Layers = Lucide.Layers as any;
const Plus = Lucide.Plus as any;
const CheckSquare = Lucide.CheckSquare as any;
const HardDrive = Lucide.HardDrive as any;
const CreditCard = Lucide.CreditCard as any;
const Filter = Lucide.Filter as any;
const MessageSquare = Lucide.MessageSquare as any;
const Send = Lucide.Send as any;
import { Lead, LeadStatus, Task } from "../../shared/types";
import { calculatePipelineMetrics } from "../../shared/crm";
import { CardSkeleton, DashboardSkeleton } from "../components/Skeleton";

export default function Dashboard() {
  const [activeTab, setActiveTab] = useState("pipeline");
  const [isLoading, setIsLoading] = useState(true);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [driveFiles, setDriveFiles] = useState<any[]>([]);
  const [roleFilter, setRoleFilter] = useState("ALL");
  const [syncLogs, setSyncLogs] = useState<any[]>([]);

  // Selected lead for AI audit
  const [auditLeadId, setAuditLeadId] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const [aiResult, setAiResult] = useState<any | null>(null);

  // Quick reply dispatch
  const [dispatchPhone, setDispatchPhone] = useState("");
  const [dispatchText, setDispatchText] = useState("");
  const [dispatchChannel, setDispatchChannel] = useState<"whatsapp" | "sms">("whatsapp");
  const [dispatchLoading, setDispatchLoading] = useState(false);

  // Form
  const [newLeadForm, setNewLeadForm] = useState({
    name: "",
    email: "",
    phone: "",
    value: "",
    status: "NEW" as LeadStatus
  });

  const loadBackendData = async () => {
    try {
      // 1. Fetch leads and tasks from backend sync endpoint (GET exposes both)
      const response = await fetch("/api/sync");
      if (!response.ok) throw new Error("Sync GET failed");
      const result = await response.json();
      if (result.success && result.data) {
        setLeads(result.data.leads || []);
        setTasks(result.data.tasks || []);
      }
    } catch (error) {
      console.warn("Backend API offline, loading default mock data:", error);
      // Fallback mock dataset
      setLeads([
        {
          id: "lead_1",
          userId: "u_1",
          name: "Acme Tech Solutions",
          email: "procurement@acmetech.com",
          phone: "+1555019283",
          status: "QUALIFIED",
          value: 12000,
          notes: "Interested in WhatsApp chatbot enterprise module.",
          createdAt: Date.now() - 86400000 * 3,
          updatedAt: Date.now() - 86400000
        },
        {
          id: "lead_2",
          userId: "u_2",
          name: "Delta Growth Partners",
          email: "partners@deltagrowth.co",
          phone: "+1555012984",
          status: "CONTACTED",
          value: 8500,
          notes: "Followed up via SMS gateway. Requested custom demo.",
          createdAt: Date.now() - 86400000 * 2,
          updatedAt: Date.now() - 86400000 * 2
        },
        {
          id: "lead_3",
          userId: "u_1",
          name: "Vortex Logistics",
          email: "billing@vortexlog.com",
          phone: "+1555041382",
          status: "NEW",
          value: 5000,
          notes: "Inbound registration through public API routing.",
          createdAt: Date.now() - 3600000 * 4,
          updatedAt: Date.now() - 3600000 * 4
        },
        {
          id: "lead_4",
          userId: "u_1",
          name: "Sovereign Systems",
          email: "contact@sovereign.io",
          phone: "+1555014991",
          status: "WON",
          value: 24000,
          notes: "Contract signed, Google Drive document structure created.",
          createdAt: Date.now() - 86400000 * 10,
          updatedAt: Date.now() - 86400000 * 5
        }
      ]);

      setTasks([
        {
          id: "task_1",
          userId: "u_1",
          leadId: "lead_1",
          title: "Send custom chatbot presentation",
          description: "Follow up with procurement details",
          status: "PENDING",
          dueDate: Date.now() + 86400000,
          createdAt: Date.now()
        },
        {
          id: "task_2",
          userId: "u_1",
          leadId: "lead_3",
          title: "Schedule intro call",
          description: "Call vortex logistics procurement",
          status: "COMPLETED",
          dueDate: Date.now() - 3600000,
          createdAt: Date.now() - 86400000
        }
      ]);
    }

    try {
      // 2. Fetch Google Drive files
      const driveResponse = await fetch("/api/drive", {
        headers: { "Authorization": "Bearer mock_shubham_token" }
      });
      if (!driveResponse.ok) throw new Error("Drive GET failed");
      const driveResult = await driveResponse.json();
      if (driveResult.success) {
        setDriveFiles(driveResult.data || []);
      }
    } catch (e) {
      setDriveFiles([
        {
          id: "df_1",
          name: "Initech_Proposal.pdf",
          mimeType: "application/pdf",
          size: 1420500,
          webViewLink: "https://drive.google.com/open?id=mock_file_1",
          createdAt: Date.now() - 86400000 * 2
        },
        {
          id: "df_2",
          name: "Acme_Specs_Chatbot.docx",
          mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
          size: 345000,
          webViewLink: "https://drive.google.com/open?id=mock_file_2",
          createdAt: Date.now() - 86400000
        }
      ]);
    }

    // Load mock sync history
    setSyncLogs([
      { id: "sl_1", operation: "CREATE", table: "leads", recordId: "lead_3", timestamp: new Date(Date.now() - 1000 * 180).toISOString() },
      { id: "sl_2", operation: "UPDATE", table: "leads", recordId: "lead_1", timestamp: new Date(Date.now() - 1000 * 600).toISOString() },
      { id: "sl_3", operation: "UPDATE", table: "tasks", recordId: "task_2", timestamp: new Date(Date.now() - 1000 * 1200).toISOString() }
    ]);
  };

  useEffect(() => {
    loadBackendData().then(() => {
      setIsLoading(false);
    });
  }, []);

  const handleAddLead = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newLeadForm.name) return;

    const newLead: Lead = {
      id: `lead_${Math.random().toString(36).substring(2, 9)}`,
      userId: "u_1",
      name: newLeadForm.name,
      email: newLeadForm.email || null,
      phone: newLeadForm.phone || null,
      status: newLeadForm.status,
      value: Number(newLeadForm.value) || 0,
      notes: "Manually registered via Admin Console.",
      createdAt: Date.now(),
      updatedAt: Date.now()
    };

    setLeads([newLead, ...leads]);

    try {
      await fetch("/api/leads", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": "Bearer mock_shubham_token"
        },
        body: JSON.stringify(newLead)
      });
      // Add log
      setSyncLogs([
        { id: `sl_${Math.random()}`, operation: "CREATE", table: "leads", recordId: newLead.id, timestamp: new Date().toISOString() },
        ...syncLogs
      ]);
    } catch (err) {
      console.warn("Backend insertion offline, saved locally to state");
    }

    setNewLeadForm({
      name: "",
      email: "",
      phone: "",
      value: "",
      status: "NEW"
    });
    setActiveTab("pipeline");
  };

  const executeAiAudit = async (leadId: string) => {
    if (!leadId) return;
    const targetLead = leads.find(l => l.id === leadId);
    if (!targetLead) return;

    setAiLoading(true);
    setAiResult(null);

    try {
      const response = await fetch("/api/ai", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": "Bearer mock_shubham_token"
        },
        body: JSON.stringify(targetLead)
      });
      const result = await response.json();
      if (result.success) {
        setAiResult(result.data);
        setDispatchPhone(targetLead.phone || "");
        setDispatchText(result.data.proposedQuickReply || "");
      }
    } catch (err) {
      // offline audit simulation
      setAiResult({
        score: targetLead.value > 15000 ? 92 : 65,
        grade: targetLead.value > 15000 ? "A" : "B",
        summary: `Self-auditing offline profile data. Valuation: $${targetLead.value.toLocaleString()}. Status: ${targetLead.status}.`,
        suggestedAction: targetLead.value > 10000 
          ? "Draft custom enterprise proposal and push files to Drive."
          : "Schedule quick demo call via WhatsApp gateway.",
        proposedQuickReply: `Hi ${targetLead.name.split(" ")[0] || "there"}, following up on our proposal. Let me know when is best to sync!`
      });
      setDispatchPhone(targetLead.phone || "");
      setDispatchText(`Hi ${targetLead.name.split(" ")[0] || "there"}, following up on our proposal. Let me know when is best to sync!`);
    } finally {
      setAiLoading(false);
    }
  };

  const handleMessageDispatch = async () => {
    if (!dispatchPhone || !dispatchText) return;
    setDispatchLoading(true);
    try {
      const response = await fetch(`/api/${dispatchChannel}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": "Bearer mock_shubham_token"
        },
        body: JSON.stringify({ phone: dispatchPhone, text: dispatchText })
      });
      const result = await response.json();
      if (result.success) {
        alert(`${dispatchChannel.toUpperCase()} message sent successfully!`);
      } else {
        throw new Error(result.error?.message || "Dispatch failed");
      }
    } catch (e) {
      alert("Simulated: Server is offline, message dispatch enqueued on target device.");
    } finally {
      setDispatchLoading(false);
    }
  };

  // Filter leads by user role level
  const filteredLeads = leads.filter(lead => {
    if (roleFilter === "ALL") return true;
    if (roleFilter === "u_1") return lead.userId === "u_1";
    if (roleFilter === "u_2") return lead.userId === "u_2";
    return true;
  });

  const metrics = calculatePipelineMetrics(filteredLeads);

  // Compute counts for SVG Chart
  const statusCounts = {
    NEW: leads.filter(l => l.status === "NEW").length,
    CONTACTED: leads.filter(l => l.status === "CONTACTED").length,
    QUALIFIED: leads.filter(l => l.status === "QUALIFIED").length,
    WON: leads.filter(l => l.status === "WON").length,
    LOST: leads.filter(l => l.status === "LOST").length,
  };

  return (
    <div style={{ display: "flex", minHeight: "100vh", background: "#050505" }}>
      {/* 1. Left Sidebar */}
      <aside style={{
        width: "260px",
        borderRight: "1px solid var(--color-border)",
        background: "rgba(17, 17, 17, 0.8)",
        backdropFilter: "blur(20px)",
        display: "flex",
        flexDirection: "column",
        padding: "24px 16px"
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "36px", paddingLeft: "8px" }}>
          <div style={{
            background: "linear-gradient(135deg, var(--color-primary), var(--color-secondary))",
            width: "36px",
            height: "36px",
            borderRadius: "var(--radius-sm)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center"
          }}>
            <Sparkles size={18} />
          </div>
          <span style={{ fontWeight: 700, fontSize: "1.15rem", letterSpacing: "-0.5px" }}>AutoReach</span>
        </div>

        <nav style={{ display: "flex", flexDirection: "column", gap: "6px", flex: 1 }}>
          <button 
            onClick={() => setActiveTab("pipeline")}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "12px",
              padding: "12px 14px",
              border: "none",
              background: activeTab === "pipeline" ? "rgba(94, 107, 255, 0.15)" : "transparent",
              color: activeTab === "pipeline" ? "var(--color-primary)" : "var(--color-text-secondary)",
              borderRadius: "var(--radius-sm)",
              cursor: "pointer",
              fontWeight: 500,
              textAlign: "left",
              width: "100%",
              transition: "all var(--transition-normal)"
            }}
          >
            <Layers size={18} />
            Pipeline Funnel
          </button>

          <button 
            onClick={() => setActiveTab("tasks")}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "12px",
              padding: "12px 14px",
              border: "none",
              background: activeTab === "tasks" ? "rgba(94, 107, 255, 0.15)" : "transparent",
              color: activeTab === "tasks" ? "var(--color-primary)" : "var(--color-text-secondary)",
              borderRadius: "var(--radius-sm)",
              cursor: "pointer",
              fontWeight: 500,
              textAlign: "left",
              width: "100%",
              transition: "all var(--transition-normal)"
            }}
          >
            <CheckSquare size={18} />
            Tasks Checklist
          </button>

          <button 
            onClick={() => setActiveTab("drive")}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "12px",
              padding: "12px 14px",
              border: "none",
              background: activeTab === "drive" ? "rgba(94, 107, 255, 0.15)" : "transparent",
              color: activeTab === "drive" ? "var(--color-primary)" : "var(--color-text-secondary)",
              borderRadius: "var(--radius-sm)",
              cursor: "pointer",
              fontWeight: 500,
              textAlign: "left",
              width: "100%",
              transition: "all var(--transition-normal)"
            }}
          >
            <HardDrive size={18} />
            Google Drive Files
          </button>

          <button 
            onClick={() => setActiveTab("ai-audit")}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "12px",
              padding: "12px 14px",
              border: "none",
              background: activeTab === "ai-audit" ? "rgba(94, 107, 255, 0.15)" : "transparent",
              color: activeTab === "ai-audit" ? "var(--color-primary)" : "var(--color-text-secondary)",
              borderRadius: "var(--radius-sm)",
              cursor: "pointer",
              fontWeight: 500,
              textAlign: "left",
              width: "100%",
              transition: "all var(--transition-normal)"
            }}
          >
            <Sparkles size={18} style={{ color: "var(--color-accent)" }} />
            AI Auditor Agent
          </button>

          <button 
            onClick={() => setActiveTab("new-lead")}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "12px",
              padding: "12px 14px",
              border: "none",
              background: activeTab === "new-lead" ? "rgba(94, 107, 255, 0.15)" : "transparent",
              color: activeTab === "new-lead" ? "var(--color-primary)" : "var(--color-text-secondary)",
              borderRadius: "var(--radius-sm)",
              cursor: "pointer",
              fontWeight: 500,
              textAlign: "left",
              width: "100%",
              transition: "all var(--transition-normal)"
            }}
          >
            <Plus size={18} />
            Register Lead
          </button>

          <button 
            onClick={() => setActiveTab("billing")}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "12px",
              padding: "12px 14px",
              border: "none",
              background: activeTab === "billing" ? "rgba(94, 107, 255, 0.15)" : "transparent",
              color: activeTab === "billing" ? "var(--color-primary)" : "var(--color-text-secondary)",
              borderRadius: "var(--radius-sm)",
              cursor: "pointer",
              fontWeight: 500,
              textAlign: "left",
              width: "100%",
              transition: "all var(--transition-normal)"
            }}
          >
            <CreditCard size={18} />
            SaaS & Billing
          </button>
        </nav>

        <div style={{ display: "flex", alignItems: "center", gap: "12px", padding: "12px 8px", borderTop: "1px solid var(--color-border)" }}>
          <div style={{
            width: "32px",
            height: "32px",
            borderRadius: "var(--radius-pill)",
            background: "#2A2A2A",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: "0.85rem",
            fontWeight: 600
          }}>SA</div>
          <div>
            <div style={{ fontSize: "0.85rem", fontWeight: 600 }}>Shubham A.</div>
            <div style={{ fontSize: "0.75rem", color: "var(--color-text-muted)" }}>Workspace Admin</div>
          </div>
        </div>
      </aside>

      {/* 2. Main content */}
      <main style={{ flex: 1, padding: "40px", overflowY: "auto" }}>
        
        {/* Header */}
        <header style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "36px" }}>
          <div>
            <h1 style={{ fontSize: "2rem", fontWeight: 700, letterSpacing: "-1px", marginBottom: "4px" }}>Admin Console</h1>
            <p style={{ color: "var(--color-text-secondary)", fontSize: "0.95rem" }}>Monitor synchronizations, active customer funnels, and agent outputs.</p>
          </div>
          
          <div className="glass-surface" style={{
            display: "flex",
            alignItems: "center",
            gap: "8px",
            padding: "8px 16px",
            borderRadius: "var(--radius-pill)",
            fontSize: "0.85rem"
          }}>
            <RefreshCw size={14} className="text-success" style={{ animation: "spin 8s linear infinite" }} />
            <span>Neon DB Connected</span>
          </div>
        </header>

        {/* 3. Analytics grid */}
        <section style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
          gap: "20px",
          marginBottom: "40px"
        }}>
          {isLoading ? (
            <>
              <CardSkeleton />
              <CardSkeleton />
              <CardSkeleton />
              <CardSkeleton />
            </>
          ) : (
            <>
              <div className="glass-card" style={{ padding: "24px", borderRadius: "var(--radius-md)" }}>
                <div style={{ display: "flex", justifyContent: "space-between", color: "var(--color-text-secondary)", marginBottom: "16px" }}>
                  <span>Total Pipeline</span>
                  <TrendingUp size={20} style={{ color: "var(--color-primary)" }} />
                </div>
                <div style={{ fontSize: "1.8rem", fontWeight: 700 }}>${metrics.totalValue.toLocaleString()}</div>
                <div style={{ fontSize: "0.8rem", color: "var(--color-text-muted)", marginTop: "4px" }}>Active sales pipeline value</div>
              </div>

              <div className="glass-card" style={{ padding: "24px", borderRadius: "var(--radius-md)" }}>
                <div style={{ display: "flex", justifyContent: "space-between", color: "var(--color-text-secondary)", marginBottom: "16px" }}>
                  <span>Weighted Projection</span>
                  <DollarSign size={20} style={{ color: "var(--color-secondary)" }} />
                </div>
                <div style={{ fontSize: "1.8rem", fontWeight: 700 }}>${Math.round(metrics.weightedValue).toLocaleString()}</div>
                <div style={{ fontSize: "0.8rem", color: "var(--color-text-muted)", marginTop: "4px" }}>Adjusted by deal stage probability</div>
              </div>

              <div className="glass-card" style={{ padding: "24px", borderRadius: "var(--radius-md)" }}>
                <div style={{ display: "flex", justifyContent: "space-between", color: "var(--color-text-secondary)", marginBottom: "16px" }}>
                  <span>Conversion Rate</span>
                  <CheckCircle size={20} style={{ color: "var(--color-success)" }} />
                </div>
                <div style={{ fontSize: "1.8rem", fontWeight: 700 }}>{metrics.winRate}%</div>
                <div style={{ fontSize: "0.8rem", color: "var(--color-text-muted)", marginTop: "4px" }}>{metrics.wonCount} won vs {metrics.lostCount} lost</div>
              </div>

              <div className="glass-card" style={{ padding: "24px", borderRadius: "var(--radius-md)" }}>
                <div style={{ display: "flex", justifyContent: "space-between", color: "var(--color-text-secondary)", marginBottom: "16px" }}>
                  <span>Active Leads</span>
                  <Users size={20} style={{ color: "var(--color-accent)" }} />
                </div>
                <div style={{ fontSize: "1.8rem", fontWeight: 700 }}>{metrics.activeCount}</div>
                <div style={{ fontSize: "0.8rem", color: "var(--color-text-muted)", marginTop: "4px" }}>Leads currently in process</div>
              </div>
            </>
          )}
        </section>

        {isLoading ? (
          <DashboardSkeleton />
        ) : activeTab === "pipeline" ? (
          <div style={{ display: "grid", gridTemplateColumns: "3fr 2fr", gap: "30px" }}>
            
            {/* Leads Table */}
            <section className="glass-card" style={{ padding: "28px", borderRadius: "var(--radius-lg)" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
                <h2 style={{ fontSize: "1.25rem", fontWeight: 600 }}>Active Pipelines</h2>
                
                {/* Team Filter */}
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <Filter size={16} style={{ color: "var(--color-text-secondary)" }} />
                  <select 
                    value={roleFilter} 
                    onChange={(e) => setRoleFilter(e.target.value)}
                    style={{
                      background: "#171717",
                      color: "#FFF",
                      border: "1px solid var(--color-border)",
                      padding: "6px 12px",
                      borderRadius: "var(--radius-xs)",
                      fontSize: "0.8rem",
                      outline: "none"
                    }}
                  >
                    <option value="ALL">All Workspace Owners</option>
                    <option value="u_1">Shubham A. (Admin)</option>
                    <option value="u_2">Dev Partner (Member)</option>
                  </select>
                </div>
              </div>

              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.9rem" }}>
                <thead>
                  <tr style={{ borderBottom: "1px solid var(--color-border)", textAlign: "left" }}>
                    <th style={{ paddingBottom: "12px", color: "var(--color-text-secondary)" }}>Name</th>
                    <th style={{ paddingBottom: "12px", color: "var(--color-text-secondary)" }}>Status</th>
                    <th style={{ paddingBottom: "12px", color: "var(--color-text-secondary)" }}>Value</th>
                    <th style={{ paddingBottom: "12px", color: "var(--color-text-secondary)" }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredLeads.map((lead) => (
                    <tr key={lead.id} style={{ borderBottom: "1px solid rgba(255, 255, 255, 0.05)" }}>
                      <td style={{ padding: "16px 0" }}>
                        <div style={{ fontWeight: 600 }}>{lead.name}</div>
                        <div style={{ fontSize: "0.8rem", color: "var(--color-text-muted)", marginTop: "4px" }}>{lead.email}</div>
                      </td>
                      <td>
                        <span style={{
                          padding: "4px 10px",
                          borderRadius: "var(--radius-pill)",
                          fontSize: "0.75rem",
                          fontWeight: 600,
                          backgroundColor: 
                            lead.status === "WON" ? "rgba(34, 197, 94, 0.15)" :
                            lead.status === "LOST" ? "rgba(239, 68, 68, 0.15)" :
                            lead.status === "QUALIFIED" ? "rgba(94, 107, 255, 0.15)" :
                            "rgba(245, 158, 11, 0.15)",
                          color:
                            lead.status === "WON" ? "var(--color-success)" :
                            lead.status === "LOST" ? "var(--color-danger)" :
                            lead.status === "QUALIFIED" ? "var(--color-primary)" :
                            "var(--color-warning)"
                        }}>
                          {lead.status}
                        </span>
                      </td>
                      <td style={{ fontWeight: 600 }}>${lead.value.toLocaleString()}</td>
                      <td>
                        <div style={{ display: "flex", gap: "8px" }}>
                          {lead.phone && <a href={`tel:${lead.phone}`} title="Call Gateway" style={{ color: "var(--color-text-secondary)" }}><Phone size={16} /></a>}
                          {lead.email && <a href={`mailto:${lead.email}`} title="Email Client" style={{ color: "var(--color-text-secondary)" }}><Mail size={16} /></a>}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </section>

            {/* Dashboard Visual Charts & Sync logs */}
            <aside style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
              
              {/* SVG Charts */}
              <div className="glass-card" style={{ padding: "28px", borderRadius: "var(--radius-lg)" }}>
                <h3 style={{ fontSize: "1.1rem", fontWeight: 600, marginBottom: "16px" }}>Pipeline Stages Distribution</h3>
                <div style={{ display: "flex", justifyContent: "center", padding: "10px 0" }}>
                  <svg width="240" height="140" viewBox="0 0 240 140">
                    {/* Grid Lines */}
                    <line x1="30" y1="10" x2="220" y2="10" stroke="rgba(255,255,255,0.05)" />
                    <line x1="30" y1="50" x2="220" y2="50" stroke="rgba(255,255,255,0.05)" />
                    <line x1="30" y1="90" x2="220" y2="90" stroke="rgba(255,255,255,0.05)" />
                    <line x1="30" y1="120" x2="220" y2="120" stroke="rgba(255,255,255,0.2)" />
                    
                    {/* SVG Bars representing stage sizes */}
                    {/* NEW */}
                    <rect x="45" y={120 - Math.max(statusCounts.NEW * 25, 4)} width="16" height={Math.max(statusCounts.NEW * 25, 4)} fill="var(--color-warning)" rx="2" />
                    <text x="53" y="132" fill="var(--color-text-muted)" fontSize="8" textAnchor="middle">NEW</text>
                    
                    {/* CONTACTED */}
                    <rect x="80" y={120 - Math.max(statusCounts.CONTACTED * 25, 4)} width="16" height={Math.max(statusCounts.CONTACTED * 25, 4)} fill="var(--color-secondary)" rx="2" />
                    <text x="88" y="132" fill="var(--color-text-muted)" fontSize="8" textAnchor="middle">CONT</text>
                    
                    {/* QUALIFIED */}
                    <rect x="115" y={120 - Math.max(statusCounts.QUALIFIED * 25, 4)} width="16" height={Math.max(statusCounts.QUALIFIED * 25, 4)} fill="var(--color-primary)" rx="2" />
                    <text x="123" y="132" fill="var(--color-text-muted)" fontSize="8" textAnchor="middle">QUAL</text>
                    
                    {/* WON */}
                    <rect x="150" y={120 - Math.max(statusCounts.WON * 25, 4)} width="16" height={Math.max(statusCounts.WON * 25, 4)} fill="var(--color-success)" rx="2" />
                    <text x="158" y="132" fill="var(--color-text-muted)" fontSize="8" textAnchor="middle">WON</text>
                    
                    {/* LOST */}
                    <rect x="185" y={120 - Math.max(statusCounts.LOST * 25, 4)} width="16" height={Math.max(statusCounts.LOST * 25, 4)} fill="var(--color-danger)" rx="2" />
                    <text x="193" y="132" fill="var(--color-text-muted)" fontSize="8" textAnchor="middle">LOST</text>
                  </svg>
                </div>
              </div>

              {/* Sync Queue Logs */}
              <div className="glass-card" style={{ padding: "24px", borderRadius: "var(--radius-md)" }}>
                <h3 style={{ fontSize: "1.1rem", fontWeight: 600, marginBottom: "16px" }}>Offline Sync Stream</h3>
                <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                  {syncLogs.map((log) => (
                    <div key={log.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "0.8rem", paddingBottom: "8px", borderBottom: "1px solid rgba(255,255,255,0.03)" }}>
                      <div>
                        <span style={{ color: "var(--color-primary)", fontWeight: 700 }}>{log.operation} </span>
                        <span style={{ color: "var(--color-text-secondary)" }}>{log.table} ({log.recordId})</span>
                      </div>
                      <span style={{ color: "var(--color-text-muted)" }}>{new Date(log.timestamp).toLocaleTimeString()}</span>
                    </div>
                  ))}
                </div>
              </div>

            </aside>
          </div>
        ) : activeTab === "tasks" ? (
          /* Tasks Checklist Tab */
          <section className="glass-card" style={{ padding: "32px", borderRadius: "var(--radius-lg)" }}>
            <h2 style={{ fontSize: "1.5rem", fontWeight: 600, marginBottom: "20px" }}>Active Task Checklist</h2>
            <p style={{ color: "var(--color-text-secondary)", marginBottom: "24px", fontSize: "0.95rem" }}>
              Action checklist items synced automatically from member SQLite clients.
            </p>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.9rem" }}>
              <thead>
                <tr style={{ borderBottom: "1px solid var(--color-border)", textAlign: "left" }}>
                  <th style={{ paddingBottom: "12px", color: "var(--color-text-secondary)" }}>Task Title</th>
                  <th style={{ paddingBottom: "12px", color: "var(--color-text-secondary)" }}>Description</th>
                  <th style={{ paddingBottom: "12px", color: "var(--color-text-secondary)" }}>Status</th>
                  <th style={{ paddingBottom: "12px", color: "var(--color-text-secondary)" }}>Associated Lead</th>
                </tr>
              </thead>
              <tbody>
                {tasks.map((task) => {
                  const matchingLead = leads.find(l => l.id === task.leadId);
                  return (
                    <tr key={task.id} style={{ borderBottom: "1px solid rgba(255, 255, 255, 0.05)" }}>
                      <td style={{ padding: "16px 0", fontWeight: 600 }}>{task.title}</td>
                      <td style={{ color: "var(--color-text-secondary)" }}>{task.description || "No description"}</td>
                      <td>
                        <span style={{
                          padding: "4px 10px",
                          borderRadius: "var(--radius-pill)",
                          fontSize: "0.75rem",
                          fontWeight: 600,
                          backgroundColor: task.status === "COMPLETED" ? "rgba(34, 197, 94, 0.15)" : "rgba(94, 107, 255, 0.15)",
                          color: task.status === "COMPLETED" ? "var(--color-success)" : "var(--color-primary)"
                        }}>
                          {task.status}
                        </span>
                      </td>
                      <td style={{ color: "var(--color-accent)", fontWeight: 500 }}>
                        {matchingLead ? matchingLead.name : "Unassociated"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </section>
        ) : activeTab === "drive" ? (
          /* Google Drive Files Tab */
          <section className="glass-card" style={{ padding: "32px", borderRadius: "var(--radius-lg)" }}>
            <h2 style={{ fontSize: "1.5rem", fontWeight: 600, marginBottom: "20px" }}>Google Drive Document Repository</h2>
            <p style={{ color: "var(--color-text-secondary)", marginBottom: "24px", fontSize: "0.95rem" }}>
              Cloud drive document mappings. Storing fileIDs and metadata only, keeping remote DB clean of binary blobs.
            </p>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.9rem" }}>
              <thead>
                <tr style={{ borderBottom: "1px solid var(--color-border)", textAlign: "left" }}>
                  <th style={{ paddingBottom: "12px", color: "var(--color-text-secondary)" }}>File Name</th>
                  <th style={{ paddingBottom: "12px", color: "var(--color-text-secondary)" }}>Mime Type</th>
                  <th style={{ paddingBottom: "12px", color: "var(--color-text-secondary)" }}>File Size</th>
                  <th style={{ paddingBottom: "12px", color: "var(--color-text-secondary)" }}>Drive Link</th>
                </tr>
              </thead>
              <tbody>
                {driveFiles.map((file) => (
                  <tr key={file.id} style={{ borderBottom: "1px solid rgba(255, 255, 255, 0.05)" }}>
                    <td style={{ padding: "16px 0", fontWeight: 600 }}>{file.name}</td>
                    <td style={{ color: "var(--color-text-secondary)" }}>{file.mimeType}</td>
                    <td>{Math.round(file.size / 1024).toLocaleString()} KB</td>
                    <td>
                      <a href={file.webViewLink} target="_blank" rel="noopener noreferrer" style={{ color: "var(--color-primary)", textDecoration: "underline", fontWeight: 600 }}>
                        Open in Google Drive ➔
                      </a>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        ) : activeTab === "ai-audit" ? (
          /* AI Auditor Agent Tab */
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "30px" }}>
            
            {/* Audit selection panel */}
            <section className="glass-card" style={{ padding: "28px", borderRadius: "var(--radius-lg)" }}>
              <h2 style={{ fontSize: "1.25rem", fontWeight: 600, marginBottom: "16px" }}>Select Lead for Proactive Audit</h2>
              <div style={{ display: "flex", gap: "10px", marginBottom: "24px" }}>
                <select 
                  value={auditLeadId}
                  onChange={(e) => setAuditLeadId(e.target.value)}
                  style={{
                    flex: 1,
                    background: "#171717",
                    color: "#FFF",
                    border: "1px solid var(--color-border)",
                    padding: "12px",
                    borderRadius: "var(--radius-xs)",
                    outline: "none"
                  }}
                >
                  <option value="">Select a Lead...</option>
                  {leads.map(lead => (
                    <option key={lead.id} value={lead.id}>{lead.name} (${lead.value.toLocaleString()})</option>
                  ))}
                </select>
                <button 
                  onClick={() => executeAiAudit(auditLeadId)}
                  disabled={aiLoading || !auditLeadId}
                  style={{
                    background: "linear-gradient(135deg, var(--color-primary), var(--color-secondary))",
                    color: "#FFF",
                    border: "none",
                    padding: "12px 24px",
                    borderRadius: "var(--radius-xs)",
                    fontWeight: 600,
                    cursor: "pointer"
                  }}
                >
                  {aiLoading ? "Analyzing..." : "Audit Lead Profile"}
                </button>
              </div>

              {aiResult && (
                <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
                  <div style={{ display: "flex", gap: "16px", alignItems: "center" }}>
                    <div style={{
                      width: "60px",
                      height: "60px",
                      background: "rgba(94, 107, 255, 0.15)",
                      border: "2px solid var(--color-primary)",
                      borderRadius: "var(--radius-sm)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: "2rem",
                      fontWeight: 900,
                      color: "var(--color-primary)"
                    }}>
                      {aiResult.grade}
                    </div>
                    <div>
                      <div style={{ fontSize: "1.2rem", fontWeight: 700 }}>Profile Score: {aiResult.score}/100</div>
                      <div style={{ color: "var(--color-text-secondary)", fontSize: "0.85rem", marginTop: "4px" }}>{aiResult.summary}</div>
                    </div>
                  </div>

                  <div style={{ background: "rgba(255,255,255,0.02)", border: "1px solid var(--color-border)", padding: "16px", borderRadius: "var(--radius-xs)" }}>
                    <div style={{ fontWeight: 700, fontSize: "0.9rem", color: "var(--color-primary)", marginBottom: "6px" }}>Suggested Sales Action:</div>
                    <div style={{ color: "var(--color-text-secondary)", fontSize: "0.85rem", lineHeight: "1.4" }}>{aiResult.suggestedAction}</div>
                  </div>
                </div>
              )}
            </section>

            {/* Quick reply dispatcher panel */}
            <section className="glass-card" style={{ padding: "28px", borderRadius: "var(--radius-lg)" }}>
              <h2 style={{ fontSize: "1.25rem", fontWeight: 600, marginBottom: "20px" }}>AI Communications Dispatcher</h2>
              
              <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                  <label style={{ fontSize: "0.8rem", color: "var(--color-text-secondary)" }}>Recipient Phone Number</label>
                  <input 
                    type="text" 
                    value={dispatchPhone}
                    onChange={(e) => setDispatchPhone(e.target.value)}
                    placeholder="+1 (555) 000-0000"
                    style={{
                      background: "rgba(255,255,255,0.02)",
                      border: "1px solid var(--color-border)",
                      padding: "10px",
                      borderRadius: "var(--radius-xs)",
                      color: "#FFF",
                      outline: "none"
                    }}
                  />
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                  <label style={{ fontSize: "0.8rem", color: "var(--color-text-secondary)" }}>Channel Type</label>
                  <div style={{ display: "flex", gap: "10px" }}>
                    <button 
                      onClick={() => setDispatchChannel("whatsapp")}
                      style={{
                        flex: 1,
                        background: dispatchChannel === "whatsapp" ? "rgba(34, 197, 94, 0.15)" : "transparent",
                        color: dispatchChannel === "whatsapp" ? "var(--color-success)" : "var(--color-text-secondary)",
                        border: `1px solid ${dispatchChannel === "whatsapp" ? "var(--color-success)" : "var(--color-border)"}`,
                        padding: "10px",
                        borderRadius: "var(--radius-xs)",
                        cursor: "pointer",
                        fontWeight: 600
                      }}
                    >
                      WhatsApp Bridge
                    </button>
                    <button 
                      onClick={() => setDispatchChannel("sms")}
                      style={{
                        flex: 1,
                        background: dispatchChannel === "sms" ? "rgba(94, 107, 255, 0.15)" : "transparent",
                        color: dispatchChannel === "sms" ? "var(--color-primary)" : "var(--color-text-secondary)",
                        border: `1px solid ${dispatchChannel === "sms" ? "var(--color-primary)" : "var(--color-border)"}`,
                        padding: "10px",
                        borderRadius: "var(--radius-xs)",
                        cursor: "pointer",
                        fontWeight: 600
                      }}
                    >
                      SMS Gateway
                    </button>
                  </div>
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                  <label style={{ fontSize: "0.8rem", color: "var(--color-text-secondary)" }}>Draft Response</label>
                  <textarea 
                    value={dispatchText}
                    onChange={(e) => setDispatchText(e.target.value)}
                    rows={4}
                    style={{
                      background: "rgba(255,255,255,0.02)",
                      border: "1px solid var(--color-border)",
                      padding: "10px",
                      borderRadius: "var(--radius-xs)",
                      color: "#FFF",
                      outline: "none",
                      resize: "none"
                    }}
                  />
                </div>

                <button 
                  onClick={handleMessageDispatch}
                  disabled={dispatchLoading || !dispatchPhone || !dispatchText}
                  style={{
                    background: "linear-gradient(135deg, var(--color-primary), var(--color-secondary))",
                    color: "#FFF",
                    border: "none",
                    padding: "14px",
                    borderRadius: "var(--radius-xs)",
                    fontWeight: 700,
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "10px"
                  }}
                >
                  <Send size={16} />
                  {dispatchLoading ? "Dispatching..." : `Send via ${dispatchChannel === "whatsapp" ? "WhatsApp" : "SMS"}`}
                </button>
              </div>
            </section>
          </div>
        ) : activeTab === "new-lead" ? (
          /* Create Form */
          <section className="glass-card" style={{ padding: "32px", borderRadius: "var(--radius-lg)", maxWidth: "600px" }}>
            <h2 style={{ fontSize: "1.25rem", fontWeight: 600, marginBottom: "24px" }}>Register New Sales Lead</h2>
            
            <form onSubmit={handleAddLead} style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
              <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                <label style={{ fontSize: "0.85rem", color: "var(--color-text-secondary)" }}>Company Name / Lead Title</label>
                <input 
                  type="text" 
                  value={newLeadForm.name}
                  onChange={(e) => setNewLeadForm({ ...newLeadForm, name: e.target.value })}
                  placeholder="e.g. Initech Corporation" 
                  required
                  style={{
                    background: "rgba(255,255,255,0.02)",
                    border: "1px solid var(--color-border)",
                    borderRadius: "var(--radius-xs)",
                    padding: "10px 14px",
                    color: "#FFF",
                    outline: "none"
                  }}
                />
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
                <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                  <label style={{ fontSize: "0.85rem", color: "var(--color-text-secondary)" }}>Email Address</label>
                  <input 
                    type="email" 
                    value={newLeadForm.email}
                    onChange={(e) => setNewLeadForm({ ...newLeadForm, email: e.target.value })}
                    placeholder="name@company.com" 
                    style={{
                      background: "rgba(255,255,255,0.02)",
                      border: "1px solid var(--color-border)",
                      borderRadius: "var(--radius-xs)",
                      padding: "10px 14px",
                      color: "#FFF",
                      outline: "none"
                    }}
                  />
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                  <label style={{ fontSize: "0.85rem", color: "var(--color-text-secondary)" }}>Phone Number</label>
                  <input 
                    type="tel" 
                    value={newLeadForm.phone}
                    onChange={(e) => setNewLeadForm({ ...newLeadForm, phone: e.target.value })}
                    placeholder="+1 (555) 000-0000" 
                    style={{
                      background: "rgba(255,255,255,0.02)",
                      border: "1px solid var(--color-border)",
                      borderRadius: "var(--radius-xs)",
                      padding: "10px 14px",
                      color: "#FFF",
                      outline: "none"
                    }}
                  />
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
                <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                  <label style={{ fontSize: "0.85rem", color: "var(--color-text-secondary)" }}>Valuation ($)</label>
                  <input 
                    type="number" 
                    value={newLeadForm.value}
                    onChange={(e) => setNewLeadForm({ ...newLeadForm, value: e.target.value })}
                    placeholder="5000" 
                    style={{
                      background: "rgba(255,255,255,0.02)",
                      border: "1px solid var(--color-border)",
                      borderRadius: "var(--radius-xs)",
                      padding: "10px 14px",
                      color: "#FFF",
                      outline: "none"
                    }}
                  />
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                  <label style={{ fontSize: "0.85rem", color: "var(--color-text-secondary)" }}>Initial Stage</label>
                  <select 
                    value={newLeadForm.status}
                    onChange={(e) => setNewLeadForm({ ...newLeadForm, status: e.target.value as LeadStatus })}
                    style={{
                      background: "#171717",
                      border: "1px solid var(--color-border)",
                      borderRadius: "var(--radius-xs)",
                      padding: "10px 14px",
                      color: "#FFF",
                      outline: "none"
                    }}
                  >
                    <option value="NEW">NEW</option>
                    <option value="CONTACTED">CONTACTED</option>
                    <option value="QUALIFIED">QUALIFIED</option>
                    <option value="WON">WON</option>
                    <option value="LOST">LOST</option>
                  </select>
                </div>
              </div>

              <button 
                type="submit" 
                style={{
                  background: "linear-gradient(135deg, var(--color-primary), var(--color-secondary))",
                  color: "#FFF",
                  border: "none",
                  borderRadius: "var(--radius-xs)",
                  padding: "14px",
                  fontWeight: 600,
                  cursor: "pointer",
                  marginTop: "12px",
                  transition: "transform var(--transition-spring)"
                }}
              >
                Add Lead to Funnel
              </button>
            </form>
          </section>
        ) : (
          /* Billing & SaaS Subscriptions Tab */
          <section className="glass-card" style={{ padding: "32px", borderRadius: "var(--radius-lg)", maxWidth: "700px" }}>
            <h2 style={{ fontSize: "1.5rem", fontWeight: 600, marginBottom: "16px" }}>SaaS Subscription Plan</h2>
            <p style={{ color: "var(--color-text-secondary)", marginBottom: "24px", fontSize: "0.95rem" }}>
              Manage multi-tenant SaaS organizations, billing limits, and subscription tiers.
            </p>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px", marginBottom: "30px" }}>
              <div style={{ background: "rgba(255,255,255,0.02)", border: "1px solid var(--color-border)", padding: "20px", borderRadius: "var(--radius-md)" }}>
                <div style={{ color: "var(--color-text-secondary)", fontSize: "0.8rem", marginBottom: "6px" }}>Organization Status</div>
                <div style={{ fontSize: "1.25rem", fontWeight: 700, color: "var(--color-success)" }}>Active Workspace</div>
                <div style={{ fontSize: "0.85rem", color: "var(--color-text-muted)", marginTop: "4px" }}>ID: org_shubham_workspace</div>
              </div>

              <div style={{ background: "rgba(255,255,255,0.02)", border: "1px solid var(--color-border)", padding: "20px", borderRadius: "var(--radius-md)" }}>
                <div style={{ color: "var(--color-text-secondary)", fontSize: "0.8rem", marginBottom: "6px" }}>Subscription Tier</div>
                <div style={{ fontSize: "1.25rem", fontWeight: 700, color: "var(--color-primary)" }}>Enterprise Team</div>
                <div style={{ fontSize: "0.85rem", color: "var(--color-text-muted)", marginTop: "4px" }}>Unlimited seats and sync queues</div>
              </div>
            </div>

            <div style={{ padding: "20px", border: "1px solid rgba(94, 107, 255, 0.2)", borderRadius: "var(--radius-md)", background: "rgba(94, 107, 255, 0.05)", marginBottom: "24px" }}>
              <h3 style={{ fontSize: "1rem", fontWeight: 600, marginBottom: "12px" }}>Workspace Usage Quota</h3>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.85rem", marginBottom: "6px" }}>
                <span>Neon PostgreSQL Queries</span>
                <span style={{ fontWeight: 600 }}>1,204 / 50,000 / month</span>
              </div>
              <div style={{ height: "6px", background: "rgba(255,255,255,0.05)", borderRadius: "3px", overflow: "hidden", marginBottom: "16px" }}>
                <div style={{ width: "2.4%", height: "100%", background: "var(--color-primary)" }} />
              </div>

              <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.85rem", marginBottom: "6px" }}>
                <span>Google Drive File storage</span>
                <span style={{ fontWeight: 600 }}>2 files / 1,000 max</span>
              </div>
              <div style={{ height: "6px", background: "rgba(255,255,255,0.05)", borderRadius: "3px", overflow: "hidden" }}>
                <div style={{ width: "0.2%", height: "100%", background: "var(--color-accent)" }} />
              </div>
            </div>

            <button 
              onClick={() => alert("Simulated: Navigating to Stripe billing portal.")}
              style={{
                background: "transparent",
                color: "#FFF",
                border: "1px solid var(--color-border)",
                padding: "12px 24px",
                borderRadius: "var(--radius-xs)",
                fontWeight: 600,
                cursor: "pointer",
                transition: "background var(--transition-normal)"
              }}
            >
              Configure Payment Details
            </button>
          </section>
        )}
      </main>
    </div>
  );
}
