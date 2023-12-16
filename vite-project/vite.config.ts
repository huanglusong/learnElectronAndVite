import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import myVitePlugin from './plugins/vite-plugin-featureTest'
// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    vue(),
    myVitePlugin({})
  ],
})
