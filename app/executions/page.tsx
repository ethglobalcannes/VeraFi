"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { ArrowLeft, RefreshCw, ExternalLink, Shield, Activity } from "lucide-react";
import type { FilledEvent } from "@/app/api/events/route";

// ─── Config ──────────────────────────────────────────────────────────────────
const COSTON2_EXPLORER = "https://coston2-explorer.flare.network/tx";
const REFRESH_INTERVAL = 15_000; // poll every 15s

// ─── Helpers ─────────────────────────────────────────────────────────────────
function shortAddr(addr: string) {
  return addr.slice(0, 6) + "…" + addr.slice(-4);
}

function shortHash(hash: string) {
  return hash.slice(0, 8) + "…" + hash.slice(-6);
}

// MockGamma stores price/strike/quantity as raw uint256
// For the demo these are in wei-like units — divide by 1e18 to get human values
function fromWei(raw: string, decimals = 4) {
  const val = Number(BigInt(raw)) / 1e18;
  return val.toLocaleString("en-US", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

function formatExpiry(ts: number) {
  const d = new Date(ts * 1000);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "2-digit" });
}

function timeAgo(blockNumber: number, latestBlock: number) {
  const diff = latestBlock - blockNumber;
  if (diff < 2) return "just now";
  if (diff < 60) return `~${diff} blocks ago`;
  const mins = Math.floor((diff * 2) / 60); // Coston2 ~2s blocks
  if (mins < 60) return `${mins}m ago`;
  return `${Math.floor(mins / 60)}h ago`;
}

