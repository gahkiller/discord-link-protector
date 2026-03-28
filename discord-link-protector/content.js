// ⚠️ Discord Link Protector - Ultimate Final ⚠️

// ------------------ Default Lists ------------------
let suspiciousDomains = [
  "bit.ly","tinyurl.com","t.co","goo.gl","ow.ly","is.gd","shrtco.de","cutt.ly",
  "grabify.link","iplogger.org","2no.co","yip.su","smarturl.it","rebrand.ly","rb.gy","adf.ly"
];

let whitelist = ["discord.com","github.com"];
let blockedDomains = [];
let trustedServers = [];

const scannedLinks = new WeakSet();

// ------------------ Load Storage ------------------
chrome.storage.sync.get(
  ["customDomains","customWhitelist","blockedDomains","trustedServers","permissionGranted"],
  (data) => {
    if (data.customDomains) suspiciousDomains = suspiciousDomains.concat(data.customDomains);
    if (data.customWhitelist) whitelist = whitelist.concat(data.customWhitelist);
    blockedDomains = data.blockedDomains || [];
    trustedServers = data.trustedServers || [];

    if (!data.permissionGranted) {
      if (confirm("⚠️ Discord Link Protector wants to scan this page. Allow?")) {
        chrome.storage.sync.set({ permissionGranted: true });
        startScanning();
      }
    } else {
      startScanning();
    }
  }
);

// ------------------ Helpers ------------------
function levenshtein(a, b) {
  const matrix = Array.from({length: b.length + 1}, (_, i) => [i]);
  for (let j = 0; j <= a.length; j++) matrix[0][j] = j;
  for (let i = 1; i <= b.length; i++) {
    matrix[i] = [i];
    for (let j = 1; j <= a.length; j++) {
      if (b[i-1] === a[j-1]) matrix[i][j] = matrix[i-1][j-1];
      else matrix[i][j] = 1 + Math.min(matrix[i-1][j-1], matrix[i][j-1], matrix[i-1][j]);
    }
  }
  return matrix[b.length][a.length];
}

function normalizeHostname(hostname) {
  hostname = hostname.toLowerCase();
  const map = { '0': 'o', '1': 'l', 'i': 'l', 'l': 'l', '5': 's', '@': 'a' };
  hostname = hostname.split('').map(c => map[c] || c).join('');
  if (hostname.startsWith("www.")) hostname = hostname.slice(4);
  return hostname;
}

function isSuspiciousDomain(hostname) {
  hostname = normalizeHostname(hostname);
  if (whitelist.some(site => hostname.includes(site))) return false;
  if (blockedDomains.includes(hostname)) return false;

  for (const domain of suspiciousDomains) {
    const normalizedDomain = normalizeHostname(domain);
    const distance = levenshtein(hostname, normalizedDomain);
    const maxDistance = Math.max(1, Math.floor(normalizedDomain.length * 0.15));
    if (distance <= maxDistance || hostname.includes(normalizedDomain)) return true;
  }
  return false;
}

function isIPAddress(hostname) {
  return /^(?:\d{1,3}\.){3}\d{1,3}$/.test(hostname);
}

function isSuspiciousPath(path) {
  return /[a-zA-Z0-9]{15,}/.test(path) || /[?&](ref|id|track|utm)=/i.test(path);
}

function containsSuspiciousDomain(url) {
  return suspiciousDomains.some(domain => url.href.toLowerCase().includes(domain));
}

function isSuspiciousServer(url) {
  const host = url.hostname.toLowerCase();
  const path = url.pathname.toLowerCase();
  return (
    (host === "discord.gg" || (host === "discord.com" && path.includes("/invite/"))) &&
    !trustedServers.includes(url.href)
  );
}

// 🚫 FIX: Ignore Discord UI links (channels, etc.)
function isDiscordInternalLink(url) {
  if (url.hostname === "discord.com") {
    return (
      url.pathname.startsWith("/channels") ||
      url.pathname.startsWith("/@me") ||
      url.pathname.startsWith("/settings")
    );
  }
  return false;
}

