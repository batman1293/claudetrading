"use client";
import { useEffect, useState } from "react";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, ScatterChart, Scatter, ZAxis
} from "recharts";

interface Sector {
  name: string;
  ticker: string;
  performance1M: number;
  performance3M: number;
  performance1Y: number;
  revenueGrowth: number;
  profitGrowth: number;
  peRatio: number;
  momentum: string;
  rationale: string;
  topStocks: string[];
  marketCap: number;
  fiiFlow: string;
}

interface SectorData {
  current: Sector[];
  emerging: Sector[];
}

const MOMENTUM_COLOR: Record<string, string> = {
  explosive: '#f59e0b',
  strong: '#22c55e',
  moderate: '#3b82f6',
  recovering: '#8b5cf6',
};

const MOMENTUM_BG: Record<string, string> = {
  explosive: '#451a03',
  strong: '#052e16',
  moderate: '#1e3a5f',
  recovering: '#2e1065',
};

export default function SectorsView({ market }: { market: string }) {
  const [data, setData] = useState<SectorData | null>(null);
  const [selected, setSelected] = useState<Sector | null>(null);
  const [category, setCategory] = useState<"current" | "emerging">("current");

  useEffect(() => {
    fetch(`/api/sectors?market=${market}`).then((r) => r.json()).then((d) => {
      setData(d);
      setSelected(d.current[0]);
      setCategory("current");
    });
  }, [market]);

  if (!data) return <LoadingState />;

  const sectors = data[category];
  const chartData = [...data.current, ...data.emerging].map((s) => ({
    name: s.name.split(" ")[0],
    revenue: s.revenueGrowth,
    profit: s.profitGrowth,
    perf: s.performance1Y,
    type: data.current.includes(s) ? "current" : "emerging",
  }));

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-xl font-bold text-white">Sector Analysis — {market === "US" ? "🇺🇸 US Market" : "🇮🇳 Indian Market"}</h2>
          <p className="text-gray-400 text-sm mt-1">Identify dominant sectors by fundamentals & institutional demand</p>
        </div>
        <div className="flex rounded-xl overflow-hidden" style={{ border: '1px solid #374151' }}>
          {(["current", "emerging"] as const).map((cat) => (
            <button
              key={cat}
              onClick={() => { setCategory(cat); setSelected(data[cat][0]); }}
              className="px-4 py-2 text-sm font-semibold capitalize transition-all"
              style={category === cat ? { background: cat === "current" ? '#15803d' : '#9333ea', color: 'white' } : { background: '#1f2937', color: '#9ca3af' }}
            >
              {cat === "current" ? "⚡ Current" : "🚀 Emerging"}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Sector List */}
        <div className="space-y-3">
          {sectors.map((sector) => (
            <button
              key={sector.name}
              onClick={() => setSelected(sector)}
              className="w-full text-left rounded-xl p-4 transition-all"
              style={{
                background: selected?.name === sector.name ? '#1e3a5f' : '#111827',
                border: `1px solid ${selected?.name === sector.name ? '#3b82f6' : '#1f2937'}`,
              }}
            >
              <div className="flex items-start justify-between">
                <div>
                  <div className="text-white font-semibold text-sm">{sector.name}</div>
                  <div className="text-gray-500 text-xs mt-0.5">{sector.ticker}</div>
                </div>
                <span
                  className="text-xs px-2 py-0.5 rounded-full font-semibold capitalize"
                  style={{
                    color: MOMENTUM_COLOR[sector.momentum] || '#9ca3af',
                    background: MOMENTUM_BG[sector.momentum] || '#1f2937',
                  }}
                >
                  {sector.momentum}
                </span>
              </div>
              <div className="flex gap-3 mt-2">
                <div>
                  <div className="text-green-400 text-sm font-bold">+{sector.performance1Y}%</div>
                  <div className="text-gray-600 text-xs">1Y Perf</div>
                </div>
                <div>
                  <div className="text-blue-400 text-sm font-bold">+{sector.revenueGrowth}%</div>
                  <div className="text-gray-600 text-xs">Rev Growth</div>
                </div>
                <div>
                  <div className="text-purple-400 text-sm font-bold">+{sector.profitGrowth}%</div>
                  <div className="text-gray-600 text-xs">Profit Growth</div>
                </div>
              </div>
            </button>
          ))}
        </div>

        {/* Detail + Chart */}
        <div className="lg:col-span-2 space-y-4">
          {selected && (
            <>
              <div style={{ background: '#111827', border: '1px solid #1f2937' }} className="rounded-xl p-5">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="text-white text-lg font-bold">{selected.name}</h3>
                    <span
                      className="text-xs px-2 py-0.5 rounded-full font-semibold capitalize inline-block mt-1"
                      style={{
                        color: MOMENTUM_COLOR[selected.momentum] || '#9ca3af',
                        background: MOMENTUM_BG[selected.momentum] || '#1f2937',
                      }}
                    >
                      {selected.momentum} momentum
                    </span>
                  </div>
                  <div className="text-right">
                    <div className="text-yellow-400 font-semibold text-sm">{selected.fiiFlow.toUpperCase()}</div>
                    <div className="text-gray-500 text-xs">FII Activity</div>
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
                  {[
                    { label: "1M Return", val: `+${selected.performance1M}%`, color: "text-green-400" },
                    { label: "3M Return", val: `+${selected.performance3M}%`, color: "text-green-400" },
                    { label: "1Y Return", val: `+${selected.performance1Y}%`, color: "text-green-400" },
                    { label: "P/E Ratio", val: `${selected.peRatio}x`, color: "text-yellow-400" },
                  ].map((m) => (
                    <div key={m.label} style={{ background: '#1f2937' }} className="rounded-lg p-3 text-center">
                      <div className={`font-bold ${m.color}`}>{m.val}</div>
                      <div className="text-gray-500 text-xs mt-0.5">{m.label}</div>
                    </div>
                  ))}
                </div>

                <div style={{ background: '#0f1117' }} className="rounded-lg p-3 mb-4">
                  <div className="text-gray-400 text-xs font-semibold uppercase mb-2">Why This Sector</div>
                  <p className="text-gray-300 text-sm leading-relaxed">{selected.rationale}</p>
                </div>

                <div>
                  <div className="text-gray-400 text-xs font-semibold uppercase mb-2">Top Stocks to Watch</div>
                  <div className="flex flex-wrap gap-2">
                    {selected.topStocks.map((s) => (
                      <span key={s} style={{ background: '#1e3a5f', color: '#60a5fa' }} className="px-2.5 py-1 rounded-lg text-sm font-mono font-semibold">
                        {s}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </>
          )}

          {/* Performance Comparison Chart */}
          <div style={{ background: '#111827', border: '1px solid #1f2937' }} className="rounded-xl p-4">
            <h4 className="text-white font-semibold text-sm mb-3">Revenue vs Profit Growth — All Sectors</h4>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={chartData} margin={{ left: -10 }}>
                <XAxis dataKey="name" tick={{ fill: '#9ca3af', fontSize: 10 }} />
                <YAxis tick={{ fill: '#9ca3af', fontSize: 11 }} />
                <Tooltip
                  contentStyle={{ background: '#1f2937', border: '1px solid #374151', borderRadius: 8 }}
                  labelStyle={{ color: '#e5e7eb' }}
                />
                <Bar dataKey="revenue" name="Revenue Growth %" fill="#3b82f6" radius={[2, 2, 0, 0]} />
                <Bar dataKey="profit" name="Profit Growth %" fill="#22c55e" radius={[2, 2, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}

function LoadingState() {
  return (
    <div className="space-y-4 animate-pulse">
      {[1, 2, 3].map((i) => (
        <div key={i} style={{ background: '#111827' }} className="rounded-xl h-32"></div>
      ))}
    </div>
  );
}
