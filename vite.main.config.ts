import { defineConfig } from 'vite';

export default defineConfig({
  resolve: {
    conditions: ['node'],
    mainFields: ['module', 'jsnext:main', 'jsnext'],
  },
  build: {
    rollupOptions: {
      external: [
        'ssh2',
        'cpu-features',
        'electron',
        'node-pty',
        '@lydell/node-pty',
        'bufferutil',
        'utf-8-validate',
      ],
    },
  },
});
