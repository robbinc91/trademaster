export type AiProvider = 'gemini' | 'openai' | 'deepseek' | 'custom';

export interface AiRuntimeConfig {
  provider: AiProvider;
  apiKey: string;
  model: string;
  /** Base URL for OpenAI-compatible APIs (no trailing slash). Empty for Gemini. */
  baseUrl: string;
  /**
   * Optional override for the chat path.
   * Default: /v1/chat/completions when base has no path; /chat/completions when base already ends with /v1.
   */
  chatPath: string;
}

function env(key: string): string {
  if (typeof process === 'undefined' || !process.env) return '';
  return String(process.env[key] || '').trim();
}

function normalizeProvider(raw: string): AiProvider {
  const p = raw.toLowerCase();
  if (p === 'openai' || p === 'deepseek' || p === 'custom' || p === 'gemini') return p;
  return 'gemini';
}

function defaultBaseUrl(provider: AiProvider): string {
  switch (provider) {
    case 'openai':
      return 'https://api.openai.com/v1';
    case 'deepseek':
      return 'https://api.deepseek.com/v1';
    default:
      return '';
  }
}

function defaultModel(provider: AiProvider): string {
  switch (provider) {
    case 'openai':
      return 'gpt-4o-mini';
    case 'deepseek':
      return 'deepseek-chat';
    case 'custom':
      return 'gpt-4o-mini';
    case 'gemini':
    default:
      return 'gemini-2.0-flash';
  }
}

/** Resolve AI provider settings from env (injected at build time via Vite). */
export function getAiConfig(): AiRuntimeConfig {
  const provider = normalizeProvider(env('AI_PROVIDER') || 'gemini');

  const apiKey =
    env('AI_API_KEY') ||
    env('API_KEY') ||
    env('GEMINI_API_KEY') ||
    '';

  const model =
    env('AI_MODEL') ||
    env('GEMINI_MODEL') ||
    defaultModel(provider);

  let baseUrl = (env('AI_BASE_URL') || defaultBaseUrl(provider)).replace(/\/+$/, '');
  if ((provider === 'openai' || provider === 'deepseek' || provider === 'custom') && !baseUrl) {
    baseUrl = defaultBaseUrl(provider === 'custom' ? 'openai' : provider);
  }

  const chatPath = env('AI_CHAT_PATH');

  return { provider, apiKey, model, baseUrl, chatPath };
}

/**
 * Build the Chat Completions URL from AI_BASE_URL.
 *
 * Accepts any of:
 * - http://host:port              → …/v1/chat/completions
 * - http://host:port/v1           → …/v1/chat/completions
 * - http://host:port/v1/chat/completions (full endpoint)
 * - AI_CHAT_PATH override (absolute path or full URL)
 */
export function resolveChatCompletionsUrl(config: AiRuntimeConfig): string {
  const override = (config.chatPath || '').trim();
  if (override) {
    if (/^https?:\/\//i.test(override)) return override.replace(/\/+$/, '');
    const base = config.baseUrl.replace(/\/+$/, '');
    const path = override.startsWith('/') ? override : `/${override}`;
    return `${base}${path}`;
  }

  const base = config.baseUrl.replace(/\/+$/, '');
  if (!base) return '';

  // Already a full chat completions endpoint
  if (/\/chat\/completions$/i.test(base)) return base;

  // Base already includes /v1 (or /v1beta, etc.)
  if (/\/v\d+[a-z]*$/i.test(base)) {
    return `${base}/chat/completions`;
  }

  // Host-only or other path: default OpenAI-style /v1/chat/completions
  return `${base}/v1/chat/completions`;
}

export function getAiProviderLabel(config: AiRuntimeConfig = getAiConfig()): string {
  switch (config.provider) {
    case 'openai':
      return 'OpenAI';
    case 'deepseek':
      return 'DeepSeek';
    case 'custom':
      return config.baseUrl || 'Custom LLM';
    case 'gemini':
    default:
      return 'Google Gemini';
  }
}
