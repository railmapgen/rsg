/// <reference types="vitest/config" />

import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';

// https://vitejs.dev/config
export default defineConfig({
    base: '/rsg/',
    plugins: [
        react(),
    ],
    build: {
        outDir: 'build', // 匹配脚本中的构建输出目录
        assetsDir: 'assets', // 静态资源统一存放目录
        rollupOptions: {
            output: {
                // 核心：为静态资源添加哈希，解决缓存问题
                chunkFileNames: 'assets/[name].[hash].js',
                assetFileNames: 'assets/[name].[hash].[ext]',
                entryFileNames: 'assets/[name].[hash].js',
                // 保留原有分包逻辑
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
        assetsInlineLimit: 4096, // 小资源内联，不影响哈希逻辑
    },
    resolve: {
        alias: { '@': resolve(__dirname, 'src') }, // 新增别名（方便项目内路径引用，可选）
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