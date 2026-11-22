import YahooFinance from "yahoo-finance2";
import { enrich, summarize, supportResistance, type Bar, type Day2Rule } from "@/lib/indicators";

const yahooFinance = new YahooFinance({ suppressNotices: ["yahooSurvey"] });

const SYMBOL_RE = /^[A-Z0-9.\-^=]{1,15}$/;

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const symbol = (searchParams.get("symbol") || "").trim().toUpperCase();
  const rule: Day2Rule = searchParams.get("rule") === "green-below" ? "green-below" : "below";

  if (!SYMBOL_RE.test(symbol)) {
    return Response.json({ error: "Invalid ticker symbol" }, { status: 400 });
  }

  try {
    // ~2 years so the 21-SMA / RSI are warmed up for the full 1-year view.
    const period1 = new Date();
    period1.setFullYear(period1.getFullYear() - 2);
    const result = await yahooFinance.chart(symbol, { period1, interval: "1d" });

    const bars: Bar[] = result.quotes
      .filter((q) => q.open != null && q.high != null && q.low != null && q.close != null)
      .map((q) => ({
        date: q.date.toISOString().slice(0, 10),
        open: q.open!,
        high: q.high!,
        low: q.low!,
        close: q.close!,
        volume: q.volume ?? 0,
      }));

    if (bars.length < 60) {
      return Response.json({ error: `Not enough price history for ${symbol}` }, { status: 404 });
    }

    const enriched = enrich(bars, rule);
    const levels = supportResistance(bars);
    const summary = summarize(enriched);
    const last = enriched[enriched.length - 1];
    const prev = enriched[enriched.length - 2];
    const year = enriched.slice(-252);

    return Response.json({
      symbol,
      name: result.meta.longName || result.meta.shortName || symbol,
      currency: result.meta.currency,
      price: last.close,
      change: last.close - prev.close,
      changePct: ((last.close - prev.close) / prev.close) * 100,
      sma21: last.sma21,
      rsi14: last.rsi14,
      high52: Math.max(...year.map((b) => b.high)),
      low52: Math.min(...year.map((b) => b.low)),
      asOf: last.date,
      rule,
      summary,
      levels,
      bars: year,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return Response.json({ error: `Could not load ${symbol}: ${message}` }, { status: 502 });
  }
}
