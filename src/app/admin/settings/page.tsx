"use client";

import { FormEvent, useEffect, useState } from "react";
import { DeltaAdminShell } from "@/components/admin/delta-admin-shell";
import { DeltaAdminWindow } from "@/components/admin/delta-admin-window";

export default function AdminSettingsPage() {
  const [password, setPassword] = useState("");
  const [configured, setConfigured] = useState(false);
  const [updatedAt, setUpdatedAt] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void fetch("/api/admin/settings/gate")
      .then((res) => res.json())
      .then((data) => {
        setConfigured(Boolean(data.configured));
        setPassword(String(data.password ?? ""));
        setUpdatedAt(data.updatedAt ?? null);
      })
      .finally(() => setLoading(false));
  }, []);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setMessage(null);
    setError(null);

    if (!password.trim()) {
      setError("Password cannot be empty.");
      return;
    }

    setSaving(true);
    try {
      const res = await fetch("/api/admin/settings/gate", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Could not save password.");
        return;
      }

      setConfigured(true);
      setPassword(String(data.password ?? ""));
      setUpdatedAt(data.updatedAt ?? null);
      setMessage("Gate password saved. All users must unlock again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <DeltaAdminShell pageTitle="Settings">
      <DeltaAdminWindow title="SETTINGS.PNL">
        <div className="al-admin-toolbar">
          <h1 className="arena-form-title">Settings</h1>
        </div>

        {loading ? (
          <p className="al-empty-copy">Loading…</p>
        ) : (
          <form className="al-admin-form" onSubmit={handleSubmit}>
            <h2 className="al-admin-section-title">Raffle platform password</h2>
            <p className="al-empty-copy">
              This password protects the public raffle desktop. It is stored encrypted
              in the database. Changing it immediately invalidates all active unlock
              sessions.
            </p>

            <label className="al-admin-label">
              Current password
              <input
                className="al-admin-input"
                type="text"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                autoComplete="off"
                spellCheck={false}
                disabled={saving}
              />
            </label>

            {updatedAt ? (
              <p className="al-empty-copy">
                Last updated: {new Date(updatedAt).toLocaleString()}
                {!configured ? " (not yet saved)" : ""}
              </p>
            ) : null}

            {error ? <p className="arena-field-error show">{error}</p> : null}
            {message ? <p className="arena-result show ok">{message}</p> : null}

            <button type="submit" className="al-admin-btn primary" disabled={saving}>
              {saving ? "Saving…" : configured ? "Save new password" : "Set password"}
            </button>
          </form>
        )}
      </DeltaAdminWindow>
    </DeltaAdminShell>
  );
}
