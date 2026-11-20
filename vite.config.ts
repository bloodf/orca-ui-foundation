import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import { viteSingleFile } from 'vite-plugin-singlefile';

export default defineConfig({
  plugins: [vue(), viteSingleFile()],
  // PrimeVue components use Vue's Options API, even when application SFCs use setup.
  define: { __VUE_OPTIONS_API__: true, __VUE_PROD_DEVTOOLS__: false },
  build: { target: 'safari14' },
});
