"use client";

import { useRef } from "react";
import Link from "next/link";
import { motion, useScroll, useTransform } from "framer-motion";

const steps = [
  {
    step: "01",
    colorHex: "#6b8fff",
    title: "Request a Quote (RFQ)",
    body: "User signs an RFQ Intent with their XRPL wallet — specifying underlying, strike, expiry, and size.",
  },
  {
    step: "02",
    colorHex: "#00e5ff",
    title: "TEE Pricing",
    body: "The intent reaches the VeraFi pricer running inside a TEE. A Black-Scholes model prices the option with live Flare FTSO oracle data.",
  },
  {
    step: "03",
    colorHex: "#9b6bff",
    title: "Proof Published",
    body: "The TEE generates a remote attestation token. The quote + attestation are written on-chain together before the user sees a price.",
  },
  {
    step: "04",
    colorHex: "#6b8fff",
    title: "Trade or Walk",
    body: "User accepts the quote with a single XRPL payment transaction, or walks away — no gas, no EVM.",
  },
];

export function HowItWorks() {
  return (
    <section id="how-it-works" style={{ scrollMarginTop: "80px" }} className="px-6 pb-28 max-w-4xl mx-auto">
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-80px" }}
        transition={{ duration: 0.5 }}
        className="text-center mb-12"
      >
        <p className="text-brand-text/40 text-sm uppercase tracking-widest font-medium mb-3">The Flow</p>
        <h2 className="text-3xl md:text-4xl font-bold text-brand-text tracking-tight">How it works</h2>
      </motion.div>

      <ol className="relative border-l border-white/[0.08] space-y-10 ml-4">
        {steps.map((item, i) => (
          <motion.li
            key={item.step}
            initial={{ opacity: 0, x: -24 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, margin: "-40px" }}
            transition={{ duration: 0.5, delay: i * 0.1, ease: [0.22, 1, 0.36, 1] }}
            whileHover={{ x: 4 }}
            className="ml-8 cursor-default"
          >
            <motion.span
              whileHover={{ scale: 1.15 }}
              transition={{ type: "spring", stiffness: 400, damping: 15 }}
              className="absolute -left-4 flex items-center justify-center w-8 h-8 rounded-full border border-white/[0.1] bg-brand-bg text-xs font-bold font-mono"
              style={{ color: item.colorHex }}
            >
              {item.step}
            </motion.span>
            <h3 className="text-brand-text font-semibold mb-1.5">{item.title}</h3>
            <p className="text-brand-text/50 text-sm leading-relaxed">{item.body}</p>
          </motion.li>
        ))}
      </ol>
    </section>
  );
}

// ── Problem / Solution ────────────────────────────────────────────────────────

const problems = [
  {
    icon: "👁️",
    title: "Black-box pricing",
    body: "Market makers quote options from hidden models. You have no way to know if the spread is fair or if the model was manipulated for the trade.",
  },
  {
    icon: "🔒",
    title: "Trust assumed, not earned",
    body: "Every options platform asks you to trust them. There is no verifiable record that the price you paid reflects an honest computation.",
  },
  {
    icon: "🌉",
    title: "XRP locked out",
    body: "Existing DeFi options markets require EVM wallets and wrapped assets. XRP holders face bridges, gas fees, and custodial risks just to access a quote.",
  },
];

const solutions = [
  {
    icon: "🔐",
    title: "Pricing inside a TEE",
    body: "Every quote runs inside a Trusted Execution Environment. The hardware itself guarantees the model cannot be changed, replaced, or observed — not even by us.",
  },
  {
    icon: "⛓️",
    title: "On-chain attestation",
    body: "A remote attestation token is published on Flare alongside every quote. Anyone can independently verify the computation was honest before trading.",
  },
  {
    icon: "⚡",
    title: "Native XRPL settlement",
    body: "Trade directly from Xaman or Crossmark with a single XRP payment. No bridge, no wrapped token, no EVM wallet required.",
  },
];

