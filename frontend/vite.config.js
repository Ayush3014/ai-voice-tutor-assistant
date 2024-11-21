import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { config as dotenvConfig } from 'dotenv';

// Load .env variables
dotenvConfig();

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
});
