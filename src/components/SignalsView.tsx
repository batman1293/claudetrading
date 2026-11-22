"use client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ComposedChart, Line, Scatter, XAxis, YAxis, Tooltip, ResponsiveContainer,
  ReferenceLine, ReferenceArea, CartesianGrid,
} from "recharts";
import type { EnrichedBar, Level, SignalSummary, Status, Day2Rule } from "@/lib/indicators";

interface SignalData {
  symbol: string;
  name: string;
  currency: string;
  price: number;
  change: number;
  changePct: number;
  sma21: number | null;
  rsi14: number | null;
  high52: number;
  low52: number;
  asOf: string;
  rule: Day2Rule;
  summary: SignalSummary;
  levels: { supports: Level[]; resistances: Level[] };
  bars: EnrichedBar[];
}

type Entry = { loading: boolean; error?: string; data?: SignalData };

const DEFAULT_WATCHLIST = ["MSFT", "INTC", "NVDA"];
const STORAGE_KEY = "signals-watchlist";
const RULE_KEY = "signals-day2-rule";

// Validated (dataviz validator, dark surface): price + SMA series.
const C_PRICE = "#3b82f6";
const C_SMA = "#d97706";
const C_RSI = "#a78bfa";
// Status colors — always paired with a text label / icon.
const C_EXIT = "#ef4444";
const C_ENTRY = "#22c55e";
const C_SUPPORT = "#22c55e";
const C_RESIST = "#ef4444";

const STATUS_STYLE: Record<Status, { fg: string; bg: string; icon: string; label: string }> = {
  EXIT: { fg: "#fca5a5", bg: "#450a0a", icon: "▼", label: "EXIT" },
  WATCH: { fg: "#fcd34d", bg: "#451a03", icon: "⚠", label: "WATCH" },
  ENTRY: { fg: "#86efac", bg: "#052e16", icon: "▲", label: "ENTRY" },
  HOLD: { fg: "#93c5fd", bg: "#1e3a5f", icon: "●", label: "HOLD" },
};

const RANGES = { "3M": 63, "6M": 126, "1Y": 252 } as const;
type RangeKey = keyof typeof RANGES;

const fmt = (n: number | null | undefined, d = 2) => (n == null ? "—" : n.toFixed(d));
const card = { background: "#111827", border: "1px solid #1f2937" };

function StatusBadge({ status }: { status: Status }) {
  const s = STATUS_STYLE[status];
  return (
    <span className="text-xs font-bold px-2 py-0.5 rounded-full whitespace-nowrap" style={{ color: s.fg, background: s.bg }}>
      {s.icon} {s.label}
    </span>
  );
}

function loadWatchlist(): string[] {
  if (typeof window === "undefined") return DEFAULT_WATCHLIST;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : null;
    return Array.isArray(parsed) && parsed.length ? parsed : DEFAULT_WATCHLIST;
  } catch {
    return DEFAULT_WATCHLIST;
  }
}

