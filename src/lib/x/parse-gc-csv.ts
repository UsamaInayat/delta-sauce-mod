import { normalizeXHandle, isValidXHandle } from "@/lib/wallet/validate";

const USERNAME_HEADERS = new Set([
  "username",
  "x_handle",
  "xhandle",
  "handle",
  "x username",
  "x_username",
  "screen_name",
  "screenname",
]);

function parseCsvLine(line: string): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i += 1) {
    const ch = line[i];
    if (inQuotes) {
      if (ch === '"' && line[i + 1] === '"') {
        current += '"';
        i += 1;
      } else if (ch === '"') {
        inQuotes = false;
      } else {
        current += ch;
      }
    } else if (ch === '"') {
      inQuotes = true;
    } else if (ch === ",") {
      result.push(current.trim());
      current = "";
    } else {
      current += ch;
    }
  }

  result.push(current.trim());
  return result;
}

function handleFromCell(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return "";

  const urlMatch = trimmed.match(/(?:https?:\/\/)?(?:www\.)?(?:x|twitter)\.com\/([A-Za-z0-9_]+)/i);
  if (urlMatch) {
    return normalizeXHandle(urlMatch[1]);
  }

  return normalizeXHandle(trimmed);
}

export function parseGcMemberCsv(csvText: string) {
  const text = csvText.replace(/^\uFEFF/, "").trim();
  if (!text) {
    throw new Error("CSV file is empty.");
  }

  const lines = text.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  const handles = new Set<string>();

  const firstRow = parseCsvLine(lines[0]).map((cell) => cell.toLowerCase());
  const usernameIndex = firstRow.findIndex((cell) => USERNAME_HEADERS.has(cell));
  const hasHeader = usernameIndex >= 0;
  const dataLines = hasHeader ? lines.slice(1) : lines;
  const columnIndex = hasHeader ? usernameIndex : 0;

  for (const line of dataLines) {
    const cells = parseCsvLine(line);
    const raw = cells[columnIndex] ?? cells[0] ?? "";
    const handle = handleFromCell(raw);
    if (!handle || !isValidXHandle(handle)) continue;
    handles.add(handle);
  }

  if (!handles.size) {
    throw new Error(
      "No valid X usernames found. Expected a CSV with a username column (or one handle per line).",
    );
  }

  return [...handles].sort();
}
