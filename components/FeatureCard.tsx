import React from "react";

interface FeatureCardProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  glowColor: "blue" | "cyan" | "purple";
  delay?: number;
}

const glowMap = {
  blue: {
    border: "hover:border-brand-blue/40",
    glow: "hover:shadow-glow-blue",
    iconBg: "bg-brand-blue/10",
    iconColor: "text-brand-blue",
    titleColor: "text-brand-blue",
  },
  cyan: {
    border: "hover:border-brand-cyan/40",
    glow: "hover:shadow-glow-cyan",
    iconBg: "bg-brand-cyan/10",
    iconColor: "text-brand-cyan",
    titleColor: "text-brand-cyan",
  },
  purple: {
    border: "hover:border-brand-purple/40",
    glow: "hover:shadow-glow-purple",
    iconBg: "bg-brand-purple/10",
    iconColor: "text-brand-purple",
    titleColor: "text-brand-purple",
  },
};

export default function FeatureCard({
  icon,
  title,
  description,
  glowColor,
  delay = 0,
}: FeatureCardProps) {
  const styles = glowMap[glowColor];

  return (
    <div
      className={`glass-card p-7 border border-white/[0.08] transition-all duration-300 ${styles.border} ${styles.glow} group animate-fade-in-up`}
      style={{ animationDelay: `${delay}ms`, animationFillMode: "both" }}
    >
      {/* Icon */}
      <div
        className={`inline-flex items-center justify-center w-12 h-12 rounded-xl mb-5 ${styles.iconBg} ${styles.iconColor} transition-transform duration-300 group-hover:scale-110`}
      >
        {icon}
      </div>

      {/* Title */}
      <h3
        className={`text-lg font-semibold mb-2.5 ${styles.titleColor} tracking-tight`}
      >
        {title}
      </h3>

      {/* Description */}
      <p className="text-brand-text/60 text-sm leading-relaxed">{description}</p>
    </div>
  );
}
