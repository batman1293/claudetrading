// Technical indicators and signal rules for the Signals dashboard.
// Pure functions — no I/O — so they can be reused and tested in isolation.

export interface Bar {
  date: string; // YYYY-MM-DD
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface EnrichedBar extends Bar {
  sma21: number | null;
  rsi14: number | null;
  green: boolean; // close > open
  exitSma: boolean; // exit rule 1 confirmed on this bar
  exitRsi: boolean; // RSI < 40 on this bar (fresh cross below 40)
  entry: boolean; // entry rule confirmed on this bar
}

export interface Level {
  price: number;
  touches: number;
  kind: "support" | "resistance";
}

export type Day2Rule = "below" | "green-below";

export const SMA_PERIOD = 21;
export const RSI_PERIOD = 14;
export const RSI_EXIT = 40;
export const RSI_ENTRY = 50;

export function sma(values: number[], period: number): (number | null)[] {
  const out: (number | null)[] = new Array(values.length).fill(null);
  let sum = 0;
  for (let i = 0; i < values.length; i++) {
    sum += values[i];
    if (i >= period) sum -= values[i - period];
    if (i >= period - 1) out[i] = sum / period;
  }
  return out;
}

// Wilder's RSI (the standard used by TradingView, Yahoo, etc.)
export function rsi(closes: number[], period = RSI_PERIOD): (number | null)[] {
  const out: (number | null)[] = new Array(closes.length).fill(null);
  if (closes.length <= period) return out;
  let gain = 0;
  let loss = 0;
  for (let i = 1; i <= period; i++) {
    const d = closes[i] - closes[i - 1];
    if (d >= 0) gain += d;
    else loss -= d;
  }
  let avgGain = gain / period;
  let avgLoss = loss / period;
  const toRsi = () => (avgLoss === 0 ? 100 : 100 - 100 / (1 + avgGain / avgLoss));
  out[period] = toRsi();
  for (let i = period + 1; i < closes.length; i++) {
    const d = closes[i] - closes[i - 1];
    avgGain = (avgGain * (period - 1) + Math.max(d, 0)) / period;
    avgLoss = (avgLoss * (period - 1) + Math.max(-d, 0)) / period;
    out[i] = toRsi();
  }
  return out;
}

/**
 * Exit rule 1, evaluated on bar i (the confirmation day):
 *   day 1 (i-1): close crosses below SMA21 (previous close was at/above SMA21)
 *   day 2 (i):   close is still below SMA21
 *                — with rule "green-below", day 2 must also be a green candle
 *                  (a bounce that fails to reclaim the SMA).
 */
function isSmaExit(bars: EnrichedBar[], i: number, rule: Day2Rule): boolean {
  if (i < 2) return false;
  const d0 = bars[i - 2];
  const d1 = bars[i - 1];
  const d2 = bars[i];
  if (d0.sma21 == null || d1.sma21 == null || d2.sma21 == null) return false;
  const crossedBelow = d0.close >= d0.sma21 && d1.close < d1.sma21;
  const stillBelow = d2.close < d2.sma21;
  if (!crossedBelow || !stillBelow) return false;
  return rule === "green-below" ? d2.green : true;
}

// Mirror of exit rule 1 for entries: cross above SMA21, holds above next day, RSI > 50.
function isEntry(bars: EnrichedBar[], i: number): boolean {
  if (i < 2) return false;
  const d0 = bars[i - 2];
  const d1 = bars[i - 1];
  const d2 = bars[i];
  if (d0.sma21 == null || d1.sma21 == null || d2.sma21 == null || d2.rsi14 == null) return false;
  return d0.close <= d0.sma21 && d1.close > d1.sma21 && d2.close > d2.sma21 && d2.rsi14 > RSI_ENTRY;
}

export function enrich(bars: Bar[], rule: Day2Rule = "below"): EnrichedBar[] {
  const closes = bars.map((b) => b.close);
  const s = sma(closes, SMA_PERIOD);
  const r = rsi(closes, RSI_PERIOD);
  const out: EnrichedBar[] = bars.map((b, i) => ({
    ...b,
    sma21: s[i],
    rsi14: r[i],
    green: b.close > b.open,
    exitSma: false,
    exitRsi: false,
    entry: false,
  }));
  for (let i = 0; i < out.length; i++) {
    out[i].exitSma = isSmaExit(out, i, rule);
    const prev = i > 0 ? out[i - 1].rsi14 : null;
    const cur = out[i].rsi14;
    out[i].exitRsi = cur != null && prev != null && cur < RSI_EXIT && prev >= RSI_EXIT;
    out[i].entry = isEntry(out, i);
  }
  return out;
}

/**
 * Support / resistance from swing pivots.
 * A pivot high (low) is a bar whose high (low) is the extreme of the
 * `window` bars on each side. Nearby pivots (within `tolerance`) are merged
 * into one level; levels touched more often rank higher.
 */
export function supportResistance(
  bars: Bar[],
  lookback = 180,
  window = 5,
  tolerance = 0.015,
): { supports: Level[]; resistances: Level[] } {
  const recent = bars.slice(-lookback);
  if (recent.length === 0) return { supports: [], resistances: [] };
  const pivots: number[] = [];
  for (let i = window; i < recent.length - window; i++) {
    const slice = recent.slice(i - window, i + window + 1);
    if (recent[i].high === Math.max(...slice.map((b) => b.high))) pivots.push(recent[i].high);
    if (recent[i].low === Math.min(...slice.map((b) => b.low))) pivots.push(recent[i].low);
  }
  pivots.sort((a, b) => a - b);

  const clusters: { sum: number; n: number }[] = [];
  for (const p of pivots) {
    const c = clusters[clusters.length - 1];
    if (c && Math.abs(p - c.sum / c.n) / (c.sum / c.n) <= tolerance) {
      c.sum += p;
      c.n += 1;
    } else {
      clusters.push({ sum: p, n: 1 });
    }
  }

  const last = recent[recent.length - 1].close;
  const levels = clusters.map((c) => ({ price: c.sum / c.n, touches: c.n }));
  const supports: Level[] = levels
    .filter((l) => l.price < last)
    .sort((a, b) => b.price - a.price) // nearest first
    .slice(0, 3)
    .map((l) => ({ ...l, kind: "support" }));
  const resistances: Level[] = levels
    .filter((l) => l.price > last)
    .sort((a, b) => a.price - b.price) // nearest first
    .slice(0, 3)
    .map((l) => ({ ...l, kind: "resistance" }));

  // Fallback when price is at an extreme with no pivot on one side.
  if (resistances.length === 0) {
    const hi = Math.max(...recent.map((b) => b.high));
    resistances.push({ price: hi, touches: 1, kind: "resistance" });
  }
  if (supports.length === 0) {
    const lo = Math.min(...recent.map((b) => b.low));
    supports.push({ price: lo, touches: 1, kind: "support" });
  }
  return { supports, resistances };
}

export type Status = "EXIT" | "WATCH" | "ENTRY" | "HOLD";

export interface SignalSummary {
  status: Status;
  reasons: string[];
  exitSmaActive: boolean;
  exitRsiActive: boolean;
  lastExitSmaDate: string | null;
  lastEntryDate: string | null;
}

/** Status is based on the latest bar (with a 3-session window for the SMA rule). */
export function summarize(bars: EnrichedBar[]): SignalSummary {
  const n = bars.length;
  const last = bars[n - 1];
  const prev = bars[n - 2];
  const recentWindow = bars.slice(-3);
  const exitSmaActive = recentWindow.some((b) => b.exitSma) && last.sma21 != null && last.close < last.sma21;
  const exitRsiActive = last.rsi14 != null && last.rsi14 < RSI_EXIT;
  const entryActive = recentWindow.some((b) => b.entry) && !exitSmaActive && !exitRsiActive;

  const reasons: string[] = [];
  if (exitSmaActive) reasons.push("Closed below 21-SMA and stayed below the next day");
  if (exitRsiActive) reasons.push(`RSI ${last.rsi14!.toFixed(1)} is below ${RSI_EXIT}`);

  let status: Status = "HOLD";
  if (exitSmaActive || exitRsiActive) {
    status = "EXIT";
  } else if (entryActive) {
    status = "ENTRY";
    reasons.push("Reclaimed 21-SMA, held above next day, RSI > 50");
  } else {
    // Early warnings
    if (
      last.sma21 != null && prev?.sma21 != null &&
      prev.close >= prev.sma21 && last.close < last.sma21
    ) {
      reasons.push("Crossed below 21-SMA today — exit confirms if next close is also below");
    }
    if (last.rsi14 != null && last.rsi14 < 45) reasons.push(`RSI ${last.rsi14.toFixed(1)} approaching ${RSI_EXIT}`);
    if (last.sma21 != null && last.close < last.sma21 && reasons.length === 0) {
      reasons.push("Trading below 21-SMA");
    }
    if (reasons.length > 0) status = "WATCH";
    else reasons.push("Above 21-SMA and RSI ≥ 40 — no exit trigger");
  }

  const lastExit = [...bars].reverse().find((b) => b.exitSma);
  const lastEntry = [...bars].reverse().find((b) => b.entry);
  return {
    status,
    reasons,
    exitSmaActive,
    exitRsiActive,
    lastExitSmaDate: lastExit?.date ?? null,
    lastEntryDate: lastEntry?.date ?? null,
  };
}
