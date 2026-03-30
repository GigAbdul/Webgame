/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        midnight: '#07111f',
        cyanpulse: '#31f0ff',
        limearc: '#ccff4d',
        magmarose: '#ff5a87',
        steel: '#142033',
        voidcore: '#050816',
        plasmablue: '#2cf3ff',
        acidspark: '#d2ff4b',
        flaregold: '#ffb547',
        shockpink: '#ff4f8b',
        stormline: '#1b2851',
      },
      boxShadow: {
        neon: '0 0 20px rgba(49, 240, 255, 0.2)',
        arcade:
          '0 0 0 1px rgba(255,255,255,0.05) inset, 0 18px 45px rgba(0,0,0,0.35), 0 0 35px rgba(44,243,255,0.12)',
      },
      backgroundImage: {
        grid: 'linear-gradient(rgba(255,255,255,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.04) 1px, transparent 1px)',
      },
      fontFamily: {
        display: ['Arial Black', 'Trebuchet MS', 'Verdana', 'sans-serif'],
        body: ['Trebuchet MS', 'Segoe UI', 'Verdana', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