export default function SignalsView() {
  // Rendered client-only (see page.tsx), so localStorage is safe in initializers.
  const [watchlist, setWatchlist] = useState<string[]>(loadWatchlist);
  const [rule, setRule] = useState<Day2Rule>(() =>
    typeof window !== "undefined" && localStorage.getItem(RULE_KEY) === "green-below" ? "green-below" : "below",
  );
  const [entries, setEntries] = useState<Record<string, Entry>>({});
  const [selected, setSelected] = useState<string>(() => watchlist[0] ?? "");
  const [input, setInput] = useState("");
  const [range, setRange] = useState<RangeKey>("6M");

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(watchlist));
  }, [watchlist]);
  useEffect(() => {
    localStorage.setItem(RULE_KEY, rule);
  }, [rule]);

  const watchlistRef = useRef(watchlist);
  useEffect(() => {
    watchlistRef.current = watchlist;
  }, [watchlist]);

  const load = useCallback((symbol: string, r: Day2Rule) => {
    setEntries((e) => ({ ...e, [symbol]: { ...e[symbol], loading: true, error: undefined } }));
    fetch(`/api/signals?symbol=${encodeURIComponent(symbol)}&rule=${r}`)
      .then(async (res) => {
        const json = await res.json();
        if (!res.ok) throw new Error(json.error || `HTTP ${res.status}`);
        setEntries((e) => ({ ...e, [symbol]: { loading: false, data: json } }));
      })
      .catch((err: Error) => setEntries((e) => ({ ...e, [symbol]: { loading: false, error: err.message } })));
  }, []);

  // (Re)load everything when the Day-2 rule changes (and on mount).
  useEffect(() => {
    watchlistRef.current.forEach((s) => load(s, rule));
  }, [rule, load]);

  const addTicker = () => {
    const sym = input.trim().toUpperCase();
    if (!sym || !/^[A-Z0-9.\-^=]{1,15}$/.test(sym)) return;
    setInput("");
    setSelected(sym);
    if (watchlist.includes(sym)) return;
    setWatchlist((w) => [...w, sym]);
    load(sym, rule);
  };

  const removeTicker = (sym: string) => {
    const next = watchlist.filter((s) => s !== sym);
    setWatchlist(next);
    if (selected === sym && next.length) setSelected(next[0]);
  };

  const counts = useMemo(() => {
    const c: Record<Status, number> = { EXIT: 0, WATCH: 0, ENTRY: 0, HOLD: 0 };
    watchlist.forEach((s) => {
      const st = entries[s]?.data?.summary.status;
      if (st) c[st]++;
    });
    return c;
  }, [watchlist, entries]);

  const sel = entries[selected];

  return (
    <div className="space-y-6">
      {/* Header + controls */}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Momentum Signal Tracker</h1>
          <p className="text-sm" style={{ color: "#9ca3af" }}>
            US stocks · daily bars · exit triggers: 21-day SMA breakdown (confirmed next day) and RSI(14) &lt; 40
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value.toUpperCase())}
            onKeyDown={(e) => e.key === "Enter" && addTicker()}
            placeholder="Add ticker e.g. AAPL"
            className="px-3 py-1.5 rounded-lg text-sm text-white outline-none w-44"
            style={{ background: "#1f2937", border: "1px solid #374151" }}
          />
          <button onClick={addTicker} className="px-3 py-1.5 rounded-lg text-sm font-semibold text-white" style={{ background: "#2563eb" }}>
            + Add
          </button>
          <button
            onClick={() => watchlist.forEach((s) => load(s, rule))}
            className="px-3 py-1.5 rounded-lg text-sm font-semibold"
            style={{ background: "#1f2937", color: "#d1d5db", border: "1px solid #374151" }}
          >
            ↻ Refresh
          </button>
        </div>
      </div>

      {/* Rule definitions */}
      <div className="grid md:grid-cols-2 gap-4">
        <div className="rounded-xl p-4" style={card}>
          <div className="text-xs font-semibold mb-1" style={{ color: "#fca5a5" }}>EXIT RULE 1 — 21-SMA BREAKDOWN</div>
          <p className="text-sm" style={{ color: "#d1d5db" }}>
            Day 1: close crosses below the 21-day simple moving average. Day 2: the close is still below the 21-SMA
            {rule === "green-below" ? " and the candle is green (a bounce that fails to reclaim the SMA)." : " (confirmation)."}
          </p>
          <div className="flex items-center gap-2 mt-3 text-xs" style={{ color: "#9ca3af" }}>
            Day 2 condition:
            {(["below", "green-below"] as Day2Rule[]).map((r) => (
              <button
                key={r}
                onClick={() => setRule(r)}
                className="px-2 py-0.5 rounded-md"
                style={rule === r ? { background: "#2563eb", color: "white" } : { background: "#1f2937", color: "#9ca3af" }}
              >
                {r === "below" ? "Closes below SMA" : "Green day, still below SMA"}
              </button>
            ))}
          </div>
        </div>
        <div className="rounded-xl p-4" style={card}>
          <div className="text-xs font-semibold mb-1" style={{ color: "#fca5a5" }}>EXIT RULE 2 — RSI WEAKNESS</div>
          <p className="text-sm" style={{ color: "#d1d5db" }}>
            RSI(14, Wilder) is below 40 — momentum has rolled over.
          </p>
          <div className="text-xs font-semibold mt-3 mb-1" style={{ color: "#86efac" }}>ENTRY (DEFAULT — MIRROR OF RULE 1)</div>
          <p className="text-sm" style={{ color: "#d1d5db" }}>
            Close crosses above the 21-SMA, holds above it the next day, and RSI &gt; 50.
          </p>
        </div>
      </div>

      {/* Status counts */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {(Object.keys(counts) as Status[]).map((s) => (
          <div key={s} className="rounded-xl p-3 flex items-center justify-between" style={card}>
            <StatusBadge status={s} />
            <span className="text-2xl font-bold text-white">{counts[s]}</span>
          </div>
        ))}
      </div>

      {/* Watchlist table */}
      <div className="rounded-xl overflow-x-auto" style={card}>
        <table className="w-full text-sm">
          <thead>
            <tr style={{ color: "#6b7280", borderBottom: "1px solid #1f2937" }} className="text-xs text-left">
              <th className="px-4 py-2">Ticker</th>
              <th className="px-4 py-2 text-right">Price</th>
              <th className="px-4 py-2 text-right">1D</th>
              <th className="px-4 py-2 text-right">21-SMA</th>
              <th className="px-4 py-2 text-right">vs SMA</th>
              <th className="px-4 py-2 text-right">RSI(14)</th>
              <th className="px-4 py-2 text-right">Support</th>
              <th className="px-4 py-2 text-right">Resistance</th>
              <th className="px-4 py-2">Signal</th>
              <th className="px-4 py-2">Why</th>
              <th className="px-2 py-2"></th>
            </tr>
          </thead>
          <tbody>
            {watchlist.map((sym) => {
              const e = entries[sym];
              const d = e?.data;
              const vs = d && d.sma21 ? ((d.price - d.sma21) / d.sma21) * 100 : null;
              return (
                <tr
                  key={sym}
                  onClick={() => setSelected(sym)}
                  className="cursor-pointer hover:bg-white/5"
                  style={{ borderBottom: "1px solid #1f2937", background: selected === sym ? "#1e293b" : undefined }}
                >
                  <td className="px-4 py-2.5">
                    <div className="font-bold text-white">{sym}</div>
                    <div className="text-xs truncate max-w-[160px]" style={{ color: "#6b7280" }}>{d?.name ?? ""}</div>
                  </td>
                  {!d ? (
                    <td colSpan={9} className="px-4 py-2.5 text-xs" style={{ color: e?.error ? "#fca5a5" : "#6b7280" }}>
                      {e?.error ?? "Loading…"}
                    </td>
                  ) : (
                    <>
                      <td className="px-4 py-2.5 text-right text-white font-mono">${fmt(d.price)}</td>
                      <td className="px-4 py-2.5 text-right font-mono" style={{ color: d.changePct >= 0 ? "#4ade80" : "#f87171" }}>
                        {d.changePct >= 0 ? "+" : ""}{fmt(d.changePct)}%
                      </td>
                      <td className="px-4 py-2.5 text-right font-mono" style={{ color: "#d1d5db" }}>${fmt(d.sma21)}</td>
                      <td className="px-4 py-2.5 text-right font-mono" style={{ color: (vs ?? 0) >= 0 ? "#4ade80" : "#f87171" }}>
                        {vs == null ? "—" : `${vs >= 0 ? "+" : ""}${vs.toFixed(1)}%`}
                      </td>
                      <td className="px-4 py-2.5 text-right font-mono" style={{ color: (d.rsi14 ?? 50) < 40 ? "#f87171" : "#d1d5db" }}>
                        {fmt(d.rsi14, 1)}
                      </td>
                      <td className="px-4 py-2.5 text-right font-mono" style={{ color: "#d1d5db" }}>${fmt(d.levels.supports[0]?.price)}</td>
                      <td className="px-4 py-2.5 text-right font-mono" style={{ color: "#d1d5db" }}>${fmt(d.levels.resistances[0]?.price)}</td>
                      <td className="px-4 py-2.5"><StatusBadge status={d.summary.status} /></td>
                      <td className="px-4 py-2.5 text-xs" style={{ color: "#9ca3af" }}>{d.summary.reasons.join(" · ")}</td>
                    </>
                  )}
                  <td className="px-2 py-2.5">
                    <button
                      onClick={(ev) => { ev.stopPropagation(); removeTicker(sym); }}
                      title={`Remove ${sym}`}
                      className="text-gray-500 hover:text-red-400 px-1"
                    >
                      ✕
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Detail */}
      {sel?.data ? (
        <StockDetail data={sel.data} range={range} onRange={setRange} />
      ) : (
        <div className="rounded-xl p-8 text-center text-sm" style={{ ...card, color: sel?.error ? "#fca5a5" : "#6b7280" }}>
          {sel?.error ?? (watchlist.length ? "Loading chart…" : "Add a ticker to get started.")}
        </div>
      )}
    </div>
  );
}

function StockDetail({ data, range, onRange }: { data: SignalData; range: RangeKey; onRange: (r: RangeKey) => void }) {
  const bars = data.bars.slice(-RANGES[range]);
  const chart = bars.map((b) => ({
    ...b,
    exitMark: b.exitSma ? b.close : null,
    rsiExitMark: b.exitRsi ? b.close : null,
    entryMark: b.entry ? b.close : null,
  }));
  const allLevels = [...data.levels.supports, ...data.levels.resistances];
  const lows = [...bars.map((b) => b.low), ...allLevels.map((l) => l.price)];
  const highs = [...bars.map((b) => b.high), ...allLevels.map((l) => l.price)];
  const yMin = Math.floor(Math.min(...lows) * 0.97);
  const yMax = Math.ceil(Math.max(...highs) * 1.02);

  const events = data.bars
    .filter((b) => b.exitSma || b.exitRsi || b.entry)
    .slice(-12)
    .reverse();

  const s = STATUS_STYLE[data.summary.status];

  return (
    <div className="space-y-4">
      <div className="rounded-xl p-5" style={card}>
        <div className="flex flex-wrap items-start justify-between gap-4 mb-4">
          <div>
            <div className="flex items-center gap-3">
              <h2 className="text-xl font-bold text-white">{data.symbol}</h2>
              <StatusBadge status={data.summary.status} />
            </div>
            <div className="text-sm" style={{ color: "#9ca3af" }}>{data.name} · as of {data.asOf}</div>
          </div>
          <div className="flex items-baseline gap-3">
            <span className="text-3xl font-bold text-white font-mono">${fmt(data.price)}</span>
            <span className="font-mono text-sm" style={{ color: data.change >= 0 ? "#4ade80" : "#f87171" }}>
              {data.change >= 0 ? "+" : ""}{fmt(data.change)} ({data.change >= 0 ? "+" : ""}{fmt(data.changePct)}%)
            </span>
          </div>
        </div>

        <div className="rounded-lg px-3 py-2 mb-4 text-sm" style={{ background: s.bg, color: s.fg }}>
          {s.icon} {data.summary.reasons.join(" · ")}
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 mb-2">
          {/* Legend */}
          <div className="flex flex-wrap items-center gap-4 text-xs" style={{ color: "#d1d5db" }}>
            <span className="flex items-center gap-1.5"><span className="inline-block w-4 h-0.5" style={{ background: C_PRICE }} />Close</span>
            <span className="flex items-center gap-1.5"><span className="inline-block w-4 h-0.5" style={{ background: C_SMA }} />21-day SMA</span>
            <span className="flex items-center gap-1.5"><span style={{ color: C_EXIT }}>▼</span>Exit: SMA rule</span>
            <span className="flex items-center gap-1.5"><span style={{ color: C_EXIT }}>◆</span>Exit: RSI &lt; 40</span>
            <span className="flex items-center gap-1.5"><span style={{ color: C_ENTRY }}>▲</span>Entry</span>
            <span className="flex items-center gap-1.5"><span className="inline-block w-4 border-t border-dashed" style={{ borderColor: C_SUPPORT }} />Support</span>
            <span className="flex items-center gap-1.5"><span className="inline-block w-4 border-t border-dashed" style={{ borderColor: C_RESIST }} />Resistance</span>
          </div>
          <div className="flex rounded-lg overflow-hidden" style={{ border: "1px solid #374151" }}>
            {(Object.keys(RANGES) as RangeKey[]).map((r) => (
              <button
                key={r}
                onClick={() => onRange(r)}
                className="px-3 py-1 text-xs font-semibold"
                style={range === r ? { background: "#1d4ed8", color: "white" } : { background: "#1f2937", color: "#9ca3af" }}
              >
                {r}
              </button>
            ))}
          </div>
        </div>

        {/* Price chart */}
        <div style={{ height: 380 }}>
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={chart} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
              <CartesianGrid stroke="#1f2937" vertical={false} />
              <XAxis dataKey="date" tick={{ fill: "#6b7280", fontSize: 11 }} tickLine={false} axisLine={{ stroke: "#374151" }} minTickGap={40} tickFormatter={(d: string) => d.slice(5)} />
              <YAxis domain={[yMin, yMax]} tick={{ fill: "#6b7280", fontSize: 11 }} tickLine={false} axisLine={false} width={55} tickFormatter={(v: number) => `$${v}`} />
              <Tooltip content={<PriceTooltip />} cursor={{ stroke: "#4b5563", strokeDasharray: "3 3" }} />
              {data.levels.supports.map((l, i) => (
                <ReferenceLine key={`s${i}`} y={l.price} stroke={C_SUPPORT} strokeOpacity={0.7 - i * 0.15} strokeDasharray="5 4"
                  label={{ value: `S${i + 1} $${l.price.toFixed(2)}`, position: "insideBottomRight", fill: "#86efac", fontSize: 10 }} />
              ))}
              {data.levels.resistances.map((l, i) => (
                <ReferenceLine key={`r${i}`} y={l.price} stroke={C_RESIST} strokeOpacity={0.7 - i * 0.15} strokeDasharray="5 4"
                  label={{ value: `R${i + 1} $${l.price.toFixed(2)}`, position: "insideTopRight", fill: "#fca5a5", fontSize: 10 }} />
              ))}
              <Line type="monotone" dataKey="close" stroke={C_PRICE} strokeWidth={2} dot={false} isAnimationActive={false} />
              <Line type="monotone" dataKey="sma21" stroke={C_SMA} strokeWidth={2} dot={false} isAnimationActive={false} connectNulls />
              <Scatter dataKey="exitMark" fill={C_EXIT} shape={<Marker glyph="down" color={C_EXIT} />} isAnimationActive={false} />
              <Scatter dataKey="rsiExitMark" fill={C_EXIT} shape={<Marker glyph="diamond" color={C_EXIT} />} isAnimationActive={false} />
              <Scatter dataKey="entryMark" fill={C_ENTRY} shape={<Marker glyph="up" color={C_ENTRY} />} isAnimationActive={false} />
            </ComposedChart>
          </ResponsiveContainer>
        </div>

        {/* RSI chart (separate axis — never dual-axis) */}
        <div className="text-xs mt-4 mb-1 flex items-center gap-2" style={{ color: "#9ca3af" }}>
          <span className="inline-block w-4 h-0.5" style={{ background: C_RSI }} /> RSI(14) — shaded zone is below the 40 exit threshold
        </div>
        <div style={{ height: 150 }}>
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={chart} margin={{ top: 5, right: 20, left: 0, bottom: 0 }}>
              <CartesianGrid stroke="#1f2937" vertical={false} />
              <XAxis dataKey="date" tick={{ fill: "#6b7280", fontSize: 11 }} tickLine={false} axisLine={{ stroke: "#374151" }} minTickGap={40} tickFormatter={(d: string) => d.slice(5)} />
              <YAxis domain={[0, 100]} ticks={[30, 40, 50, 70]} tick={{ fill: "#6b7280", fontSize: 11 }} tickLine={false} axisLine={false} width={55} />
              <ReferenceArea y1={0} y2={40} fill={C_EXIT} fillOpacity={0.08} />
              <ReferenceLine y={40} stroke={C_EXIT} strokeDasharray="4 3" label={{ value: "40 exit", position: "insideBottomRight", fill: "#fca5a5", fontSize: 10 }} />
              <ReferenceLine y={70} stroke="#4b5563" strokeDasharray="2 3" label={{ value: "70", position: "insideTopRight", fill: "#6b7280", fontSize: 10 }} />
              <Tooltip
                contentStyle={{ background: "#0f1117", border: "1px solid #374151", borderRadius: 8, fontSize: 12 }}
                labelStyle={{ color: "#9ca3af" }}
                formatter={(v) => [typeof v === "number" ? v.toFixed(1) : String(v), "RSI(14)"]}
              />
              <Line type="monotone" dataKey="rsi14" stroke={C_RSI} strokeWidth={2} dot={false} isAnimationActive={false} />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="grid md:grid-cols-3 gap-4">
        {/* Key levels */}
        <div className="rounded-xl p-4" style={card}>
          <h3 className="text-sm font-semibold text-white mb-3">Support &amp; Resistance</h3>
          <LevelList title="Resistance (nearest first)" levels={data.levels.resistances} price={data.price} color="#fca5a5" prefix="R" />
          <div className="my-2 py-1.5 px-2 rounded text-xs font-mono flex justify-between" style={{ background: "#1e293b", color: "white" }}>
            <span>Last close</span><span>${fmt(data.price)}</span>
          </div>
          <LevelList title="Support (nearest first)" levels={data.levels.supports} price={data.price} color="#86efac" prefix="S" />
          <p className="text-[11px] mt-3" style={{ color: "#6b7280" }}>
            Swing-pivot clusters (±1.5%) over the last ~9 months. Touches = number of pivots in the zone.
          </p>
        </div>

        {/* Key stats */}
        <div className="rounded-xl p-4" style={card}>
          <h3 className="text-sm font-semibold text-white mb-3">Key Stats</h3>
          {[
            ["21-day SMA", `$${fmt(data.sma21)}`],
            ["Distance from SMA", data.sma21 ? `${(((data.price - data.sma21) / data.sma21) * 100).toFixed(2)}%` : "—"],
            ["RSI (14)", fmt(data.rsi14, 1)],
            ["52-week high", `$${fmt(data.high52)}`],
            ["52-week low", `$${fmt(data.low52)}`],
            ["Off 52w high", `${(((data.price - data.high52) / data.high52) * 100).toFixed(1)}%`],
            ["Last SMA exit", data.summary.lastExitSmaDate ?? "none in 1Y"],
            ["Last entry", data.summary.lastEntryDate ?? "none in 1Y"],
          ].map(([k, v]) => (
            <div key={k} className="flex justify-between text-sm py-1" style={{ borderBottom: "1px solid #1f2937" }}>
              <span style={{ color: "#9ca3af" }}>{k}</span>
              <span className="font-mono text-white">{v}</span>
            </div>
          ))}
        </div>

        {/* Signal log */}
        <div className="rounded-xl p-4" style={card}>
          <h3 className="text-sm font-semibold text-white mb-3">Signal History (last 12, 1Y)</h3>
          {events.length === 0 ? (
            <p className="text-sm" style={{ color: "#6b7280" }}>No signals in the past year.</p>
          ) : (
            <table className="w-full text-xs">
              <thead>
                <tr style={{ color: "#6b7280" }} className="text-left">
                  <th className="py-1">Date</th><th className="py-1">Signal</th><th className="py-1 text-right">Close</th><th className="py-1 text-right">RSI</th>
                </tr>
              </thead>
              <tbody>
                {events.map((b) => (
                  <tr key={b.date} style={{ borderTop: "1px solid #1f2937" }}>
                    <td className="py-1 font-mono" style={{ color: "#d1d5db" }}>{b.date}</td>
                    <td className="py-1">
                      {b.exitSma && <span style={{ color: "#fca5a5" }}>▼ SMA exit </span>}
                      {b.exitRsi && <span style={{ color: "#fca5a5" }}>◆ RSI&lt;40 </span>}
                      {b.entry && <span style={{ color: "#86efac" }}>▲ Entry</span>}
                    </td>
                    <td className="py-1 text-right font-mono text-white">${fmt(b.close)}</td>
                    <td className="py-1 text-right font-mono" style={{ color: "#d1d5db" }}>{fmt(b.rsi14, 1)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}

function LevelList({ title, levels, price, color, prefix }: { title: string; levels: Level[]; price: number; color: string; prefix: string }) {
  return (
    <div>
      <div className="text-[11px] mb-1" style={{ color: "#6b7280" }}>{title}</div>
      {levels.map((l, i) => (
        <div key={i} className="flex justify-between text-sm py-0.5 font-mono">
          <span style={{ color }}>{prefix}{i + 1} ${l.price.toFixed(2)}</span>
          <span style={{ color: "#9ca3af" }}>
            {(((l.price - price) / price) * 100).toFixed(1)}% · {l.touches}×
          </span>
        </div>
      ))}
    </div>
  );
}

type MarkerProps = { cx?: number; cy?: number; glyph: "up" | "down" | "diamond"; color: string };
function Marker({ cx, cy, glyph, color }: MarkerProps) {
  if (cx == null || cy == null || Number.isNaN(cy)) return null;
  const r = 6;
  const ring = { stroke: "#111827", strokeWidth: 2 };
  if (glyph === "down") {
    const y = cy - 12;
    return <path d={`M${cx - r},${y - r} L${cx + r},${y - r} L${cx},${y + r / 2} Z`} fill={color} {...ring} />;
  }
  if (glyph === "up") {
    const y = cy + 12;
    return <path d={`M${cx - r},${y + r} L${cx + r},${y + r} L${cx},${y - r / 2} Z`} fill={color} {...ring} />;
  }
  return <path d={`M${cx},${cy - r} L${cx + r},${cy} L${cx},${cy + r} L${cx - r},${cy} Z`} fill={color} {...ring} />;
}

type TooltipPayload = { payload: EnrichedBar };
function PriceTooltip({ active, payload }: { active?: boolean; payload?: TooltipPayload[] }) {
  if (!active || !payload?.length) return null;
  const b = payload[0].payload;
  const row = (k: string, v: string, c = "#e5e7eb") => (
    <div className="flex justify-between gap-4"><span style={{ color: "#9ca3af" }}>{k}</span><span className="font-mono" style={{ color: c }}>{v}</span></div>
  );
  return (
    <div className="rounded-lg px-3 py-2 text-xs" style={{ background: "#0f1117", border: "1px solid #374151", minWidth: 170 }}>
      <div className="font-semibold text-white mb-1">{b.date}</div>
      {row("Open", `$${fmt(b.open)}`)}
      {row("High", `$${fmt(b.high)}`)}
      {row("Low", `$${fmt(b.low)}`)}
      {row("Close", `$${fmt(b.close)}`, b.green ? "#4ade80" : "#f87171")}
      {row("21-SMA", `$${fmt(b.sma21)}`)}
      {row("RSI(14)", fmt(b.rsi14, 1), (b.rsi14 ?? 50) < 40 ? "#f87171" : "#e5e7eb")}
      {b.exitSma && <div style={{ color: "#fca5a5" }} className="mt-1">▼ Exit: SMA breakdown confirmed</div>}
      {b.exitRsi && <div style={{ color: "#fca5a5" }}>◆ Exit: RSI crossed below 40</div>}
      {b.entry && <div style={{ color: "#86efac" }} className="mt-1">▲ Entry signal</div>}
    </div>
  );
}
