"use client";

import React, { useEffect, useState } from "react";
import Sidebar from "../components/Sidebar";
import LeadsView from "../components/LeadsView";
import SettingsView from "../components/SettingsView";
import DashboardView from "../components/openwa/DashboardView";
import SessionsView from "../components/openwa/SessionsView";
import ChatsView from "../components/openwa/ChatsView";
import WebhooksView from "../components/openwa/WebhooksView";
import TemplatesView from "../components/openwa/TemplatesView";
import ApiKeysView from "../components/openwa/ApiKeysView";
import MessageTesterView from "../components/openwa/MessageTesterView";
import InfrastructureView from "../components/openwa/InfrastructureView";
import PluginsView from "../components/openwa/PluginsView";
import LogsView from "../components/openwa/LogsView";
import { AddLeadModal, EditLeadModal } from "../components/Modals";

import api, { Lead, Task } from "./lib/api";
import { LogIn } from "lucide-react";

export default function RootPage() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [apiKeyInput, setApiKeyInput] = useState("");
  const [loginLoading, setLoginLoading] = useState(false);
  const [loginError, setLoginError] = useState("");

  const [activeTab, setActiveTab] = useState<any>("leads");
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [theme, setTheme] = useState<"dark" | "light">("dark");
  const [leads, setLeads] = useState<Lead[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loadingLeads, setLoadingLeads] = useState(false);

  // CRM Search, filters, modals
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<any>("ALL");
  const [selectedLeadId, setSelectedLeadId] = useState<string | null>(null);
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [editModalLead, setEditModalLead] = useState<Lead | null>(null);
  const [editModalOpen, setEditModalOpen] = useState(false);

  // Add lead form state
  const [addForm, setAddForm] = useState({
    name: "",
    email: "",
    phone: "",
    value: "",
    status: "NEW" as any,
    notes: "",
  });

  // Edit lead form state
  const [editForm, setEditForm] = useState({
    id: "",
    name: "",
    email: "",
    phone: "",
    value: "",
    status: "NEW" as any,
    notes: "",
  });

  // AI & Message Dispatch States
  const [aiLoading, setAiLoading] = useState(false);
  const [aiResult, setAiResult] = useState<any>(null);
  const [dispatchLoading, setDispatchLoading] = useState(false);
  const [generateLoading, setGenerateLoading] = useState(false);

  // Profile
  const [profileName, setProfileName] = useState("Console Manager");

  const checkAuth = () => {
    if (typeof window !== "undefined") {
      const savedKey = window.sessionStorage.getItem("autoreach_api_key");
      if (savedKey) {
        setIsAuthenticated(true);
      }
    }
  };

  useEffect(() => {
    checkAuth();
  }, []);

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginLoading(true);
    setLoginError("");
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ apiKey: apiKeyInput }),
      });
      if (!res.ok) throw new Error("Invalid API key");
      if (typeof window !== "undefined") {
        window.sessionStorage.setItem("autoreach_api_key", apiKeyInput);
      }
      setIsAuthenticated(true);
      fetchLeadsAndTasks();
    } catch {
      setLoginError("Invalid API Key");
    } finally {
      setLoginLoading(false);
    }
  };

  const fetchLeadsAndTasks = async () => {
    try {
      setLoadingLeads(true);
      const leadsRes = await api.crm.listLeads();
      setLeads(leadsRes);
      const tasksRes = await api.crm.listTasks();
      setTasks(tasksRes);
    } catch (err) {
      console.error("Failed to load CRM data:", err);
    } finally {
      setLoadingLeads(false);
    }
  };

  useEffect(() => {
    if (isAuthenticated) {
      fetchLeadsAndTasks();
    }
  }, [isAuthenticated]);

  const toggleThemeMode = () => {
    const nextTheme = theme === "dark" ? "light" : "dark";
    setTheme(nextTheme);
    if (typeof document !== "undefined") {
      if (nextTheme === "light") {
        document.documentElement.classList.add("light-theme");
      } else {
        document.documentElement.classList.remove("light-theme");
      }
    }
  };

  const handleLogout = () => {
    if (typeof window !== "undefined") {
      window.sessionStorage.removeItem("autoreach_api_key");
    }
    setIsAuthenticated(false);
    setApiKeyInput("");
  };

  // Leads CRUD
  const handleAddLeadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.crm.createLead({
        name: addForm.name,
        email: addForm.email || null,
        phone: addForm.phone || null,
        status: addForm.status,
        value: Number(addForm.value) || 0,
        notes: addForm.notes || null,
      });
      setAddModalOpen(false);
      setAddForm({ name: "", email: "", phone: "", value: "", status: "NEW", notes: "" });
      fetchLeadsAndTasks();
    } catch (err) {
      alert("Failed to add lead");
    }
  };

  const handleEditLeadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.crm.updateLead(editForm.id, {
        name: editForm.name,
        email: editForm.email || null,
        phone: editForm.phone || null,
        status: editForm.status,
        value: Number(editForm.value) || 0,
        notes: editForm.notes || null,
      });
      setEditModalOpen(false);
      fetchLeadsAndTasks();
    } catch (err) {
      alert("Failed to update lead");
    }
  };

  const handleDeleteLead = async (id: string) => {
    if (!confirm("Are you sure you want to delete this lead?")) return;
    try {
      await api.crm.deleteLead(id);
      fetchLeadsAndTasks();
    } catch (err) {
      alert("Failed to delete lead");
    }
  };

  // AI & Contract & Message Stubs
  const runAiAudit = async (lead: Lead) => {
    setAiLoading(true);
    setTimeout(() => {
      setAiResult({
        score: 85,
        risk: "Low",
        suggestion: `Lead "${lead.name}" exhibits strong buying signals. Recommend active follow-up using the "lead-followup" template.`,
      });
      setAiLoading(false);
    }, 1500);
  };

  const handleMessageDispatch = async (channel: "whatsapp" | "sms", text: string) => {
    if (!selectedLeadId) return;
    const lead = leads.find((l) => l.id === selectedLeadId);
    if (!lead || !lead.phone) {
      alert("Selected lead does not have a valid phone number");
      return;
    }
    setDispatchLoading(true);
    try {
      const cleanPhone = lead.phone.replace(/\D/g, "");
      await api.whatsapp.send(cleanPhone, text);
      alert("WhatsApp message dispatched successfully!");
    } catch (err: any) {
      alert("Error: " + err.message);
    } finally {
      setDispatchLoading(false);
    }
  };

  const handleGenerateContract = async (lead: Lead) => {
    setGenerateLoading(true);
    setTimeout(() => {
      alert(`Contract document generated successfully for ${lead.name}`);
      setGenerateLoading(false);
    }, 1500);
  };

  const handleUpdateProfile = () => {
    alert("Profile display name saved!");
  };

  // Rendering Active View
  const renderView = () => {
    switch (activeTab) {
      case "dashboard":
        return <DashboardView />;
      case "sessions":
        return <SessionsView />;
      case "chats":
        return <ChatsView />;
      case "webhooks":
        return <WebhooksView />;
      case "templates":
        return <TemplatesView />;
      case "api-keys":
        return <ApiKeysView />;
      case "message-tester":
        return <MessageTesterView />;
      case "infrastructure":
        return <InfrastructureView />;
      case "plugins":
        return <PluginsView />;
      case "logs":
        return <LogsView />;
      case "settings":
        return (
          <SettingsView
            tempProfileName={profileName}
            setTempProfileName={setProfileName}
            handleUpdateProfile={handleUpdateProfile}
            theme={theme}
            toggleThemeMode={toggleThemeMode}
            authToken={typeof window !== "undefined" ? window.sessionStorage.getItem("autoreach_api_key") : null}
          />
        );
      case "leads":
      default:
        // Filter leads
        const filteredLeads = leads.filter((lead) => {
          const matchSearch =
            lead.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            (lead.phone && lead.phone.includes(searchQuery)) ||
            (lead.email && lead.email.toLowerCase().includes(searchQuery.toLowerCase()));
          const matchStatus = statusFilter === "ALL" || lead.status === statusFilter;
          return matchSearch && matchStatus;
        });

        // Compute metrics
        const totalValue = filteredLeads.reduce((acc, curr) => acc + (curr.value || 0), 0);
        const winCount = filteredLeads.filter((l) => l.status === "WON").length;
        const winRate = filteredLeads.length > 0 ? (winCount / filteredLeads.length) * 100 : 0;

        return (
          <LeadsView
            leads={filteredLeads}
            metrics={{ totalValue, winRate }}
            driveFiles={[]}
            searchQuery={searchQuery}
            setSearchQuery={setSearchQuery}
            statusFilter={statusFilter}
            setStatusFilter={setStatusFilter}
            selectedLeadId={selectedLeadId}
            setSelectedLeadId={setSelectedLeadId}
            setAddModalOpen={setAddModalOpen}
            openEditModal={(lead) => {
              setEditForm({
                id: lead.id,
                name: lead.name,
                email: lead.email || "",
                phone: lead.phone || "",
                value: String(lead.value || ""),
                status: lead.status as any,
                notes: lead.notes || "",
              });
              setEditModalOpen(true);
            }}
            handleDeleteLead={handleDeleteLead}
            aiLoading={aiLoading}
            aiResult={aiResult}
            setAiResult={setAiResult}
            runAiAudit={runAiAudit}
            dispatchLoading={dispatchLoading}
            handleMessageDispatch={handleMessageDispatch}
            generateLoading={generateLoading}
            handleGenerateContract={handleGenerateContract}
            setActiveTab={setActiveTab}
            user={{ name: profileName }}
          />
        );
    }
  };

  // Render Login page if not authenticated
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0a0a0c]">
        <div className="w-full max-w-sm p-8 bg-[#121215] border border-[var(--color-border)] rounded-xl shadow-2xl space-y-6">
          <div className="flex flex-col items-center gap-2">
            <div className="w-12 h-12 bg-indigo-600 rounded-2xl flex items-center justify-center shadow-lg shadow-indigo-600/30">
              <LogIn className="h-6 w-6 text-white" />
            </div>
            <h2 className="text-2xl font-black tracking-tight text-white mt-2">AutoReach</h2>
            <p className="text-xs text-[var(--color-text-secondary)] text-center">
              Please enter your developer API key to access the control panel.
            </p>
          </div>
          <form onSubmit={handleLoginSubmit} className="space-y-4">
            <input
              type="password"
              value={apiKeyInput}
              onChange={(e) => setApiKeyInput(e.target.value)}
              required
              className="w-full px-4 py-2.5 bg-[#0a0a0c] border border-[#22222a] rounded-[var(--radius-md)] text-sm text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500 transition-all"
              placeholder="Developer API Key"
            />
            <button
              type="submit"
              disabled={loginLoading}
              className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold rounded-[var(--radius-md)] shadow-lg shadow-indigo-600/20 disabled:opacity-50 transition-all cursor-pointer"
            >
              {loginLoading ? "Authenticating..." : "Login"}
            </button>
            {loginError && <p className="text-rose-400 text-xs text-center font-medium">{loginError}</p>}
          </form>
        </div>
      </div>
    );
  }

  // Render main dashboard shell
  return (
    <div className="flex bg-[var(--color-bg)] min-h-screen text-[var(--color-text-primary)] transition-all">
      <Sidebar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        leadsCount={leads.length}
        user={{ name: profileName }}
        theme={theme}
        toggleThemeMode={toggleThemeMode}
        handleLogout={handleLogout}
        isCollapsed={isCollapsed}
        setIsCollapsed={setIsCollapsed}
      />

      <main className="flex-1 overflow-y-auto px-8 py-8">
        {renderView()}
      </main>

      {/* CRM Opportunity Modals */}
      <AddLeadModal
        isOpen={addModalOpen}
        onClose={() => setAddModalOpen(false)}
        onSubmit={handleAddLeadSubmit}
        form={addForm}
        setForm={setAddForm}
      />

      <EditLeadModal
        isOpen={editModalOpen}
        onClose={() => setEditModalOpen(false)}
        onSubmit={handleEditLeadSubmit}
        form={editForm}
        setForm={setEditForm}
      />
    </div>
  );
}
