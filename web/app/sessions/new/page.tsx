"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import api, { getErrorMessage } from "@/app/lib/api";

export default function NewSessionPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setLoading(true);
    try {
      await api.sessions.create(name);
      router.push("/sessions");
    } catch (e: unknown) {
      alert(getErrorMessage(e));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto space-y-4">
      <h1 className="text-lg font-semibold">New Session</h1>
      <form onSubmit={handleCreate} className="space-y-3">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Session name"
          className="w-full px-3 py-2 bg-[#0a0a0c] border border-[#22222a] rounded text-sm text-white focus:outline-none focus:ring-1 focus:ring-[#30d5c8]"
          required
        />
        <button type="submit" disabled={loading}
          className="px-4 py-2 bg-[#30d5c8] text-[#0a0a0c] text-sm font-medium rounded disabled:opacity-50">
          {loading ? "Creating..." : "Create"}
        </button>
      </form>
    </div>
  );
}
