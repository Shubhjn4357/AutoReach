"use client";
import { useEffect, useState } from "react";
import api, { type SessionStats } from "@/app/lib/api";
import { Activity, Smartphone, Webhook, Key } from "lucide-react";

export default function DashboardPage() {
  const [stats, setStats] = useState<SessionStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.sessions.stats().then(setStats).catch(() => {}).finally(() => setLoading(false));
  }, []);

  const cards = [
    { label: "Sessions", value: stats?.total ?? "-", icon: Smartphone, color: "text-[#30d5c8]" },
    { label: "Active", value: stats?.active ?? "-", icon: Activity, color: "text-green-400" },
    { label: "Webhooks", value: "-", icon: Webhook, color: "text-amber-400" },
    { label: "API Keys", value: "-", icon: Key, color: "text-purple-400" },
  ];

  return (
    <div className="space-y-4">
      <h1 className="text-lg font-semibold">Dashboard</h1>
      {loading ? (
        <p className="text-sm text-gray-500">Loading...</p>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {cards.map(({ label, value, icon: Icon, color }) => (
            <div key={label} className="bg-[#121215] rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <Icon className={`h-4 w-4 ${color}`} />
                <span className="text-xs text-gray-400">{label}</span>
              </div>
              <p className="text-2xl font-bold">{value}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
