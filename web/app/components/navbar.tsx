"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { LayoutDashboard, Smartphone, Webhook, Key, FileText, LogOut, Server, Puzzle, Send, ClipboardList } from "lucide-react";

const NAV = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/sessions", label: "Sessions", icon: Smartphone },
  { href: "/message-tester", label: "Messages", icon: Send },
  { href: "/webhooks", label: "Webhooks", icon: Webhook },
  { href: "/templates", label: "Templates", icon: FileText },
  { href: "/api-keys", label: "API Keys", icon: Key },
  { href: "/logs", label: "Logs", icon: ClipboardList },
  { href: "/infrastructure", label: "Infra", icon: Server },
  { href: "/plugins", label: "Plugins", icon: Puzzle },
];

export default function Navbar() {
  const pathname = usePathname();
  const router = useRouter();

  const handleLogout = () => {
    if (typeof window !== "undefined") window.sessionStorage.removeItem("autoreach_api_key");
    router.push("/login");
  };

  return (
    <nav className="border-b border-[#22222a] bg-[#0a0a0c]">
      <div className="container mx-auto flex items-center justify-between h-12 px-4">
        <div className="flex items-center gap-1 overflow-x-auto">
          <Link href="/dashboard" className="text-sm font-bold text-[#30d5c8] mr-3 whitespace-nowrap">
            AutoReach
          </Link>
          {NAV.map(({ href, label, icon: Icon }) => {
            const active = pathname === href || pathname.startsWith(href + "/");
            return (
              <Link
                key={href}
                href={href}
                className={`flex items-center gap-1 px-2 py-1 text-xs rounded whitespace-nowrap transition-colors ${
                  active ? "bg-[#30d5c8]/10 text-[#30d5c8]" : "text-gray-400 hover:text-white"
                }`}
              >
                <Icon className="h-3.5 w-3.5" />
                {label}
              </Link>
            );
          })}
        </div>
        <button onClick={handleLogout} className="text-gray-500 hover:text-red-400 transition-colors">
          <LogOut className="h-4 w-4" />
        </button>
      </div>
    </nav>
  );
}
