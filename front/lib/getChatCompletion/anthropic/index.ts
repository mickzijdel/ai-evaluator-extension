import pLimit from 'p-limit';
import type { GetChatCompletion } from '..';
import { getCurrentConcurrency } from '../../concurrency/config';
import { anthropicApiKey, anthropicModel } from './config';
import { Logger } from '../../logger';
import { retryWithBackoff, type RetryStatusCallback } from '../../retryWithBackoff';

// Create rate limiter with dynamic concurrency
let globalRateLimit = pLimit(getCurrentConcurrency());
let lastConcurrency = getCurrentConcurrency();

// Retry status callback (can be set globally)
let retryStatusCallback: RetryStatusCallback | undefined;

/**
 * Set the retry status callback for UI updates
 */
export const setRetryStatusCallback = (callback: RetryStatusCallback | undefined) => {
  retryStatusCallback = callback;
};

// Function to update rate limiter if concurrency changed
const updateRateLimit = () => {
  const currentConcurrency = getCurrentConcurrency();
  if (currentConcurrency !== lastConcurrency) {
    globalRateLimit = pLimit(currentConcurrency);
    lastConcurrency = currentConcurrency;
    Logger.info(`🔄 Updated Anthropic rate limit to ${currentConcurrency} concurrent calls`);
  }
  return globalRateLimit;
};

/**
 * Check rate limit headers and warn if limits are low
 */
const checkRateLimitHeaders = (response: Response): void => {
  const remainingRequests = response.headers.get(
    'anthropic-ratelimit-requests-remaining'
  );
  const remainingTokens = response.headers.get('anthropic-ratelimit-tokens-remaining');
  const resetTime = response.headers.get('anthropic-ratelimit-requests-reset');

  if (remainingRequests && Number.parseInt(remainingRequests) < 10) {
    Logger.warn(`🚨 Anthropic API: Only ${remainingRequests} requests remaining until ${resetTime}`);
  }

  if (remainingTokens && Number.parseInt(remainingTokens) < 1000) {
    Logger.warn(`🚨 Anthropic API: Only ${remainingTokens} tokens remaining until ${resetTime}`);
  }
};

/**
 * Build request body for Anthropic API
 */
const buildRequestBody = (messages: any[], lastMessageIsSystem: boolean) => {
  return {
    model: anthropicModel,
    messages: lastMessageIsSystem ? messages.slice(0, -1) : messages,
    system: lastMessageIsSystem ? messages[messages.length - 1].content : undefined,
    max_tokens: 500,
  };
};

/**
 * Handle API response and extract text content
 */
const handleApiResponse = async (response: Response): Promise<string> => {
  checkRateLimitHeaders(response);

  if (!response.ok || response.status >= 400) {
    const errorText = await response.text();
    throw new Error(
      `HTTP error calling API: got status ${response.status}. Response: ${errorText}`
    );
  }

  const data = await response.json();
  return data.content[0].text;
};

export const getChatCompletion: GetChatCompletion = async (messages) => {
  const lastMessageIsSystem = messages[messages.length - 1]?.role === 'system';

  return updateRateLimit()(async () => {
    // Wrap the API call with retry logic
    return retryWithBackoff(
      async () => {
        try {
          const apiUrl = 'https://api.anthropic.com/v1/messages';
          Logger.info(`🌐 DIRECT Anthropic API call to: ${apiUrl}`);

          const response = await fetch(apiUrl, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'anthropic-version': '2023-06-01',
              'x-api-key': anthropicApiKey,
              'anthropic-dangerous-direct-browser-access': 'true',
            },
            body: JSON.stringify(buildRequestBody(messages, lastMessageIsSystem)),
          });

          return await handleApiResponse(response);
        } catch (error) {
          if (error instanceof TypeError && error.message.includes('Failed to fetch')) {
            throw new Error(
              'Failed to connect to Anthropic API. Please check your internet connection and API key.'
            );
          }
          throw error;
        }
      },
      {
        onRetryStatus: retryStatusCallback,
      }
    );
  });
};
