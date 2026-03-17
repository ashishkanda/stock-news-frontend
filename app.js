const API = "https://stock-news-backend-h2sr.onrender.com"; // ← your Render URL

let all = [];
let filter = "All";

function scoreClass(s) {
  if (s > 0) return "bull";
  if (s < 0) return "bear";
  return "neut";
}

function card(a) {
  const sign = a.score > 0 ? "+" : "";
  return `
    <div class="card">
      <div class="top">
        <span class="sector">${a.sector || "Other"}</span>
        <span class="score ${scoreClass(a.score)}">${a.sentiment} ${sign}${a.score}</span>
      </div>
      <h3><a href="${a.url}" target="_blank" rel="noopener">${a.title}</a></h3>
      <p class="reason">${a.reason || ""}</p>
      <div class="tickers">${(a.affected_stocks||[]).map(t=>`<span class="ticker">${t}</span>`).join("")}</div>
      <div class="meta">${a.source?.replace("_"," ")} · ${a.published ? new Date(a.published).toLocaleTimeString("en-IN") : ""}</div>
    </div>`;
}

function render() {
  const items = filter === "All" ? all : all.filter(a => a.sector === filter);
  document.getElementById("grid").innerHTML = items.length
    ? items.map(card).join("")
    : `<div id="status">No news for ${filter} right now.</div>`;
}

async function load() {
  try {
    const res = await fetch(`${API}/news`);
    if (!res.ok) throw new Error();
    all = await res.json();
    document.getElementById("refreshbar").textContent =
      "Last updated: " + new Date().toLocaleTimeString("en-IN");
    render();
  } catch {
    document.getElementById("grid").innerHTML =
      `<div id="status">❌ Backend is starting up — wait 30 seconds and refresh the page.</div>`;
  }
}

document.getElementById("filters").addEventListener("click", e => {
  const s = e.target.dataset.s;
  if (!s) return;
  filter = s;
  document.querySelectorAll(".btn").forEach(b => b.classList.remove("active"));
  e.target.classList.add("active");
  render();
});

load();
setInterval(load, 5 * 60 * 1000);
Wrote & tested   →    Stored code     →    Render (backend API)
backend code          in 2 repos           GitHub Pages (website)
