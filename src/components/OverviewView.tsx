"use client";
import { useEffect, useState } from "react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, LineChart, Line } from "recharts";

const MARKET_INDICES = {
  US: [
    { name: "S&P 500", value: "5,842", change: 1.24, ytd: 18.4 },
    { name: "NASDAQ", value: "18,642", change: 1.82, ytd: 24.8 },
    { name: "DOW", value: "43,128", change: 0.84, ytd: 12.2 },
    { name: "VIX", value: "14.2", change: -4.2, ytd: -18.6 },
  ],
  IN: [
    { name: "NIFTY 50", value: "24,486", change: 0.84, ytd: 14.2 },
    { name: "SENSEX", value: "80,248", change: 0.78, ytd: 13.8 },
    { name: "NIFTY BANK", value: "52,842", change: 1.24, ytd: 18.6 },
    { name: "MIDCAP 150", value: "18,642", change: 1.48, ytd: 28.4 },
  ],
};

const SECTOR_PERF = {
  US: [
    { sector: "Technology", perf: 42.1, color: "#3b82f6" },
    { sector: "Energy", perf: 28.4, color: "#f59e0b" },
    { sector: "Financials", perf: 26.8, color: "#8b5cf6" },
    { sector: "Healthcare", perf: 18.4, color: "#22c55e" },
    { sector: "Industrials", perf: 16.2, color: "#06b6d4" },
    { sector: "Consumer", perf: 8.4, color: "#f97316" },
    { sector: "Utilities", perf: -2.4, color: "#ef4444" },
    { sector: "REITs", perf: -4.8, color: "#ef4444" },
  ],
  IN: [
    { sector: "Defence", perf: 82.4, color: "#3b82f6" },
    { sector: "Realty", perf: 62.4, color: "#8b5cf6" },
    { sector: "Capital Goods", perf: 48.2, color: "#f59e0b" },
    { sector: "PSU Banks", perf: 42.6, color: "#22c55e" },
    { sector: "Pharma", perf: 32.4, color: "#06b6d4" },
    { sector: "IT", perf: 24.6, color: "#f97316" },
    { sector: "FMCG", perf: 8.2, color: "#9ca3af" },
    { sector: "Metals", perf: -4.2, color: "#ef4444" },
  ],
};

const TOP_MOVERS = {
  US: [
    { ticker: "NVDA", change: 18.6, signal: "strong buy" },
    { ticker: "CEG", change: 28.4, signal: "strong buy" },
    { ticker: "VRT", change: 22.4, signal: "strong buy" },
    { ticker: "AXON", change: 24.8, signal: "strong buy" },
  ],
  IN: [
    { ticker: "KAYNES", change: 28.4, signal: "strong buy" },
    { ticker: "HAL", change: 22.8, signal: "strong buy" },
    { ticker: "DIXON", change: 24.4, signal: "strong buy" },
    { ticker: "ADANIGREEN", change: 18.4, signal: "buy" },
  ],
};

const MARKET_THEMES = {
  US: [
    { theme: "AI Infrastructure", strength: 95, trend: "↑", desc: "NVDA, AVGO, VRT, CEG absorbing massive institutional flows" },
    { theme: "Nuclear Energy", strength: 88, trend: "↑", desc: "Hyperscaler PPA deals driving clean baseload demand" },
    { theme: "Defense Tech", strength: 82, trend: "↑", desc: "AXON, LMT, RTX riding multi-year defence spending cycle" },
    { theme: "GLP-1 Drugs", strength: 78, trend: "↑", desc: "LLY, NVO monopoly on weight-loss market expansion" },
    { theme: "China Decoupling", strength: 72, trend: "↑", desc: "Supply chain reshoring into US, India, Mexico" },
  ],
  IN: [
    { theme: "Atmanirbhar Defence", strength: 96, trend: "↑", desc: "HAL, BEL, MTAR on multi-year export + domestic order tailwind" },
    { theme: "India Semiconductor", strength: 90, trend: "↑", desc: "Tata + Micron fabs; DIXON, KAYNES as EMS leaders" },
    { theme: "Green Energy", strength: 84, trend: "↑", desc: "500GW by 2030 — ADANIGREEN, TATAPOWER, NTPC" },
    { theme: "PLI Manufacturing", strength: 80, trend: "↑", desc: "FDI inflows into auto, pharma, electronics PLI schemes" },
    { theme: "Capex Upcycle", strength: 76, trend: "↑", desc: "Govt ₹11L Cr infra spend; L&T, Siemens, ABB order books" },
  ],
};

