import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import vitePluginElectron from './plugins/vite-plugin-myElectron'
// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    vue(),
    vitePluginElectron({})
  ],
})
