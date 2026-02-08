/// <reference types="vitest/config" />

import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';
export default defineConfig({
    base: '/rsg/',
    plugins: [
        react(),
        // VitePWA 相关配置（若有）可保留
    ],
    build: {
        outDir: 'dist', // 关键修改：从 build 改为 dist
        assetsDir: 'assets',
        rollupOptions: {
            output: {
                chunkFileNames: 'assets/[name].[hash].js',
                assetFileNames: 'assets/[name].[hash].[ext]',
                entryFileNames: 'assets/[name].[hash].js',
                manualChunks: {
                    react: [
                        'react',
                        'react-dom',
                        'react-router-dom',
                        '@reduxjs/toolkit',
                        'react-redux',
                        'react-i18next',
                    ],
                    mantine: ['@mantine/core', '@mantine/hooks', '@railmapgen/mantine-components'],
                },
            },
        },
        assetsInlineLimit: 4096,
    },
    resolve: {
        alias: { '@': resolve(__dirname, 'src') },
    },
    test: {
        globals: true,
        environment: 'jsdom',
        setupFiles: './src/setupTests.ts',
        server: {
            deps: {
                fallbackCJS: true,
            },
        },
        watch: false,
    },
});