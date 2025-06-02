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

   /* ---------- Firebase init (must run first) ---------- */
const firebaseConfig = {
  apiKey: "AIzaSyAEuVGWjQc9jsdK6MxhgDCyuGtVHK49evo",
    authDomain: "myweb-455da.firebaseapp.com",
    projectId: "myweb-455da",
    storageBucket: "myweb-455da.appspot.com",
    messagingSenderId: "589487771494",
    appId: "1:589487771494:web:98f6e38c403526f47d02a7",
};

firebase.initializeApp(firebaseConfig);
const db   = firebase.firestore();
const auth = firebase.auth();

/* sign-in anonymously so writes work (swap to real auth later) */
auth.onAuthStateChanged((u) => {
  if (u) console.log("Signed in as", u.uid);
  else   auth.signInAnonymously().catch(err => console.error("Anon sign-in failed:", err));
});
/* ---------------------------------------------------- */



/*------------------------------------------------------------------------------------------ */
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
/* ---------- modal helpers (stocks) ------------------- */
const modal      = document.getElementById("addCoinModal");   // reuse same modal
const nameEl     = document.getElementById("modal-coin-name");
const sharesEl   = document.getElementById("invested-input"); // we’ll treat as “shares”
const priceEl    = document.getElementById("price-input");    // average buy price
let   currentStock = null;

document.getElementById("cancel-coin-btn").onclick = closeModal;
document.getElementById("save-coin-btn").onclick   = saveStock;

function openModal(stock) {
  currentStock = stock;
  nameEl.textContent = `${stock.symbol} — add position`;
  sharesEl.value = priceEl.value = "";
  modal.style.display = "flex";
}
function closeModal() { modal.style.display = "none"; }

async function saveStock() {
  const user = auth.currentUser;
  if (!user) {
    alert("Please sign in first");
    return;
  }

  const shares = +sharesEl.value;
  const buy = +priceEl.value;
  if (isNaN(shares) || isNaN(buy) || shares <= 0 || buy <= 0) {
    alert("Enter valid numbers");
    return;
  }

  const newInvested = shares * buy;
  const symbol = currentStock.symbol;

  try {
    const assetsRef = db.collection("users").doc(user.uid).collection("assets");
    const querySnap = await assetsRef.where("symbol", "==", symbol).where("type", "==", "stock").get();

    if (!querySnap.empty) {
      // Update the existing document
      const doc = querySnap.docs[0];
      const data = doc.data();

      const totalShares = data.shares + shares;
      const newTotalInvested = data.totalInvested + newInvested;
      const newAvgPrice = newTotalInvested / totalShares;

      await doc.ref.update({
        shares: totalShares,
        totalInvested: newTotalInvested,
        buyPrice: newAvgPrice,
        timestamp: firebase.firestore.FieldValue.serverTimestamp()
      });

      alert(`${symbol} updated!`);
    } else {
      // Create a new document
      const docData = {
        symbol: currentStock.symbol,
        name: currentStock.name || currentStock.symbol,
        logo: currentStock.logo || "",
        shares,
        buyPrice: buy,
        totalInvested: newInvested,
        type: "stock",
        timestamp: firebase.firestore.FieldValue.serverTimestamp()
      };

      await assetsRef.add(docData);
      alert(`${symbol} added!`);
    }

    closeModal();
  } catch (err) {
    console.error(err);
    alert("Save failed");
  }
}




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


    document.getElementById("add-stock").onclick = () =>
  openModal({ symbol: sym, name: p.name, logo: p.logo });


  } catch (e) {
    details.innerHTML = `<p style="color:red;">${e.message}</p>`;
  }
}

/* Keep inline onclick="searchCoin()" working */
window.searchCoin = searchCoin;
