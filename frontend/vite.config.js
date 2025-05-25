import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: { host: "0.0.0.0"} //Sepcify this host to tell vite server to listen from all networks addresses. This way can still access server from local machine while using docker container
})
