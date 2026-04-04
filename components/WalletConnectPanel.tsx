"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { CheckCircle, Loader2, AlertCircle, X } from "lucide-react";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
type ConnectionState =
  | { status: "idle" }
  | { status: "connecting"; wallet: WalletId }
  | { status: "qr"; wallet: "xaman"; qrUrl: string; uuid: string }
  | { status: "connected"; wallet: WalletId; address: string }
  | { status: "error"; wallet: WalletId; message: string };

type WalletId = "xaman" | "crossmark" | "gemwallet";

// ---------------------------------------------------------------------------
// Wallet connectors
// ---------------------------------------------------------------------------

async function connectCrossmark(): Promise<string> {
  const { default: sdk } = await import("@crossmarkio/sdk");
  const result = await sdk.methods.signInAndWait();
  const address = result?.response?.data?.address;
  if (!address) throw new Error("Crossmark did not return an address.");
  return address;
}

async function connectGemWallet(): Promise<string> {
  const { isConnected, getAddress } = await import("@gemwallet/api");
  const connRes = await isConnected();
  if (!connRes.result?.isConnected) {
    throw new Error("GemWallet extension not found. Install it first.");
  }
  const addrRes = await getAddress();
  const address = addrRes.result?.address;
  if (!address) throw new Error("GemWallet did not return an address.");
  return address;
}

// Returns { qrUrl, uuid } so the UI can render the QR before sign completes.
async function createXamanPayload(): Promise<{ qrUrl: string; uuid: string }> {
  const apiKey = process.env.NEXT_PUBLIC_XUMM_API_KEY;
  if (!apiKey) {
    throw new Error(
      "NEXT_PUBLIC_XUMM_API_KEY is not set. Add it to .env.local."
    );
  }
  const { Xumm } = await import("xumm");
  const xumm = new Xumm(apiKey);
  const payload = await (xumm as any).payload?.create({
    txjson: { TransactionType: "SignIn" },
  });
  if (!payload?.refs?.qr_png || !payload?.uuid) {
    throw new Error("Failed to create Xaman sign-in payload.");
  }
  return { qrUrl: payload.refs.qr_png, uuid: payload.uuid };
}

async function pollXamanPayload(
  uuid: string,
  onResolved: (address: string) => void,
  onError: (msg: string) => void,
  signal: AbortSignal
): Promise<void> {
  const apiKey = process.env.NEXT_PUBLIC_XUMM_API_KEY!;
  const { Xumm } = await import("xumm");
  const xumm = new Xumm(apiKey);

  const interval = setInterval(async () => {
    if (signal.aborted) {
      clearInterval(interval);
      return;
    }
    try {
      const result = await (xumm as any).payload?.get(uuid);
      if (result?.meta?.signed === true) {
        clearInterval(interval);
        const address = result?.response?.account;
        if (address) onResolved(address);
        else onError("Xaman signed but no address returned.");
      } else if (result?.meta?.expired || result?.meta?.cancelled) {
        clearInterval(interval);
        onError("Xaman request expired or was cancelled.");
      }
    } catch {
      // keep polling
    }
  }, 2500);
}