export function ProblemSolution() {
  return (
    <section className="px-6 pb-28 max-w-6xl mx-auto">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-60px" }}
        transition={{ duration: 0.5 }}
        className="text-center mb-14"
      >
        <p className="text-brand-text/40 text-sm uppercase tracking-widest font-medium mb-3">The Case for VeraFi</p>
        <h2 className="text-3xl md:text-4xl font-bold text-brand-text tracking-tight">
          Why this matters
        </h2>
      </motion.div>

      <div className="grid md:grid-cols-2 gap-5">
        {/* Problem card */}
        <motion.div
          initial={{ opacity: 0, x: -32 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true, margin: "-40px" }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          whileHover={{ y: -4, boxShadow: "0 0 40px rgba(255,80,80,0.12)" }}
          className="rounded-2xl p-px cursor-default"
          style={{ background: "linear-gradient(135deg, rgba(255,80,80,0.25) 0%, rgba(255,80,80,0.05) 100%)" }}
        >
          <motion.div
            className="rounded-2xl p-7 h-full"
            style={{ background: "linear-gradient(135deg, rgba(30,12,12,0.98) 0%, rgba(18,12,12,0.98) 100%)" }}
            whileHover={{ background: "linear-gradient(135deg, rgba(36,14,14,0.98) 0%, rgba(22,14,14,0.98) 100%)" }}
            transition={{ duration: 0.25 }}
          >
            <div className="flex items-center gap-3 mb-6">
              <motion.span
                whileHover={{ scale: 1.06, borderColor: "rgba(255,80,80,0.6)" }}
                transition={{ type: "spring", stiffness: 400, damping: 18 }}
                className="text-xs font-bold uppercase tracking-widest px-3 py-1 rounded-full border border-red-500/30 text-red-400/80 bg-red-500/5 cursor-default"
              >
                The Problem
              </motion.span>
            </div>
            <ul className="space-y-6">
              {problems.map((p, i) => (
                <motion.li
                  key={p.title}
                  initial={{ opacity: 0, y: 12 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.4, delay: 0.1 + i * 0.08 }}
                  className="flex gap-4"
                >
                  <span className="text-xl shrink-0 mt-0.5">{p.icon}</span>
                  <div>
                    <p className="text-brand-text font-semibold text-sm mb-1">{p.title}</p>
                    <p className="text-brand-text/45 text-sm leading-relaxed">{p.body}</p>
                  </div>
                </motion.li>
              ))}
            </ul>
          </motion.div>
        </motion.div>

        {/* Solution card */}
        <motion.div
          initial={{ opacity: 0, x: 32 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true, margin: "-40px" }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          whileHover={{ y: -4, boxShadow: "0 0 48px rgba(107,143,255,0.18)" }}
          className="rounded-2xl p-px cursor-default"
          style={{ background: "linear-gradient(135deg, rgba(107,143,255,0.4) 0%, rgba(0,229,255,0.3) 100%)" }}
        >
          <motion.div
            className="rounded-2xl p-7 h-full"
            style={{ background: "linear-gradient(135deg, rgba(10,16,32,0.98) 0%, rgba(10,20,28,0.98) 100%)" }}
            whileHover={{ background: "linear-gradient(135deg, rgba(13,20,42,0.98) 0%, rgba(10,24,34,0.98) 100%)" }}
            transition={{ duration: 0.25 }}
          >
            <div className="flex items-center gap-3 mb-6">
              <motion.span
                whileHover={{ scale: 1.06, borderColor: "rgba(107,143,255,0.6)" }}
                transition={{ type: "spring", stiffness: 400, damping: 18 }}
                className="text-xs font-bold uppercase tracking-widest px-3 py-1 rounded-full border border-brand-blue/30 text-brand-blue/80 bg-brand-blue/5 cursor-default"
              >
                The VeraFi Solution
              </motion.span>
            </div>
            <ul className="space-y-6">
              {solutions.map((s, i) => (
                <motion.li
                  key={s.title}
                  initial={{ opacity: 0, y: 12 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.4, delay: 0.1 + i * 0.08 }}
                  className="flex gap-4"
                >
                  <span className="text-xl shrink-0 mt-0.5">{s.icon}</span>
                  <div>
                    <p className="text-brand-text font-semibold text-sm mb-1">{s.title}</p>
                    <p className="text-brand-text/45 text-sm leading-relaxed">{s.body}</p>
                  </div>
                </motion.li>
              ))}
            </ul>
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
}

export function CTABanner() {
  return (
    <section className="px-6 pb-28">
      <motion.div
        initial={{ opacity: 0, y: 40, scale: 0.97 }}
        whileInView={{ opacity: 1, y: 0, scale: 1 }}
        viewport={{ once: true, margin: "-60px" }}
        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        className="max-w-4xl mx-auto rounded-3xl p-px"
        style={{
          background: "linear-gradient(135deg, rgba(107,143,255,0.4) 0%, rgba(155,107,255,0.4) 50%, rgba(0,229,255,0.4) 100%)",
        }}
      >
        <div
          className="rounded-3xl px-8 py-14 text-center"
          style={{ background: "linear-gradient(135deg, rgba(10,13,20,0.98) 0%, rgba(20,24,40,0.98) 100%)" }}
        >
          <motion.h2
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="text-3xl md:text-4xl font-bold text-brand-text mb-4 tracking-tight"
          >
            Ready to trade with proof?
          </motion.h2>
          <motion.p
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="text-brand-text/50 mb-8 max-w-lg mx-auto"
          >
            Connect your XRPL wallet and get a verifiably fair option quote in seconds.
          </motion.p>
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.3 }}
            whileHover={{ scale: 1.04 }}
            whileTap={{ scale: 0.97 }}
            className="inline-block"
          >
            <Link href="/login" className="btn-primary text-white">
              Launch App
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
              </svg>
            </Link>
          </motion.div>
        </div>
      </motion.div>
    </section>
  );
}

export function FeaturesHeader() {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start end", "end start"],
  });

  const y = useTransform(scrollYProgress, [0, 0.5], [60, 0]);
  const opacity = useTransform(scrollYProgress, [0, 0.3], [0, 1]);

  return (
    <motion.div
      ref={ref}
      style={{ y, opacity }}
      className="text-center mb-12"
    >
      <p className="text-brand-text/40 text-sm uppercase tracking-widest font-medium mb-3">Why VeraFi</p>
      <h2 className="text-3xl md:text-4xl font-bold text-brand-text tracking-tight">
        Trust built into every quote
      </h2>
    </motion.div>
  );
}
