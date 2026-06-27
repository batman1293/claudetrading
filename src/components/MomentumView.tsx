"use client";
import { useEffect, useState } from "react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts";

interface Stock {
  ticker: string;
  name: string;
  sector: string;
  price: number;
  change1D: number;
  change1W: number;
  change1M: number;
  change3M: number;
  rsi: number;
  macd: string;
  volume: string;
  avgVolume: string;
  volumeRatio: number;
  revenueGrowth: number;
  profitGrowth: number;
  peRatio: number;
  marketCap: string;
  signal: string;
  reasons: string[];
  technicals: { ema20: number; ema50: number; ema200: number; atr: number };
}

const SIGNAL_COLOR: Record<string, string> = {
  "strong buy": "#22c55e",
  "buy": "#3b82f6",
  "hold": "#f59e0b",
  "sell": "#ef4444",
};

const SIGNAL_BG: Record<string, string> = {
  "strong buy": "#052e16",
  "buy": "#1e3a5f",
  "hold": "#451a03",
  "sell": "#450a0a",
};

function RSIGauge({ rsi }: { rsi: number }) {
  const color = rsi >= 70 ? "#ef4444" : rsi <= 30 ? "#22c55e" : "#f59e0b";
  const label = rsi >= 70 ? "Overbought" : rsi <= 30 ? "Oversold" : "Neutral";
  const pct = (rsi / 100) * 100;
  return (
    <div>
      <div className="flex justify-between text-xs mb-1">
        <span style={{ color: '#6b7280' }}>RSI</span>
        <span style={{ color }}>{rsi} — {label}</span>
      </div>
      <div style={{ background: '#1f2937', borderRadius: 999 }} className="h-2 w-full">
        <div style={{ width: `${pct}%`, background: color, height: '100%', borderRadius: 999, transition: 'width 0.5s' }} />
      </div>
    </div>
  );
}

