const API = "https://stock-news-backend-h2sr.onrender.com

let all = [];
let filter = "All";
let lastFetchTime = null;
const REFRESH_INTERVAL = 60 * 60 * 1000; // 60 minutes

function scoreClass(s) {
  if (s > 0) return "bull";
  if (s < 0) return "bear";
  return "neut";
}

function scoreBar(score) {
  const abs = Math.abs(score);
  const fill = score > 0 ? "#4ade80" : score < 0 ? "#f87171" : "#94a3b8";
  const width = (abs / 10) * 100;
  return `
    <div style="margin: 8px 0; display:flex; align-items:center; gap:8px;">
      <span style="font-size:11px; color:#64748b; min-width:60px;">Impact</span>
      <div style="flex:1; background:#1e293b; border-radius:4px; height:6px;">
        <div style="width:${width}%; background:${fill}; height:6px; border-radius:4px;"></div>
      </div>
      <span style="font-size:11px; color:${fill}; min-width:20px;">${score > 0 ? "+" : ""}${score}</span>
    </div>`;
}

function stockBadges(stocks) {
  if (!stocks || stocks.length === 0) return "";
  return `
    <div style="margin: 8px 0;">
      <div style="font-size:11px; color:#64748b; margin-bottom:4px;">Stocks to watch</div>
      <div style="display:flex; flex-wrap:wrap; gap:4px;">
        ${stocks.map(t => `
          <span style="font-size:11px; padding:3px 8px; border-radius:4px;
            background:#0f1117; color:#7dd3fc; border:1px solid #1e3a5f;
            font-weight:600;">
            ${t}
          </span>`).join("")}
      </div>
    </div>`;
}

function card(a) {
  const sign = a.score > 0 ? "+" : "";
  const sentimentIcon = a.sentiment === "Bullish" ? "▲" : a.sentiment === "Bearish" ? "▼" : "●";
  return `
    <div class="card" data-sector="${a.sector || 'Other'}">
      <div class="top">
        <span class="sector">${a.sector || "Other"}</span>
        <span class="score ${scoreClass(a.score)}">${sentimentIcon} ${a.sentiment} ${sign}${a.score}</span>
      </div>
      <h3><a href="${a.url}" target="_blank" rel="noopener">${a.title}</a></h3>
      ${stockBadges(a.affected_stocks)}
      ${scoreBar(a.score)}
      <p class="reason">${a.reason || ""}</p>
      <div class="meta">${a.source?.replace(/_/g," ")} · ${a.published ? new Date(a.published).toLocaleTimeString("en-IN") : ""}</div>
    </div>`;
}

function render() {
  const items = filter === "All"
    ? all
    : all.filter(a => a.sector === filter);

  if (items.length === 0) {
    document.getElementById("grid").innerHTML =
      `<div id="status">No ${filter} news right now. Try another category.</div>`;
    return;
  }

  document.getElementById("grid").innerHTML = items.map(card).join("");
}

function updateCounters() {
  // Update count badges on filter buttons
  document.querySelectorAll(".btn").forEach(btn => {
    const s = btn.dataset.s;
    const count = s === "All"
      ? all.length
      : all.filter(a => a.sector === s).length;
    btn.textContent = count > 0 ? `${s} (${count})` : s;
    // Dim buttons with no news
    btn.style.opacity = (count === 0 && s !== "All") ? "0.4" : "1";
  });
}

function updateRefreshTimer() {
  if (!lastFetchTime) return;
  const nextRefresh = new Date(lastFetchTime + REFRESH_INTERVAL);
  const now = new Date();
  const minsLeft = Math.max(0, Math.round((nextRefresh - now) / 60000));
  document.getElementById("refreshbar").innerHTML =
    `Last updated: ${new Date(lastFetchTime).toLocaleTimeString("en-IN")} &nbsp;·&nbsp;
     Next refresh in: <strong style="color:#a78bfa">${minsLeft} min</strong> &nbsp;·&nbsp;
     <a href="#" onclick="forceRefresh()" style="color:#7dd3fc; text-decoration:none;">Refresh now</a>`;
}

async function load(forceNew = false) {
  document.getElementById("refreshbar").textContent = "Fetching latest news...";
  try {
    const url = forceNew ? `${API}/news?refresh=true` : `${API}/news`;
    const res = await fetch(url);
    if (!res.ok) throw new Error();
    all = await res.json();
    lastFetchTime = Date.now();
    updateCounters();
    render();
    updateRefreshTimer();
    // Update timer every minute
    setInterval(updateRefreshTimer, 60000);
  } catch {
    document.getElementById("grid").innerHTML =
      `<div id="status">❌ Backend is starting up — wait 30 seconds and refresh the page.</div>`;
    document.getElementById("refreshbar").textContent = "Could not connect to backend.";
  }
}

function forceRefresh() {
  document.getElementById("grid").innerHTML =
    `<div id="status">⏳ Fetching fresh news... this takes about 20 seconds.</div>`;
  load(true);
}

document.getElementById("filters").addEventListener("click", e => {
  const s = e.target.dataset.s;
  if (!s) return;
  filter = s;
  document.querySelectorAll(".btn").forEach(b => b.classList.remove("active"));
  e.target.classList.add("active");
  render();
});

// Initial load
load();

// Auto refresh every 60 minutes
setInterval(() => load(true), REFRESH_INTERVAL);
```

6. Click **"Commit changes"** → **"Commit changes"**

---

# Step 4 — Wait for Render to redeploy

After you commit the backend files (`main.py` and `analyzer.py`), Render automatically detects the change and redeploys. This takes about 2-3 minutes.

You can watch it happen:
1. Go to **render.com** → click your `stock-news-backend` service
2. Click the **"Events"** tab
3. You will see "Deploy started" → "Deploy live"

Once it says **Live** again, go to your GitHub Pages website and refresh. You will see:
- Filter buttons showing news counts like `Banking (3)`
- Stock badges directly under each headline
- Impact score bar under the stocks
- A refresh timer in the top bar
- "Refresh now" link to manually force new news

---

# Summary of all changes
```
main.py     → cache now forces fresh fetch when refresh=true
            → filters out non-market-moving news automatically

analyzer.py → forces exact sector names so filters work
            → added is_market_moving field
            → added NSE stock symbols for each sector
            → stricter prompt for better accuracy

app.js      → stock badges now appear directly under headline
            → impact score bar added visually
            → filter buttons show news count per category
            → auto refreshes every 60 minutes
            → manual "Refresh now" button added
            → countdown timer to next refresh
