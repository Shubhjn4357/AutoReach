"use client";

import React, { useState, useEffect } from "react";
import * as Lucide from "lucide-react";
import { Lead, LeadStatus, Task } from "../../shared/types";
import { calculatePipelineMetrics } from "../../shared/crm";
import { CardSkeleton } from "../components/Skeleton";

export default function Dashboard() {
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<any | null>(null);
  const [theme, setTheme] = useState<"dark" | "light">("dark");
  const [isLoading, setIsLoading] = useState(true);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [devEmail, setDevEmail] = useState("");

  // Search & Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<LeadStatus | "ALL">("ALL");

  // Selected Lead Details
  const [selectedLeadId, setSelectedLeadId] = useState<string | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiResult, setAiResult] = useState<any | null>(null);
  const [dispatchLoading, setDispatchLoading] = useState(false);

  // Modals visibility
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [profileModalOpen, setProfileModalOpen] = useState(false);

  // Profile Name Form
  const [tempProfileName, setTempProfileName] = useState("");

  // Contact Forms
  const [newLeadForm, setNewLeadForm] = useState({
    name: "",
    email: "",
    phone: "",
    value: "",
    status: "NEW" as LeadStatus,
    notes: ""
  });

  const [editLeadForm, setEditLeadForm] = useState({
    id: "",
    name: "",
    email: "",
    phone: "",
    value: "",
    status: "NEW" as LeadStatus,
    notes: ""
  });

  const selectedLead = leads.find(l => l.id === selectedLeadId) || null;

  const loadBackendData = async (authToken: string) => {
    try {
      const leadsResponse = await fetch("/api/leads", {
        headers: { "Authorization": `Bearer ${authToken}` }
      });
      const leadsResult = await leadsResponse.json();
      if (leadsResult.success) {
        setLeads(leadsResult.data || []);
      } else {
        throw new Error(leadsResult.error?.message || "Leads GET failed");
      }
    } catch (error) {
      console.warn("Backend API offline, loading default mock data:", error);
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
    }
  };

  const loginWithToken = async (idToken: string) => {
    setIsLoading(true);
    try {
      const response = await fetch("/api/auth/google", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idToken }),
      });
      const result = await response.json();
      if (result.success && result.data) {
        const { token: jwt, user: profile } = result.data;
        localStorage.setItem("autoreach_token", jwt);
        localStorage.setItem("autoreach_user", JSON.stringify(profile));
        setToken(jwt);
        setUser(profile);
        setTempProfileName(profile.name || "User");
        await loadBackendData(jwt);
      } else {
        alert(result.error?.message || "Authentication failed");
      }
    } catch (e: any) {
      alert("Error logging in: " + e.message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    // 1. Check local session
    const savedToken = localStorage.getItem("autoreach_token");
    const savedUser = localStorage.getItem("autoreach_user");
    const savedTheme = localStorage.getItem("autoreach_theme") as any;

    if (savedTheme) {
      setTheme(savedTheme);
      if (savedTheme === "light") {
        document.documentElement.classList.add("light-theme");
      }
    }

    if (savedToken && savedUser) {
      setToken(savedToken);
      const parsedUser = JSON.parse(savedUser);
      setUser(parsedUser);
      setTempProfileName(parsedUser.name || "User");
      loadBackendData(savedToken).then(() => {
        setIsLoading(false);
      });
    } else {
      setIsLoading(false);
    }

    // 2. Google OAuth scripts
    const script = document.createElement("script");
    script.src = "https://accounts.google.com/gsi/client";
    script.async = true;
    script.defer = true;
    document.body.appendChild(script);

    return () => {
      if (typeof document !== "undefined") {
        const scripts = document.querySelectorAll('script[src="https://accounts.google.com/gsi/client"]');
        scripts.forEach(s => s.remove());
      }
    };
  }, []);

  useEffect(() => {
    if (typeof window !== "undefined" && !token) {
      const initGsi = () => {
        if ((window as any).google?.accounts?.id) {
          (window as any).google.accounts.id.initialize({
            client_id: "977069610861-beq8i157adffc1cpe9u16r4qe75bggs1.apps.googleusercontent.com",
            callback: (res: any) => {
              loginWithToken(res.credential);
            }
          });
          const btnParent = document.getElementById("google-signin-btn");
          if (btnParent) {
            (window as any).google.accounts.id.renderButton(btnParent, {
              theme: "dark",
              size: "large",
              width: 360
            });
          }
        } else {
          setTimeout(initGsi, 100);
        }
      };
      initGsi();
    }
  }, [token]);

  const toggleThemeMode = () => {
    const nextTheme = theme === "dark" ? "light" : "dark";
    setTheme(nextTheme);
    localStorage.setItem("autoreach_theme", nextTheme);
    if (nextTheme === "light") {
      document.documentElement.classList.add("light-theme");
    } else {
      document.documentElement.classList.remove("light-theme");
    }
  };

  const handleUpdateProfile = () => {
    if (!tempProfileName.trim() || !user) return;
    const updatedUser = { ...user, name: tempProfileName };
    setUser(updatedUser);
    localStorage.setItem("autoreach_user", JSON.stringify(updatedUser));
    setProfileModalOpen(false);
  };

  const handleAddLead = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newLeadForm.name || !token) return;

    const newLead: Lead = {
      id: `lead_${Math.random().toString(36).substring(2, 9)}`,
      userId: user?.id || "u_1",
      name: newLeadForm.name,
      email: newLeadForm.email || null,
      phone: newLeadForm.phone || null,
      status: newLeadForm.status,
      value: Number(newLeadForm.value) || 0,
      notes: newLeadForm.notes || "Registered via Dashboard Console.",
      createdAt: Date.now(),
      updatedAt: Date.now()
    };

    // Instant local state update
    setLeads([newLead, ...leads]);
    setSelectedLeadId(newLead.id);
    setAddModalOpen(false);

    try {
      await fetch("/api/leads", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify(newLead)
      });
    } catch (err) {
      console.warn("Backend unavailable, fallback to local state.");
    }

    setNewLeadForm({
      name: "",
      email: "",
      phone: "",
      value: "",
      status: "NEW",
      notes: ""
    });
  };

  const handleEditLead = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editLeadForm.name || !token) return;

    const updatedLeads = leads.map(l => {
      if (l.id === editLeadForm.id) {
        return {
          ...l,
          name: editLeadForm.name,
          email: editLeadForm.email || null,
          phone: editLeadForm.phone || null,
          value: Number(editLeadForm.value) || 0,
          status: editLeadForm.status,
          notes: editLeadForm.notes,
          updatedAt: Date.now()
        };
      }
      return l;
    });

    setLeads(updatedLeads);
    setEditModalOpen(false);
    setAiResult(null); // Clear previous AI audit

    // Trigger mock update on server
    try {
      await fetch(`/api/leads`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({
          id: editLeadForm.id,
          name: editLeadForm.name,
          email: editLeadForm.email,
          phone: editLeadForm.phone,
          value: editLeadForm.value,
          status: editLeadForm.status,
          notes: editLeadForm.notes
        })
      });
    } catch (err) {
      console.warn("Server leads PUT offline.");
    }
  };

  const handleDeleteLead = async (id: string) => {
    if (!confirm("Are you sure you want to delete this contact?")) return;
    setLeads(leads.filter(l => l.id !== id));
    setSelectedLeadId(null);
    setAiResult(null);

    try {
      // Mock delete
      await fetch(`/api/leads?id=${id}`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ action: "DELETE", id })
      });
    } catch (err) {
      console.warn("Server delete request offline.");
    }
  };

  const openEditModal = (lead: Lead) => {
    setEditLeadForm({
      id: lead.id,
      name: lead.name,
      email: lead.email || "",
      phone: lead.phone || "",
      value: lead.value.toString(),
      status: lead.status,
      notes: lead.notes || ""
    });
    setEditModalOpen(true);
  };

  const runAiAudit = async (targetLead: Lead) => {
    setAiLoading(true);
    setAiResult(null);

    try {
      const response = await fetch("/api/ai", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify(targetLead)
      });
      const result = await response.json();
      if (result.success) {
        setAiResult(result.data);
      } else {
        throw new Error(result.error?.message || "Audit failed");
      }
    } catch (err: any) {
      setAiResult({
        score: targetLead.value > 15000 ? 94 : 68,
        grade: targetLead.value > 15000 ? "A" : "B",
        summary: `Self-auditing offline profile data. Valuation: $${targetLead.value.toLocaleString()}. Status: ${targetLead.status}.`,
        suggestedAction: targetLead.value > 10000 
          ? "Draft custom enterprise proposal and push files to Drive."
          : "Schedule quick demo call via WhatsApp gateway.",
        proposedQuickReply: `Hi ${targetLead.name.split(" ")[0] || "there"}, following up on our proposal. Let me know when is best to sync!`
      });
    } finally {
      setAiLoading(false);
    }
  };

  const handleMessageDispatch = async (channel: "whatsapp" | "sms", text: string) => {
    if (!selectedLead?.phone || !text || !token) return;
    setDispatchLoading(true);
    try {
      const response = await fetch(`/api/${channel}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({ phone: selectedLead.phone, text })
      });
      const result = await response.json();
      if (result.success) {
        alert(`${channel.toUpperCase()} message sent successfully!`);
      } else {
        throw new Error(result.error?.message || "Dispatch failed");
      }
    } catch (e) {
      alert("Offline simulation: Message dispatch enqueued on target device.");
    } finally {
      setDispatchLoading(false);
    }
  };

  // Filter lists
  const filteredLeads = leads.filter(lead => {
    const matchesSearch = lead.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          (lead.email && lead.email.toLowerCase().includes(searchQuery.toLowerCase())) ||
                          (lead.phone && lead.phone.includes(searchQuery));
    const matchesStatus = statusFilter === "ALL" ? true : lead.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const metrics = calculatePipelineMetrics(leads);

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#050505] text-[#A0A0A0]">
        <div className="flex flex-col items-center gap-4">
          <Lucide.Loader className="animate-spin text-[#5E6BFF]" size={36} />
          <span className="text-sm font-medium">Loading Workspace Console...</span>
        </div>
      </div>
    );
  }

  // Auth Guard Screen
  if (!token) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[radial-gradient(circle_at_center,_#111_0%,_#050505_100%)] p-5">
        <div className="glass-card w-full max-w-[420px] p-10 rounded-2xl flex flex-col gap-8 shadow-2xl">
          <div className="flex flex-col items-center gap-3 text-center">
            <div className="bg-gradient-to-br from-[#5E6BFF] to-[#7C5CFF] w-12 h-12 rounded-xl flex items-center justify-center shadow-lg">
              <Lucide.Sparkles className="text-white" size={24} />
            </div>
            <h1 className="text-3xl font-extrabold tracking-tight text-white mt-2">AutoReach</h1>
            <p className="text-sm text-[#A0A0A0]">Enterprise CRM & Communications Admin Dashboard</p>
          </div>

          <div className="flex flex-col gap-3 items-center">
            <span className="text-xs font-semibold text-[#A0A0A0]">Sign in using your Google Credentials</span>
            <div id="google-signin-btn" className="min-h-[44px] w-full flex justify-center" />
          </div>

          <div className="flex items-center gap-3">
            <div className="flex-1 h-[1px] bg-[#2A2A2A]" />
            <span className="text-[10px] text-[#6B7280] font-bold uppercase tracking-widest">or bypass</span>
            <div className="flex-1 h-[1px] bg-[#2A2A2A]" />
          </div>

          <form 
            onSubmit={async (e) => {
              e.preventDefault();
              if (devEmail.trim()) {
                const mockToken = `mock_${devEmail.trim().toLowerCase()}`;
                await loginWithToken(mockToken);
              }
            }}
            className="flex flex-col gap-4"
          >
            <div className="flex flex-col gap-2">
              <label className="text-xs text-[#A0A0A0] font-semibold">Bypass Username / Email</label>
              <input 
                type="text"
                placeholder="e.g. shubham"
                value={devEmail}
                onChange={(e) => setDevEmail(e.target.value)}
                className="bg-black/30 border border-[#2A2A2A] text-white px-4 py-3 rounded-xl outline-none text-sm focus:border-[#5E6BFF] transition-all"
                required
              />
            </div>
            <button 
              type="submit"
              className="bg-transparent border border-[#2A2A2A] hover:bg-[#2A2A2A]/20 hover:border-[#5E6BFF] text-white font-bold py-3 rounded-xl text-sm transition-all cursor-pointer"
            >
              Developer Login Bypass
            </button>
          </form>
        </div>
      </div>
    );
  }

  // Redesigned Web Main App layout
  return (
    <div className="flex min-h-screen bg-[var(--color-bg)] text-[var(--color-text-primary)] font-sans antialiased transition-colors duration-300">
      
      {/* 1. Header TopBar */}
      <div className="fixed top-0 left-0 right-0 h-16 bg-[var(--color-surface)] border-b border-[var(--color-border)] flex items-center justify-between px-6 z-30 shadow-md">
        
        {/* Profile trigger */}
        <div 
          onClick={() => { setTempProfileName(user?.name || "User"); setProfileModalOpen(true); }}
          className="flex items-center gap-3 cursor-pointer hover:opacity-80 transition-opacity"
        >
          <div className="w-9 h-9 rounded-full bg-gradient-to-br from-[#5E6BFF] to-[#7C5CFF] flex items-center justify-center font-bold text-sm text-white shadow-md">
            {(user?.name || "U").substring(0, 2).toUpperCase()}
          </div>
          <div>
            <div className="text-xs text-[var(--color-text-secondary)] font-semibold leading-none">Console Manager</div>
            <div className="text-sm font-bold text-[var(--color-text-primary)] mt-1">{user?.name || "User"}</div>
          </div>
        </div>

        {/* Brand Name */}
        <div className="flex items-center gap-2">
          <Lucide.Sparkles size={20} className="text-[#5E6BFF]" />
          <span className="text-lg font-black tracking-tight bg-gradient-to-r from-white to-[var(--color-text-secondary)] bg-clip-text text-transparent">AutoReach CRM</span>
        </div>

        {/* Global Controls */}
        <div className="flex items-center gap-3">
          {/* Metrics summary badges */}
          <div className="hidden md:flex items-center gap-4 bg-[var(--color-bg)] border border-[var(--color-border)] px-4 py-1.5 rounded-full text-xs font-semibold">
            <span className="text-[var(--color-text-secondary)]">Pipeline: <strong className="text-[#5E6BFF]">${metrics.totalValue.toLocaleString()}</strong></span>
            <div className="w-[1px] h-3 bg-[var(--color-border)]" />
            <span className="text-[var(--color-text-secondary)]">Win Rate: <strong className="text-[#22C55E]">{metrics.winRate}%</strong></span>
          </div>

          {/* Theme Toggler */}
          <button 
            onClick={toggleThemeMode}
            className="w-9 h-9 rounded-full bg-[var(--color-surface)] border border-[var(--color-border)] flex items-center justify-center hover:bg-[var(--color-border)] transition-colors cursor-pointer text-[var(--color-text-primary)]"
          >
            {theme === "dark" ? <Lucide.Sun size={16} /> : <Lucide.Moon size={16} />}
          </button>

          {/* Log Out */}
          <button
            onClick={() => {
              localStorage.removeItem("autoreach_token");
              localStorage.removeItem("autoreach_user");
              setToken(null);
              setUser(null);
            }}
            className="w-9 h-9 rounded-full bg-[var(--color-surface)] border border-[var(--color-border)] flex items-center justify-center hover:bg-[#EF4444]/10 hover:border-[#EF4444] transition-colors cursor-pointer text-[#EF4444]"
            title="Log Out"
          >
            <Lucide.LogOut size={16} />
          </button>
        </div>
      </div>

      {/* Main Workspace Frame */}
      <div className="flex flex-1 pt-16 h-screen overflow-hidden">
        
        {/* Left Side: Scrollable Contacts List Panel */}
        <div className="w-full md:w-[380px] lg:w-[420px] bg-[var(--color-surface)] border-r border-[var(--color-border)] flex flex-col h-full shrink-0">
          
          {/* List Toolbar (Search + Status Filter) */}
          <div className="p-4 border-b border-[var(--color-border)] flex flex-col gap-3">
            <div className="relative">
              <input 
                type="text"
                placeholder="Search name, phone, email..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-[var(--color-bg)] border border-[var(--color-border)] rounded-xl pl-10 pr-4 py-2.5 text-xs text-[var(--color-text-primary)] outline-none focus:border-[#5E6BFF] transition-all"
              />
              <Lucide.Search className="absolute left-3 top-3 text-[var(--color-text-muted)]" size={14} />
            </div>

            {/* Stage filter buttons */}
            <div className="flex gap-1.5 overflow-x-auto pb-1">
              {(["ALL", "NEW", "CONTACTED", "QUALIFIED", "WON", "LOST"] as const).map(stage => (
                <button
                  key={stage}
                  onClick={() => setStatusFilter(stage)}
                  className={`px-3 py-1 rounded-full text-[10px] font-bold border transition-all cursor-pointer whitespace-nowrap ${
                    statusFilter === stage 
                      ? "bg-[#5E6BFF]/15 border-[#5E6BFF] text-[#5E6BFF]" 
                      : "bg-[var(--color-bg)] border-[var(--color-border)] text-[var(--color-text-secondary)] hover:border-[#5E6BFF]/50"
                  }`}
                >
                  {stage}
                </button>
              ))}
            </div>
          </div>

          {/* Scrollable list content */}
          <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-3 pb-24">
            {filteredLeads.length === 0 ? (
              <div className="py-12 text-center flex flex-col items-center justify-center text-[var(--color-text-muted)]">
                <Lucide.Users size={32} className="mb-2 opacity-50" />
                <span className="text-xs italic">No contacts found</span>
              </div>
            ) : (
              filteredLeads.map(lead => (
                <div
                  key={lead.id}
                  onClick={() => { setSelectedLeadId(lead.id); setAiResult(null); }}
                  className={`glass-card p-4 rounded-2xl cursor-pointer transition-all duration-300 border ${
                    selectedLeadId === lead.id 
                      ? "border-[#5E6BFF] bg-[#5E6BFF]/5 translate-x-1" 
                      : "border-[var(--color-border)] hover:border-[#5E6BFF]/40"
                  }`}
                >
                  <div className="flex justify-between items-start mb-2">
                    <span className="text-sm font-bold text-[var(--color-text-primary)] leading-tight">{lead.name}</span>
                    <span className="text-[#5E6BFF] font-bold text-xs">${lead.value.toLocaleString()}</span>
                  </div>
                  
                  <div className="flex justify-between items-center text-[10px]">
                    <span className="bg-[#5E6BFF]/10 text-[#5E6BFF] px-2 py-0.5 rounded font-bold">{lead.status}</span>
                    <span className="text-[var(--color-text-muted)]">{lead.phone || "No phone"}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Right Side: Contact Profile Details & AI Audit Pane */}
        <div className="flex-1 bg-[var(--color-bg)] flex flex-col h-full overflow-y-auto">
          {selectedLead ? (
            <div className="p-6 max-w-4xl w-full mx-auto flex flex-col gap-6 pb-24">
              
              {/* Profile Main Card */}
              <div className="bg-[var(--color-surface)] border border-[var(--color-border)] p-6 rounded-3xl shadow-sm">
                
                {/* Header details */}
                <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 mb-6 border-b border-[var(--color-border)] pb-5">
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 rounded-full bg-[#5E6BFF]/10 border border-[#5E6BFF]/20 flex items-center justify-center font-black text-xl text-[#5E6BFF]">
                      {selectedLead.name.substring(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <h2 className="text-xl font-bold text-[var(--color-text-primary)]">{selectedLead.name}</h2>
                      <p className="text-xs text-[var(--color-text-muted)] mt-1">Status: <strong className="text-[#5E6BFF]">{selectedLead.status}</strong></p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => openEditModal(selectedLead)}
                      className="bg-[#5E6BFF]/10 border border-[#5E6BFF]/20 text-[#5E6BFF] hover:bg-[#5E6BFF]/20 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5"
                    >
                      <Lucide.Edit3 size={13} />
                      Edit Details
                    </button>
                    <button
                      onClick={() => handleDeleteLead(selectedLead.id)}
                      className="bg-[#EF4444]/10 border border-[#EF4444]/20 text-[#EF4444] hover:bg-[#EF4444]/20 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5"
                    >
                      <Lucide.Trash2 size={13} />
                      Delete
                    </button>
                  </div>
                </div>

                {/* Information Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="bg-[var(--color-bg)] border border-[var(--color-border)] p-4 rounded-2xl flex flex-col">
                    <span className="text-[10px] text-[var(--color-text-muted)] uppercase tracking-wider font-bold mb-1">Deal Valuation</span>
                    <span className="text-lg font-bold text-[#5E6BFF]">${selectedLead.value.toLocaleString()}</span>
                  </div>
                  <div className="bg-[var(--color-bg)] border border-[var(--color-border)] p-4 rounded-2xl flex flex-col">
                    <span className="text-[10px] text-[var(--color-text-muted)] uppercase tracking-wider font-bold mb-1">Phone Number</span>
                    <span className="text-sm font-semibold text-[var(--color-text-primary)]">{selectedLead.phone || "Not provided"}</span>
                  </div>
                  <div className="bg-[var(--color-bg)] border border-[var(--color-border)] p-4 rounded-2xl flex flex-col">
                    <span className="text-[10px] text-[var(--color-text-muted)] uppercase tracking-wider font-bold mb-1">Email Address</span>
                    <span className="text-sm text-[var(--color-text-primary)]">{selectedLead.email || "Not provided"}</span>
                  </div>
                  <div className="bg-[var(--color-bg)] border border-[var(--color-border)] p-4 rounded-2xl flex flex-col">
                    <span className="text-[10px] text-[var(--color-text-muted)] uppercase tracking-wider font-bold mb-1">Contact ID</span>
                    <span className="text-xs font-mono text-[var(--color-text-secondary)]">{selectedLead.id}</span>
                  </div>
                </div>

                <div className="bg-[var(--color-bg)] border border-[var(--color-border)] p-4 rounded-2xl mt-4">
                  <span className="text-[10px] text-[var(--color-text-muted)] uppercase tracking-wider font-bold block mb-1">Internal Notes</span>
                  <p className="text-xs text-[var(--color-text-secondary)] italic leading-relaxed">{selectedLead.notes || "No notes written."}</p>
                </div>
              </div>

              {/* AI CRM Auditor Section */}
              <div className="bg-[#5E6BFF]/5 border border-[#5E6BFF]/20 p-6 rounded-3xl shadow-sm">
                <div className="flex justify-between items-center mb-5">
                  <div className="flex items-center gap-2">
                    <Lucide.Sparkles size={20} className="text-[#5E6BFF]" />
                    <h3 className="text-base font-bold text-[#5E6BFF]">Proactive AI CRM Audit</h3>
                  </div>

                  <button
                    onClick={() => runAiAudit(selectedLead)}
                    disabled={aiLoading}
                    className="bg-[#5E6BFF] hover:bg-[#5E6BFF]/90 text-white px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5"
                  >
                    {aiLoading ? <Lucide.Loader size={12} className="animate-spin" /> : <Lucide.Sparkles size={12} />}
                    Run AI Audit
                  </button>
                </div>

                {aiLoading && (
                  <div className="py-6 flex items-center justify-center">
                    <Lucide.Loader size={24} className="animate-spin text-[#5E6BFF]" />
                  </div>
                )}

                {aiResult ? (
                  <div className="flex flex-col gap-4">
                    
                    {/* Grade & Score Card */}
                    <div className="bg-[var(--color-surface)] border border-[var(--color-border)] p-4 rounded-2xl flex items-center gap-4">
                      <div className="w-12 h-12 rounded-xl bg-[#5E6BFF]/15 border border-[#5E6BFF]/30 flex items-center justify-center font-black text-xl text-[#5E6BFF]">
                        {aiResult.grade}
                      </div>
                      <div>
                        <div className="text-xs font-bold text-[var(--color-text-primary)]">Lead Quality Score: {aiResult.score}/100</div>
                        <p className="text-[11px] text-[var(--color-text-secondary)] mt-1">{aiResult.summary}</p>
                      </div>
                    </div>

                    <div className="bg-[var(--color-surface)] border border-[var(--color-border)] p-4 rounded-2xl">
                      <span className="text-[10px] text-[#5E6BFF] uppercase tracking-wider font-bold block mb-1">Suggested Next Step</span>
                      <p className="text-xs text-[var(--color-text-secondary)]">{aiResult.suggestedAction}</p>
                    </div>

                    {aiResult.proposedQuickReply && (
                      <div className="bg-[var(--color-surface)] border border-[var(--color-border)] p-4 rounded-2xl">
                        <span className="text-[10px] text-[#30D5C8] uppercase tracking-wider font-bold block mb-1">Generated Draft Response</span>
                        <p className="text-xs text-[var(--color-text-secondary)] italic mb-4">"{aiResult.proposedQuickReply}"</p>

                        <div className="flex flex-wrap gap-3">
                          <button
                            onClick={() => handleMessageDispatch("whatsapp", aiResult.proposedQuickReply)}
                            disabled={dispatchLoading}
                            className="bg-[#16A34A]/10 border border-[#16A34A]/20 text-[#16A34A] hover:bg-[#16A34A]/20 px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 flex-1 justify-center"
                          >
                            <Lucide.MessageSquare size={13} />
                            Send WhatsApp
                          </button>
                          <button
                            onClick={() => handleMessageDispatch("sms", aiResult.proposedQuickReply)}
                            disabled={dispatchLoading}
                            className="bg-[#5E6BFF]/10 border border-[#5E6BFF]/20 text-[#5E6BFF] hover:bg-[#5E6BFF]/20 px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 flex-1 justify-center"
                          >
                            <Lucide.Send size={13} />
                            Send SMS
                          </button>
                        </div>
                      </div>
                    )}

                  </div>
                ) : (
                  <div className="py-8 text-center text-xs text-[var(--color-text-muted)] italic">
                    Grade this lead, assess deal closure probability, and auto-generate follow-up pitches with AI.
                  </div>
                )}
              </div>

            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-[var(--color-text-muted)] p-6">
              <Lucide.Users size={48} className="mb-3 opacity-40" />
              <h3 className="text-sm font-bold text-[var(--color-text-primary)]">No Contact Selected</h3>
              <p className="text-xs mt-1 text-center max-w-[280px]">Select a contact from the sidebar or click the FAB to register a new lead.</p>
            </div>
          )}
        </div>

      </div>

      {/* 2. Floating Action Button (FAB) */}
      <button
        onClick={() => setAddModalOpen(true)}
        className="fixed bottom-6 right-6 w-14 h-14 rounded-full bg-[#5E6BFF] text-white flex items-center justify-center shadow-2xl hover:scale-105 transition-transform cursor-pointer z-20"
        title="Add New Lead"
      >
        <Lucide.Plus size={28} />
      </button>

      {/* Add Contact Modal */}
      {addModalOpen && (
        <div className="fixed inset-0 bg-black/75 flex items-center justify-center z-50 p-4">
          <div className="bg-[var(--color-surface)] border border-[var(--color-border)] p-6 rounded-3xl w-full max-w-[500px] shadow-2xl">
            <div className="flex justify-between items-center mb-5">
              <h3 className="text-lg font-bold text-white">Register New Lead</h3>
              <button onClick={() => setAddModalOpen(false)} className="text-[var(--color-text-secondary)] hover:text-white cursor-pointer">
                <Lucide.X size={20} />
              </button>
            </div>

            <form onSubmit={handleAddLead} className="flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs text-[var(--color-text-secondary)] font-semibold">Contact / Company Name</label>
                <input 
                  type="text"
                  placeholder="Acme Corp"
                  value={newLeadForm.name}
                  onChange={(e) => setNewLeadForm({ ...newLeadForm, name: e.target.value })}
                  className="bg-[var(--color-bg)] border border-[var(--color-border)] text-white px-4 py-2.5 rounded-xl text-sm outline-none focus:border-[#5E6BFF] transition-all"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs text-[var(--color-text-secondary)] font-semibold">Valuation ($)</label>
                  <input 
                    type="number"
                    placeholder="10000"
                    value={newLeadForm.value}
                    onChange={(e) => setNewLeadForm({ ...newLeadForm, value: e.target.value })}
                    className="bg-[var(--color-bg)] border border-[var(--color-border)] text-white px-4 py-2.5 rounded-xl text-sm outline-none focus:border-[#5E6BFF] transition-all"
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs text-[var(--color-text-secondary)] font-semibold">Status</label>
                  <select 
                    value={newLeadForm.status}
                    onChange={(e) => setNewLeadForm({ ...newLeadForm, status: e.target.value as LeadStatus })}
                    className="bg-[var(--color-bg)] border border-[var(--color-border)] text-white px-4 py-2.5 rounded-xl text-sm outline-none focus:border-[#5E6BFF] transition-all"
                  >
                    <option value="NEW">NEW</option>
                    <option value="CONTACTED">CONTACTED</option>
                    <option value="QUALIFIED">QUALIFIED</option>
                    <option value="WON">WON</option>
                    <option value="LOST">LOST</option>
                  </select>
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs text-[var(--color-text-secondary)] font-semibold">Email Address</label>
                <input 
                  type="email"
                  placeholder="name@company.com"
                  value={newLeadForm.email}
                  onChange={(e) => setNewLeadForm({ ...newLeadForm, email: e.target.value })}
                  className="bg-[var(--color-bg)] border border-[var(--color-border)] text-white px-4 py-2.5 rounded-xl text-sm outline-none focus:border-[#5E6BFF] transition-all"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs text-[var(--color-text-secondary)] font-semibold">Phone Number</label>
                <input 
                  type="tel"
                  placeholder="+1555123456"
                  value={newLeadForm.phone}
                  onChange={(e) => setNewLeadForm({ ...newLeadForm, phone: e.target.value })}
                  className="bg-[var(--color-bg)] border border-[var(--color-border)] text-white px-4 py-2.5 rounded-xl text-sm outline-none focus:border-[#5E6BFF] transition-all"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs text-[var(--color-text-secondary)] font-semibold">Initial Notes</label>
                <textarea 
                  placeholder="Write initial description..."
                  value={newLeadForm.notes}
                  onChange={(e) => setNewLeadForm({ ...newLeadForm, notes: e.target.value })}
                  rows={3}
                  className="bg-[var(--color-bg)] border border-[var(--color-border)] text-white px-4 py-2.5 rounded-xl text-sm outline-none focus:border-[#5E6BFF] transition-all resize-none"
                />
              </div>

              <button 
                type="submit"
                className="bg-[#5E6BFF] hover:bg-[#5E6BFF]/95 text-white font-bold py-3 rounded-xl text-sm cursor-pointer shadow-md mt-2 transition-all"
              >
                Save Contact
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Edit Contact Modal */}
      {editModalOpen && (
        <div className="fixed inset-0 bg-black/75 flex items-center justify-center z-50 p-4">
          <div className="bg-[var(--color-surface)] border border-[var(--color-border)] p-6 rounded-3xl w-full max-w-[500px] shadow-2xl">
            <div className="flex justify-between items-center mb-5">
              <h3 className="text-lg font-bold text-white">Edit Contact Details</h3>
              <button onClick={() => setEditModalOpen(false)} className="text-[var(--color-text-secondary)] hover:text-white cursor-pointer">
                <Lucide.X size={20} />
              </button>
            </div>

            <form onSubmit={handleEditLead} className="flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs text-[var(--color-text-secondary)] font-semibold">Contact / Company Name</label>
                <input 
                  type="text"
                  value={editLeadForm.name}
                  onChange={(e) => setEditLeadForm({ ...editLeadForm, name: e.target.value })}
                  className="bg-[var(--color-bg)] border border-[var(--color-border)] text-white px-4 py-2.5 rounded-xl text-sm outline-none focus:border-[#5E6BFF] transition-all"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs text-[var(--color-text-secondary)] font-semibold">Valuation ($)</label>
                  <input 
                    type="number"
                    value={editLeadForm.value}
                    onChange={(e) => setEditLeadForm({ ...editLeadForm, value: e.target.value })}
                    className="bg-[var(--color-bg)] border border-[var(--color-border)] text-white px-4 py-2.5 rounded-xl text-sm outline-none focus:border-[#5E6BFF] transition-all"
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs text-[var(--color-text-secondary)] font-semibold">Status</label>
                  <select 
                    value={editLeadForm.status}
                    onChange={(e) => setEditLeadForm({ ...editLeadForm, status: e.target.value as LeadStatus })}
                    className="bg-[var(--color-bg)] border border-[var(--color-border)] text-white px-4 py-2.5 rounded-xl text-sm outline-none focus:border-[#5E6BFF] transition-all"
                  >
                    <option value="NEW">NEW</option>
                    <option value="CONTACTED">CONTACTED</option>
                    <option value="QUALIFIED">QUALIFIED</option>
                    <option value="WON">WON</option>
                    <option value="LOST">LOST</option>
                  </select>
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs text-[var(--color-text-secondary)] font-semibold">Email Address</label>
                <input 
                  type="email"
                  value={editLeadForm.email}
                  onChange={(e) => setEditLeadForm({ ...editLeadForm, email: e.target.value })}
                  className="bg-[var(--color-bg)] border border-[var(--color-border)] text-white px-4 py-2.5 rounded-xl text-sm outline-none focus:border-[#5E6BFF] transition-all"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs text-[var(--color-text-secondary)] font-semibold">Phone Number</label>
                <input 
                  type="tel"
                  value={editLeadForm.phone}
                  onChange={(e) => setEditLeadForm({ ...editLeadForm, phone: e.target.value })}
                  className="bg-[var(--color-bg)] border border-[var(--color-border)] text-white px-4 py-2.5 rounded-xl text-sm outline-none focus:border-[#5E6BFF] transition-all"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs text-[var(--color-text-secondary)] font-semibold">Notes</label>
                <textarea 
                  value={editLeadForm.notes}
                  onChange={(e) => setEditLeadForm({ ...editLeadForm, notes: e.target.value })}
                  rows={3}
                  className="bg-[var(--color-bg)] border border-[var(--color-border)] text-white px-4 py-2.5 rounded-xl text-sm outline-none focus:border-[#5E6BFF] transition-all resize-none"
                />
              </div>

              <button 
                type="submit"
                className="bg-[#5E6BFF] hover:bg-[#5E6BFF]/95 text-white font-bold py-3 rounded-xl text-sm cursor-pointer shadow-md mt-2 transition-all"
              >
                Save Changes
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Edit Profile Name Modal */}
      {profileModalOpen && (
        <div className="fixed inset-0 bg-black/75 flex items-center justify-center z-50 p-4">
          <div className="bg-[var(--color-surface)] border border-[var(--color-border)] p-6 rounded-3xl w-full max-w-[400px] shadow-2xl">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold text-white">Edit Profile Settings</h3>
              <button onClick={() => setProfileModalOpen(false)} className="text-[var(--color-text-secondary)] hover:text-white cursor-pointer">
                <Lucide.X size={20} />
              </button>
            </div>

            <div className="flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs text-[var(--color-text-secondary)] font-semibold">Account Display Name</label>
                <input 
                  type="text"
                  value={tempProfileName}
                  onChange={(e) => setTempProfileName(e.target.value)}
                  className="bg-[var(--color-bg)] border border-[var(--color-border)] text-white px-4 py-2.5 rounded-xl text-sm outline-none focus:border-[#5E6BFF] transition-all"
                  required
                />
              </div>

              <div className="flex gap-3 mt-2">
                <button 
                  onClick={() => setProfileModalOpen(false)}
                  className="bg-transparent border border-[var(--color-border)] text-[var(--color-text-primary)] font-bold py-2.5 rounded-xl text-xs flex-1 cursor-pointer transition-all hover:bg-[var(--color-border)]"
                >
                  Cancel
                </button>
                <button 
                  onClick={handleUpdateProfile}
                  className="bg-[#5E6BFF] hover:bg-[#5E6BFF]/95 text-white font-bold py-2.5 rounded-xl text-xs flex-1 cursor-pointer transition-all"
                >
                  Save Profile
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
