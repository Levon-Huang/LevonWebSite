/* =========================================================
   StockPlace – smarket.js
   ---------------------------------------------------------
   Re-uses the same IDs/classes as your crypto script so the
   HTML stays unchanged.
   Features
   1. Live price cards (AAPL, NVDA, GOOGL)
   2. Top-10 list (hard-coded symbols, live quotes)
   3. Search-with-suggestions + details panel with logos
   ======================================================= */

const API_KEY = "d0rbm5hr01qn4tjhmll0d0rbm5hr01qn4tjhmllg";  // <<< Replace with your key
const BASE    = "https://finnhub.io/api/v1";

/* ---------- 1. Live price cards ----------------------- */
const SPOTLIGHT = ["AAPL", "NVDA", "GOOGL"];
const cardMap   = {
  AAPL : document.getElementById("bitcoin-card"),   // first card
  NVDA : document.getElementById("ethereum-card"),  // second card
  GOOGL: document.getElementById("dogecoin-card"),  // third  card
};

async function fetchQuote(sym) {
  const r = await fetch(`${BASE}/quote?symbol=${sym}&token=${API_KEY}`);
  if (!r.ok) throw new Error("API error");
  return r.json();
}

async function fetchProfile(sym) {
  const r = await fetch(`${BASE}/stock/profile2?symbol=${sym}&token=${API_KEY}`);
  return r.ok ? r.json() : {};
}

async function loadSpotlight() {
  try {
    const data = await Promise.all(
      SPOTLIGHT.map((s) => Promise.all([fetchQuote(s), fetchProfile(s)]))
    );

    data.forEach(([q, p], i) => {
      const sym   = SPOTLIGHT[i];
      const card  = cardMap[sym];
      if (!card) return;

      const price   = q.c?.toFixed(2) ?? "--";
      const pct     = ((q.c - q.pc) / q.pc * 100).toFixed(2);
      const up      = pct >= 0;
      const display = p.name || sym;
      const logo    = p.logo || "";

      card.innerHTML = `
        <h2>
          <img src="${logo}" alt="${display} logo" style="height:24px; vertical-align:middle; margin-right:8px; border-radius:4px;">
          ${display}
        </h2>
        <p>$${price}</p>
        <span class="change ${up ? "up" : "down"}">
          ${up ? "+" : ""}${pct}%
        </span>`;
    });
  } catch (e) {
    console.error("Spotlight load error:", e);
  }
}

loadSpotlight();
setInterval(loadSpotlight, 300_000);           // update every 5 min

/* ---------- 2. Top-10 list ---------------------------- */
const TOP10 = [
  "AAPL","MSFT","AMZN","NVDA","GOOGL",
  "META","TSLA","BRK.B","V","JNJ"
];

async function loadTop() {
  const ul = document.getElementById("crypto-ul");
  ul.innerHTML = "";

  for (const sym of TOP10) {
    try {
      const [q, p] = await Promise.all([fetchQuote(sym), fetchProfile(sym)]);
      const pct = ((q.c - q.pc) / q.pc * 100).toFixed(2);
      const up  = pct >= 0;
      const logo = p.logo || "";

      const li = document.createElement("li");
      li.innerHTML = `
        <div class="crypto-name">
          <img src="${logo}" alt="${sym} logo" style="height:20px; vertical-align:middle; margin-right:6px; border-radius:3px;">
          ${sym}
        </div>
        <div class="crypto-info">
          <span>$${q.c.toFixed(2)}</span>
          <span class="change ${up ? "up" : "down"}">
            ${up ? "+" : ""}${pct}%
          </span>
        </div>`;
      ul.appendChild(li);
    } catch {
      /* skip symbol if API failed */
    }
  }
}

loadTop();
setInterval(loadTop, 300_000);

/* ---------- 3. Search + suggestions + details -------- */
const inputEl  = document.getElementById("coin-input");   // keeping original ID
const sugBox   = document.getElementById("suggestions");
const details  = document.getElementById("coin-details");

function debounce(fn, d = 300) {
  let t; return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), d); };
}

inputEl.addEventListener("input", debounce(suggestCoins, 300));
document.addEventListener("click", (e) => {
  if (!sugBox.contains(e.target) && e.target !== inputEl) sugBox.innerHTML = "";
});

async function suggestCoins() {
  const q = inputEl.value.trim().toUpperCase();
  if (!q) return (sugBox.innerHTML = "");

  try {
    const r  = await fetch(`${BASE}/search?q=${q}&token=${API_KEY}`);
    const { result } = await r.json();

    // Fetch profiles for each result (limit to 6)
    const sliced = result.slice(0, 6);
    const profiles = await Promise.all(
      sliced.map(s => fetch(`${BASE}/stock/profile2?symbol=${s.symbol}&token=${API_KEY}`).then(res => res.json()))
    );

    sugBox.innerHTML = sliced.map((s, i) => {
      const logo = profiles[i].logo || "https://via.placeholder.com/24";  // fallback icon
      return `
        <div onclick="selectCoin('${s.symbol}')" style="display:flex; align-items:center; cursor:pointer; padding:4px 8px;">
          <img src="${logo}" alt="${s.symbol} logo" style="width:24px; height:24px; margin-right:8px; border-radius:4px;">
          ${s.description} (${s.symbol})
        </div>`;
    }).join("");

  } catch (e) {
    console.error("Suggest error:", e);
  }
}


function selectCoin(symbol) {
  inputEl.value = symbol;
  sugBox.innerHTML = "";
  searchCoin();                                     // call below
}

async function searchCoin() {
  const sym = inputEl.value.trim().toUpperCase();
  if (!sym) return;

  details.style.display = "block";
  details.innerHTML = "<p>Loading…</p>";

  try {
    const [q, p] = await Promise.all([fetchQuote(sym), fetchProfile(sym)]);
    if (!q.c) throw new Error("Symbol not found");

    const pct = ((q.c - q.pc) / q.pc * 100).toFixed(2);
    const up  = pct >= 0;
    const logo = p.logo || "";

    details.innerHTML = `
  <div style="display:flex; justify-content:space-between; align-items:flex-start;">
    <div>
      <h2>
        <img src="${logo}" alt="${p.name || sym} logo" style="height:28px; vertical-align:middle; margin-right:8px; border-radius:4px;">
        ${p.name || sym} (${sym})
      </h2>
      <p><strong>Price:</strong> $${q.c.toFixed(2)}</p>
      <p><strong>24h Change:</strong>
        <span class="${up ? "up" : "down"}">${up ? "+" : ""}${pct}%</span></p>
      <p><strong>Open:</strong> $${q.o.toFixed(2)}</p>
      <p><strong>High:</strong> $${q.h.toFixed(2)}</p>
      <p><strong>Low :</strong> $${q.l.toFixed(2)}</p>
      <p><strong>Prev Close:</strong> $${q.pc.toFixed(2)}</p>
    </div>
    <button id="add-stock" style="padding:8px 16px; margin-top: 60px;">Add</button>
  </div>`;


    document.getElementById("add-stock")
            .onclick = () => alert(`Added ${sym}!`);
  } catch (e) {
    details.innerHTML = `<p style="color:red;">${e.message}</p>`;
  }
}

/* Keep inline onclick="searchCoin()" working */
window.searchCoin = searchCoin;
