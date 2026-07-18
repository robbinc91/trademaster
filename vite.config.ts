import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', '');

  const provider = (env.AI_PROVIDER || 'gemini').trim();
  const apiKey = (
    env.AI_API_KEY ||
    env.GEMINI_API_KEY ||
    env.VITE_GEMINI_API_KEY ||
    ''
  ).trim();
  const model = (
    env.AI_MODEL ||
    env.GEMINI_MODEL ||
    env.VITE_GEMINI_MODEL ||
    ''
  ).trim();
  const baseUrl = (env.AI_BASE_URL || '').trim();
  const chatPath = (env.AI_CHAT_PATH || '').trim();

  // Legacy aliases still injected for older code paths
  const geminiApiKey = (env.GEMINI_API_KEY || env.VITE_GEMINI_API_KEY || apiKey).trim();
  const geminiModel = (env.GEMINI_MODEL || env.VITE_GEMINI_MODEL || model).trim();

  return {
    base: './',
    server: {
      port: 3000,
      strictPort: true,
      host: '0.0.0.0',
    },
    plugins: [react()],
    define: {
      'process.env.AI_PROVIDER': JSON.stringify(provider),
      'process.env.AI_API_KEY': JSON.stringify(apiKey),
      'process.env.AI_MODEL': JSON.stringify(model),
      'process.env.AI_BASE_URL': JSON.stringify(baseUrl),
      'process.env.AI_CHAT_PATH': JSON.stringify(chatPath),
      'process.env.API_KEY': JSON.stringify(apiKey || geminiApiKey),
      'process.env.GEMINI_API_KEY': JSON.stringify(geminiApiKey),
      'process.env.GEMINI_MODEL': JSON.stringify(geminiModel),
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      }
    }
  };
});
