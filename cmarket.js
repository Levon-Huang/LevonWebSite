/* =========================================================
   CryptoPlace – market.js
   ---------------------------------------------------------
   Features
   1.  Live price cards (BTC, ETH, DOGE)
   2.  Top-10 market-cap list
   3.  Search-with-suggestions + coin-details panel
   4.  Mobile navbar toggle
   ======================================================= */

   /* ---------- Firebase init (MUST be first!) ------------ */
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

/* auto-sign-in anonymously for now */
auth.onAuthStateChanged((u) => {
  if (u) console.log("Signed in as", u.uid);
  else   auth.signInAnonymously().catch(err => console.error("Anon sign-in failed:", err));
});
/* ------------------------------------------------------ */


   

/* ---------- 1. Live price cards  ----------------------- */
const SPOTLIGHT_API =
  "https://api.coingecko.com/api/v3/coins/markets" +
  "?vs_currency=usd&ids=bitcoin,ethereum,dogecoin";

const cards = {
  bitcoin: document.getElementById("bitcoin-card"),
  ethereum: document.getElementById("ethereum-card"),
  dogecoin: document.getElementById("dogecoin-card"),
};

// Cache spotlight prices and timestamp
let spotlightCache = { data: null, timestamp: 0 };

async function fetchSpotlightPrices() {
  const now = Date.now();
  if (spotlightCache.data && now - spotlightCache.timestamp < 300000) {
    updateSpotlightCards(spotlightCache.data);
    return;
  }

  try {
    const res = await fetch(SPOTLIGHT_API);
    const data = await res.json();

    spotlightCache = { data, timestamp: now };
    updateSpotlightCards(data);
  } catch (err) {
    console.error("Spotlight price fetch failed:", err);
  }
}

function updateSpotlightCards(data) {
  data.forEach((coin) => {
    const id = coin.id;
    const price = coin.current_price.toLocaleString();
    const change = coin.price_change_percentage_24h.toFixed(2);
    const up = change >= 0;

    cards[id].innerHTML = `
      <img src="${coin.image}" alt="${coin.name}" class="coin-icon" loading="lazy" />
      <h2>${coin.name}</h2>
      <p>$${price}</p>
      <span class="change ${up ? "up" : "down"}">
        ${up ? "+" : ""}${change}%
      </span>
    `;
  });
}

fetchSpotlightPrices();
setInterval(fetchSpotlightPrices, 300000); // update every 300 s

/* ---------- 2. Top-10 list  ---------------------------- */
// Cache top coins and timestamp
let topCoinsCache = { data: null, timestamp: 0 };

async function loadTopCoins() {
  const now = Date.now();
  if (topCoinsCache.data && now - topCoinsCache.timestamp < 300000) {
    renderTopCoins(topCoinsCache.data);
    return;
  }

  const url =
    "https://api.coingecko.com/api/v3/coins/markets" +
    "?vs_currency=usd&order=market_cap_desc&per_page=10&page=1";

  try {
    const res = await fetch(url);
    const data = await res.json();

    topCoinsCache = { data, timestamp: now };
    renderTopCoins(data);
  } catch (err) {
    console.error("Error loading top-10 coins:", err);
  }
}

function renderTopCoins(data) {
  const ul = document.getElementById("crypto-ul");
  ul.innerHTML = ""; // clear previous

  // Use DocumentFragment for better performance
  const fragment = document.createDocumentFragment();

  data.forEach((coin) => {
    const change = coin.price_change_percentage_24h?.toFixed(2);
    const up = change >= 0;
    const changeClass = up ? "up" : "down";

    const li = document.createElement("li");
    li.innerHTML = `
      <div class="crypto-name">
        <img src="${coin.image}" alt="${coin.name} icon" loading="lazy" />
        ${coin.name} (${coin.symbol.toUpperCase()})
      </div>
      <div class="crypto-info">
        <span>$${coin.current_price.toLocaleString()}</span>
        <span class="change ${changeClass}">
          ${up ? "+" : ""}${change}%
        </span>
      </div>
    `;

    fragment.appendChild(li);
  });

  ul.appendChild(fragment);
}

loadTopCoins();
setInterval(loadTopCoins, 300000); // refresh every 300s

/* ---------- 3. Search + suggestions + details ---------- */
const inputEl = document.getElementById("coin-input");
const sugBox = document.getElementById("suggestions");
const detailsPanel = document.getElementById("coin-details");
// ---------- modal helpers (define once) ----------
const modal      = document.getElementById("addCoinModal");
const nameEl     = document.getElementById("modal-coin-name");
const investedEl = document.getElementById("invested-input");
const priceEl    = document.getElementById("price-input");
let   currentCoin = null;

document.getElementById("cancel-coin-btn").onclick = closeModal;
document.getElementById("save-coin-btn").onclick   = saveCoin;

function openModal(coin){
  currentCoin = coin;
  nameEl.textContent = `${coin.name} (${coin.symbol.toUpperCase()})`;
  investedEl.value = priceEl.value = "";
  modal.style.display = "flex";
}
function closeModal(){ modal.style.display = "none"; }

