import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    vue(),
    VitePWA({
      registerType: 'autoUpdate',
      manifest: {
        name: 'Erudition',
        short_name: 'Erudition',
        display: 'standalone',
        start_url: '/',
        background_color: '#ffffff',
        theme_color: '#ffffff',
      },
    }),
  ],
})