// 🎯 Only scan message area (SUPER CLEAN)
function isInsideMessage(link) {
  return link.closest('[class*="message"], [data-list-id="chat-messages"]');
}

// ------------------ UI ------------------
function createButton(text, bg) {
  const btn = document.createElement("button");
  btn.textContent = text;
  btn.style.background = bg;
  btn.style.color = "#fff";
  btn.style.border = "none";
  btn.style.borderRadius = "6px";
  btn.style.padding = "2px 8px";
  btn.style.cursor = "pointer";
  btn.style.fontSize = "12px";
  btn.onmouseover = () => btn.style.opacity = "0.8";
  btn.onmouseout = () => btn.style.opacity = "1";
  return btn;
}

// ------------------ Warning System ------------------
function showWarning(link, reason) {
  if (scannedLinks.has(link)) return;
  scannedLinks.add(link);

  const url = new URL(link.href);
  const isBlocked = blockedDomains.includes(url.hostname);

  // ----- SERVER INVITES -----
  if (isSuspiciousServer(url)) {
    const joinBtn = link.closest("div")?.querySelector("button");
    if (!joinBtn) return;

    joinBtn.style.background = "#ff4c4c";
    joinBtn.style.color = "#fff";
    joinBtn.textContent = "⚠️ Suspicious";

    joinBtn.addEventListener("click", (e) => {
      if (!confirm("⚠️ This server may be unsafe. Join anyway?")) {
        e.preventDefault();
      }
    });

    const blockBtn = createButton("Block Server", "#555");
    blockBtn.onclick = () => {
      trustedServers.push(url.href);
      chrome.storage.sync.set({ trustedServers });
      location.reload();
    };

    link.parentNode.appendChild(blockBtn);
    return;
  }

  // ----- NORMAL LINKS -----
  if (isBlocked) {
    link.style.pointerEvents = "none";
    link.style.color = "#888";
    link.style.textDecoration = "line-through";
    return;
  }

  // Style warning
  link.style.color = "#ff4c4c";
  link.style.fontWeight = "bold";

  // Click popup ONLY on link click
  link.addEventListener("click", (e) => {
    if (!confirm(reason + "\n\nContinue?")) {
      e.preventDefault();
    }
  });

  // UI container
  const box = document.createElement("div");
  box.style.display = "flex";
  box.style.gap = "6px";
  box.style.marginTop = "2px";
  box.style.fontSize = "12px";

  const label = document.createElement("span");
  label.textContent = reason;
  label.style.color = "#ff4c4c";

  const blockBtn = createButton("Block", "#555");
  blockBtn.onclick = () => {
    blockedDomains.push(url.hostname);
    chrome.storage.sync.set({ blockedDomains });
    location.reload();
  };

  box.appendChild(label);
  box.appendChild(blockBtn);

  link.parentNode.appendChild(box);
}

// ------------------ Scan ------------------
function checkLinks() {
  document.querySelectorAll("a[href]").forEach(link => {
    if (scannedLinks.has(link)) return;

    try {
      const url = new URL(link.href);

      if (isDiscordInternalLink(url)) return;
      if (!isInsideMessage(link)) return;

      let reason = null;

      if (url.protocol !== "https:") {
        reason = "⚠️ Not secure (HTTP)";
      } else if (isSuspiciousDomain(url.hostname) || containsSuspiciousDomain(url)) {
        reason = "⚠️ Suspicious domain";
      } else if (isIPAddress(url.hostname)) {
        reason = "⚠️ Direct IP link";
      } else if (isSuspiciousPath(url.pathname)) {
        reason = "⚠️ Suspicious link structure";
      }

      if (reason || isSuspiciousServer(url)) {
        showWarning(link, reason);
      }

    } catch {}
  });
}

// ------------------ Start ------------------
function startScanning() {
  checkLinks();
  new MutationObserver(checkLinks).observe(document.body, {
    childList: true,
    subtree: true
  });
}