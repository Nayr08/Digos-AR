import tailwindcss from '@tailwindcss/vite';
import vinext from 'vinext';
import { nitro } from 'nitro/vite';
import { defineConfig } from 'vite';

export default defineConfig(({ command }) => ({
  server: {
    host: '0.0.0.0',
    port: 3000,
  },
  plugins: [
    tailwindcss(),
    vinext(),
    // Nitro's fetchable environments do not expose the RSC dev runner expected
    // by Vinext. It is only required when producing the deployable build.
    ...(command === 'build' ? [nitro()] : []),
  ],
}));