// ─── Component ───────────────────────────────────────────────────────────────
export default function ExecutionsPage() {
  const [events, setEvents] = useState<FilledEvent[]>([]);
  const [latestBlock, setLatestBlock] = useState(0);
  const [scannedFrom, setScannedFrom] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const fetchEvents = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    else setRefreshing(true);
    setError(null);

    try {
      const res = await fetch("/api/events");
      if (!res.ok) throw new Error("Failed to fetch events.");
      const data = await res.json();
      setEvents(data.events ?? []);
      setLatestBlock(data.latestBlock ?? 0);
      setScannedFrom(data.scannedFrom ?? 0);
      setLastRefresh(new Date());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  // Initial load + auto-refresh
  useEffect(() => {
    fetchEvents();
    const timer = setInterval(() => fetchEvents(true), REFRESH_INTERVAL);
    return () => clearInterval(timer);
  }, [fetchEvents]);

  return (
    <div className="min-h-screen bg-brand-bg text-brand-text">
      {/* Nav */}
      <nav className="border-b border-white/[0.06] px-6 py-4 flex items-center gap-4">
        <Link
          href="/"
          className="flex items-center gap-2 text-brand-text/50 hover:text-brand-text transition-colors text-sm"
        >
          <ArrowLeft className="w-4 h-4" />
          Back
        </Link>
        <div className="h-4 w-px bg-white/10" />
        <span className="font-semibold text-brand-text">VeraFi</span>
        <span className="text-brand-text/30">·</span>
        <span className="text-sm text-brand-text/50">Execution Feed</span>
        <div className="ml-auto flex items-center gap-3">
          {latestBlock > 0 && (
            <span className="text-xs text-brand-text/30 font-mono hidden sm:block">
              block #{latestBlock.toLocaleString()}
            </span>
          )}
          <div className="flex items-center gap-2 bg-white/[0.04] border border-white/[0.08] rounded-full px-3 py-1">
            <div className="w-1.5 h-1.5 rounded-full bg-brand-cyan animate-pulse" />
            <span className="text-xs text-brand-text/50 font-mono">Flare Coston2</span>
          </div>
        </div>
      </nav>

      <div className="max-w-5xl mx-auto px-6 py-10">
        {/* Header */}
        <div className="flex items-start justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-brand-text flex items-center gap-3">
              <Activity className="w-6 h-6 text-brand-cyan" />
              Live Execution Feed
            </h1>
            <p className="text-brand-text/40 text-sm mt-1">
              On-chain <code className="text-brand-cyan/70 font-mono text-xs">OptionFilled</code> events
              from MockGamma · {scannedFrom > 0 && `scanning from block ${scannedFrom.toLocaleString()}`}
            </p>
          </div>
          <button
            onClick={() => fetchEvents(true)}
            disabled={refreshing}
            className="flex items-center gap-2 text-sm text-brand-text/50 hover:text-brand-text transition-colors glass-card px-4 py-2"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? "animate-spin text-brand-cyan" : ""}`} />
            {lastRefresh ? `Updated ${lastRefresh.toLocaleTimeString()}` : "Refresh"}
          </button>
        </div>

        {/* Contract badge */}
        <div className="glass-card px-5 py-3 flex items-center gap-3 mb-6 border border-brand-blue/10">
          <Shield className="w-4 h-4 text-brand-blue shrink-0" />
          <div className="flex-1 min-w-0">
            <span className="text-xs text-brand-text/40">MockGamma · </span>
            <a
              href={`https://coston2-explorer.flare.network/address/0x51947aC30bB1F289F20bA740E1664cE20E23F94A`}
              target="_blank"
              rel="noopener noreferrer"
              className="font-mono text-xs text-brand-blue/80 hover:text-brand-blue transition-colors break-all"
            >
              0x51947aC30bB1F289F20bA740E1664cE20E23F94A
            </a>
          </div>
          <a
            href="https://coston2-explorer.flare.network/address/0x51947aC30bB1F289F20bA740E1664cE20E23F94A"
            target="_blank"
            rel="noopener noreferrer"
            className="text-brand-text/30 hover:text-brand-text/70 transition-colors shrink-0"
          >
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </div>

        {/* Feed */}
        {loading ? (
          <div className="glass-card p-16 flex flex-col items-center gap-4">
            <div className="w-10 h-10 rounded-full border-2 border-brand-blue/30 border-t-brand-blue animate-spin" />
            <p className="text-brand-text/40 text-sm">Querying Flare Coston2…</p>
          </div>
        ) : error ? (
          <div className="glass-card p-8 flex flex-col items-center gap-3 border border-red-400/20">
            <p className="text-red-400 text-sm">{error}</p>
            <button
              onClick={() => fetchEvents()}
              className="text-xs text-brand-text/50 hover:text-brand-text transition-colors underline"
            >
              Try again
            </button>
          </div>
        ) : events.length === 0 ? (
          <div className="glass-card p-16 flex flex-col items-center gap-4">
            <div className="w-14 h-14 rounded-full bg-white/[0.03] border border-white/[0.08] flex items-center justify-center">
              <Activity className="w-6 h-6 text-brand-text/20" />
            </div>
            <div className="text-center">
              <p className="font-semibold text-brand-text/40">No executions yet</p>
              <p className="text-sm text-brand-text/20 mt-1">
                Filled options will appear here in real-time once the vault is live.
              </p>
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {/* Table header */}
            <div className="grid grid-cols-7 gap-4 px-5 py-2 text-xs font-semibold uppercase tracking-widest text-brand-text/30">
              <span>Type</span>
              <span>Strike</span>
              <span>Qty</span>
              <span>Price</span>
              <span>Expiry</span>
              <span>Taker</span>
              <span>Tx</span>
            </div>

            {events.map((e, i) => (
              <div
                key={e.txHash + i}
                className="glass-card px-5 py-4 grid grid-cols-7 gap-4 items-center hover:border-brand-blue/20 transition-colors"
              >
                {/* Type */}
                <span className={`text-xs font-bold px-2 py-1 rounded-lg w-fit ${
                  e.isPut
                    ? "bg-brand-purple/20 text-brand-purple border border-brand-purple/20"
                    : "bg-brand-cyan/10 text-brand-cyan border border-brand-cyan/20"
                }`}>
                  {e.isPut ? "PUT" : "CALL"}
                </span>

                {/* Strike */}
                <span className="font-mono text-sm text-brand-text">
                  ${fromWei(e.strike, 2)}
                </span>

                {/* Quantity */}
                <span className="font-mono text-sm text-brand-text/70">
                  {fromWei(e.quantity, 2)}
                </span>

                {/* Price */}
                <span className="font-mono text-sm text-brand-cyan">
                  {fromWei(e.price, 4)}
                </span>

                {/* Expiry */}
                <span className="text-xs text-brand-text/50">
                  {formatExpiry(e.expiry)}
                </span>

                {/* Taker */}
                <span className="font-mono text-xs text-brand-text/50">
                  {shortAddr(e.taker)}
                </span>

                {/* Tx link */}
                <a
                  href={`${COSTON2_EXPLORER}/${e.txHash}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 font-mono text-xs text-brand-blue/70 hover:text-brand-blue transition-colors"
                >
                  {shortHash(e.txHash)}
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            ))}

            <p className="text-xs text-brand-text/20 text-center mt-2">
              Auto-refreshes every 15s · {events.length} execution{events.length !== 1 ? "s" : ""} found
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
