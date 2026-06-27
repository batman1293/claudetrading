"use client";
import { useState } from "react";

interface NavbarProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
  market: string;
  onMarketChange: (market: string) => void;
}

const tabs = [
  { id: "overview", label: "Overview", icon: "◈" },
  { id: "money-flow", label: "Money Flow", icon: "⇄" },
  { id: "sectors", label: "Sectors", icon: "⊞" },
  { id: "momentum", label: "Momentum Stocks", icon: "↑" },
];

export default function Navbar({ activeTab, onTabChange, market, onMarketChange }: NavbarProps) {
  return (
    <nav style={{ background: '#111827', borderBottom: '1px solid #1f2937' }} className="sticky top-0 z-50 px-4 py-3">
      <div className="max-w-[1400px] mx-auto flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <span className="text-blue-400 text-xl font-bold">StockEdge</span>
          <span style={{ background: '#1e3a5f', color: '#60a5fa' }} className="text-xs px-2 py-0.5 rounded-full font-semibold">PRO</span>
        </div>

        <div className="flex items-center gap-1 flex-wrap">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                activeTab === tab.id
                  ? "text-white"
                  : "text-gray-400 hover:text-gray-200"
              }`}
              style={activeTab === tab.id ? { background: '#2563eb' } : { background: 'transparent' }}
            >
              <span className="mr-1">{tab.icon}</span>
              {tab.label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <span className="text-gray-500 text-xs">Market:</span>
          <div className="flex rounded-lg overflow-hidden" style={{ border: '1px solid #374151' }}>
            {["US", "IN"].map((m) => (
              <button
                key={m}
                onClick={() => onMarketChange(m)}
                className={`px-3 py-1 text-sm font-semibold transition-all ${
                  market === m ? "text-white" : "text-gray-400"
                }`}
                style={market === m ? { background: '#1d4ed8' } : { background: '#1f2937' }}
              >
                {m === "US" ? "🇺🇸 US" : "🇮🇳 India"}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse"></span>
            <span className="text-gray-500 text-xs">Live</span>
          </div>
        </div>
      </div>
    </nav>
  );
}
