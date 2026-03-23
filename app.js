const API = "https://stock-news-backend-h2sr.onrender.com";

let all = [];
let filtered = [];
let activeFilter = "All";
let activeDate = "";
let lastFetchTime = null;
const REFRESH_MS = 60 * 60 * 1000;

// ── Helpers ──────────────────────────────────────────────

function scoreClass(s) {
  return s > 0 ? "bull" : s < 0 ? "bear" : "neut";
}

function scoreColor(s) {
  return s > 0 ? "#4ade80" : s < 0 ? "#f87171" : "#94a3b8";
}

function fmtTime(iso) {
  if (!iso) return "";
  try {
    return new Date(iso).toLocaleTimeString("en-IN", {
      hour: "2-digit", minute: "2-digit", hour12: true
    });
  } catch { return ""; }
}

function fmtSource(s) {
  return (s || "").replace(/_/g, " ");
}

// ── Card renderer ─────────────────────────────────────────

function renderCard(a) {
  const sign = a.score > 0 ? "+" : "";
  const icon = a.sentiment === "Bullish" ? "▲" : a.sentiment === "Bearish" ? "▼" : "●";
  const cls = scoreClass(a.score);
  const color = scoreColor(a.score);
  const barWidth = Math.round((Math.abs(a.score) / 10) * 100);
  const isHighImpact = Math.abs(a.score) >= 6;

  const stocksHtml = (a.affected_stocks && a.affected_stocks.length > 0)
    ? `<div class="stocks-label">Stocks to watch</div>
       <div class="tickers">
         ${a.affected_stocks.map(t =>
           `<span class="ticker">${t}</span>`
         ).join("")}
       </div>`
    : "";

  return `
    <div class="card ${isHighImpact ? "high-impact" : ""}" data-sector="${a.sector || "Other"}">
      <div class="top">
        <span class="sector">${a.sector || "Other"}</span>
        <span class="score ${cls}">${icon} ${a.sentiment} ${sign}${a.score}</span>
      </div>

      <h3><a href="${a.url}" target="_blank" rel="noopener">${a.title}</a></h3>

      ${stocksHtml}

      <div class="impact-bar">
        <span class="impact-label">Impact</span>
        <div class="bar-track">
          <div class="bar-fill" style="width:${barWidth}%; background:${color};"></div>
        </div>
        <span class="bar-score" style="color:${color}">${sign}${a.score}/10</span>
      </div>

      <p class="reason">${a.reason || ""}</p>
      <div class="meta">${fmtSource(a.source)} · ${fmtTime(a.published)}</div>
    </div>`;
}

// ── Render grid ───────────────────────────────────────────

function renderGrid() {
  const items = activeFilter === "All"
    ? filtered
    : filtered.filter(a => a.sector === activeFilter);

  if (items.length === 0) {
    document.getElementById("grid").innerHTML =
      `<div id="status">No news found for <strong>${activeFilter}</strong> on this date.</div>`;
    return;
  }
  document.getElementById("grid").innerHTML = items.map(renderCard).join("");
}

// ── Update filter button counts ───────────────────────────

function updateFilters() {
  document.querySelectorAll(".btn[data-s]").forEach(btn => {
    const s = btn.dataset.s;
    const count = s === "All"
      ? filtered.length
      : filtered.filter(a => a.sector === s).length;

    btn.textContent = count > 0 ? `${s} (${count})` : s;
    btn.classList.toggle("empty", count === 0 && s !== "All");
  });
}

// ── Summary bar (bullish/bearish/neutral counts) ──────────

