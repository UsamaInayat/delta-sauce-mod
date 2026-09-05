import type { NextRequest } from "next/server";

export function getClientIp(req: NextRequest) {
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) {
    const first = forwarded.split(",")[0]?.trim();
    if (first) return normalizeIp(first);
  }

  const realIp = req.headers.get("x-real-ip")?.trim();
  if (realIp) return normalizeIp(realIp);

  return null;
}

function normalizeIp(value: string) {
  if (value.startsWith("::ffff:")) {
    return value.slice(7);
  }
  return value;
}
