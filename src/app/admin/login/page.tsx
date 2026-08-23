"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { DeltaAdminShell } from "@/components/admin/delta-admin-shell";

export default function AdminLoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError("");
    const res = await fetch("/api/admin/auth", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password }),
    });
    setLoading(false);
    if (!res.ok) {
      const data = await res.json();
      setError(data.error ?? "Login failed");
      return;
    }
    router.push("/admin/raffles");
    router.refresh();
  }

  return (
    <DeltaAdminShell pageTitle="Login">
      <div className="al-admin-panel">
        <h1 className="al-admin-title">Admin Login</h1>
        <form onSubmit={handleSubmit} className="al-admin-form">
          <label className="al-admin-label">
            Username
            <input
              className="al-admin-input"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              autoComplete="username"
            />
          </label>
          <label className="al-admin-label">
            Password
            <input
              className="al-admin-input"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
            />
          </label>
          {error ? <p className="al-admin-error">{error}</p> : null}
          <button className="al-admin-btn primary" type="submit" disabled={loading}>
            {loading ? "Signing in…" : "Sign In"}
          </button>
        </form>
      </div>
    </DeltaAdminShell>
  );
}
