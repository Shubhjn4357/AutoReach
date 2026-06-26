'use client'
import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function RootPage() {
  const router = useRouter();

  useEffect(() => {
    // Check if user is logged in by looking for session token
    const token = typeof window !== "undefined" ? window.localStorage.getItem('autoreach_token') : null;
    if (token) {
      router.push("/dashboard");
    } else {
      router.push("/login");
    }
  }, []);

  return null; // Redirect happens in useEffect
}
