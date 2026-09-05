/**
 * Delta Sauce GC member export — paste into the browser console on X.com
 *
 * 1. Open https://x.com/i/chat/g2010420839276057016
 * 2. Open the group info panel and tap "All members" so the scrollable list is visible
 * 3. DevTools → Console → paste this entire file and press Enter
 * 4. Wait for the scan to finish, then click Download CSV
 * 5. Admin → Snapshots → Group Chat Snapshot → Import CSV
 */
(async () => {
  const old = document.getElementById("gcx-panel");
  if (old) old.remove();

  const RESERVED = new Set([
    "home",
    "explore",
    "notifications",
    "messages",
    "i",
    "settings",
    "search",
    "compose",
    "hashtag",
    "bookmarks",
    "lists",
    "communities",
    "tos",
    "privacy",
    "about",
    "login",
    "signup",
    "logout",
    "x",
    "share",
    "intent",
  ]);

  const map = new Map();

  const countLinks = (el) =>
    el.querySelectorAll('a[href^="https://x.com/"], a[href^="https://twitter.com/"]').length;

  const findScroller = () => {
    let best = null;
    let score = -1;
    document.querySelectorAll("div,section,ul").forEach((d) => {
      const s = getComputedStyle(d);
      if (
        (s.overflowY === "auto" || s.overflowY === "scroll") &&
        d.scrollHeight > d.clientHeight + 10
      ) {
        const c = countLinks(d);
        if (c > score) {
          score = c;
          best = d;
        }
      }
    });
    return score > 0 ? best : null;
  };

  const collect = (root) => {
    (root || document)
      .querySelectorAll('a[href^="https://x.com/"], a[href^="https://twitter.com/"]')
      .forEach((a) => {
        const href = a.getAttribute("href") || "";
        const m = href.match(/^https:\/\/(?:x|twitter)\.com\/([A-Za-z0-9_]+)(?:[/?#]|$)/i);
        if (!m) return;
        const handle = m[1];
        if (RESERVED.has(handle.toLowerCase())) return;
        const nameEl = a.querySelector(".line-clamp-1") || a.querySelector("span");
        const name = nameEl ? nameEl.textContent.trim() : "";
        if (!map.has(handle)) map.set(handle, name);
        else if (name && !map.get(handle)) map.set(handle, name);
      });
  };

  const csvSafe = (v) => {
    const s = String(v == null ? "" : v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };

  const buildCSV = () => {
    const rows = [["username", "profile_url", "display_name"]];
    for (const [h, n] of map) rows.push([h, `https://x.com/${h}`, n]);
    return `\ufeff${rows.map((r) => r.map(csvSafe).join(",")).join("\r\n")}`;
  };

  const ts = () => {
    const d = new Date();
    const p = (n) => String(n).padStart(2, "0");
    return `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}_${p(d.getHours())}${p(d.getMinutes())}`;
  };

  const save = (name, mime, data) => {
    try {
      const url = URL.createObjectURL(new Blob([data], { type: mime }));
      const a = document.createElement("a");
      a.href = url;
      a.download = name;
      a.style.display = "none";
      document.body.appendChild(a);
      a.click();
      setTimeout(() => {
        URL.revokeObjectURL(url);
        a.remove();
      }, 4000);
      return true;
    } catch {
      return false;
    }
  };

  const panel = document.createElement("div");
  panel.id = "gcx-panel";
  panel.style.cssText =
    "position:fixed;top:16px;right:16px;z-index:2147483647;background:#15202b;color:#fff;font:13px/1.4 system-ui,Segoe UI,Arial;padding:14px;border-radius:12px;box-shadow:0 8px 30px rgba(0,0,0,.6);width:300px";
  panel.innerHTML =
    '<div style="font-weight:700;margin-bottom:8px">Delta Sauce GC Export</div>' +
    '<div id="gcx-status" style="margin-bottom:10px;color:#8ecdf7">Scanning…</div>' +
    '<button id="gcx-csv" style="width:100%;padding:8px;border:0;border-radius:8px;background:#00a67d;color:#fff;font-weight:700;cursor:pointer">Download CSV</button>' +
    '<button id="gcx-rescan" style="width:100%;margin-top:6px;padding:6px;border:0;border-radius:8px;background:#2a3b47;color:#fff;cursor:pointer">Re-scan</button>' +
    '<button id="gcx-close" style="width:100%;margin-top:6px;padding:6px;border:0;border-radius:8px;background:#3a2a2a;color:#fff;cursor:pointer">Close</button>';
  document.body.appendChild(panel);

  ["pointerdown", "mousedown", "click", "pointerup", "mouseup", "keydown"].forEach((ev) =>
    panel.addEventListener(ev, (e) => e.stopPropagation(), true),
  );

  const status = panel.querySelector("#gcx-status");
  const set = (t) => {
    status.textContent = t;
  };

  const finalize = () => {
    window.gcxCSV = buildCSV();
    console.log(`%cDelta Sauce GC: ${map.size} members`, "font-weight:bold;color:#1d9bf0");
    console.log("CSV ready — use the Download CSV button or copy(window.gcxCSV)");
    set(`${map.size} members ready. Download CSV, then import in admin Snapshots.`);
  };

  const scan = async () => {
    map.clear();
    const scroller = findScroller();
    if (!scroller) {
      collect(document);
      set(
        map.size
          ? `Scanned ${map.size} (no scroll list found).`
          : 'Open "All members", then Re-scan.',
      );
      finalize();
      return;
    }

    set("Scanning members…");
    scroller.scrollTop = 0;
    await new Promise((r) => setTimeout(r, 250));

    let stable = 0;
    let last = -1;
    for (let i = 0; i < 1000 && stable < 10; i += 1) {
      collect(scroller);
      const before = scroller.scrollTop;
      scroller.scrollTop = scroller.scrollTop + scroller.clientHeight;
      if (scroller.scrollTop === before) {
        scroller.dispatchEvent(
          new WheelEvent("wheel", { deltaY: scroller.clientHeight, bubbles: true }),
        );
      }
      await new Promise((r) => setTimeout(r, 110));
      if (map.size === last) stable += 1;
      else {
        stable = 0;
        last = map.size;
      }
      set(`Collected ${map.size}…`);
    }

    collect(scroller);
    finalize();
  };

  panel.querySelector("#gcx-csv").onclick = () => {
    if (!map.size) {
      set("No data. Open All members and Re-scan.");
      return;
    }
    save(`delta_sauce_gc_${ts()}.csv`, "text/csv;charset=utf-8;", buildCSV());
    set("CSV download started.");
  };
  panel.querySelector("#gcx-rescan").onclick = scan;
  panel.querySelector("#gcx-close").onclick = () => panel.remove();

  await scan();
})();
