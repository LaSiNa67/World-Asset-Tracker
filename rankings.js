const GOLD_OZ = 6.95e9;
const SILVER_OZ = 56.3e9;

const STOCKS = [
  { id: "NVDA", name: "NVIDIA" },
  { id: "AAPL", name: "Apple" },
  { id: "GOOG", name: "Alphabet" },
  { id: "MSFT", name: "Microsoft" },
  { id: "AMZN", name: "Amazon" },
  { id: "TSM", name: "TSMC" },
  { id: "AVGO", name: "Broadcom" },
];

// Used only if Yahoo blocks the browser (common on GitHub Pages).
const STOCK_FALLBACK = {
  NVDA: { price: 209.66, marketCap: 5.078e12, change: null },
  AAPL: { price: 313.45, marketCap: 4.574e12, change: null },
  GOOG: { price: 339.1, marketCap: 4.147e12, change: null },
  MSFT: { price: 496.37, marketCap: 3.685e12, change: null },
  AMZN: { price: 260.28, marketCap: 2.807e12, change: null },
  TSM: { price: 417.69, marketCap: 2.166e12, change: null },
  AVGO: { price: 355.59, marketCap: 1.691e12, change: null },
};

const money = (n) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: n >= 100 ? 2 : 2,
  }).format(n);

const cap = (n) => {
  if (n >= 1e12) return `$${(n / 1e12).toFixed(3)} T`;
  if (n >= 1e9) return `$${(n / 1e9).toFixed(2)} B`;
  return money(n);
};

const pct = (n) => {
  if (n == null || Number.isNaN(n)) return "—";
  return `${n > 0 ? "+" : ""}${n.toFixed(2)}%`;
};

async function metals() {
  const res = await fetch("https://cdn.jsdelivr.net/npm/@fawazahmed0/currency-api@latest/v1/currencies/usd.min.json");
  const data = await res.json();
  const gold = 1 / data.usd.xau;
  const silver = 1 / data.usd.xag;
  return [
    { name: "Gold", type: "Metal", price: gold, marketCap: gold * GOLD_OZ, change: null, stale: false },
    { name: "Silver", type: "Metal", price: silver, marketCap: silver * SILVER_OZ, change: null, stale: false },
  ];
}

async function bitcoin() {
  const res = await fetch(
    "https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=usd&include_market_cap=true&include_24hr_change=true"
  );
  const b = (await res.json()).bitcoin;
  return {
    name: "Bitcoin",
    type: "Crypto",
    price: b.usd,
    marketCap: b.usd_market_cap,
    change: b.usd_24h_change,
    stale: false,
  };
}

async function stocks() {
  try {
    const symbols = STOCKS.map((s) => s.id).join(",");
    const res = await fetch(`https://query1.finance.yahoo.com/v7/finance/quote?symbols=${symbols}`);
    if (!res.ok) throw new Error("yahoo " + res.status);
    const quotes = (await res.json()).quoteResponse.result;
    if (!quotes || !quotes.length) throw new Error("empty quotes");
    return quotes.map((q) => ({
      name: STOCKS.find((s) => s.id === q.symbol)?.name || q.shortName,
      type: "Company",
      price: q.regularMarketPrice,
      marketCap: q.marketCap,
      change: q.regularMarketChangePercent,
      stale: false,
    }));
  } catch (err) {
    console.warn("Stock feed blocked; using fallback", err);
    return STOCKS.map((s) => ({
      name: s.name,
      type: "Company",
      price: STOCK_FALLBACK[s.id].price,
      marketCap: STOCK_FALLBACK[s.id].marketCap,
      change: STOCK_FALLBACK[s.id].change,
      stale: true,
    }));
  }
}

async function load() {
  const status = document.getElementById("status");
  try {
    const [m, btc, eq] = await Promise.all([metals(), bitcoin(), stocks()]);
    const rows = [...m, btc, ...eq]
      .filter((r) => r.marketCap)
      .sort((a, c) => c.marketCap - a.marketCap)
      .slice(0, 10);

    const usedFallback = rows.some((r) => r.stale);
    document.getElementById("rows").innerHTML = rows
      .map(
        (r, i) => `
        <tr>
          <td>${i + 1}</td>
          <td>${r.name}${r.stale ? ' <span class="stale">stale</span>' : ""}</td>
          <td>${r.type}</td>
          <td class="num">${cap(r.marketCap)}</td>
          <td class="num">${money(r.price)}</td>
          <td class="num ${r.change > 0 ? "up" : r.change < 0 ? "down" : ""}">${pct(r.change)}</td>
        </tr>`
      )
      .join("");

    status.textContent = usedFallback
      ? `Updated ${new Date().toLocaleString()} · company rows are fallback (live stock feed blocked)`
      : `Updated ${new Date().toLocaleString()}`;
  } catch (err) {
    console.error(err);
    status.textContent = "Could not load rankings.";
    status.classList.add("error");
  }
}

load();
