import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  base: '/',
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icons/*.png'],
      manifest: {
        name: 'FridgeMacro',
        short_name: 'FridgeMacro',
        description: 'Nutrition inventory PWA',
        theme_color: '#10b981',
        background_color: '#f9fafb',
        display: 'standalone',
        icons: [
          { src: 'icons/I_FridgeMacros_192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icons/I_FridgeMacros_512.png', sizes: '512x512', type: 'image/png' },
        ],
      },
    }),
  ],
})
