import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Relative base so the same build works at localhost and at user.github.io/repo-name/
export default defineConfig({
  base: './',
  plugins: [react()],
});
