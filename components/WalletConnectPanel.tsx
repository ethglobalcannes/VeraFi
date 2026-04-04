"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { CheckCircle, Loader2, AlertCircle } from "lucide-react";

// ---------------------------------------------------------------------------
// xrpl-connect — https://github.com/XRPL-Commons/xrpl-connect
// WalletManager is an event-emitting class; adapters are passed to connect().
// ---------------------------------------------------------------------------
type XRPLAccount = {
  address: string;
  network?: string;
};

type WalletManagerInstance = {
  connect: (adapter: unknown) => Promise<void>;
  disconnect: () => Promise<void>;
  on: (event: string, cb: (data: unknown) => void) => void;
  off: (event: string, cb: (data: unknown) => void) => void;
};

async function buildManager(): Promise<WalletManagerInstance | null> {
  try {
    const mod = await import("xrpl-connect");
    return new mod.WalletManager();
  } catch {
    return null;
  }
}

async function buildAdapter(
  wallet: "xaman" | "crossmark" | "gemwallet"
): Promise<unknown | null> {
  try {
    const mod = await import("xrpl-connect");
    const map: Record<string, new () => unknown> = {
      xaman: mod.XamanAdapter,
      crossmark: mod.CrossmarkAdapter,
      gemwallet: mod.GemWalletAdapter,
    };
    const Cls = map[wallet];
    return Cls ? new Cls() : null;
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------

const WALLETS = [
  {
    id: "xaman" as const,
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
    id: "crossmark" as const,
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
    id: "gemwallet" as const,
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

type ConnectionState =
  | { status: "idle" }
  | { status: "connecting"; wallet: string }
  | { status: "connected"; wallet: string; address: string }
  | { status: "error"; wallet: string; message: string };

export default function WalletConnectPanel() {
  const [conn, setConn] = useState<ConnectionState>({ status: "idle" });
  const managerRef = useRef<WalletManagerInstance | null>(null);

  // Lazily initialise WalletManager once on mount
  useEffect(() => {
    buildManager().then((m) => {
      if (!m) return;
      managerRef.current = m;

      const onConnect = (data: unknown) => {
        const account = data as XRPLAccount;
        setConn((prev) =>
          prev.status === "connecting"
            ? { status: "connected", wallet: prev.wallet, address: account.address }
            : prev
        );
      };
      const onError = (data: unknown) => {
        const err = data as { message?: string };
        setConn((prev) =>
          prev.status === "connecting"
            ? { status: "error", wallet: prev.wallet, message: err?.message ?? "Connection failed" }
            : prev
        );
      };

      m.on("connect", onConnect);
      m.on("error", onError);

      return () => {
        m.off("connect", onConnect);
        m.off("error", onError);
      };
    });
  }, []);

  const handleConnect = useCallback(
    async (walletId: "xaman" | "crossmark" | "gemwallet") => {
      setConn({ status: "connecting", wallet: walletId });

      // Ensure manager is ready
      if (!managerRef.current) {
        managerRef.current = await buildManager();
      }
      if (!managerRef.current) {
        setConn({
          status: "error",
          wallet: walletId,
          message: "xrpl-connect could not be loaded. Run: npm install xrpl-connect",
        });
        return;
      }

      const adapter = await buildAdapter(walletId);
      if (!adapter) {
        setConn({
          status: "error",
          wallet: walletId,
          message: `${walletId} adapter not found in xrpl-connect.`,
        });
        return;
      }

      try {
        await managerRef.current.connect(adapter);
        // Resolved account arrives via the "connect" event listener above
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : "Connection failed";
        setConn({ status: "error", wallet: walletId, message });
      }
    },
    []
  );

  const handleDisconnect = useCallback(async () => {
    try {
      await managerRef.current?.disconnect();
    } catch {
      // ignore
    }
    setConn({ status: "idle" });
  }, []);

  // ---- Connected state ----
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

  // ---- Default / connecting / error state ----
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
                ${
                  isError
                    ? "border-red-500/40"
                    : "hover:border-brand-blue/40 hover:bg-white/[0.06]"
                }
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
                <svg
                  className="w-4 h-4 text-brand-text/30 shrink-0"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
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
