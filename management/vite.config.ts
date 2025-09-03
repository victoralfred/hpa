import { defineConfig } from 'vite';
import solidPlugin from 'vite-plugin-solid';
import { resolve } from 'path';

export default defineConfig({
  plugins: [solidPlugin()],
  server: {
    port: 3000,
    host: true,
  },
  build: {
    target: 'esnext',
  },
  resolve: {
    alias: {
      '~': resolve(__dirname, 'src'),
    },
  },
});
