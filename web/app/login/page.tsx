"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { LogIn } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const [apiKey, setApiKey] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ apiKey }),
      });
      if (!res.ok) throw new Error("Invalid API key");
      if (typeof window !== "undefined") {
        window.sessionStorage.setItem("autoreach_api_key", apiKey);
      }
      router.push("/dashboard");
    } catch {
      setError("Invalid API key");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0a0a0c]">
      <div className="w-full max-w-sm p-8 bg-[#121215] rounded-xl">
        <div className="flex items-center justify-center gap-2 mb-6">
          <LogIn className="h-5 w-5 text-[#30d5c8]" />
          <h2 className="text-xl font-semibold">AutoReach</h2>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            type="password"
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            required
            className="w-full px-3 py-2 bg-[#0a0a0c] border border-[#22222a] rounded text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-[#30d5c8]"
            placeholder="API Key"
          />
          <button
            type="submit"
            disabled={loading}
            className="w-full py-2 bg-[#30d5c8] text-[#0a0a0c] text-sm font-medium rounded disabled:opacity-50"
          >
            {loading ? "..." : "Login"}
          </button>
          {error && <p className="text-red-400 text-xs">{error}</p>}
        </form>
      </div>
    </div>
  );
}
