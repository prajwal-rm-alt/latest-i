import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  // Load env file based on `mode` in the current working directory.
  // Fix: Property 'cwd' does not exist on type 'Process'.
  const env = loadEnv(mode, (process as any).cwd(), '');
  
  // Vercel injects env vars into process.env, local dev uses .env via loadEnv
  // Check multiple variations (API_KEY, GEMINI_API_KEY) and trim whitespace
  const rawKey = process.env.API_KEY || env.API_KEY || 
                 process.env.GEMINI_API_KEY || env.GEMINI_API_KEY || 
                 process.env.VITE_API_KEY || env.VITE_API_KEY || 
                 process.env.VITE_GEMINI_API_KEY || env.VITE_GEMINI_API_KEY || 
                 '';
                 
  const apiKey = rawKey.trim();

  return {
    base: '/',
    plugins: [
      react(),
      tailwindcss(),
    ],
    define: {
      'process.env.API_KEY': JSON.stringify(apiKey)
    }
  }
})