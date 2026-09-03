export type ExploreEntry = {
  id: string;
  walletAddress: string;
  walletEns: string | null;
  xHandle: string;
  status: string;
  blacklisted: boolean;
  createdAt: string;
};

export function csvEscape(value: string) {
  return `"${value.replace(/"/g, '""')}"`;
}

export function downloadCsv(filename: string, headers: string[], lines: string[]) {
  const blob = new Blob([[headers.join(","), ...lines].join("\n")], {
    type: "text/csv;charset=utf-8",
  });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

export function formatWallet(entry: {
  walletAddress: string;
  walletEns: string | null;
}) {
  return entry.walletEns ?? entry.walletAddress;
}

export function formatHandle(entry: { xHandle: string | null }) {
  return entry.xHandle ? `@${entry.xHandle.replace(/^@/, "")}` : "";
}

export function exportEntriesCsv(
  filename: string,
  entries: ExploreEntry[],
  includeMeta = false,
) {
  const headers = includeMeta
    ? ["wallet", "x_handle", "status", "entered_at"]
    : ["wallet", "x_handle"];
  const lines = entries.map((entry) => {
    const base = [
      csvEscape(formatWallet(entry)),
      csvEscape(formatHandle(entry)),
    ];
    if (includeMeta) {
      base.push(csvEscape(entry.status), csvEscape(entry.createdAt));
    }
    return base.join(",");
  });
  downloadCsv(filename, headers, lines);
}
