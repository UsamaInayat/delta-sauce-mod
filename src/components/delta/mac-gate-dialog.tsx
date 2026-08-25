"use client";

import type { FormEvent } from "react";

type MacGateDialogProps = {
  password: string;
  error: string | null;
  submitting: boolean;
  configured: boolean;
  shake: boolean;
  onPasswordChange: (value: string) => void;
  onSubmit: (event: FormEvent) => void;
};

export function MacGateDialog({
  password,
  error,
  submitting,
  configured,
  shake,
  onPasswordChange,
  onSubmit,
}: MacGateDialogProps) {
  return (
    <div className={`mac-gate-wrap${shake ? " mac-gate-shake" : ""}`}>
      <div className="mac-gate-dialog" role="dialog" aria-labelledby="mac-gate-title">
        <div className="mac-gate-titlebar">
          <span className="mac-gate-titlebar-lines" aria-hidden="true" />
          <span id="mac-gate-title" className="mac-gate-title">
            Password
          </span>
        </div>

        <form className="mac-gate-body" onSubmit={onSubmit}>
          <div className="mac-gate-icon" aria-hidden="true">
            <span className="mac-gate-lock" />
          </div>

          <p className="mac-gate-copy">
            {configured
              ? "Enter the password to unlock the DeltaSauce raffle platform on this Macintosh."
              : "Raffle access has not been configured yet. Ask an admin to set the gate password."}
          </p>

          {configured ? (
            <>
              <label className="mac-gate-label" htmlFor="mac-gate-password">
                Password:
              </label>
              <input
                id="mac-gate-password"
                className="mac-gate-input"
                type="password"
                value={password}
                onChange={(event) => onPasswordChange(event.target.value)}
                autoComplete="current-password"
                disabled={submitting}
                autoFocus
              />
            </>
          ) : null}

          {error ? (
            <p className="mac-gate-error" role="alert">
              {error}
            </p>
          ) : null}

          <div className="mac-gate-actions">
            <button
              type="submit"
              className="mac-gate-btn mac-gate-btn-primary"
              disabled={submitting || !configured || !password.trim()}
            >
              {submitting ? "Checking…" : "OK"}
            </button>
            <button
              type="button"
              className="mac-gate-btn"
              disabled={submitting}
              onClick={() => onPasswordChange("")}
            >
              Clear
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