async function saveCoin() {
  const user = auth.currentUser;
  if (!user) {
    alert("Sign in first");
    return;
  }

  const invested = +investedEl.value;
  const buy = +priceEl.value;
  if (isNaN(invested) || isNaN(buy) || invested <= 0 || buy <= 0) {
    alert("Enter valid numbers");
    return;
  }

  const newAmount = invested / buy;

  try {
    const assetsRef = db.collection("users").doc(user.uid).collection("assets");
    const querySnapshot = await assetsRef.where("id", "==", currentCoin.id).limit(1).get();

    if (!querySnapshot.empty) {
      // Coin already exists, update it
      const doc = querySnapshot.docs[0];
      const existing = doc.data();

      const updatedAmount = existing.amount + newAmount;
      const updatedInvested = existing.totalInvested + invested;

      await doc.ref.update({
        amount: +updatedAmount.toFixed(6),
        totalInvested: updatedInvested,
        buyPrice: updatedInvested / updatedAmount, // weighted average buy price
        timestamp: firebase.firestore.FieldValue.serverTimestamp(),
      });

      alert(`${currentCoin.name} updated!`);
    } else {
      // Coin does not exist, add new
      const data = {
        id: currentCoin.id,
        name: currentCoin.name,
        symbol: currentCoin.symbol,
        image: currentCoin.image.thumb,
        amount: +newAmount.toFixed(6),
        totalInvested: invested,
        buyPrice: buy,
        type: "crypto",
        timestamp: firebase.firestore.FieldValue.serverTimestamp(),
      };

      await assetsRef.add(data);
      alert(`${currentCoin.name} saved!`);
    }

    closeModal();
  } catch (err) {
    console.error("Save failed:", err);
    alert("Save failed");
  }
}




// Debounce utility
function debounce(fn, delay) {
  let timeout;
  return (...args) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => fn(...args), delay);
  };
}

inputEl.addEventListener("input", debounce(suggestCoins, 300));

document.addEventListener("click", (e) => {
  if (!sugBox.contains(e.target) && e.target !== inputEl) sugBox.innerHTML = "";
});

async function suggestCoins() {
  const query = inputEl.value.trim().toLowerCase();
  if (query.length < 1) {
    sugBox.innerHTML = "";
    return;
  }

  try {
    const res = await fetch(`https://api.coingecko.com/api/v3/search?query=${query}`);
    const data = await res.json();

    sugBox.innerHTML = data.coins
      .slice(0, 6)
      .map(
        (c) => `
        <div onclick="selectCoin('${c.id}')">
          <img src='${c.thumb}' alt='${c.symbol} icon' loading="lazy" style="width:24px; height:24px; margin-right:8px; border-radius:4px;" />
          ${c.name} (${c.symbol.toUpperCase()})
        </div>
      `
      )
      .join("");
  } catch (err) {
    console.error("Suggestion fetch failed:", err);
  }
}

function selectCoin(coinId) {
  inputEl.value = coinId;
  sugBox.innerHTML = "";
  searchCoin();
}

async function searchCoin() {
  const query = inputEl.value.trim().toLowerCase();
  if (!query) return;

  detailsPanel.style.display = "block";
  detailsPanel.innerHTML = "<p>Loading…</p>";

  try {
    // If user typed a symbol like "eth" rather than an id, resolve via /search
    const coinId = await resolveToId(query);
    if (!coinId) throw new Error("Coin not found");

    const res = await fetch(`https://api.coingecko.com/api/v3/coins/${coinId}`);
    if (!res.ok) throw new Error("Coin not found");
    const coin = await res.json();

    const price = coin.market_data.current_price.usd.toLocaleString();
    const change = coin.market_data.price_change_percentage_24h.toFixed(2);
    const up = change >= 0;

    detailsPanel.innerHTML = `
  <div style="display: flex; align-items: center; justify-content: space-between;">
    <div>
      <h2>${coin.name} (${coin.symbol.toUpperCase()})</h2>
      <img src="${coin.image.large}" alt="${coin.name}" style="width:64px" loading="lazy" />
      <p><strong>Current Price:</strong> $${price}</p>
      <p><strong>24 h Change:</strong>
         <span class="${up ? "up" : "down"}">
           ${up ? "+" : ""}${change}%
         </span>
      </p>
      <p><strong>Market Cap:</strong>
         $${coin.market_data.market_cap.usd.toLocaleString()}
      </p>
      <p><strong>Description:</strong>
         ${coin.description.en.split(". ")[0]}.
      </p>
    </div>
    <div>
      <button id="add-coin-btn" style="padding: 8px 16px; font-size: 1rem; cursor: pointer;">Add</button>
    </div>
  </div>
`;

// wire the Add button
document.getElementById("add-coin-btn").onclick = () => openModal(coin);


  } catch (err) {
    detailsPanel.innerHTML = `<p style="color:red;">${err.message || "Lookup failed"}.</p>`;
  }
}

/* Resolve user input to a CoinGecko coin ID */
async function resolveToId(text) {
  // Cache resolved coin IDs to reduce network calls
  if (!resolveToId.cache) resolveToId.cache = new Map();
  if (resolveToId.cache.has(text)) return resolveToId.cache.get(text);

  // First assume they typed an exact ID
  try {
    const test = await fetch(`https://api.coingecko.com/api/v3/coins/${text}`);
    if (test.ok) {
      resolveToId.cache.set(text, text);
      return text;
    }
  } catch {}

  // Otherwise search
  try {
    const s = await fetch(`https://api.coingecko.com/api/v3/search?query=${text}`).then((r) => r.json());
    const id = s.coins.length ? s.coins[0].id : null;
    resolveToId.cache.set(text, id);
    return id;
  } catch {
    resolveToId.cache.set(text, null);
    return null;
  }
}
