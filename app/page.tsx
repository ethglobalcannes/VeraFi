import Image from "next/image";
import Link from "next/link";
import Navbar from "@/components/Navbar";
import FeatureCard from "@/components/FeatureCard";

// Icons (inlined SVG to avoid extra deps)
function ShieldIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} className="w-6 h-6">
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
    </svg>
  );
}

function ChainIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} className="w-6 h-6">
      <path strokeLinecap="round" strokeLinejoin="round" d="M13.19 8.688a4.5 4.5 0 011.242 7.244l-4.5 4.5a4.5 4.5 0 01-6.364-6.364l1.757-1.757m13.35-.622l1.757-1.757a4.5 4.5 0 00-6.364-6.364l-4.5 4.5a4.5 4.5 0 001.242 7.244" />
    </svg>
  );
}

function WalletIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} className="w-6 h-6">
      <path strokeLinecap="round" strokeLinejoin="round" d="M21 12a2.25 2.25 0 00-2.25-2.25H15a3 3 0 11-6 0H5.25A2.25 2.25 0 003 12m18 0v6a2.25 2.25 0 01-2.25 2.25H5.25A2.25 2.25 0 013 18v-6m18 0V9M3 12V9m18 0a2.25 2.25 0 00-2.25-2.25H5.25A2.25 2.25 0 003 9m18 0V6a2.25 2.25 0 00-2.25-2.25H5.25A2.25 2.25 0 003 6v3" />
    </svg>
  );
}

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-brand-bg overflow-x-hidden">
      <Navbar />

      {/* ── Hero ─────────────────────────────────────────────────────────── */}
      <section className="relative pt-36 pb-28 px-6 flex flex-col items-center text-center overflow-hidden">
        {/* Background glow blobs */}
        <div
          className="pointer-events-none absolute inset-0"
          aria-hidden="true"
        >
          <div
            className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[600px] h-[600px] rounded-full opacity-10 blur-3xl"
            style={{
              background:
                "radial-gradient(circle, #6b8fff 0%, #9b6bff 50%, transparent 80%)",
            }}
          />
          <div
            className="absolute top-1/3 right-1/4 w-[300px] h-[300px] rounded-full opacity-8 blur-3xl"
            style={{
              background: "radial-gradient(circle, #00e5ff 0%, transparent 70%)",
            }}
          />
        </div>

        {/* Logo */}
        <div
          className="relative mb-8 animate-fade-in-up"
          style={{ animationDelay: "0ms" }}
        >
          <div className="relative w-20 h-20 mx-auto">
            <Image
              src="/Verafi_Hero_Logo.png"
              alt="VeraFi Logo"
              fill
              priority
              className="object-contain rounded-2xl"
              style={{
                filter: "drop-shadow(0 0 24px rgba(107,143,255,0.5))",
              }}
            />
          </div>
        </div>

        {/* Eyebrow */}
        <div
          className="mb-5 animate-fade-in-up"
          style={{ animationDelay: "80ms" }}
        >
          <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-brand-cyan/30 bg-brand-cyan/5 text-brand-cyan text-xs font-medium tracking-widest uppercase">
            <span className="w-1.5 h-1.5 rounded-full bg-brand-cyan animate-glow-pulse" />
            Powered by TEE + XRPL
          </span>
        </div>

        {/* Headline */}
        <h1
          className="animate-fade-in-up text-5xl md:text-6xl lg:text-7xl font-extrabold tracking-tight leading-[1.07] mb-6 max-w-4xl"
          style={{ animationDelay: "160ms" }}
        >
          <span className="text-brand-text">Verifiable</span>{" "}
          <span
            style={{
              background: "linear-gradient(90deg, #6b8fff 0%, #00e5ff 60%, #9b6bff 100%)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              backgroundClip: "text",
            }}
          >
            Options Pricing
          </span>
        </h1>

        {/* Subheadline */}
        <p
          className="animate-fade-in-up text-brand-text/60 text-lg md:text-xl max-w-2xl leading-relaxed mb-10"
          style={{ animationDelay: "240ms" }}
        >
          The first options market maker that publishes a{" "}
          <span className="text-brand-text/90 font-medium">cryptographic proof of honest pricing</span>{" "}
          on-chain with every single quote.
        </p>

        {/* CTA */}
        <div
          className="flex flex-col sm:flex-row gap-4 animate-fade-in-up"
          style={{ animationDelay: "320ms" }}
        >
          <Link href="/login" className="btn-primary text-white">
            Launch App
            <svg
              className="w-4 h-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
            </svg>
          </Link>
          <a
            href="#how-it-works"
            className="inline-flex items-center justify-center gap-2 px-8 py-3.5 rounded-xl font-semibold text-sm text-brand-text/70 hover:text-brand-text border border-white/[0.1] hover:border-white/[0.2] transition-all duration-200"
          >
            How it works
          </a>
        </div>

        {/* Stats bar */}
        <div
          className="mt-16 animate-fade-in-up grid grid-cols-3 gap-px bg-white/[0.06] border border-white/[0.08] rounded-2xl overflow-hidden max-w-lg w-full"
          style={{ animationDelay: "400ms" }}
        >
          {[
            { label: "Proof per Quote", value: "1:1" },
            { label: "On-chain Attestations", value: "TEE" },
            { label: "EVM Wallet Required", value: "Never" },
          ].map((s) => (
            <div
              key={s.label}
              className="bg-brand-bg px-4 py-4 text-center"
            >
              <p className="text-brand-blue font-bold text-xl">{s.value}</p>
              <p className="text-brand-text/40 text-xs mt-0.5">{s.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Features ─────────────────────────────────────────────────────── */}
      <section id="features" className="px-6 pb-28 max-w-6xl mx-auto">
        <div className="text-center mb-12">
          <p className="text-brand-text/40 text-sm uppercase tracking-widest font-medium mb-3">
            Why VeraFi
          </p>
          <h2 className="text-3xl md:text-4xl font-bold text-brand-text tracking-tight">
            Trust built into every quote
          </h2>
        </div>

        <div className="grid md:grid-cols-3 gap-5">
          <FeatureCard
            icon={<ShieldIcon />}
            glowColor="blue"
            delay={0}
            title="Attested Pricing"
            description="Every option quote is computed inside a Trusted Execution Environment (TEE). Tamper-proof hardware ensures the pricing model cannot be altered — not even by us."
          />
          <FeatureCard
            icon={<ChainIcon />}
            glowColor="cyan"
            delay={120}
            title="On-Chain Proof"
            description="An attestation token is stored on-chain alongside every quote. Anyone can independently verify that the price was computed honestly inside the TEE — zero trust required."
          />
          <FeatureCard
            icon={<WalletIcon />}
            glowColor="purple"
            delay={240}
            title="XRPL Native"
            description="XRP users connect directly via Xaman or Crossmark. No bridge, no EVM wallet, no wrapped assets — options trading where XRP already lives."
          />
        </div>
      </section>

      {/* ── How it works ─────────────────────────────────────────────────── */}
      <section
        id="how-it-works"
        className="px-6 pb-28 max-w-4xl mx-auto"
      >
        <div className="text-center mb-12">
          <p className="text-brand-text/40 text-sm uppercase tracking-widest font-medium mb-3">
            The Flow
          </p>
          <h2 className="text-3xl md:text-4xl font-bold text-brand-text tracking-tight">
            How it works
          </h2>
        </div>

        <ol className="relative border-l border-white/[0.08] space-y-10 ml-4">
          {[
            {
              step: "01",
              color: "brand-blue",
              colorHex: "#6b8fff",
              title: "Request a Quote (RFQ)",
              body: "User signs an RFQ Intent with their XRPL wallet — specifying underlying, strike, expiry, and size.",
            },
            {
              step: "02",
              color: "brand-cyan",
              colorHex: "#00e5ff",
              title: "TEE Pricing",
              body: "The intent reaches the VeraFi pricer running inside a TEE. A Black-Scholes model prices the option with live Flare FTSO oracle data.",
            },
            {
              step: "03",
              color: "brand-purple",
              colorHex: "#9b6bff",
              title: "Proof Published",
              body: "The TEE generates a remote attestation token. The quote + attestation are written on-chain together before the user sees a price.",
            },
            {
              step: "04",
              color: "brand-blue",
              colorHex: "#6b8fff",
              title: "Trade or Walk",
              body: "User accepts the quote with a single XRPL payment transaction, or walks away — no gas, no EVM.",
            },
          ].map((item) => (
            <li key={item.step} className="ml-8">
              <span
                className="absolute -left-4 flex items-center justify-center w-8 h-8 rounded-full border border-white/[0.1] bg-brand-bg text-xs font-bold font-mono"
                style={{ color: item.colorHex }}
              >
                {item.step}
              </span>
              <h3 className="text-brand-text font-semibold mb-1.5">
                {item.title}
              </h3>
              <p className="text-brand-text/50 text-sm leading-relaxed">
                {item.body}
              </p>
            </li>
          ))}
        </ol>
      </section>

      {/* ── CTA Banner ───────────────────────────────────────────────────── */}
      <section className="px-6 pb-28">
        <div
          className="max-w-4xl mx-auto rounded-3xl p-px"
          style={{
            background: "linear-gradient(135deg, rgba(107,143,255,0.4) 0%, rgba(155,107,255,0.4) 50%, rgba(0,229,255,0.4) 100%)",
          }}
        >
          <div
            className="rounded-3xl px-8 py-14 text-center"
            style={{
              background:
                "linear-gradient(135deg, rgba(10,13,20,0.98) 0%, rgba(20,24,40,0.98) 100%)",
            }}
          >
            <h2 className="text-3xl md:text-4xl font-bold text-brand-text mb-4 tracking-tight">
              Ready to trade with proof?
            </h2>
            <p className="text-brand-text/50 mb-8 max-w-lg mx-auto">
              Connect your XRPL wallet and get a verifiably fair option quote in seconds.
            </p>
            <Link href="/login" className="btn-primary text-white">
              Launch App
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
              </svg>
            </Link>
          </div>
        </div>
      </section>

      {/* ── Footer ───────────────────────────────────────────────────────── */}
      <footer className="border-t border-white/[0.06] px-6 py-8">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <div className="relative w-6 h-6">
              <Image src="/Verafi_Hero_Logo.png" alt="VeraFi" fill className="object-contain rounded" />
            </div>
            <span className="text-sm font-medium text-brand-text/60">
              Vera<span className="text-brand-blue">Fi</span>
            </span>
          </div>
          <p className="text-xs text-brand-text/30">
            Built for ETHGlobal Cannes · XRPL Testnet
          </p>
        </div>
      </footer>
    </div>
  );
}
