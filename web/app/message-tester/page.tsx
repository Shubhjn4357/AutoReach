"use client";

import { useEffect, useState } from "react";
import api, { getErrorMessage, type SessionSummary } from "@/app/lib/api";
import { Loader2 } from "lucide-react";

export default function MessageTesterPage() {
  const [sessionId, setSessionId] = useState("");
  const [phone, setPhone] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [sessions, setSessions] = useState<SessionSummary[]>([]);

  const loadSessions = async () => {
    try {
      const data = await api.sessions.list();
      setSessions(data);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    loadSessions();
  }, []);

  const handleSend = async () => {
    if (!sessionId || !phone || !message) {
      setStatus("Please fill all fields");
      return;
    }
    setLoading(true);
    setStatus(null);
    try {
      // Attempt to send via API (using the whatsapp service from our new api module)
      const result = await api.whatsapp.send(phone, message);
      setStatus(`Message sent${result.messageId ? `! ID: ${result.messageId}` : "!"}`);
    } catch (err: unknown) {
      setStatus(`Error: ${getErrorMessage(err)}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h1 className="text-lg font-semibold">Message Tester</h1>
      </div>

      <div className="bg-[#0a0a0c] rounded-lg p-4 space-y-3">
        <div>
          <label className="block text-xs font-medium text-white mb-1">Session</label>
          <select
            value={sessionId}
            onChange={(e) => setSessionId(e.target.value)}
            className="w-full px-2 py-1 bg-[#121215] border border-[#22222a] rounded text-xs"
          >
            <option value="">Select a session</option>
            {sessions.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name || s.id}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs font-medium text-white mb-1">Phone Number</label>
          <input
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="+1234567890"
            className="w-full px-2 py-1 bg-[#121215] border border-[#22222a] rounded text-xs"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-white mb-1">Message</label>
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            rows={3}
            placeholder="Type your message..."
            className="w-full px-2 py-1 bg-[#121215] border border-[#22222a] rounded text-xs resize-none"
          />
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={handleSend}
            disabled={loading}
            className="flex-1 px-3 py-1.5 bg-[#30d5c8] text-[#0a0a0c] text-xs font-medium rounded disabled:opacity-50 hover:bg-[#25c1b2]"
          >
            {loading ? "Sending..." : "Send Message"}
          </button>
          {status && (
            <span className="px-2 py-0.5 rounded text-xs">
              {status}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
