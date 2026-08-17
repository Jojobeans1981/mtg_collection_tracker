/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./app/**/*.{js,jsx}', './components/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        // Repurposed tokens — same names used everywhere in the app, new
        // "arcane vault" values: near-black void, foil gold, neon ember/forest.
        ink: '#f1e9ff', // primary text (light, on dark bg)
        parchment: '#fdf7ff', // brightest text / on-accent text
        ember: '#ff3d6e', // hot neon accent (links, danger, dealer)
        gold: '#f6c945', // foil gold accent
        forest: '#7c5cff', // primary neon violet (buttons, collector)
        void: '#08040f', // page background base
        void2: '#120a24', // page background secondary
        cyan: '#2dd8ff' // secondary neon accent
      },
      fontFamily: {
        // System-font stacks (no network fetch at build time) — boldness
        // comes from weight/tracking/gradient-text, not a custom webfont.
        serif: ['Georgia', 'Cambria', '"Palatino Linotype"', 'Palatino', 'serif'],
        sans: ['-apple-system', 'system-ui', 'Segoe UI', 'Roboto', 'sans-serif']
      },
      boxShadow: {
        glow: '0 0 20px rgba(124, 92, 255, 0.55), 0 0 60px rgba(124, 92, 255, 0.25)',
        'glow-ember': '0 0 20px rgba(255, 61, 110, 0.55), 0 0 60px rgba(255, 61, 110, 0.2)',
        'glow-gold': '0 0 25px rgba(246, 201, 69, 0.5), 0 0 70px rgba(246, 201, 69, 0.2)'
      },
      keyframes: {
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' }
        },
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-6px)' }
        },
        pulseGlow: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.6' }
        }
      },
      animation: {
        shimmer: 'shimmer 3s linear infinite',
        float: 'float 4s ease-in-out infinite',
        pulseGlow: 'pulseGlow 2s ease-in-out infinite'
      }
    }
  },
  plugins: []
};
