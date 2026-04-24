//Vitest configuration file for setting up the testing environment
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true, // Enables 'describe', 'it', 'expect' globally
    environment: 'jsdom',
    setupFiles: './client/src/test/setup.js', // Runs before tests
  },
});
