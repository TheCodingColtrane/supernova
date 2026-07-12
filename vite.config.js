import { defineConfig } from 'vite'
import { crx } from '@crxjs/vite-plugin'
import manifest from './manifest.json'
import { resolve } from 'path' // Adicione isso
export default defineConfig({
  plugins: [crx({ manifest })],
  build: {
    sourcemap: true,
    rollupOptions: {
      input: {
        // Garante que o Vite vai buildar o HTML do offscreen e o script dele
        offscreen: resolve(__dirname, 'src/pages/blank.html'), 
        popup: resolve(__dirname, "src/pages/popup.html"),
        dashboard: resolve(__dirname, "src/pages/gabinete.html"),
        office: resolve(__dirname, "src/pages/equipe.html"),
        lawsuit: resolve(__dirname, "src/pages/processo.html")
      },
      output: {
        // Remove a subpasta 'assets/' do padrão de nomes
        assetFileNames: '[name].[ext]',
        chunkFileNames: '[name].js',
        entryFileNames: '[name].js'
      },
    },
  },
})