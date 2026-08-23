"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { DeltaAdminShell } from "@/components/admin/delta-admin-shell";
import { DeltaAdminWindow } from "@/components/admin/delta-admin-window";
import { DeltaButton, DeltaButtonRow } from "@/components/delta/delta-buttons";

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
      <DeltaAdminWindow title="ADMIN.EXE — Sign In">
        <form onSubmit={handleSubmit} className="al-admin-form">
          <h1 className="arena-form-title">Admin Login</h1>
          <p className="arena-form-sub">Delta Sauce raffle control panel</p>

          <div className="al-group">
            <span className="al-group-legend">Credentials</span>
            <div className="arena-field">
              <label className="arena-field-label" htmlFor="admin-user">
                Username
              </label>
              <div className="arena-input-wrap">
                <input
                  id="admin-user"
                  className="arena-input"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  autoComplete="username"
                />
              </div>
            </div>
            <div className="arena-field">
              <label className="arena-field-label" htmlFor="admin-pass">
                Password
              </label>
              <div className="arena-input-wrap">
                <input
                  id="admin-pass"
                  className="arena-input"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="current-password"
                />
              </div>
            </div>
          </div>

          {error ? (
            <div className="arena-result show err">
              <span className="al-msgicon" />
              <span>{error}</span>
            </div>
          ) : null}

          <DeltaButtonRow>
            <DeltaButton variant="primary" type="submit" disabled={loading}>
              {loading ? "Signing in…" : "Sign In"}
            </DeltaButton>
          </DeltaButtonRow>
        </form>
      </DeltaAdminWindow>
    </DeltaAdminShell>
  );
}
