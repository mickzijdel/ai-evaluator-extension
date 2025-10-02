import { Logger } from './logger';

/**
 * Callback function to update UI with retry status
 * @param message - Status message to display
 * @param remainingSeconds - Seconds remaining until next retry (optional)
 * @param attemptNumber - Current retry attempt number
 * @param maxAttempts - Maximum number of retry attempts
 */
export type RetryStatusCallback = (
  message: string,
  remainingSeconds?: number,
  attemptNumber?: number,
  maxAttempts?: number
) => void;

/**
 * Configuration for retry behavior
 */
export interface RetryConfig {
  /** Maximum number of retry attempts for overloaded errors */
  maxOverloadRetries: number;
  /** Backoff delays in milliseconds for each retry attempt */
  overloadBackoffDelays: number[];
  /** Maximum number of retry attempts for other errors */
  maxOtherRetries: number;
  /** Base delay for other errors in milliseconds */
  otherRetryDelay: number;
  /** Callback to update UI status during retries */
  onRetryStatus?: RetryStatusCallback;
}

/**
 * Default retry configuration
 */
export const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxOverloadRetries: 5,
  overloadBackoffDelays: [10000, 20000, 40000, 60000, 60000], // 10s, 20s, 40s, 60s, 60s
  maxOtherRetries: 3,
  otherRetryDelay: 1000,
};

/**
 * Checks if an error is an overloaded API error
 * - Anthropic: HTTP 529 (overloaded_error)
 * - OpenAI: HTTP 429 (rate limit), HTTP 503 (service unavailable)
 */
export const isOverloadedError = (error: Error): boolean => {
  const errorMessage = error.message.toLowerCase();
  return (
    errorMessage.includes('status 529') ||
    errorMessage.includes('status 429') ||
    errorMessage.includes('status 503') ||
    errorMessage.includes('overloaded') ||
    errorMessage.includes('overload_error') ||
    errorMessage.includes('rate limit') ||
    errorMessage.includes('service unavailable')
  );
};

/**
 * Extracts retry-after delay from error message if available
 * @returns delay in milliseconds, or null if not found
 */
export const extractRetryAfter = (error: Error): number | null => {
  // Try to parse retry-after from error message
  const retryAfterMatch = error.message.match(/retry[- ]after[:\s]+(\d+)/i);
  if (retryAfterMatch) {
    return Number.parseInt(retryAfterMatch[1]) * 1000; // Convert to milliseconds
  }
  return null;
};

/**
 * Sleeps for the specified duration with optional countdown callback
 * @param delayMs - Delay in milliseconds
 * @param onCountdown - Optional callback called every second with remaining time
 */
async function sleepWithCountdown(
  delayMs: number,
  onCountdown?: (remainingSeconds: number) => void
): Promise<void> {
  const startTime = Date.now();
  const endTime = startTime + delayMs;

  if (onCountdown) {
    // Call countdown every second
    while (Date.now() < endTime) {
      const remainingMs = endTime - Date.now();
      const remainingSeconds = Math.ceil(remainingMs / 1000);
      onCountdown(remainingSeconds);

      // Sleep for 1 second or remaining time, whichever is shorter
      const sleepDuration = Math.min(1000, remainingMs);
      await new Promise((resolve) => setTimeout(resolve, sleepDuration));
    }
  } else {
    // Simple sleep without countdown
    await new Promise((resolve) => setTimeout(resolve, delayMs));
  }
}

/**
 * Retries a function with exponential backoff for overloaded errors
 * @param fn - Function to retry
 * @param config - Retry configuration
 * @returns Result of the function
 * @throws Last error if all retries are exhausted
 */
export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  config: Partial<RetryConfig> = {}
): Promise<T> {
  const fullConfig: RetryConfig = { ...DEFAULT_RETRY_CONFIG, ...config };
  let lastError: Error;
  let attemptNumber = 0;

  while (true) {
    try {
      const result = await fn();
      // Clear retry status on success
      if (fullConfig.onRetryStatus && attemptNumber > 0) {
        fullConfig.onRetryStatus('', 0, 0, 0);
      }
      return result;
    } catch (error) {
      lastError = error as Error;
      attemptNumber++;

      const isOverloaded = isOverloadedError(lastError);
      const maxRetries = isOverloaded
        ? fullConfig.maxOverloadRetries
        : fullConfig.maxOtherRetries;

      // Check if we should retry
      if (attemptNumber > maxRetries) {
        Logger.error(
          `All ${maxRetries} retry attempts exhausted for ${isOverloaded ? 'overloaded' : 'other'} error`
        );
        throw lastError;
      }

      // Calculate delay
      let delay: number;
      if (isOverloaded) {
        // Check for retry-after header
        const retryAfter = extractRetryAfter(lastError);
        if (retryAfter) {
          delay = retryAfter;
          Logger.info(`Using retry-after delay: ${delay}ms`);
        } else {
          // Use configured backoff delays
          delay =
            fullConfig.overloadBackoffDelays[Math.min(attemptNumber - 1, fullConfig.overloadBackoffDelays.length - 1)];
        }
      } else {
        // Exponential backoff for other errors
        delay = fullConfig.otherRetryDelay * Math.pow(2, attemptNumber - 1);
      }

      const delaySeconds = Math.ceil(delay / 1000);
      Logger.warn(
        `${isOverloaded ? '⏳ API Overloaded' : '🔄 API Error'} - Retry attempt ${attemptNumber}/${maxRetries} in ${delaySeconds}s: ${lastError.message}`
      );

      // Call status callback if provided
      if (fullConfig.onRetryStatus) {
        fullConfig.onRetryStatus(
          `${isOverloaded ? 'API Overloaded' : 'API Error'} - Retrying in ${delaySeconds}s`,
          delaySeconds,
          attemptNumber,
          maxRetries
        );
      }

      // Sleep with countdown
      await sleepWithCountdown(delay, (remainingSeconds) => {
        if (fullConfig.onRetryStatus) {
          fullConfig.onRetryStatus(
            `${isOverloaded ? 'API Overloaded' : 'API Error'} - Retrying in ${remainingSeconds}s`,
            remainingSeconds,
            attemptNumber,
            maxRetries
          );
        }
      });
    }
  }
}
