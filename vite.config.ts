import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import path from 'path';
import { visualizer } from 'rollup-plugin-visualizer';
import viteCompression from 'vite-plugin-compression';
import type { Plugin } from 'vite';

// Plugin de logging pour diagnostiquer le démarrage
function loggingPlugin(): Plugin {
  const startTime = Date.now();

  const log = (level: string, message: string, data?: Record<string, unknown>) => {
    const timestamp = new Date().toISOString();
    const elapsed = Date.now() - startTime;
    console.log(`[${timestamp}] [VITE-${level}] [+${elapsed}ms] ${message}`);
    if (data) {
      console.log(JSON.stringify(data, null, 2));
    }
  };

  return {
    name: 'vite-logging-plugin',

    configResolved(config) {
      log('INFO', '✓ Configuration Vite 7 résolue', {
        mode: config.mode,
        command: config.command,
        root: config.root,
        publicDir: config.publicDir
      });
    },

    buildStart() {
      log('INFO', '✓ Build démarré avec Vite 7');
    },

    configureServer(server) {
      log('INFO', '✓ Serveur de développement configuré', {
        port: server.config.server.port,
        host: server.config.server.host
      });

      server.httpServer?.once('listening', () => {
        log('SUCCESS', '✓✓✓ Serveur HTTP en écoute');
      });

      server.httpServer?.once('error', (err) => {
        log('ERROR', '✗✗✗ Erreur serveur HTTP', {
          message: err.message,
          code: (err as NodeJS.ErrnoException).code
        });
      });
    },

    transformIndexHtml(html) {
      log('INFO', '✓ index.html transformé');
      return html;
    },

    handleHotUpdate(ctx) {
      log('DEBUG', `HMR: ${path.basename(ctx.file)} mis à jour`);
      return ctx.modules;
    }
  };
}

