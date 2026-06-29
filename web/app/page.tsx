"use client";

import React, { useEffect, useState } from "react";
import Sidebar from "../components/Sidebar";
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

import { LogIn } from "lucide-react";

export default function RootPage() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [apiKeyInput, setApiKeyInput] = useState("");
  const [loginLoading, setLoginLoading] = useState(false);
  const [loginError, setLoginError] = useState("");

  const [activeTab, setActiveTab] = useState<
    | "leads"
    | "dashboard"
    | "sessions"
    | "chats"
    | "webhooks"
    | "templates"
    | "api-keys"
    | "message-tester"
    | "infrastructure"
    | "plugins"
    | "logs"
    | "settings"
  >("dashboard");
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [theme, setTheme] = useState<"dark" | "light">("dark");
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
    } catch {
      setLoginError("Invalid API Key");
    } finally {
      setLoginLoading(false);
    }
  };



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
          />
        );
      case "leads":
      default:
        return <DashboardView />;
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


    </div>
  );
}