export default function MomentumView({ market }: { market: string }) {
  const [stocks, setStocks] = useState<Stock[]>([]);
  const [selected, setSelected] = useState<Stock | null>(null);
  const [sortBy, setSortBy] = useState<"change1M" | "change3M" | "rsi" | "revenueGrowth">("change1M");
  const [filter, setFilter] = useState<string>("all");

  useEffect(() => {
    fetch(`/api/momentum?market=${market}`).then((r) => r.json()).then((d) => {
      setStocks(d);
      setSelected(d[0]);
    });
  }, [market]);

  const sectors = ["all", ...Array.from(new Set(stocks.map((s) => s.sector)))];
  const filtered = stocks.filter((s) => filter === "all" || s.sector === filter);
  const sorted = [...filtered].sort((a, b) => (b[sortBy] as number) - (a[sortBy] as number));

  const chartData = sorted.map((s) => ({
    ticker: s.ticker,
    "1M": s.change1M,
    "3M": s.change3M,
  }));

  if (!stocks.length) return <LoadingState />;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-white">Momentum Stock Screener</h2>
        <p className="text-gray-400 text-sm mt-1">
          Stocks showing price momentum + strong fundamentals — {market === "US" ? "🇺🇸 US" : "🇮🇳 India"}
        </p>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-gray-500 text-xs">Sector:</span>
          {sectors.map((s) => (
            <button
              key={s}
              onClick={() => setFilter(s)}
              className="text-xs px-2.5 py-1 rounded-lg capitalize transition-all"
              style={filter === s ? { background: '#2563eb', color: 'white' } : { background: '#1f2937', color: '#9ca3af' }}
            >
              {s}
            </button>
          ))}
        </div>
        <div className="ml-auto flex items-center gap-2">
          <span className="text-gray-500 text-xs">Sort by:</span>
          {[
            { key: "change1M", label: "1M Return" },
            { key: "change3M", label: "3M Return" },
            { key: "rsi", label: "RSI" },
            { key: "revenueGrowth", label: "Rev Growth" },
          ].map((opt) => (
            <button
              key={opt.key}
              onClick={() => setSortBy(opt.key as typeof sortBy)}
              className="text-xs px-2.5 py-1 rounded-lg transition-all"
              style={sortBy === opt.key ? { background: '#374151', color: 'white' } : { background: '#1f2937', color: '#6b7280' }}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-5 gap-6">
        {/* Stock Table */}
        <div className="xl:col-span-3">
          <div style={{ background: '#111827', border: '1px solid #1f2937' }} className="rounded-xl overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr style={{ background: '#1f2937', borderBottom: '1px solid #374151' }}>
                  <th className="text-left px-4 py-3 text-gray-400 font-semibold text-xs">STOCK</th>
                  <th className="text-right px-3 py-3 text-gray-400 font-semibold text-xs">1D</th>
                  <th className="text-right px-3 py-3 text-gray-400 font-semibold text-xs">1M</th>
                  <th className="text-right px-3 py-3 text-gray-400 font-semibold text-xs">3M</th>
                  <th className="text-right px-3 py-3 text-gray-400 font-semibold text-xs">RSI</th>
                  <th className="text-right px-4 py-3 text-gray-400 font-semibold text-xs">SIGNAL</th>
                </tr>
              </thead>
              <tbody>
                {sorted.map((stock) => (
                  <tr
                    key={stock.ticker}
                    onClick={() => setSelected(stock)}
                    className="cursor-pointer border-t transition-all"
                    style={{
                      borderColor: '#1f2937',
                      background: selected?.ticker === stock.ticker ? '#1e2a3a' : 'transparent',
                    }}
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div>
                          <div className="text-white font-mono font-bold text-sm">{stock.ticker}</div>
                          <div className="text-gray-500 text-xs truncate max-w-[120px]">{stock.name}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-3 py-3 text-right">
                      <span className={stock.change1D >= 0 ? "text-green-400" : "text-red-400"}>
                        {stock.change1D >= 0 ? "+" : ""}{stock.change1D}%
                      </span>
                    </td>
                    <td className="px-3 py-3 text-right">
                      <span className={stock.change1M >= 0 ? "text-green-400" : "text-red-400"}>
                        {stock.change1M >= 0 ? "+" : ""}{stock.change1M}%
                      </span>
                    </td>
                    <td className="px-3 py-3 text-right">
                      <span className={stock.change3M >= 0 ? "text-green-400" : "text-red-400"}>
                        {stock.change3M >= 0 ? "+" : ""}{stock.change3M}%
                      </span>
                    </td>
                    <td className="px-3 py-3 text-right">
                      <span className={`font-semibold ${stock.rsi >= 70 ? "text-red-400" : stock.rsi <= 30 ? "text-green-400" : "text-yellow-400"}`}>
                        {stock.rsi}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <span
                        className="text-xs px-2 py-0.5 rounded-full font-semibold capitalize"
                        style={{
                          color: SIGNAL_COLOR[stock.signal] || '#9ca3af',
                          background: SIGNAL_BG[stock.signal] || '#1f2937',
                        }}
                      >
                        {stock.signal}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Chart */}
          <div style={{ background: '#111827', border: '1px solid #1f2937' }} className="rounded-xl p-4 mt-4">
            <h4 className="text-white font-semibold text-sm mb-3">1M vs 3M Performance Comparison</h4>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={chartData} margin={{ left: -10 }}>
                <XAxis dataKey="ticker" tick={{ fill: '#9ca3af', fontSize: 11 }} />
                <YAxis tick={{ fill: '#9ca3af', fontSize: 11 }} />
                <Tooltip
                  contentStyle={{ background: '#1f2937', border: '1px solid #374151', borderRadius: 8 }}
                  formatter={(v: unknown) => [`${v}%`]}
                />
                <Bar dataKey="1M" fill="#3b82f6" radius={[2, 2, 0, 0]} />
                <Bar dataKey="3M" fill="#22c55e" radius={[2, 2, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Stock Detail */}
        {selected && (
          <div className="xl:col-span-2 space-y-4">
            <div style={{ background: '#111827', border: '1px solid #1f2937' }} className="rounded-xl p-5 sticky top-20">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <div className="text-white text-2xl font-mono font-bold">{selected.ticker}</div>
                  <div className="text-gray-400 text-sm">{selected.name}</div>
                  <div className="text-gray-500 text-xs">{selected.sector}</div>
                </div>
                <span
                  className="text-sm px-3 py-1 rounded-full font-bold capitalize"
                  style={{
                    color: SIGNAL_COLOR[selected.signal] || '#9ca3af',
                    background: SIGNAL_BG[selected.signal] || '#1f2937',
                  }}
                >
                  {selected.signal.toUpperCase()}
                </span>
              </div>

              {/* Price */}
              <div className="mb-4">
                <span className="text-white text-3xl font-bold">
                  {market === "IN" ? "₹" : "$"}{selected.price.toLocaleString()}
                </span>
                <span className={`ml-2 text-lg font-semibold ${selected.change1D >= 0 ? "text-green-400" : "text-red-400"}`}>
                  {selected.change1D >= 0 ? "▲" : "▼"} {Math.abs(selected.change1D)}%
                </span>
              </div>

              {/* Performance strip */}
              <div className="grid grid-cols-3 gap-2 mb-4">
                {[
                  { label: "1M", val: selected.change1M },
                  { label: "3M", val: selected.change3M },
                  { label: "Rev Gr", val: selected.revenueGrowth },
                ].map((m) => (
                  <div key={m.label} style={{ background: '#1f2937' }} className="rounded-lg p-2 text-center">
                    <div className={`font-bold text-sm ${m.val >= 0 ? "text-green-400" : "text-red-400"}`}>
                      +{m.val}%
                    </div>
                    <div className="text-gray-600 text-xs">{m.label}</div>
                  </div>
                ))}
              </div>

              {/* RSI */}
              <div className="mb-4">
                <RSIGauge rsi={selected.rsi} />
              </div>

              {/* MACD */}
              <div className="flex justify-between items-center mb-4 text-sm">
                <span className="text-gray-500">MACD</span>
                <span className={selected.macd.includes("bullish") ? "text-green-400" : "text-red-400"} style={{ fontWeight: 600 }}>
                  {selected.macd.toUpperCase()}
                </span>
              </div>

              {/* Volume */}
              <div className="flex justify-between items-center mb-4 text-sm">
                <span className="text-gray-500">Volume (vs Avg)</span>
                <span className={selected.volumeRatio > 1.3 ? "text-yellow-400" : "text-gray-300"}>
                  {selected.volume} ({selected.volumeRatio}x)
                </span>
              </div>

              {/* Technicals */}
              <div style={{ background: '#0f1117' }} className="rounded-lg p-3 mb-4 text-xs space-y-1.5">
                <div className="text-gray-400 font-semibold uppercase mb-2">Technical Levels</div>
                {[
                  { label: "EMA 20", val: selected.technicals.ema20 },
                  { label: "EMA 50", val: selected.technicals.ema50 },
                  { label: "EMA 200", val: selected.technicals.ema200 },
                  { label: "ATR", val: selected.technicals.atr },
                ].map((t) => (
                  <div key={t.label} className="flex justify-between">
                    <span className="text-gray-500">{t.label}</span>
                    <span className="text-gray-300 font-mono">{market === "IN" ? "₹" : "$"}{t.val.toLocaleString()}</span>
                  </div>
                ))}
              </div>

              {/* Fundamental */}
              <div className="flex gap-3 mb-4 text-xs">
                <div style={{ background: '#1f2937' }} className="rounded-lg p-2 flex-1 text-center">
                  <div className="text-purple-400 font-bold">{selected.peRatio}x</div>
                  <div className="text-gray-600">P/E</div>
                </div>
                <div style={{ background: '#1f2937' }} className="rounded-lg p-2 flex-1 text-center">
                  <div className="text-blue-400 font-bold">+{selected.profitGrowth}%</div>
                  <div className="text-gray-600">Net Profit Gr</div>
                </div>
                <div style={{ background: '#1f2937' }} className="rounded-lg p-2 flex-1 text-center">
                  <div className="text-gray-300 font-bold">{selected.marketCap}</div>
                  <div className="text-gray-600">Mkt Cap</div>
                </div>
              </div>

              {/* Buy reasons */}
              <div>
                <div className="text-gray-400 text-xs font-semibold uppercase mb-2">Why It's in Momentum</div>
                <div className="space-y-1.5">
                  {selected.reasons.map((r, i) => (
                    <div key={i} className="flex items-start gap-2 text-sm text-gray-300">
                      <span className="text-green-400 shrink-0 mt-0.5">✓</span>
                      {r}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function LoadingState() {
  return (
    <div className="space-y-3 animate-pulse">
      {[1, 2, 3, 4].map((i) => (
        <div key={i} style={{ background: '#111827' }} className="rounded-xl h-16"></div>
      ))}
    </div>
  );
}
