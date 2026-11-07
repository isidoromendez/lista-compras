import { execSync } from 'node:child_process';
import { defineConfig } from 'vite';

// Versión visible al pie: commit + fecha de compilación (para saber qué versión se ve).
const commit = (() => {
  try {
    return execSync('git rev-parse --short HEAD').toString().trim();
  } catch {
    return 'local';
  }
})();
const fecha = new Date().toLocaleString('es-AR', { timeZone: 'America/Argentina/Buenos_Aires', dateStyle: 'short', timeStyle: 'short' });

export default defineConfig({
  define: { __VERSION__: JSON.stringify(`${commit} · ${fecha}`) },
  build: { outDir: 'dist', assetsDir: 'assets', target: 'es2020' },
});
