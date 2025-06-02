
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.11.0/firebase-app.js";
import {
  getFirestore,
  collection,
  getDocs,
  doc,
  updateDoc,
  deleteDoc,
} from "https://www.gstatic.com/firebasejs/10.11.0/firebase-firestore.js";
import {
  getAuth,
  onAuthStateChanged,
  signInAnonymously,
} from "https://www.gstatic.com/firebasejs/10.11.0/firebase-auth.js";

const firebaseConfig = {
  apiKey: "AIzaSyAEuVGWjQc9jsdK6MxhgDCyuGtVHK49evo",
  authDomain: "myweb-455da.firebaseapp.com",
  projectId: "myweb-455da",
  storageBucket: "myweb-455da.appspot.com",
  messagingSenderId: "589487771494",
  appId: "1:589487771494:web:98f6e38c403526f47d02a7",
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

// 🚨 Restrict access to signed-in users only
onAuthStateChanged(auth, (user) => {
  if (!user) {
    // Not signed in: redirect to sign page
    alert("Please sign in to access your portfolio.");
    window.location.href = "sign.html";
  }
});

let crypto = [];
let stocks = [];

async function fetchCryptoPrice(symbol) {
  const response = await fetch(
    `https://api.coingecko.com/api/v3/simple/price?ids=${symbol}&vs_currencies=usd`
  );
  const data = await response.json();
  return data[symbol]?.usd || 0;
}

async function fetchStockPrice(symbol) {
  const apiKey = "d0rbm5hr01qn4tjhmll0d0rbm5hr01qn4tjhmllg";
  const response = await fetch(
    `https://finnhub.io/api/v1/quote?symbol=${symbol}&token=${apiKey}`
  );
  const data = await response.json();
  return data.c || 0;
}

signInAnonymously(auth).catch((error) => {
  console.error("Auth error:", error);
});

function openEditForm(docId, type) {
  const asset = (type === "crypto" ? crypto : stocks).find((a) => a.docId === docId);
  if (!asset) return;

  document.getElementById("edit-id").value = docId; // use docId
  document.getElementById("edit-type").value = type;
  document.getElementById("edit-name").value = asset.name;
  document.getElementById("edit-buyPrice").value = asset.buyPrice;
  document.getElementById("edit-amount").value = asset.amount || asset.shares;

  document.getElementById("edit-form-modal").classList.remove("hidden");
}


window.closeEditForm = function () {
  document.getElementById("edit-form-modal").classList.add("hidden");

};

document.getElementById("edit-form").onsubmit = async (e) => {
  e.preventDefault();

  const docId = document.getElementById("edit-id").value;
  const type = document.getElementById("edit-type").value;
  const buyPrice = parseFloat(document.getElementById("edit-buyPrice").value);
  const inputMode = document.getElementById("edit-input-mode").value;
  const inputValue = parseFloat(document.getElementById("edit-amount").value);
  const uid = auth.currentUser.uid;

  // Convert USD to units if needed
  let amount;
  if (inputMode === "usd") {
    amount = inputValue / buyPrice;
  } else {
    amount = inputValue;
  }

  const assetRef = doc(db, "users", uid, "assets", docId);

  await updateDoc(assetRef, {
    buyPrice,
    [type === "crypto" ? "amount" : "shares"]: amount,
    totalInvested: buyPrice * amount,
  });

  closeEditForm();
  loadAssets();
};



async function deleteAsset(docId, type) {
  if (!confirm("Are you sure you want to delete this asset?")) return;

  const uid = auth.currentUser.uid;
  const assetRef = doc(db, "users", uid, "assets", docId);
  await deleteDoc(assetRef);
  loadAssets();
}


async function loadAssets() {
  const user = auth.currentUser;
  if (!user) return;

  const assetRef = collection(db, "users", user.uid, "assets");
  const querySnapshot = await getDocs(assetRef);

  stocks = [];
  crypto = [];

  for (const docSnap of querySnapshot.docs) {
    const asset = docSnap.data();
    asset.docId = docSnap.id; // ✅ Keeps Firestore doc ID separately


    if (asset.type === "crypto") {
      asset.price = await fetchCryptoPrice(asset.id);
      crypto.push(asset);
    } else if (asset.type === "stock") {
      asset.price = await fetchStockPrice(asset.symbol);
      stocks.push(asset);
    }
  }

  renderAssets(stocks, "stocks-list");
  renderAssets(crypto, "crypto-list");
  updateSummary(stocks, crypto);
}

async function renderAssets(data, containerId) {
  const container = document.getElementById(containerId);
  container.innerHTML = "";

  for (const asset of data) {
    const isCrypto = asset.type === "crypto";
    const amount = isCrypto ? asset.amount : asset.shares;
    const imageUrl = isCrypto ? asset.image : asset.logo;
    const name = asset.name;
    const symbol = asset.symbol.toUpperCase();
    const buyPrice = asset.buyPrice || 0;
    const totalInvested = asset.totalInvested || 0;

    const currentPrice = isCrypto
      ? await fetchCryptoPrice(asset.id)
      : await fetchStockPrice(symbol);

    const currentValue = currentPrice * amount;
    const profitLoss = currentValue - totalInvested;
    const change = totalInvested === 0 ? 0 : (profitLoss / totalInvested) * 100;
    const isPositive = change >= 0;

    const div = document.createElement("div");
    div.className = "asset-row";
    div.innerHTML = `
      <div class="asset-top">
        <div class="asset-left">
          <img src="${imageUrl}" alt="${name}" class="asset-icon" />
          <div class="asset-info">
            <div class="asset-name">${name}</div>
            <div class="asset-symbol">${symbol}</div>
          </div>
        </div>
        <div class="asset-price">$${currentPrice.toFixed(2)}</div>
      </div>
      <div class="asset-bottom">
        <div>${isCrypto ? "Amount" : "Shares"}: ${amount.toFixed(4)}</div>
        <div>Average price: $${buyPrice.toFixed(2)}</div>
        <div>Invested: $${totalInvested.toFixed(2)}</div>
        <div>Value: $${currentValue.toFixed(2)}</div>
        <div>
          P/L:
          <span class="${isPositive ? "positive" : "negative"}">
            ${isPositive ? "+" : ""}$${profitLoss.toFixed(2)} (${change.toFixed(2)}%)
          </span>
        </div>
      </div>
      <div class="asset-actions">
        <button class="edit-btn" data-id="${asset.id}" data-type="${asset.type}">Edit</button>
        <button class="delete-btn" data-id="${asset.id}" data-type="${asset.type}">Delete</button>
      </div>
    `;

    container.appendChild(div);

    div.querySelector(".edit-btn").onclick = () =>
      openEditForm(asset.docId, asset.type);

    div.querySelector(".delete-btn").onclick = () =>
      deleteAsset(asset.docId, asset.type);

  }
}

async function updateSummary(stocks, crypto) {
  let totalStock = 0,
    investedStock = 0;
  let totalCrypto = 0,
    investedCrypto = 0;

  for (const a of stocks) {
    const currentPrice = await fetchStockPrice(a.symbol);
    investedStock += a.totalInvested || 0;
    totalStock += currentPrice * (a.shares || 0);
  }

  for (const a of crypto) {
    const currentPrice = await fetchCryptoPrice(a.id);
    investedCrypto += a.totalInvested || 0;
    totalCrypto += currentPrice * (a.amount || 0);
  }

  const totalInvested = investedStock + investedCrypto;
  const totalValue = totalStock + totalCrypto;
  const returnPct =
    totalInvested === 0
      ? 0
      : ((totalValue - totalInvested) / totalInvested) * 100;

  document.getElementById("sum-stock").textContent = `$${totalStock.toFixed(2)}`;
  document.getElementById("sum-crypto").textContent = `$${totalCrypto.toFixed(2)}`;
  document.getElementById("sum-invested").textContent = `$${totalInvested.toFixed(2)}`;
  document.getElementById("sum-value").textContent = `$${totalValue.toFixed(2)}`;

  const returnEl = document.getElementById("sum-return");
  returnEl.textContent = `${returnPct.toFixed(2)}%`;
  returnEl.className = returnPct >= 0 ? "positive" : "negative";
}

document.getElementById("stocks-btn").onclick = () => {
  document.getElementById("stocks-btn").classList.add("active");
  document.getElementById("crypto-btn").classList.remove("active");
  document.getElementById("stocks-section").classList.add("active");
  document.getElementById("crypto-section").classList.remove("active");
};

document.getElementById("crypto-btn").onclick = () => {
  document.getElementById("crypto-btn").classList.add("active");
  document.getElementById("stocks-btn").classList.remove("active");
  document.getElementById("crypto-section").classList.add("active");
  document.getElementById("stocks-section").classList.remove("active");
};

onAuthStateChanged(auth, (user) => {
  if (user) {
    loadAssets();
  }
});


