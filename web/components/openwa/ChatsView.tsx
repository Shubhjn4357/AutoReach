"use client";

import React, { useEffect, useState } from "react";
import api, { Lead } from "../../app/lib/api";
import { Send, Image, MessageSquare, User, RefreshCw, Paperclip } from "lucide-react";

type ChatSummary = {
  id: string;
  name: string;
  isGroup: boolean;
  unreadCount: number;
  timestamp: number;
  lastMessage: string;
};

type ChatMessage = {
  id: string;
  chatId: string;
  from: string;
  to: string;
  body: string;
  type: string;
  direction: string;
  status: string;
  createdAt: string;
};

export default function ChatsView() {
  const [leadsList, setLeadsList] = useState<Lead[]>([]);
  const [chats, setChats] = useState<ChatSummary[]>([]);
  const [selectedChat, setSelectedChat] = useState<ChatSummary | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState("");
  const [inputImageUrl, setInputImageUrl] = useState("");
  const [showImageInput, setShowImageInput] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loadingMsgs, setLoadingMsgs] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchChatsData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Pull leads and sessions
      const leadsRes = await api.crm.listLeads();
      setLeadsList(leadsRes);
      
      const sessionChats = await api.sessions.getChats("default").catch(() => []);
      setChats(sessionChats);
      
      if (sessionChats.length > 0 && !selectedChat) {
        setSelectedChat(sessionChats[0]);
      }
    } catch (err: any) {
      setError(err.message || "Failed to load chats");
    } finally {
      setLoading(false);
    }
  };

  const fetchMessages = async (chatId: string) => {
    try {
      setLoadingMsgs(true);
      const res = await api.sessions.getMessages("default", chatId);
      setMessages(res.messages || []);
    } catch (err) {
      console.error("Failed to load messages:", err);
    } finally {
      setLoadingMsgs(false);
    }
  };

  useEffect(() => {
    fetchChatsData();
  }, []);

  useEffect(() => {
    if (selectedChat) {
      fetchMessages(selectedChat.id);
      
      // Setup interval to poll new messages
      const interval = setInterval(() => {
        fetchMessages(selectedChat.id);
      }, 5000);
      
      return () => clearInterval(interval);
    }
  }, [selectedChat]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedChat) return;
    if (!inputText.trim() && !inputImageUrl.trim()) return;

    try {
      setError(null);
      if (inputImageUrl.trim()) {
        await api.sessions.sendImage("default", selectedChat.id, inputImageUrl.trim(), inputText.trim());
      } else {
        await api.sessions.sendText("default", selectedChat.id, inputText.trim());
      }
      
      setInputText("");
      setInputImageUrl("");
      setShowImageInput(false);
      
      // Refresh messages
      fetchMessages(selectedChat.id);
    } catch (err: any) {
      setError(err.message || "Failed to dispatch WhatsApp message");
    }
  };

  return (
    <div className="flex h-[calc(100vh-140px)] border border-[var(--color-border)] rounded-[var(--radius-lg)] bg-[var(--color-surface)] overflow-hidden animate-fade-in">
      
      {/* Left panel: Chats list */}
      <div className="w-[320px] border-r border-[var(--color-border)] flex flex-col bg-[var(--color-surface)]">
        <div className="p-4 border-b border-[var(--color-border)] flex items-center justify-between">
          <span className="font-bold text-white text-base">Conversations</span>
          <button
            onClick={fetchChatsData}
            disabled={loading}
            className="p-1.5 rounded-lg hover:bg-white/10 text-[var(--color-text-secondary)] hover:text-white transition-all cursor-pointer"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto divide-y divide-[var(--color-border)]/50">
          {chats.map((chat, idx) => (
            <div
              key={`${chat.id}-${idx}`}
              onClick={() => setSelectedChat(chat)}
              className={`p-4 flex gap-3 hover:bg-white/5 transition-all duration-200 cursor-pointer ${
                selectedChat?.id === chat.id ? "bg-indigo-500/10 border-l-4 border-indigo-500" : ""
              }`}
            >
              <div className="w-10 h-10 rounded-full bg-indigo-500/10 flex items-center justify-center text-indigo-400 border border-indigo-500/20 shrink-0">
                <User className="w-5 h-5" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex justify-between items-baseline">
                  <h4 className="text-sm font-semibold text-white truncate">{chat.name}</h4>
                  <span className="text-[10px] text-[var(--color-text-muted)] shrink-0">
                    {new Date(chat.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                  </span>
                </div>
                <p className="text-xs text-[var(--color-text-secondary)] truncate mt-1">
                  {chat.lastMessage}
                </p>
              </div>
            </div>
          ))}

          {chats.length === 0 && !loading && (
            <div className="p-8 text-center text-xs text-[var(--color-text-muted)]">
              No contacts fetched from the database yet. Make sure nodes are connected.
            </div>
          )}
        </div>
      </div>

      {/* Right panel: Chat messages and input */}
      <div className="flex-1 flex flex-col bg-[var(--color-bg)]">
        {selectedChat ? (
          <>
            {/* Header */}
            <div className="p-4 border-b border-[var(--color-border)] bg-[var(--color-surface)] flex items-center justify-between shadow-sm">
              <div>
                <h3 className="text-sm font-bold text-white">{selectedChat.name}</h3>
                <span className="text-[10px] text-emerald-400 flex items-center gap-1.5 mt-0.5 font-medium">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                  Active session: default
                </span>
              </div>
            </div>

            {/* Messages body */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              {messages.map((msg, idx) => {
                const isMe = msg.direction === "outgoing";
                return (
                  <div key={`${msg.id}-${idx}`} className={`flex ${isMe ? "justify-end" : "justify-start"}`}>
                    <div
                      className={`max-w-[70%] rounded-[var(--radius-lg)] p-4 shadow-sm border ${
                        isMe
                          ? "bg-indigo-600 border-indigo-500 text-white rounded-br-none"
                          : "bg-[var(--color-surface)] border-[var(--color-border)] text-[var(--color-text-primary)] rounded-bl-none"
                      }`}
                    >
                      <p className="text-sm whitespace-pre-wrap leading-relaxed">{msg.body}</p>
                      <div className="mt-2 flex items-center justify-end gap-1.5 text-[9px] opacity-60">
                        <span>
                          {new Date(msg.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                        </span>
                        {isMe && <span className="font-semibold uppercase">{msg.status}</span>}
                      </div>
                    </div>
                  </div>
                );
              })}

              {messages.length === 0 && !loadingMsgs && (
                <div className="text-center py-12 text-sm text-[var(--color-text-muted)]">
                  Start of conversation. Send a message to get started.
                </div>
              )}
            </div>

            {/* Input field */}
            <form onSubmit={handleSendMessage} className="p-4 border-t border-[var(--color-border)] bg-[var(--color-surface)] space-y-3">
              {error && (
                <div className="p-2.5 rounded-[var(--radius-sm)] bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs">
                  {error}
                </div>
              )}

              {showImageInput && (
                <div className="flex gap-2 items-center bg-[var(--color-bg)] border border-[var(--color-border)] rounded-[var(--radius-md)] px-3 py-1.5">
                  <Paperclip className="w-4 h-4 text-[var(--color-text-muted)] shrink-0" />
                  <input
                    type="url"
                    placeholder="Enter Image URL..."
                    value={inputImageUrl}
                    onChange={(e) => setInputImageUrl(e.target.value)}
                    className="w-full bg-transparent border-0 p-0 text-xs text-white placeholder-[var(--color-text-muted)] focus:outline-none focus:ring-0"
                  />
                </div>
              )}

              <div className="flex gap-3 items-center">
                <button
                  type="button"
                  onClick={() => setShowImageInput(!showImageInput)}
                  className={`p-2.5 rounded-lg border transition-all cursor-pointer ${
                    showImageInput || inputImageUrl
                      ? "bg-indigo-500/10 border-indigo-500 text-indigo-400"
                      : "border-[var(--color-border)] text-[var(--color-text-secondary)] hover:text-white"
                  }`}
                  title="Attach Image"
                >
                  <Image className="w-5 h-5" />
                </button>

                <input
                  type="text"
                  placeholder={showImageInput ? "Caption your image..." : "Type your message..."}
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  className="flex-1 bg-[var(--color-bg)] border border-[var(--color-border)] rounded-[var(--radius-md)] px-4 py-2.5 text-sm text-white placeholder-[var(--color-text-muted)] focus:outline-none focus:border-indigo-500 transition-all"
                />

                <button
                  type="submit"
                  className="p-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white transition-all shadow-lg active:scale-95 cursor-pointer shrink-0"
                >
                  <Send className="w-5 h-5" />
                </button>
              </div>
            </form>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-[var(--color-text-secondary)] space-y-3">
            <MessageSquare className="w-12 h-12 text-[var(--color-text-muted)] animate-bounce" />
            <span className="text-sm font-semibold">Select a conversation to start chatting</span>
          </div>
        )}
      </div>
    </div>
  );
}
