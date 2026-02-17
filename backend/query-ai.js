import { getGeminiClient } from '../lib/geminiClient';
import pLimit from 'p-limit';

// ── Model Configuration ─────────────────────────────────────────────
// Get model name from environment variable, default to gemini-3-flash-preview
function getModelName() {
  return process.env.GEMINI_MODEL || 'gemini-3-flash-preview';
}

// ── Concurrency & Queue ─────────────────────────────────────────────
// All AI calls are queued through this limiter (max 3 concurrent)
const aiQueue = pLimit(3);

// ── Retry Configuration ─────────────────────────────────────────────
const MAX_RETRIES = 3;
const BASE_DELAY_MS = 1000; // 1s, 2s, 4s exponential

// Retryable HTTP status codes
const RETRYABLE_STATUSES = new Set([429, 500, 502, 503, 504]);

// ── Error Classes ───────────────────────────────────────────────────
export class AIError extends Error {
  constructor(message, { status, retryable, originalError } = {}) {
    super(message);
    this.name = 'AIError';
    this.status = status || null;
    this.retryable = retryable || false;
    this.originalError = originalError || null;
  }
}

// ── Retry Logic ─────────────────────────────────────────────────────
function isRetryable(error) {
  if (error?.status && RETRYABLE_STATUSES.has(error.status)) return true;
  if (error?.message?.includes('UNAVAILABLE')) return true;
  if (error?.message?.includes('RESOURCE_EXHAUSTED')) return true;
  if (error?.message?.includes('rate limit')) return true;
  return false;
}

async function withRetry(fn, context = 'AI request') {
  let lastError;

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;

      if (attempt < MAX_RETRIES && isRetryable(error)) {
        const delay = BASE_DELAY_MS * Math.pow(2, attempt);
        const jitter = Math.random() * delay * 0.1;
        console.warn(
          `[AI] ${context} failed (attempt ${attempt + 1}/${MAX_RETRIES + 1}), ` +
          `retrying in ${Math.round(delay + jitter)}ms: ${error.message}`
        );
        await new Promise(resolve => setTimeout(resolve, delay + jitter));
      } else if (!isRetryable(error)) {
        break; // Non-retryable error, fail immediately
      }
    }
  }

  // All retries exhausted or non-retryable error
  const status = lastError?.status || 500;
  const retryable = isRetryable(lastError);

  throw new AIError(
    `${context} failed after ${MAX_RETRIES + 1} attempts: ${lastError.message}`,
    { status, retryable, originalError: lastError }
  );
}

// ── Public API ──────────────────────────────────────────────────────

/**
 * Generate content with retry, queuing, and error handling.
 * @param {string} prompt - The prompt text
 * @param {object} options
 * @param {boolean} options.jsonMode - Request JSON response
 * @param {string} options.systemInstruction - Optional system instruction
 * @returns {Promise<string>} The response text
 */
export function generateContent(prompt, { jsonMode = false, systemInstruction } = {}) {
  return aiQueue(() =>
    withRetry(async () => {
      const ai = getGeminiClient();
      const config = {};

      if (jsonMode) {
        config.responseMimeType = 'application/json';
      }
      if (systemInstruction) {
        config.systemInstruction = systemInstruction;
      }

      const response = await ai.models.generateContent({
        model: getModelName(),
        contents: prompt,
        config,
      });

      return response.text;
    }, 'generateContent')
  );
}

/**
 * Generate content and parse as JSON with retry, queuing, and error handling.
 * @param {string} prompt - The prompt text
 * @param {object} options
 * @param {string} options.systemInstruction - Optional system instruction
 * @returns {Promise<object>} Parsed JSON response
 */
export async function generateJSON(prompt, { systemInstruction } = {}) {
  const text = await generateContent(prompt, { jsonMode: true, systemInstruction });
  try {
    return JSON.parse(text);
  } catch (parseError) {
    throw new AIError('Failed to parse AI response as JSON', {
      status: 500,
      retryable: false,
      originalError: parseError,
    });
  }
}

/**
 * Create a chat session with retry and queuing on sendMessage.
 * @param {object} options
 * @param {Array} options.history - Chat history
 * @returns {{ sendMessage: (message: string) => Promise<string> }}
 */
export function createChat({ history = [] } = {}) {
  const ai = getGeminiClient();

  const chat = ai.chats.create({
    model: getModelName(),
    history,
  });

  return {
    sendMessage(message) {
      return aiQueue(() =>
        withRetry(async () => {
          const result = await chat.sendMessage({ message });
          return result.text;
        }, 'chat.sendMessage')
      );
    },
  };
}

/**
 * Legacy-compatible queryAI function.
 * @param {string} systemPrompt
 * @param {string} userPrompt
 * @param {boolean} jsonMode
 * @returns {Promise<string>}
 */
export async function queryAI(systemPrompt, userPrompt, jsonMode = false) {
  const prompt = `System: ${systemPrompt}\n\nUser: ${userPrompt}`;
  return generateContent(prompt, { jsonMode });
}
