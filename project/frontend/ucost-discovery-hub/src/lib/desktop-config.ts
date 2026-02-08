/**
 * Desktop Config Utility
 * Reads runtime configuration injected by Electron desktop app
 * 
 * The desktop app injects configuration at runtime via window.__DESKTOP_CONFIG__
 * This utility provides a consistent way to access these values with fallbacks
 * to build-time environment variables.
 */

interface DesktopConfig {
  VITE_API_URL?: string;
  VITE_CHATBOT_API_URL?: string;
  VITE_EMBED_API_URL?: string;
  VITE_GEMMA_API_URL?: string;
  VITE_OCR_API_URL?: string;
  VITE_FRONTEND_URL?: string;
  VITE_DESKTOP_MODE?: string;
}

/**
 * Get the desktop configuration object
 * Checks window.__DESKTOP_CONFIG__ first, then individual window variables
 */
function getDesktopConfig(): DesktopConfig {
  // Check for injected config from Electron (preferred method)
  if (typeof window !== 'undefined' && (window as any).__DESKTOP_CONFIG__) {
    return (window as any).__DESKTOP_CONFIG__;
  }

  // Fallback to individual window variables (for backward compatibility)
  if (typeof window !== 'undefined') {
    const win = window as any;
    return {
      VITE_API_URL: win.VITE_API_URL,
      VITE_CHATBOT_API_URL: win.VITE_CHATBOT_API_URL,
      VITE_EMBED_API_URL: win.VITE_EMBED_API_URL,
      VITE_GEMMA_API_URL: win.VITE_GEMMA_API_URL,
      VITE_OCR_API_URL: win.VITE_OCR_API_URL,
      VITE_FRONTEND_URL: win.VITE_FRONTEND_URL,
      VITE_DESKTOP_MODE: win.VITE_DESKTOP_MODE,
    };
  }

  return {};
}

/**
 * Get API base URL with fallback chain:
 * 1. Desktop runtime config (window.__DESKTOP_CONFIG__)
 * 2. Build-time environment variable (import.meta.env)
 * 3. Default localhost URL
 */
export function getApiUrl(): string {
  const config = getDesktopConfig();
  if (config.VITE_API_URL) return config.VITE_API_URL;

  // Build-time fallback
  return import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
}

/**
 * Get Chatbot API URL with fallback chain
 */
export function getChatbotApiUrl(): string {
  const config = getDesktopConfig();
  if (config.VITE_CHATBOT_API_URL) return config.VITE_CHATBOT_API_URL;

  // Build-time fallback
  return import.meta.env.VITE_CHATBOT_API_URL || 'http://localhost:4321';
}

/**
 * Get Embed API URL with fallback chain
 */
export function getEmbedApiUrl(): string {
  const config = getDesktopConfig();
  return config.VITE_EMBED_API_URL || import.meta.env.VITE_EMBED_API_URL || 'http://localhost:8001';
}

/**
 * Get Gemma API URL with fallback chain
 */
export function getGemmaApiUrl(): string {
  const config = getDesktopConfig();
  return config.VITE_GEMMA_API_URL || import.meta.env.VITE_GEMMA_API_URL || 'http://localhost:8011';
}

/**
 * Get OCR API URL with fallback chain
 */
export function getOcrApiUrl(): string {
  const config = getDesktopConfig();
  return config.VITE_OCR_API_URL || import.meta.env.VITE_OCR_API_URL || 'http://localhost:8088/api';
}

/**
 * Get Frontend URL with fallback chain
 */
export function getFrontendUrl(): string {
  const config = getDesktopConfig();
  return config.VITE_FRONTEND_URL || import.meta.env.VITE_FRONTEND_URL || 'http://localhost:5173';
}

/**
 * Check if running in desktop mode
 */
export function isDesktopMode(): boolean {
  const config = getDesktopConfig();
  return config.VITE_DESKTOP_MODE === 'true' || import.meta.env.VITE_DESKTOP_MODE === 'true';
}

/**
 * Get all API URLs as an object
 */
export function getAllApiUrls() {
  return {
    api: getApiUrl(),
    chatbot: getChatbotApiUrl(),
    embed: getEmbedApiUrl(),
    gemma: getGemmaApiUrl(),
    ocr: getOcrApiUrl(),
    frontend: getFrontendUrl(),
  };
}

