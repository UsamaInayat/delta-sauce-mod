"use client";

import { useEffect, useState, type FormEvent } from "react";
import { DeltaButton, DeltaButtonRow } from "./delta-buttons";
import { DeltaWindow } from "./delta-window";

export type DeltaFormResult = {
  kind: "ok" | "err";
  message: string;
} | null;

type DeltaFormProps = {
  title: string;
  subtitle?: string;
  walletLabel?: string;
  walletPlaceholder?: string;
  walletValue?: string;
  xHandleValue?: string;
  onWalletChange?: (value: string) => void;
  onXHandleChange?: (value: string) => void;
  onResolveEns?: (ens: string) => Promise<string | null>;
  onSubmit?: (data: { wallet: string; xHandle: string }) => void | Promise<void>;
  onCancel?: () => void;
  onUpdate?: () => void;
  showUpdate?: boolean;
  submitting?: boolean;
  result?: DeltaFormResult;
  notice?: string;
  walletError?: string;
  xHandleError?: string;
  footerNote?: string;
};

function isEns(value: string) {
  return /^[a-z0-9-]+(\.[a-z0-9-]+)*\.(eth|xyz|box|art|id)$/i.test(value.trim());
}

export function DeltaForm({
  title,
  subtitle,
  walletLabel = "ETH address or ENS",
  walletPlaceholder = "0x… or yourname.eth",
  walletValue = "",
  xHandleValue = "",
  onWalletChange,
  onXHandleChange,
  onResolveEns,
  onSubmit,
  onCancel,
  onUpdate,
  showUpdate = false,
  submitting = false,
  result = null,
  notice,
  walletError,
  xHandleError,
  footerNote = "Your details are sent securely to the DeltaSauce allowlist.",
}: DeltaFormProps) {
  const [ensPreview, setEnsPreview] = useState<{ text: string; bad?: boolean } | null>(null);

  useEffect(() => {
    if (!walletValue.trim() || !isEns(walletValue)) {
      setEnsPreview(null);
      return;
    }

    if (!onResolveEns) {
      setEnsPreview({ text: "resolving…" });
      return;
    }

    setEnsPreview({ text: "resolving…" });
    const timer = window.setTimeout(async () => {
      try {
        const address = await onResolveEns(walletValue.trim());
        if (address) {
          setEnsPreview({ text: `→ ${address}` });
        } else {
          setEnsPreview({ text: "That name doesn't resolve to an address.", bad: true });
        }
      } catch {
        setEnsPreview(null);
      }
    }, 450);

    return () => window.clearTimeout(timer);
  }, [walletValue, onResolveEns]);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    await onSubmit?.({ wallet: walletValue.trim(), xHandle: xHandleValue.trim() });
  }

  return (
    <DeltaWindow title="Allowlist Setup — DeltaSauce">
      <div className="al-dialog-body">
        {result ? (
          <div className={`arena-result show ${result.kind}`} role="status">
            <span className="al-msgicon" aria-hidden="true" />
            <span>{result.message}</span>
          </div>
        ) : null}

        {notice ? (
          <div className="arena-result show ok" role="status">
            <span className="al-msgicon" aria-hidden="true" />
            <span>{notice}</span>
          </div>
        ) : null}

        <form onSubmit={handleSubmit}>
          <h1 className="arena-form-title">{title}</h1>
          {subtitle ? <p className="arena-form-sub">{subtitle}</p> : null}

          <div className="al-group">
            <span className="al-group-legend">Your details</span>

            <div className="arena-field">
              <label className="arena-field-label" htmlFor="delta-wallet">
                {walletLabel} <span className="req">*</span>{" "}
                <span className="al-hint">({walletPlaceholder})</span>
              </label>
              <div className="arena-input-wrap">
                <input
                  id="delta-wallet"
                  className={`arena-input${walletError ? " invalid" : ""}`}
                  value={walletValue}
                  onChange={(event) => onWalletChange?.(event.target.value)}
                  placeholder={walletPlaceholder}
                  autoComplete="off"
                  spellCheck={false}
                  disabled={submitting}
                />
              </div>
              {ensPreview ? (
                <div className={`al-ens-preview show${ensPreview.bad ? " bad" : ""}`}>
                  {ensPreview.text}
                </div>
              ) : null}
              {walletError ? (
                <div className="arena-field-error show">{walletError}</div>
              ) : null}
            </div>

            <div className="arena-field">
              <label className="arena-field-label" htmlFor="delta-xhandle">
                X / Twitter handle <span className="req">*</span>
              </label>
              <div className="arena-input-wrap">
                <span className="arena-input-prefix" aria-hidden="true">
                  @
                </span>
                <input
                  id="delta-xhandle"
                  className={`arena-input has-prefix${xHandleError ? " invalid" : ""}`}
                  value={xHandleValue}
                  onChange={(event) => onXHandleChange?.(event.target.value.replace(/^@/, ""))}
                  placeholder="handle"
                  autoComplete="off"
                  spellCheck={false}
                  disabled={submitting}
                />
              </div>
              {xHandleError ? (
                <div className="arena-field-error show">{xHandleError}</div>
              ) : null}
            </div>
          </div>

          <div className={`al-progress${submitting ? " show" : ""}`} aria-hidden={!submitting}>
            <div className="al-progress-blocks" />
          </div>

          <DeltaButtonRow>
            <DeltaButton variant="primary" type="submit" disabled={submitting}>
              {showUpdate ? "Update Entry" : "Submit Entry"}
            </DeltaButton>
            {showUpdate && onUpdate ? (
              <DeltaButton type="button" onClick={onUpdate} disabled={submitting}>
                Update
              </DeltaButton>
            ) : null}
            {onCancel ? (
              <DeltaButton type="button" onClick={onCancel} disabled={submitting}>
                Cancel
              </DeltaButton>
            ) : null}
          </DeltaButtonRow>

          {footerNote ? <p className="arena-form-note">{footerNote}</p> : null}
        </form>
      </div>
    </DeltaWindow>
  );
}
