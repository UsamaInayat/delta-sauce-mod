/**
 * Delta Sauce GC member export — paste into the browser console on X.com
 *
 * HOW TO USE (read this):
 *   1. Open https://x.com/i/chat/g2010420839276057016
 *   2. Paste this entire script in DevTools Console and press Enter
 *   3. Click the group name "Sauce" at the top of the chat
 *   4. Click "View all members" / "All members"
 *   5. Slowly scroll through the ENTIRE members list top to bottom once
 *   6. Click the green download link in the panel (or run copy(window.gcxCSV))
 *   7. Import the CSV in Admin → Snapshots → Group Chat Snapshot
 */
(async () => {
  const HOST_ID = "gcx-host-root";
  document.getElementById(HOST_ID)?.remove();

  const RESERVED = new Set([
    "home", "explore", "notifications", "messages", "i", "settings",
    "search", "compose", "hashtag", "bookmarks", "lists", "communities",
    "tos", "privacy", "about", "login", "signup", "logout", "x", "share", "intent",
  ]);

  const members = new Map();
  let snifferInstalled = false;
  let domTimer = null;

  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

  const isValidHandle = (handle) => {
    if (!handle || typeof handle !== "string") return false;
    const h = handle.replace(/^@+/, "");
    if (!/^[A-Za-z0-9_]{1,15}$/.test(h)) return false;
    return !RESERVED.has(h.toLowerCase());
  };

  const addMember = (handle, display = "") => {
    const clean = handle.replace(/^@+/, "");
    if (!isValidHandle(clean)) return;
    const key = clean.toLowerCase();
    const prev = members.get(key);
    if (!prev) members.set(key, { handle: clean, display: display || "" });
    else if (display && !prev.display) prev.display = display;
  };

  const handleFromHref = (href) => {
    if (!href) return "";
    const full = href.match(/^https?:\/\/(?:x|twitter)\.com\/([A-Za-z0-9_]{1,15})(?:[/?#]|$)/i);
    if (full) return full[1];
    const rel = href.match(/^\/([A-Za-z0-9_]{1,15})(?:[/?#]|$)/);
    return rel ? rel[1] : "";
  };

  const extractUsersFromJson = (value) => {
    const stack = [value];
    while (stack.length) {
      const node = stack.pop();
      if (!node || typeof node !== "object") continue;

      if (Array.isArray(node)) {
        for (const item of node) stack.push(item);
        continue;
      }

      const screenName = node.screen_name || node.username;
      if (typeof screenName === "string") {
        addMember(screenName, typeof node.name === "string" ? node.name : "");
      }

      const legacy = node.legacy;
      if (legacy && typeof legacy.screen_name === "string") {
        addMember(legacy.screen_name, typeof legacy.name === "string" ? legacy.name : "");
      }

      const result = node.result;
      if (result && typeof result === "object" && typeof result.legacy?.screen_name === "string") {
        addMember(result.legacy.screen_name, result.legacy.name || result.name || "");
      }

      for (const v of Object.values(node)) {
        if (v && typeof v === "object") stack.push(v);
      }
    }
  };

  const sniffResponse = async (response, url) => {
    const u = String(url || "");
    if (!/(x\.com|twitter\.com)/i.test(u)) return;
    if (!/(graphql|dm|conversation|participant|inbox|chat|User|member)/i.test(u)) return;
    try {
      const clone = response.clone();
      const text = await clone.text();
      if (!text || text[0] !== "{") return;
      extractUsersFromJson(JSON.parse(text));
      refreshUi();
    } catch {
      // ignore parse errors
    }
  };

  const installSniffer = () => {
    if (snifferInstalled) return;
    snifferInstalled = true;

    const origFetch = window.fetch;
    window.fetch = async function gcxFetch(...args) {
      const response = await origFetch.apply(this, args);
      const url = args[0]?.url ?? args[0];
      void sniffResponse(response, url);
      return response;
    };

    const origOpen = XMLHttpRequest.prototype.open;
    const origSend = XMLHttpRequest.prototype.send;
    XMLHttpRequest.prototype.open = function gcxOpen(method, url, ...rest) {
      this.__gcxUrl = url;
      return origOpen.call(this, method, url, ...rest);
    };
    XMLHttpRequest.prototype.send = function gcxSend(...args) {
      this.addEventListener("load", () => {
        const url = this.__gcxUrl;
        try {
          if (this.responseType && this.responseType !== "" && this.responseType !== "text") return;
          const text = this.responseText;
          if (!text || text[0] !== "{") return;
          if (!/(x\.com|twitter\.com)/i.test(String(url))) return;
          extractUsersFromJson(JSON.parse(text));
          refreshUi();
        } catch {
          // ignore
        }
      });
      return origSend.apply(this, args);
    };
  };

  const collectFromDom = (root) => {
    (root || document).querySelectorAll("a[href]").forEach((a) => {
      const handle = handleFromHref(a.getAttribute("href") || "");
      if (!handle) return;
      const row = a.closest('[data-testid="UserCell"], [role="listitem"], li');
      const nameEl = row?.querySelector('[dir="ltr"] span') || a.querySelector("span");
      addMember(handle, nameEl?.textContent?.trim() || "");
    });
  };

  const findBestScroller = () => {
    let best = null;
    let bestScore = -1;
    for (const el of document.querySelectorAll("div, section, ul")) {
      const style = getComputedStyle(el);
      const scrollable =
        (style.overflowY === "auto" || style.overflowY === "scroll" || style.overflowY === "overlay") &&
        el.scrollHeight > el.clientHeight + 20;
      if (!scrollable) continue;

      let links = 0;
      el.querySelectorAll("a[href]").forEach((a) => {
        if (isValidHandle(handleFromHref(a.getAttribute("href") || ""))) links += 1;
      });
      if (links < 2) continue;

      const inModal = Boolean(el.closest('[role="dialog"], [aria-modal="true"]'));
      const score = links * 20 + (inModal ? 1000 : 0) + Math.min(el.clientHeight, 600);
      if (score > bestScore) {
        bestScore = score;
        best = el;
      }
    }
    return best;
  };

  const autoScrollDom = async () => {
    const scroller = findBestScroller();
    if (!scroller) {
      collectFromDom(document);
      refreshUi();
      return;
    }

    scroller.scrollTop = 0;
    await sleep(200);

    let stable = 0;
    let lastCount = members.size;
    let lastScroll = -1;

    for (let i = 0; i < 800 && stable < 15; i += 1) {
      collectFromDom(scroller);
      refreshUi(`Scrolling… ${members.size} collected`);

      const step = Math.max(Math.floor(scroller.clientHeight * 0.85), 180);
      const prev = scroller.scrollTop;
      scroller.scrollTop = prev + step;
      scroller.dispatchEvent(new WheelEvent("wheel", { deltaY: step, bubbles: true, cancelable: true }));

      await sleep(120);

      const stuck = scroller.scrollTop === lastScroll && members.size === lastCount;
      if (stuck) stable += 1;
      else stable = 0;

      lastScroll = scroller.scrollTop;
      lastCount = members.size;
    }

    collectFromDom(scroller);
    refreshUi();
  };

  const csvSafe = (v) => {
    const s = String(v ?? "");
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };

  const buildCSV = () => {
    const rows = [["username", "profile_url", "display_name"]];
    for (const { handle, display } of members.values()) {
      rows.push([handle, `https://x.com/${handle}`, display]);
    }
    return `\ufeff${rows.map((r) => r.map(csvSafe).join(",")).join("\r\n")}`;
  };

  const ts = () => {
    const d = new Date();
    const p = (n) => String(n).padStart(2, "0");
    return `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}_${p(d.getHours())}${p(d.getMinutes())}`;
  };

  // --- UI in Shadow DOM so X's event handlers don't break our controls ---
  const host = document.createElement("div");
  host.id = HOST_ID;
  host.style.cssText = "position:fixed;top:16px;right:16px;z-index:2147483647;pointer-events:none";
  document.documentElement.appendChild(host);

  const shadow = host.attachShadow({ mode: "open" });
  shadow.innerHTML = `
    <style>
      * { box-sizing: border-box; font-family: system-ui, Segoe UI, Arial, sans-serif; }
      .wrap {
        pointer-events: auto;
        width: 320px;
        background: #15202b;
        color: #fff;
        padding: 14px;
        border-radius: 12px;
        box-shadow: 0 8px 30px rgba(0,0,0,.65);
        border: 1px solid #38444d;
      }
      h3 { margin: 0 0 8px; font-size: 14px; }
      .status { margin: 0 0 10px; color: #8ecdf7; font-size: 12px; line-height: 1.45; white-space: pre-wrap; }
      .steps { margin: 0 0 10px; padding-left: 18px; font-size: 11px; line-height: 1.45; color: #ccc; }
      a, button {
        display: block;
        width: 100%;
        margin-top: 6px;
        padding: 8px 10px;
        border: 0;
        border-radius: 8px;
        font-weight: 700;
        font-size: 12px;
        text-align: center;
        text-decoration: none;
        cursor: pointer;
        color: #fff;
      }
      a.dl { background: #00a67d; margin-top: 0; }
      a.dl.disabled { opacity: 0.45; pointer-events: none; }
      button.copy { background: #7a5cff; }
      button.scroll { background: #c98a00; }
      button.close { background: #3a2a2a; font-weight: 600; }
    </style>
    <div class="wrap">
      <h3>Delta Sauce GC Export</h3>
      <p class="status" id="status">Sniffer active. Open All members…</p>
      <ol class="steps">
        <li>Click group name → <b>All members</b></li>
        <li>Scroll the full list once</li>
        <li>Click <b>Auto-scroll collect</b></li>
        <li>Download or Copy CSV</li>
      </ol>
      <a class="dl disabled" id="dl" download="delta_sauce_gc.csv" href="#">Download CSV</a>
      <button class="copy" id="copy" type="button">Copy CSV</button>
      <button class="scroll" id="scroll" type="button">Auto-scroll collect</button>
      <button class="close" id="close" type="button">Close</button>
    </div>
  `;

  const statusEl = shadow.getElementById("status");
  const dlLink = shadow.getElementById("dl");
  const copyBtn = shadow.getElementById("copy");
  const scrollBtn = shadow.getElementById("scroll");
  const closeBtn = shadow.getElementById("close");

  const refreshUi = (msg) => {
    const csv = buildCSV();
    window.gcxCSV = csv;
    window.gcxCount = members.size;

    if (members.size > 0) {
      const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      if (dlLink.__gcxUrl) URL.revokeObjectURL(dlLink.__gcxUrl);
      dlLink.__gcxUrl = url;
      dlLink.href = url;
      dlLink.download = `delta_sauce_gc_${ts()}.csv`;
      dlLink.classList.remove("disabled");
      dlLink.textContent = `Download CSV (${members.size})`;
    } else {
      dlLink.classList.add("disabled");
      dlLink.textContent = "Download CSV";
    }

    if (msg) statusEl.textContent = msg;
    else {
      statusEl.textContent = members.size
        ? `${members.size} members collected.\nUse Download or Copy CSV.`
        : "Sniffer active.\nOpen All members, scroll the list, then Auto-scroll collect.";
    }
  };

  copyBtn.addEventListener("click", async () => {
    if (!members.size) {
      statusEl.textContent = "No members yet. Open All members first.";
      return;
    }
    const csv = buildCSV();
    try {
      await navigator.clipboard.writeText(csv);
      statusEl.textContent = `Copied ${members.size} rows to clipboard.`;
    } catch {
      statusEl.textContent = "Copy failed. Run: copy(window.gcxCSV)";
      console.log(csv);
    }
  });

  scrollBtn.addEventListener("click", () => {
    scrollBtn.disabled = true;
    scrollBtn.textContent = "Scrolling…";
    void autoScrollDom().finally(() => {
      scrollBtn.disabled = false;
      scrollBtn.textContent = "Auto-scroll collect";
      refreshUi(`${members.size} members after scroll.\nIf low, open All members and scroll manually, then click again.`);
    });
  });

  closeBtn.addEventListener("click", () => {
    if (dlLink.__gcxUrl) URL.revokeObjectURL(dlLink.__gcxUrl);
    host.remove();
  });

  installSniffer();
  refreshUi("Sniffer installed.\n1) Open All members\n2) Scroll list\n3) Auto-scroll collect");

  console.log("%cDelta Sauce GC Export ready", "font-weight:bold;color:#1d9bf0");
  console.log("After opening All members: members fill via network sniffer + scroll collect");
  console.log("Export: click Download in panel, or copy(window.gcxCSV)");
})();
