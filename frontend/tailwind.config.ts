import type { Config } from "tailwindcss";

export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ["Fira Sans", "Inter", "sans-serif"],
        mono: ["Fira Code", "monospace"],
      },
      colors: {
        primary: {
          DEFAULT: "var(--primary)",
          hover: "var(--primary-hover)"
        },
        cta: "var(--cta)",
        posture: {
          scale: "hsl(var(--posture-scale))",
          stabilize: "hsl(var(--posture-stabilize))",
          study: "hsl(var(--posture-study))"
        },
        tint: {
          overview: "hsl(var(--tint-overview))",
          patterns: "hsl(var(--tint-patterns))",
          decisions: "hsl(var(--tint-decisions))",
          implications: "hsl(var(--tint-implications))",
          evidence: "hsl(var(--tint-evidence))"
        },
        pattern: {
          calibrated: "hsl(var(--pattern-calibrated))",
          blind: "hsl(var(--pattern-blind))",
          recovery: "hsl(var(--pattern-recovery))",
          friction: "hsl(var(--pattern-friction))",
          undertrust: "hsl(var(--pattern-undertrust))"
        }
      }
    }
  },
  plugins: []
} satisfies Config;