function updateSummary() {
  const bull = filtered.filter(a => a.sentiment === "Bullish").length;
  const bear = filtered.filter(a => a.sentiment === "Bearish").length;
  const neut = filtered.filter(a => a.sentiment === "Neutral").length;
  const highImpact = filtered.filter(a => Math.abs(a.score) >= 6).length;

  document.getElementById("summary-bar").innerHTML = `
    <div class="summary-item">
      <div class="dot" style="background:#4ade80"></div>
      <span style="color:#4ade80">${bull} Bullish</span>
    </div>
    <div class="summary-item">
      <div class="dot" style="background:#f87171"></div>
      <span style="color:#f87171">${bear} Bearish</span>
    </div>
    <div class="summary-item">
      <div class="dot" style="background:#94a3b8"></div>
      <span style="color:#94a3b8">${neut} Neutral</span>
    </div>
    <div class="summary-item" style="margin-left:auto">
      <span style="color:#a78bfa">⚡ ${highImpact} high impact news</span>
    </div>`;
}

// ── Refresh timer display ─────────────────────────────────

function updateRefreshBar() {
  if (!lastFetchTime) return;
  const minsLeft = Math.max(0,
    Math.round((lastFetchTime + REFRESH_MS - Date.now()) / 60000)
  );
  document.getElementById("refreshbar").innerHTML =
    `Updated: ${new Date(lastFetchTime).toLocaleTimeString("en-IN")}
     &nbsp;·&nbsp; Next refresh: <strong>${minsLeft} min</strong>
     &nbsp;·&nbsp; <a href="#" onclick="forceRefresh(event)">Refresh now</a>`;
}

// ── Load dates dropdown ───────────────────────────────────

async function loadDates() {
  try {
    const res = await fetch(`${API}/dates`);
    const dates = await res.json();
    const sel = document.getElementById("date-select");
    sel.innerHTML = dates.map(d =>
      `<option value="${d.value}" ${d.label === "Today" ? "selected" : ""}>
        ${d.label}
      </option>`
    ).join("");
    activeDate = dates[0]?.value || "";
  } catch (e) {
    console.error("Could not load dates", e);
  }
}

// ── Main load function ────────────────────────────────────

async function load(forceNew = false) {
  document.getElementById("refreshbar").textContent = "Fetching latest news...";
  try {
    let url = `${API}/news`;
    const params = [];
    if (forceNew) params.push("refresh=true");
    if (activeDate) params.push(`date=${activeDate}`);
    if (params.length) url += "?" + params.join("&");

    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);

    all = await res.json();
    filtered = all;
    lastFetchTime = Date.now();

    updateFilters();
    updateSummary();
    renderGrid();
    updateRefreshBar();

  } catch (e) {
    console.error(e);
    document.getElementById("grid").innerHTML =
      `<div id="status">
        ❌ Could not load news.<br>
        <small style="color:#475569">
          Backend may be starting up — wait 30 seconds and
          <a href="#" onclick="location.reload()" style="color:#7dd3fc">refresh</a>
        </small>
      </div>`;
    document.getElementById("refreshbar").textContent = "Connection failed.";
  }
}

function forceRefresh(e) {
  if (e) e.preventDefault();
  document.getElementById("grid").innerHTML =
    `<div id="status">⏳ Fetching fresh news... (~20 seconds)</div>`;
  load(true);
}

// ── Event listeners ───────────────────────────────────────

document.getElementById("filters").addEventListener("click", e => {
  const s = e.target.dataset.s;
  if (!s) return;
  activeFilter = s;
  document.querySelectorAll(".btn").forEach(b => b.classList.remove("active"));
  e.target.classList.add("active");
  renderGrid();
});

document.getElementById("date-select").addEventListener("change", e => {
  activeDate = e.target.value;
  document.getElementById("grid").innerHTML =
    `<div id="status">⏳ Loading news for selected date...</div>`;
  load(true);
});

// ── Init ──────────────────────────────────────────────────

async function init() {
  await loadDates();
  await load();
  setInterval(() => load(true), REFRESH_MS);
  setInterval(updateRefreshBar, 60000);
}

init();
```

Commit changes.

---

# Step 6 — Verify Gemini is working

After Render redeploys (2-3 mins), open this debug URL in your browser:
```
https://stock-news-backend-h2sr.onrender.com/debug