console.log('========================================');
console.log('VITE 7.0 - Configuration chargée');
console.log(`Node.js version: ${process.version}`);
console.log(`Dossier de travail: ${process.cwd()}`);
console.log('========================================');

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    loggingPlugin(),
    react(),
    tailwindcss(), // Tailwind CSS 4 Vite plugin
    viteCompression({
      algorithm: 'gzip',
      ext: '.gz',
      threshold: 1024,
      deleteOriginFile: false
    }),
    viteCompression({
      algorithm: 'brotliCompress',
      ext: '.br',
      threshold: 1024,
      deleteOriginFile: false
    }),
    visualizer({
      filename: './dist/stats.html',
      open: false,
      gzipSize: true,
      brotliSize: true,
      template: 'treemap'
    })
  ],
  define: {
    'process.env': {},
    'process.version': JSON.stringify(''),
    'process.browser': true,
    global: 'globalThis',
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@components': path.resolve(__dirname, './src/components'),
      '@store': path.resolve(__dirname, './src/store'),
      '@services': path.resolve(__dirname, './src/services'),
      '@types': path.resolve(__dirname, './src/types'),
      '@utils': path.resolve(__dirname, './src/utils'),
      '@hooks': path.resolve(__dirname, './src/hooks'),
      '@data': path.resolve(__dirname, './src/data'),
      process: 'process/browser',
      util: 'util',
    },
  },
  build: {
    target: 'esnext', // Vite 7 default - baseline-widely-available
    minify: 'terser',
    modulePreload: {
      polyfill: true,
      resolveDependencies: (_filename, deps) => {
        // Preload critical chunks
        return deps.filter(dep =>
          dep.includes('react-core') ||
          dep.includes('xyflow') ||
          dep.includes('workflow')
        );
      }
    },
    terserOptions: {
      compress: {
        drop_console: true,
        drop_debugger: true,
        pure_funcs: ['console.log', 'console.info', 'console.debug', 'console.warn'],
        passes: 3,
        dead_code: true,
        unused: true,
        arguments: true,
        booleans: true,
        collapse_vars: true,
        comparisons: true,
        computed_props: true,
        conditionals: true,
        evaluate: true,
        if_return: true,
        inline: true,
        join_vars: true,
        loops: true,
        reduce_funcs: true,
        reduce_vars: true,
        sequences: true,
        side_effects: true,
        switches: true,
        typeofs: true,
        unsafe: false,
        unsafe_arrows: false,
        unsafe_methods: false
      },
      mangle: {
        safari10: true,
        properties: {
          regex: /^_/
        }
      },
      format: {
        comments: false,
        ascii_only: true,
        ecma: 2020
      }
    },
    rollupOptions: {
      output: {
        manualChunks(id) {
          // Exclude node_modules from main bundle
          if (id.includes('node_modules')) {
            // Core React - Essential
            if (id.includes('react-dom') || id.includes('react/')) {
              return 'react-core';
            }
            // TanStack Router + Query
            if (id.includes('@tanstack/react-router') || id.includes('@tanstack/react-query')) {
              return 'tanstack';
            }
            // React Router (legacy, to be removed)
            if (id.includes('react-router')) {
              return 'router';
            }
            // @xyflow/react - ReactFlow 12
            if (id.includes('@xyflow/react') || id.includes('reactflow')) {
              return 'xyflow';
            }
            // State management
            if (id.includes('zustand') || id.includes('immer')) {
              return 'state';
            }
            // Charts - Only if actually used
            if (id.includes('recharts') || id.includes('d3')) {
              return 'charts';
            }
            // Date utilities
            if (id.includes('date-fns')) {
              return 'date-utils';
            }
            // Monaco editor (heavy)
            if (id.includes('monaco-editor') || id.includes('@monaco-editor')) {
              return 'monaco';
            }
            // TensorFlow (very heavy - should be lazy loaded)
            if (id.includes('@tensorflow/tfjs')) {
              return 'tensorflow';
            }
            // LangChain (heavy)
            if (id.includes('langchain') || id.includes('@langchain')) {
              return 'langchain';
            }
            // Lucide icons
            if (id.includes('lucide-react')) {
              return 'icons';
            }
            // All other vendor code
            return 'vendor-misc';
          }
          // App code splitting - More granular
          if (id.includes('src/components/')) {
            // Dashboards
            if (id.includes('Dashboard')) return 'dashboard';
            // Workflow editor components
            if (id.includes('Workflow') || id.includes('Canvas') || id.includes('Editor')) return 'workflow';
            // Node configuration
            if (id.includes('Config') || id.includes('NodeConfig')) return 'config';
            if (id.includes('nodeConfigs') || id.includes('nodes/config')) return 'node-configs';
            // Analytics & monitoring
            if (id.includes('Analytics') || id.includes('Monitoring') || id.includes('Performance')) return 'analytics';
            // Marketplace & templates
            if (id.includes('Marketplace') || id.includes('Template')) return 'marketplace';
            // AI features
            if (id.includes('AI') || id.includes('Copilot') || id.includes('Assistant')) return 'ai-features';
          }
          // Services split
          if (id.includes('src/services/')) {
            if (id.includes('Logging') || id.includes('Logger')) return 'logging';
            if (id.includes('Analytics') || id.includes('Metrics')) return 'analytics-services';
            return 'services';
          }
          // Integrations
          if (id.includes('src/integrations/')) {
            return 'integrations';
          }
          // Backend
          if (id.includes('src/backend/')) {
            return 'backend';
          }
        },
        chunkFileNames: 'assets/js/[name]-[hash].js',
        entryFileNames: 'assets/js/[name]-[hash].js',
        assetFileNames: (assetInfo) => {
          if (!assetInfo.name) return 'assets/[name]-[hash][extname]';
          const info = assetInfo.name.split('.');
          const ext = info[info.length - 1];
          if (/png|jpe?g|svg|gif|tiff|bmp|ico/i.test(ext)) {
            return `assets/images/[name]-[hash][extname]`;
          } else if (/woff|woff2|eot|ttf|otf/i.test(ext)) {
            return `assets/fonts/[name]-[hash][extname]`;
          } else if (ext === 'css') {
            return `assets/css/[name]-[hash][extname]`;
          }
          return `assets/[name]-[hash][extname]`;
        }
      },
      treeshake: {
        moduleSideEffects: false,
        propertyReadSideEffects: false,
        tryCatchDeoptimization: false,
        correctVarValueBeforeDeclaration: false
      }
    },
    cssCodeSplit: true,
    sourcemap: false,
    reportCompressedSize: true,
    chunkSizeWarningLimit: 400,
    assetsInlineLimit: 2048
  },
  optimizeDeps: {
    include: [
      'react',
      'react-dom',
      'react-router-dom',
      '@tanstack/react-router',
      '@tanstack/react-query',
      'zustand',
      '@xyflow/react',
      'lucide-react'
    ],
    exclude: ['@vite/client', '@vite/env']
  },
  server: {
    port: 8080,
    cors: true,
    hmr: {
      overlay: true,
      protocol: 'ws',
      timeout: 30000
    },
    headers: {
      'Cache-Control': 'public, max-age=31536000',
      'X-Content-Type-Options': 'nosniff',
      'X-Frame-Options': 'DENY',
      'X-XSS-Protection': '1; mode=block'
    },
    proxy: {
      '/api': {
        target: 'http://localhost:8082',
        changeOrigin: true,
        secure: false,
        rewrite: (p) => p
      },
      '/ws': {
        target: 'ws://localhost:8082',
        ws: true,
        changeOrigin: true
      },
    },
  },
  preview: {
    port: 8080,
  }
});