export default function OverviewView({ market, onNavigate }: { market: string; onNavigate: (tab: string) => void }) {
  const market_key = market as "US" | "IN";
  const indices = MARKET_INDICES[market_key];
  const sectorPerf = SECTOR_PERF[market_key];
  const movers = TOP_MOVERS[market_key];
  const themes = MARKET_THEMES[market_key];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-xl font-bold text-white">
            Market Overview — {market === "US" ? "🇺🇸 United States" : "🇮🇳 India"}
          </h2>
          <p className="text-gray-400 text-sm mt-1">
            {new Date().toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
          </p>
        </div>
        <div style={{ background: '#1e3a5f', border: '1px solid #3b82f6', borderRadius: 8 }} className="px-3 py-2 text-sm text-blue-300">
          <span className="text-blue-400 font-bold">Market Status:</span> Regular Trading Hours
        </div>
      </div>

      {/* Market Indices */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {indices.map((idx) => (
          <div key={idx.name} style={{ background: '#111827', border: '1px solid #1f2937' }} className="rounded-xl p-4">
            <div className="text-gray-400 text-xs font-semibold mb-1">{idx.name}</div>
            <div className="text-white text-xl font-bold">{idx.value}</div>
            <div className="flex items-center justify-between mt-1">
              <span className={`text-sm font-semibold ${idx.change >= 0 ? "text-green-400" : "text-red-400"}`}>
                {idx.change >= 0 ? "▲" : "▼"} {Math.abs(idx.change)}%
              </span>
              <span className={`text-xs ${idx.ytd >= 0 ? "text-green-600" : "text-red-600"}`}>
                YTD {idx.ytd >= 0 ? "+" : ""}{idx.ytd}%
              </span>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Sector Performance */}
        <div className="lg:col-span-2" style={{ background: '#111827', border: '1px solid #1f2937', borderRadius: 12 }} >
          <div className="p-4 border-b border-gray-800">
            <div className="flex items-center justify-between">
              <h3 className="text-white font-semibold">Sector Performance (1Y)</h3>
              <button
                onClick={() => onNavigate("sectors")}
                className="text-blue-400 text-xs hover:text-blue-300 transition-colors"
              >
                Full Analysis →
              </button>
            </div>
          </div>
          <div className="p-4">
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={sectorPerf} layout="vertical" margin={{ left: 20 }}>
                <XAxis type="number" tick={{ fill: '#9ca3af', fontSize: 11 }} unit="%" />
                <YAxis type="category" dataKey="sector" width={90} tick={{ fill: '#9ca3af', fontSize: 12 }} />
                <Tooltip
                  contentStyle={{ background: '#1f2937', border: '1px solid #374151', borderRadius: 8 }}
                  formatter={(v: unknown) => [`${v}%`, "1Y Return"]}
                />
                <Bar dataKey="perf" radius={[0, 4, 4, 0]}>
                  {sectorPerf.map((entry, i) => (
                    <Cell key={i} fill={entry.perf >= 0 ? '#22c55e' : '#ef4444'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Top Momentum Movers */}
        <div style={{ background: '#111827', border: '1px solid #1f2937', borderRadius: 12 }}>
          <div className="p-4 border-b border-gray-800">
            <div className="flex items-center justify-between">
              <h3 className="text-white font-semibold">Top Momentum</h3>
              <button
                onClick={() => onNavigate("momentum")}
                className="text-blue-400 text-xs hover:text-blue-300 transition-colors"
              >
                Full Screener →
              </button>
            </div>
          </div>
          <div className="p-4 space-y-3">
            {movers.map((m) => (
              <div key={m.ticker} style={{ background: '#1f2937' }} className="rounded-lg p-3 flex items-center justify-between">
                <span className="text-white font-mono font-bold">{m.ticker}</span>
                <div className="flex items-center gap-2">
                  <span className="text-green-400 font-semibold text-sm">+{m.change}%</span>
                  <span style={{ background: '#052e16', color: '#22c55e' }} className="text-xs px-1.5 py-0.5 rounded font-semibold">
                    {m.signal}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Market Themes */}
      <div style={{ background: '#111827', border: '1px solid #1f2937', borderRadius: 12 }}>
        <div className="p-4 border-b border-gray-800">
          <div className="flex items-center justify-between">
            <h3 className="text-white font-semibold">Dominant Market Themes</h3>
            <button
              onClick={() => onNavigate("money-flow")}
              className="text-blue-400 text-xs hover:text-blue-300 transition-colors"
            >
              Money Flow →
            </button>
          </div>
        </div>
        <div className="p-4 space-y-4">
          {themes.map((t) => (
            <div key={t.theme}>
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-2">
                  <span className="text-green-400 text-sm">{t.trend}</span>
                  <span className="text-white font-semibold text-sm">{t.theme}</span>
                </div>
                <span className="text-gray-400 text-xs">{t.strength}/100</span>
              </div>
              <div style={{ background: '#1f2937', borderRadius: 999 }} className="h-2 mb-1">
                <div
                  style={{
                    width: `${t.strength}%`,
                    background: t.strength >= 90 ? '#22c55e' : t.strength >= 75 ? '#3b82f6' : '#f59e0b',
                    height: '100%',
                    borderRadius: 999,
                    transition: 'width 0.8s',
                  }}
                />
              </div>
              <p className="text-gray-500 text-xs">{t.desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Quick nav cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          { tab: "money-flow", icon: "⇄", title: "Global Money Flow", desc: "Track where institutional $ is going", color: "#1e3a5f", border: "#3b82f6" },
          { tab: "sectors", icon: "⊞", title: "Sector Analysis", desc: "Current & emerging sector opportunities", color: "#052e16", border: "#22c55e" },
          { tab: "momentum", icon: "↑", title: "Momentum Screener", desc: "Shortlisted high-momentum stocks", color: "#1e1b4b", border: "#8b5cf6" },
        ].map((card) => (
          <button
            key={card.tab}
            onClick={() => onNavigate(card.tab)}
            className="text-left rounded-xl p-4 transition-all hover:opacity-90"
            style={{ background: card.color, border: `1px solid ${card.border}` }}
          >
            <div className="text-2xl mb-2">{card.icon}</div>
            <div className="text-white font-semibold">{card.title}</div>
            <div className="text-gray-400 text-sm mt-1">{card.desc}</div>
          </button>
        ))}
      </div>
    </div>
  );
}
