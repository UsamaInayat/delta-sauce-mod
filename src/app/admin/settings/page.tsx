"use client";

import { FormEvent, useEffect, useState } from "react";
import { DeltaAdminShell } from "@/components/admin/delta-admin-shell";
import { DeltaAdminWindow } from "@/components/admin/delta-admin-window";

export default function AdminSettingsPage() {
  const [enabled, setEnabled] = useState(false);
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
        setEnabled(Boolean(data.enabled));
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

    if (enabled && !password.trim()) {
      setError("Password is required when platform password is enabled.");
      return;
    }

    setSaving(true);
    try {
      const res = await fetch("/api/admin/settings/gate", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enabled, password: enabled ? password : undefined }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Could not save settings.");
        return;
      }

      setEnabled(Boolean(data.enabled));
      setConfigured(Boolean(data.configured));
      setPassword(String(data.password ?? ""));
      setUpdatedAt(data.updatedAt ?? null);
      setMessage(
        data.enabled
          ? "Platform password enabled. All users must unlock again."
          : "Platform password disabled. The raffles page is now open.",
      );
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
            <h2 className="al-admin-section-title">Raffle platform access</h2>
            <p className="al-empty-copy">
              When platform password is off, the main raffles page is open to
              everyone. Individual raffles can still require their own password.
              When on, visitors must unlock the platform before browsing raffles.
            </p>

            <fieldset className="al-admin-fieldset">
              <legend>Platform Password</legend>
              <button
                type="button"
                className={`al-admin-toggle${enabled ? " active" : ""}`}
                onClick={() => setEnabled(true)}
                disabled={saving}
              >
                Yes
              </button>
              <button
                type="button"
                className={`al-admin-toggle${!enabled ? " active" : ""}`}
                onClick={() => setEnabled(false)}
                disabled={saving}
              >
                No
              </button>
            </fieldset>

            {enabled ? (
              <label className="al-admin-label">
                Password
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
            ) : null}

            {updatedAt ? (
              <p className="al-empty-copy">
                Last updated: {new Date(updatedAt).toLocaleString()}
                {!configured ? " (not yet saved)" : ""}
              </p>
            ) : null}

            {error ? <p className="arena-field-error show">{error}</p> : null}
            {message ? <p className="arena-result show ok">{message}</p> : null}

            <button type="submit" className="al-admin-btn primary" disabled={saving}>
              {saving ? "Saving…" : "Save settings"}
            </button>
          </form>
        )}
      </DeltaAdminWindow>
    </DeltaAdminShell>
  );
}
