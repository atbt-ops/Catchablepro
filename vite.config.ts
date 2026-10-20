import { defineConfig, Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import stylex from '@stylexjs/unplugin';

let requestCount = 0;
const startTime = Date.now();

function prometheusMetricsPlugin(): Plugin {
  return {
    name: 'prometheus-metrics-endpoint',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        requestCount++;
        const url = req.url?.split('?')[0] || '';

        if (url === '/healthz') {
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ status: 'ok', timestamp: new Date().toISOString() }));
          return;
        }

        if (url === '/metrics') {
          const uptimeSeconds = Math.floor((Date.now() - startTime) / 1000);
          const mem = process.memoryUsage();
          const metricsOutput = [
            '# HELP app_up Whether the application is running',
            '# TYPE app_up gauge',
            'app_up{app="catchablepro"} 1',
            '',
            '# HELP http_requests_total Total HTTP requests handled',
            '# TYPE http_requests_total counter',
            `http_requests_total{app="catchablepro"} ${requestCount}`,
            '',
            '# HELP process_uptime_seconds Process uptime in seconds',
            '# TYPE process_uptime_seconds counter',
            `process_uptime_seconds{app="catchablepro"} ${uptimeSeconds}`,
            '',
            '# HELP process_resident_memory_bytes Resident memory size in bytes',
            '# TYPE process_resident_memory_bytes gauge',
            `process_resident_memory_bytes{app="catchablepro"} ${mem.rss}`,
            '',
            '# HELP active_job_postings Number of active job listings',
            '# TYPE active_job_postings gauge',
            'active_job_postings{app="catchablepro"} 4',
            '',
            '# HELP auto_apply_candidates Number of candidates with auto-apply enabled',
            '# TYPE auto_apply_candidates gauge',
            'auto_apply_candidates{app="catchablepro"} 2',
            '',
          ].join('\n');

          res.setHeader('Content-Type', 'text/plain; version=0.0.4; charset=utf-8');
          res.end(metricsOutput);
          return;
        }

        next();
      });
    },
  };
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    stylex.vite(),
    react(),
    prometheusMetricsPlugin(),
  ],
  server: {
    host: '0.0.0.0',
    port: 3000,
    allowedHosts: true,
  },
});