// ---------------------------------------------------------------------------
// Wallet definitions
// ---------------------------------------------------------------------------
const WALLETS: { id: WalletId; label: string; description: string; icon: React.ReactNode }[] = [
  {
    id: "xaman",
    label: "Xaman",
    description: "Scan QR with the Xaman app",
    icon: (
      <svg viewBox="0 0 40 40" fill="none" className="w-7 h-7">
        <rect width="40" height="40" rx="10" fill="#1A1F36" />
        <path d="M12 28L20 12L28 28H22.5L20 22.5L17.5 28H12Z" fill="#6b8fff" />
        <circle cx="20" cy="20" r="3" fill="#00e5ff" />
      </svg>
    ),
  },
  {
    id: "crossmark",
    label: "Crossmark",
    description: "Browser extension wallet",
    icon: (
      <svg viewBox="0 0 40 40" fill="none" className="w-7 h-7">
        <rect width="40" height="40" rx="10" fill="#1A1F36" />
        <path
          d="M13 13L27 27M27 13L13 27"
          stroke="#9b6bff"
          strokeWidth="3"
          strokeLinecap="round"
        />
      </svg>
    ),
  },
  {
    id: "gemwallet",
    label: "GemWallet",
    description: "Browser extension wallet",
    icon: (
      <svg viewBox="0 0 40 40" fill="none" className="w-7 h-7">
        <rect width="40" height="40" rx="10" fill="#1A1F36" />
        <polygon
          points="20,10 30,17 30,27 20,33 10,27 10,17"
          fill="none"
          stroke="#00e5ff"
          strokeWidth="2"
        />
        <polygon
          points="20,15 26,19 26,25 20,29 14,25 14,19"
          fill="#00e5ff"
          fillOpacity="0.2"
          stroke="#00e5ff"
          strokeWidth="1"
        />
      </svg>
    ),
  },
];

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------
export default function WalletConnectPanel() {
  const [conn, setConn] = useState<ConnectionState>({ status: "idle" });
  const abortRef = useRef<AbortController | null>(null);

  // Clean up polling on unmount
  useEffect(() => {
    return () => abortRef.current?.abort();
  }, []);

  const handleConnect = useCallback(async (walletId: WalletId) => {
    abortRef.current?.abort();
    abortRef.current = new AbortController();
    setConn({ status: "connecting", wallet: walletId });

    try {
      if (walletId === "crossmark") {
        const address = await connectCrossmark();
        setConn({ status: "connected", wallet: "crossmark", address });

      } else if (walletId === "gemwallet") {
        const address = await connectGemWallet();
        setConn({ status: "connected", wallet: "gemwallet", address });

      } else {
        // Xaman — create payload, show QR, then poll
        const { qrUrl, uuid } = await createXamanPayload();
        setConn({ status: "qr", wallet: "xaman", qrUrl, uuid });

        pollXamanPayload(
          uuid,
          (address) => setConn({ status: "connected", wallet: "xaman", address }),
          (msg) => setConn({ status: "error", wallet: "xaman", message: msg }),
          abortRef.current.signal
        );
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Connection failed.";
      setConn({ status: "error", wallet: walletId, message });
    }
  }, []);

  const handleDisconnect = useCallback(() => {
    abortRef.current?.abort();
    setConn({ status: "idle" });
  }, []);

  // ── Connected ──────────────────────────────────────────────────────────────
  if (conn.status === "connected") {
    return (
      <div className="glass-card p-8 flex flex-col items-center gap-5 animate-fade-in">
        <div className="w-14 h-14 rounded-full bg-brand-cyan/10 flex items-center justify-center">
          <CheckCircle className="w-7 h-7 text-brand-cyan" />
        </div>
        <div className="text-center">
          <p className="text-brand-text/60 text-sm mb-1">Connected via</p>
          <p className="font-semibold text-brand-text capitalize">{conn.wallet}</p>
        </div>
        <div className="w-full bg-white/[0.05] border border-white/[0.08] rounded-xl px-4 py-3 text-center">
          <p className="text-xs text-brand-text/40 mb-1 uppercase tracking-widest font-mono">
            XRPL Address
          </p>
          <p className="font-mono text-brand-cyan text-sm break-all">{conn.address}</p>
        </div>
        <button
          onClick={handleDisconnect}
          className="text-xs text-brand-text/40 hover:text-brand-text/70 transition-colors mt-1"
        >
          Disconnect
        </button>
      </div>
    );
  }

  // ── Xaman QR ───────────────────────────────────────────────────────────────
  if (conn.status === "qr") {
    return (
      <div className="glass-card p-8 flex flex-col items-center gap-5 animate-fade-in">
        <div className="flex items-center justify-between w-full">
          <p className="text-brand-text font-semibold">Scan with Xaman</p>
          <button
            onClick={handleDisconnect}
            className="text-brand-text/40 hover:text-brand-text/70 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        {/* QR code */}
        <div className="w-48 h-48 rounded-xl overflow-hidden bg-white p-2">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={conn.qrUrl} alt="Xaman QR code" className="w-full h-full object-contain" />
        </div>
        <div className="flex items-center gap-2 text-brand-text/50 text-sm">
          <Loader2 className="w-4 h-4 animate-spin text-brand-blue" />
          Waiting for signature…
        </div>
        <p className="text-xs text-brand-text/30 text-center">
          Open Xaman on your phone and scan the QR code to sign in.
        </p>
      </div>
    );
  }

  // ── Idle / connecting / error ───────────────────────────────────────────────
  return (
    <div className="flex flex-col gap-3">
      {WALLETS.map((w) => {
        const isConnecting = conn.status === "connecting" && conn.wallet === w.id;
        const isError = conn.status === "error" && conn.wallet === w.id;

        return (
          <div key={w.id}>
            <button
              onClick={() => handleConnect(w.id)}
              disabled={conn.status === "connecting"}
              className={`
                w-full glass-card px-5 py-4 flex items-center gap-4
                border border-white/[0.08] rounded-2xl text-left
                transition-all duration-200
                disabled:opacity-50 disabled:cursor-not-allowed
                ${isError ? "border-red-500/40" : "hover:border-brand-blue/40 hover:bg-white/[0.06]"}
              `}
            >
              <div className="shrink-0">{w.icon}</div>
              <div className="flex-1">
                <p className="font-semibold text-brand-text text-sm">{w.label}</p>
                <p className="text-xs text-brand-text/40 mt-0.5">{w.description}</p>
              </div>
              {isConnecting && (
                <Loader2 className="w-4 h-4 text-brand-blue animate-spin shrink-0" />
              )}
              {isError && (
                <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
              )}
              {!isConnecting && !isError && (
                <svg className="w-4 h-4 text-brand-text/30 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 18l6-6-6-6" />
                </svg>
              )}
            </button>
            {isError && (
              <p className="mt-1.5 text-xs text-red-400/80 px-2 animate-fade-in">
                {(conn as { status: "error"; message: string }).message}
              </p>
            )}
          </div>
        );
      })}

      <p className="text-center text-xs text-brand-text/30 mt-2">
        XRPL Testnet · wss://s.altnet.rippletest.net:51233
      </p>
    </div>
  );
}
