const ASSETS = [
  { key: "btc", name: "Bitcoin", unit: "1 BTC" },
  { key: "xau", name: "Gold", unit: "1 troy oz" },
  { key: "xag", name: "Silver", unit: "1 troy oz" },
  { key: "xpt", name: "Platinum", unit: "1 troy oz" },
];

const URLS = [
  "https://cdn.jsdelivr.net/npm/@fawazahmed0/currency-api@latest/v1/currencies/usd.min.json",
  "https://latest.currency-api.pages.dev/v1/currencies/usd.min.json",
];

const cardsEl = document.getElementById("cards");
const statusEl = document.getElementById("status");

function money(n) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: n >= 100 ? 0 : 2,
  }).format(n);
}

function render(prices) {
  cardsEl.innerHTML = ASSETS.map((a) => `
    <article class="card">
      <h2>${a.name}</h2>
      <p class="unit">${a.unit}</p>
      <p class="price">${prices[a.key] != null ? money(prices[a.key]) : "—"}</p>
    </article>
  `).join("");
}

async function fetchUsdTable() {
  let lastError;
  for (const url of URLS) {
    try {
      const res = await fetch(url);
      if (!res.ok) throw new Error(`${res.status} ${url}`);
      const data = await res.json();
      if (!data.usd) throw new Error("Unexpected payload");
      return data;
    } catch (err) {
      lastError = err;
    }
  }
  throw lastError;
}

async function load() {
  statusEl.textContent = "Loading prices…";
  statusEl.classList.remove("error");
  try {
    const data = await fetchUsdTable();
    const usd = data.usd;
    const prices = {};
    for (const a of ASSETS) {
      const perUsd = usd[a.key];
      prices[a.key] = perUsd ? 1 / perUsd : null;
    }
    render(prices);
    statusEl.textContent = `Updated ${data.date ? "as of " + data.date : "just now"} · USD`;
  } catch (err) {
    console.error(err);
    render({});
    statusEl.textContent = "Could not load prices. Check your connection and try again.";
    statusEl.classList.add("error");
  }
}

render({});
load();
setInterval(load, 5 * 60 * 1000);
