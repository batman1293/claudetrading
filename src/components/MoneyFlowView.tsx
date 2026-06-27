"use client";
import { useEffect, useState } from "react";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell,
  RadarChart, Radar, PolarGrid, PolarAngleAxis
} from "recharts";

interface CountryFlow {
  country: string;
  code: string;
  netFlow: number;
  inflow: number;
  outflow: number;
  trend: string;
  change: number;
  drivers: string[];
  topSectors: string[];
  fiiActivity: string;
}

interface MoneyFlowData {
  lastUpdated: string;
  globalFlows: CountryFlow[];
  fiiBySector: Record<string, Array<{ sector: string; flow: number; change: number }>>;
  keyInsights: string[];
}

const FLAG: Record<string, string> = {
  US: "🇺🇸", IN: "🇮🇳", JP: "🇯🇵", DE: "🇩🇪", CN: "🇨🇳", BR: "🇧🇷", MX: "🇲🇽", SA: "🇸🇦"
};

export default function MoneyFlowView({ market }: { market: string }) {
  const [data, setData] = useState<MoneyFlowData | null>(null);
  const [selected, setSelected] = useState<CountryFlow | null>(null);

  useEffect(() => {
    fetch("/api/money-flow").then((r) => r.json()).then((d) => {
      setData(d);
      setSelected(d.globalFlows[0]);
    });
  }, []);

  if (!data) return <LoadingState />;

  const sectorFlows = data.fiiBySector[market] || [];
  const sorted = [...data.globalFlows].sort((a, b) => b.netFlow - a.netFlow);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-white">Global Institutional Money Flow</h2>
        <p className="text-gray-400 text-sm mt-1">Where is smart money going — FII/DII & institutional investor flows by country</p>
      </div>

      {/* Key Insights */}
      <div style={{ background: '#111827', border: '1px solid #1e3a5f' }} className="rounded-xl p-4">
        <div className="flex items-center gap-2 mb-3">
          <span className="text-blue-400">◈</span>
          <span className="text-blue-300 font-semibold text-sm">Key Macro Insights</span>
        </div>
        <div className="space-y-2">
          {data.keyInsights.map((insight, i) => (
            <div key={i} className="flex items-start gap-2 text-sm text-gray-300">
              <span className="text-blue-400 mt-0.5 shrink-0">→</span>
              <span>{insight}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Bar Chart */}
        <div style={{ background: '#111827', border: '1px solid #1f2937' }} className="rounded-xl p-4">
          <h3 className="text-white font-semibold mb-4">Net Institutional Flow ($M)</h3>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={sorted} margin={{ left: -10 }}>
              <XAxis dataKey="code" tick={{ fill: '#9ca3af', fontSize: 12 }} />
              <YAxis tick={{ fill: '#9ca3af', fontSize: 11 }} />
              <Tooltip
                contentStyle={{ background: '#1f2937', border: '1px solid #374151', borderRadius: 8 }}
                labelStyle={{ color: '#e5e7eb' }}
                formatter={(v: unknown) => [`$${String(v)}M`, "Net Flow"]}
              />
              <Bar dataKey="netFlow" radius={[4, 4, 0, 0]}>
                {sorted.map((entry, i) => (
                  <Cell key={i} fill={entry.netFlow >= 0 ? '#22c55e' : '#ef4444'} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Country cards */}
        <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
          {sorted.map((c) => (
            <button
              key={c.code}
              onClick={() => setSelected(c)}
              className="w-full text-left rounded-xl p-3 transition-all"
              style={{
                background: selected?.code === c.code ? '#1e3a5f' : '#111827',
                border: `1px solid ${selected?.code === c.code ? '#3b82f6' : '#1f2937'}`,
              }}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-lg">{FLAG[c.code] || "🌐"}</span>
                  <span className="text-white font-medium text-sm">{c.country}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`text-sm font-bold ${c.netFlow >= 0 ? "text-green-400" : "text-red-400"}`}>
                    {c.netFlow >= 0 ? "+" : ""}${c.netFlow.toLocaleString()}M
                  </span>
                  <span className={`text-xs px-1.5 py-0.5 rounded font-semibold ${
                    c.change >= 0 ? "text-green-400 bg-green-900/30" : "text-red-400 bg-red-900/30"
                  }`}>
                    {c.change >= 0 ? "+" : ""}{c.change}%
                  </span>
                </div>
              </div>
              <div className="mt-1.5 flex flex-wrap gap-1">
                {c.topSectors.map((s) => (
                  <span key={s} style={{ background: '#1f2937', color: '#9ca3af' }} className="text-xs px-1.5 py-0.5 rounded">
                    {s}
                  </span>
                ))}
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Selected Country Detail */}
      {selected && (
        <div style={{ background: '#111827', border: '1px solid #1f2937' }} className="rounded-xl p-5">
          <div className="flex items-center gap-3 mb-4">
            <span className="text-3xl">{FLAG[selected.code] || "🌐"}</span>
            <div>
              <h3 className="text-white text-lg font-bold">{selected.country}</h3>
              <span className={`text-xs font-semibold ${selected.netFlow >= 0 ? "text-green-400" : "text-red-400"}`}>
                {selected.trend === "up" ? "↑ Net Inflow" : selected.trend === "down" ? "↓ Net Outflow" : "→ Neutral"} — {selected.change >= 0 ? "+" : ""}{selected.change}% MoM
              </span>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4 mb-4">
            {[
              { label: "Inflow", val: selected.inflow, color: "text-green-400" },
              { label: "Outflow", val: selected.outflow, color: "text-red-400" },
              { label: "Net Flow", val: selected.netFlow, color: selected.netFlow >= 0 ? "text-green-400" : "text-red-400" },
            ].map((item) => (
              <div key={item.label} style={{ background: '#1f2937' }} className="rounded-lg p-3 text-center">
                <div className={`text-lg font-bold ${item.color}`}>${item.val.toLocaleString()}M</div>
                <div className="text-gray-500 text-xs mt-0.5">{item.label}</div>
              </div>
            ))}
          </div>

          <div className="mb-4">
            <div className="text-gray-400 text-xs font-semibold uppercase mb-2">FII Activity</div>
            <p className="text-gray-300 text-sm">{selected.fiiActivity}</p>
          </div>

          <div>
            <div className="text-gray-400 text-xs font-semibold uppercase mb-2">Key Drivers</div>
            <div className="space-y-1.5">
              {selected.drivers.map((d, i) => (
                <div key={i} className="flex items-center gap-2 text-sm text-gray-300">
                  <span className="text-yellow-400">◆</span> {d}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* FII by sector for selected market */}
      {sectorFlows.length > 0 && (
        <div style={{ background: '#111827', border: '1px solid #1f2937' }} className="rounded-xl p-4">
          <h3 className="text-white font-semibold mb-4">
            FII Sector Allocation — {market === "US" ? "🇺🇸 US" : "🇮🇳 India"} ($M)
          </h3>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={sectorFlows} layout="vertical" margin={{ left: 20 }}>
              <XAxis type="number" tick={{ fill: '#9ca3af', fontSize: 11 }} />
              <YAxis type="category" dataKey="sector" width={110} tick={{ fill: '#9ca3af', fontSize: 12 }} />
              <Tooltip
                contentStyle={{ background: '#1f2937', border: '1px solid #374151', borderRadius: 8 }}
                formatter={(v: unknown) => [`$${v}M`, "FII Flow"]}
              />
              <Bar dataKey="flow" radius={[0, 4, 4, 0]}>
                {sectorFlows.map((entry, i) => (
                  <Cell key={i} fill={entry.flow >= 0 ? '#3b82f6' : '#ef4444'} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
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
