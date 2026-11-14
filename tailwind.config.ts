import type { Config } from "tailwindcss";

const color = (name: string) => `rgb(var(--${name}-rgb) / <alpha-value>)`;

const config: Config = {
  darkMode: "class",
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      fontSize: {
        xs: ["0.75rem", { lineHeight: "1.125rem" }],
        sm: ["0.875rem", { lineHeight: "1.375rem" }],
        base: ["1rem", { lineHeight: "1.625rem" }],
        lg: ["1.125rem", { lineHeight: "1.75rem" }],
        xl: ["1.25rem", { lineHeight: "1.875rem" }],
        "2xl": ["1.5rem", { lineHeight: "2rem" }],
        "3xl": ["1.875rem", { lineHeight: "2.375rem" }],
        "4xl": ["2.25rem", { lineHeight: "2.75rem" }],
        "5xl": ["3rem", { lineHeight: "1.12" }],
        "6xl": ["3.75rem", { lineHeight: "1.12" }],
        "7xl": ["4.5rem", { lineHeight: "1.12" }],
        "8xl": ["6rem", { lineHeight: "1.12" }],
      },
      colors: {
        brand: { DEFAULT: color("brand"), hover: color("brand-hover"), soft: color("brand-soft") },
        navy: { DEFAULT: color("navy"), deep: color("navy-deep") },
        teal: { DEFAULT: color("teal"), deep: color("teal-deep") },
        violet: { DEFAULT: color("violet"), deep: color("violet-deep") },
        coral: { DEFAULT: color("coral"), deep: color("coral-deep") },
        cyan: { DEFAULT: color("cyan"), light: color("cyan-light") },
        ink: color("ink"), slate: { DEFAULT: color("slate"), soft: color("slate-soft") },
        mist: color("mist"), paper: color("paper"), surface: color("white"),
        success: { DEFAULT: color("success"), soft: color("success-soft") },
        warning: { DEFAULT: color("warning"), soft: color("warning-soft") },
        danger: { DEFAULT: color("danger"), soft: color("danger-soft") },
        xp: { DEFAULT: color("xp"), deep: color("xp-deep") },
        gems: { DEFAULT: color("gems"), deep: color("gems-deep") },
        flame: { DEFAULT: color("flame"), deep: color("flame-deep") },
      },
      // The existing color classes now resolve by role, not by one shared hue.
      textColor: {
        brand: { DEFAULT: color("brand-text"), hover: color("brand-text-hover") },
        navy: { DEFAULT: color("brand-text"), deep: color("brand-text") },
        teal: { DEFAULT: color("teal-text"), deep: color("teal-text") },
        violet: { DEFAULT: color("violet-text"), deep: color("violet-text") },
        coral: { DEFAULT: color("coral-text"), deep: color("coral-text") },
        xp: { DEFAULT: color("xp-text"), deep: color("xp-text") },
        success: { DEFAULT: color("success-text") }, danger: { DEFAULT: color("danger-text") },
        warning: { DEFAULT: color("warning-text") }, slate: { soft: color("muted-text") },
      },
      backgroundColor: {
        white: color("white"), inverse: color("inverse"),
        cyan: { DEFAULT: color("cyan-surface"), light: color("cyan-light") },
        teal: { DEFAULT: color("teal-solid") }, violet: { DEFAULT: color("violet-solid") },
        success: { DEFAULT: color("success-solid") }, danger: { DEFAULT: color("danger-solid") },
      },
      borderColor: {
        mist: color("border"), ink: color("strong-border"), control: color("control-border"),
        brand: { DEFAULT: color("brand-text") }, teal: { DEFAULT: color("teal-text") },
        success: { DEFAULT: color("success-text") }, danger: { DEFAULT: color("danger-text") },
      },
      ringColor: { brand: { DEFAULT: color("brand-text") }, teal: { DEFAULT: color("teal-text") } },
      outlineColor: { brand: { DEFAULT: color("brand-text") }, teal: { DEFAULT: color("teal-text") } },
      accentColor: { teal: color("teal-text") },
      gradientColorStops: { cyan: { DEFAULT: color("cyan-surface"), light: color("cyan-light") } },
      fontFamily: {
        display: ["var(--font-display)"],
        body: ["var(--font-body)"],
      },
      borderRadius: {
        sm: "var(--radius-sm)",
        md: "var(--radius-md)",
        lg: "var(--radius-lg)",
        pill: "var(--radius-pill)",
      },
      boxShadow: {
        card: "var(--shadow-card)",
        float: "var(--shadow-float)",
        hard: "var(--shadow-hard)",
        brutalist: "var(--shadow-brutalist)",
      },
      borderWidth: {
        '3': '3px',
        '4': '4px',
      },
      animation: {
        // Existing
        'flame-flicker': 'flame-flicker 1.5s ease-in-out infinite',
        'gem-sparkle': 'gem-sparkle 2s ease-in-out infinite',
        'badge-bounce': 'badge-bounce 2s ease-in-out infinite',
        'achievement-pop': 'achievement-pop 0.5s ease-out forwards',
        'progress-fill': 'progress-fill 1.5s ease-out forwards',
        'slide-in': 'slide-in 0.4s ease-out forwards',
        'bounce-slow': 'bounce-slow 2s ease-in-out infinite',
        'pulse-slow': 'pulse-slow 3s ease-in-out infinite',
        // New Cinematic
        'float': 'float 6s ease-in-out infinite',
        'float-delayed': 'float 6s ease-in-out 2s infinite',
        'float-slow': 'float 8s ease-in-out infinite',
        'shake': 'shake 0.5s ease-in-out',
        'chest-shake': 'chest-shake 0.8s ease-in-out infinite',
        'glow-pulse': 'glow-pulse 2s ease-in-out infinite',
        'shine-sweep': 'shine-sweep 2s ease-in-out infinite',
        'bounce-in': 'bounce-in 0.6s cubic-bezier(0.34, 1.56, 0.64, 1) forwards',
        'bounce-in-delayed': 'bounce-in 0.6s cubic-bezier(0.34, 1.56, 0.64, 1) 0.1s forwards',
        'ring-expand': 'ring-expand 0.6s ease-out forwards',
        'xp-float-up': 'xp-float-up 1.2s ease-out forwards',
        'confetti-fall': 'confetti-fall 3s ease-out forwards',
        'flame-spark': 'flame-spark 1s ease-out forwards',
        'liquid-fill': 'liquid-fill 2s ease-out forwards',
        'levitate': 'levitate 0.3s ease-out forwards',
        'text-scramble': 'text-scramble 0.8s ease-out forwards',
        'count-up': 'count-up 0.5s ease-out forwards',
        'draw-ring': 'draw-ring 2s ease-out forwards',
        'gem-shower': 'gem-shower 1.5s ease-out forwards',
        'wobble': 'wobble 1s ease-in-out infinite',
        'pulse-glow': 'pulse-glow 2s ease-in-out infinite',
        'spin-slow': 'spin 8s linear infinite',
        'typewriter': 'typewriter 2s steps(40) forwards',
        'blink': 'blink 1s step-end infinite',
      },
      keyframes: {
        // Existing (kept for compatibility)
        'flame-flicker': {
          '0%, 100%': { transform: 'scale(1) rotate(-2deg)', opacity: '1' },
          '25%': { transform: 'scale(1.05) rotate(2deg)', opacity: '0.9' },
          '50%': { transform: 'scale(0.95) rotate(-1deg)', opacity: '1' },
          '75%': { transform: 'scale(1.02) rotate(1deg)', opacity: '0.95' },
        },
        'gem-sparkle': {
          '0%, 100%': { filter: 'brightness(1)', transform: 'scale(1)' },
          '50%': { filter: 'brightness(1.3)', transform: 'scale(1.1)' },
        },
        'badge-bounce': {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-3px)' },
        },
        'achievement-pop': {
          '0%': { transform: 'scale(0.8)', opacity: '0' },
          '50%': { transform: 'scale(1.05)' },
          '100%': { transform: 'scale(1)', opacity: '1' },
        },
        'progress-fill': {
          '0%': { width: '0%' },
        },
        'slide-in': {
          '0%': { transform: 'translateX(-20px)', opacity: '0' },
          '100%': { transform: 'translateX(0)', opacity: '1' },
        },
        'bounce-slow': {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-4px)' },
        },
        'pulse-slow': {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.8' },
        },
        // New Cinematic
        'float': {
          '0%, 100%': { transform: 'translateY(0px) rotate(0deg)' },
          '33%': { transform: 'translateY(-12px) rotate(1deg)' },
          '66%': { transform: 'translateY(6px) rotate(-1deg)' },
        },
        'shake': {
          '0%, 100%': { transform: 'translateX(0)' },
          '25%': { transform: 'translateX(-5px) rotate(-1deg)' },
          '75%': { transform: 'translateX(5px) rotate(1deg)' },
        },
        'chest-shake': {
          '0%, 100%': { transform: 'rotate(0deg)' },
          '25%': { transform: 'rotate(-3deg)' },
          '50%': { transform: 'rotate(3deg)' },
          '75%': { transform: 'rotate(-2deg)' },
        },
        'glow-pulse': {
          '0%, 100%': { boxShadow: '0 0 5px currentColor, 0 0 10px currentColor' },
          '50%': { boxShadow: '0 0 20px currentColor, 0 0 40px currentColor' },
        },
        'shine-sweep': {
          '0%': { backgroundPosition: '-200% center' },
          '100%': { backgroundPosition: '200% center' },
        },
        'bounce-in': {
          '0%': { transform: 'scale(0.3)', opacity: '0' },
          '50%': { transform: 'scale(1.05)' },
          '70%': { transform: 'scale(0.95)' },
          '100%': { transform: 'scale(1)', opacity: '1' },
        },
        'ring-expand': {
          '0%': { transform: 'scale(0.5)', opacity: '1' },
          '100%': { transform: 'scale(2)', opacity: '0' },
        },
        'xp-float-up': {
          '0%': { transform: 'translateY(0) scale(1)', opacity: '1' },
          '50%': { transform: 'translateY(-30px) scale(1.2)', opacity: '1' },
          '100%': { transform: 'translateY(-60px) scale(0.8)', opacity: '0' },
        },
        'confetti-fall': {
          '0%': { transform: 'translateY(-100vh) rotate(0deg)', opacity: '1' },
          '100%': { transform: 'translateY(100vh) rotate(720deg)', opacity: '0' },
        },
        'flame-spark': {
          '0%': { transform: 'translateY(0) scale(1)', opacity: '1' },
          '100%': { transform: 'translateY(-40px) scale(0)', opacity: '0' },
        },
        'liquid-fill': {
          '0%': { width: '0%' },
          '100%': { width: '100%' },
        },
        'levitate': {
          '0%': { transform: 'translateY(0)' },
          '100%': { transform: 'translateY(-8px)' },
        },
        'wobble': {
          '0%, 100%': { transform: 'rotate(-2deg)' },
          '50%': { transform: 'rotate(2deg)' },
        },
        'pulse-glow': {
          '0%, 100%': { filter: 'drop-shadow(0 0 2px currentColor)' },
          '50%': { filter: 'drop-shadow(0 0 8px currentColor)' },
        },
        'typewriter': {
          '0%': { width: '0%' },
          '100%': { width: '100%' },
        },
        'blink': {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0' },
        },
        'gem-shower': {
          '0%': { transform: 'translateY(-20px) scale(0)', opacity: '0' },
          '50%': { transform: 'translateY(10px) scale(1.2)', opacity: '1' },
          '100%': { transform: 'translateY(0) scale(1)', opacity: '1' },
        },
      },
    },
  },
  plugins: [],
};

export default config;
