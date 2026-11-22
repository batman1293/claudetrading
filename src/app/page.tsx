"use client";
import { useState } from "react";
import Navbar from "@/components/Navbar";
import OverviewView from "@/components/OverviewView";
import MoneyFlowView from "@/components/MoneyFlowView";
import SectorsView from "@/components/SectorsView";
import MomentumView from "@/components/MomentumView";
import dynamic from "next/dynamic";

// Client-only: the watchlist lives in localStorage.
const SignalsView = dynamic(() => import("@/components/SignalsView"), { ssr: false });

export default function Home() {
  const [activeTab, setActiveTab] = useState("signals");
  const [market, setMarket] = useState("US");

  return (
    <div className="min-h-screen" style={{ background: '#0f1117' }}>
      <Navbar
        activeTab={activeTab}
        onTabChange={setActiveTab}
        market={market}
        onMarketChange={setMarket}
      />
      <main className="max-w-[1400px] mx-auto px-4 py-6">
        {activeTab === "signals" && <SignalsView />}
        {activeTab === "overview" && (
          <OverviewView market={market} onNavigate={setActiveTab} />
        )}
        {activeTab === "money-flow" && <MoneyFlowView market={market} />}
        {activeTab === "sectors" && <SectorsView market={market} />}
        {activeTab === "momentum" && <MomentumView market={market} />}
      </main>
    </div>
  );
}
