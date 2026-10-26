import react from '@vitejs/plugin-react'
import { defineConfig, type Plugin } from 'vite'
import { adminMiddleware, photoMiddleware } from './server/photos.ts'

// Stejné API jako produkční server, aby fungovalo i `npm run dev` a `npm run preview`.
// Editor fotek (/admin) má API jen v `npm run dev`.
function photoApi(): Plugin {
  return {
    name: 'advent-photo-api',
    configureServer(server) {
      server.middlewares.use(adminMiddleware)
      server.middlewares.use(photoMiddleware)
    },
    configurePreviewServer(server) {
      server.middlewares.use(photoMiddleware)
    },
  }
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), photoApi()],
})
